/// <reference types="node" />

import assert from 'node:assert/strict'
import { TimeEntriesService } from '../src/time-entries/time-entries.service'
import { RequestUser } from '../src/common/types/request-user.type'
import { UserRole } from '../src/common/enums/user-role.enum'

const adminUser: RequestUser = {
  id: 'usr-admin-1',
  authUserId: 'auth-admin-1',
  tenantId: 'tnt-1',
  email: 'admin@agency.com',
  fullName: 'Admin',
  role: UserRole.SuperAdmin,
  isActive: true,
}

async function verifyBugfixes() {
  console.log('===========================================================')
  console.log('        REPORTING & TIME ENTRIES BUGFIX VERIFICATION        ')
  console.log('===========================================================\n')

  // 1. Testing Time Entries Query Param Alias Resolution (startDate & endDate camelCase)
  console.log('1. Testing Time Entries Report camelCase Query Resolution...')
  const mockRepo = {
    findReport: async (params: any) => {
      assert.equal(params.tenantId, 'tnt-1')
      assert.ok(params.startDate instanceof Date)
      assert.ok(params.endDate instanceof Date)
      assert.equal(params.startDate.toISOString().slice(0, 10), '2026-07-31')
      assert.equal(params.endDate.toISOString().slice(0, 10), '2026-08-31')
      return [
        {
          id: 'te-1',
          hours: 4,
          is_billable: true,
          date: new Date('2026-08-15'),
          user: { id: 'u1', full_name: 'John PM' },
          task: { title: 'Design Task', client: { name: 'Acme' } },
        },
      ]
    },
  }

  const timeEntriesService = new TimeEntriesService(mockRepo as any)

  // Call with camelCase startDate & endDate as passed by frontend UI query string:
  const report = await timeEntriesService.getReport(
    {
      startDate: '2026-07-31',
      endDate: '2026-08-31',
    },
    adminUser,
  )

  assert.equal(report.entries_count, 1)
  assert.equal(report.total_hours, 4)
  assert.equal(report.billable_hours, 4)
  console.log('  ✔ Time Entries report successfully resolved camelCase startDate & endDate query parameters!\n')

  console.log('===========================================================')
  console.log('✅ ALL BUGFIX SCENARIOS VERIFIED AND PASSED 100% CLEANLY!')
  console.log('===========================================================\n')
}

verifyBugfixes().catch((err) => {
  console.error('❌ Bugfix verification failed:', err)
  process.exit(1)
})
