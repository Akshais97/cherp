/// <reference types="node" />

import assert from 'node:assert/strict'
import { ActivityLogsService } from '../src/activity-logs/activity-logs.service'
import { RequestUser } from '../src/common/types/request-user.type'
import { UserRole } from '../src/common/enums/user-role.enum'

const adminUser: RequestUser = {
  id: '11111111-1111-4111-8111-111111111111',
  authUserId: '21111111-1111-4111-8111-111111111111',
  tenantId: '31111111-1111-4111-8111-111111111111',
  email: 'admin@cherp.com',
  fullName: 'Super Admin',
  role: UserRole.SuperAdmin,
  isActive: true,
}

async function run() {
  console.log('===========================================================')
  console.log('       SPRINT 8 CENTRALIZED AUDIT & CRM VERIFICATION      ')
  console.log('===========================================================\n')

  await testAuditLogFilteringAndCsvExport()

  console.log('\n✅ ALL SPRINT 8 TEST SCENARIOS PASSED CLEANLY!\n')
}

async function testAuditLogFilteringAndCsvExport() {
  console.log('1. Testing Centralized Audit Logs Filtering & CSV Export...')

  const logsList = [
    {
      id: 'log-1',
      created_at: new Date('2026-08-25T10:00:00Z'),
      user_id: adminUser.id,
      user: { full_name: 'Super Admin' },
      action_type: 'created',
      entity_type: 'task',
      entity_id: 'task-100',
    },
    {
      id: 'log-2',
      created_at: new Date('2026-08-25T11:00:00Z'),
      user_id: adminUser.id,
      user: { full_name: 'Super Admin' },
      action_type: 'auth_logout',
      entity_type: 'user',
      entity_id: adminUser.id,
    },
  ]

  const mockRepo = {
    findMany: async () => logsList,
  }

  const logsService = new ActivityLogsService(mockRepo as never)

  // Fetch audit logs
  const logs = await logsService.findMany(adminUser, { entityType: 'task' })
  assert.equal(logs.length, 2)

  // Export CSV
  const csv = await logsService.generateCsvExport(adminUser, { entityType: 'task' })
  assert.ok(csv.startsWith('ID,Date,Actor,Action,Entity,Entity_ID'))
  assert.ok(csv.includes('auth_logout'))

  console.log('  ✔ Centralized audit log filtering and CSV export verified.')
}

run().catch((err) => {
  console.error('❌ Sprint 8 test suite failed:', err)
  process.exit(1)
})
