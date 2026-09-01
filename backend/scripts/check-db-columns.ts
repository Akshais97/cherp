import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Testing erp.users query with sessions_revoked_at...')

  try {
    const user = await prisma.user.findFirst({
      select: {
        id: true,
        auth_user_id: true,
        email: true,
        full_name: true,
        avatar_url: true,
        is_active: true,
        sessions_revoked_at: true,
        role: { select: { name: true } },
      },
    })
    console.log('✔ User query with sessions_revoked_at SUCCESS:', user)
  } catch (err: any) {
    console.error('❌ User query FAILED:', err.message, err.code)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
