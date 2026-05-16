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

export function getUsers() {
  return apiClient.get<UserRow[]>('/users').then((response) => response.data)
}

export function createUser(payload: CreateUserPayload) {
  return apiClient.post<UserRow>('/users', payload).then((response) => response.data)
}

export function updateUser(id: string, payload: UpdateUserPayload) {
  return apiClient.patch<UserRow>(`/users/${id}`, payload).then((response) => response.data)
}

