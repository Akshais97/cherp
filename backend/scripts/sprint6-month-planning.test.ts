/// <reference types="node" />

import assert from 'node:assert/strict'
import { WorkflowsService } from '../src/workflows/workflows.service'
import { RequestUser } from '../src/common/types/request-user.type'
import { UserRole } from '../src/common/enums/user-role.enum'

const pmUser: RequestUser = {
  id: '11111111-1111-4111-8111-111111111111',
  authUserId: '21111111-1111-4111-8111-111111111111',
  tenantId: '31111111-1111-4111-8111-111111111111',
  email: 'pm@cherp.com',
  fullName: 'Project Manager',
  role: UserRole.ProjectManager,
  isActive: true,
}

async function run() {
  console.log('===========================================================')
  console.log('       SPRINT 6 MONTH PLANNING AUTOMATION VERIFICATION    ')
  console.log('===========================================================\n')

  await testMonthPlanningReadinessAndApproval()

  console.log('\n✅ ALL SPRINT 6 TEST SCENARIOS PASSED CLEANLY!\n')
}

async function testMonthPlanningReadinessAndApproval() {
  console.log('1. Testing Month Planning Readiness & Planning Lifecycle Status...')

  const mockWorkflows = [
    {
      id: 'wf-1',
      title: 'Acme Month 1 Scope',
      month_number: 1,
      completion_percentage: 95.0,
      end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Ends in 5 days
      client: { id: 'c1', name: 'Acme Corp' },
      project_manager: { id: pmUser.id, full_name: pmUser.fullName },
      status: 'active',
    },
  ]

  const mockRepo = {
    findByTenant: async () => mockWorkflows,
    findWorkflowAccess: async () => mockWorkflows[0],
    updateStatus: async (_tId: string, _id: string, status: string) => ({
      ...mockWorkflows[0],
      status,
    }),
  }

  const workflowsService = new WorkflowsService(mockRepo as never)

  // Get month planning readiness
  const readiness = await workflowsService.getMonthPlanningReadiness(pmUser)
  assert.equal(readiness.length, 1)
  assert.equal(readiness[0].needs_month_planning, true)
  assert.equal(readiness[0].next_month_number, 2)

  // Update status draft -> approved -> published
  const approvedWf = await workflowsService.updateStatus('wf-1', 'approved', pmUser)
  assert.equal(approvedWf.status, 'approved')

  const publishedWf = await workflowsService.updateStatus('wf-1', 'published', pmUser)
  assert.equal(publishedWf.status, 'published')

  console.log('  ✔ Readiness engine flagged Month 2 scope creation within 14 days and transitioned status draft -> approved -> published.')
}

run().catch((err) => {
  console.error('❌ Sprint 6 test suite failed:', err)
  process.exit(1)
})
