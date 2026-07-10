SET search_path TO erp, public;

ALTER TABLE erp.blockers
  ADD COLUMN IF NOT EXISTS notify JSONB DEFAULT '[]'::jsonb;
