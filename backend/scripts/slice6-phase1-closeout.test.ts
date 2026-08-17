/// <reference types="node" />

import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '../src/common/decorators/roles.decorator'
import { UserRole } from '../src/common/enums/user-role.enum'
import { RolesGuard } from '../src/common/guards/roles.guard'
import { RequestUser } from '../src/common/types/request-user.type'
import { ClientsService } from '../src/clients/clients.service'

const root = join(__dirname, '..', '..')
const backend = join(root, 'backend')

const admin: RequestUser = {
  id: '11111111-1111-4111-8111-111111111111',
  authUserId: '21111111-1111-4111-8111-111111111111',
  tenantId: '31111111-1111-4111-8111-111111111111',
  email: 'admin@example.com',
  fullName: 'Admin User',
  role: UserRole.SuperAdmin,
  isActive: true,
}

const teamMember: RequestUser = {
  ...admin,
  id: '41111111-1111-4111-8111-111111111111',
  role: UserRole.TeamMember,
}

async function run() {
  await testRolesGuardAllowsAndRejects()
  await testClientStatusDelegatesWorkflowSync()
  testArchitectureAndPrismaAudit()
  testSystemControlledDtoAudit()
  testPhaseOneFeatureCoverageDocs()

  console.log('Slice 6 Phase 1 closeout tests passed.')
}

async function testRolesGuardAllowsAndRejects() {
  const reflector = {
    getAllAndOverride: (key: string) =>
      key === ROLES_KEY ? [UserRole.SuperAdmin] : undefined,
  } as unknown as Reflector
  const guard = new RolesGuard(reflector)

  assert.equal(guard.canActivate(contextWithUser(admin)), true)
  assert.throws(
    () => guard.canActivate(contextWithUser(teamMember)),
    (error) =>
      error instanceof ForbiddenException &&
      error.message === 'User role is not allowed for this route.',
  )
}

async function testClientStatusDelegatesWorkflowSync() {
  const calls: Array<{ name: string; payload: unknown }> = []
  const clientsRepository = {
    findSnapshotById: async () => ({
      id: 'client-1',
      name: 'Client',
      industry: 'SaaS',
      service_type: 'Demand Generation',
      contact_name: null,
      contact_email: null,
      contact_phone: null,
      address: null,
      status: 'active',
      monthly_retainer: null,
      currency: 'INR',
      contract_duration: 3,
      contract_start: new Date('2026-05-01T00:00:00.000Z'),
      contract_end: new Date('2026-08-01T00:00:00.000Z'),
      payment_terms: 'Net 15',
      renewal_date: new Date('2026-08-01T00:00:00.000Z'),
      notes: null,
      retainer_hours: null,
    }),
    updateStatusWithWorkflowSync: async (payload: unknown) => {
      calls.push({ name: 'updateStatusWithWorkflowSync', payload })
      return payload
    },
  }
  const service = new ClientsService(clientsRepository as never, {} as never)

  await service.updateStatus(
    'client-1',
    { status: 'paused' },
    admin,
  )

  assert.equal(calls.length, 1)
  assert.equal(calls[0].name, 'updateStatusWithWorkflowSync')
  assert.equal((calls[0].payload as { status: string }).status, 'paused')
}

function testArchitectureAndPrismaAudit() {
  const prismaService = file('backend/src/prisma/prisma.service.ts')
  assert.match(prismaService, /extends PrismaClient/)
  assert.equal(countMatches(allBackendSource(), /new PrismaClient\(/g), 0)

  const controllers = [
    'auth/auth.controller.ts',
    'clients/clients.controller.ts',
    'scope-templates/scope-templates.controller.ts',
    'workflows/workflows.controller.ts',
    'workflows/client-workflows.controller.ts',
    'workflows/workflow-tasks.controller.ts',
    'tasks/tasks.controller.ts',
    'blockers/blockers.controller.ts',
    'dashboard/dashboard.controller.ts',
    'users/users.controller.ts',
  ]

  for (const controller of controllers) {
    const source = file(`backend/src/${controller}`)
    assert.doesNotMatch(source, /PrismaService|\.prisma\./, `${controller} bypasses service/repository boundary`)
  }

  const repositoryFiles = [
    'clients/clients.repository.ts',
    'scope-templates/scope-templates.repository.ts',
    'workflows/workflows.repository.ts',
    'tasks/tasks.repository.ts',
    'blockers/blockers.repository.ts',
    'dashboard/dashboard.repository.ts',
    'users/users.repository.ts',
  ]

  for (const repository of repositoryFiles) {
    const source = file(`backend/src/${repository}`)
    assert.match(source, /tenant_id|tenantId/, `${repository} must be tenant-aware`)
  }

  const clientsRepository = file('backend/src/clients/clients.repository.ts')
  assert.match(clientsRepository, /\$transaction/)
  assert.match(clientsRepository, /tx\.client\.create/)
  assert.match(clientsRepository, /tx\.workflow\.create/)
  assert.match(clientsRepository, /tx\.task\.create/)
  assert.match(clientsRepository, /tx\.workflow\.updateMany/)

  const workflowsRepository = file('backend/src/workflows/workflows.repository.ts')
  assert.match(workflowsRepository, /client: \{ tenant_id: input\.tenantId, status: \{ not: 'archived' \} \}/)

  const apiFilter = file('backend/src/common/filters/api-exception.filter.ts')
  assert.match(apiFilter, /Unexpected server error/)
  assert.match(apiFilter, /Database operation failed/)

  const agents = file('.ai/Agents.md')
  assert.match(agents, /proper error handling/i)
}

function testSystemControlledDtoAudit() {
  const dtoFiles = [
    'backend/src/clients/dto/create-client.dto.ts',
    'backend/src/clients/dto/update-client.dto.ts',
    'backend/src/clients/dto/update-client-status.dto.ts',
    'backend/src/tasks/dto/create-task.dto.ts',
    'backend/src/tasks/dto/update-task.dto.ts',
    'backend/src/blockers/dto/create-blocker.dto.ts',
    'backend/src/blockers/dto/resolve-blocker.dto.ts',
    'backend/src/scope-templates/dto/create-scope-template.dto.ts',
    'backend/src/scope-templates/dto/update-scope-template.dto.ts',
    'backend/src/users/dto/create-user.dto.ts',
    'backend/src/users/dto/update-user.dto.ts',
  ]
  const forbiddenBodyFields = [
    'tenant_id',
    'tenantId',
    'user_id',
    'userId',
    'created_by',
    'createdBy',
    'completed_by',
    'completedBy',
    'resolved_by',
    'resolvedBy',
    'flagged_by',
    'flaggedBy',
  ]

  for (const dtoFile of dtoFiles) {
    const source = file(dtoFile)
    for (const field of forbiddenBodyFields) {
      assert.doesNotMatch(source, new RegExp(`\\b${field}\\b`), `${dtoFile} exposes ${field}`)
    }
  }
}

function testPhaseOneFeatureCoverageDocs() {
  const features = file('docs/current/features.md')
  const progress = file('docs/current/progress.md')
  const setupRunbook = file('docs/current/setup_runbook.md')
  const backendContract = file('docs/current/backend.md')
  const packageJson = file('backend/package.json')

  for (const slice of ['Slice 1', 'Slice 2', 'Slice 3', 'Slice 4', 'Slice 5', 'Slice 6']) {
    assert.match(features, new RegExp(slice), `features.md missing ${slice}`)
  }

  assert.match(progress, /Slice 6/)
  assert.match(setupRunbook, /Supabase SQL Setup/)
  assert.match(setupRunbook, /phase1_ppc_seo_demo_seed\.sql/)
  assert.match(setupRunbook, /slice5_dashboard_indexes\.sql/)
  assert.match(backendContract, /GET    \/api\/dashboard\/recent-activity/)
  assert.match(packageJson, /test:slice6/)
}

function contextWithUser(user: RequestUser) {
  return {
    getHandler: () => function handler() {},
    getClass: () => class TestController {},
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as never
}

function file(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function allBackendSource() {
  return readDirectorySource(join(backend, 'src'))
}

function readDirectorySource(directory: string): string {
  return readdirSync(directory)
    .flatMap((entry) => {
      const fullPath = join(directory, entry)
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        if (entry === 'scripts') return ''
        return readDirectorySource(fullPath)
      }

      if (!entry.endsWith('.ts')) {
        return ''
      }

      return readFileSync(fullPath, 'utf8')
    })
    .join('\n')
}

function countMatches(source: string, pattern: RegExp) {
  return source.match(pattern)?.length ?? 0
}

void run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
