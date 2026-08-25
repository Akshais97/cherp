import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env') })

const prisma = new PrismaClient()

async function main() {
  const writer = await prisma.user.findFirst({
    where: { email: 'team.writer@agency.com' },
  })

  console.log('Writer user:', writer)

  if (!writer) return

  const notifications = await prisma.notification.findMany({
    where: { user_id: writer.id },
    orderBy: { created_at: 'desc' },
    take: 20,
  })

  console.log('Notifications for team.writer@agency.com:', JSON.stringify(notifications, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
