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

export type NotificationPreference = {
  id: string
  notification_type: string
  in_app_enabled: boolean
  email_enabled: boolean
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

export function markAllNotificationsRead() {
  return apiClient
    .patch('/notifications/read-all')
    .then((response) => response.data)
}

export function getNotificationPreferences() {
  return apiClient
    .get<NotificationPreference[]>('/notifications/preferences')
    .then((response) => response.data)
}

export function updateNotificationPreference(payload: {
  notification_type: string
  in_app_enabled?: boolean
  email_enabled?: boolean
}) {
  return apiClient
    .patch<NotificationPreference>('/notifications/preferences', payload)
    .then((response) => response.data)
}
