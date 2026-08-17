import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const prisma = new PrismaClient()

async function removeE2EUsers() {
  console.log('--- Searching for E2E Test Users ---')

  const admin = await prisma.user.findFirst({
    where: { email: 'superadmin@agency.com' },
  })

  const e2eUsers = await prisma.user.findMany({
    where: {
      OR: [
        { full_name: { startsWith: 'E2E' } },
        { email: { contains: '+team-e2e-' } },
        { email: { contains: '+pm-e2e-' } },
        { email: { contains: '+client-e2e-' } },
        { email: { contains: 'e2e' } },
      ],
    },
    select: {
      id: true,
      email: true,
      full_name: true,
      auth_user_id: true,
    },
  })

  console.log(`Found ${e2eUsers.length} E2E users to remove.`)

  let deletedCount = 0
  for (const user of e2eUsers) {
    try {
      if (admin && admin.id !== user.id) {
        await prisma.scopeTemplate.updateMany({
          where: { created_by: user.id },
          data: { created_by: admin.id },
        })
      }

      await prisma.history.deleteMany({ where: { user_id: user.id } })
      await prisma.notification.deleteMany({ where: { user_id: user.id } })
      await prisma.notificationPreference.deleteMany({ where: { user_id: user.id } })
      await prisma.clientUser.deleteMany({ where: { user_id: user.id } })

      if (user.auth_user_id) {
        await supabase.auth.admin.deleteUser(user.auth_user_id)
      }

      await prisma.user.deleteMany({ where: { id: user.id } })

      deletedCount++
      console.log(`Deleted E2E user: ${user.full_name} (${user.email})`)
    } catch (err: any) {
      console.error(`Error deleting user ${user.email}:`, err.message || err)
    }
  }

  console.log(`--- Successfully Removed ${deletedCount} E2E Users ---`)
}

removeE2EUsers()
  .catch((e) => {
    console.error('Error removing E2E users:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
