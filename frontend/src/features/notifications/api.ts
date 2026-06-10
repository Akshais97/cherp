import { apiClient } from '../../lib/api/client'

export type NotificationRow = {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  related_entity_type?: string | null
  related_entity_id?: string | null
  created_at: string
  read_at?: string | null
}

export function getNotifications(unread = false) {
  return apiClient
    .get<NotificationRow[]>('/notifications', {
      params: unread ? { unread: 'true' } : undefined,
    })
    .then((response) => response.data)
}

export function markNotificationRead(id: string) {
  return apiClient
    .patch<NotificationRow>(`/notifications/${id}/read`)
    .then((response) => response.data)
}
