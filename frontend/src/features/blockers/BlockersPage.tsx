import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { normalizeApiError } from '../../lib/api/errors'
import {
  getBlocker,
  getBlockers,
  resolveBlocker,
  type BlockerRow,
  type BlockerSeverity,
  type BlockerStatus,
} from './api'
import {
  resolveBlockerSchema,
  type ResolveBlockerInput,
  type ResolveBlockerValues,
} from './blockerSchemas'

const statusLabels: Record<BlockerStatus, string> = {
  open: 'Open',
  resolved: 'Resolved',
}

const severityLabels: Record<BlockerSeverity, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export function BlockersPage() {
  const [selectedBlockerId, setSelectedBlockerId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<BlockerStatus | ''>('open')
  const [severityFilter, setSeverityFilter] = useState<BlockerSeverity | ''>('')
  const blockersQuery = useQuery({
    queryKey: ['blockers', statusFilter, severityFilter],
    queryFn: () =>
      getBlockers({
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
      }),
  })
  const blockers = blockersQuery.data ?? []
  const blockersError = blockersQuery.error
    ? normalizeApiError(blockersQuery.error).message
    : null

  useEffect(() => {
    if (selectedBlockerId || blockers.length === 0) return
    setSelectedBlockerId(blockers[0].id)
  }, [blockers, selectedBlockerId])

  return (
    <section className="blockers-page" data-testid="blockers-page">
      <div className="page-heading">
        <div>
          <p>Operational blockers</p>
          <h1>Blockers</h1>
        </div>
        <span className="pill">Phase 1 Slice 4</span>
      </div>

      {blockersError ? <div className="notice error">{blockersError}</div> : null}

      <div className="blocker-layout">
        <section className="panel blocker-list-panel" data-testid="blocker-list">
          <div className="panel-header">
            <h2>Blocker list</h2>
            <span className="muted">
              {blockersQuery.isLoading ? 'Loading...' : `${blockers.length} blockers`}
            </span>
          </div>

          <div className="client-filters">
            <label className="field">
              <span>Status</span>
              <select
                data-testid="select-blocker-status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as BlockerStatus | '')}
              >
                <option value="">All</option>
                {Object.entries(statusLabels).map(([status, label]) => (
                  <option key={status} value={status}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Severity</span>
              <select
                data-testid="select-blocker-severity-filter"
                value={severityFilter}
                onChange={(event) =>
                  setSeverityFilter(event.target.value as BlockerSeverity | '')
                }
              >
                <option value="">All</option>
                {Object.entries(severityLabels).map(([severity, label]) => (
                  <option key={severity} value={severity}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="blocker-list">
            {blockers.map((blocker) => (
              <BlockerListItem
                blocker={blocker}
                isActive={selectedBlockerId === blocker.id}
                key={blocker.id}
                onSelect={setSelectedBlockerId}
              />
            ))}
            {!blockersQuery.isLoading && blockers.length === 0 ? (
              <div className="muted-card">No blockers found.</div>
            ) : null}
          </div>
        </section>

        <BlockerDetailPanel blockerId={selectedBlockerId} />
      </div>
    </section>
  )
}

function BlockerListItem({
  blocker,
  isActive,
  onSelect,
}: {
  blocker: BlockerRow
  isActive: boolean
  onSelect: (id: string) => void
}) {
  return (
    <button
      className={`blocker-list-item severity-${blocker.severity}${isActive ? ' active' : ''}`}
      data-testid="blocker-row"
      onClick={() => onSelect(blocker.id)}
      type="button"
    >
      <span>
        <strong>{blocker.title}</strong>
        <small>{blocker.client.name} · {blocker.task.title}</small>
      </span>
      <span className={`status-badge ${blocker.status}`}>{statusLabels[blocker.status]}</span>
    </button>
  )
}

function BlockerDetailPanel({ blockerId }: { blockerId: string | null }) {
  const queryClient = useQueryClient()
  const [panelError, setPanelError] = useState<string | null>(null)
  const blockerQuery = useQuery({
    queryKey: ['blocker', blockerId],
    queryFn: () => getBlocker(blockerId ?? ''),
    enabled: Boolean(blockerId),
  })
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResolveBlockerInput, unknown, ResolveBlockerValues>({
    resolver: zodResolver(resolveBlockerSchema),
  })
  const resolveMutation = useMutation({
    mutationFn: (values: ResolveBlockerValues) =>
      resolveBlocker(blockerId ?? '', values),
    onSuccess: () => {
      setPanelError(null)
      reset()
      queryClient.invalidateQueries({ queryKey: ['blockers'] })
      queryClient.invalidateQueries({ queryKey: ['blocker', blockerId] })
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      queryClient.invalidateQueries({ queryKey: ['workflow'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => setPanelError(normalizeApiError(error).message),
  })
  const blockerError = blockerQuery.error
    ? normalizeApiError(blockerQuery.error).message
    : null
  const blocker = blockerQuery.data
  const timeToResolve = useMemo(() => {
    if (!blocker?.resolved_at) return null
    const start = new Date(blocker.flagged_at).getTime()
    const end = new Date(blocker.resolved_at).getTime()
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null
    const hours = Math.max(1, Math.round((end - start) / 3_600_000))
    return `${hours}h`
  }, [blocker])

  if (!blockerId) {
    return (
      <section className="panel muted-card" data-testid="blocker-detail-empty">
        Select a blocker to inspect its task, impact, and resolution status.
      </section>
    )
  }

  if (blockerQuery.isLoading) {
    return (
      <section className="panel muted-card" data-testid="blocker-detail-loading">
        Loading blocker detail...
      </section>
    )
  }

  if (blockerError || !blocker) {
    return (
      <section className="panel muted-card" data-testid="blocker-detail-unavailable">
        {blockerError ?? 'Blocker detail unavailable.'}
      </section>
    )
  }

  return (
    <section
      className={`panel blocker-detail-panel severity-${blocker.severity}`}
      data-testid="blocker-detail-panel"
    >
      <div className="panel-header workflow-title-row">
        <div>
          <h2>{blocker.title}</h2>
          <p>{blocker.client.name} · {blocker.task.workflow.title}</p>
        </div>
        <span className={`status-badge ${blocker.status}`}>
          {statusLabels[blocker.status]}
        </span>
      </div>

      {panelError ? <div className="notice error">{panelError}</div> : null}

      <div className="blocker-detail-grid">
        <InfoTile icon={<AlertTriangle size={15} />} label="Severity" value={severityLabels[blocker.severity]} />
        <InfoTile icon={<Clock3 size={15} />} label="Flagged" value={formatDate(blocker.flagged_at)} />
        <InfoTile icon={<CheckCircle2 size={15} />} label="Resolved In" value={timeToResolve ?? '-'} />
      </div>

      <div className="blocker-copy">
        <h3>Description</h3>
        <p>{blocker.description}</p>
        <h3>Impact</h3>
        <p>{blocker.impact || 'No impact noted.'}</p>
        <h3>Linked task</h3>
        <p>{blocker.task.title} · {blocker.task.status}</p>
      </div>

      <BlockerTimeline blocker={blocker} />

      {blocker.status === 'open' ? (
        <form
          className="blocker-resolution-form"
          data-testid="blocker-resolution-form"
          onSubmit={handleSubmit((values) => resolveMutation.mutate(values))}
        >
          <label className="field">
            <span>Resolution Notes</span>
            <textarea
              data-testid="textarea-resolution-notes"
              {...register('resolution_notes')}
            />
            {errors.resolution_notes ? (
              <small>{errors.resolution_notes.message}</small>
            ) : null}
          </label>
          <button
            className="primary-action compact"
            data-testid="button-resolve-blocker"
            disabled={resolveMutation.isPending}
            type="submit"
          >
            {resolveMutation.isPending ? 'Resolving...' : 'Resolve blocker'}
          </button>
        </form>
      ) : (
        <div className="notice success">
          {blocker.resolution_notes ?? 'This blocker has been resolved.'}
        </div>
      )}
    </section>
  )
}

function BlockerTimeline({ blocker }: { blocker: BlockerRow }) {
  const updatedVisible =
    blocker.updated_at &&
    blocker.updated_at !== blocker.flagged_at &&
    blocker.updated_at !== blocker.resolved_at

  return (
    <section className="blocker-timeline" data-testid="blocker-timeline">
      <div className="panel-header compact-header">
        <h3>Timeline</h3>
        <Clock3 size={15} />
      </div>
      <ol>
        <TimelineItem
          title="Created"
          detail={`${blocker.flagger?.full_name ?? 'System'} flagged this blocker.`}
          timestamp={blocker.flagged_at}
        />
        {updatedVisible ? (
          <TimelineItem
            title="Updated"
            detail="Blocker details were updated."
            timestamp={blocker.updated_at}
          />
        ) : null}
        {blocker.resolved_at ? (
          <TimelineItem
            title="Resolved"
            detail={
              blocker.resolution_notes ||
              `${blocker.resolver?.full_name ?? 'System'} resolved this blocker.`
            }
            timestamp={blocker.resolved_at}
            tone="success"
          />
        ) : (
          <TimelineItem
            title="Open"
            detail="Awaiting resolution notes and owner action."
            timestamp={blocker.updated_at}
          />
        )}
      </ol>
    </section>
  )
}

function TimelineItem({
  title,
  detail,
  timestamp,
  tone,
}: {
  title: string
  detail: string
  timestamp: string
  tone?: 'success'
}) {
  return (
    <li className={tone === 'success' ? 'timeline-item success' : 'timeline-item'}>
      <span className="timeline-marker" />
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
        <small>{formatDateTime(timestamp)}</small>
      </div>
    </li>
  )
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="blocker-info-tile">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
