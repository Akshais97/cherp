import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { useState } from 'react'
import { normalizeApiError } from '../../lib/api/errors'
import {
  getNotifications,
  markNotificationRead,
  type NotificationRow,
} from './api'

export function NotificationsBell() {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { data: notifications = [], error: notificationsQueryError, isLoading: isNotificationsLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications(),
  })
  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
  const unreadCount = notifications.filter((notification) => !notification.is_read).length
  const error = notificationsQueryError
    ? normalizeApiError(notificationsQueryError).message
    : null

  return (
    <div className="notifications-shell">
      <button
        aria-label="Notifications"
        className="icon-button notification-button"
        data-testid="button-notifications"
        onClick={() => setIsOpen((value) => !value)}
        type="button"
      >
        <Bell size={17} />
      </button>
      {unreadCount > 0 ? <span className="notification-badge">{unreadCount}</span> : null}

      {isOpen ? (
        <section className="notifications-popover" data-testid="notifications-popover">
          <div className="panel-header compact-header">
            <h2>Notifications</h2>
            <span className="muted">{unreadCount} unread</span>
          </div>
          {error ? <div className="notice error">{error}</div> : null}
          <div className="notifications-list">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={() => markReadMutation.mutate(notification.id)}
              />
            ))}
            {!isNotificationsLoading && notifications.length === 0 ? (
              <div className="muted-card">No notifications yet.</div>
            ) : null}
            {isNotificationsLoading ? (
              <div className="muted-card">Loading notifications...</div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: NotificationRow
  onMarkRead: () => void
}) {
  return (
    <article className={notification.is_read ? 'notification-row' : 'notification-row unread'}>
      <div>
        <strong>{notification.title}</strong>
        <p>{notification.message}</p>
        <small>{formatDate(notification.created_at)}</small>
      </div>
      {!notification.is_read ? (
        <button className="ghost-button" onClick={onMarkRead} type="button">
          Mark read
        </button>
      ) : null}
    </article>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
