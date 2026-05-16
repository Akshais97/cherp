set search_path to erp, public;

alter table clients
  add column if not exists payment_terms text,
  add column if not exists renewal_date date;
