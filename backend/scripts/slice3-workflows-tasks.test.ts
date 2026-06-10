/// <reference types="node" />

import assert from 'node:assert/strict'
import { UserRole } from '../src/common/enums/user-role.enum'
import { RequestUser } from '../src/common/types/request-user.type'
import { TasksService } from '../src/tasks/tasks.service'
import { WorkflowsService } from '../src/workflows/workflows.service'

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
  assigned_to: admin.id,
  completed_by: null,
  title: 'Launch checklist',
  description: 'Prepare launch',
  status: 'pending',
  priority: 'medium',
  sort_order: 1,
  due_date: new Date('2026-05-20T00:00:00.000Z'),
  completed_at: null,
  _count: { blockers: 0 },
}

async function run() {
  await testWorkflowDetailMapsOpenBlockers()
  await testTeamMemberCannotUpdateUnassignedTask()
  await testProjectManagerCanAssignTenantUser()
  await testBlockedTaskCannotComplete()
  await testCompleteSetsCompletionFields()
  await testCompletedWorkflowCannotReceiveCustomTask()
  await testTaskApprovalStatusTransition()
  await testProjectManagerCanDeleteTask()
  await testTeamMemberCannotDeleteTask()
  await testTaskStatusChangeCreatesNotification()

  console.log('Slice 3 workflow/task tests passed.')
}

async function testWorkflowDetailMapsOpenBlockers() {
  const repository = {
    findDetail: async () => ({
      id: '61111111-1111-4111-8111-111111111111',
      tasks: [
        { ...baseTask, _count: { blockers: 2 } },
        { ...baseTask, id: '71111111-1111-4111-8111-111111111111', _count: { blockers: 0 } },
      ],
    }),
  }
  const service = new WorkflowsService(repository as never)

  const result = await service.detail('61111111-1111-4111-8111-111111111111', admin)

  assert.equal(result.open_blocker_count, 2)
  assert.equal(result.tasks[0].open_blocker_count, 2)
  assert.equal('_count' in result.tasks[0], false)
}

async function testTeamMemberCannotUpdateUnassignedTask() {
  const calls: Call[] = []
  const repository = {
    findTaskForAccess: async () => ({ ...baseTask, assigned_to: admin.id }),
    updateWithCompletion: async (payload: unknown) => {
      calls.push({ name: 'updateWithCompletion', payload })
      return payload
    },
  }
  const service = new TasksService(repository as never)

  await assert.rejects(
    () => service.update(baseTask.id, { status: 'ongoing' }, teamMember),
    /Team members can only update assigned tasks/,
  )
  assert.equal(calls.length, 0)
}

async function testProjectManagerCanAssignTenantUser() {
  const calls: Call[] = []
  const repository = {
    findTaskForAccess: async () => baseTask,
    userExists: async () => ({ id: teamMember.id }),
    updateWithCompletion: async (payload: unknown) => {
      calls.push({ name: 'updateWithCompletion', payload })
      return payload
    },
  }
  const service = new TasksService(repository as never)

  await service.update(baseTask.id, { assigned_to: teamMember.id }, admin)

  assert.equal(calls.length, 1)
  assert.equal((calls[0].payload as { actionType: string }).actionType, 'assigned')
}

async function testBlockedTaskCannotComplete() {
  const repository = {
    findTaskForAccess: async () => ({
      ...baseTask,
      status: 'ongoing',
      _count: { blockers: 1 },
    }),
  }
  const service = new TasksService(repository as never)

  await assert.rejects(
    () => service.complete(baseTask.id, admin),
    /Tasks with open blockers cannot be completed/,
  )
}

async function testCompleteSetsCompletionFields() {
  const calls: Call[] = []
  const repository = {
    findTaskForAccess: async () => ({
      ...baseTask,
      assigned_to: teamMember.id,
      status: 'ongoing',
    }),
    updateWithCompletion: async (payload: unknown) => {
      calls.push({ name: 'updateWithCompletion', payload })
      return payload
    },
  }
  const service = new TasksService(repository as never)

  await service.complete(baseTask.id, admin)

  const payload = calls[0].payload as {
    actionType: string
    data: { status: string; completed_at: Date; completer: { connect: { id: string } } }
  }
  assert.equal(payload.actionType, 'completed')
  assert.equal(payload.data.status, 'completed')
  assert.ok(payload.data.completed_at instanceof Date)
  assert.equal(payload.data.completer.connect.id, admin.id)
}

async function testTaskApprovalStatusTransition() {
  const calls: Call[] = []
  const repository = {
    findTaskForAccess: async () => ({ ...baseTask, status: 'completed' }),
    updateWithCompletion: async (payload: unknown) => {
      calls.push({ name: 'updateWithCompletion', payload })
      return payload
    },
  }
  const service = new TasksService(repository as never)

  await service.update(baseTask.id, { status: 'task_approved_by_manager' }, admin)

  const payload = calls[0].payload as {
    actionType: string
    data: { status: string; completed_at?: null }
  }
  assert.equal(payload.actionType, 'status_changed')
  assert.equal(payload.data.status, 'task_approved_by_manager')
}

async function testProjectManagerCanDeleteTask() {
  const calls: Call[] = []
  const repository = {
    findTaskForAccess: async () => ({ ...baseTask, assigned_to: teamMember.id }),
    deleteWithCompletion: async (payload: unknown) => {
      calls.push({ name: 'deleteWithCompletion', payload })
      return { id: baseTask.id, deleted: true }
    },
  }
  const service = new TasksService(repository as never)

  await service.delete(baseTask.id, admin)

  const payload = calls[0].payload as {
    taskId: string
    workflowId: string
    beforeValues: { title: string }
  }
  assert.equal(payload.taskId, baseTask.id)
  assert.equal(payload.workflowId, baseTask.workflow_id)
  assert.equal(payload.beforeValues.title, baseTask.title)
}

async function testTeamMemberCannotDeleteTask() {
  const repository = {
    findTaskForAccess: async () => ({ ...baseTask, assigned_to: teamMember.id }),
  }
  const service = new TasksService(repository as never)

  await assert.rejects(
    () => service.delete(baseTask.id, teamMember),
    /Only admins and project managers can delete tasks/,
  )
}

async function testTaskStatusChangeCreatesNotification() {
  const notifications: unknown[] = []
  const repository = {
    findTaskForAccess: async () => ({
      ...baseTask,
      assigned_to: teamMember.id,
      status: 'ongoing',
    }),
    updateWithCompletion: async () => ({
      ...baseTask,
      assigned_to: teamMember.id,
      status: 'completed',
      workflow: {
        project_manager_id: admin.id,
        client: { id: '71111111-1111-4111-8111-111111111111', name: 'Acme' },
      },
      assignee: { id: teamMember.id, full_name: 'Team Member', email: 'tm@example.com' },
    }),
  }
  const notificationService = {
    notifyTaskStatusChanged: async (payload: unknown) => {
      notifications.push(payload)
    },
  }
  const service = new TasksService(repository as never, notificationService as never)

  await service.update(baseTask.id, { status: 'completed' }, teamMember)

  assert.equal(notifications.length, 1)
  assert.deepEqual(notifications[0], {
    tenantId: teamMember.tenantId,
    actorId: teamMember.id,
    taskId: baseTask.id,
    taskTitle: baseTask.title,
    previousStatus: 'ongoing',
    nextStatus: 'completed',
    assigneeId: teamMember.id,
    projectManagerId: admin.id,
    clientName: 'Acme',
  })
}

async function testCompletedWorkflowCannotReceiveCustomTask() {
  const repository = {
    findWorkflowForCreate: async () => ({
      id: baseTask.workflow_id,
      tenant_id: admin.tenantId,
      status: 'completed',
      _count: { tasks: 2 },
    }),
  }
  const service = new TasksService(repository as never)

  await assert.rejects(
    () => service.create(baseTask.workflow_id, { title: 'Late add' }, admin),
    /Completed workflows cannot receive new tasks/,
  )
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
