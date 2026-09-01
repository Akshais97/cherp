/// <reference types="node" />

import assert from 'node:assert/strict'
import { BadRequestException } from '@nestjs/common'
import { TasksService } from '../src/tasks/tasks.service'
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
  console.log('       SPRINT 3 DEPENDENCIES & SUBTASKS VERIFICATION      ')
  console.log('===========================================================\n')

  await testDependencyCycleDetection()
  await testSubtaskLifecycleAndProgress()

  console.log('\n✅ ALL SPRINT 3 TEST SCENARIOS PASSED CLEANLY!\n')
}

async function testDependencyCycleDetection() {
  console.log('1. Testing Dependency Cycle Detection Engine (DAG DFS)...')

  const tasksMap: Record<string, any> = {
    'task-A': { id: 'task-A', tenant_id: pmUser.tenantId, title: 'Task A', status: 'ongoing', depends_on: ['task-B'], _count: { blockers: 0 } },
    'task-B': { id: 'task-B', tenant_id: pmUser.tenantId, title: 'Task B', status: 'ongoing', depends_on: ['task-C'], _count: { blockers: 0 } },
    'task-C': { id: 'task-C', tenant_id: pmUser.tenantId, title: 'Task C', status: 'yet_to_start', depends_on: [], _count: { blockers: 0 } },
  }

  const mockRepo = {
    findTaskForAccess: async (input: { taskId: string }) => tasksMap[input.taskId] || null,
    findTasksByIds: async (_tId: string, ids: string[]) => ids.map(id => tasksMap[id]).filter(Boolean),
    findMany: async () => Object.values(tasksMap),
    updateWithCompletion: async (input: { taskId: string; data: any }) => {
      tasksMap[input.taskId] = { ...tasksMap[input.taskId], ...input.data }
      return tasksMap[input.taskId]
    },
    snapshot: () => ({}),
    actionType: () => 'updated',
  }

  const tasksService = new TasksService(mockRepo as never)

  // Attempting to make Task C depend on Task A (creating cycle C -> A -> B -> C) must fail
  await assert.rejects(
    async () => {
      await tasksService.updateDependencies('task-C', ['task-A'], pmUser)
    },
    (err: any) => {
      assert.ok(err instanceof BadRequestException)
      assert.match(err.message, /Circular dependency detected/)
      return true
    }
  )

  // Valid dependency addition (Task C depending on valid external Task D)
  tasksMap['task-D'] = { id: 'task-D', tenant_id: pmUser.tenantId, title: 'Task D', status: 'completed', depends_on: [], _count: { blockers: 0 } }
  const updatedC = await tasksService.updateDependencies('task-C', ['task-D'], pmUser)
  assert.deepEqual(updatedC.depends_on, ['task-D'])

  console.log('  ✔ Cycle detection prevented C -> A -> B -> C loop and accepted valid dependency.')
}

async function testSubtaskLifecycleAndProgress() {
  console.log('2. Testing Subtask Lifecycle & Parent Progress Calculation...')

  const parentTaskId = 'parent-123'
  const subtasksList = [
    { id: 'sub-1', title: 'Drafting section 1', status: 'completed', is_subtask: true, parent_task_id: parentTaskId },
    { id: 'sub-2', title: 'Drafting section 2', status: 'ongoing', is_subtask: true, parent_task_id: parentTaskId },
  ]

  const mockRepo = {
    findTaskForAccess: async () => ({
      id: parentTaskId,
      tenant_id: pmUser.tenantId,
      title: 'Parent Task',
      status: 'ongoing',
      depends_on: [],
      _count: { blockers: 0 },
    }),
    findSubtasksByParentId: async () => subtasksList,
    createWithCompletion: async (input: { data: any }) => ({
      id: 'sub-new',
      ...input.data,
      title: input.data.title,
      status: 'yet_to_start',
    }),
  }

  const tasksService = new TasksService(mockRepo as never)

  // Fetch subtasks summary
  const summary = await tasksService.getSubtasks(parentTaskId, pmUser)
  assert.equal(summary.total_subtasks, 2)
  assert.equal(summary.completed_subtasks, 1)

  // Create new subtask
  const newSub = await tasksService.createSubtask(parentTaskId, { title: 'Review section' }, pmUser)
  assert.equal(newSub.title, 'Review section')
  assert.equal(newSub.is_subtask, true)

  console.log('  ✔ Subtask retrieval computed 1/2 completed subtasks and created new child subtask.')
}

run().catch((err) => {
  console.error('❌ Sprint 3 test suite failed:', err)
  process.exit(1)
})
