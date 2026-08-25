-- Migration script for threaded comments & @mentions on tasks

ALTER TABLE erp.task_comments 
ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES erp.task_comments(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS mentioned_user_ids TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_task_comments_parent ON erp.task_comments(parent_comment_id);
