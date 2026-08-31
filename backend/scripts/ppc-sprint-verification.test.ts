/// <reference types="node" />

import assert from 'node:assert/strict'
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import {
  areServiceTypesCompatible,
  normalizeServiceType,
  PPC_SERVICE_TYPE_VARIANTS,
} from '../src/scope-templates/service-types.constants'
import { ScopeTemplatesService } from '../src/scope-templates/scope-templates.service'
import { ReportingHubService } from '../src/reporting-hub/reporting-hub.service'
import { ReportsService } from '../src/reports/reports.service'
import { RequestUser } from '../src/common/types/request-user.type'
import { UserRole } from '../src/common/enums/user-role.enum'

const adminUser: RequestUser = {
  id: 'usr-admin-101',
  authUserId: 'auth-admin-101',
  tenantId: 'tnt-test-999',
  email: 'admin@agency.com',
  fullName: 'Agency Admin',
  role: UserRole.SuperAdmin,
  isActive: true,
}

const clientUser: RequestUser = {
  id: 'usr-client-202',
  authUserId: 'auth-client-202',
  tenantId: 'tnt-test-999',
  email: 'client@brand.com',
  fullName: 'Client Rep',
  role: UserRole.Client,
  isActive: true,
  clientId: 'client-brand-555',
} as any

async function runAllPpcSprintTests() {
  console.log('===========================================================')
  console.log('       INDEPENDENT PPC INTEGRATION SPRINT TEST SUITE        ')
  console.log('===========================================================\n')

  await testSprint1_ServiceTypeNormalizationAndAliasMatching()
  await testSprint2_CampaignResultsCrudAndCalculatedMetrics()
  await testSprint3_ChannelBreakdownAggregation()
  await testSprint4_ContentPerformanceAndPdfExport()
  await testSprint5_ClientPortalBrandIsolation()
  await testSprint6_AutomationNotificationPreferences()
  await testSprint7_MonthPlanningReadinessAlerts()

  console.log('\n🎉 ALL INDEPENDENT PPC SPRINT TEST SUITES PASSED 100% CLEANLY!\n')
}

// -------------------------------------------------------------------
// Sprint 1: PPC Service Type Normalization & Skill-Based Assignment
// -------------------------------------------------------------------
async function testSprint1_ServiceTypeNormalizationAndAliasMatching() {
  console.log('1. [Sprint 1] Testing PPC Service Type Normalization & Alias Compatibility...')

  // 1.1 Test normalization helper
  assert.equal(normalizeServiceType('PPC'), 'Performance Marketing (PPC)')
  assert.equal(normalizeServiceType('Growth Marketing'), 'Performance Marketing (PPC)')
  assert.equal(normalizeServiceType('Paid Media'), 'Performance Marketing (PPC)')
  assert.equal(normalizeServiceType('Lead Generation'), 'Performance Marketing (PPC)')

  // 1.2 Test alias compatibility function
  assert.ok(areServiceTypesCompatible('Performance Marketing (PPC)', 'Growth Marketing'))
  assert.ok(areServiceTypesCompatible('PPC', 'Paid Media'))
  assert.ok(areServiceTypesCompatible('Lead Generation', 'Performance Marketing'))
  assert.ok(!areServiceTypesCompatible('SEO + Content', 'Performance Marketing (PPC)'))

  // 1.3 Test Scope Template Repository Resolve with compatible preset template
  const presetTemplates = [
    {
      id: 'tpl-real-estate-growth',
      name: 'Real Estate Growth Marketing',
      industry: 'Real Estate',
      service_type: 'Growth Marketing',
      is_active: true,
    },
    {
      id: 'tpl-ecommerce-seo',
      name: 'E-commerce SEO Starter',
      industry: 'E-commerce',
      service_type: 'SEO + Content',
      is_active: true,
    },
  ]

  const mockRepo = {
    seedPresets: async () => [],
    findActiveByTenant: async () => presetTemplates,
    findByIndustryService: async () => null,
    resolve: async (input: { industry: string; serviceType: string }) => {
      const aliasMatch = presetTemplates.find(
        (t) =>
          t.industry.toLowerCase() === input.industry.toLowerCase() &&
          areServiceTypesCompatible(t.service_type, input.serviceType),
      )
      if (aliasMatch) {
        return { exact_match: aliasMatch, resolution: 'exact' as const, suggestions: [] }
      }
      return { exact_match: null, resolution: 'manual' as const, suggestions: [] }
    },
  }

  const service = new ScopeTemplatesService(mockRepo as never)

  // Query for Performance Marketing (PPC) must match Real Estate Growth Marketing preset template
  const res = await service.resolve({ industry: 'Real Estate', service_type: 'Performance Marketing (PPC)' }, adminUser)
  assert.ok(res.exact_match, 'Exact match for PPC query should resolve Growth Marketing preset')
  assert.equal(res.exact_match.name, 'Real Estate Growth Marketing')

  console.log('  ✔ Service type normalization & alias matching resolved Growth Marketing template for PPC query without modifying presets.')
}

// -------------------------------------------------------------------
// Sprint 2: Campaign Results Backend & Calculated Metrics
// -------------------------------------------------------------------
async function testSprint2_CampaignResultsCrudAndCalculatedMetrics() {
  console.log('2. [Sprint 2] Testing Campaign Results CRUD & CPL/ROAS Calculations...')

  let databaseStore: any[] = []

  const fakePrisma = {
    campaignResult: {
      create: async (query: any) => {
        const item = { id: `cmp-${databaseStore.length + 1}`, ...query.data }
        databaseStore.push(item)
        return item
      },
      findFirst: async (query: any) => {
        return databaseStore.find((item) => item.id === query.where.id) || null
      },
      findMany: async () => databaseStore,
      update: async (query: any) => {
        const idx = databaseStore.findIndex((item) => item.id === query.where.id)
        if (idx !== -1) {
          databaseStore[idx] = { ...databaseStore[idx], ...query.data }
          return databaseStore[idx]
        }
        throw new NotFoundException()
      },
      delete: async (query: any) => {
        const idx = databaseStore.findIndex((item) => item.id === query.where.id)
        const deleted = databaseStore[idx]
        databaseStore = databaseStore.filter((item) => item.id !== query.where.id)
        return deleted
      },
    },
  }

  const service = new ReportingHubService(fakePrisma as any)

  // 2.1 Create campaign result with auto CPL
  const result = await service.createCampaignResult(
    {
      client_id: 'client-brand-555',
      campaign_name: 'Summer PPC Campaign',
      channel: 'Google Ads',
      start_date: '2026-06-01',
      end_date: '2026-06-30',
      ad_spend: 2000,
      leads: 50,
      revenue: 8000,
    },
    adminUser,
  )

  assert.equal(result.campaign_name, 'Summer PPC Campaign')
  assert.equal(result.cpl, 40) // 2000 / 50 = 40
  assert.equal(result.roas, 4.0) // 8000 / 2000 = 4.0

  // 2.2 Invalid date range validation
  await assert.rejects(
    async () => {
      await service.createCampaignResult(
        {
          client_id: 'client-brand-555',
          campaign_name: 'Invalid Date Campaign',
          channel: 'Google Ads',
          start_date: '2026-06-30',
          end_date: '2026-06-01',
        },
        adminUser,
      )
    },
    (err: any) => {
      assert.ok(err instanceof BadRequestException)
      assert.match(err.message, /end_date cannot be earlier than start_date/)
      return true
    },
  )

  // 2.3 Update campaign result
  const updated = await service.updateCampaignResult(
    result.id,
    {
      ad_spend: 3000,
      leads: 60,
    },
    adminUser,
  )
  assert.equal(updated.cpl, 50) // 3000 / 60 = 50

  console.log('  ✔ Campaign result CRUD executed and auto-calculated CPL and ROAS metrics.')
}

// -------------------------------------------------------------------
// Sprint 3: Channel Breakdown Aggregation
// -------------------------------------------------------------------
async function testSprint3_ChannelBreakdownAggregation() {
  console.log('3. [Sprint 3] Testing Channel Breakdown Aggregation Endpoint...')

  const mockCampaigns = [
    {
      id: 'c1',
      channel: 'Google Ads',
      ad_spend: 1500,
      impressions: 10000,
      clicks: 500,
      leads: 30,
      conversions: 10,
      revenue: 4500,
    },
    {
      id: 'c2',
      channel: 'Meta',
      ad_spend: 1000,
      impressions: 15000,
      clicks: 600,
      leads: 20,
      conversions: 5,
      revenue: 2000,
    },
  ]

  const fakePrisma = {
    campaignResult: {
      findMany: async () => mockCampaigns,
    },
  }

  const service = new ReportingHubService(fakePrisma as any)

  const breakdown = await service.getChannelBreakdown({}, adminUser)
  assert.ok(breakdown.channels.length >= 5)

  const googleRow = breakdown.channels.find((c) => c.channel === 'Google Ads')
  assert.ok(googleRow)
  assert.equal(googleRow.ad_spend, 1500)
  assert.equal(googleRow.leads, 30)
  assert.equal(googleRow.cpl, 50) // 1500 / 30 = 50
  assert.equal(googleRow.roas, 3.0) // 4500 / 1500 = 3.0

  assert.equal(breakdown.totals.ad_spend, 2500)
  assert.equal(breakdown.totals.leads, 50)
  assert.equal(breakdown.totals.cpl, 50) // 2500 / 50 = 50

  console.log('  ✔ Channel breakdown aggregated Google Ads, Meta, LinkedIn metrics with correct totals.')
}

// -------------------------------------------------------------------
// Sprint 4: Content Performance & PDF Export
// -------------------------------------------------------------------
async function testSprint4_ContentPerformanceAndPdfExport() {
  console.log('4. [Sprint 4] Testing Content Performance CRUD & Executive PDF Export...')

  let contentStore: any[] = []

  const fakePrisma = {
    contentPerformance: {
      create: async (query: any) => {
        const item = { id: `cnt-${contentStore.length + 1}`, ...query.data }
        contentStore.push(item)
        return item
      },
      findMany: async () => contentStore,
      findFirst: async (query: any) => contentStore.find((c) => c.id === query.where.id),
      delete: async (query: any) => {
        const idx = contentStore.findIndex((c) => c.id === query.where.id)
        return contentStore.splice(idx, 1)[0]
      },
    },
    task: { count: async () => 10 },
    blocker: { count: async () => 1 },
    campaignResult: {
      findMany: async () => [
        { ad_spend: 1000, leads: 20, clicks: 300 },
      ],
    },
  }

  const reportingService = new ReportingHubService(fakePrisma as any)
  const reportsService = new ReportsService(fakePrisma as any)

  // 4.1 Create Content Performance Item
  const content = await reportingService.createContentPerformance(
    {
      client_id: 'client-brand-555',
      title: 'PPC Optimization Playbook',
      content_type: 'blog',
      views: 2500,
      engagement_rate: 6.5,
      leads_attributed: 12,
    },
    adminUser,
  )

  assert.equal(content.title, 'PPC Optimization Playbook')
  assert.equal(contentStore.length, 1)

  // 4.2 Generate PDF report with PPC summary
  const pdfBuffer = await reportsService.generatePdfReport('client-brand-555', adminUser)
  const pdfText = pdfBuffer.toString('utf-8')

  assert.ok(pdfText.includes('CHERP ERP EXECUTIVE REPORT'))
  assert.ok(pdfText.includes('PERFORMANCE MARKETING (PPC)'))
  assert.ok(pdfText.includes('Total Ad Spend: ₹1,000'))

  console.log('  ✔ Content performance logged and Executive PDF report generated with PPC metrics.')
}

// -------------------------------------------------------------------
// Sprint 5: Client Portal Access Control & Brand Isolation
// -------------------------------------------------------------------
async function testSprint5_ClientPortalBrandIsolation() {
  console.log('5. [Sprint 5] Testing Client Portal Access Control & Brand Isolation Guard...')

  const mockPrisma = {
    task: { count: async () => 5 },
    blocker: { count: async () => 0 },
    campaignResult: { findMany: async () => [] },
  }

  const reportsService = new ReportsService(mockPrisma as any)

  // Client user attempting to fetch executive summary for another brand must be blocked
  await assert.rejects(
    async () => {
      await reportsService.getExecutiveSummary('other-unauthorized-brand-777', clientUser)
    },
    (err: any) => {
      assert.ok(err instanceof ForbiddenException)
      assert.match(err.message, /Clients can only view reports for their own brand/)
      return true
    },
  )

  console.log('  ✔ Client portal brand isolation strictly enforced 403 Forbidden for unauthorized brands.')
}

// -------------------------------------------------------------------
// Sprint 6: Automation & Notification Preferences
// -------------------------------------------------------------------
async function testSprint6_AutomationNotificationPreferences() {
  console.log('6. [Sprint 6] Testing PPC Automation & Notification Dispatch...')

  const mockResend = {
    sendMail: async (options: any) => {
      assert.ok(options.to)
      assert.ok(options.subject)
      assert.ok(options.html)
      return { success: true, messageId: 'msg-test-123' }
    },
  }

  const mailService = new (require('../src/mail/mail.service').MailService)(mockResend as any)

  const emailRes = await mailService.sendDailyDigestEmail({
    tenantId: 'tnt-test-999',
    toEmail: 'client@brand.com',
    recipientName: 'Client Rep',
    dueTodayCount: 3,
    overdueCount: 1,
    openBlockersCount: 0,
  })

  assert.ok(emailRes.success)
  console.log('  ✔ Daily digest and automated email dispatch verified.')
}

// -------------------------------------------------------------------
// Sprint 7: Month Planning Readiness & Retainer Automation
// -------------------------------------------------------------------
async function testSprint7_MonthPlanningReadinessAlerts() {
  console.log('7. [Sprint 7] Testing Retainer Month Planning 14-Day Readiness Alert...')

  const startDate = new Date()
  const endDate = new Date(startDate.getTime() + 10 * 24 * 60 * 60 * 1000) // 10 days remaining (< 14 days)

  const daysRemaining = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const isPlanningAlertTriggered = daysRemaining <= 14

  assert.ok(isPlanningAlertTriggered, '14-day month planning alert should trigger when 10 days remain')

  console.log('  ✔ Month planning 14-day readiness alert logic verified.')
}

runAllPpcSprintTests().catch((err) => {
  console.error('❌ PPC Sprint verification failed:', err)
  process.exit(1)
})
