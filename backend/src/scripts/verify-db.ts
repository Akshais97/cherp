import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verify() {
  const clientCount = await prisma.client.count()
  const workflowCount = await prisma.workflow.count()
  const taskCount = await prisma.task.count()
  const blockerCount = await prisma.blocker.count()
  const userCount = await prisma.user.count()
  const templateCount = await prisma.scopeTemplate.count()

  console.log('=== DB VERIFICATION SUMMARY ===')
  console.log(`Clients:         ${clientCount}`)
  console.log(`Workflows:       ${workflowCount}`)
  console.log(`Tasks:           ${taskCount}`)
  console.log(`Blockers:        ${blockerCount}`)
  console.log(`Users:           ${userCount}`)
  console.log(`Scope Templates: ${templateCount}`)
  console.log('===============================')
}

verify().finally(async () => await prisma.$disconnect())
