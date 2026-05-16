/// <reference types="node" />

import assert from 'node:assert/strict'
import { UserRole } from '../src/common/enums/user-role.enum'
import { RequestUser } from '../src/common/types/request-user.type'
import { DashboardService } from '../src/dashboard/dashboard.service'

const tenantId = '31111111-1111-4111-8111-111111111111'
const projectManager: RequestUser = {
  id: '41111111-1111-4111-8111-111111111111',
  authUserId: '51111111-1111-4111-8111-111111111111',
  tenantId,
  email: 'pm@example.com',
  fullName: 'PM User',
  role: UserRole.ProjectManager,
  isActive: true,
}
const teamMember: RequestUser = {
  ...projectManager,
  id: '61111111-1111-4111-8111-111111111111',
  role: UserRole.TeamMember,
}

async function run() {
  await testSummaryDerivesAverageCompletionAndUtilization()
  await testClientHealthUsesPhaseOneThresholds()
  await testDeadlinesClassifyOverdueAndUpcoming()
  await testOpenBlockersSortBySeverityThenFlaggedAt()
  await testRecentActivityIsRepositoryBacked()
  await testTeamMemberDashboardScopesRepositoryFilters()

  console.log('Slice 5 dashboard tests passed.')
}

async function testSummaryDerivesAverageCompletionAndUtilization() {
  const service = new DashboardService({
    countActiveClients: async () => 2,
    countActiveWorkflows: async () => 2,
    averageActiveWorkflowCompletion: async () => ({
      _avg: { completion_percentage: 66.6 },
    }),
    countOpenBlockers: async () => 3,
    countDeliveryUsers: async () => 4,
    findUsersWithOpenAssignedTasks: async () => [{ id: 'u1' }, { id: 'u2' }],
  } as never)

  const summary = await service.getSummary(projectManager, {})

  assert.deepEqual(summary, {
    activeClients: 2,
    activeWorkflows: 2,
    averageCompletionPercentage: 67,
    taskCompletionRate: 67,
    openBlockers: 3,
    teamUtilization: 50,
  })
}

async function testClientHealthUsesPhaseOneThresholds() {
  const service = new DashboardService({
    findClientHealthRows: async () => [
      healthClient('on-track-client', 70, 0),
      healthClient('risk-client', 50, 0),
      healthClient('off-track-client', 49, 2),
    ],
  } as never)

  const rows = await service.getClientHealth(projectManager, {})

  assert.deepEqual(
    rows.map((row) => row.status),
    ['on_track', 'at_risk', 'off_track'],
  )
  assert.equal(rows[0].clientId, 'on-track-client')
  assert.equal(rows[0].workflowId, 'workflow-on-track-client')
}

async function testDeadlinesClassifyOverdueAndUpcoming() {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const service = new DashboardService({
    findUpcomingDeadlines: async () => [
      deadlineTask('overdue-task', yesterday),
      deadlineTask('upcoming-task', tomorrow),
    ],
  } as never)

  const deadlines = await service.getUpcomingDeadlines(projectManager, {})

  assert.deepEqual(
    deadlines.map((deadline) => deadline.urgency),
    ['overdue', 'upcoming'],
  )
  assert.equal(deadlines[0].workflow.id, 'workflow-overdue-task')
  assert.equal(deadlines[0].client.id, 'client-overdue-task')
}

async function testOpenBlockersSortBySeverityThenFlaggedAt() {
  const service = new DashboardService({
    findOpenBlockers: async () => [
      blocker('low', 'low', '2026-05-05T00:00:00.000Z'),
      blocker('high-old', 'high', '2026-05-01T00:00:00.000Z'),
      blocker('medium', 'medium', '2026-05-06T00:00:00.000Z'),
      blocker('high-new', 'high', '2026-05-07T00:00:00.000Z'),
    ],
  } as never)

  const blockers = await service.getOpenBlockers(projectManager, {})

  assert.deepEqual(
    blockers.map((blocker) => blocker.id),
    ['high-new', 'high-old', 'medium', 'low'],
  )
}

async function testRecentActivityIsRepositoryBacked() {
  const activity = [{ id: 'activity-1', action_type: 'created' }]
  const service = new DashboardService({
    findRecentActivity: async () => activity,
  } as never)

  assert.deepEqual(await service.getRecentActivity(projectManager, {}), {
    items: activity,
    nextCursor: null,
  })
}

async function testTeamMemberDashboardScopesRepositoryFilters() {
  const seen: unknown[] = []
  const service = new DashboardService({
    countActiveClients: async (_tenantId: string, filters: unknown) => {
      seen.push(filters)
      return 0
    },
    countActiveWorkflows: async () => 0,
    averageActiveWorkflowCompletion: async () => ({
      _avg: { completion_percentage: 0 },
    }),
    countOpenBlockers: async () => 0,
    countDeliveryUsers: async () => 1,
    findUsersWithOpenAssignedTasks: async () => [],
  } as never)

  await service.getSummary(teamMember, {})

  assert.equal((seen[0] as { assignedUserId?: string }).assignedUserId, teamMember.id)
}

function healthClient(id: string, completion: number, blockers: number) {
  return {
    id,
    name: id,
    workflows: [
      {
        id: `workflow-${id}`,
        title: `${id} workflow`,
        month_number: 1,
        completion_percentage: completion,
      },
    ],
    _count: { blockers },
  }
}

function deadlineTask(id: string, dueDate: Date) {
  return {
    id,
    title: id,
    status: 'pending',
    priority: 'high',
    due_date: dueDate,
    workflow: {
      id: `workflow-${id}`,
      title: `${id} workflow`,
      month_number: 1,
      client: { id: `client-${id}`, name: `${id} client` },
    },
  }
}

function blocker(id: string, severity: string, flaggedAt: string) {
  return {
    id,
    title: id,
    severity,
    status: 'open',
    flagged_at: new Date(flaggedAt),
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
