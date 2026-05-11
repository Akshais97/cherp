import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, BriefcaseBusiness, CheckCircle2, Users } from 'lucide-react'
import { normalizeApiError } from '../../lib/api/errors'
import { dashboardStub, getDashboard } from './api'

const statusLabels = {
  on_track: 'On track',
  at_risk: 'At risk',
  off_track: 'Off track',
}

export function DashboardPage() {
  const { data, error, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    placeholderData: dashboardStub,
  })
  const payload = data ?? dashboardStub
  const apiError = error ? normalizeApiError(error) : null

  return (
    <section className="dashboard-page">
      <div className="page-heading">
        <div>
          <p>Internal dashboard</p>
          <h1>Overview</h1>
        </div>
        <span className="pill">Phase 1 Slice 1</span>
      </div>

      {apiError ? (
        <div className="notice">
          Showing Slice 1 metric stubs until dashboard APIs are available.
        </div>
      ) : null}

      <div className="metric-grid" aria-busy={isLoading}>
        <MetricCard
          icon={<Users size={18} />}
          label="Active Clients"
          value={payload.summary.activeClients}
          tone="blue"
          detail="Current tenant"
        />
        <MetricCard
          icon={<BriefcaseBusiness size={18} />}
          label="Active Workflows"
          value={payload.summary.activeWorkflows}
          tone="teal"
          detail="Month 1 work"
        />
        <MetricCard
          icon={<CheckCircle2 size={18} />}
          label="Tasks Completed"
          value={`${payload.summary.taskCompletionRate}%`}
          tone="green"
          detail="Derived progress"
        />
        <MetricCard
          icon={<AlertTriangle size={18} />}
          label="Open Blockers"
          value={payload.summary.openBlockers}
          tone="red"
          detail="Needs attention"
        />
        <MetricCard
          icon={<Users size={18} />}
          label="Team Utilization"
          value={`${payload.summary.teamUtilization}%`}
          tone="amber"
          detail="Operational load"
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Client health</h2>
            <button className="ghost-button" type="button">
              View all
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Blockers</th>
                </tr>
              </thead>
              <tbody>
                {payload.clientHealth.map((row) => (
                  <tr key={row.client}>
                    <td>{row.client}</td>
                    <td>
                      <div className="progress-cell">
                        <span className="progress-track">
                          <span
                            className={`progress-fill ${row.status}`}
                            style={{ width: `${row.progress}%` }}
                          />
                        </span>
                        {row.progress}%
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${row.status}`}>
                        {statusLabels[row.status]}
                      </span>
                    </td>
                    <td>{row.blockers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Operational queue</h2>
            <span className="muted">Today</span>
          </div>
          <div className="queue-list">
            <QueueItem
              title="Month 1 workflows"
              meta="14 active workflows need steady execution."
              status="active"
            />
            <QueueItem
              title="Blocker review"
              meta="3 open blockers should be triaged before EOD."
              status="blocked"
            />
            <QueueItem
              title="Upcoming deadlines"
              meta="5 tasks are due in the next seven days."
              status="pending"
            />
          </div>
        </section>
      </div>
    </section>
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
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  )
}

function QueueItem({
  title,
  meta,
  status,
}: {
  title: string
  meta: string
  status: 'active' | 'blocked' | 'pending'
}) {
  return (
    <article className="queue-item">
      <span className={`queue-dot ${status}`} />
      <div>
        <strong>{title}</strong>
        <p>{meta}</p>
      </div>
    </article>
  )
}
