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

const TEST_PASSWORD = 'Password123!'

type AccountSpec = {
  email: string
  fullName: string
  roleName: 'super_admin' | 'project_manager' | 'team_member' | 'client'
  designation: string
  team: string | null
  skills: string[]
}

const ACCOUNTS_TO_CREATE: AccountSpec[] = [
  {
    email: 'superadmin@agency.com',
    fullName: 'Super Admin User',
    roleName: 'super_admin',
    designation: 'Executive Director',
    team: 'Brand Manager',
    skills: ['Agency Management', 'Operations Strategy', 'Governance'],
  },
  {
    email: 'pm@agency.com',
    fullName: 'Project Manager User',
    roleName: 'project_manager',
    designation: 'Project Manager',
    team: 'Brand Manager',
    skills: ['Workflow Orchestration', 'Client Delivery', 'Resource Allocation'],
  },
  {
    email: 'team.designer@agency.com',
    fullName: 'Graphic Designer User',
    roleName: 'team_member',
    designation: 'Graphic Designer',
    team: 'Creative Designer',
    skills: ['Graphic Design', 'Visual Identity', 'Carousels', 'Brochure Layout'],
  },
  {
    email: 'team.writer@agency.com',
    fullName: 'Content Writer User',
    roleName: 'team_member',
    designation: 'Content Writer',
    team: 'Copywriter',
    skills: ['Copywriting', 'Reel Scripts', 'Ad Copy', 'Brand Messaging'],
  },
  {
    email: 'team.performance@agency.com',
    fullName: 'Performance Marketer User',
    roleName: 'team_member',
    designation: 'Performance Marketer',
    team: 'Performance Marketer',
    skills: ['Meta Ads', 'Google Ads', 'GA4 & UTMs', 'Conversion Optimization'],
  },
  {
    email: 'team.seo@agency.com',
    fullName: 'SEO Specialist User',
    roleName: 'team_member',
    designation: 'SEO Specialist',
    team: 'SEO Specialist',
    skills: ['Technical SEO', 'Keyword Strategy', 'Off-Page Distribution', 'Search Console'],
  },
  {
    email: 'team.crm@agency.com',
    fullName: 'CRM Specialist User',
    roleName: 'team_member',
    designation: 'CRM Specialist',
    team: 'Marketing Automation',
    skills: ['CRM Architecture', 'Email Drip Sequences', 'WhatsApp Engines', 'Deal Pipeline'],
  },
  {
    email: 'team.smm@agency.com',
    fullName: 'Social Media Manager User',
    roleName: 'team_member',
    designation: 'Social Media Manager',
    team: 'Video Editor',
    skills: ['Content Calendar', 'ORM Monitoring', 'Community Response', 'Reels'],
  },
  {
    email: 'client@agency.com',
    fullName: 'Client Portal User',
    roleName: 'client',
    designation: 'Client Partner',
    team: null,
    skills: ['Deliverable Review', 'Approval Governance'],
  },
]

async function run() {
  console.log('--- Starting Role Accounts & Team Specifications Seeding ---')

  const tenant = await prisma.tenant.findFirst({
    orderBy: { created_at: 'asc' },
  })

  if (!tenant) {
    console.error('No tenant found in DB!')
    process.exit(1)
  }

  console.log(`Using Tenant: ${tenant.name} (${tenant.id})`)

  const roles = await prisma.role.findMany()
  const roleMap = new Map(roles.map((r) => [r.name, r.id]))

  const existingAuthUsers = await supabase.auth.admin.listUsers()
  const authUserMap = new Map(existingAuthUsers.data.users.map((u) => [u.email, u]))

  for (const spec of ACCOUNTS_TO_CREATE) {
    const roleId = roleMap.get(spec.roleName)
    if (!roleId) {
      console.error(`Role ${spec.roleName} not found in DB!`)
      continue
    }

    let authUser = authUserMap.get(spec.email)

    if (!authUser) {
      console.log(`Creating Supabase Auth user: ${spec.email}`)
      const createRes = await supabase.auth.admin.createUser({
        email: spec.email,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: spec.fullName,
          role: spec.roleName,
          tenant_id: tenant.id,
          team: spec.team,
          designation: spec.designation,
        },
      })

      if (createRes.error) {
        console.error(`Error creating Supabase user ${spec.email}:`, createRes.error.message)
        continue
      }
      authUser = createRes.data.user
    } else {
      console.log(`Updating existing Supabase Auth user: ${spec.email}`)
      await supabase.auth.admin.updateUserById(authUser.id, {
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: spec.fullName,
          role: spec.roleName,
          tenant_id: tenant.id,
          team: spec.team,
          designation: spec.designation,
        },
      })
    }

    const erpUser = await prisma.user.findFirst({
      where: { tenant_id: tenant.id, email: spec.email },
    })

    if (erpUser) {
      console.log(`Updating ERP user record with team (${spec.team}) and designation (${spec.designation}): ${spec.email}`)
      await prisma.user.update({
        where: { id: erpUser.id },
        data: {
          role_id: roleId,
          auth_user_id: authUser.id,
          full_name: spec.fullName,
          designation: spec.designation,
          team: spec.team,
          skills: spec.skills,
          is_active: true,
        },
      })
    } else {
      console.log(`Creating ERP user record with team (${spec.team}) and designation (${spec.designation}): ${spec.email}`)
      await prisma.user.create({
        data: {
          tenant_id: tenant.id,
          role_id: roleId,
          auth_user_id: authUser.id,
          email: spec.email,
          full_name: spec.fullName,
          designation: spec.designation,
          team: spec.team,
          skills: spec.skills,
          is_active: true,
        },
      })
    }
  }

  const akshaiAdmin = await prisma.user.findFirst({ where: { email: 'akshaiofficial97@gmail.com' } })
  if (akshaiAdmin) {
    await prisma.user.update({
      where: { id: akshaiAdmin.id },
      data: { team: 'Brand Manager', designation: 'Super Admin', skills: ['System Administration'] },
    })
  }

  const akshaiPm = await prisma.user.findFirst({ where: { email: 'akshaiindia97@gmail.com' } })
  if (akshaiPm) {
    await prisma.user.update({
      where: { id: akshaiPm.id },
      data: { team: 'Brand Manager', designation: 'Project Manager', skills: ['Delivery Management'] },
    })
  }

  const akshaiTm = await prisma.user.findFirst({ where: { email: 'akshairofficial@gmail.com' } })
  if (akshaiTm) {
    await prisma.user.update({
      where: { id: akshaiTm.id },
      data: { team: 'Brand Manager', designation: 'Account Manager', skills: ['Account Management'] },
    })
  }

  console.log('--- Account Seeding & Team Specifications Completed Successfully! ---')
}

run()
  .catch((e) => {
    console.error('Error during seeding:', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
