import { apiClient } from '../../lib/api/client'

export type AiChatAction =
  | 'menu'
  | 'create_task'
  | 'update_task_status'
  | 'read_task'
  | 'delete_task'
  | 'ask_approval'
  | 'add_blocker'
  | 'chat'

export type AiChatResponse = {
  type: string
  text?: string
  options?: string[]
  task?: any
  blocker?: any
  result?: any
}

export type ChatHistoryItem = {
  role: 'user' | 'model'
  parts: { text: string }[]
}

export function sendAiChatMessage(payload: {
  action: AiChatAction
  message: string
  history?: ChatHistoryItem[]
}) {
  return apiClient.post<AiChatResponse>('/ai-chat', payload).then((response) => response.data)
}
