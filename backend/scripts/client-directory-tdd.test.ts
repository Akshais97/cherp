/// <reference types="node" />

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

let adminToken: string
let pmToken: string
let tmToken: string

async function run() {
  console.log('====================================================')
  console.log('   CLIENT DIRECTORY COMPREHENSIVE TDD SUITE        ')
  console.log('====================================================\n')

  await setupAuthTokens()

  await test1_TenantScopedListingAndFiltering()
  await test2_ClientDetailViewAndWorkflowLinkage()
  await test3_ProfileFieldUpdatesAndActivityLogging()
  await test4_StatusTransitionGovernanceAndWorkflowSync()
  await test5_RbacPermissionsAndSecurityIsolation()

  console.log('\n🎉 ALL CLIENT DIRECTORY TESTS PASSED SUCCESSFULLY!')
}

async function setupAuthTokens() {
  console.log('--- Step 0: Setting up authentication tokens for roles ---')

  const adminAuth = await supabase.auth.signInWithPassword({
    email: 'superadmin@agency.com',
    password: 'Password123!',
  })
  assert.ok(adminAuth.data.session, 'SuperAdmin login failed')
  adminToken = adminAuth.data.session.access_token

  const pmAuth = await supabase.auth.signInWithPassword({
    email: 'pm@agency.com',
    password: 'Password123!',
  })
  assert.ok(pmAuth.data.session, 'ProjectManager login failed')
  pmToken = pmAuth.data.session.access_token

  const tmAuth = await supabase.auth.signInWithPassword({
    email: 'team.designer@agency.com',
    password: 'Password123!',
  })
  assert.ok(tmAuth.data.session, 'TeamMember login failed')
  tmToken = tmAuth.data.session.access_token

  console.log('✅ Auth tokens established for SuperAdmin, PM, and TeamMember.')
}

async function test1_TenantScopedListingAndFiltering() {
  console.log('\n--- Test 1: Directory Listing & Advanced Search Filtering ---')

  // Fetch active scope template for seeding test clients
  const template = await prisma.scopeTemplate.findFirst({ where: { is_active: true } })
  assert.ok(template, 'Active scope template required for test')

  // Create two distinct test clients
  const clientAName = `Alpha RealEstate ${Date.now()}`
  const clientBName = `Beta Tech ${Date.now()}`

  const createA = await fetch(`${backendUrl}/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pmToken}` },
    body: JSON.stringify({
      name: clientAName,
      industry: template.industry,
      service_type: template.service_type,
      currency: 'INR',
      contract_duration: 6,
      contract_start: '2026-08-17',
      scope_template_id: template.id,
    }),
  })
  if (createA.status !== 201) {
    const errorBody = await createA.json()
    console.error('Create A Error Payload:', JSON.stringify(errorBody, null, 2))
  }
  assert.equal(createA.status, 201, 'Client A creation failed')

  const createB = await fetch(`${backendUrl}/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pmToken}` },
    body: JSON.stringify({
      name: clientBName,
      industry: template.industry,
      service_type: template.service_type,
      currency: 'USD',
      contract_duration: 3,
      contract_start: '2026-08-17',
      scope_template_id: template.id,
    }),
  })
  if (createB.status !== 201) {
    const errorBody = await createB.json()
    console.error('Create B Error Payload:', JSON.stringify(errorBody, null, 2))
  }
  assert.equal(createB.status, 201, 'Client B creation failed')

  // Test 1.1: List all directory clients
  const listRes = await fetch(`${backendUrl}/clients`, {
    headers: { Authorization: `Bearer ${pmToken}` },
  })
  assert.equal(listRes.status, 200)
  const allClients: any[] = await listRes.json()
  assert.ok(allClients.length >= 2, 'Directory should return tenant clients')

  // Test 1.2: Search filter by name
  const searchRes = await fetch(`${backendUrl}/clients?search=${encodeURIComponent(clientAName)}`, {
    headers: { Authorization: `Bearer ${pmToken}` },
  })
  assert.equal(searchRes.status, 200)
  const searchResults: any[] = await searchRes.json()
  assert.equal(searchResults.length, 1)
  assert.equal(searchResults[0].name, clientAName)

  // Test 1.3: Industry filter
  const industryRes = await fetch(`${backendUrl}/clients?industry=${encodeURIComponent(template.industry)}`, {
    headers: { Authorization: `Bearer ${pmToken}` },
  })
  assert.equal(industryRes.status, 200)
  const industryClients: any[] = await industryRes.json()
  assert.ok(industryClients.some((c) => c.name === clientBName))
  assert.ok(industryClients.some((c) => c.name === clientAName))

  console.log('✅ Test 1 Passed: Directory listing and multi-field filtering working.')
}

async function test2_ClientDetailViewAndWorkflowLinkage() {
  console.log('\n--- Test 2: Client Detail View & Linked Workflows ---')

  const client = await prisma.client.findFirst({
    where: { name: { startsWith: 'Alpha RealEstate' } },
    orderBy: { created_at: 'desc' },
    include: { workflows: true },
  })
  assert.ok(client, 'Client record needed for detail test')

  const res = await fetch(`${backendUrl}/clients/${client.id}`, {
    headers: { Authorization: `Bearer ${pmToken}` },
  })
  assert.equal(res.status, 200, 'Fetching client detail should return 200 OK')

  const detail: any = await res.json()
  assert.equal(detail.id, client.id)
  assert.equal(detail.name, client.name)
  assert.ok(Array.isArray(detail.workflows), 'Detail must include linked workflows')
  assert.ok(detail.workflows.length > 0, 'Client must have auto-generated Month 1 workflow')
  assert.equal(detail.workflows[0].month_number, 1)

  console.log('✅ Test 2 Passed: Client Detail view returns full profile & linked workflows.')
}

async function test3_ProfileFieldUpdatesAndActivityLogging() {
  console.log('\n--- Test 3: Profile Field Updates & Activity Logging ---')

  const client = await prisma.client.findFirst({
    where: { name: { startsWith: 'Alpha RealEstate' } },
    orderBy: { created_at: 'desc' },
  })
  assert.ok(client, 'Client record needed for update test')

  const updatedNotes = `Updated Notes ${Date.now()}`
  const updatedRetainer = 125000

  const updateRes = await fetch(`${backendUrl}/clients/${client.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pmToken}` },
    body: JSON.stringify({
      notes: updatedNotes,
      monthly_retainer: updatedRetainer,
      contact_name: 'Jane Senior PM',
    }),
  })
  assert.equal(updateRes.status, 200, 'Updating client profile should succeed with 200 OK')

  const updatedClient: any = await updateRes.json()
  assert.equal(updatedClient.notes, updatedNotes)

  // Verify ActivityLog entry was written for client mutation
  const activityLog = await prisma.activityLog.findFirst({
    where: {
      entity_type: 'client',
      entity_id: client.id,
      action_type: 'updated',
    },
    orderBy: { created_at: 'desc' },
  })
  assert.ok(activityLog, 'Activity Log entry must be written for client profile update')

  console.log('✅ Test 3 Passed: Client profile update and append-only activity log verified.')
}

async function test4_StatusTransitionGovernanceAndWorkflowSync() {
  console.log('\n--- Test 4: Status Transition Governance & Workflow Sync ---')

  const client = await prisma.client.findFirst({
    where: { name: { startsWith: 'Alpha RealEstate' } },
    orderBy: { created_at: 'desc' },
  })
  assert.ok(client)

  // 4.1 Update status to 'paused'
  const pauseRes = await fetch(`${backendUrl}/clients/${client.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pmToken}` },
    body: JSON.stringify({ status: 'paused' }),
  })
  assert.equal(pauseRes.status, 200)

  const pausedClient: any = await pauseRes.json()
  assert.equal(pausedClient.status, 'paused')

  // 4.2 Verify linked workflows synced to 'paused'
  const linkedWorkflow = await prisma.workflow.findFirst({ where: { client_id: client.id } })
  assert.ok(linkedWorkflow)
  assert.equal(linkedWorkflow.status, 'paused', 'Pausing a client must sync linked workflow status')

  // 4.3 Resume status to 'active'
  const resumeRes = await fetch(`${backendUrl}/clients/${client.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pmToken}` },
    body: JSON.stringify({ status: 'active' }),
  })
  assert.equal(resumeRes.status, 200)

  console.log('✅ Test 4 Passed: Status transition governance & workflow sync verified.')
}

async function test5_RbacPermissionsAndSecurityIsolation() {
  console.log('\n--- Test 5: RBAC Authorization & Security Boundaries ---')

  const client = await prisma.client.findFirst({
    where: { name: { startsWith: 'Beta Tech' } },
    orderBy: { created_at: 'desc' },
  })
  assert.ok(client)

  const tmUser = await prisma.user.findFirst({ where: { email: 'team.designer@agency.com' } })
  assert.ok(tmUser)

  await prisma.clientUser.create({
    data: {
      tenant_id: client.tenant_id,
      client_id: client.id,
      user_id: tmUser.id,
    },
  })

  // 5.1 TeamMember can read detail of assigned client
  const tmDetailRes = await fetch(`${backendUrl}/clients/${client.id}`, {
    headers: { Authorization: `Bearer ${tmToken}` },
  })
  assert.equal(tmDetailRes.status, 200, 'TeamMember is allowed read-only access to client detail')

  // 5.2 TeamMember CANNOT change client status
  const tmStatusRes = await fetch(`${backendUrl}/clients/${client.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tmToken}` },
    body: JSON.stringify({ status: 'paused' }),
  })
  assert.equal(tmStatusRes.status, 403, 'TeamMember must be forbidden from updating client status')

  // 5.3 TeamMember CANNOT archive/delete client
  const tmDeleteRes = await fetch(`${backendUrl}/clients/${client.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tmToken}` },
  })
  assert.equal(tmDeleteRes.status, 403, 'TeamMember must be forbidden from deleting client')

  // 5.4 PM CANNOT delete client (SuperAdmin only)
  const pmDeleteRes = await fetch(`${backendUrl}/clients/${client.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${pmToken}` },
  })
  assert.equal(pmDeleteRes.status, 403, 'ProjectManager must be forbidden from deleting client')

  // 5.5 SuperAdmin can archive client
  const adminDeleteRes = await fetch(`${backendUrl}/clients/${client.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  assert.equal(adminDeleteRes.status, 200, 'SuperAdmin can archive client')

  console.log('✅ Test 5 Passed: RBAC permissions and security boundaries verified.')
}

run()
  .catch((err) => {
    console.error('\n❌ TDD TEST SUITE FAILED:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
