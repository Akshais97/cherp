/// <reference types="node" />

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { UserRole } from '../src/common/enums/user-role.enum'
import { RequestUser } from '../src/common/types/request-user.type'
import { ClientsService } from '../src/clients/clients.service'

type Call = { name: string; payload: unknown }

const root = join(__dirname, '..', '..')

const projectManager: RequestUser = {
  id: '11111111-1111-4111-8111-111111111111',
  authUserId: '21111111-1111-4111-8111-111111111111',
  tenantId: '31111111-1111-4111-8111-111111111111',
  email: 'pm@example.com',
  fullName: 'Project Manager',
  role: UserRole.ProjectManager,
  isActive: true,
}

const activeTemplate = {
  id: '41111111-1111-4111-8111-111111111111',
  tenant_id: projectManager.tenantId,
  name: 'PPC SaaS Launch',
  industry: 'SaaS',
  service_type: 'PPC',
  description: 'Month 1 launch checklist',
  duration_months: 3,
  default_tasks: {
    month_1: [
      {
        title: 'Kickoff call',
        description: 'Align on goals.',
        priority: 'high',
        due_offset_days: 0,
      },
      {
        title: 'Tracking audit',
        description: 'Verify conversion tracking.',
        priority: 'low',
        due_offset_days: 4,
      },
    ],
  },
  kpi_framework: {},
  is_active: true,
  created_by: projectManager.id,
  created_at: new Date('2026-05-01T00:00:00.000Z'),
  updated_at: new Date('2026-05-01T00:00:00.000Z'),
}

const onboardingDto = {
  name: 'Bright Homes',
  industry: 'SaaS',
  service_type: 'PPC',
  contact_name: 'Asha',
  contact_email: 'asha@example.com',
  currency: 'INR',
  contract_duration: 3,
  contract_start: '2026-05-01',
  payment_terms: 'Net 15',
  renewal_date: '2026-08-01',
  retainer_hours: 20,
  scope_template_id: activeTemplate.id,
}

async function run() {
  await testOnboardingBuildsAtomicWorkflowPayload()
  await testTemplateMismatchStopsBeforeTransaction()
  await testMissingMonthOneTasksStopsBeforeTransaction()
  testRepositoryPersistsTheDocumentedOnboardingTransaction()
  testFrontendHooksAndApiDataFlow()
  testUserStoriesAndWorkflowDocsStayInPhaseOneScope()

  console.log('Phase 1 user-story and workflow verification tests passed.')
}

async function testOnboardingBuildsAtomicWorkflowPayload() {
  const calls: Call[] = []
  const clientsRepository = {
    createWithWorkflow: async (payload: unknown) => {
      calls.push({ name: 'createWithWorkflow', payload })
      return payload
    },
  }
  const templatesRepository = {
    findActiveById: async () => activeTemplate,
  }
  const service = new ClientsService(
    clientsRepository as never,
    templatesRepository as never,
  )

  await service.create(onboardingDto, projectManager)

  assert.equal(calls.length, 1)
  const payload = calls[0].payload as {
    tenantId: string
    userId: string
    templateId: string
    workflowTitle: string
    workflowStartDate: Date
    workflowEndDate: Date
    client: Prisma.ClientCreateInput
    tasks: Array<{
      title: string
      description?: string
      priority: string
      sort_order: number
      due_date: Date
    }>
  }

  assert.equal(payload.tenantId, projectManager.tenantId)
  assert.equal(payload.userId, projectManager.id)
  assert.equal(payload.templateId, activeTemplate.id)
  assert.equal(payload.workflowTitle, 'Bright Homes — Month 1')
  assert.equal(payload.workflowStartDate.toISOString(), '2026-05-01T00:00:00.000Z')
  assert.equal(payload.workflowEndDate.toISOString(), '2026-08-01T00:00:00.000Z')
  assert.equal(payload.client.status, 'active')
  assert.deepEqual(
    payload.tasks.map((task) => ({
      title: task.title,
      priority: task.priority,
      sort_order: task.sort_order,
      due_date: task.due_date.toISOString(),
    })),
    [
      {
        title: 'Kickoff call',
        priority: 'high',
        sort_order: 1,
        due_date: '2026-05-01T00:00:00.000Z',
      },
      {
        title: 'Tracking audit',
        priority: 'low',
        sort_order: 2,
        due_date: '2026-05-05T00:00:00.000Z',
      },
    ],
  )
}

async function testTemplateMismatchStopsBeforeTransaction() {
  const clientsRepository = {
    createWithWorkflow: async () => {
      throw new Error('transaction should not be called')
    },
  }
  const templatesRepository = {
    findActiveById: async () => ({ ...activeTemplate, service_type: 'SEO' }),
  }
  const service = new ClientsService(
    clientsRepository as never,
    templatesRepository as never,
  )

  await assert.rejects(
    () => service.create(onboardingDto, projectManager),
    (error) =>
      error instanceof BadRequestException &&
      error.message === 'Selected template does not match client industry/service type.',
  )
}

async function testMissingMonthOneTasksStopsBeforeTransaction() {
  const clientsRepository = {
    createWithWorkflow: async () => {
      throw new Error('transaction should not be called')
    },
  }
  const templatesRepository = {
    findActiveById: async () => ({ ...activeTemplate, default_tasks: { month_1: [] } }),
  }
  const service = new ClientsService(
    clientsRepository as never,
    templatesRepository as never,
  )

  await assert.rejects(
    () => service.create(onboardingDto, projectManager),
    (error) =>
      error instanceof BadRequestException &&
      error.message === 'Selected template has no Month 1 tasks.',
  )
}

function testRepositoryPersistsTheDocumentedOnboardingTransaction() {
  const source = file('backend/src/clients/clients.repository.ts')

  assert.match(source, /return this\.prisma\.\$transaction\(async \(tx\) => \{/)
  assertInOrder(source, [
    'tx.client.create',
    'tx.workflow.create',
    'tx.task.createManyAndReturn',
    'tx.activityLog.createMany',
  ])
  assert.match(source, /status: 'active'/)
  assert.match(source, /month_number: 1/)
  assert.match(source, /completion_percentage: 0/)
  assert.match(source, /auto_generated: true/)
  assert.match(source, /status: 'pending'/)
  assert.match(source, /is_subtask: false/)
}

function testFrontendHooksAndApiDataFlow() {
  const apiClient = file('frontend/src/lib/api/client.ts')
  const clientApi = file('frontend/src/features/clients/api.ts')
  const workflowApi = file('frontend/src/features/workflows/api.ts')
  const clientsPage = file('frontend/src/features/clients/ClientsPage.tsx')
  const workflowsPage = file('frontend/src/features/workflows/WorkflowsPage.tsx')

  assert.match(apiClient, /axios\.create/)
  assert.match(apiClient, /supabase\.auth\.getSession/)
  assert.match(apiClient, /config\.headers\.Authorization = `Bearer \$\{token\}`/)

  for (const [path, source] of [
    ['frontend/src/features/clients/api.ts', clientApi],
    ['frontend/src/features/workflows/api.ts', workflowApi],
  ] as const) {
    assert.match(source, /apiClient\./, `${path} must use the central Axios client`)
    assert.doesNotMatch(source, /\bfetch\(/, `${path} must not fetch directly`)
    assert.doesNotMatch(source, /axios\./, `${path} must not create raw axios calls`)
  }

  assert.match(clientsPage, /useQuery\(\{\s*queryKey: \['clients', filters\]/)
  assert.match(clientsPage, /mutationFn: createClient/)
  assert.match(clientsPage, /invalidateQueries\(\{ queryKey: \['clients'\] \}\)/)
  assert.match(clientsPage, /enabled: canManage/)
  assert.match(workflowsPage, /useQuery\(\{\s*queryKey: \['workflow', workflowId\]/)
  assert.match(workflowsPage, /enabled: Boolean\(workflowId\)/)
  assert.match(workflowsPage, /mutationFn: \(values: CreateTaskValues\) => createWorkflowTask/)
  assert.match(workflowsPage, /createBlocker\(\{ \.\.\.values, task_id: taskId \}\)/)
  assert.match(workflowsPage, /invalidateQueries\(\{ queryKey: \['workflow', workflowId\] \}\)/)
}

function testUserStoriesAndWorkflowDocsStayInPhaseOneScope() {
  const userStories = file('docs/current/user_stories.md')
  const workflow = file('docs/current/Workflow.md')

  for (const story of ['US-001', 'US-002', 'US-003', 'US-004', 'US-005', 'US-006']) {
    assert.match(userStories, new RegExp(story), `Missing ${story}`)
  }

  assert.match(userStories, /Dynamic permission-level editor is deferred/)
  assert.match(userStories, /Client portal user journey is not active/)
  assert.match(workflow, /Month 1 Workflow/)
  assert.match(workflow, /No partial client, workflow, or task data may remain/)
  assert.match(workflow, /Generated workflow tasks become independent records/)
}

function assertInOrder(source: string, expectedFragments: string[]) {
  let cursor = -1

  for (const fragment of expectedFragments) {
    const next = source.indexOf(fragment, cursor + 1)
    assert.ok(next > cursor, `Expected ${fragment} after previous workflow step`)
    cursor = next
  }
}

function file(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

void run().catch((error) => {
  if (error instanceof NotFoundException) {
    console.error(error.message)
  } else {
    console.error(error)
  }
  process.exitCode = 1
})
