/// <reference types="node" />

import assert from 'node:assert/strict'
import { UserRole } from '../src/common/enums/user-role.enum'
import { RequestUser } from '../src/common/types/request-user.type'
import { AiChatService } from '../src/ai-chat/ai-chat.service'

const pm: RequestUser = {
  id: '11111111-1111-4111-8111-111111111111',
  authUserId: '21111111-1111-4111-8111-111111111111',
  tenantId: '31111111-1111-4111-8111-111111111111',
  email: 'pm@example.com',
  fullName: 'PM User',
  role: UserRole.ProjectManager,
  isActive: true,
}

const tm: RequestUser = {
  id: '44444444-4444-4444-8444-444444444444',
  authUserId: '54444444-4444-4444-8444-444444444444',
  tenantId: '31111111-1111-4111-8111-111111111111',
  email: 'tm@example.com',
  fullName: 'TM User',
  role: UserRole.TeamMember,
  isActive: true,
}

process.env.GEMINI_API_KEY = 'mock-key'

const mockFetch = async (url: string, init?: RequestInit) => {
  let responseText = '{}'
  if (url.includes('generateContent')) {
    const body = JSON.parse(init?.body as string)
    const userMessagePart = body.contents[body.contents.length - 1].parts[0].text
    
    if (userMessagePart.includes('design launch banner') || userMessagePart.includes('Aman Sharma')) {
      responseText = JSON.stringify({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                execute: 'create_task',
                params: {
                  taskTitle: 'design launch banner',
                  assigneeName: 'Aman Sharma',
                  brandName: 'Acme',
                  dueDate: '2026-06-20',
                },
                response: 'Creating task...',
              }),
            }],
          },
        }],
      })
    } else if (userMessagePart.includes('give approval for task logo design') || userMessagePart.includes('logo design')) {
      responseText = JSON.stringify({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                execute: 'give_approval',
                params: {
                  taskTitle: 'logo design',
                },
                response: 'Giving approval...',
              }),
            }],
          },
        }],
      })
    } else if (userMessagePart.includes('ask approval for task caption draft') || userMessagePart.includes('caption draft')) {
      responseText = JSON.stringify({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                execute: 'ask_approval',
                params: {
                  taskTitle: 'caption draft',
                },
                response: 'Asking approval...',
              }),
            }],
          },
        }],
      })
    } else {
      responseText = JSON.stringify({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                execute: 'none',
                params: {},
                response: 'Menu response',
              }),
            }],
          },
        }],
      })
    }
  }
  return {
    ok: true,
    statusText: 'OK',
    json: async () => JSON.parse(responseText),
    text: async () => responseText,
  } as Response
}
global.fetch = mockFetch as any

async function run() {
  await testGuidedCreateTaskExtractsTaskAssigneeAndDeadline()
  await testTeamMemberCannotCreateTask()
  await testPmGiveApprovalTransitionsTask()
  await testTmAskApprovalTransitionsTask()
  await testTmCannotGiveApproval()
  console.log('Stage 3 AI chat tests passed.')
}

async function testGuidedCreateTaskExtractsTaskAssigneeAndDeadline() {
  const created: unknown[] = []
  const resolver = {
    findWorkflowByBrand: async () => ({ id: 'workflow-1', client: { name: 'Acme' } }),
    findUserByName: async () => ({ id: 'user-1', full_name: 'Aman Sharma' }),
  }
  const tasks = {
    create: async (workflowId: string, payload: unknown) => {
      created.push({ workflowId, payload })
      return { id: 'task-1', ...(payload as object) }
    },
  }
  const service = new AiChatService(resolver as never, tasks as never, undefined as never)

  const result = await service.chat(
    {
      action: 'create_task',
      message: 'Task is design launch banner. Assign this task to Aman Sharma. Deadline is 2026-06-20. Brand is Acme.',
    },
    pm,
  )

  assert.equal(result.type, 'task_created')
  assert.deepEqual(created[0], {
    workflowId: 'workflow-1',
    payload: {
      title: 'design launch banner',
      assigned_to: 'user-1',
      due_date: '2026-06-20',
    },
  })
}

async function testTeamMemberCannotCreateTask() {
  const service = new AiChatService({} as never, {} as never, undefined as never)

  await assert.rejects(
    () =>
      service.chat(
        { action: 'create_task', message: 'Task is write captions. Brand is Acme.' },
        tm,
      ),
    /Only project managers and super admins can create tasks/,
  )
}

async function testPmGiveApprovalTransitionsTask() {
  const updated: unknown[] = []
  const resolver = {
    findTaskByTitle: async () => ({ id: 'task-logo', title: 'logo design' }),
  }
  const tasks = {
    update: async (taskId: string, payload: any) => {
      updated.push({ taskId, payload })
      return { id: taskId, title: 'logo design', status: payload.status }
    },
  }
  const service = new AiChatService(resolver as never, tasks as never, undefined as never)

  const result = await service.chat(
    {
      action: 'give_approval',
      message: 'give approval for task logo design',
    },
    pm,
  )

  assert.equal(result.type, 'task_updated')
  assert.equal((result as any).task.status, 'task_approved_by_manager')
  assert.deepEqual(updated[0], {
    taskId: 'task-logo',
    payload: { status: 'task_approved_by_manager' },
  })
}

async function testTmAskApprovalTransitionsTask() {
  const updated: unknown[] = []
  const resolver = {
    findTaskByTitle: async () => ({ id: 'task-caption', title: 'caption draft' }),
  }
  const tasks = {
    update: async (taskId: string, payload: any) => {
      updated.push({ taskId, payload })
      return { id: taskId, title: 'caption draft', status: payload.status }
    },
  }
  const service = new AiChatService(resolver as never, tasks as never, undefined as never)

  const result = await service.chat(
    {
      action: 'ask_approval',
      message: 'ask approval for task caption draft',
    },
    tm,
  )

  assert.equal(result.type, 'task_updated')
  assert.equal((result as any).task.status, 'completed')
  assert.deepEqual(updated[0], {
    taskId: 'task-caption',
    payload: { status: 'completed' },
  })
}

async function testTmCannotGiveApproval() {
  const resolver = {
    findTaskByTitle: async () => ({ id: 'task-logo', title: 'logo design' }),
  }
  const service = new AiChatService(resolver as never, {} as never, undefined as never)

  await assert.rejects(
    () =>
      service.chat(
        { action: 'give_approval', message: 'give approval for task logo design' },
        tm,
      ),
    /Only project managers and super admins can give approval/,
  )
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
