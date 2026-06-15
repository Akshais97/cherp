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
import { useAuth } from '../../app/providers/useAuth'
import { normalizeApiError } from '../../lib/api/errors'
import { getUsers, getTeamWorkloadSummary } from '../workflows/api'
import {
  getDashboard,
  getRecentActivity,
  type ClientHealthRow,
  type DashboardActivity,
  type DashboardDeadline,
  type DashboardFilters,
  type DashboardOpenBlocker,
  type DashboardSummary,
} from './api'

type DashboardRoute = 'client-directory' | 'clients' | 'workflows' | 'blockers'
  | 'team-members' | 'calendar' | 'tasks' | 'brands'

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
  const { currentUser } = useAuth()
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
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
    enabled: currentUser?.role === 'super_admin' || currentUser?.role === 'project_manager',
  })
  const { data: workloadData } = useQuery({
    queryKey: ['team-workload-summary'],
    queryFn: getTeamWorkloadSummary,
    enabled: currentUser?.role === 'super_admin' || currentUser?.role === 'project_manager',
  })
  const {
    data: activityData,
    error: activityQueryError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading: isActivityLoading,
  } = useInfiniteQuery({
    queryKey: ['dashboard-activity', filters],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      getRecentActivity({ ...filters, activity_cursor: pageParam ?? undefined }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
  const apiError = error ? normalizeApiError(error) : null
  const activityError = activityQueryError
    ? normalizeApiError(activityQueryError).message
    : null
  const summary = data?.summary
  const clientHealth = data?.clientHealth ?? []
  const upcomingDeadlines = data?.upcomingDeadlines ?? []
  const openBlockers = data?.openBlockers ?? []
  const recentActivity =
    activityData?.pages.flatMap((page) => page.items).filter(Boolean) ?? []
  const projectManagers =
    usersData?.filter((user) =>
      ['super_admin', 'project_manager'].includes(user.role.name),
    ) ?? []

  useEffect(() => {
    const sentinel = activitySentinelRef.current
    if (!sentinel || !hasNextPage) return

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !isFetchingNextPage) {
        fetchNextPage()
      }
    })
    observer.observe(sentinel)

    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  if (currentUser?.role === 'project_manager') {
    return (
      <RoleDashboard
        activity={recentActivity}
        deadlines={upcomingDeadlines}
        isLoading={isLoading}
        onNavigate={onNavigate}
        openBlockers={openBlockers}
        userRole="project_manager"
        summary={summary}
        workloadSummary={workloadData ?? []}
      />
    )
  }

  if (currentUser?.role === 'team_member') {
    return (
      <RoleDashboard
        activity={recentActivity}
        deadlines={upcomingDeadlines}
        isLoading={isLoading}
        onNavigate={onNavigate}
        openBlockers={openBlockers}
        userRole="team_member"
        summary={summary}
      />
    )
  }

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
            <button className="ghost-button" data-testid="button-dashboard-view-all" onClick={() => onNavigate?.(currentUser?.role === 'team_member' ? 'brands' : 'client-directory')} type="button">
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
            {isFetchingNextPage ? (
              <div className="muted-card">Loading more activity...</div>
            ) : null}
            {!isActivityLoading && recentActivity.length === 0 ? <div className="muted-card">No recent activity yet.</div> : null}
          </div>
        </section>
      </div>
    </section>
  )
}

function RoleDashboard({
  activity,
  deadlines,
  isLoading,
  onNavigate,
  openBlockers,
  userRole,
  summary,
  workloadSummary = [],
}: {
  activity: DashboardActivity[]
  deadlines: DashboardDeadline[]
  isLoading: boolean
  onNavigate?: (route: DashboardRoute, ids?: { clientId?: string; workflowId?: string }) => void
  openBlockers: DashboardOpenBlocker[]
  userRole: 'project_manager' | 'team_member'
  summary?: DashboardSummary
  workloadSummary?: any[]
}) {
  const isPm = userRole === 'project_manager'
  const [activeTab, setActiveTab] = useState<'todo' | 'inprogress' | 'inreview' | 'completed'>('todo')
  const [completedFilter, setCompletedFilter] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [currentPage, setCurrentPage] = useState<number>(1)

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, completedFilter])

  const todoTasks = useMemo(() => deadlines.filter((t) => t.status === 'yet_to_start'), [deadlines])
  const inprogressTasks = useMemo(() => deadlines.filter((t) => t.status === 'ongoing' || t.status === 'rework' || t.status === 'blocked'), [deadlines])
  const inreviewTasks = useMemo(() => deadlines.filter((t) => t.status === 'completed' || t.status === 'task_approved_by_manager'), [deadlines])
  const completedTasksAll = useMemo(() => deadlines.filter((t) => t.status === 'task_approved_by_client'), [deadlines])
  const doneTasks = useMemo(() => {
    return deadlines.filter((t) => ['completed', 'task_approved_by_manager', 'task_approved_by_client'].includes(t.status))
  }, [deadlines])

  const completedTasks = useMemo(() => {
    return completedTasksAll.filter((t) => {
      if (!t.completedAt) return false
      const compDate = new Date(t.completedAt)
      const now = new Date()
      if (completedFilter === 'daily') {
        return (
          compDate.getFullYear() === now.getFullYear() &&
          compDate.getMonth() === now.getMonth() &&
          compDate.getDate() === now.getDate()
        )
      } else if (completedFilter === 'weekly') {
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        return compDate >= oneWeekAgo
      } else {
        const oneMonthAgo = new Date()
        oneMonthAgo.setDate(oneMonthAgo.getDate() - 30)
        return compDate >= oneMonthAgo
      }
    })
  }, [completedTasksAll, completedFilter])

  const activeTasks = useMemo(() => {
    if (activeTab === 'todo') return todoTasks
    if (activeTab === 'inprogress') return inprogressTasks
    if (activeTab === 'inreview') return inreviewTasks
    if (activeTab === 'completed') return completedTasks
    return []
  }, [activeTab, todoTasks, inprogressTasks, inreviewTasks, completedTasks])

  const ITEMS_PER_PAGE = 5
  const totalPages = Math.max(1, Math.ceil(activeTasks.length / ITEMS_PER_PAGE))
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return activeTasks.slice(start, start + ITEMS_PER_PAGE)
  }, [activeTasks, currentPage])

  const statusBuckets = getRoleStatusBuckets(deadlines, openBlockers, summary)
  const taskTotal = todoTasks.length + inprogressTasks.length + inreviewTasks.length + completedTasksAll.length

  return (
    <section className="role-dashboard-page" data-testid="dashboard-page">
      <div className="page-heading" data-testid={`${userRole}-dashboard-page`}>
        <div>
          <p>{isPm ? 'Project manager dashboard' : 'Team member dashboard'}</p>
          <h1>Dashboard</h1>
        </div>
        <button className="ghost-button" type="button">Customize</button>
      </div>

      <div className="role-metric-grid" aria-busy={isLoading} data-testid="dashboard-metrics">
        <MetricCard icon={<BriefcaseBusiness size={18} />} label={isPm ? 'Active Campaigns' : 'My Tasks'} value={summary?.activeWorkflows ?? '-'} tone="blue" detail="Current workload" />
        <MetricCard icon={<CalendarClock size={18} />} label="In Progress" value={inprogressTasks.length} tone="teal" detail="Open delivery tasks" />
        <MetricCard icon={<CheckCircle2 size={18} />} label="Completed" value={completedTasksAll.length} tone="green" detail="Completion estimate" />
        <MetricCard icon={<AlertTriangle size={18} />} label={isPm ? 'Overdue Tasks' : 'Pending Review'} value={openBlockers.length} tone="red" detail="Needs action" />
        <MetricCard icon={<Users size={18} />} label={isPm ? 'Team Utilization' : 'Approvals'} value={summary ? `${summary.teamUtilization}%` : '-'} tone="amber" detail={isPm ? 'Assigned workload' : 'Awaiting action'} />
      </div>

      <div className="role-dashboard-main">
        <section className="panel role-task-table">
          <div className="panel-header">
            <h2>{isPm ? 'Tasks Overview' : 'My Tasks'}</h2>
            <button className="ghost-button" onClick={() => onNavigate?.('tasks')} type="button">
              View all tasks
            </button>
          </div>
          <div className="role-tabs">
            <button
              className={activeTab === 'todo' ? 'active' : ''}
              onClick={() => setActiveTab('todo')}
              type="button"
            >
              To Do ({todoTasks.length})
            </button>
            <button
              className={activeTab === 'inprogress' ? 'active' : ''}
              onClick={() => setActiveTab('inprogress')}
              type="button"
            >
              In Progress ({inprogressTasks.length})
            </button>
            <button
              className={activeTab === 'inreview' ? 'active' : ''}
              onClick={() => setActiveTab('inreview')}
              type="button"
            >
              In Review ({inreviewTasks.length})
            </button>
            <button
              className={activeTab === 'completed' ? 'active' : ''}
              onClick={() => setActiveTab('completed')}
              type="button"
            >
              Completed ({completedTasks.length})
            </button>
          </div>

          {activeTab === 'completed' ? (
            <div className="completed-filter-row" style={{ display: 'flex', gap: '8px', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px dashed var(--border)' }}>
              <button
                className={`ghost-button compact ${completedFilter === 'daily' ? 'active-filter' : ''}`}
                style={completedFilter === 'daily' ? { background: 'var(--blue-light)', color: 'var(--blue)', fontWeight: 600 } : {}}
                onClick={() => setCompletedFilter('daily')}
                type="button"
              >
                Daily
              </button>
              <button
                className={`ghost-button compact ${completedFilter === 'weekly' ? 'active-filter' : ''}`}
                style={completedFilter === 'weekly' ? { background: 'var(--blue-light)', color: 'var(--blue)', fontWeight: 600 } : {}}
                onClick={() => setCompletedFilter('weekly')}
                type="button"
              >
                Weekly
              </button>
              <button
                className={`ghost-button compact ${completedFilter === 'monthly' ? 'active-filter' : ''}`}
                style={completedFilter === 'monthly' ? { background: 'var(--blue-light)', color: 'var(--blue)', fontWeight: 600 } : {}}
                onClick={() => setCompletedFilter('monthly')}
                type="button"
              >
                Monthly
              </button>
            </div>
          ) : null}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>{isPm ? 'Campaign / Project' : 'Project / Campaign'}</th>
                  <th>Due Date</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTasks.map((task) => (
                  <tr key={task.id} className="clickable-row" onClick={() => onNavigate?.('workflows', { workflowId: task.workflow.id })}>
                    <td>{task.title}</td>
                    <td>{task.client.name}</td>
                    <td>{formatDate(task.dueDate)}</td>
                    <td>{toTitle(task.priority)}</td>
                    <td><span className={`status-badge ${task.status}`}>{toTitle(task.status)}</span></td>
                  </tr>
                ))}
                {!isLoading && activeTasks.length === 0 ? (
                  <tr><td colSpan={5}>No tasks in this category.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {activeTasks.length > ITEMS_PER_PAGE && (
            <div
              className="pagination-bar"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '12px',
                padding: '8px 4px',
                borderTop: '1px solid var(--border)',
              }}
            >
              <span className="pagination-info" style={{ fontSize: '12px', color: 'var(--secondary)' }}>
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, activeTasks.length)} of {activeTasks.length} tasks
              </span>
              <div className="pagination-buttons" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  className="ghost-button compact"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  type="button"
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    opacity: currentPage === 1 ? 0.5 : 1,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Previous
                </button>
                <span className="pagination-page" style={{ fontSize: '12px', fontWeight: '500', minWidth: '70px', textAlign: 'center' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="ghost-button compact"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  type="button"
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    opacity: currentPage === totalPages ? 0.5 : 1,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="panel role-donut-panel" style={{ alignSelf: 'start' }}>
          <div className="panel-header">
            <h2>Today's Total Tasks: {taskTotal}</h2>
          </div>
          <div className="role-donut-layout">
            <div className="role-donut" style={statusBuckets.style}>
              <strong>{taskTotal}</strong>
              <span>Total Tasks</span>
            </div>
            <div className="role-donut-legend">
              <LegendDot label="Yet / Ongoing" value={statusBuckets.ongoing} tone="blue" />
              <LegendDot label="Blocked" value={statusBuckets.blocked} tone="red" />
              <LegendDot label="In Review" value={statusBuckets.review} tone="orange" />
              <LegendDot label="Completed" value={statusBuckets.completed} tone="green" />
            </div>
          </div>
        </section>
      </div>

      <div className="role-dashboard-secondary">
        <section className="panel">
          <div className="panel-header">
            <h2>{isPm ? 'Team Workload' : 'My Work Snapshot'}</h2>
            <button
              className="ghost-button"
              onClick={() => onNavigate?.(isPm ? 'team-members' : 'tasks')}
              type="button"
            >
              {isPm ? 'View workload' : 'View tasks'}
            </button>
          </div>
          {isPm ? (
            <div className="role-workload-list">
              {workloadSummary.slice(0, 5).map((entry: any) => (
                <div className="role-workload-row" key={entry.id}>
                  <span>{entry.fullName}</span>
                  <div>
                    <span
                      style={{
                        width: `${Math.min(100, entry.workloadPercentage)}%`,
                      }}
                    />
                  </div>
                  <strong>{entry.workloadPercentage}%</strong>
                </div>
              ))}
              {!workloadSummary.length ? (
                <div className="muted-card">No workload activity yet.</div>
              ) : null}
            </div>
          ) : (
            <div className="role-workload-list" style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {doneTasks.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500', color: '#fff' }}>{t.title}</span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{t.client.name}</span>
                  </div>
                  <span className={`status-badge ${t.status}`} style={{ fontSize: '10px' }}>
                    {t.status.replaceAll('_', ' ')}
                  </span>
                </div>
              ))}
              {!doneTasks.length ? (
                <div className="muted-card">No completed tasks yet.</div>
              ) : null}
            </div>
          )}
        </section>

        <section className="panel dashboard-list-panel">
          <div className="panel-header">
            <h2>Upcoming Deadlines</h2>
            <button className="ghost-button" onClick={() => onNavigate?.('calendar')} type="button">View calendar</button>
          </div>
          <div className="dashboard-list">
            {deadlines.slice(0, 5).map((deadline) => (
              <DeadlineItem key={deadline.id} item={deadline} onNavigate={onNavigate} />
            ))}
          </div>
        </section>

        <section className="panel dashboard-list-panel">
          <div className="panel-header">
            <h2>Recent Activity</h2>
            <Activity size={17} />
          </div>
          <div className="dashboard-list">
            {activity.slice(0, 5).map((entry) => (
              <ActivityItem entry={entry} key={entry.id} />
            ))}
          </div>
        </section>
      </div>

      <div className="role-dashboard-bottom">
        <section className="panel role-quick-actions">
          <div className="panel-header compact-header"><h2>Quick Actions</h2></div>
          <button className="ghost-button" onClick={() => onNavigate?.('tasks')} type="button">Create Task</button>
          <button className="ghost-button" onClick={() => onNavigate?.('tasks')} type="button">Request Approval</button>
          <button className="ghost-button" onClick={() => onNavigate?.(isPm ? 'team-members' : 'tasks')} type="button">{isPm ? 'Add Team Member' : 'View My Work'}</button>
        </section>
        <section className="panel role-calendar-strip">
          <div className="panel-header compact-header"><h2>{isPm ? 'Content Calendar' : 'My Calendar'}</h2></div>
          <div>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
              <span key={day} className={index === 1 ? 'active' : ''}>{day}<small>{index + 6}</small></span>
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}

function LegendDot({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'blue' | 'red' | 'orange' | 'green'
}) {
  return (
    <div className={`legend-dot ${tone}`}>
      <span />
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  )
}

function getRoleStatusBuckets(
  deadlines: DashboardDeadline[],
  openBlockers: DashboardOpenBlocker[],
  summary?: DashboardSummary,
) {
  const dueCounts = deadlines.reduce(
    (counts, task) => {
      if (task.status === 'blocked') counts.blocked += 1
      else if (task.status === 'completed') counts.review += 1
      else if (task.status === 'task_approved_by_manager') counts.review += 1
      else if (task.status === 'task_approved_by_client') counts.completed += 1
      else counts.ongoing += 1
      return counts
    },
    { ongoing: 0, blocked: 0, review: 0, completed: 0 },
  )
  const blockedTaskIds = new Set(openBlockers.map((blocker) => blocker.task.id))
  const blocked = Math.max(dueCounts.blocked, blockedTaskIds.size)
  const visibleWork = Math.max(deadlines.length + blockedTaskIds.size, 1)
  const completed = Math.max(
    dueCounts.completed,
    Math.round((visibleWork * Number(summary?.averageCompletionPercentage ?? 0)) / 100),
  )
  const review = dueCounts.review
  const ongoing = Math.max(0, dueCounts.ongoing)
  const total = Math.max(ongoing + blocked + review + completed, deadlines.length, 1)
  const ongoingEnd = Math.round((ongoing / total) * 100)
  const blockedEnd = ongoingEnd + Math.round((blocked / total) * 100)
  const reviewEnd = blockedEnd + Math.round((review / total) * 100)

  return {
    ongoing,
    blocked,
    review,
    completed,
    total,
    style: {
      '--ongoing-end': `${ongoingEnd}%`,
      '--blocked-end': `${blockedEnd}%`,
      '--review-end': `${reviewEnd}%`,
    } as React.CSSProperties,
  }
}

function ClientHealthTableRow({
  row,
  onNavigate,
}: {
  row: ClientHealthRow
  onNavigate?: (route: DashboardRoute, ids?: { clientId?: string; workflowId?: string }) => void
}) {
  const { currentUser } = useAuth()
  const targetRoute = currentUser?.role === 'team_member' ? 'brands' : 'client-directory'

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
