import { apiClient } from '../../lib/api/client'

export type DashboardSummary = {
  activeClients: number
  activeWorkflows: number
  averageCompletionPercentage: number
  taskCompletionRate: number
  openBlockers: number
  teamUtilization: number
}

export type ClientHealthRow = {
  clientId: string
  workflowId?: string | null
  client: string
  workflow?: string | null
  monthNumber?: number | null
  progress: number
  status: 'on_track' | 'at_risk' | 'off_track'
  blockers: number
}

export type DashboardDeadline = {
  id: string
  title: string
  status: string
  priority: 'high' | 'medium' | 'low'
  dueDate?: string | null
  completedAt?: string | null
  urgency: 'overdue' | 'upcoming'
  workflow: {
    id: string
    title: string
    monthNumber: number
  }
  client: {
    id: string
    name: string
  }
}

export type DashboardOpenBlocker = {
  id: string
  title: string
  severity: 'high' | 'medium' | 'low'
  status: 'open'
  impact?: string | null
  flagged_at: string
  task: {
    id: string
    title: string
    workflow: { id: string; title: string }
  }
  client: { id: string; name: string }
  flagger?: { id: string; full_name: string; email: string } | null
}

export type DashboardActivity = {
  id: string
  action_type: string
  entity_type: string
  entity_id: string
  before_values?: unknown
  after_values?: unknown
  created_at: string
  user?: { id: string; full_name: string; email: string } | null
}

export type DashboardFilters = {
  project_manager_id?: string
  client_status?: 'active' | 'paused' | 'completed' | 'archived' | ''
  date_from?: string
  date_to?: string
}

export type DashboardActivityPage = {
  items: DashboardActivity[]
  nextCursor: string | null
}

export type DashboardPayload = {
  summary: DashboardSummary
  clientHealth: ClientHealthRow[]
  upcomingDeadlines: DashboardDeadline[]
  openBlockers: DashboardOpenBlocker[]
}

export async function getDashboard(filters?: DashboardFilters) {
  const params = cleanFilters(filters)
  const [summary, clientHealth, upcomingDeadlines, openBlockers] =
    await Promise.all([
    apiClient.get<DashboardSummary>('/dashboard/summary', { params }),
    apiClient.get<ClientHealthRow[]>('/dashboard/client-health', { params }),
    apiClient.get<DashboardDeadline[]>('/dashboard/upcoming-deadlines', { params }),
    apiClient.get<DashboardOpenBlocker[]>('/dashboard/open-blockers', { params }),
  ])

  return {
    summary: summary.data,
    clientHealth: clientHealth.data,
    upcomingDeadlines: upcomingDeadlines.data,
    openBlockers: openBlockers.data,
  }
}

export function getRecentActivity(
  filters?: DashboardFilters & { activity_cursor?: string },
) {
  return apiClient
    .get<DashboardActivityPage | DashboardActivity[]>('/dashboard/recent-activity', {
      params: cleanFilters(filters),
    })
    .then((response) => normalizeActivityPage(response.data))
}

function cleanFilters<T extends Record<string, unknown> | undefined>(filters: T) {
  return Object.fromEntries(
    Object.entries(filters ?? {}).filter(([, value]) => value !== undefined && value !== ''),
  )
}

function normalizeActivityPage(
  payload: DashboardActivityPage | DashboardActivity[],
): DashboardActivityPage {
  if (Array.isArray(payload)) {
    return {
      items: payload.filter(isDashboardActivity),
      nextCursor: null,
    }
  }

  return {
    items: Array.isArray(payload.items)
      ? payload.items.filter(isDashboardActivity)
      : [],
    nextCursor: payload.nextCursor ?? null,
  }
}

function isDashboardActivity(value: unknown): value is DashboardActivity {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'action_type' in value &&
    'entity_type' in value &&
    'created_at' in value
  )
}

export type SearchResult = {
  clients: Array<{ id: string; name: string }>
  workflows: Array<{ id: string; title: string; month_number: number; client: { name: string } }>
  tasks: Array<{ id: string; title: string; status: string; workflow: { id: string; title: string } }>
  blockers: Array<{ id: string; title: string; status: string; task: { workflow_id: string } }>
  users: Array<{ id: string; full_name: string; email: string }>
}

export function searchWorkspace(query: string) {
  return apiClient
    .get<SearchResult>('/dashboard/search', { params: { q: query } })
    .then((response) => response.data)
}

export type ClientDashboardData = {
  client: any
  activeWorkflow?: any
  tasks: any[]
}

export function getClientDashboard() {
  return apiClient
    .get<ClientDashboardData>('/clients/my-dashboard')
    .then((res) => res.data)
}
