import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Mail, ShieldCheck } from 'lucide-react'
import { getNotificationPreferences, updateNotificationPreference, type NotificationPreference } from './api'
import { normalizeApiError } from '../../lib/api/errors'

const EVENT_TYPE_LABELS: Record<string, { title: string; description: string }> = {
  task_assigned: {
    title: 'Task Assignments',
    description: 'Notifies when a task is assigned or reassigned to you.',
  },
  task_status_changed: {
    title: 'Task Status & Rework Updates',
    description: 'Notifies when a task status changes, moves to review, or requires rework.',
  },
  task_overdue: {
    title: 'Deadline & Overdue Reminders',
    description: 'Alerts when assigned tasks are due within 24 hours or past deadline.',
  },
  blocker_flagged: {
    title: 'Blockers Flagged',
    description: 'Alerts when a new operational blocker is flagged on your assigned tasks or clients.',
  },
  blocker_escalated: {
    title: 'Blocker SLA Escalations',
    description: 'High-priority alert when an open blocker exceeds the 3/5/7 day SLA threshold.',
  },
  comment_mention: {
    title: 'Comment @Mentions',
    description: 'Notifies when another team member @mentions you in task discussion comments.',
  },
  daily_digest: {
    title: 'Daily Morning Work Digest',
    description: 'Sends a summary digest of tasks due today, open blockers, and key team metrics.',
  },
  month_planning_alert: {
    title: 'Month Planning Early Warnings',
    description: 'Alerts project managers 14 days before a client workflow month ends.',
  },
}

export function NotificationPreferencesPage() {
  const queryClient = useQueryClient()

  const { data: preferences = [], isLoading, error } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: getNotificationPreferences,
  })

  const updateMutation = useMutation({
    mutationFn: (payload: { notification_type: string; in_app_enabled?: boolean; email_enabled?: boolean }) =>
      updateNotificationPreference(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
    },
  })

  const prefMap = new Map<string, NotificationPreference>()
  for (const pref of preferences) {
    prefMap.set(pref.notification_type, pref)
  }

  const handleToggle = (type: string, channel: 'in_app' | 'email', currentValue: boolean) => {
    const existing = prefMap.get(type)
    const inApp = channel === 'in_app' ? !currentValue : (existing?.in_app_enabled ?? true)
    const email = channel === 'email' ? !currentValue : (existing?.email_enabled ?? false)

    updateMutation.mutate({
      notification_type: type,
      in_app_enabled: inApp,
      email_enabled: email,
    })
  }

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--secondary)' }}>
        <p className="animate-pulse">Loading notification settings...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="panel notice error" style={{ margin: '24px' }}>
        <h3>Error loading preferences</h3>
        <p>{normalizeApiError(error).message}</p>
      </div>
    )
  }

  return (
    <section className="notification-preferences-page" data-testid="notification-preferences-page" style={{ padding: '8px', maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-heading" style={{ marginBottom: '24px' }}>
        <p style={{ color: 'var(--blue)', fontSize: '13px', fontWeight: 600 }}>Preferences & Delivery Channels</p>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '4px 0 8px' }}>Notification Settings</h1>
        <p style={{ color: 'var(--secondary)', fontSize: '14px' }}>
          Configure how and when you receive in-app alerts and transactional email updates.
        </p>
      </div>

      <div className="panel" style={{ padding: '24px', background: 'var(--panel-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px', gap: '16px', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)', fontWeight: 600, fontSize: '13px', color: 'var(--muted)' }}>
          <span>EVENT TYPE & DESCRIPTION</span>
          <span style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Bell size={15} style={{ color: 'var(--blue)' }} /> IN-APP
          </span>
          <span style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Mail size={15} style={{ color: 'var(--purple)' }} /> EMAIL
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {Object.entries(EVENT_TYPE_LABELS).map(([type, meta]) => {
            const pref = prefMap.get(type)
            const inAppEnabled = pref ? pref.in_app_enabled : true
            const emailEnabled = pref ? pref.email_enabled : false

            return (
              <div
                key={type}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 120px 120px',
                  gap: '16px',
                  alignItems: 'center',
                  padding: '18px 0',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: 'var(--fg-main)' }}>
                    {meta.title}
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--secondary)' }}>
                    {meta.description}
                  </p>
                </div>

                {/* In-App Toggle */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleToggle(type, 'in_app', inAppEnabled)}
                    className={`toggle-switch ${inAppEnabled ? 'active' : ''}`}
                    style={{
                      width: '46px',
                      height: '24px',
                      borderRadius: '12px',
                      background: inAppEnabled ? 'var(--blue, #3b82f6)' : 'var(--bg-tertiary, #374151)',
                      border: 'none',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                      padding: '2px',
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        transform: inAppEnabled ? 'translateX(22px)' : 'translateX(0px)',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </button>
                </div>

                {/* Email Toggle */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleToggle(type, 'email', emailEnabled)}
                    className={`toggle-switch ${emailEnabled ? 'active' : ''}`}
                    style={{
                      width: '46px',
                      height: '24px',
                      borderRadius: '12px',
                      background: emailEnabled ? 'var(--purple, #8b5cf6)' : 'var(--bg-tertiary, #374151)',
                      border: 'none',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                      padding: '2px',
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        transform: emailEnabled ? 'translateX(22px)' : 'translateX(0px)',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--secondary)' }}>
          <ShieldCheck size={20} style={{ color: 'var(--green)' }} />
          <span>
            Transactional notification rules are delivered idempotently. Email notifications use Resend infrastructure.
          </span>
        </div>
      </div>
    </section>
  )
}
