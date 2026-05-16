import { apiClient } from '../../lib/api/client'

export type ScopeTemplate = {
  id: string
  name: string
  industry: string
  service_type: string
  description?: string
  duration_months: number
  default_tasks: {
    month_1?: Array<{
      title: string
      description?: string
      priority?: 'high' | 'medium' | 'low'
      due_offset_days?: number
    }>
  }
  kpi_framework: Record<string, unknown>
}

export type ClientStatus = 'active' | 'paused' | 'completed' | 'archived'

export type ClientRow = {
  id: string
  name: string
  industry: string
  service_type: string
  status: ClientStatus
  contact_name?: string
  contact_email?: string
  contract_start?: string
  contract_end?: string
  payment_terms?: string
  renewal_date?: string
  created_at: string
}

export type ClientDetail = ClientRow & {
  contact_phone?: string
  address?: string
  monthly_retainer?: string | number
  currency: string
  contract_duration?: number
  notes?: string
  retainer_hours?: number
  scope_template?: {
    id: string
    name: string
    industry: string
    service_type: string
    duration_months: number
  }
  workflows: Array<{
    id: string
    title: string
    status: string
    month_number: number
    completion_percentage: string | number
    start_date?: string
    end_date?: string
    _count: { tasks: number }
  }>
}

export type ClientFilters = {
  search?: string
  industry?: string
  service_type?: string
  status?: ClientStatus | ''
}

export type CreateClientPayload = {
  name: string
  industry: string
  service_type: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  address?: string
  monthly_retainer?: number
  currency: string
  contract_duration: number
  contract_start: string
  payment_terms?: string
  renewal_date?: string
  notes?: string
  retainer_hours?: number
  scope_template_id: string
}

export function getClients(filters?: ClientFilters) {
  return apiClient
    .get<ClientRow[]>('/clients', { params: filters })
    .then((response) => response.data)
}

export function createClient(payload: CreateClientPayload) {
  return apiClient.post('/clients', payload).then((response) => response.data)
}

export function getClient(id: string) {
  return apiClient.get<ClientDetail>(`/clients/${id}`).then((response) => response.data)
}

export function updateClient(id: string, payload: Partial<CreateClientPayload>) {
  return apiClient.patch<ClientDetail>(`/clients/${id}`, payload).then((response) => response.data)
}

export function updateClientStatus(id: string, status: ClientStatus) {
  return apiClient
    .patch<ClientDetail>(`/clients/${id}/status`, { status })
    .then((response) => response.data)
}

export function archiveClient(id: string) {
  return apiClient.delete<ClientDetail>(`/clients/${id}`).then((response) => response.data)
}

export function getScopeTemplates() {
  return apiClient
    .get<ScopeTemplate[]>('/scope-templates')
    .then((response) => response.data)
}

export function seedScopeTemplates() {
  return apiClient
    .post<ScopeTemplate[]>('/scope-templates/seed')
    .then((response) => response.data)
}
