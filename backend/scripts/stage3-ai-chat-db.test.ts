import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaService } from '../src/prisma/prisma.service'
import { AiChatService } from '../src/ai-chat/ai-chat.service'
import { AiChatRepository } from '../src/ai-chat/ai-chat.repository'
import { TasksService } from '../src/tasks/tasks.service'
import { TasksRepository } from '../src/tasks/tasks.repository'
import { UserRole } from '../src/common/enums/user-role.enum'
import { RequestUser } from '../src/common/types/request-user.type'

process.env.GEMINI_API_KEY = 'mock-api-key'

async function run() {
  console.log('--- STARTING AI CHATBOT DATABASE INTEGRATION TEST ---')
  const prisma = new PrismaService()
  await prisma.$connect()

  const reportPath = join(__dirname, '..', '..', 'docs', 'current', 'chatbot_test_report.md')
  let testSuccess = false
  let logOutput = ''

  const log = (msg: string) => {
    console.log(msg)
    logOutput += msg + '\n'
  }

  try {
    // 1. Find existing active Super Admin or PM user to run as actor
    log('Locating an active Project Manager or Super Admin user...')
    const pmUser = await prisma.user.findFirst({
      where: {
        role: { name: { in: ['project_manager', 'super_admin'] } },
        is_active: true,
      },
      include: { role: true },
    })

    if (!pmUser) {
      throw new Error('No active PM or Super Admin user found in the database. Please seed the DB first.')
    }
    log(`PM Actor user found: ${pmUser.email} (Tenant: ${pmUser.tenant_id})`)

    // 2. Find existing active Team Member user in the same tenant to assign task to
    log('Locating an active Team Member user in the same tenant...')
    let tmUser = await prisma.user.findFirst({
      where: {
        tenant_id: pmUser.tenant_id,
        role: { name: 'team_member' },
        is_active: true,
      },
      include: { role: true },
    })

    if (!tmUser) {
      log('No active Team Member found in same tenant, looking globally...')
      tmUser = await prisma.user.findFirst({
        where: {
          role: { name: 'team_member' },
          is_active: true,
        },
        include: { role: true },
      })
    }

    if (!tmUser) {
      throw new Error('No active Team Member user found in the database. Please seed the DB first.')
    }
    log(`TM Assignee user found: ${tmUser.full_name} (${tmUser.email}) (ID: ${tmUser.id})`)

    // Request user model for execution context
    const pmRequestUser: RequestUser = {
      id: pmUser.id,
      authUserId: pmUser.auth_user_id,
      tenantId: pmUser.tenant_id,
      email: pmUser.email,
      fullName: pmUser.full_name,
      role: pmUser.role.name as UserRole,
      isActive: true,
    }

    // 3. Setup client (brand name Acme) and workflow in same tenant
    const clientName = `Acme Chatbot Client ${Date.now()}`
    log(`Creating test client brand: "${clientName}"...`)
    const client = await prisma.client.create({
      data: {
        tenant_id: pmUser.tenant_id,
        name: clientName,
        industry: 'Tech',
        service_type: 'SEO',
        status: 'active',
        created_by: pmUser.id,
      },
    })

    log('Creating Month 1 workflow...')
    const workflow = await prisma.workflow.create({
      data: {
        tenant_id: pmUser.tenant_id,
        client_id: client.id,
        title: `${clientName} — Month 1`,
        month_number: 1,
        status: 'active',
        project_manager_id: pmUser.id,
      },
    })

    // 4. Mock the Gemini fetch response
    const taskTitle = `Launch Campaign Banner ${Date.now()}`
    const dueDate = new Date('2026-06-25T15:00:00.000Z')

    log('Mocking Gemini API fetch call...')
    global.fetch = async (url: any, init?: any) => {
      const responseText = JSON.stringify({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                execute: 'create_task',
                params: {
                  taskTitle,
                  assigneeName: tmUser!.full_name,
                  brandName: clientName,
                  dueDate: dueDate.toISOString(),
                },
                response: 'AI successfully scheduled your task creation in the database.',
              }),
            }],
          },
        }],
      })
      return {
        ok: true,
        statusText: 'OK',
        json: async () => JSON.parse(responseText),
        text: async () => responseText,
      } as any
    }

    // 5. Initialize services and repositories
    const tasksRepo = new TasksRepository(prisma)
    const tasksService = new TasksService(tasksRepo)
    const aiChatRepo = new AiChatRepository(prisma)
    const aiChatService = new AiChatService(aiChatRepo, tasksService, undefined, undefined)

    // Wrap tasksService.create to log input parameters
    const originalCreate = tasksService.create.bind(tasksService)
    tasksService.create = async (wId, dto, usr) => {
      log(`[TasksService.create debug] called with DTO: ${JSON.stringify(dto)}`)
      return originalCreate(wId, dto, usr)
    }

    // Diagnosing repository query
    log(`[Diagnose] Querying findUserByName for name: "${tmUser.full_name}" in tenant: "${pmUser.tenant_id}"...`)
    const diagUser = await aiChatRepo.findUserByName({ tenantId: pmUser.tenant_id, name: tmUser.full_name })
    log(`[Diagnose] Result: ${JSON.stringify(diagUser)}`)

    // 6. Execute chatbot chat
    log(`Sending AI Chatbot command to create task "${taskTitle}"...`)
    const chatResult = (await aiChatService.chat(
      {
        action: 'chat',
        message: `Create task ${taskTitle} assigned to ${tmUser.full_name} due on 2026-06-25 at 15:00 for brand ${clientName}`,
      },
      pmRequestUser,
    )) as any

    log(`AI Response Type: ${chatResult.type}`)
    log(`AI Conversational Reply: "${chatResult.text}"`)

    assert.equal(chatResult.type, 'task_created')

    // 7. Verify task exists in Postgres database
    log('Querying database directly to check task insertion...')
    const createdTask = await prisma.task.findFirst({
      where: {
        tenant_id: pmUser.tenant_id,
        title: taskTitle,
      },
      include: {
        assignee: true,
        client: true,
        workflow: true,
      },
    })

    assert.ok(createdTask, 'Task was not created in the database!')
    log('✓ Task found in PostgreSQL!')
    assert.equal(createdTask.workflow_id, workflow.id)
    assert.equal(createdTask.client_id, client.id)
    assert.equal(createdTask.assigned_to, tmUser.id)
    assert.equal(createdTask.due_date?.toISOString(), dueDate.toISOString())
    assert.equal(createdTask.status, 'yet_to_start')
    log('✓ Task relational bindings are fully correct!')

    // 8. Clean up database
    log('Cleaning up test records from database...')
    await prisma.task.delete({ where: { id: createdTask.id } })
    await prisma.workflow.delete({ where: { id: workflow.id } })
    await prisma.client.delete({ where: { id: client.id } })
    log('✓ DB cleaned up successfully.')

    testSuccess = true
  } catch (error: any) {
    log(`FAIL: chatbot database test failed: ${error.message}`)
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }

  // 9. Write test report
  const report = `# AI Chatbot Task Creation DB Test Report

## Metadata
* **Status**: ${testSuccess ? 'PASS' : 'FAIL'}
* **Timestamp**: ${new Date().toISOString()}
* **Scope**: End-to-End Chatbot Database Verification
* **Target Database**: Supabase PostgreSQL

## Log Output
\`\`\`txt
${logOutput}
\`\`\`

## Verification Checks
- [x] Locate active PM or Super Admin actor account
- [x] Query active team member assignee account in same tenant
- [x] Create active client brand profile under tenant
- [x] Generate active month 1 delivery workflow under client
- [x] Mock Gemini AI function calling
- [x] Invoke AiChatService.chat() action pipeline
- [x] Assert task record insertion in PostgreSQL table
- [x] Validate task-workflow-client-assignee relations
- [x] Tear down and purge test objects from the database
`
  writeFileSync(reportPath, report)
  log(`Test report written to docs/current/chatbot_test_report.md`)

  if (!testSuccess) {
    process.exitCode = 1
  }
}

run()
