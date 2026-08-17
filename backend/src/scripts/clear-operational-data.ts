import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearOperationalData() {
  console.log('--- Starting Data Cleanup (Tasks, Workflows, Clients & Blockers) ---')

  await prisma.$transaction(async (tx) => {
    // 1. Clear task-level sub-entities
    console.log('Clearing task logs, comments, attachments, time entries, and blockers...')
    await tx.taskLog.deleteMany({})
    await tx.taskComment.deleteMany({})
    await tx.taskAttachment.deleteMany({})
    await tx.timeEntry.deleteMany({})
    await tx.blocker.deleteMany({})

    // 2. Clear tasks and workflows
    console.log('Clearing tasks and workflows...')
    await tx.task.deleteMany({})
    await tx.workflow.deleteMany({})

    // 3. Clear client-user links and clients
    console.log('Clearing client-user mappings and clients...')
    await tx.clientUser.deleteMany({})
    await tx.client.deleteMany({})

    // 4. Clear activity logs
    console.log('Clearing activity logs...')
    await tx.activityLog.deleteMany({})
  })

  console.log('--- Operational Data Successfully Cleared! ---')
  console.log('Users, Roles, Tenants, and Scope Templates remain untouched.')
}

clearOperationalData()
  .catch((e) => {
    console.error('Error during data cleanup:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
