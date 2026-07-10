-- Add checklist column to tasks table
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

-- Create index for performance
CREATE INDEX IF NOT EXISTS task_logs_tenant_id_task_id_idx ON erp.task_logs(tenant_id, task_id);

-- Enable Row Level Security (RLS) as required by database rules
ALTER TABLE erp.task_logs ENABLE ROW LEVEL SECURITY;
