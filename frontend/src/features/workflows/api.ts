import { apiClient } from '../../lib/api/client'

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'completed'
export type TaskStatus = 'pending' | 'in_progress' | 'blocked' | 'completed'
export type TaskPriority = 'high' | 'medium' | 'low'

export type UserOption = {
  id: string
  email: string
  full_name: string
  role: { name: string; description: string }
}

export type WorkflowRow = {
  id: string
  client_id: string
  project_manager_id?: string
  title: string
  status: WorkflowStatus
  month_number: number
  completion_percentage: string | number
  start_date?: string
  end_date?: string
  client: {
    id: string
    name: string
    industry: string
    service_type: string
    status: string
  }
  project_manager?: {
    id: string
    full_name: string
    email: string
  }
  _count: { tasks: number }
}

export type WorkflowTask = {
  id: string
  workflow_id: string
  assigned_to?: string
  completed_by?: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  sort_order: number
  due_date?: string
  completed_at?: string
  assignee?: { id: string; full_name: string; email: string }
  completer?: { id: string; full_name: string; email: string }
  open_blocker_count: number
}

export type WorkflowDetail = WorkflowRow & {
  open_blocker_count: number
  tasks: WorkflowTask[]
}

export type WorkflowFilters = {
  client_id?: string
  status?: WorkflowStatus | ''
  project_manager_id?: string
}

export type CreateTaskPayload = {
  title: string
  description?: string
  priority?: TaskPriority
  due_date?: string
  assigned_to?: string
}

export type UpdateTaskPayload = Partial<{
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  due_date: string
  assigned_to: string | null
  sort_order: number
}>

export function getWorkflows(filters?: WorkflowFilters) {
  return apiClient
    .get<WorkflowRow[]>('/workflows', { params: filters })
    .then((response) => response.data)
}

export function getWorkflow(id: string) {
  return apiClient
    .get<WorkflowDetail>(`/workflows/${id}`)
    .then((response) => response.data)
}

export function getClientWorkflows(clientId: string) {
  return apiClient
    .get<WorkflowRow[]>(`/clients/${clientId}/workflows`)
    .then((response) => response.data)
}

export function createWorkflowTask(workflowId: string, payload: CreateTaskPayload) {
  return apiClient
    .post<WorkflowTask>(`/workflows/${workflowId}/tasks`, payload)
    .then((response) => response.data)
}

export function updateTask(id: string, payload: UpdateTaskPayload) {
  return apiClient.patch<WorkflowTask>(`/tasks/${id}`, payload).then((response) => response.data)
}

export function completeTask(id: string) {
  return apiClient.patch<WorkflowTask>(`/tasks/${id}/complete`).then((response) => response.data)
}

export function getUsers() {
  return apiClient.get<UserOption[]>('/users').then((response) => response.data)
}
