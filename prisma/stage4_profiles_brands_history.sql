set search_path to erp, public;

alter table clients
  add column if not exists brand_url text,
  add column if not exists instagram_profile text,
  add column if not exists social_profiles jsonb not null default '{}'::jsonb,
  add column if not exists brand_guidelines text,
  add column if not exists logo_assets jsonb not null default '[]'::jsonb,
  add column if not exists color_palette jsonb not null default '[]'::jsonb,
  add column if not exists fonts jsonb not null default '[]'::jsonb,
  add column if not exists target_audience text,
  add column if not exists competitor_list jsonb not null default '[]'::jsonb,
  add column if not exists positioning_statement text,
  add column if not exists campaign_history jsonb not null default '[]'::jsonb,
  add column if not exists communication_history jsonb not null default '[]'::jsonb;

alter table users
  add column if not exists skills jsonb not null default '[]'::jsonb,
  add column if not exists designation text,
  add column if not exists experience text,
  add column if not exists availability text,
  add column if not exists current_workload numeric(5, 2),
  add column if not exists team text check (
    team is null or team in (
      'Brand Manager',
      'Copywriter',
      'Creative Designer',
      'Video Editor',
      'SEO Specialist',
      'Performance Marketer',
      'Marketing Automation'
    )
  );

create table if not exists history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  user_id uuid not null references users(id),
  date date not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists history_tenant_user_date_idx
  on history(tenant_id, user_id, date);
