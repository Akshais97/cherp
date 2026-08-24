import { apiClient } from '../../lib/api/client'

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'completed'
export type TaskStatus =
  | 'yet_to_start'
  | 'ongoing'
  | 'blocked'
  | 'completed'
  | 'task_approved_by_manager'
  | 'rework'
  | 'task_approved_by_client'
export type TaskPriority = 'high' | 'medium' | 'low'

export type UserOption = {
  id: string
  email: string
  full_name: string
  role: { name: string; description: string }
  avatar_url?: string
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

export type ChecklistItem = {
  id: string
  text: string
  is_completed: boolean
}

export type WorkflowTask = {
  id: string
  workflow_id?: string | null
  client_id?: string | null
  slot?: string | null
  assigned_to?: string
  completed_by?: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  sort_order: number
  due_date?: string
  is_daily?: boolean
  completed_at?: string
  created_at: string
  updated_at: string
  assignee?: { id: string; full_name: string; email: string; avatar_url?: string }
  completer?: { id: string; full_name: string; email: string; avatar_url?: string }
  open_blocker_count: number
  checklist?: ChecklistItem[]
  parent_task_id?: string | null
  is_subtask?: boolean
  client?: { id: string; name: string } | null
  workflow?: { id: string; title: string; project_manager_id?: string | null; client?: { id: string; name: string } | null } | null
  assigned_by?: string | null
  assignor?: { id: string; full_name: string; email: string; avatar_url?: string } | null
  start_date?: string | null
  labels?: string[]
  recurrence_series_id?: string | null
  recurrence_rule?: string | null
  recurrence_end_date?: string | null
  recurrence_type?: string | null
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
  is_daily?: boolean
  assigned_to?: string
  slot?: string
  client_id?: string
  workflow_id?: string
}

export type UpdateTaskPayload = Partial<{
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  start_date: string | null
  is_daily: boolean | null
  assigned_to: string | null
  sort_order: number
  checklist: ChecklistItem[]
  reason: string
  slot: string | null
  client_id: string | null
  labels: string[]
  recurrence_rule: string | null
  recurrence_end_date: string | null
  recurrence_type: string | null
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

export function deleteTask(id: string) {
  return apiClient.delete<{ id: string; deleted: true }>(`/tasks/${id}`).then((response) => response.data)
}

export function getUsers() {
  return apiClient.get<UserOption[]>('/users').then((response) => response.data)
}

export interface TaskComment {
  id: string
  tenant_id: string
  task_id: string
  author_id: string
  parent_comment_id?: string | null
  content: string
  mentioned_user_ids?: string[]
  created_at: string
  updated_at: string
  author: {
    id: string
    full_name: string
    email?: string
    avatar_url?: string | null
  }
  parent_comment?: {
    id: string
    content: string
    author: { id: string; full_name: string }
  } | null
}

export function getTaskComments(id: string) {
  return apiClient.get<TaskComment[]>(`/tasks/${id}/comments`).then((response) => response.data)
}

export function addTaskComment(
  id: string,
  payload: { content: string; parent_comment_id?: string; mentioned_user_ids?: string[] }
) {
  return apiClient.post<TaskComment>(`/tasks/${id}/comments`, payload).then((response) => response.data)
}

export function getTaskAttachments(id: string) {
  return apiClient.get<any[]>(`/tasks/${id}/attachments`).then((response) => response.data)
}

export function addTaskAttachment(id: string, payload: { file_name: string; file_url: string }) {
  return apiClient.post<any>(`/tasks/${id}/attachments`, payload).then((response) => response.data)
}

export function deleteTaskAttachment(id: string, attachmentId: string) {
  return apiClient.delete<any>(`/tasks/${id}/attachments/${attachmentId}`).then((response) => response.data)
}

export function getTaskLogs(id: string) {
  return apiClient.get<any[]>(`/tasks/${id}/logs`).then((response) => response.data)
}

export function requestTaskApproval(id: string, payload: { reason?: string }) {
  return apiClient.patch<any>(`/tasks/${id}/request-approval`, payload).then((response) => response.data)
}

export function approveTask(id: string, payload: { reason?: string }) {
  return apiClient.patch<any>(`/tasks/${id}/approve`, payload).then((response) => response.data)
}

export function requestTaskChanges(id: string, payload: { reason?: string }) {
  return apiClient.patch<any>(`/tasks/${id}/request-changes`, payload).then((response) => response.data)
}

export function getTeamWorkloadSummary() {
  return apiClient.get<any[]>('/users/workload-summary').then((response) => response.data)
}

export function getTask(id: string) {
  return apiClient.get<WorkflowTask>(`/tasks/${id}`).then((response) => response.data)
}

export function getTasks(params?: any) {
  return apiClient.get<WorkflowTask[]>('/tasks', { params }).then((response) => response.data)
}

export function createTask(payload: any) {
  return apiClient.post<WorkflowTask>('/tasks', payload).then((response) => response.data)
}

