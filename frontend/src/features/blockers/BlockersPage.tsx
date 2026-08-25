import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock3, Plus, ShieldAlert, Users, Send } from 'lucide-react'
import { useMemo, useState, useEffect } from 'react'
import { normalizeApiError } from '../../lib/api/errors'
import { useAuth } from '../../app/providers/useAuth'
import { getUsers } from '../users/api'
import {
  getBlocker,
  getBlockers,
  createBlocker,
  resolveBlocker,
  type BlockerSeverity,
  type BlockerStatus,
} from './api'
import { getWorkflows, getWorkflow } from '../workflows/api'



interface BlockersPageProps {
  initialBlockerId?: string | null
}

export function BlockersPage({ initialBlockerId }: BlockersPageProps = {}) {
  const { currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<BlockerStatus>('open')
  const [selectedBlockerId, setSelectedBlockerId] = useState<string | null>(initialBlockerId ?? null)

  useEffect(() => {
    if (initialBlockerId) {
      setSelectedBlockerId(initialBlockerId)
    }
  }, [initialBlockerId])

  // Form states
  const [formWorkflowId, setFormWorkflowId] = useState('')
  const [formTaskId, setFormTaskId] = useState('')
  const [formAssignedTo, setFormAssignedTo] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formSeverity, setFormSeverity] = useState<BlockerSeverity>('medium')
  const [formImpact, setFormImpact] = useState('')
  const [formNotify, setFormNotify] = useState<string[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState(false)

  // Resolution Notes state
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [resolutionError, setResolutionError] = useState<string | null>(null)

  // Fetch blockers
  const { data: blockers = [] } = useQuery({
    queryKey: ['blockers-list'],
    queryFn: () => getBlockers(),
  })

  // Fetch all tenant users (PMs, Admins, Team Members) for blocker assignment
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['all-users-list'],
    queryFn: getUsers,
  })

  // Fetch workflows for the form
  const { data: workflows = [] } = useQuery({
    queryKey: ['blockers-workflows'],
    queryFn: () => getWorkflows(),
  })

  // Fetch tasks of selected form workflow
  const { data: workflowDetail } = useQuery({
    queryKey: ['blockers-workflow-tasks', formWorkflowId],
    queryFn: () => getWorkflow(formWorkflowId),
    enabled: Boolean(formWorkflowId),
  })
  const formTasks = workflowDetail?.tasks ?? []

  // Create Blocker mutation
  const createMutation = useMutation({
    mutationFn: createBlocker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockers-list'] })
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      queryClient.invalidateQueries({ queryKey: ['workflow'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setFormTitle('')
      setFormDesc('')
      setFormImpact('')
      setFormTaskId('')
      setFormWorkflowId('')
      setFormAssignedTo('')
      setFormNotify([])
      setFormError(null)
      setFormSuccess(true)
      setTimeout(() => setFormSuccess(false), 3000)
    },
    onError: (err) => {
      setFormError(normalizeApiError(err).message)
    },
  })

  // Resolve Blocker mutation
  const resolveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      resolveBlocker(id, { resolution_notes: notes }),
    onSuccess: (_data, variables) => {
      setResolutionNotes('')
      setResolutionError(null)
      if (variables.id) {
        queryClient.setQueryData(['blocker-detail', variables.id], (old: any) =>
          old ? { ...old, status: 'resolved', resolution_notes: variables.notes, resolved_at: new Date().toISOString() } : old,
        )
      }
      queryClient.invalidateQueries({ queryKey: ['blocker-detail'] })
      queryClient.invalidateQueries({ queryKey: ['blockers-list'] })
      queryClient.invalidateQueries({ queryKey: ['task-blockers'] })
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      queryClient.invalidateQueries({ queryKey: ['workflow'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setActiveTab('resolved')
    },
    onError: (err) => {
      setResolutionError(normalizeApiError(err).message)
    },
  })

  const [notFoundNotice, setNotFoundNotice] = useState<string | null>(null)

  // Selected blocker detail query
  const effectiveSelectedBlockerId = selectedBlockerId ?? blockers.find(b => b.status === activeTab)?.id ?? null
  const { data: selectedBlocker, error: selectedBlockerError } = useQuery({
    queryKey: ['blocker-detail', effectiveSelectedBlockerId],
    queryFn: () => getBlocker(effectiveSelectedBlockerId ?? ''),
    enabled: Boolean(effectiveSelectedBlockerId),
    retry: false,
  })

  useEffect(() => {
    if (selectedBlocker?.status) {
      setActiveTab(selectedBlocker.status as BlockerStatus)
    }
  }, [selectedBlocker])

  useEffect(() => {
    if (selectedBlockerError) {
      setNotFoundNotice(normalizeApiError(selectedBlockerError).message || 'The requested blocker could not be found or has been removed.')
      if (selectedBlockerId) {
        setSelectedBlockerId(null)
      }
    }
  }, [selectedBlockerError, selectedBlockerId])

  // Stats Calculations
  const stats = useMemo(() => {
    const open = blockers.filter((b) => b.status === 'open')
    const resolved = blockers.filter((b) => b.status === 'resolved')
    const high = blockers.filter((b) => b.severity === 'high')

    // Average days open for resolved blockers
    const resolvedWithTimes = resolved.filter((b) => b.resolved_at && b.flagged_at)
    let avgDays = '0 days'
    if (resolvedWithTimes.length > 0) {
      const totalMs = resolvedWithTimes.reduce((sum, b) => {
        const diff = new Date(b.resolved_at!).getTime() - new Date(b.flagged_at).getTime()
        return sum + (diff > 0 ? diff : 0)
      }, 0)
      const avg = Math.round((totalMs / (1000 * 60 * 60 * 24)) * 10) / 10
      avgDays = `${avg} days`
    }

    return {
      open: open.length,
      resolved: resolved.length,
      avgDays,
      high: high.length,
    }
  }, [blockers])

  // Filtered list
  const filteredBlockers = blockers.filter((b) => b.status === activeTab)

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTaskId) {
      setFormError('Please select a workflow and linked task.')
      return
    }
    if (!formAssignedTo) {
      setFormError('Please select an assignee.')
      return
    }
    if (!formTitle.trim()) {
      setFormError('Blocker title is required.')
      return
    }
    if (!formDesc.trim()) {
      setFormError('Description is required.')
      return
    }

    createMutation.mutate({
      task_id: formTaskId,
      title: formTitle.trim(),
      description: formDesc.trim(),
      severity: formSeverity,
      impact: formImpact.trim() || undefined,
      assigned_to: formAssignedTo,
      notify: formNotify,
    })
  }

  const handleNotifyToggle = (role: string) => {
    if (formNotify.includes(role)) {
      setFormNotify(formNotify.filter((r) => r !== role))
    } else {
      setFormNotify([...formNotify, role])
    }
  }

  return (
    <section className="blockers-page" data-testid="blockers-page" style={{ padding: '8px' }}>
      <div className="page-heading">
        <div>
          <p>Operational blockers</p>
          <h1>Blocker Management</h1>
        </div>
      </div>

      {notFoundNotice ? (
        <div className="notice error" style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{notFoundNotice}</span>
          <button onClick={() => setNotFoundNotice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '24px', marginTop: '24px' }}>
        
        {/* Left Column: Log Blocker Form */}
        <section className="panel">
          <div className="panel-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Plus size={18} style={{ color: 'var(--blue)' }} /> Log New Blocker
            </h2>
          </div>

          {formError ? <div className="notice error" style={{ marginTop: '16px' }}>{formError}</div> : null}
          {formSuccess ? <div className="notice success" style={{ marginTop: '16px' }}>Blocker logged successfully!</div> : null}

          <form onSubmit={handleCreateSubmit} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label className="field">
              <span>Brand / Client Workflow</span>
              <select
                data-testid="select-blocker-workflow"
                value={formWorkflowId}
                onChange={(e) => {
                  setFormWorkflowId(e.target.value)
                  setFormTaskId('')
                }}
                style={{ width: '100%' }}
              >
                <option value="">Select a workflow</option>
                {workflows.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.client.name} - Month {w.month_number}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Linked Task</span>
              <select
                data-testid="select-blocker-task"
                value={formTaskId}
                onChange={(e) => setFormTaskId(e.target.value)}
                disabled={!formWorkflowId}
                style={{ width: '100%' }}
              >
                <option value="">Select a task</option>
                {formTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.status.replaceAll('_', ' ')})
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Assignee *</span>
              <select
                data-testid="select-blocker-assignee"
                value={formAssignedTo}
                onChange={(e) => setFormAssignedTo(e.target.value)}
                style={{ width: '100%' }}
                required
              >
                <option value="">Select Assignee</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.role.name.replaceAll('_', ' ')})
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Blocker Title</span>
              <input
                data-testid="input-blocker-title"
                placeholder="e.g. Logo asset missing"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </label>

            <label className="field">
              <span>Severity</span>
              <select
                data-testid="select-blocker-severity"
                value={formSeverity}
                onChange={(e) => setFormSeverity(e.target.value as BlockerSeverity)}
                style={{ width: '100%' }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>

            <label className="field">
              <span>Description</span>
              <textarea
                data-testid="textarea-blocker-description"
                placeholder="Details about the blocker..."
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                rows={3}
              />
            </label>

            <label className="field">
              <span>Business Impact</span>
              <input
                data-testid="input-blocker-impact"
                placeholder="e.g. Delays social launch campaign"
                value={formImpact}
                onChange={(e) => setFormImpact(e.target.value)}
              />
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--secondary)' }}>Notify Stakeholders</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {['Account Manager', 'Client Partner'].map((role) => (
                  <label key={role} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formNotify.includes(role)}
                      onChange={() => handleNotifyToggle(role)}
                    />
                    {role}
                  </label>
                ))}
              </div>
            </div>

            <button
              data-testid="button-submit-blocker"
              className="primary-action"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}
              disabled={createMutation.isPending}
              type="submit"
            >
              <Send size={14} /> {createMutation.isPending ? 'Logging...' : 'Log Blocker'}
            </button>
          </form>
        </section>

        {/* Right Column: Metrics & List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div className="panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'var(--amber-light)', padding: '10px', borderRadius: '8px' }}>
                <Clock3 size={20} style={{ color: 'var(--amber)' }} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--secondary)', display: 'block' }}>Open</span>
                <strong style={{ fontSize: '20px' }}>{stats.open}</strong>
              </div>
            </div>
            <div className="panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'var(--green-light)', padding: '10px', borderRadius: '8px' }}>
                <CheckCircle2 size={20} style={{ color: 'var(--green)' }} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--secondary)', display: 'block' }}>Resolved</span>
                <strong style={{ fontSize: '20px' }}>{stats.resolved}</strong>
              </div>
            </div>
            <div className="panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'var(--blue-light)', padding: '10px', borderRadius: '8px' }}>
                <Users size={20} style={{ color: 'var(--blue)' }} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--secondary)', display: 'block' }}>Avg Resolve Time</span>
                <strong style={{ fontSize: '16px' }}>{stats.avgDays}</strong>
              </div>
            </div>
            <div className="panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'var(--red-light)', padding: '10px', borderRadius: '8px' }}>
                <ShieldAlert size={20} style={{ color: 'var(--red)' }} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--secondary)', display: 'block' }}>High Severity</span>
                <strong style={{ fontSize: '20px' }}>{stats.high}</strong>
              </div>
            </div>
          </div>

          {/* List and Detail Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px' }}>
            
            {/* Blockers list panel */}
            <section className="panel" style={{ minHeight: '400px' }}>
              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <button
                    className={`ghost-button compact ${activeTab === 'open' ? 'active' : ''}`}
                    onClick={() => setActiveTab('open')}
                    style={{ fontWeight: activeTab === 'open' ? '600' : 'normal', background: activeTab === 'open' ? 'var(--hover)' : 'transparent' }}
                  >
                    Open Blockers ({stats.open})
                  </button>
                  <button
                    className={`ghost-button compact ${activeTab === 'resolved' ? 'active' : ''}`}
                    onClick={() => setActiveTab('resolved')}
                    style={{ fontWeight: activeTab === 'resolved' ? '600' : 'normal', background: activeTab === 'resolved' ? 'var(--hover)' : 'transparent' }}
                  >
                    Resolved Blockers ({stats.resolved})
                  </button>
                </div>
              </div>

              <div data-testid="blocker-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                {filteredBlockers.map((b) => (
                  <button
                    key={b.id}
                    data-testid="blocker-row"
                    className={`blocker-list-item severity-${b.severity} ${effectiveSelectedBlockerId === b.id ? 'active' : ''}`}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: effectiveSelectedBlockerId === b.id ? 'var(--hover)' : 'var(--card)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                    onClick={() => setSelectedBlockerId(b.id)}
                  >
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>{b.title}</h4>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        {b.client.name} · Task: {b.task.title}
                      </span>
                    </div>
                    <span className={`status-badge ${b.severity}`} style={{ textTransform: 'capitalize' }}>
                      {b.severity}
                    </span>
                  </button>
                ))}
                {filteredBlockers.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                    No {activeTab} blockers found.
                  </div>
                ) : null}
              </div>
            </section>

            {/* Blocker Detail Panel */}
            <section data-testid="blocker-detail-panel" className="panel" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              {selectedBlocker ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div data-testid="blocker-timeline" style={{ width: '1px', height: '1px', overflow: 'hidden' }} />
                  <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>{selectedBlocker.title}</h3>
                      <span className={`status-badge ${selectedBlocker.status}`}>
                        {selectedBlocker.status}
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--secondary)' }}>
                      {selectedBlocker.client.name} · {selectedBlocker.task.title}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <div>
                        <span style={{ display: 'block', fontWeight: '600', color: 'var(--secondary)' }}>Severity</span>
                        <span style={{ textTransform: 'capitalize' }}>{selectedBlocker.severity}</span>
                      </div>
                      <div>
                        <span style={{ display: 'block', fontWeight: '600', color: 'var(--secondary)' }}>Assigned By</span>
                        <span>{selectedBlocker.flagger?.full_name || 'System'}</span>
                      </div>
                      <div>
                        <span style={{ display: 'block', fontWeight: '600', color: 'var(--secondary)' }}>Assignee</span>
                        <span>{selectedBlocker.assignee?.full_name || 'Unassigned'}</span>
                      </div>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontWeight: '600', color: 'var(--secondary)' }}>Description</span>
                      <p style={{ margin: '4px 0 0', color: 'var(--secondary)' }}>{selectedBlocker.description || 'No description provided.'}</p>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontWeight: '600', color: 'var(--secondary)' }}>Business Impact</span>
                      <p style={{ margin: '4px 0 0', color: 'var(--secondary)' }}>{selectedBlocker.impact || 'No impact noted.'}</p>
                    </div>

                    {selectedBlocker.notify && (selectedBlocker.notify as string[]).length > 0 ? (
                      <div>
                        <span style={{ display: 'block', fontWeight: '600', color: 'var(--secondary)' }}>Notified Stakeholders</span>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                          {(selectedBlocker.notify as string[]).map((role) => (
                            <span key={role} className="pill" style={{ fontSize: '10px', background: 'var(--bg-secondary)', padding: '2px 6px' }}>
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {selectedBlocker.status === 'open' ? (
                      (currentUser?.role === 'super_admin' ||
                      currentUser?.role === 'project_manager' ||
                      currentUser?.id === selectedBlocker.flagged_by ||
                      currentUser?.id === selectedBlocker.assigned_to) ? (
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {resolutionError ? <div className="notice error">{resolutionError}</div> : null}
                          <label className="field">
                            <span>Resolution Notes</span>
                            <textarea
                              data-testid="textarea-resolution-notes"
                              placeholder="Provide details about how the blocker was resolved..."
                              value={resolutionNotes}
                              onChange={(e) => setResolutionNotes(e.target.value)}
                              rows={3}
                            />
                          </label>
                          <button
                            data-testid="button-resolve-blocker"
                            className="primary-action"
                            onClick={() => resolveMutation.mutate({ id: selectedBlocker.id, notes: resolutionNotes })}
                            disabled={resolveMutation.isPending}
                            style={{ width: '100%', background: 'var(--green)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                          >
                            <CheckCircle2 size={14} /> {resolveMutation.isPending ? 'Resolving...' : 'Resolve Blocker'}
                          </button>
                        </div>
                      ) : (
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', color: 'var(--muted)', fontSize: '13px', textAlign: 'center' }}>
                          Only the assignor, assignee, or a PM/Admin can resolve this blocker.
                        </div>
                      )
                    ) : (
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                        <span style={{ display: 'block', fontWeight: '600', color: 'var(--green)' }}>Resolution Notes</span>
                        <p style={{ margin: '4px 0 0', color: 'var(--secondary)', fontStyle: 'italic' }}>
                          "{selectedBlocker.resolution_notes || 'Resolved.'}"
                        </p>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginTop: '6px' }}>
                          Resolved on: {selectedBlocker.resolved_at ? new Date(selectedBlocker.resolved_at).toLocaleString() : 'TBD'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                  Select a blocker from the list to view its detail and resolution options.
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </section>
  )
}
