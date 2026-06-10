SET search_path TO erp, public;

ALTER TABLE erp.clients
  ADD COLUMN IF NOT EXISTS ad_spend DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS total_investment DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS invoice_status TEXT,
  ADD COLUMN IF NOT EXISTS next_invoice_date DATE;
