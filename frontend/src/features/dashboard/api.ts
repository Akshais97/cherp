import { apiClient } from '../../lib/api/client'

export type DashboardSummary = {
  activeClients: number
  activeWorkflows: number
  taskCompletionRate: number
  openBlockers: number
  teamUtilization: number
}

export type ClientHealthRow = {
  client: string
  progress: number
  status: 'on_track' | 'at_risk' | 'off_track'
  blockers: number
}

export type DashboardPayload = {
  summary: DashboardSummary
  clientHealth: ClientHealthRow[]
}

export const dashboardStub: DashboardPayload = {
  summary: {
    activeClients: 8,
    activeWorkflows: 14,
    taskCompletionRate: 87,
    openBlockers: 3,
    teamUtilization: 74,
  },
  clientHealth: [
    { client: 'Bright Homes', progress: 87, status: 'on_track', blockers: 1 },
    {
      client: 'TechFlow Solutions',
      progress: 67,
      status: 'at_risk',
      blockers: 0,
    },
    { client: 'DataStream Inc', progress: 45, status: 'off_track', blockers: 2 },
    { client: 'Nova Finance', progress: 92, status: 'on_track', blockers: 0 },
  ],
}

export async function getDashboard() {
  const [summary, clientHealth] = await Promise.all([
    apiClient.get<DashboardSummary>('/dashboard/summary'),
    apiClient.get<ClientHealthRow[]>('/dashboard/client-health'),
  ])

  return {
    summary: summary.data,
    clientHealth: clientHealth.data,
  }
}
