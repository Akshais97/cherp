/// <reference types="node" />

import assert from 'node:assert/strict'
import { TimeEntriesService } from '../src/time-entries/time-entries.service'
import { UsersService } from '../src/users/users.service'
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
  console.log('       SPRINT 4 TIME TRACKING & CAPACITY VERIFICATION     ')
  console.log('===========================================================\n')

  await testTimeEntriesLoggingAndCsv()
  await testEstimatedHoursCapacityFormula()

  console.log('\n✅ ALL SPRINT 4 TEST SCENARIOS PASSED CLEANLY!\n')
}

async function testTimeEntriesLoggingAndCsv() {
  console.log('1. Testing Time Entries Logging, Aggregation & CSV Export...')

  const entriesList = [
    {
      id: 'te-1',
      task_id: 'task-1',
      user_id: adminUser.id,
      hours: 4.5,
      date: new Date('2026-08-25'),
      description: 'Worked on SEO audit',
      is_billable: true,
      task: { id: 'task-1', title: 'SEO Audit', client: { name: 'Acme Corp' } },
      user: { id: adminUser.id, full_name: 'Super Admin', email: adminUser.email },
    },
    {
      id: 'te-2',
      task_id: 'task-1',
      user_id: adminUser.id,
      hours: 2.0,
      date: new Date('2026-08-25'),
      description: 'Internal sync call',
      is_billable: false,
      task: { id: 'task-1', title: 'SEO Audit', client: { name: 'Acme Corp' } },
      user: { id: adminUser.id, full_name: 'Super Admin', email: adminUser.email },
    },
  ]

  const mockRepo = {
    create: async (input: any) => ({
      id: 'te-new',
      ...input,
      task: { id: input.taskId, title: 'Task Title', client_id: 'c1' },
      user: { id: input.userId, full_name: 'Super Admin' },
    }),
    findByTask: async () => entriesList,
    findById: async () => entriesList[0],
    delete: async () => entriesList[0],
    findReport: async () => entriesList,
  }

  const timeService = new TimeEntriesService(mockRepo as never)

  // Log time entry
  const newEntry = await timeService.create('task-1', { hours: 3.5, date: '2026-08-25', description: 'Coding' }, adminUser)
  assert.equal(newEntry.hours, 3.5)

  // Fetch report
  const report = await timeService.getReport({}, adminUser)
  assert.equal(report.entries_count, 2)
  assert.equal(report.total_hours, 6.5)
  assert.equal(report.billable_hours, 4.5)
  assert.equal(report.non_billable_hours, 2.0)

  // CSV Export
  const csv = await timeService.generateCsvExport({}, adminUser)
  assert.ok(csv.startsWith('ID,Date,User,Task,Client,Hours,Billable,Description'))
  assert.ok(csv.includes('Worked on SEO audit'))

  console.log('  ✔ Time entry logging, report aggregation (6.5h total, 4.5h billable), and CSV generation verified.')
}

async function testEstimatedHoursCapacityFormula() {
  console.log('2. Testing Workload-Based Real Capacity Formula...')

  const mockUsersRepo = {
    findTeamMemberById: async () => ({ id: 'm1', full_name: 'John Writer', weekly_available_hours: 40 }),
    findAssignedTasks: async () => [
      { id: 't1', status: 'ongoing', estimated_hours: 10 },
      { id: 't2', status: 'ongoing', estimated_hours: 15 },
      { id: 't3', status: 'ongoing', estimated_hours: 10 }, // 35 estimated hours / 40 weekly available hours = 88% (>80% overload!)
    ],
    findAssignedTaskBlockers: async () => [],
  }

  const mockConfig = { get: () => 'http://localhost' }
  const usersService = new UsersService(mockConfig as never, mockUsersRepo as never)

  const workload = await usersService.getTeamMemberWorkload('m1', adminUser)
  assert.equal(workload.capacity.weekly_capacity_hours, 40)
  assert.equal(workload.capacity.estimated_assigned_hours, 35)
  assert.equal(workload.capacity.utilization_percentage, 88)
  assert.equal(workload.capacity.is_overloaded, true)

  console.log('  ✔ Workload formula accurately computed 88% utilization based on task estimated_hours.')
}

run().catch((err) => {
  console.error('❌ Sprint 4 test suite failed:', err)
  process.exit(1)
})
