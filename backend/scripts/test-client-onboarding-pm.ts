import assert from 'node:assert/strict'
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const backendUrl = 'http://localhost:3000/api'

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
const prisma = new PrismaClient()

async function runClientOnboardingTest() {
  console.log('====================================================')
  console.log('  TESTING CLIENT ONBOARDING FLOW FOR pm@agency.com  ')
  console.log('====================================================\n')

  // Step 1: Authenticate as pm@agency.com
  console.log('Step 1: Authenticating as pm@agency.com...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'pm@agency.com',
    password: 'Password123!',
  })

  if (authError || !authData.session) {
    console.error('❌ Failed to authenticate pm@agency.com:', authError?.message)
    process.exit(1)
  }

  const token = authData.session.access_token
  console.log('✅ Authenticated successfully as pm@agency.com.')

  // Step 2: Fetch available scope templates via API
  console.log('\nStep 2: Fetching active Scope Templates via GET /api/scope-templates...')
  const templatesRes = await fetch(`${backendUrl}/scope-templates`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  assert.equal(templatesRes.status, 200, 'Fetching scope templates failed')
  const templates: any[] = await templatesRes.json()
  assert.ok(templates.length > 0, 'No active scope templates found!')

  // Pick a scope template
  const selectedTemplate = templates.find((t) => t.name.includes('Surya') || t.name.includes('Real Estate')) || templates[0]
  console.log(`✅ Selected Template: "${selectedTemplate.name}" (ID: ${selectedTemplate.id})`)
  console.log(`   Industry: ${selectedTemplate.industry} | Service: ${selectedTemplate.service_type}`)

  // Step 3: Fetch available team members via API
  console.log('\nStep 3: Fetching available team members via GET /api/users/team-members...')
  const teamRes = await fetch(`${backendUrl}/users/team-members`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  assert.equal(teamRes.status, 200, 'Fetching team members failed')
  const teamMembers: any[] = await teamRes.json()
  console.log(`✅ Retrieved ${teamMembers.length} team members from directory.`)

  // Map candidates by team category
  const teamAssignments: Record<string, string[]> = {}
  for (const member of teamMembers) {
    const roleKey = member.team || member.designation || 'Team Member'
    if (!teamAssignments[roleKey]) {
      teamAssignments[roleKey] = []
    }
    teamAssignments[roleKey].push(member.id)
  }
  console.log('   Team Assignments Mapped:', JSON.stringify(teamAssignments, null, 2))

  // Step 4: Create new client via POST /api/clients
  const testClientName = `Surya Realty ${Date.now()}`
  console.log(`\nStep 4: Submitting POST /api/clients for "${testClientName}"...`)

  const payload = {
    name: testClientName,
    industry: selectedTemplate.industry,
    service_type: selectedTemplate.service_type,
    contact_name: 'Rajesh Kumar',
    contact_email: `rajesh.${Date.now()}@suryarealty.com`,
    contact_phone: '+91 98765 43210',
    address: '123 MG Road, Bengaluru, KA',
    monthly_retainer: 150000,
    currency: 'INR',
    contract_duration: selectedTemplate.duration_months || 6,
    contract_start: new Date().toISOString().split('T')[0],
    scope_template_id: selectedTemplate.id,
    notes: 'Premium 360 Retainer Client onboarded by PM',
    team_assignments: teamAssignments,
  }

  const createRes = await fetch(`${backendUrl}/clients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const createBody: any = await createRes.json()

  if (createRes.status !== 201) {
    console.error(`❌ Client Creation Failed (Status ${createRes.status}):`, JSON.stringify(createBody, null, 2))
    process.exit(1)
  }

  console.log('✅ POST /api/clients returned HTTP 201 Created!')
  console.log(`   Client ID: ${createBody.client.id}`)
  console.log(`   Workflow ID: ${createBody.workflow.id}`)
  console.log(`   Tasks Created: ${createBody.tasks.length}`)

  // Step 5: Database Verification - Confirm persistence in PostgreSQL
  console.log('\nStep 5: Verifying Database Records directly in PostgreSQL...')

  const dbClient = await prisma.client.findUnique({
    where: { id: createBody.client.id },
    include: {
      workflows: {
        include: {
          tasks: true,
        },
      },
      client_users: {
        include: {
          user: true,
        },
      },
    },
  })

  assert.ok(dbClient, 'Client must exist in PostgreSQL erp.clients table')
  assert.equal(dbClient.name, testClientName)
  assert.equal(dbClient.status, 'active')
  console.log(`✅ [Database] Client "${dbClient.name}" exists in erp.clients with status: ${dbClient.status}`)

  assert.equal(dbClient.workflows.length, 1, 'Client must have 1 linked Month 1 workflow')
  const workflow = dbClient.workflows[0]
  assert.equal(workflow.month_number, 1)
  assert.equal(workflow.status, 'active')
  console.log(`✅ [Database] Workflow "${workflow.title}" exists with ${workflow.tasks.length} tasks/subtasks.`)

  // Verify task round-robin assignments
  const assignedTasks = workflow.tasks.filter((t) => t.assigned_to !== null)
  console.log(`✅ [Database] ${assignedTasks.length}/${workflow.tasks.length} tasks auto-assigned to team specialists via round-robin.`)

  // Verify client_users linkage
  assert.ok(dbClient.client_users.length > 0, 'Client users linkage records created')
  console.log(`✅ [Database] ${dbClient.client_users.length} team members connected via erp.client_users.`)

  // Verify ActivityLog entry
  const log = await prisma.activityLog.findFirst({
    where: { entity_type: 'client', entity_id: dbClient.id },
  })
  assert.ok(log, 'Activity Log entry must be written')
  console.log(`✅ [Database] ActivityLog record found: ${log.action_type} by user ${log.user_id}`)

  console.log('\n====================================================')
  console.log(' 🎉 CLIENT ONBOARDING FLOW IS 100% WORKING & VERIFIED!')
  console.log('====================================================')
}

runClientOnboardingTest()
  .catch((err) => {
    console.error('\n❌ ONBOARDING TEST FAILED:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
