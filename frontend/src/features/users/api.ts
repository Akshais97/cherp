import { apiClient } from '../../lib/api/client'
import type { UserRole } from '../../types/auth'

export type UserRow = {
  id: string
  email: string
  full_name: string
  avatar_url?: string | null
  is_active: boolean
  auth_user_id: string
  created_at: string
  updated_at: string
  role: { name: UserRole; description: string }
}

export type CreateUserPayload = {
  email: string
  full_name: string
  role: UserRole
  password: string
  avatar_url?: string
}

export type UpdateUserPayload = Partial<{
  full_name: string
  avatar_url: string
  role: UserRole
  is_active: boolean
}>

export type TeamMemberTask = {
  id: string
  workflow_id: string
  assigned_to?: string | null
  completed_by?: string | null
  title: string
  description?: string | null
  status: 'pending' | 'in_progress' | 'blocked' | 'completed'
  priority: 'high' | 'medium' | 'low'
  sort_order: number
  due_date?: string | null
  completed_at?: string | null
  created_at: string
  updated_at: string
  workflow: {
    id: string
    title: string
    month_number: number
    status: string
    completion_percentage: string | number
    client: {
      id: string
      name: string
      industry: string
      service_type: string
      status: string
    }
  }
  _count: { blockers: number }
}

export type TeamMemberBlocker = {
  id: string
  task_id: string
  client_id: string
  flagged_by: string
  resolved_by?: string | null
  title: string
  description?: string | null
  severity: 'high' | 'medium' | 'low'
  status: 'open' | 'resolved'
  impact?: string | null
  resolution_notes?: string | null
  flagged_at: string
  resolved_at?: string | null
  created_at: string
  updated_at: string
  task: {
    id: string
    title: string
    status: string
    priority: string
    due_date?: string | null
    workflow: {
      id: string
      title: string
      month_number: number
      completion_percentage: string | number
    }
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

export type TeamMemberWorkload = {
  member: UserRow
  tasks: TeamMemberTask[]
  blockers: TeamMemberBlocker[]
}

export function getUsers() {
  return apiClient.get<UserRow[]>('/users').then((response) => response.data)
}

export function getTeamMembers() {
  return apiClient.get<UserRow[]>('/users/team-members').then((response) => response.data)
}

export function getTeamMemberWorkload(id: string) {
  return apiClient
    .get<TeamMemberWorkload>(`/users/team-members/${id}/workload`)
    .then((response) => response.data)
}

export function createUser(payload: CreateUserPayload) {
  return apiClient.post<UserRow>('/users', payload).then((response) => response.data)
}

export function updateUser(id: string, payload: UpdateUserPayload) {
  return apiClient.patch<UserRow>(`/users/${id}`, payload).then((response) => response.data)
}

export function deleteUser(id: string) {
  return apiClient.delete<UserRow>(`/users/${id}`).then((response) => response.data)
}
