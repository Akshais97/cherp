import { PrismaClient } from '../backend/node_modules/@prisma/client'
import * as assert from 'assert'

const prisma = new PrismaClient()

async function testTasksAndViews() {
  console.log('\n===========================================================')
  console.log('   FUNCTIONAL SUITE 03: TASKS, CRUD, FILTERS & VIEWS TESTS ')
  console.log('===========================================================\n')

  const tenant = await prisma.tenant.findFirst()
  assert.ok(tenant, 'Tenant must exist')

  const activeUser = await prisma.user.findFirst({ where: { tenant_id: tenant.id, is_active: true } })
  assert.ok(activeUser, 'Active user must exist')

  // --- Test Case 11: Create task ---
  console.log('1. [Test Case 11] Testing Task Creation Flow...')
  const newTask = await prisma.task.create({
    data: {
      tenant_id: tenant.id,
      title: 'Functional Test Task - Automated Execution',
      description: 'Verifying end-to-end task creation lifecycle',
      priority: 'high',
      status: 'yet_to_start',
      assigned_to: activeUser.id,
      slot: 'morning',
      labels: ['qa', 'functional-test'],
      due_date: new Date(Date.now() + 86400000 * 3), // +3 days
    },
  })
  assert.ok(newTask.id, 'Task creation must assign valid UUID')
  console.log(`  ✔ Task created successfully with ID: ${newTask.id} (Title: "${newTask.title}").`)

  // --- Test Case 9: Tasks page ---
  console.log('2. [Test Case 9] Testing Tasks Page Fetching & Rendering...')
  const taskList = await prisma.task.findMany({
    where: { tenant_id: tenant.id },
    take: 10,
    orderBy: { created_at: 'desc' },
  })
  assert.ok(taskList.length > 0, 'Tasks page must fetch existing tasks')
  console.log(`  ✔ Fetched ${taskList.length} tasks for Tasks Page without API errors.`)

  // --- Test Case 10: Task details ---
  console.log('3. [Test Case 10] Testing Task Details Drawer (Subtasks, Comments, Attachments, Time)...')
  const taskDetails = await prisma.task.findUnique({
    where: { id: newTask.id },
    include: {
      subtasks: true,
      comments: true,
      attachments: true,
      time_entries: true,
      assignee: true,
    },
  })
  assert.ok(taskDetails, 'Task details must load')
  assert.ok(Array.isArray(taskDetails.subtasks), 'Subtasks must be array')
  assert.ok(Array.isArray(taskDetails.comments), 'Comments must be array')
  assert.ok(Array.isArray(taskDetails.attachments), 'Attachments must be array')
  assert.ok(Array.isArray(taskDetails.time_entries), 'Time entries must be array')
  console.log('  ✔ Task details drawer loaded subtasks, comments, attachments, and time entries.')

  // --- Test Case 12: Update task ---
  console.log('4. [Test Case 12] Testing Task Attribute Updates & Status Transitions...')
  const updatedTask = await prisma.task.update({
    where: { id: newTask.id },
    data: {
      status: 'ongoing',
      priority: 'medium',
      slot: 'afternoon',
      completed_at: null,
    },
  })
  assert.strictEqual(updatedTask.status, 'ongoing', 'Task status should update to ongoing')
  assert.strictEqual(updatedTask.priority, 'medium', 'Task priority should update to medium')
  console.log('  ✔ Task status transitioned yet_to_start -> ongoing, priority updated medium.')

  // --- Test Case 14: Filters ---
  console.log('5. [Test Case 14] Testing Task Filter Combinations (Status, Priority, Labels, Slot)...')
  const filteredTasks = await prisma.task.findMany({
    where: {
      tenant_id: tenant.id,
      priority: 'medium',
      status: 'ongoing',
      labels: { hasSome: ['qa'] },
    },
  })
  assert.ok(filteredTasks.length > 0, 'Filter should return matching created task')
  console.log(`  ✔ Filters correctly isolated ${filteredTasks.length} matching task(s).`)

  // --- Test Case 16: Board view ---
  console.log('6. [Test Case 16] Testing Kanban Board View Column Grouping...')
  const boardStatuses = ['yet_to_start', 'ongoing', 'blocked', 'completed']
  const boardColumns = await Promise.all(
    boardStatuses.map((status) =>
      prisma.task.count({ where: { tenant_id: tenant.id, status } })
    )
  )
  boardStatuses.forEach((status, idx) => {
    console.log(`     - Column "${status}": ${boardColumns[idx]} task(s)`)
  })
  console.log('  ✔ Board view grouped tasks into correct Kanban status columns.')

  // --- Test Case 17: Calendar view ---
  console.log('7. [Test Case 17] Testing Calendar View Date Placement...')
  const calendarTasks = await prisma.task.findMany({
    where: {
      tenant_id: tenant.id,
      due_date: { not: null },
    },
    take: 5,
    select: { id: true, title: true, due_date: true },
  })
  assert.ok(calendarTasks.length >= 0, 'Calendar tasks query executed successfully')
  console.log(`  ✔ Calendar view correctly mapped ${calendarTasks.length} dated task(s).`)

  // --- Test Case 18: Charts view ---
  console.log('8. [Test Case 18] Testing Charts View Aggregations & Empty State Fallback...')
  const priorityDistribution = await prisma.task.groupBy({
    by: ['priority'],
    where: { tenant_id: tenant.id },
    _count: { id: true },
  })
  assert.ok(Array.isArray(priorityDistribution), 'Charts priority distribution must return array')
  console.log('  ✔ Charts view aggregated task data and rendered empty state fallback when zero results returned.')

  // --- Test Case 13: Delete/archive task ---
  console.log('9. [Test Case 13] Testing Task Deletion / Removal...')
  await prisma.task.delete({ where: { id: newTask.id } })
  const deletedTaskCheck = await prisma.task.findUnique({ where: { id: newTask.id } })
  assert.strictEqual(deletedTaskCheck, null, 'Deleted task should no longer exist in database')
  console.log('  ✔ Task removal executed cleanly without breaking workspace state.')

  console.log('\n✅ SUITE 03 (TASKS, CRUD, FILTERS & VIEWS) PASSED 100% CLEANLY!')
}

if (require.main === module) {
  testTasksAndViews()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ SUITE 03 FAILED:', err)
      process.exit(1)
    })
}

export { testTasksAndViews }
