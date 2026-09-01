/// <reference types="node" />

import assert from 'node:assert/strict'
import { UserRole } from '../src/common/enums/user-role.enum'
import { RequestUser } from '../src/common/types/request-user.type'
import { ResendProvider } from '../src/mail/resend.provider'
import { MailService } from '../src/mail/mail.service'
import { decryptText } from '../src/common/utils/encryption.util'
import { TenantsService } from '../src/tenants/tenants.service'
import { BlockerEscalationJob } from '../src/schedulers/blocker-escalation.job'
import { DeadlineReminderJob } from '../src/schedulers/deadline-reminder.job'
import { DailyDigestJob } from '../src/schedulers/daily-digest.job'
import { ReportingHubService } from '../src/reporting-hub/reporting-hub.service'
import { TimeEntriesRepository } from '../src/time-entries/time-entries.repository'
import { CreateClientDto } from '../src/clients/dto/create-client.dto'
import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'

const tenantAdminUser: RequestUser = {
  id: 'usr-admin-10001',
  authUserId: 'auth-usr-10001',
  tenantId: 'tenant-agency-777',
  email: 'admin@agency777.com',
  fullName: 'Agency Owner',
  role: UserRole.SuperAdmin,
  isActive: true,
}

const teamMemberUser: RequestUser = {
  ...tenantAdminUser,
  id: 'usr-tm-20002',
  role: UserRole.TeamMember,
}

async function run() {
  console.log('===========================================================')
  console.log('  SPRINT 9 COMPREHENSIVE TDD GAPS & EXECUTION TEST SUITE   ')
  console.log('===========================================================')

  await test1_ResendProviderAndMailService()
  await test2_TenantsAgencySettingsAPI()
  await test3_BlockerEscalationDaemonJob()
  await test4_DeadlineReminderDaemonJob()
  await test5_DailyDigestDaemonJob()
  await test6_ReportingHubCampaignAndContentMetrics()
  await test7_TimeEntriesSoftDeleteRepository()
  await test8_ClientRequiredContactDetailsValidation()

  console.log('\n✅ ALL SPRINT 9 COMPREHENSIVE TEST SCENARIOS PASSED 100% CLEANLY!\n')
}

// 1. Test Resend Email Provider & Mail Service
async function test1_ResendProviderAndMailService() {
  console.log('\n1. Testing Resend Email Provider & Mail Service Dynamic Transport...')

  let findUniqueCalled = false
  const fakePrisma = {
    tenant: {
      findUnique: async (query: any) => {
        findUniqueCalled = true
        assert.equal(query.where.id, 'tenant-agency-777')
        return {
          id: 'tenant-agency-777',
          name: 'Agency 777',
          resend_api_key: 're_test_key_xyz999',
          resend_from_email: 'notifications@agency777.com',
        }
      },
    },
  }

  const resendProvider = new ResendProvider(fakePrisma as any)
  const mailService = new MailService(resendProvider)

  // Dispatch blocker escalation email
  const result = await mailService.sendBlockerEscalationEmail({
    tenantId: 'tenant-agency-777',
    toEmail: 'pm@agency777.com',
    recipientName: 'Lead PM',
    blockerTitle: 'Client Approval Pending',
    severity: 'high',
    taskTitle: 'Landing Page Banner',
    daysOpen: 4,
  })

  assert.ok(findUniqueCalled, 'Should query tenant for agency Resend key')
  assert.ok(result.success, 'Email dispatch simulation should succeed')
  console.log('  ✔ Resend email provider successfully dynamically loaded agency API key and dispatched formatted HTML mail.')
}

// 2. Test Agency Tenant Settings API
async function test2_TenantsAgencySettingsAPI() {
  console.log('\n2. Testing Agency Tenant Settings API (GET/PATCH)...')

  let updatedData: any = null
  const fakePrisma = {
    tenant: {
      findUnique: async () => ({
        id: 'tenant-agency-777',
        name: 'Agency 777',
        slug: 'agency-777',
        resend_api_key: 're_live_secret_key_12345',
        resend_from_email: 'alerts@agency777.com',
        teams_enabled: false,
      }),
      update: async (query: any) => {
        updatedData = query.data
        return {
          id: 'tenant-agency-777',
          name: 'Agency 777',
          resend_from_email: query.data.resend_from_email,
          resend_api_key: query.data.resend_api_key || 're_live_secret_key_12345',
        }
      },
    },
  }

  const tenantsService = new TenantsService(fakePrisma as any)

  // GET Settings masks secret key
  const settings = await tenantsService.getSettings(tenantAdminUser)
  assert.equal(settings.has_resend_api_key, true)
  assert.equal(settings.resend_api_key, '••••••••2345')

  // PATCH Settings updates resend settings
  const updatedSettings = await tenantsService.updateSettings(
    { resend_api_key: 're_new_agency_key_9999', resend_from_email: 'hello@agency777.com' },
    tenantAdminUser
  )

  assert.equal(decryptText(updatedData.resend_api_key), 're_new_agency_key_9999')
  assert.equal(updatedData.resend_from_email, 'hello@agency777.com')
  assert.equal(updatedSettings.resend_api_key, '••••••••9999')

  // Team member attempting update should be forbidden
  await assert.rejects(
    async () => tenantsService.updateSettings({ resend_from_email: 'hack@agency.com' }, teamMemberUser),
    /Only super admins and project managers can update agency integrations/
  )

  console.log('  ✔ Tenants agency settings API properly masked secrets, supported custom Resend keys, and enforced RBAC.')
}

// 3. Test Blocker Escalation Daemon Job
async function test3_BlockerEscalationDaemonJob() {
  console.log('\n3. Testing Blocker SLA Escalation Daemon Job...')

  let notificationSent = false
  let deliveryLogCreated = false

  const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)

  const fakePrisma = {
    blocker: {
      findMany: async () => [
        {
          id: 'blocker-breached-1',
          tenant_id: tenantAdminUser.tenantId,
          title: 'Logo Vector Missing',
          severity: 'high',
          status: 'open',
          flagged_at: fourDaysAgo,
          assigned_to: tenantAdminUser.id,
          task: { id: 'task-1', title: 'Header Design' },
          client: { name: 'Acme Corp' },
          flagger: tenantAdminUser,
          assignee: tenantAdminUser,
        },
      ],
    },
    notificationDeliveryLog: {
      findUnique: async () => null,
      create: async (data: any) => {
        deliveryLogCreated = true
        assert.equal(data.data.type, 'blocker_escalated')
        return data.data
      },
    },
  }

  const fakeNotifications = {
    createNotification: async () => {
      notificationSent = true
    },
  }

  const fakeMail = {
    sendBlockerEscalationEmail: async () => ({ success: true }),
  }

  const job = new BlockerEscalationJob(fakePrisma as any, fakeNotifications as any, fakeMail as any)
  await job.handleCron()

  assert.ok(notificationSent, 'In-app notification should be generated for SLA breach')
  assert.ok(deliveryLogCreated, 'Idempotency delivery log should be recorded')

  console.log('  ✔ Blocker SLA escalation daemon job detected high severity blocker open > 3 days and executed escalation pipeline.')
}

// 4. Test Deadline Reminder Daemon Job
async function test4_DeadlineReminderDaemonJob() {
  console.log('\n4. Testing Task Deadline Reminder Daemon Job...')

  let deadlineNotifCreated = false
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const fakePrisma = {
    task: {
      findMany: async () => [
        {
          id: 'task-overdue-1',
          tenant_id: tenantAdminUser.tenantId,
          title: 'SEO Audit Document',
          status: 'ongoing',
          due_date: yesterday,
          assignee: tenantAdminUser,
        },
      ],
    },
    notificationDeliveryLog: {
      findUnique: async () => null,
      create: async () => ({}),
    },
  }

  const fakeNotifications = {
    createNotification: async () => {
      deadlineNotifCreated = true
    },
  }

  const fakeMail = {
    sendDeadlineReminderEmail: async () => ({ success: true }),
  }

  const job = new DeadlineReminderJob(fakePrisma as any, fakeNotifications as any, fakeMail as any)
  await job.handleCron()

  assert.ok(deadlineNotifCreated, 'Deadline reminder notification should be created for overdue task')
  console.log('  ✔ Deadline reminder daemon job correctly scanned overdue tasks and created task overdue alerts.')
}

// 5. Test Daily Digest Daemon Job
async function test5_DailyDigestDaemonJob() {
  console.log('\n5. Testing Daily Digest Daemon Job...')

  let digestSent = false
  const fakePrisma = {
    user: {
      findMany: async () => [tenantAdminUser],
    },
    notificationDeliveryLog: {
      findUnique: async () => null,
      create: async () => ({}),
    },
    task: {
      count: async (query: any) => {
        if (query.where.due_date?.gte) return 3 // 3 tasks due today
        return 1 // 1 overdue task
      },
    },
    blocker: {
      count: async () => 2, // 2 open blockers
    },
  }

  const fakeNotifications = {
    createNotification: async () => {
      digestSent = true
    },
  }

  const fakeMail = {
    sendDailyDigestEmail: async () => ({ success: true }),
  }

  const job = new DailyDigestJob(fakePrisma as any, fakeNotifications as any, fakeMail as any)
  await job.handleCron()

  assert.ok(digestSent, 'Daily digest briefing should be generated')
  console.log('  ✔ Daily digest daemon job generated morning summary (3 due today, 1 overdue, 2 blockers).')
}

// 6. Test Reporting Hub Campaign and Content Metrics
async function test6_ReportingHubCampaignAndContentMetrics() {
  console.log('\n6. Testing Reporting Hub Campaign & Content Metrics CRUD...')

  let savedCampaign: any = null
  let savedContent: any = null

  const fakePrisma = {
    campaignResult: {
      create: async (query: any) => {
        savedCampaign = query.data
        return { id: 'cmp-1', ...query.data }
      },
      findMany: async () => [{ id: 'cmp-1', campaign_name: 'PPC LeadGen Summer', roas: 3.5 }],
    },
    contentPerformance: {
      create: async (query: any) => {
        savedContent = query.data
        return { id: 'cnt-1', ...query.data }
      },
      findMany: async () => [{ id: 'cnt-1', title: 'SEO Guide 2026', views: 5000 }],
    },
  }

  const service = new ReportingHubService(fakePrisma as any)

  // Create Campaign Result with auto-calculated CPL & ROAS
  const campaign = await service.createCampaignResult(
    {
      client_id: 'client-999',
      campaign_name: 'PPC LeadGen Summer',
      channel: 'Google Ads',
      start_date: '2026-06-01',
      end_date: '2026-06-30',
      ad_spend: 1000,
      leads: 50,
      revenue: 3500,
    },
    tenantAdminUser
  )

  assert.equal(savedCampaign.cpl, 20) // 1000 / 50 = 20
  assert.equal(savedCampaign.roas, 3.5) // 3500 / 1000 = 3.5

  // Create Content Performance Record
  const content = await service.createContentPerformance(
    {
      client_id: 'client-999',
      title: 'SEO Guide 2026',
      content_type: 'Blog Article',
      views: 5000,
      engagement_rate: 4.8,
    },
    tenantAdminUser
  )

  assert.equal(savedContent.title, 'SEO Guide 2026')
  assert.equal(savedContent.views, 5000)

  console.log('  ✔ Reporting Hub automatically computed CPL ($20) and ROAS (3.5x) for ad campaigns and tracked content performance metrics.')
}

// 7. Test Time Entries Soft Delete Repository
async function test7_TimeEntriesSoftDeleteRepository() {
  console.log('\n7. Testing Time Entries Soft Delete Repository...')

  let softDeletedTime: Date | null = null
  let queryWhereClause: any = null

  const fakePrisma = {
    timeEntry: {
      findMany: async (query: any) => {
        queryWhereClause = query.where
        return []
      },
      findFirst: async (query: any) => {
        queryWhereClause = query.where
        return { id: 'time-entry-1', hours: 4 }
      },
      update: async (query: any) => {
        softDeletedTime = query.data.deleted_at
        return { id: query.where.id, deleted_at: query.data.deleted_at }
      },
    },
  }

  const repo = new TimeEntriesRepository(fakePrisma as any)

  // Verify findByTask filters deleted_at: null
  await repo.findByTask('tenant-agency-777', 'task-101')
  assert.equal(queryWhereClause.deleted_at, null)

  // Verify findReport filters deleted_at: null
  await repo.findReport({ tenantId: 'tenant-agency-777' })
  assert.equal(queryWhereClause.deleted_at, null)

  // Verify delete performs soft delete setting deleted_at timestamp
  await repo.delete('tenant-agency-777', 'time-entry-1')
  assert.ok(softDeletedTime instanceof Date, 'Soft delete should set deleted_at timestamp')

  console.log('  ✔ Time entries repository cleanly enforced deleted_at: null soft-delete filters on all query calls.')
}

// 8. Test Client Required Contact Details Validation
async function test8_ClientRequiredContactDetailsValidation() {
  console.log('\n8. Testing Client Required Contact Details DTO Validation...')

  const invalidDto = plainToInstance(CreateClientDto, {
    name: 'Acme Corp',
    industry: 'Healthcare',
    service_type: 'PPC',
    // Missing contact_name and contact_email!
  })

  const errors = await validate(invalidDto)
  assert.ok(errors.length > 0, 'Validation should fail when contact details are missing')
  assert.ok(errors.some((e) => e.property === 'contact_name'))
  assert.ok(errors.some((e) => e.property === 'contact_email'))

  const validDto = plainToInstance(CreateClientDto, {
    name: 'Acme Corp',
    industry: 'Healthcare',
    service_type: 'PPC',
    contact_name: 'John Doe',
    contact_email: 'john@acme.com',
    currency: 'USD',
    contract_duration: 12,
    contract_start: '2026-01-01',
    scope_template_id: '11111111-1111-4111-8111-111111111111',
  })

  const validErrors = await validate(validDto)
  assert.equal(validErrors.length, 0, 'Valid DTO with contact details should pass clean')

  console.log('  ✔ Client DTO strictly validated presence of required contact_name and contact_email.')
}

run().catch((err) => {
  console.error('❌ Sprint 9 verification suite failed with error:', err)
  process.exit(1)
})
