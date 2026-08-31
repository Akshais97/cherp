import { apiClient } from '../../lib/api/client'

export type TimeEntryRow = {
  id: string
  tenant_id: string
  task_id: string
  user_id: string
  hours: number | string
  date: string
  description?: string | null
  is_billable: boolean
  created_at: string
  user?: {
    id: string
    full_name: string
    avatar_url?: string | null
  }
  task?: {
    id: string
    title: string
  }
}

export type TimeEntryReportSummary = {
  total_hours: number
  billable_hours: number
  non_billable_hours: number
  entries_count: number
  by_client: Record<string, number>
  by_user: Record<string, number>
  entries: TimeEntryRow[]
}

export function createTimeEntry(
  taskId: string,
  payload: {
    hours: number
    date: string
    description?: string
    is_billable?: boolean
  }
) {
  return apiClient
    .post<TimeEntryRow>(`/tasks/${taskId}/time-entries`, payload)
    .then((res) => res.data)
}

export function getTimeEntriesForTask(taskId: string) {
  return apiClient
    .get<TimeEntryRow[]>(`/tasks/${taskId}/time-entries`)
    .then((res) => res.data)
}

export function deleteTimeEntry(id: string) {
  return apiClient
    .delete<{ message: string }>(`/time-entries/${id}`)
    .then((res) => res.data)
}

export function getTimeEntriesReport(params: {
  startDate?: string
  endDate?: string
  clientId?: string
  userId?: string
}) {
  return apiClient
    .get<TimeEntryReportSummary>('/time-entries/report', { params })
    .then((res) => res.data)
}

export function exportTimeEntriesCSV(params: {
  startDate?: string
  endDate?: string
  clientId?: string
  userId?: string
}) {
  return apiClient
    .get('/time-entries/export.csv', {
      params,
      responseType: 'blob',
    })
    .then((res) => {
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `time-entries-report-${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    })
}
