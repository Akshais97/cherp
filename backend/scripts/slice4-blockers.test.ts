/// <reference types="node" />

import assert from 'node:assert/strict'
import { UserRole } from '../src/common/enums/user-role.enum'
import { RequestUser } from '../src/common/types/request-user.type'
import { BlockersService } from '../src/blockers/blockers.service'

type Call = { name: string; payload: unknown }

const admin: RequestUser = {
  id: '11111111-1111-4111-8111-111111111111',
  authUserId: '21111111-1111-4111-8111-111111111111',
  tenantId: '31111111-1111-4111-8111-111111111111',
  email: 'admin@example.com',
  fullName: 'Admin User',
  role: UserRole.SuperAdmin,
  isActive: true,
}

const teamMember: RequestUser = {
  ...admin,
  id: '41111111-1111-4111-8111-111111111111',
  role: UserRole.TeamMember,
}

const baseTask = {
  id: '51111111-1111-4111-8111-111111111111',
  tenant_id: admin.tenantId,
  workflow_id: '61111111-1111-4111-8111-111111111111',
  assigned_to: teamMember.id,
  status: 'ongoing',
  title: 'Launch QA',
  workflow: {
    id: '61111111-1111-4111-8111-111111111111',
    client_id: '71111111-1111-4111-8111-111111111111',
    client: { id: '71111111-1111-4111-8111-111111111111', name: 'Acme' },
  },
}

const baseBlocker = {
  id: '81111111-1111-4111-8111-111111111111',
  task_id: baseTask.id,
  client_id: baseTask.workflow.client_id,
  flagged_by: teamMember.id,
  resolved_by: null,
  title: 'Tracking pixel missing',
  description: 'The conversion pixel is not installed.',
  severity: 'high',
  status: 'open',
  impact: 'Launch cannot be verified.',
  resolution_notes: null,
  flagged_at: new Date('2026-05-01T10:00:00.000Z'),
  resolved_at: null,
  created_at: new Date('2026-05-01T10:00:00.000Z'),
  updated_at: new Date('2026-05-01T10:00:00.000Z'),
  task: {
    id: baseTask.id,
    workflow_id: baseTask.workflow_id,
    status: 'ongoing',
  },
}

async function run() {
  await testTeamMemberCanCreateBlockerOnAssignedTask()
  await testTeamMemberCannotCreateBlockerOnUnassignedTask()
  await testClientApprovedTaskCannotBeBlocked()
  await testDuplicateOpenBlockerRejected()
  await testListSortsHighMediumLowThenNewest()
  await testResolveDelegatesTransactionalRestore()
  await testBlockerCreationCreatesNotification()

  console.log('Slice 4 blocker tests passed.')
}

async function testTeamMemberCanCreateBlockerOnAssignedTask() {
  const calls: Call[] = []
  const repository = {
    findTaskForBlocker: async () => baseTask,
    findDuplicateOpenBlocker: async () => null,
    createAndBlockTask: async (payload: unknown) => {
      calls.push({ name: 'createAndBlockTask', payload })
      return payload
    },
  }
  const service = new BlockersService(repository as never)

  await service.create(
    {
      task_id: baseTask.id,
      title: 'Tracking pixel missing',
      description: 'The conversion pixel is not installed.',
      severity: 'high',
      impact: 'Launch cannot be verified.',
      assigned_to: teamMember.id,
    },
    teamMember,
  )

  assert.equal(calls.length, 1)
  assert.equal((calls[0].payload as { task: { id: string } }).task.id, baseTask.id)
}

async function testTeamMemberCannotCreateBlockerOnUnassignedTask() {
  const repository = {
    findTaskForBlocker: async () => ({ ...baseTask, assigned_to: admin.id }),
  }
  const service = new BlockersService(repository as never)

  await assert.rejects(
    () =>
      service.create(
        {
          task_id: baseTask.id,
          title: 'Blocked',
          description: 'Need PM support.',
          severity: 'medium',
          assigned_to: admin.id,
        },
        teamMember,
      ),
    /assigned tasks/,
  )
}

async function testClientApprovedTaskCannotBeBlocked() {
  const repository = {
    findTaskForBlocker: async () => ({
      ...baseTask,
      status: 'task_approved_by_client',
    }),
  }
  const service = new BlockersService(repository as never)

  await assert.rejects(
    () =>
      service.create(
        {
          task_id: baseTask.id,
          title: 'Blocked',
          description: 'Need PM support.',
          severity: 'medium',
          assigned_to: admin.id,
        },
        admin,
      ),
    /Client-approved tasks cannot be blocked/,
  )
}

async function testDuplicateOpenBlockerRejected() {
  const repository = {
    findTaskForBlocker: async () => baseTask,
    findDuplicateOpenBlocker: async () => ({ id: baseBlocker.id }),
  }
  const service = new BlockersService(repository as never)

  await assert.rejects(
    () =>
      service.create(
        {
          task_id: baseTask.id,
          title: 'Tracking pixel missing',
          description: 'The conversion pixel is not installed.',
          severity: 'high',
          assigned_to: admin.id,
        },
        admin,
      ),
    /already exists/,
  )
}

async function testListSortsHighMediumLowThenNewest() {
  const repository = {
    findByTenant: async () => [
      { ...baseBlocker, id: 'low', severity: 'low', created_at: new Date('2026-05-03') },
      { ...baseBlocker, id: 'medium', severity: 'medium', created_at: new Date('2026-05-04') },
      { ...baseBlocker, id: 'high-old', severity: 'high', created_at: new Date('2026-05-01') },
      { ...baseBlocker, id: 'high-new', severity: 'high', created_at: new Date('2026-05-05') },
    ],
  }
  const service = new BlockersService(repository as never)

  const result = await service.list({}, admin)

  assert.deepEqual(
    result.map((blocker) => blocker.id),
    ['high-new', 'high-old', 'medium', 'low'],
  )
}

async function testResolveDelegatesTransactionalRestore() {
  const calls: Call[] = []
  const repository = {
    findDetail: async () => baseBlocker,
    resolveAndMaybeUnblockTask: async (payload: unknown) => {
      calls.push({ name: 'resolveAndMaybeUnblockTask', payload })
      return payload
    },
  }
  const service = new BlockersService(repository as never)

  await service.resolve(
    baseBlocker.id,
    { resolution_notes: 'Pixel installed and verified.' },
    admin,
  )

  assert.equal(calls.length, 1)
  assert.equal(
    (calls[0].payload as { resolutionNotes: string }).resolutionNotes,
    'Pixel installed and verified.',
  )
}

async function testBlockerCreationCreatesNotification() {
  const notifications: unknown[] = []
  const repository = {
    findTaskForBlocker: async () => baseTask,
    findDuplicateOpenBlocker: async () => null,
    createAndBlockTask: async () => ({
      ...baseBlocker,
      task: baseTask,
      client: baseTask.workflow.client,
    }),
  }
  const notificationService = {
    notifyBlockerCreated: async (payload: unknown) => {
      notifications.push(payload)
    },
  }
  const service = new BlockersService(repository as never, notificationService as never)

  await service.create(
    {
      task_id: baseTask.id,
      title: 'Tracking pixel missing',
      description: 'The conversion pixel is not installed.',
      severity: 'high',
      assigned_to: teamMember.id,
    },
    teamMember,
  )

  assert.equal(notifications.length, 1)
  assert.deepEqual(notifications[0], {
    tenantId: teamMember.tenantId,
    actorId: teamMember.id,
    blockerId: baseBlocker.id,
    blockerTitle: baseBlocker.title,
    taskId: baseTask.id,
    taskTitle: baseTask.title,
    assigneeId: teamMember.id,
    projectManagerId: undefined,
    clientName: 'Acme',
  })
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
