import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const blockers = await prisma.blocker.findMany({
    take: 10,
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      title: true,
      status: true,
      flagged_by: true,
      assigned_to: true,
      resolved_by: true,
      created_at: true,
      resolved_at: true,
      task: { select: { id: true, title: true, assigned_to: true, workflow: { select: { project_manager_id: true } } } },
      flagger: { select: { email: true } },
      assignee: { select: { email: true } },
      resolver: { select: { email: true } },
    },
  })
  console.log('Blockers in DB:', JSON.stringify(blockers, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
