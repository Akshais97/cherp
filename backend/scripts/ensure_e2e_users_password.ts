import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env') })

const supabaseUrl = process.env.SUPABASE_URL || 'https://xuojujpjnybocuukdgur.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(supabaseUrl, serviceRoleKey)
const prisma = new PrismaClient()

async function main() {
  const targetEmails = ['team.writer@agency.com', 'pm@agency.com', 'akshaiofficial97@gmail.com']
  const password = process.env.E2E_PASSWORD || 'SakhaaOnTop123'

  console.log('Ensuring Supabase Auth passwords for Selenium test users...')

  for (const email of targetEmails) {
    const user = await prisma.user.findFirst({ where: { email } })
    if (!user) {
      console.log(`User ${email} not found in ERP DB. Skipping.`)
      continue
    }

    if (!user.auth_user_id) {
      console.log(`User ${email} has no auth_user_id. Skipping.`)
      continue
    }

    const { data, error } = await supabase.auth.admin.updateUserById(user.auth_user_id, {
      password,
    })

    if (error) {
      console.error(`Failed to update password for ${email}:`, error.message)
    } else {
      console.log(`✅ Password for ${email} successfully set/updated in Supabase Auth (User ID: ${data.user.id}).`)
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
