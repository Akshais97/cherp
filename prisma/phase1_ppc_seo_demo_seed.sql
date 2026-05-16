set search_path to erp, public;

do $$
declare
  v_tenant_id uuid;
  v_user_id uuid;
  v_ppc_template_id uuid;
  v_seo_template_id uuid;
  v_ppc_client_id uuid;
  v_seo_client_id uuid;
  v_ppc_workflow_id uuid;
  v_seo_workflow_id uuid;
begin
  select id into v_tenant_id
  from erp.tenants
  order by created_at asc
  limit 1;

  select id into v_user_id
  from erp.users
  where tenant_id = v_tenant_id and is_active = true
  order by created_at asc
  limit 1;

  if v_tenant_id is null or v_user_id is null then
    raise exception 'Seed requires at least one erp.tenants row and one active erp.users row.';
  end if;

  insert into erp.scope_templates (
    tenant_id,
    name,
    industry,
    service_type,
    description,
    duration_months,
    default_tasks,
    kpi_framework,
    created_by
  )
  values (
    v_tenant_id,
    'Demo Real Estate PPC Launch',
    'Real Estate',
    'PPC',
    'Demo PPC scope for testing client onboarding, workflow, task, and dashboard data flow.',
    3,
    '{
      "month_1": [
        {"title": "Audit landing page conversion path", "description": "Check form, CTA, offer, and mobile speed.", "priority": "high", "due_offset_days": 1},
        {"title": "Build PPC campaign structure", "description": "Create campaign, ad group, keyword, and negative keyword map.", "priority": "high", "due_offset_days": 3},
        {"title": "Launch tracking QA", "description": "Verify pixel, conversions, UTMs, and lead routing.", "priority": "medium", "due_offset_days": 5}
      ]
    }'::jsonb,
    '{"primary_kpi": "qualified_leads", "secondary_kpi": "cost_per_lead", "reporting": "weekly"}'::jsonb,
    v_user_id
  )
  on conflict (tenant_id, industry, service_type)
  do update set
    name = excluded.name,
    description = excluded.description,
    duration_months = excluded.duration_months,
    default_tasks = excluded.default_tasks,
    kpi_framework = excluded.kpi_framework,
    is_active = true,
    updated_at = now()
  returning id into v_ppc_template_id;

  insert into erp.scope_templates (
    tenant_id,
    name,
    industry,
    service_type,
    description,
    duration_months,
    default_tasks,
    kpi_framework,
    created_by
  )
  values (
    v_tenant_id,
    'Demo Healthcare SEO Sprint',
    'Healthcare',
    'SEO',
    'Demo SEO scope for testing organic workflow and task execution.',
    3,
    '{
      "month_1": [
        {"title": "Technical SEO crawl", "description": "Review indexability, redirects, metadata, and page speed.", "priority": "high", "due_offset_days": 2},
        {"title": "Local SEO profile cleanup", "description": "Update GBP, NAP, categories, and appointment links.", "priority": "medium", "due_offset_days": 4},
        {"title": "Service-page keyword mapping", "description": "Map procedures/services to target pages and queries.", "priority": "medium", "due_offset_days": 6}
      ]
    }'::jsonb,
    '{"primary_kpi": "organic_appointments", "secondary_kpi": "local_pack_visibility", "reporting": "weekly"}'::jsonb,
    v_user_id
  )
  on conflict (tenant_id, industry, service_type)
  do update set
    name = excluded.name,
    description = excluded.description,
    duration_months = excluded.duration_months,
    default_tasks = excluded.default_tasks,
    kpi_framework = excluded.kpi_framework,
    is_active = true,
    updated_at = now()
  returning id into v_seo_template_id;

  select id into v_ppc_client_id
  from erp.clients
  where tenant_id = v_tenant_id and name = 'Demo PPC - Aster Realty'
  limit 1;

  if v_ppc_client_id is null then
    insert into erp.clients (
      tenant_id,
      name,
      industry,
      service_type,
      contact_name,
      contact_email,
      status,
      monthly_retainer,
      currency,
      contract_duration,
      contract_start,
      contract_end,
      scope_template_id,
      retainer_hours,
      created_by
    )
    values (
      v_tenant_id,
      'Demo PPC - Aster Realty',
      'Real Estate',
      'PPC',
      'Aster Marketing Lead',
      'ppc-demo@example.com',
      'active',
      75000,
      'INR',
      3,
      current_date,
      (current_date + interval '3 months')::date,
      v_ppc_template_id,
      40,
      v_user_id
    )
    returning id into v_ppc_client_id;
  end if;

  select id into v_seo_client_id
  from erp.clients
  where tenant_id = v_tenant_id and name = 'Demo SEO - Niva Clinic'
  limit 1;

  if v_seo_client_id is null then
    insert into erp.clients (
      tenant_id,
      name,
      industry,
      service_type,
      contact_name,
      contact_email,
      status,
      monthly_retainer,
      currency,
      contract_duration,
      contract_start,
      contract_end,
      scope_template_id,
      retainer_hours,
      created_by
    )
    values (
      v_tenant_id,
      'Demo SEO - Niva Clinic',
      'Healthcare',
      'SEO',
      'Niva Operations Lead',
      'seo-demo@example.com',
      'active',
      55000,
      'INR',
      3,
      current_date,
      (current_date + interval '3 months')::date,
      v_seo_template_id,
      32,
      v_user_id
    )
    returning id into v_seo_client_id;
  end if;

  select id into v_ppc_workflow_id
  from erp.workflows
  where tenant_id = v_tenant_id and client_id = v_ppc_client_id and month_number = 1
  limit 1;

  if v_ppc_workflow_id is null then
    insert into erp.workflows (
      tenant_id,
      client_id,
      template_id,
      project_manager_id,
      title,
      status,
      month_number,
      completion_percentage,
      start_date,
      end_date,
      auto_generated
    )
    values (
      v_tenant_id,
      v_ppc_client_id,
      v_ppc_template_id,
      v_user_id,
      'Demo PPC - Aster Realty - Month 1 Workflow',
      'active',
      1,
      33.33,
      current_date,
      (current_date + interval '30 days')::date,
      true
    )
    returning id into v_ppc_workflow_id;
  end if;

  select id into v_seo_workflow_id
  from erp.workflows
  where tenant_id = v_tenant_id and client_id = v_seo_client_id and month_number = 1
  limit 1;

  if v_seo_workflow_id is null then
    insert into erp.workflows (
      tenant_id,
      client_id,
      template_id,
      project_manager_id,
      title,
      status,
      month_number,
      completion_percentage,
      start_date,
      end_date,
      auto_generated
    )
    values (
      v_tenant_id,
      v_seo_client_id,
      v_seo_template_id,
      v_user_id,
      'Demo SEO - Niva Clinic - Month 1 Workflow',
      'active',
      1,
      33.33,
      current_date,
      (current_date + interval '30 days')::date,
      true
    )
    returning id into v_seo_workflow_id;
  end if;

  insert into erp.tasks (
    tenant_id,
    workflow_id,
    assigned_to,
    completed_by,
    title,
    description,
    status,
    priority,
    sort_order,
    due_date,
    completed_at
  )
  select v_tenant_id, v_ppc_workflow_id, v_user_id, v_user_id, 'Audit landing page conversion path', 'Check form, CTA, offer, and mobile speed.', 'completed', 'high', 1, current_date + 1, now()
  where not exists (select 1 from erp.tasks where tenant_id = v_tenant_id and workflow_id = v_ppc_workflow_id and title = 'Audit landing page conversion path');

  insert into erp.tasks (tenant_id, workflow_id, assigned_to, title, description, status, priority, sort_order, due_date)
  select v_tenant_id, v_ppc_workflow_id, v_user_id, 'Build PPC campaign structure', 'Create campaign, ad group, keyword, and negative keyword map.', 'in_progress', 'high', 2, current_date + 3
  where not exists (select 1 from erp.tasks where tenant_id = v_tenant_id and workflow_id = v_ppc_workflow_id and title = 'Build PPC campaign structure');

  insert into erp.tasks (tenant_id, workflow_id, assigned_to, title, description, status, priority, sort_order, due_date)
  select v_tenant_id, v_ppc_workflow_id, v_user_id, 'Launch tracking QA', 'Verify pixel, conversions, UTMs, and lead routing.', 'pending', 'medium', 3, current_date + 5
  where not exists (select 1 from erp.tasks where tenant_id = v_tenant_id and workflow_id = v_ppc_workflow_id and title = 'Launch tracking QA');

  insert into erp.tasks (
    tenant_id,
    workflow_id,
    assigned_to,
    completed_by,
    title,
    description,
    status,
    priority,
    sort_order,
    due_date,
    completed_at
  )
  select v_tenant_id, v_seo_workflow_id, v_user_id, v_user_id, 'Technical SEO crawl', 'Review indexability, redirects, metadata, and page speed.', 'completed', 'high', 1, current_date + 2, now()
  where not exists (select 1 from erp.tasks where tenant_id = v_tenant_id and workflow_id = v_seo_workflow_id and title = 'Technical SEO crawl');

  insert into erp.tasks (tenant_id, workflow_id, assigned_to, title, description, status, priority, sort_order, due_date)
  select v_tenant_id, v_seo_workflow_id, v_user_id, 'Local SEO profile cleanup', 'Update GBP, NAP, categories, and appointment links.', 'in_progress', 'medium', 2, current_date + 4
  where not exists (select 1 from erp.tasks where tenant_id = v_tenant_id and workflow_id = v_seo_workflow_id and title = 'Local SEO profile cleanup');

  insert into erp.tasks (tenant_id, workflow_id, assigned_to, title, description, status, priority, sort_order, due_date)
  select v_tenant_id, v_seo_workflow_id, v_user_id, 'Service-page keyword mapping', 'Map procedures/services to target pages and queries.', 'pending', 'medium', 3, current_date + 6
  where not exists (select 1 from erp.tasks where tenant_id = v_tenant_id and workflow_id = v_seo_workflow_id and title = 'Service-page keyword mapping');

  update erp.workflows
  set completion_percentage = 33.33, updated_at = now()
  where id in (v_ppc_workflow_id, v_seo_workflow_id);

  insert into erp.activity_logs (
    tenant_id,
    user_id,
    action_type,
    entity_type,
    entity_id,
    after_values
  )
  select v_tenant_id, v_user_id, 'created', 'client', v_ppc_client_id, '{"seed": "phase1_ppc_seo_demo"}'::jsonb
  where not exists (
    select 1 from erp.activity_logs
    where tenant_id = v_tenant_id
      and entity_type = 'client'
      and entity_id = v_ppc_client_id
      and after_values->>'seed' = 'phase1_ppc_seo_demo'
  );

  insert into erp.activity_logs (
    tenant_id,
    user_id,
    action_type,
    entity_type,
    entity_id,
    after_values
  )
  select v_tenant_id, v_user_id, 'created', 'client', v_seo_client_id, '{"seed": "phase1_ppc_seo_demo"}'::jsonb
  where not exists (
    select 1 from erp.activity_logs
    where tenant_id = v_tenant_id
      and entity_type = 'client'
      and entity_id = v_seo_client_id
      and after_values->>'seed' = 'phase1_ppc_seo_demo'
  );
end $$;

select 'tenants' as table_name, count(*) from erp.tenants
union all select 'users', count(*) from erp.users
union all select 'scope_templates', count(*) from erp.scope_templates
union all select 'clients', count(*) from erp.clients
union all select 'workflows', count(*) from erp.workflows
union all select 'tasks', count(*) from erp.tasks
union all select 'activity_logs', count(*) from erp.activity_logs;
