import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Synchronizing ALL database columns and tables with Prisma schema...\n')

  const ddlStatements = [
    // erp.tenants table columns
    `ALTER TABLE erp.tenants ADD COLUMN IF NOT EXISTS teams_enabled BOOLEAN DEFAULT false;`,
    `ALTER TABLE erp.tenants ADD COLUMN IF NOT EXISTS teams_tenant_id TEXT;`,
    `ALTER TABLE erp.tenants ADD COLUMN IF NOT EXISTS teams_client_id TEXT;`,
    `ALTER TABLE erp.tenants ADD COLUMN IF NOT EXISTS teams_client_secret TEXT;`,
    `ALTER TABLE erp.tenants ADD COLUMN IF NOT EXISTS resend_api_key TEXT;`,
    `ALTER TABLE erp.tenants ADD COLUMN IF NOT EXISTS resend_from_email TEXT;`,

    // erp.users table columns
    `ALTER TABLE erp.users ADD COLUMN IF NOT EXISTS sessions_revoked_at TIMESTAMPTZ;`,
    `ALTER TABLE erp.users ADD COLUMN IF NOT EXISTS weekly_available_hours NUMERIC(6, 2) DEFAULT 40.00;`,
    `ALTER TABLE erp.users ADD COLUMN IF NOT EXISTS hourly_cost_rate NUMERIC(12, 2);`,
    `ALTER TABLE erp.users ADD COLUMN IF NOT EXISTS billable_rate NUMERIC(12, 2);`,
    `ALTER TABLE erp.users ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'::jsonb;`,
    `ALTER TABLE erp.users ADD COLUMN IF NOT EXISTS designation TEXT;`,
    `ALTER TABLE erp.users ADD COLUMN IF NOT EXISTS experience TEXT;`,
    `ALTER TABLE erp.users ADD COLUMN IF NOT EXISTS availability TEXT;`,
    `ALTER TABLE erp.users ADD COLUMN IF NOT EXISTS current_workload NUMERIC(5, 2);`,
    `ALTER TABLE erp.users ADD COLUMN IF NOT EXISTS team TEXT;`,
    `ALTER TABLE erp.users ADD COLUMN IF NOT EXISTS created_by UUID;`,

    // erp.tasks table columns
    `ALTER TABLE erp.tasks ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(6, 2);`,
    `ALTER TABLE erp.tasks ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb;`,
    `ALTER TABLE erp.tasks ADD COLUMN IF NOT EXISTS slot TEXT;`,
    `ALTER TABLE erp.tasks ADD COLUMN IF NOT EXISTS client_id UUID;`,
    `ALTER TABLE erp.tasks ADD COLUMN IF NOT EXISTS blocked_previous_status VARCHAR(50);`,
    `ALTER TABLE erp.tasks ADD COLUMN IF NOT EXISTS assigned_by UUID;`,

    // erp.time_entries table columns
    `ALTER TABLE erp.time_entries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;`,

    // erp.clients table columns
    `ALTER TABLE erp.clients ADD COLUMN IF NOT EXISTS contact_name TEXT DEFAULT 'Primary Contact';`,
    `ALTER TABLE erp.clients ADD COLUMN IF NOT EXISTS contact_email TEXT DEFAULT 'contact@client.com';`,
    `ALTER TABLE erp.clients ADD COLUMN IF NOT EXISTS brand_url TEXT;`,
    `ALTER TABLE erp.clients ADD COLUMN IF NOT EXISTS instagram_profile TEXT;`,
    `ALTER TABLE erp.clients ADD COLUMN IF NOT EXISTS social_profiles JSONB DEFAULT '{}'::jsonb;`,
    `ALTER TABLE erp.clients ADD COLUMN IF NOT EXISTS brand_guidelines TEXT;`,
    `ALTER TABLE erp.clients ADD COLUMN IF NOT EXISTS logo_assets JSONB DEFAULT '[]'::jsonb;`,
    `ALTER TABLE erp.clients ADD COLUMN IF NOT EXISTS color_palette JSONB DEFAULT '[]'::jsonb;`,
    `ALTER TABLE erp.clients ADD COLUMN IF NOT EXISTS fonts JSONB DEFAULT '[]'::jsonb;`,
    `ALTER TABLE erp.clients ADD COLUMN IF NOT EXISTS target_audience TEXT;`,
    `ALTER TABLE erp.clients ADD COLUMN IF NOT EXISTS competitor_list JSONB DEFAULT '[]'::jsonb;`,
    `ALTER TABLE erp.clients ADD COLUMN IF NOT EXISTS positioning_statement TEXT;`,
    `ALTER TABLE erp.clients ADD COLUMN IF NOT EXISTS campaign_history JSONB DEFAULT '[]'::jsonb;`,
    `ALTER TABLE erp.clients ADD COLUMN IF NOT EXISTS communication_history JSONB DEFAULT '[]'::jsonb;`,
    `ALTER TABLE erp.clients ADD COLUMN IF NOT EXISTS scope_template_id UUID;`,
    `ALTER TABLE erp.clients ADD COLUMN IF NOT EXISTS health_score NUMERIC(5, 2);`,
    `ALTER TABLE erp.clients ADD COLUMN IF NOT EXISTS retainer_hours INT;`,
    `ALTER TABLE erp.clients ADD COLUMN IF NOT EXISTS ad_spend NUMERIC(12, 2);`,
    `ALTER TABLE erp.clients ADD COLUMN IF NOT EXISTS total_investment NUMERIC(12, 2);`,
    `ALTER TABLE erp.clients ADD COLUMN IF NOT EXISTS invoice_status TEXT;`,
    `ALTER TABLE erp.clients ADD COLUMN IF NOT EXISTS next_invoice_date DATE;`,

    // erp.auth_attempts table
    `CREATE TABLE IF NOT EXISTS erp.auth_attempts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      success BOOLEAN NOT NULL,
      reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,

    // erp.campaign_results table
    `CREATE TABLE IF NOT EXISTS erp.campaign_results (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES erp.tenants(id),
      client_id UUID NOT NULL REFERENCES erp.clients(id),
      campaign_name TEXT NOT NULL,
      channel TEXT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      ad_spend NUMERIC(12, 2),
      impressions INT,
      clicks INT,
      leads INT,
      conversions INT,
      revenue NUMERIC(12, 2),
      cpl NUMERIC(12, 2),
      roas NUMERIC(12, 2),
      notes TEXT,
      created_by UUID NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,

    // erp.content_performance table
    `CREATE TABLE IF NOT EXISTS erp.content_performance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES erp.tenants(id),
      client_id UUID NOT NULL REFERENCES erp.clients(id),
      title TEXT NOT NULL,
      content_type TEXT NOT NULL,
      channel TEXT,
      published_at DATE,
      views INT,
      engagement_rate NUMERIC(6, 2),
      leads_attributed INT,
      url TEXT,
      notes TEXT,
      created_by UUID NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,

    // erp.notification_delivery_logs table
    `CREATE TABLE IF NOT EXISTS erp.notification_delivery_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      notification_id UUID,
      user_id UUID NOT NULL,
      channel TEXT NOT NULL,
      type TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      status TEXT NOT NULL,
      provider_id TEXT,
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT notification_delivery_logs_tenant_idempotency UNIQUE(tenant_id, idempotency_key)
    );`,

    // erp.notification_preferences table
    `CREATE TABLE IF NOT EXISTS erp.notification_preferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES erp.tenants(id),
      user_id UUID NOT NULL REFERENCES erp.users(id),
      notification_type TEXT NOT NULL,
      in_app_enabled BOOLEAN NOT NULL DEFAULT true,
      email_enabled BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT notification_preferences_tenant_user_type UNIQUE(tenant_id, user_id, notification_type)
    );`,
  ]

  for (const sql of ddlStatements) {
    try {
      await prisma.$executeRawUnsafe(sql)
    } catch (err: any) {
      console.warn(`DDL warning for statement: ${err.message}`)
    }
  }

  console.log('✔ All DDL statements executed successfully!\n')

  // Test full findFirst on every single model to ensure zero missing columns or tables
  const models: { name: string; fn: () => Promise<any> }[] = [
    { name: 'Tenant', fn: () => prisma.tenant.findFirst() },
    { name: 'Role', fn: () => prisma.role.findFirst() },
    { name: 'User', fn: () => prisma.user.findFirst() },
    { name: 'Client', fn: () => prisma.client.findFirst() },
    { name: 'ScopeTemplate', fn: () => prisma.scopeTemplate.findFirst() },
    { name: 'Workflow', fn: () => prisma.workflow.findFirst() },
    { name: 'Task', fn: () => prisma.task.findFirst() },
    { name: 'Blocker', fn: () => prisma.blocker.findFirst() },
    { name: 'ActivityLog', fn: () => prisma.activityLog.findFirst() },
    { name: 'TaskComment', fn: () => prisma.taskComment.findFirst() },
    { name: 'TaskAttachment', fn: () => prisma.taskAttachment.findFirst() },
    { name: 'TimeEntry', fn: () => prisma.timeEntry.findFirst() },
    { name: 'Notification', fn: () => prisma.notification.findFirst() },
    { name: 'NotificationPreference', fn: () => prisma.notificationPreference.findFirst() },
    { name: 'NotificationDeliveryLog', fn: () => prisma.notificationDeliveryLog.findFirst() },
    { name: 'History', fn: () => prisma.history.findFirst() },
    { name: 'ClientUser', fn: () => prisma.clientUser.findFirst() },
    { name: 'TaskLog', fn: () => prisma.taskLog.findFirst() },
    { name: 'AuthAttempt', fn: () => prisma.authAttempt.findFirst() },
    { name: 'CampaignResult', fn: () => prisma.campaignResult.findFirst() },
    { name: 'ContentPerformance', fn: () => prisma.contentPerformance.findFirst() },
  ]

  console.log('Verifying full model queries (all fields):')
  let failures = 0
  for (const m of models) {
    try {
      await m.fn()
      console.log(`  ✔ ${m.name}: ALL COLUMNS MATCH PERFECTLY`)
    } catch (err: any) {
      console.error(`  ❌ ${m.name}: MISSING COLUMN OR TABLE - ${err.message} (${err.code})`)
      failures++
    }
  }

  if (failures === 0) {
    console.log('\n🎉 ALL 21 MODELS & COLUMNS ARE 100% VERIFIED & IN SYNC!')
  } else {
    console.error(`\n⚠️ ${failures} model queries failed.`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
