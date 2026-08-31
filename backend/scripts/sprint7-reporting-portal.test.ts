/// <reference types="node" />

import assert from 'node:assert/strict'
import { ForbiddenException } from '@nestjs/common'
import { ReportsService } from '../src/reports/reports.service'
import { RequestUser } from '../src/common/types/request-user.type'
import { UserRole } from '../src/common/enums/user-role.enum'

const clientUser: RequestUser = {
  id: '11111111-1111-4111-8111-111111111111',
  authUserId: '21111111-1111-4111-8111-111111111111',
  tenantId: '31111111-1111-4111-8111-111111111111',
  email: 'client@brand.com',
  fullName: 'Client Rep',
  role: UserRole.Client,
  isActive: true,
  clientId: 'client-brand-123',
} as any

async function run() {
  console.log('===========================================================')
  console.log('       SPRINT 7 REPORTING HUB & PORTAL VERIFICATION       ')
  console.log('===========================================================\n')

  await testExecutiveSummaryAndPdfGeneration()
  await testClientPortalBrandIsolation()

  console.log('\n✅ ALL SPRINT 7 TEST SCENARIOS PASSED CLEANLY!\n')
}

async function testExecutiveSummaryAndPdfGeneration() {
  console.log('1. Testing Executive Reporting Aggregation & PDF Export...')

  const mockPrisma = {
    task: {
      count: async (input: any) => {
        if (input?.where?.status) return 18 // completed tasks
        return 20 // total tasks
      },
    },
    blocker: {
      count: async () => 2, // open blockers
    },
  }

  const reportsService = new ReportsService(mockPrisma as never)

  const summary = await reportsService.getExecutiveSummary('client-brand-123', clientUser)
  assert.equal(summary.total_tasks, 20)
  assert.equal(summary.completed_tasks, 18)
  assert.equal(summary.completion_rate, 90)
  assert.equal(summary.open_blockers, 2)

  const pdfBuffer = await reportsService.generatePdfReport('client-brand-123', clientUser)
  const pdfString = pdfBuffer.toString('utf-8')
  assert.ok(pdfString.includes('CHERP ERP EXECUTIVE REPORT'))
  assert.ok(pdfString.includes('Completion Rate: 90%'))

  console.log('  ✔ Executive summary computed 90% completion rate and generated PDF report document.')
}

async function testClientPortalBrandIsolation() {
  console.log('2. Testing Client Portal Access Control & Brand Isolation Guard...')

  const mockPrisma = {
    task: { count: async () => 10 },
    blocker: { count: async () => 0 },
  }

  const reportsService = new ReportsService(mockPrisma as never)

  // Client user attempting to query competitor's brand ID must be blocked with 403 Forbidden
  await assert.rejects(
    async () => {
      await reportsService.getExecutiveSummary('competitor-brand-999', clientUser)
    },
    (err: any) => {
      assert.ok(err instanceof ForbiddenException)
      assert.match(err.message, /Clients can only view reports for their own brand/)
      return true
    }
  )

  console.log('  ✔ Client portal brand isolation strictly blocked unauthorized brand ID access.')
}

run().catch((err) => {
  console.error('❌ Sprint 7 test suite failed:', err)
  process.exit(1)
})
