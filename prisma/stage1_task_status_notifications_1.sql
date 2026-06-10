SET search_path TO erp, public;

-- 1. Drop the old constraint so Postgres lets us change the data freely
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- 2. Update the existing rows to use the new status values FIRST
UPDATE tasks
SET status = CASE status
  WHEN 'pending' THEN 'yet_to_start'
  WHEN 'in_progress' THEN 'ongoing'
  ELSE status
END
WHERE status IN ('pending', 'in_progress');

-- 3. Now that NO rows contain 'pending' or 'in_progress', apply the new constraint
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (
    status IN (
      'yet_to_start',
      'ongoing',
      'blocked',
      'completed',
      'task_approved_by_manager',
      'rework',
      'task_approved_by_client'
    )
  );

-- 4. Set the default for future rows
ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'yet_to_start';

-- 5. Automatically block tasks that have open blockers
UPDATE tasks t
SET status = 'blocked',
    completed_at = NULL,
    completed_by = NULL,
    updated_at = NOW()
WHERE t.status <> 'task_approved_by_client'
  AND EXISTS (
    SELECT 1
    FROM blockers b
    WHERE b.tenant_id = t.tenant_id
      AND b.task_id = t.id
      AND b.status = 'open'
  );

-- 6. Update your activity log constraints
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_action_type_check;
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_action_type_check
  CHECK (
    action_type IN (
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