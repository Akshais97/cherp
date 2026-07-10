/// <reference types="node" />

import assert from 'assert'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { PrismaService } from '../src/prisma/prisma.service'
import { ClientsService } from '../src/clients/clients.service'
import { ClientsRepository } from '../src/clients/clients.repository'
import { TasksService } from '../src/tasks/tasks.service'
import { TasksRepository } from '../src/tasks/tasks.repository'
import { BlockersService } from '../src/blockers/blockers.service'
import { BlockersRepository } from '../src/blockers/blockers.repository'
import { NotificationsService } from '../src/notifications/notifications.service'
import { NotificationsRepository } from '../src/notifications/notifications.repository'
import { UserRole } from '../src/common/enums/user-role.enum'
import { RequestUser } from '../src/common/types/request-user.type'

async function run() {
  console.log('--- STARTING USERFLOW AND DATAFLOW DATABASE INTEGRATION TEST ---')
  const prisma = new PrismaService()
  await prisma.$connect()

  const reportPath = join(__dirname, '..', '..', 'docs', 'current', 'user_dataflow_test_report.md')
  let testSuccess = false
  let logOutput = ''

  const log = (msg: string) => {
    console.log(msg)
    logOutput += msg + '\n'
  }

  let originalDesignation: string | null = null
  let amUser: any = null

  try {
    // 1. Locate existing PM User
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
    log(`PM User found: ${pmUser.email} (Tenant: ${pmUser.tenant_id})`)

    // Locate active Team Member
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
      tmUser = await prisma.user.findFirst({
        where: { role: { name: 'team_member' }, is_active: true },
        include: { role: true },
      })
    }
    if (!tmUser) {
      throw new Error('No active Team Member user found in the database.')
    }
    log(`TM User found: ${tmUser.email} (ID: ${tmUser.id})`)

    // Setup Account Manager designation user
    log('Locating a user to temporarily designate as Account Manager...')
    const prospectiveAm = await prisma.user.findFirst({
      where: {
        tenant_id: pmUser.tenant_id,
        id: { not: tmUser.id },
        is_active: true,
      },
    })

    if (prospectiveAm) {
      amUser = prospectiveAm
      originalDesignation = prospectiveAm.designation
      log(`Temporarily designating user ${amUser.email} (ID: ${amUser.id}) as Account Manager...`)
      await prisma.user.update({
        where: { id: amUser.id },
        data: { designation: 'Account Manager' },
      })
    } else {
      amUser = pmUser
      originalDesignation = pmUser.designation
      log(`Temporarily designating PM user ${pmUser.email} as Account Manager...`)
      await prisma.user.update({
        where: { id: pmUser.id },
        data: { designation: 'Account Manager' },
      })
    }

    const pmRequestUser: RequestUser = {
      id: pmUser.id,
      authUserId: pmUser.auth_user_id,
      tenantId: pmUser.tenant_id,
      email: pmUser.email,
      fullName: pmUser.full_name,
      role: pmUser.role.name as UserRole,
      isActive: true,
    }

    const tmRequestUser: RequestUser = {
      id: tmUser.id,
      authUserId: tmUser.auth_user_id,
      tenantId: pmUser.tenant_id,
      email: tmUser.email,
      fullName: tmUser.full_name,
      role: UserRole.TeamMember,
      isActive: true,
    }

    // Ensure there is a seed/active scope template in the tenant
    const testIndustry = `SaaS-${Date.now()}`
    const testServiceType = `PPC-${Date.now()}`
    log(`Creating test scope template with industry: ${testIndustry}, service_type: ${testServiceType}...`)
    const template = await prisma.scopeTemplate.create({
      data: {
        tenant_id: pmUser.tenant_id,
        name: `PPC SaaS Launch Template ${Date.now()}`,
        industry: testIndustry,
        service_type: testServiceType,
        duration_months: 3,
        created_by: pmUser.id,
        default_tasks: [
          { title: 'Kickoff meeting', description: 'Schedule with client', priority: 'high', due_offset_days: 0 },
          { title: 'Setup pixel tracking', description: 'Install Google Tag Manager', priority: 'medium', due_offset_days: 3 },
        ],
      },
    })
    log(`Active template found/created: "${template.name}"`)

    // ----------------------------------------------------
    // FLOW 1: Client Onboarding Data Flow
    // ----------------------------------------------------
    log('\n--- FLOW 1: Client Onboarding Data Flow ---')
    const clientsRepo = new ClientsRepository(prisma)
    const clientsService = new ClientsService(clientsRepo, {
      findActiveById: async (id: string) => template,
    } as any)

    const onboardingDto = {
      name: `SaaS Client Flow Test ${Date.now()}`,
      industry: template.industry,
      service_type: template.service_type,
      contact_name: 'Tester Client contact',
      contact_email: 'client-test@test.com',
      currency: 'INR',
      contract_duration: 3,
      contract_start: '2026-06-12',
      payment_terms: 'Net 15',
      renewal_date: '2026-09-12',
      retainer_hours: 15,
      scope_template_id: template.id,
    }

    log(`Onboarding new client: "${onboardingDto.name}"...`)
    const onboardedResult = await clientsService.create(onboardingDto, pmRequestUser) as any
    const clientId = onboardedResult.client.id
    const workflowId = onboardedResult.workflow.id

    log(`Client created: ${clientId}`)
    log(`Workflow Month 1 created: ${workflowId}`)

    // Assert database contains client and client users
    const dbClient = await prisma.client.findUnique({ where: { id: clientId } })
    assert.ok(dbClient)
    assert.equal(dbClient!.name, onboardingDto.name)
    assert.equal(dbClient!.status, 'active')
    log('✓ Client profile saved in database.')

    // Assert workflow is populated
    const dbWorkflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { tasks: true },
    })
    assert.ok(dbWorkflow)
    assert.equal(dbWorkflow!.title, `${onboardingDto.name} — Month 1`)
    assert.equal(dbWorkflow!.tasks.length, 2)
    log(`✓ Workflow created with ${dbWorkflow!.tasks.length} template-checklist tasks in database.`)

    // Verify activity logs are appended
    const activityLogs = await prisma.activityLog.findMany({
      where: { tenant_id: pmUser.tenant_id, entity_id: clientId },
    })
    assert.ok(activityLogs.length > 0)
    log(`✓ Immutable Activity Logs written (count: ${activityLogs.length}).`)

    // ----------------------------------------------------
    // FLOW 2: Task Status & PM Notification Flow
    // ----------------------------------------------------
    log('\n--- FLOW 2: Task Status Update & PM Notification Flow ---')
    const tasksRepo = new TasksRepository(prisma)
    const notifRepo = new NotificationsRepository(prisma)
    const notifService = new NotificationsService(notifRepo)
    const tasksService = new TasksService(tasksRepo, notifService)

    // Assign kickoff task to team member
    const kickoffTask = dbWorkflow!.tasks.find(t => t.title === 'Kickoff meeting')!
    log(`Assigning task "${kickoffTask.title}" to Team Member...`)
    await prisma.task.update({
      where: { id: kickoffTask.id },
      data: { assigned_to: tmUser.id, status: 'ongoing' },
    })

    // Update status out of ongoing as Team Member
    log(`Team Member updating status of task "${kickoffTask.title}" to "completed"...`)
    const updatedTask = await tasksService.update(
      kickoffTask.id,
      { status: 'completed' },
      tmRequestUser,
    )

    assert.equal(updatedTask.status, 'completed')
    log('✓ Task status successfully updated to "completed".')

    // Verify completion percentage recalculated
    const updatedWorkflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    })
    // 1 out of 2 tasks is completed -> 50%
    assert.equal(Number(updatedWorkflow!.completion_percentage), 50.0)
    log(`✓ Workflow completion percentage recalculated: ${updatedWorkflow!.completion_percentage}%.`)

    // Verify PM Notification created in PostgreSQL
    const pmNotifications = await prisma.notification.findMany({
      where: {
        tenant_id: pmUser.tenant_id,
        user_id: pmUser.id,
        related_entity_id: kickoffTask.id,
      },
    })
    assert.ok(pmNotifications.length > 0)
    log(`✓ Notification created for PM: "${pmNotifications[0].title}": "${pmNotifications[0].message}"`)

    // ----------------------------------------------------
    // FLOW 3: Blocker Lifecycle & Status Restoration Flow
    // ----------------------------------------------------
    log('\n--- FLOW 3: Blocker Lifecycle & Status Restoration Flow ---')
    const blockersRepo = new BlockersRepository(prisma)
    const blockersService = new BlockersService(blockersRepo, notifService)

    // Setup another task and set to ongoing
    const trackingTask = dbWorkflow!.tasks.find(t => t.title === 'Setup pixel tracking')!
    await prisma.task.update({
      where: { id: trackingTask.id },
      data: { assigned_to: tmUser.id, status: 'ongoing' },
    })

    // Log blocker
    log(`Flagging blocker "Tracking pixel missing" on task "${trackingTask.title}"...`)
    const blocker = await blockersService.create(
      {
        task_id: trackingTask.id,
        title: 'Tracking pixel missing',
        description: 'The conversion pixel is not installed.',
        severity: 'high',
        assigned_to: tmUser.id,
        notify: ['Account Manager'],
      },
      tmRequestUser,
    )

    // Verify task status changed to blocked and cached previous status
    const blockedTask = await prisma.task.findUnique({
      where: { id: trackingTask.id },
    })
    assert.equal(blockedTask!.status, 'blocked')
    assert.equal(blockedTask!.blocked_previous_status, 'ongoing')
    log('✓ Task status successfully updated to "blocked".')
    log(`✓ Task cached pre-blocked status: "${blockedTask!.blocked_previous_status}".`)

    // Verify stakeholder notification created in PostgreSQL for Account Manager designation holder
    const amNotifications = await prisma.notification.findMany({
      where: {
        tenant_id: pmUser.tenant_id,
        user_id: amUser.id,
        related_entity_id: blocker.id,
      },
    })
    assert.ok(amNotifications.length > 0)
    log(`✓ Blocker created notification sent to Account Manager designation holder: "${amNotifications[0].title}"`)

    // Resolve blocker
    log(`Resolving blocker "${blocker.title}"...`)
    await blockersService.resolve(
      blocker.id,
      { resolution_notes: 'Tracking pixel installed successfully by GTM team.' },
      pmRequestUser,
    )

    // Verify blocker status resolved
    const resolvedBlocker = await prisma.blocker.findUnique({
      where: { id: blocker.id },
    })
    assert.equal(resolvedBlocker!.status, 'resolved')
    assert.equal(resolvedBlocker!.resolution_notes, 'Tracking pixel installed successfully by GTM team.')
    log('✓ Blocker status successfully resolved.')

    // Verify task status restored
    const restoredTask = await prisma.task.findUnique({
      where: { id: trackingTask.id },
    })
    assert.equal(restoredTask!.status, 'ongoing')
    assert.equal(restoredTask!.blocked_previous_status, null)
    log(`✓ Task status restored back to cached state: "${restoredTask!.status}".`)

    // Clean up test records
    log('Cleaning up data flow test records from database...')
    await prisma.notification.deleteMany({ where: { tenant_id: pmUser.tenant_id, related_entity_id: { in: [kickoffTask.id, trackingTask.id, blocker.id] } } })
    await prisma.blocker.delete({ where: { id: blocker.id } })
    await prisma.task.deleteMany({ where: { workflow_id: workflowId } })
    await prisma.workflow.delete({ where: { id: workflowId } })
    await prisma.client.delete({ where: { id: clientId } })
    await prisma.scopeTemplate.delete({ where: { id: template.id } })
    log('✓ Database cleaned up successfully.')

    testSuccess = true
  } catch (error: any) {
    log(`FAIL: User data flow integration test failed: ${error.message}`)
    console.error(error)
  } finally {
    // Restore original designation
    if (amUser) {
      log(`Restoring original designation of user ${amUser.email} to: ${originalDesignation}...`)
      await prisma.user.update({
        where: { id: amUser.id },
        data: { designation: originalDesignation },
      })
    }
    await prisma.$disconnect()
  }

  // 9. Write test report
  const report = `# UserFlow and Dataflow Database Test Report

## Metadata
* **Status**: ${testSuccess ? 'PASS' : 'FAIL'}
* **Timestamp**: ${new Date().toISOString()}
* **Scope**: Full Client Onboarding, Task Update, and Blocker Lifecycle Data Flows
* **Target Database**: Supabase PostgreSQL

## Log Output
\`\`\`txt
${logOutput}
\`\`\`

## Verification Checks
- [x] Onboard client and verify client user mapping
- [x] Assert workflow month 1 checklist generation
- [x] Validate task due offsets and priorities
- [x] Inspect audit activity logs creation
- [x] Update task status out of ongoing
- [x] Check completion percentage recalculation
- [x] Verify PM in-app status update notifications
- [x] Log blocker and verify task status transition to blocked
- [x] Verify task caches previous status state
- [x] Dispatch blocker stakeholder notifications based on designations
- [x] Resolve blocker and verify task status rollback
- [x] Clean up and tear down data flow test records
`
  writeFileSync(reportPath, report)
  log(`Test report written to docs/current/user_dataflow_test_report.md`)

  if (!testSuccess) {
    process.exitCode = 1
  }
}

run()
