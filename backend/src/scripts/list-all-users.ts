import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function listAllUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      full_name: true,
      designation: true,
      is_active: true,
      role: {
        select: {
          name: true,
          description: true,
        },
      },
    },
    orderBy: [
      { role: { name: 'asc' } },
      { full_name: 'asc' },
    ],
  })

  console.log(`\n=== TOTAL USERS IN DATABASE: ${users.length} ===\n`)
  console.log(JSON.stringify(users, null, 2))
}

listAllUsers().finally(async () => await prisma.$disconnect())
