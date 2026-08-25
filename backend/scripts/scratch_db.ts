import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const notifs = await prisma.notification.findMany({
    orderBy: { created_at: 'desc' },
    take: 20,
    select: {
      id: true,
      user_id: true,
      type: true,
      title: true,
      message: true,
      created_at: true,
      user: { select: { email: true, full_name: true } },
    },
  })
  console.log('Last 20 notifications in DB:', JSON.stringify(notifs, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
