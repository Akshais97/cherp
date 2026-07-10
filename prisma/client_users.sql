SET search_path TO erp, public;

CREATE TABLE IF NOT EXISTS erp.client_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES erp.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES erp.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES erp.clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT client_users_tenant_user_client_key UNIQUE (tenant_id, user_id, client_id)
);

CREATE INDEX IF NOT EXISTS client_users_tenant_id_idx ON erp.client_users(tenant_id);
CREATE INDEX IF NOT EXISTS client_users_user_id_idx ON erp.client_users(user_id);
CREATE INDEX IF NOT EXISTS client_users_client_id_idx ON erp.client_users(client_id);
