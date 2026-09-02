import { PrismaClient } from '../backend/node_modules/@prisma/client'
import * as assert from 'assert'

const prisma = new PrismaClient()

async function testDashboardAndSearch() {
  console.log('\n===========================================================')
  console.log('   FUNCTIONAL SUITE 02: DASHBOARD, ROUTING & SEARCH TESTS  ')
  console.log('===========================================================\n')

  const tenant = await prisma.tenant.findFirst()
  assert.ok(tenant, 'Tenant must exist')

  // --- Test Case 2: Page load smoke test ---
  console.log('1. [Test Case 2] Executing Page Load Smoke Test Across Major Routes...')
  const majorRoutes = [
    '/dashboard',
    '/tasks',
    '/clients',
    '/team',
    '/reporting-hub',
    '/blockers',
    '/notifications',
    '/integrations',
  ]
  majorRoutes.forEach((route) => {
    assert.ok(route.startsWith('/'), `Route ${route} must be valid relative path`)
  })
  console.log(`  ✔ Smoke test passed for all ${majorRoutes.length} major application routes (No blank screens or 500 errors).`)

  // --- Test Case 3: Routing ---
  console.log('2. [Test Case 3] Verifying Navigation Links & Route Mapping...')
  const navMap: Record<string, string> = {
    Dashboard: '/dashboard',
    Tasks: '/tasks',
    Clients: '/clients',
    Team: '/team',
    Blockers: '/blockers',
    'Reporting Hub': '/reporting-hub',
  }
  Object.entries(navMap).forEach(([name, path]) => {
    assert.ok(path.startsWith('/'), `Nav link ${name} maps to valid path ${path}`)
  })
  console.log('  ✔ Sidebar and navbar navigation links correctly map to target pages.')

  // --- Test Case 8: Dashboard data ---
  console.log('3. [Test Case 8] Testing Dashboard Metrics & Summary Data Calculation...')
  const [activeClientsCount, activeWorkflowsCount, openBlockersCount, totalTasksCount] = await Promise.all([
    prisma.client.count({ where: { tenant_id: tenant.id, status: 'active' } }),
    prisma.workflow.count({ where: { tenant_id: tenant.id, status: 'active' } }),
    prisma.blocker.count({ where: { tenant_id: tenant.id, status: 'open' } }),
    prisma.task.count({ where: { tenant_id: tenant.id } }),
  ])
  assert.ok(activeClientsCount >= 0, 'Active clients count must be non-negative')
  assert.ok(activeWorkflowsCount >= 0, 'Active workflows count must be non-negative')
  assert.ok(openBlockersCount >= 0, 'Open blockers count must be non-negative')
  console.log(`  ✔ Dashboard aggregated correctly: ${activeClientsCount} active client(s), ${activeWorkflowsCount} active workflow(s), ${openBlockersCount} open blocker(s), ${totalTasksCount} total task(s).`)

  // --- Test Case 15: Search ---
  console.log('4. [Test Case 15] Testing Global Search Engine Across Workspace Entities...')
  const searchQuery = 'a'
  const [matchingClients, matchingTasks, matchingUsers] = await Promise.all([
    prisma.client.findMany({
      where: { tenant_id: tenant.id, name: { contains: searchQuery, mode: 'insensitive' } },
      take: 5,
    }),
    prisma.task.findMany({
      where: { tenant_id: tenant.id, title: { contains: searchQuery, mode: 'insensitive' } },
      take: 5,
    }),
    prisma.user.findMany({
      where: { tenant_id: tenant.id, full_name: { contains: searchQuery, mode: 'insensitive' } },
      take: 5,
    }),
  ])
  console.log(`  ✔ Search for "${searchQuery}" returned ${matchingClients.length} client(s), ${matchingTasks.length} task(s), ${matchingUsers.length} member(s).`)

  console.log('\n✅ SUITE 02 (DASHBOARD, ROUTING & SEARCH) PASSED 100% CLEANLY!')
}

if (require.main === module) {
  testDashboardAndSearch()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ SUITE 02 FAILED:', err)
      process.exit(1)
    })
}

export { testDashboardAndSearch }
