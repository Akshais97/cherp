-- Alter tasks table to allow nullable workflow_id, and add slot and client_id columns
ALTER TABLE erp.tasks ALTER COLUMN workflow_id DROP NOT NULL;
ALTER TABLE erp.tasks ADD COLUMN IF NOT EXISTS slot text;
ALTER TABLE erp.tasks ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES erp.clients(id) ON DELETE CASCADE;

-- Alter blockers table to support notify and assigned_to columns
ALTER TABLE erp.blockers ADD COLUMN IF NOT EXISTS notify jsonb DEFAULT '[]'::jsonb;
ALTER TABLE erp.blockers ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES erp.users(id) ON DELETE SET NULL;

-- Alter tasks table to add checklist
ALTER TABLE erp.tasks ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Create task_logs table
CREATE TABLE IF NOT EXISTS erp.task_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES erp.tenants(id) ON DELETE RESTRICT,
  task_id uuid NOT NULL REFERENCES erp.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES erp.users(id) ON DELETE RESTRICT,
  field text NOT NULL,
  old_value text,
  new_value text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for performance on task_logs
CREATE INDEX IF NOT EXISTS task_logs_tenant_id_task_id_idx ON erp.task_logs(tenant_id, task_id);

-- Alter tasks table to add is_daily column
ALTER TABLE erp.tasks ADD COLUMN IF NOT EXISTS is_daily boolean DEFAULT false;

-- Alter tasks table to add blocked_previous_status column
ALTER TABLE erp.tasks ADD COLUMN IF NOT EXISTS blocked_previous_status varchar(50);

