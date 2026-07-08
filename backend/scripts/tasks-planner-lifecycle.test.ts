import assert from 'node:assert/strict'
import { UserRole } from '../src/common/enums/user-role.enum'
import { RequestUser } from '../src/common/types/request-user.type'
import { TasksService } from '../src/tasks/tasks.service'

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
  completed_by: null,
  title: 'Launch checklist',
  description: 'Prepare launch',
  status: 'yet_to_start',
  priority: 'medium',
  sort_order: 1,
  due_date: new Date('2026-05-20T00:00:00.000Z'),
  completed_at: null,
  checklist: JSON.stringify([{ id: '1', text: 'Task 1', is_completed: false }]),
  _count: { blockers: 0 },
}

async function run() {
  await testCommentsMethods()
  await testAttachmentsMethods()
  await testLogsRetrieve()
  await testTeamMemberFieldsLock()
  await testLifecycleRequestApproval()
  await testLifecyclePMApprove()
  await testLifecyclePMRequestChanges()
  await testMyTasksServiceFiltering()

  console.log('All Task Planner Lifecycle and Log tests passed!')
}

async function testCommentsMethods() {
  const commentsList = [{ id: 'c1', content: 'test comment', author: { id: admin.id, full_name: 'Admin' } }]
  const repository = {
    findTaskForAccess: async () => baseTask,
    findComments: async (tenantId: string, taskId: string) => {
      assert.equal(tenantId, admin.tenantId)
      assert.equal(taskId, baseTask.id)
      return commentsList
    },
    createComment: async (tenantId: string, taskId: string, userId: string, content: string) => {
      assert.equal(content, 'hello world')
      return { id: 'c2', content }
    }
  }

  const service = new TasksService(repository as never)
  const comments = await service.getComments(baseTask.id, admin)
  assert.equal(comments.length, 1)
  assert.equal(comments[0].content, 'test comment')

  const created = await service.addComment(baseTask.id, 'hello world', admin)
  assert.equal(created.content, 'hello world')
}

async function testAttachmentsMethods() {
  const attachmentsList = [{ id: 'a1', file_name: 'test.pdf', file_url: 'http://test.url' }]
  const repository = {
    findTaskForAccess: async () => baseTask,
    findAttachments: async (tenantId: string, taskId: string) => {
      assert.equal(tenantId, admin.tenantId)
      return attachmentsList
    },
    createAttachment: async (tenantId: string, taskId: string, userId: string, name: string, url: string) => {
      assert.equal(name, 'test.pdf')
      return { id: 'a2', file_name: name, file_url: url }
    },
    deleteAttachment: async (tenantId: string, taskId: string, attachmentId: string, userId: string) => {
      assert.equal(attachmentId, 'a1')
      return { id: 'a1', file_name: 'test.pdf' }
    }
  }

  const service = new TasksService(repository as never)
  const attachments = await service.getAttachments(baseTask.id, admin)
  assert.equal(attachments.length, 1)

  const created = await service.addAttachment(baseTask.id, { file_name: 'test.pdf', file_url: 'http://test.url' }, admin)
  assert.equal(created.file_name, 'test.pdf')

  const deleted = await service.deleteAttachment(baseTask.id, 'a1', admin)
  assert.equal(deleted.id, 'a1')
}

async function testLogsRetrieve() {
  const logsList = [{ id: 'l1', field: 'status', old_value: 'ongoing', new_value: 'completed' }]
  const repository = {
    findTaskForAccess: async () => baseTask,
    findLogs: async (tenantId: string, taskId: string) => {
      assert.equal(taskId, baseTask.id)
      return logsList
    }
  }
  const service = new TasksService(repository as never)
  const logs = await service.getLogs(baseTask.id, admin)
  assert.equal(logs.length, 1)
  assert.equal(logs[0].field, 'status')
}

async function testTeamMemberFieldsLock() {
  const repository = {
    findTaskForAccess: async () => baseTask,
  }
  const service = new TasksService(repository as never)

  // TM tries to edit priority
  await assert.rejects(
    () => service.update(baseTask.id, { priority: 'high' }, teamMember),
    /Team members cannot change task title, assignee, priority, or due date/
  )
}

async function testLifecycleRequestApproval() {
  let updatePayload: any = null
  const repository = {
    findTaskForAccess: async () => ({ ...baseTask, status: 'ongoing' }),
    updateWithCompletion: async (payload: any) => {
      updatePayload = payload
      return { ...baseTask, status: 'completed' }
    }
  }
  const service = new TasksService(repository as never)

  await service.requestApproval(baseTask.id, 'Work is done', teamMember)
  assert.equal(updatePayload.data.status, 'completed')
  assert.equal(updatePayload.reason, 'Work is done')
  assert.equal(updatePayload.actionType, 'completed')
}

async function testLifecyclePMApprove() {
  let updatePayload: any = null
  const repository = {
    findTaskForAccess: async () => ({ ...baseTask, status: 'completed' }),
    updateWithCompletion: async (payload: any) => {
      updatePayload = payload
      return { ...baseTask, status: 'task_approved_by_manager' }
    }
  }
  const service = new TasksService(repository as never)

  await service.approveTask(baseTask.id, 'Approved, good job', admin)
  assert.equal(updatePayload.data.status, 'task_approved_by_manager')
  assert.equal(updatePayload.reason, 'Approved, good job')
}

async function testLifecyclePMRequestChanges() {
  let updatePayload: any = null
  let addedComment: any = null
  const repository = {
    findTaskForAccess: async () => ({ ...baseTask, status: 'completed' }),
    createComment: async (tId: string, taskId: string, userId: string, content: string) => {
      addedComment = content
      return { id: 'c-rework', content }
    },
    updateWithCompletion: async (payload: any) => {
      updatePayload = payload
      return { ...baseTask, status: 'rework' }
    }
  }
  const service = new TasksService(repository as never)

  await service.requestChanges(baseTask.id, 'Need to align fonts', admin)
  assert.equal(updatePayload.data.status, 'rework')
  assert.equal(updatePayload.reason, 'Need to align fonts')
  assert.ok(addedComment.includes('Need to align fonts'))
}

async function testMyTasksServiceFiltering() {
  let passedInput: any = null
  const repository = {
    findMany: async (input: any) => {
      passedInput = input
      return [baseTask]
    }
  }

  const service = new TasksService(repository as never)

  // Test 1: Team Member queries their own tasks (My Tasks)
  const result = await service.findMany({}, teamMember)
  assert.equal(result.length, 1)
  assert.equal(passedInput.userId, teamMember.id)
  assert.equal(passedInput.role, 'team_member')

  // Test 2: PM queries tasks filtering by specific assignee ID
  const resultPm = await service.findMany({ assigneeIds: [teamMember.id] }, admin)
  assert.equal(resultPm.length, 1)
  assert.deepEqual(passedInput.assigneeIds, [teamMember.id])
}

run().catch((error) => {
  console.error('Test suite failed:', error)
  process.exitCode = 1
})
