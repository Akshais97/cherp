/// <reference types="node" />

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'

type ExplainJson = Array<{
  Plan: {
    'Node Type': string
    'Actual Total Time': number
    'Actual Rows': number
    Plans?: Array<{ 'Node Type': string }>
  }
  'Execution Time': number
  'Planning Time': number
}>

type Measurement = {
  name: string
  executionMs: number
  planningMs?: number
  wallMs: number
  rows?: number
  planNode?: string
  childPlanNodes?: string[]
  targetMs: number
  passed: boolean
}

type ApiMeasurement = {
  name: string
  status: number
  runs: number
  minMs: number
  avgMs: number
  p95Ms: number
  maxMs: number
  targetMs: number
  passed: boolean
}

const rootDir = join(__dirname, '..', '..')
const backendDir = join(rootDir, 'backend')
const frontendDir = join(rootDir, 'frontend')
const reportPath = join(rootDir, 'docs', 'current', 'phase1_performance_report.md')

loadDotEnv(join(backendDir, '.env'))
loadDotEnv(join(frontendDir, '.env'))

async function main() {
  const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client')
  const prisma = new PrismaClient()

  try {
    const tenant = await prisma.tenant.findFirst({
      orderBy: { created_at: 'asc' },
      select: { id: true, name: true },
    })

    if (!tenant) {
      throw new Error('No tenant found. Seed erp.tenants before measuring.')
    }

    const dueBefore = new Date()
    dueBefore.setHours(0, 0, 0, 0)
    dueBefore.setDate(dueBefore.getDate() + 7)

    const dbMeasurements = await measureDatabase(prisma, tenant.id, dueBefore)
    const apiMeasurements = await measureApi()
    const report = renderReport({
      tenantName: tenant.name,
      measuredAt: new Date().toISOString(),
      dbMeasurements,
      apiMeasurements,
    })

    writeFileSync(reportPath, report)
    console.log(report)

    const failedDb = dbMeasurements.filter((item) => !item.passed)
    const failedApi = apiMeasurements.filter((item) => !item.passed)
    if (failedDb.length > 0 || failedApi.length > 0) {
      process.exitCode = 1
    }
  } finally {
    await prisma.$disconnect()
  }
}

async function measureDatabase(
  prisma: import('@prisma/client').PrismaClient,
  tenantId: string,
  dueBefore: Date,
) {
  const targetMs = 200
  const queries: Array<{ name: string; sql: string; params: unknown[] }> = [
    {
      name: 'Dashboard active clients count',
      sql: `
        select count(*)
        from clients
        where tenant_id = $1::uuid
          and status = 'active'
      `,
      params: [tenantId],
    },
    {
      name: 'Dashboard active workflow summary',
      sql: `
        select count(*), coalesce(avg(completion_percentage), 0)
        from workflows
        where tenant_id = $1::uuid
          and status = 'active'
      `,
      params: [tenantId],
    },
    {
      name: 'Dashboard open blockers count',
      sql: `
        select count(*)
        from blockers
        where tenant_id = $1::uuid
          and status = 'open'
      `,
      params: [tenantId],
    },
    {
      name: 'Dashboard team utilization source',
      sql: `
        select u.id
        from users u
        join roles r on r.id = u.role_id
        where u.tenant_id = $1::uuid
          and u.is_active = true
          and r.name in ('super_admin', 'project_manager', 'team_member')
          and exists (
            select 1
            from tasks t
            where t.tenant_id = $1::uuid
              and t.assigned_to = u.id
              and t.status in ('pending', 'in_progress', 'blocked')
          )
        limit 100
      `,
      params: [tenantId],
    },
    {
      name: 'Dashboard client health rows',
      sql: `
        select c.id, c.name, latest.workflow_id, latest.completion_percentage,
          (
            select count(*)
            from blockers b
            where b.tenant_id = $1::uuid
              and b.client_id = c.id
              and b.status = 'open'
          ) as open_blockers
        from clients c
        left join lateral (
          select w.id as workflow_id, w.completion_percentage
          from workflows w
          where w.tenant_id = $1::uuid
            and w.client_id = c.id
          order by w.month_number desc, w.created_at desc
          limit 1
        ) latest on true
        where c.tenant_id = $1::uuid
          and c.status <> 'archived'
        order by c.created_at desc
        limit 20
      `,
      params: [tenantId],
    },
    {
      name: 'Dashboard upcoming deadlines',
      sql: `
        select t.id, t.title, t.status, t.priority, t.due_date, w.id as workflow_id, c.id as client_id
        from tasks t
        join workflows w on w.id = t.workflow_id and w.tenant_id = $1::uuid
        join clients c on c.id = w.client_id and c.tenant_id = $1::uuid and c.status <> 'archived'
        where t.tenant_id = $1::uuid
          and t.status <> 'completed'
          and t.due_date <= $2::date
        order by t.due_date asc, t.created_at desc
        limit 20
      `,
      params: [tenantId, dueBefore],
    },
    {
      name: 'Dashboard open blockers rows',
      sql: `
        select b.id, b.title, b.severity, b.flagged_at, t.id as task_id, w.id as workflow_id, c.id as client_id
        from blockers b
        join tasks t on t.id = b.task_id and t.tenant_id = $1::uuid
        join workflows w on w.id = t.workflow_id and w.tenant_id = $1::uuid
        join clients c on c.id = b.client_id and c.tenant_id = $1::uuid
        where b.tenant_id = $1::uuid
          and b.status = 'open'
        order by b.flagged_at desc
        limit 50
      `,
      params: [tenantId],
    },
    {
      name: 'Dashboard recent activity',
      sql: `
        select id, action_type, entity_type, entity_id, created_at
        from activity_logs
        where tenant_id = $1::uuid
        order by created_at desc
        limit 20
      `,
      params: [tenantId],
    },
  ]

  const results: Measurement[] = []
  for (const query of queries) {
    const startedAt = performance.now()
    const explainResult = await prisma.$queryRawUnsafe<unknown>(
      `explain (analyze, buffers, format json) ${query.sql}`,
      ...query.params,
    )
    const explain = normalizeExplainJson(explainResult)
    const wallMs = performance.now() - startedAt
    const plan = explain[0]
    const executionMs = Number(plan['Execution Time'].toFixed(3))

    results.push({
      name: query.name,
      executionMs,
      planningMs: Number(plan['Planning Time'].toFixed(3)),
      wallMs: Number(wallMs.toFixed(3)),
      rows: plan.Plan['Actual Rows'],
      planNode: plan.Plan['Node Type'],
      childPlanNodes: plan.Plan.Plans?.map((child) => child['Node Type']) ?? [],
      targetMs,
      passed: executionMs <= targetMs,
    })
  }

  return results
}

function normalizeExplainJson(result: unknown): ExplainJson {
  if (Array.isArray(result) && result.length > 0) {
    const first = result[0] as Record<string, unknown>
    const queryPlan = first['QUERY PLAN'] ?? first['QUERY PLAN'.toLowerCase()]

    if (Array.isArray(queryPlan)) {
      return queryPlan as ExplainJson
    }

    if ('Plan' in first) {
      return result as ExplainJson
    }
  }

  throw new Error('Unexpected EXPLAIN ANALYZE result shape.')
}

async function measureApi(): Promise<ApiMeasurement[]> {
  const backendUrl = process.env.PERF_BACKEND_URL ?? process.env.BACKEND_URL
  const email = process.env.E2E_EMAIL
  const password = process.env.E2E_PASSWORD
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!backendUrl || !email || !password || !supabaseUrl || !anonKey) {
    return []
  }

  const token = await getSupabaseAccessToken({
    supabaseUrl,
    anonKey,
    email,
    password,
  })
  const endpoints = [
    '/dashboard/summary',
    '/dashboard/client-health',
    '/dashboard/upcoming-deadlines',
    '/dashboard/open-blockers',
    '/dashboard/recent-activity',
  ]
  const targetMs = 2000
  const runs = Number(process.env.PERF_API_RUNS ?? 5)
  const results: ApiMeasurement[] = []

  for (const endpoint of endpoints) {
    const samples: number[] = []
    let status = 0

    for (let index = 0; index < runs; index += 1) {
      const startedAt = performance.now()
      const response = await fetch(`${backendUrl.replace(/\/$/, '')}/api${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      await response.text()
      status = response.status
      samples.push(Number((performance.now() - startedAt).toFixed(3)))
    }

    samples.sort((a, b) => a - b)
    const p95Index = Math.min(samples.length - 1, Math.ceil(samples.length * 0.95) - 1)
    const avgMs = samples.reduce((sum, sample) => sum + sample, 0) / samples.length

    results.push({
      name: `GET ${endpoint}`,
      status,
      runs,
      minMs: samples[0],
      avgMs: Number(avgMs.toFixed(3)),
      p95Ms: samples[p95Index],
      maxMs: samples[samples.length - 1],
      targetMs,
      passed: status >= 200 && status < 300 && samples[p95Index] <= targetMs,
    })
  }

  return results
}

async function getSupabaseAccessToken(input: {
  supabaseUrl: string
  anonKey: string
  email: string
  password: string
}) {
  const response = await fetch(
    `${input.supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        apikey: input.anonKey,
        Authorization: `Bearer ${input.anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: input.email,
        password: input.password,
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Supabase sign-in failed with ${response.status}.`)
  }

  const body = (await response.json()) as { access_token?: string }
  if (!body.access_token) {
    throw new Error('Supabase sign-in did not return an access token.')
  }

  return body.access_token
}

function renderReport(input: {
  tenantName: string
  measuredAt: string
  dbMeasurements: Measurement[]
  apiMeasurements: ApiMeasurement[]
}) {
  const lines = [
    '# Phase 1 Performance Measurement',
    '',
    `Measured at: ${input.measuredAt}`,
    `Tenant: ${input.tenantName}`,
    '',
    '## Database EXPLAIN ANALYZE',
    '',
    '| Query | Execution ms | Planning ms | Wall ms | Rows | Plan | Target | Status |',
    '|---|---:|---:|---:|---:|---|---:|---|',
    ...input.dbMeasurements.map(
      (item) =>
        `| ${item.name} | ${item.executionMs} | ${item.planningMs ?? '-'} | ${item.wallMs} | ${item.rows ?? '-'} | ${[
          item.planNode,
          ...(item.childPlanNodes ?? []),
        ].join(' > ')} | ${item.targetMs} | ${item.passed ? 'PASS' : 'FAIL'} |`,
    ),
    '',
    '## Authenticated API Timings',
    '',
  ]

  if (input.apiMeasurements.length === 0) {
    lines.push('API timings skipped. Provide `PERF_BACKEND_URL`, `E2E_EMAIL`, and `E2E_PASSWORD` to measure authenticated endpoints.')
  } else {
    lines.push('| Endpoint | HTTP | Runs | Min ms | Avg ms | P95 ms | Max ms | Target | Status |')
    lines.push('|---|---:|---:|---:|---:|---:|---:|---:|---|')
    lines.push(
      ...input.apiMeasurements.map(
        (item) =>
          `| ${item.name} | ${item.status} | ${item.runs} | ${item.minMs} | ${item.avgMs} | ${item.p95Ms} | ${item.maxMs} | ${item.targetMs} | ${item.passed ? 'PASS' : 'FAIL'} |`,
      ),
    )
  }

  lines.push('')
  lines.push('Notes:')
  lines.push('- Database target here is 200ms query execution time.')
  lines.push('- API target here is 2s authenticated endpoint wall time.')
  lines.push('- API wall time includes local server and network latency.')

  return `${lines.join('\n')}\n`
}

function loadDotEnv(path: string) {
  if (!existsSync(path)) return

  const content = readFileSync(path, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const index = trimmed.indexOf('=')
    if (index < 0) continue

    const key = trimmed.slice(0, index).trim()
    const rawValue = trimmed.slice(index + 1).trim()
    const value = rawValue.replace(/^["']|["']$/g, '')
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

void main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
