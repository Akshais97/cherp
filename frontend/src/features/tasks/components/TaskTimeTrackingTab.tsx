import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { createTimeEntry, deleteTimeEntry, getTimeEntriesForTask } from '../../time-entries/api'
import { normalizeApiError } from '../../../lib/api/errors'

interface TaskTimeTrackingTabProps {
  taskId: string
  estimatedHours?: number | null
}

export function TaskTimeTrackingTab({ taskId, estimatedHours }: TaskTimeTrackingTabProps) {
  const queryClient = useQueryClient()
  const [hours, setHours] = useState<string>('')
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState<string>('')
  const [isBillable, setIsBillable] = useState<boolean>(true)

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['task-time-entries', taskId],
    queryFn: () => getTimeEntriesForTask(taskId),
  })

  const createMutation = useMutation({
    mutationFn: (payload: { hours: number; date: string; description?: string; is_billable?: boolean }) =>
      createTimeEntry(taskId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-time-entries', taskId] })
      queryClient.invalidateQueries({ queryKey: ['time-entries-report'] })
      setHours('')
      setDescription('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTimeEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-time-entries', taskId] })
      queryClient.invalidateQueries({ queryKey: ['time-entries-report'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const numHours = parseFloat(hours)
    if (isNaN(numHours) || numHours <= 0) return

    createMutation.mutate({
      hours: numHours,
      date,
      description: description.trim() || undefined,
      is_billable: isBillable,
    })
  }

  const totalLoggedHours = entries.reduce((acc, entry) => acc + Number(entry.hours), 0)
  const est = estimatedHours ? Number(estimatedHours) : 0
  const progressPct = est > 0 ? Math.min(100, Math.round((totalLoggedHours / est) * 100)) : 0

  return (
    <div className="task-time-tracking-tab" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Progress & Summary Bar */}
      <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
            <Clock size={16} style={{ color: 'var(--blue)' }} />
            <span>Time Log Summary</span>
          </div>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
            <strong>{totalLoggedHours.toFixed(1)} hrs</strong> logged {est > 0 ? `/ ${est.toFixed(1)} hrs estimated` : ''}
          </span>
        </div>

        {est > 0 ? (
          <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progressPct}%`,
                height: '100%',
                background: progressPct > 100 ? 'var(--red, #ef4444)' : 'var(--blue, #3b82f6)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        ) : null}
      </div>

      {/* Log Hours Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'var(--panel-bg)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Log Hours Worked</h4>

        {createMutation.isError ? (
          <div className="notice error" style={{ fontSize: '12px', padding: '8px' }}>
            {normalizeApiError(createMutation.error).message}
          </div>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Hours</label>
            <input
              type="number"
              step="0.25"
              min="0.25"
              max="24"
              placeholder="e.g. 2.5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              required
              className="input-field"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="input-field"
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', paddingBottom: '8px' }}>
              <input
                type="checkbox"
                checked={isBillable}
                onChange={(e) => setIsBillable(e.target.checked)}
              />
              Billable Work
            </label>
          </div>
        </div>

        <div>
          <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Work Notes / Description</label>
          <input
            type="text"
            placeholder="Brief description of work completed..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field"
            style={{ width: '100%' }}
          />
        </div>

        <button
          type="submit"
          disabled={createMutation.isPending || !hours}
          className="primary-action"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px' }}
        >
          <Plus size={15} />
          {createMutation.isPending ? 'Logging Time...' : 'Record Time Entry'}
        </button>
      </form>

      {/* Logged Entries List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Logged Entries</h4>

        {isLoading ? <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Loading time entries...</p> : null}

        {entries.length === 0 && !isLoading ? (
          <p style={{ fontSize: '13px', color: 'var(--secondary)', fontStyle: 'italic' }}>No time entries recorded for this task yet.</p>
        ) : null}

        {entries.map((entry) => (
          <div
            key={entry.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px',
              background: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px' }}>{Number(entry.hours).toFixed(1)} hrs</span>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>· {entry.date.slice(0, 10)}</span>
                {entry.is_billable ? (
                  <span className="badge green" style={{ fontSize: '10px', padding: '2px 6px' }}>Billable</span>
                ) : (
                  <span className="badge grey" style={{ fontSize: '10px', padding: '2px 6px' }}>Non-billable</span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--secondary)' }}>
                {entry.description || 'No work description provided.'}
              </p>
              {entry.user?.full_name ? (
                <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginTop: '2px' }}>
                  Logged by {entry.user.full_name}
                </span>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => deleteMutation.mutate(entry.id)}
              disabled={deleteMutation.isPending}
              style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '4px' }}
              title="Delete time entry"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
