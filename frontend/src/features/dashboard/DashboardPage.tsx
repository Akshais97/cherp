import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
  Filter,
  Activity,
  AlertTriangle,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { normalizeApiError } from '../../lib/api/errors'
import { getUsers } from '../workflows/api'
import {
  getDashboard,
  getRecentActivity,
  type ClientHealthRow,
  type DashboardActivity,
  type DashboardDeadline,
  type DashboardFilters,
  type DashboardOpenBlocker,
} from './api'

type DashboardRoute = 'client-directory' | 'clients' | 'workflows' | 'blockers'

const statusLabels = {
  on_track: 'On track',
  at_risk: 'At risk',
  off_track: 'Off track',
}

const severityLabels = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export function DashboardPage({
  onNavigate,
}: {
  onNavigate?: (route: DashboardRoute, ids?: { clientId?: string; workflowId?: string }) => void
}) {
  const [projectManagerId, setProjectManagerId] = useState('')
  const [clientStatus, setClientStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const activitySentinelRef = useRef<HTMLDivElement | null>(null)
  const filters = useMemo<DashboardFilters>(
    () => ({
      project_manager_id: projectManagerId,
      client_status: clientStatus as DashboardFilters['client_status'],
      date_from: dateFrom,
      date_to: dateTo,
    }),
    [clientStatus, dateFrom, dateTo, projectManagerId],
  )
  const { data, error, isLoading } = useQuery({
    queryKey: ['dashboard', filters],
    queryFn: () => getDashboard(filters),
  })
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  })
  const activityQuery = useInfiniteQuery({
    queryKey: ['dashboard-activity', filters],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      getRecentActivity({ ...filters, activity_cursor: pageParam ?? undefined }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
  const apiError = error ? normalizeApiError(error) : null
  const activityError = activityQuery.error
    ? normalizeApiError(activityQuery.error).message
    : null
  const summary = data?.summary
  const clientHealth = data?.clientHealth ?? []
  const upcomingDeadlines = data?.upcomingDeadlines ?? []
  const openBlockers = data?.openBlockers ?? []
  const recentActivity =
    activityQuery.data?.pages.flatMap((page) => page.items).filter(Boolean) ?? []
  const projectManagers =
    usersQuery.data?.filter((user) =>
      ['super_admin', 'project_manager'].includes(user.role.name),
    ) ?? []

  useEffect(() => {
    const sentinel = activitySentinelRef.current
    if (!sentinel || !activityQuery.hasNextPage) return

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !activityQuery.isFetchingNextPage) {
        activityQuery.fetchNextPage()
      }
    })
    observer.observe(sentinel)

    return () => observer.disconnect()
  }, [activityQuery])

  return (
    <section className="dashboard-page" data-testid="dashboard-page">
      <div className="page-heading">
        <div>
          <p>Internal dashboard</p>
          <h1>Overview</h1>
        </div>
        <span className="pill">Phase 1 Slice 5</span>
      </div>

      {apiError ? <div className="notice error">{apiError.message}</div> : null}
      {activityError ? <div className="notice error">{activityError}</div> : null}

      <section className="panel dashboard-filter-panel" data-testid="dashboard-quick-filters">
        <div className="panel-header compact-header">
          <h2>Quick filters</h2>
          <Filter size={16} />
        </div>
        <div className="dashboard-filter-grid">
          <label className="field">
            <span>Project Manager</span>
            <select
              data-testid="select-dashboard-pm-filter"
              value={projectManagerId}
              onChange={(event) => setProjectManagerId(event.target.value)}
            >
              <option value="">All PMs</option>
              {projectManagers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Client Status</span>
            <select
              data-testid="select-dashboard-client-status-filter"
              value={clientStatus}
              onChange={(event) => setClientStatus(event.target.value)}
            >
              <option value="">Visible</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="field">
            <span>From</span>
            <input
              data-testid="input-dashboard-date-from"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </label>
          <label className="field">
            <span>To</span>
            <input
              data-testid="input-dashboard-date-to"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </label>
        </div>
      </section>

      <div className="metric-grid" aria-busy={isLoading} data-testid="dashboard-metrics">
        <MetricCard icon={<Users size={18} />} label="Active Clients" value={summary?.activeClients ?? '-'} tone="blue" detail="Current tenant" />
        <MetricCard icon={<BriefcaseBusiness size={18} />} label="Active Workflows" value={summary?.activeWorkflows ?? '-'} tone="teal" detail="Month 1 work" />
        <MetricCard icon={<CheckCircle2 size={18} />} label="Avg Completion" value={summary ? `${summary.averageCompletionPercentage}%` : '-'} tone="green" detail="Active workflows" />
        <MetricCard icon={<AlertTriangle size={18} />} label="Open Blockers" value={summary?.openBlockers ?? '-'} tone="red" detail="Needs attention" />
        <MetricCard icon={<Users size={18} />} label="Team Utilization" value={summary ? `${summary.teamUtilization}%` : '-'} tone="amber" detail="Assigned workload" />
      </div>

      <div className="dashboard-grid">
        <section className="panel dashboard-health-panel" data-testid="dashboard-client-health-panel">
          <div className="panel-header">
            <h2>Client health</h2>
            <button className="ghost-button" data-testid="button-dashboard-view-all" onClick={() => onNavigate?.('client-directory')} type="button">
              View all
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Workflow</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Blockers</th>
                </tr>
              </thead>
              <tbody>
                {clientHealth.map((row) => (
                  <ClientHealthTableRow key={row.clientId} row={row} onNavigate={onNavigate} />
                ))}
                {!isLoading && clientHealth.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No client health rows yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel dashboard-list-panel" data-testid="dashboard-deadlines-panel">
          <div className="panel-header">
            <h2>Upcoming deadlines</h2>
            <CalendarClock size={17} />
          </div>
          <div className="dashboard-list">
            {upcomingDeadlines.map((deadline) => (
              <DeadlineItem key={deadline.id} item={deadline} onNavigate={onNavigate} />
            ))}
            {!isLoading && upcomingDeadlines.length === 0 ? <div className="muted-card">No upcoming or overdue tasks.</div> : null}
          </div>
        </section>

        <section className="panel dashboard-list-panel" data-testid="dashboard-open-blockers-panel">
          <div className="panel-header">
            <h2>Open blockers</h2>
            <button className="ghost-button" onClick={() => onNavigate?.('blockers')} type="button">
              Review
            </button>
          </div>
          <div className="dashboard-list">
            {openBlockers.map((blocker) => (
              <OpenBlockerItem key={blocker.id} blocker={blocker} onNavigate={onNavigate} />
            ))}
            {!isLoading && openBlockers.length === 0 ? <div className="muted-card">No open blockers.</div> : null}
          </div>
        </section>

        <section className="panel dashboard-list-panel" data-testid="dashboard-activity-panel">
          <div className="panel-header">
            <h2>Recent activity</h2>
            <Activity size={17} />
          </div>
          <div className="dashboard-list">
            {recentActivity.map((entry) => (
              <ActivityItem entry={entry} key={entry.id} />
            ))}
            <div ref={activitySentinelRef} className="activity-sentinel" />
            {activityQuery.isFetchingNextPage ? (
              <div className="muted-card">Loading more activity...</div>
            ) : null}
            {!activityQuery.isLoading && recentActivity.length === 0 ? <div className="muted-card">No recent activity yet.</div> : null}
          </div>
        </section>
      </div>
    </section>
  )
}

function ClientHealthTableRow({
  row,
  onNavigate,
}: {
  row: ClientHealthRow
  onNavigate?: (route: DashboardRoute, ids?: { clientId?: string; workflowId?: string }) => void
}) {
  const targetRoute = row.workflowId ? 'workflows' : 'client-directory'

  return (
    <tr
      className="clickable-row"
      data-testid="dashboard-client-health-row"
      onClick={() =>
        onNavigate?.(targetRoute, { clientId: row.clientId, workflowId: row.workflowId ?? undefined })
      }
    >
      <td>{row.client}</td>
      <td>{row.workflow ? `M${row.monthNumber ?? 1} - ${row.workflow}` : '-'}</td>
      <td>
        <div className="progress-cell">
          <span className="progress-track">
            <span className={`progress-fill ${row.status}`} style={{ width: `${row.progress}%` }} />
          </span>
          {row.progress}%
        </div>
      </td>
      <td>
        <span className={`status-badge ${row.status}`}>{statusLabels[row.status]}</span>
      </td>
      <td>{row.blockers}</td>
    </tr>
  )
}

function DeadlineItem({
  item,
  onNavigate,
}: {
  item: DashboardDeadline
  onNavigate?: (route: DashboardRoute, ids?: { workflowId?: string }) => void
}) {
  return (
    <button
      className={`dashboard-list-item urgency-${item.urgency}`}
      data-testid="dashboard-deadline-row"
      onClick={() => onNavigate?.('workflows', { workflowId: item.workflow.id })}
      type="button"
    >
      <span>
        <strong>{item.title}</strong>
        <small>{item.client.name} / M{item.workflow.monthNumber}</small>
      </span>
      <span className="dashboard-item-meta">{formatDate(item.dueDate)}</span>
    </button>
  )
}

function OpenBlockerItem({
  blocker,
  onNavigate,
}: {
  blocker: DashboardOpenBlocker
  onNavigate?: (route: DashboardRoute, ids?: { workflowId?: string }) => void
}) {
  return (
    <button
      className={`dashboard-list-item severity-${blocker.severity}`}
      data-testid="dashboard-open-blocker-row"
      onClick={() => onNavigate?.('workflows', { workflowId: blocker.task.workflow.id })}
      type="button"
    >
      <span>
        <strong>{blocker.title}</strong>
        <small>{blocker.client.name} / {blocker.task.title}</small>
      </span>
      <span className={`severity-badge severity-${blocker.severity}`}>{severityLabels[blocker.severity]}</span>
    </button>
  )
}

function ActivityItem({ entry }: { entry: DashboardActivity }) {
  return (
    <article className="dashboard-list-item activity-row" data-testid="dashboard-activity-row">
      <span>
        <strong>{activityLabel(entry)}</strong>
        <small>{entry.user?.full_name ?? 'System'} / {formatDate(entry.created_at)}</small>
      </span>
    </article>
  )
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  detail: string
  tone: 'blue' | 'green' | 'red' | 'amber' | 'teal'
}) {
  return (
    <article className="metric-card" data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}>
      <div className={`metric-icon ${tone}`}>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  )
}

function activityLabel(entry: DashboardActivity) {
  return `${toTitle(entry.action_type)} ${entry.entity_type.replaceAll('_', ' ')}`
}

function toTitle(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(
    new Date(value),
  )
}
