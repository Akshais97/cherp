import { useQuery } from '@tanstack/react-query'
import { Filter, History, Search, User } from 'lucide-react'
import { useState } from 'react'
import { apiClient } from '../../lib/api/client'
import { normalizeApiError } from '../../lib/api/errors'

export type ActivityLogRow = {
  id: string
  tenant_id: string
  user_id: string | null
  action_type: string
  entity_type: string
  entity_id: string
  before_values: any
  after_values: any
  created_at: string
  user?: {
    id: string
    full_name: string
    email: string
  } | null
}

export function AuditLogPage() {
  const [entityFilter, setEntityFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [selectedLog, setSelectedLog] = useState<ActivityLogRow | null>(null)

  const { data: logsData, isLoading, error } = useQuery({
    queryKey: ['activity-logs', entityFilter, actionFilter],
    queryFn: async () => {
      const res = await apiClient.get<ActivityLogRow[]>('/activity-logs', {
        params: {
          entityType: entityFilter || undefined,
          actionType: actionFilter || undefined,
        },
      })
      return res.data
    },
  })

  const logs = logsData || []
  const errorMessage = error ? normalizeApiError(error).message : null

  return (
    <section className="audit-log-page" style={{ padding: '1.5rem' }}>
      <div className="page-heading" style={{ marginBottom: '1.5rem' }}>
        <div>
          <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>Platform Security & Compliance</p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={24} /> Admin Audit Log Viewer
          </h1>
        </div>
        <span className="pill">System Audit</span>
      </div>

      {errorMessage && (
        <div className="notice error" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#fef2f2', color: '#dc2626', borderRadius: '6px' }}>
          {errorMessage}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} />
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color, #ccc)' }}
          >
            <option value="">All Entity Types</option>
            <option value="task">Task</option>
            <option value="client">Client</option>
            <option value="workflow">Workflow</option>
            <option value="blocker">Blocker</option>
            <option value="user">User</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color, #ccc)' }}
          >
            <option value="">All Actions</option>
            <option value="created">Created</option>
            <option value="updated">Updated</option>
            <option value="deleted">Deleted</option>
            <option value="status_changed">Status Changed</option>
            <option value="completed">Completed</option>
            <option value="assigned">Assigned</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedLog ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
        <div className="panel" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color, #eee)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Timestamp</th>
                <th style={{ padding: '0.75rem 1rem' }}>User</th>
                <th style={{ padding: '0.75rem 1rem' }}>Action</th>
                <th style={{ padding: '0.75rem 1rem' }}>Entity</th>
                <th style={{ padding: '0.75rem 1rem' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center' }}>Loading audit logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center' }}>No audit logs recorded matching filters.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    style={{
                      borderBottom: '1px solid var(--border-color, #eee)',
                      cursor: 'pointer',
                      background: selectedLog?.id === log.id ? 'var(--highlight-bg, rgba(99, 102, 241, 0.08))' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                      {log.user?.full_name || log.user?.email || 'System'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className="pill" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                        {log.action_type}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                      {log.entity_type} ({log.entity_id.slice(0, 8)}...)
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedLog(log)
                        }}
                        style={{ fontSize: '0.8rem', cursor: 'pointer', padding: '0.25rem 0.5rem' }}
                      >
                        Inspect Diff
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {selectedLog && (
          <div className="panel" style={{ padding: '1.5rem', borderLeft: '3px solid #6366f1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Audit Event Detail</h3>
              <button type="button" onClick={() => setSelectedLog(null)} style={{ cursor: 'pointer', border: 'none', background: 'none' }}>
                ✕
              </button>
            </div>
            <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              <strong>Log ID:</strong> {selectedLog.id}
            </p>
            <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              <strong>User:</strong> {selectedLog.user?.full_name} ({selectedLog.user?.email || 'N/A'})
            </p>
            <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
              <strong>Timestamp:</strong> {new Date(selectedLog.created_at).toISOString()}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <h4 style={{ fontSize: '0.85rem', color: '#ef4444', marginBottom: '0.5rem' }}>Before State</h4>
                <pre
                  style={{
                    background: '#fef2f2',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    maxHeight: '250px',
                    overflow: 'auto',
                  }}
                >
                  {selectedLog.before_values ? JSON.stringify(selectedLog.before_values, null, 2) : 'None (Created)'}
                </pre>
              </div>
              <div>
                <h4 style={{ fontSize: '0.85rem', color: '#10b981', marginBottom: '0.5rem' }}>After State</h4>
                <pre
                  style={{
                    background: '#ecfdf5',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    maxHeight: '250px',
                    overflow: 'auto',
                  }}
                >
                  {selectedLog.after_values ? JSON.stringify(selectedLog.after_values, null, 2) : 'None (Deleted)'}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
