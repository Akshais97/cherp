create extension if not exists "pgcrypto";
create schema if not exists erp;
set search_path to erp, public;

-- Passwords are intentionally excluded from public.users.
-- Supabase Auth owns password hashing/storage in auth.users.

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name in ('super_admin', 'project_manager', 'team_member', 'client')),
  description text not null
);

insert into roles (name, description)
values
  ('super_admin', 'Full tenant/platform control'),
  ('project_manager', 'Delivery and workflow management'),
  ('team_member', 'Assigned task execution'),
  ('client', 'Read-only client-side access')
on conflict (name) do update set description = excluded.description;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete restrict,
  role_id uuid not null references roles(id) on delete restrict,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  avatar_url text,
  is_active boolean not null default true,
  last_login timestamptz,
  hourly_cost_rate numeric(12, 2),
  billable_rate numeric(12, 2),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_created_by_fkey'
      and conrelid = 'users'::regclass
  ) then
    alter table users
      add constraint users_created_by_fkey
      foreign key (created_by) references users(id) on delete set null;
  end if;
end;
$$;

create table if not exists scope_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete restrict,
  name text not null,
  industry text not null,
  service_type text not null,
  description text,
  duration_months integer not null check (duration_months > 0),
  default_tasks jsonb not null default '[]'::jsonb,
  kpi_framework jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid not null references users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete restrict,
  name text not null,
  industry text not null,
  service_type text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  monthly_retainer numeric(12, 2),
  currency text not null default 'INR',
  contract_duration integer,
  contract_start date,
  contract_end date,
  payment_terms text,
  renewal_date date,
  notes text,
  scope_template_id uuid references scope_templates(id) on delete restrict,
  health_score numeric(5, 2),
  retainer_hours integer,
  created_by uuid not null references users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workflows (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete restrict,
  client_id uuid not null references clients(id) on delete cascade,
  template_id uuid references scope_templates(id) on delete restrict,
  project_manager_id uuid references users(id) on delete set null,
  title text not null,
  status text not null default 'active' check (status in ('draft', 'active', 'paused', 'completed')),
  month_number integer not null check (month_number > 0),
  completion_percentage numeric(5, 2) not null default 0 check (completion_percentage >= 0 and completion_percentage <= 100),
  start_date date,
  end_date date,
  auto_generated boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete restrict,
  workflow_id uuid not null references workflows(id) on delete cascade,
  assigned_to uuid references users(id) on delete set null,
  parent_task_id uuid references tasks(id) on delete cascade,
  completed_by uuid references users(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'blocked', 'completed')),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  sort_order integer not null default 0,
  due_date date,
  depends_on uuid[] not null default '{}',
  is_subtask boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists blockers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete restrict,
  task_id uuid not null references tasks(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  flagged_by uuid not null references users(id) on delete restrict,
  resolved_by uuid references users(id) on delete set null,
  title text not null,
  description text,
  severity text not null default 'medium' check (severity in ('high', 'medium', 'low')),
  status text not null default 'open' check (status in ('open', 'resolved')),
  impact text,
  resolution_notes text,
  flagged_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete restrict,
  user_id uuid references users(id) on delete set null,
  action_type text not null check (action_type in ('created', 'updated', 'status_changed', 'assigned', 'completed', 'blocked', 'resolved', 'archived')),
  entity_type text not null check (entity_type in ('tenant', 'user', 'client', 'scope_template', 'workflow', 'task', 'blocker')),
  entity_id uuid not null,
  before_values jsonb,
  after_values jsonb,
  created_at timestamptz not null default now()
);

create table if not exists task_comments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete restrict,
  task_id uuid not null references tasks(id) on delete cascade,
  author_id uuid not null references users(id) on delete restrict,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists task_attachments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete restrict,
  task_id uuid not null references tasks(id) on delete cascade,
  uploaded_by uuid not null references users(id) on delete restrict,
  file_name text not null,
  file_url text not null,
  file_size integer not null check (file_size >= 0),
  mime_type text not null,
  created_at timestamptz not null default now()
);

create table if not exists time_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete restrict,
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references users(id) on delete restrict,
  hours numeric(6, 2) not null check (hours > 0),
  date date not null,
  description text,
  is_billable boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete restrict,
  user_id uuid not null references users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists notification_preferences (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete restrict,
  user_id uuid not null references users(id) on delete cascade,
  notification_type text not null,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id, notification_type)
);

create index if not exists users_tenant_id_idx on users(tenant_id);
create index if not exists users_tenant_id_created_at_idx on users(tenant_id, created_at desc);
create index if not exists clients_tenant_id_status_created_at_idx on clients(tenant_id, status, created_at desc);
create index if not exists scope_templates_tenant_id_active_idx on scope_templates(tenant_id, is_active);
create unique index if not exists scope_templates_tenant_industry_service_type_uidx
  on scope_templates(tenant_id, industry, service_type);
create index if not exists workflows_tenant_id_client_id_month_number_idx on workflows(tenant_id, client_id, month_number);
create index if not exists workflows_tenant_id_status_created_at_idx on workflows(tenant_id, status, created_at desc);
create index if not exists tasks_tenant_id_workflow_id_idx on tasks(tenant_id, workflow_id);
create index if not exists tasks_tenant_id_assigned_to_idx on tasks(tenant_id, assigned_to);
create index if not exists tasks_tenant_id_status_due_date_idx on tasks(tenant_id, status, due_date);
create index if not exists blockers_tenant_id_status_created_at_idx on blockers(tenant_id, status, created_at desc);
create index if not exists blockers_tenant_id_status_flagged_at_idx on blockers(tenant_id, status, flagged_at desc);
create index if not exists blockers_tenant_id_severity_status_idx on blockers(tenant_id, severity, status);
create index if not exists blockers_tenant_id_client_id_status_idx on blockers(tenant_id, client_id, status);
create index if not exists blockers_tenant_id_task_id_status_idx on blockers(tenant_id, task_id, status);
create index if not exists activity_logs_tenant_id_created_at_idx on activity_logs(tenant_id, created_at desc);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_users_updated_at on users;
create trigger set_users_updated_at
before update on users
for each row execute function set_updated_at();

drop trigger if exists set_scope_templates_updated_at on scope_templates;
create trigger set_scope_templates_updated_at
before update on scope_templates
for each row execute function set_updated_at();

drop trigger if exists set_clients_updated_at on clients;
create trigger set_clients_updated_at
before update on clients
for each row execute function set_updated_at();

drop trigger if exists set_workflows_updated_at on workflows;
create trigger set_workflows_updated_at
before update on workflows
for each row execute function set_updated_at();

drop trigger if exists set_tasks_updated_at on tasks;
create trigger set_tasks_updated_at
before update on tasks
for each row execute function set_updated_at();

drop trigger if exists set_blockers_updated_at on blockers;
create trigger set_blockers_updated_at
before update on blockers
for each row execute function set_updated_at();

drop trigger if exists set_task_comments_updated_at on task_comments;
create trigger set_task_comments_updated_at
before update on task_comments
for each row execute function set_updated_at();

drop trigger if exists set_notification_preferences_updated_at on notification_preferences;
create trigger set_notification_preferences_updated_at
before update on notification_preferences
for each row execute function set_updated_at();

alter table tenants enable row level security;
alter table roles enable row level security;
alter table users enable row level security;
alter table clients enable row level security;
alter table scope_templates enable row level security;
alter table workflows enable row level security;
alter table tasks enable row level security;
alter table blockers enable row level security;
alter table activity_logs enable row level security;
alter table task_comments enable row level security;
alter table task_attachments enable row level security;
alter table time_entries enable row level security;
alter table notifications enable row level security;
alter table notification_preferences enable row level security;
