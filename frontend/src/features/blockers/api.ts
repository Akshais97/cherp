import { apiClient } from '../../lib/api/client'
import type { TaskPriority, TaskStatus } from '../workflows/api'

export type BlockerStatus = 'open' | 'resolved'
export type BlockerSeverity = 'high' | 'medium' | 'low'

export type BlockerRow = {
  id: string
  task_id: string
  client_id: string
  flagged_by: string
  resolved_by?: string | null
  title: string
  description?: string | null
  severity: BlockerSeverity
  status: BlockerStatus
  impact?: string | null
  resolution_notes?: string | null
  flagged_at: string
  resolved_at?: string | null
  created_at: string
  updated_at: string
  task: {
    id: string
    title: string
    status: TaskStatus
    priority: TaskPriority
    workflow: {
      id: string
      title: string
      month_number?: number
      completion_percentage?: string | number
    }
    assignee?: { id: string; full_name: string; email: string }
  }
  client: {
    id: string
    name: string
    industry: string
    service_type: string
  }
  flagger: { id: string; full_name: string; email: string }
  resolver?: { id: string; full_name: string; email: string } | null
}

export type BlockerDetail = BlockerRow & {
  task: BlockerRow['task'] & {
    description?: string | null
    due_date?: string | null
    assigned_to?: string | null
  }
}

export type BlockerFilters = {
  status?: BlockerStatus | ''
  severity?: BlockerSeverity | ''
  client_id?: string
  task_id?: string
}

export type CreateBlockerPayload = {
  task_id: string
  title: string
  description: string
  severity: BlockerSeverity
  impact?: string
}

export type ResolveBlockerPayload = {
  resolution_notes: string
}

export function getBlockers(filters?: BlockerFilters) {
  return apiClient
    .get<BlockerRow[]>('/blockers', { params: filters })
    .then((response) => response.data)
}

export function getBlocker(id: string) {
  return apiClient.get<BlockerDetail>(`/blockers/${id}`).then((response) => response.data)
}

export function createBlocker(payload: CreateBlockerPayload) {
  return apiClient.post<BlockerDetail>('/blockers', payload).then((response) => response.data)
}

export function resolveBlocker(id: string, payload: ResolveBlockerPayload) {
  return apiClient
    .patch<BlockerDetail>(`/blockers/${id}/resolve`, payload)
    .then((response) => response.data)
}
