set search_path to erp, public;

create index if not exists blockers_tenant_id_status_created_at_idx
  on blockers(tenant_id, status, created_at desc);

create index if not exists blockers_tenant_id_severity_status_idx
  on blockers(tenant_id, severity, status);

create index if not exists blockers_tenant_id_client_id_status_idx
  on blockers(tenant_id, client_id, status);

create index if not exists blockers_tenant_id_task_id_status_idx
  on blockers(tenant_id, task_id, status);
