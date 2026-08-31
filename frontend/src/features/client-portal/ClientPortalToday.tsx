import { useState, useEffect } from 'react'
import { apiClient } from '../../lib/api/client'
import { Clock, CheckCircle2 } from 'lucide-react'

export function ClientPortalToday() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/tasks')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : []
        setTasks(list.filter((t: any) => t.status === 'ongoing' || t.status === 'completed'))
      })
      .catch(() => setTasks([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div style={{ padding: '24px', color: 'var(--muted)' }}>Loading today's tasks...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'var(--text)' }}>
          Today's Deliverable Work
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--secondary-text)' }}>
          Live view of tasks currently in progress or recently finalized.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {tasks.map((task) => (
          <div
            key={task.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              background: 'var(--card)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {task.status === 'completed' ? (
                <CheckCircle2 size={18} style={{ color: 'var(--green)' }} />
              ) : (
                <Clock size={18} style={{ color: 'var(--accent)' }} />
              )}
              <div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>{task.title}</p>
                <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>
                  Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>

            <span
              style={{
                fontSize: '11px',
                fontWeight: '600',
                padding: '4px 10px',
                borderRadius: '12px',
                textTransform: 'capitalize',
                background: task.status === 'completed' ? 'rgba(45,168,107,0.1)' : 'rgba(59,109,214,0.1)',
                color: task.status === 'completed' ? 'var(--green)' : 'var(--accent)',
              }}
            >
              {task.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
