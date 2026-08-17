import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const backendUrl = 'http://localhost:3000/api'

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
const prisma = new PrismaClient()

async function testClientCreation() {
  console.log('=== RCA INTEGRATION TEST: Client Creation with team_assignments ===')

  // 1. Authenticate as Project Manager User
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'pm@agency.com',
    password: 'Password123!',
  })

  if (authError || !authData.session) {
    console.error('Failed to authenticate as pm@agency.com:', authError?.message)
    process.exit(1)
  }

  const token = authData.session.access_token
  console.log('Successfully authenticated as PM user.')

  // 2. Fetch Scope Template
  const template = await prisma.scopeTemplate.findFirst({
    where: { is_active: true },
  })

  if (!template) {
    console.error('No active scope template found in database!')
    process.exit(1)
  }

  console.log(`Using scope template: ${template.name} (${template.id})`)

  // 3. Fetch Team Members to assign
  const designer = await prisma.user.findFirst({ where: { email: 'team.designer@agency.com' } })
  const writer = await prisma.user.findFirst({ where: { email: 'team.writer@agency.com' } })

  const payload = {
    name: `RCA Test Client ${Date.now()}`,
    industry: template.industry,
    service_type: template.service_type,
    contact_name: 'John Test',
    contact_email: `rca.test.${Date.now()}@example.com`,
    monthly_retainer: 75000,
    currency: 'INR',
    contract_duration: template.duration_months,
    contract_start: '2026-08-17',
    scope_template_id: template.id,
    team_assignments: {
      'Graphic Designer': designer ? [designer.id] : [],
      'Content Writer': writer ? [writer.id] : [],
    },
  }

  console.log('Sending POST /api/clients request payload...')

  const res = await fetch(`${backendUrl}/clients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const body = (await res.json()) as any

  if (res.status === 201) {
    console.log('\n✅ SUCCESS: Client created with status 201 Created!')
    console.log(`Created Client ID: ${body.client?.id}`)
    console.log(`Created Workflow ID: ${body.workflow?.id}`)
    console.log(`Generated Tasks Count: ${body.tasks?.length}`)
  } else {
    console.error(`\n❌ FAILED with Status ${res.status}:`, JSON.stringify(body, null, 2))
    process.exit(1)
  }
}

testClientCreation()
  .catch((e) => {
    console.error('Test script exception:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
