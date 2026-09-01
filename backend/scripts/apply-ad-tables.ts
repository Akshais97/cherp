import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function applyAdTables() {
  console.log('Creating Ad Platform Integration tables in schema erp...')

  try {
    // 1. tenant_ad_integrations
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS erp.tenant_ad_integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES erp.tenants(id) ON DELETE CASCADE,
        platform VARCHAR(64) NOT NULL,
        is_enabled BOOLEAN NOT NULL DEFAULT true,
        client_id TEXT,
        client_secret TEXT,
        developer_token TEXT,
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at TIMESTAMPTZ,
        account_id TEXT,
        service_account_json JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT tenant_ad_integrations_tenant_id_platform_key UNIQUE (tenant_id, platform)
      );
    `)
    console.log('  ✔ Created table erp.tenant_ad_integrations')

    // 2. client_ad_accounts
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS erp.client_ad_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES erp.tenants(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES erp.clients(id) ON DELETE CASCADE,
        platform VARCHAR(64) NOT NULL,
        external_account_id VARCHAR(255) NOT NULL,
        account_name VARCHAR(255) NOT NULL,
        currency VARCHAR(16) NOT NULL DEFAULT 'INR',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT client_ad_accounts_unique UNIQUE (tenant_id, client_id, platform, external_account_id)
      );
    `)
    console.log('  ✔ Created table erp.client_ad_accounts')

    // 3. ad_sync_logs
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS erp.ad_sync_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES erp.tenants(id) ON DELETE CASCADE,
        platform VARCHAR(64) NOT NULL,
        account_id VARCHAR(255) NOT NULL,
        sync_type VARCHAR(64) NOT NULL,
        status VARCHAR(64) NOT NULL,
        records_synced INT NOT NULL DEFAULT 0,
        error_message TEXT,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );
    `)
    console.log('  ✔ Created table erp.ad_sync_logs')

    console.log('✅ ALL AD INTEGRATION TABLES CREATED SUCCESSFULLY IN DATABASE!')
  } catch (err) {
    console.error('❌ Table creation failed:', err)
  } finally {
    await prisma.$disconnect()
  }
}

applyAdTables()
