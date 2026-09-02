-- Performance indexes for the live CHERP database.
-- Run this file outside a transaction: PostgreSQL does not allow
-- CREATE INDEX CONCURRENTLY inside a transaction block.

-- 1. Tasks Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_tenant_client ON erp.tasks (tenant_id, client_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_tenant_parent ON erp.tasks (tenant_id, parent_task_id);

-- 2. Activity Logs Index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_tenant_user_created ON erp.activity_logs (tenant_id, user_id, created_at);

-- 3. Task Attachments Index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_attachments_tenant_task ON erp.task_attachments (tenant_id, task_id);

-- 4. Time Entries Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_entries_tenant_user_date ON erp.time_entries (tenant_id, user_id, date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_entries_tenant_task ON erp.time_entries (tenant_id, task_id);

-- 5. Notifications Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_tenant_user_is_read ON erp.notifications (tenant_id, user_id, is_read);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_tenant_user_created ON erp.notifications (tenant_id, user_id, created_at);
