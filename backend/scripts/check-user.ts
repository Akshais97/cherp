import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- TARGET USERS ---')
  const users = await prisma.user.findMany({
    where: {
      email: {
        in: ['akshaiofficial97@gmail.com', 'akshairofficial@gmail.com']
      }
    },
    select: {
      id: true,
      email: true,
      full_name: true,
      is_active: true,
      auth_user_id: true,
      role: { select: { name: true } }
    }
  })
  console.log(JSON.stringify(users, null, 2))
}

main().finally(() => prisma.$disconnect())
