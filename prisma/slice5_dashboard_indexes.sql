set search_path to erp, public;

create index if not exists tasks_tenant_id_status_due_date_idx
  on tasks(tenant_id, status, due_date);

create index if not exists blockers_tenant_id_status_flagged_at_idx
  on blockers(tenant_id, status, flagged_at desc);
