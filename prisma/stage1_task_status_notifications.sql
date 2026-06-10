set search_path to erp, public;

alter table tasks alter column status set default 'yet_to_start';

update tasks
set status = case status
  when 'pending' then 'yet_to_start'
  when 'in_progress' then 'ongoing'
  else status
end
where status in ('pending', 'in_progress');

alter table tasks drop constraint if exists tasks_status_check;
alter table tasks add constraint tasks_status_check
  check (
    status in (
      'yet_to_start',
      'ongoing',
      'blocked',
      'completed',
      'task_approved_by_manager',
      'rework',
      'task_approved_by_client'
    )
  );

update tasks t
set status = 'blocked',
    completed_at = null,
    completed_by = null,
    updated_at = now()
where t.status <> 'task_approved_by_client'
  and exists (
    select 1
    from blockers b
    where b.tenant_id = t.tenant_id
      and b.task_id = t.id
      and b.status = 'open'
  );

alter table activity_logs drop constraint if exists activity_logs_action_type_check;
alter table activity_logs add constraint activity_logs_action_type_check
  check (
    action_type in (
      'created',
      'updated',
      'status_changed',
      'assigned',
      'completed',
      'blocked',
      'resolved',
      'archived',
      'deleted'
    )
  );
