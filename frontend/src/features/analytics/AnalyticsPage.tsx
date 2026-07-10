import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, UserCheck, UserMinus } from 'lucide-react'
import { normalizeApiError } from '../../lib/api/errors'
import { getWorkloadSummary } from '../users/api'

export function AnalyticsPage() {
  const { data: summaryList = [], isLoading, error } = useQuery({
    queryKey: ['analytics-workload-summary'],
    queryFn: getWorkloadSummary,
  })

  // Determine most overloaded and most free members
  const sortedByWorkload = [...summaryList].sort((a, b) => b.workloadPercentage - a.workloadPercentage)
  const mostOverloaded = sortedByWorkload.length > 0 && sortedByWorkload[0].workloadPercentage > 0 ? sortedByWorkload[0] : null
  
  const sortedByWorkloadAsc = [...summaryList].sort((a, b) => a.workloadPercentage - b.workloadPercentage)
  const mostFree = sortedByWorkloadAsc.length > 0 ? sortedByWorkloadAsc[0] : null

  const getWorkloadColor = (pct: number) => {
    if (pct >= 80) return 'var(--red)'
    if (pct >= 60) return 'var(--amber)'
    return 'var(--green)'
  }

  const getWorkloadBg = (pct: number) => {
    if (pct >= 80) return 'var(--red-light)'
    if (pct >= 60) return 'var(--amber-light)'
    return 'var(--green-light)'
  }

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--secondary)' }}>
        <p className="animate-pulse">Loading capacity analytics...</p>
      </div>
    )
  }

  if (error) {
    const apiError = normalizeApiError(error)
    return (
      <div className="panel notice error" style={{ margin: '24px' }}>
        <h3>Error loading capacity analytics</h3>
        <p>{apiError.message}</p>
      </div>
    )
  }

  return (
    <section className="analytics-page" data-testid="analytics-page" style={{ padding: '8px' }}>
      <div className="page-heading">
        <div>
          <p>Resource Planning</p>
          <h1>Team Capacity & Workload</h1>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
        
        {/* Most Overloaded Card */}
        <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid var(--red)' }}>
          <div style={{ background: 'var(--red-light)', padding: '12px', borderRadius: '8px' }}>
            <UserMinus size={24} style={{ color: 'var(--red)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '12px', color: 'var(--secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>
              Highest Load member
            </span>
            <h3 style={{ margin: '4px 0 2px', fontSize: '16px', fontWeight: 'bold' }}>
              {mostOverloaded ? mostOverloaded.fullName : 'All members under capacity'}
            </h3>
            <span style={{ fontSize: '13px', color: 'var(--secondary)' }}>
              {mostOverloaded ? `${mostOverloaded.designation} · ${mostOverloaded.workloadPercentage}% Workload` : 'No member is overloaded'}
            </span>
          </div>
          {mostOverloaded && <AlertTriangle size={20} style={{ color: 'var(--red)' }} />}
        </div>

        {/* Most Free Card */}
        <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid var(--green)' }}>
          <div style={{ background: 'var(--green-light)', padding: '12px', borderRadius: '8px' }}>
            <UserCheck size={24} style={{ color: 'var(--green)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '12px', color: 'var(--secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>
              Most Available member
            </span>
            <h3 style={{ margin: '4px 0 2px', fontSize: '16px', fontWeight: 'bold' }}>
              {mostFree ? mostFree.fullName : 'All members busy'}
            </h3>
            <span style={{ fontSize: '13px', color: 'var(--secondary)' }}>
              {mostFree ? `${mostFree.designation} · ${mostFree.workloadPercentage}% Workload` : 'No free member currently'}
            </span>
          </div>
          {mostFree && <CheckCircle2 size={20} style={{ color: 'var(--green)' }} />}
        </div>
      </div>

      {/* Main Workload Table Panel */}
      <section className="panel" style={{ marginTop: '24px' }}>
        <div className="panel-header">
          <h2>Team Load Capacity</h2>
          <span className="muted">{summaryList.length} members tracked</span>
        </div>

        <div className="table-wrap" style={{ marginTop: '16px' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: '25%' }}>Team Member</th>
                <th style={{ width: '30%' }}>Assigned Brands</th>
                <th style={{ width: '15%' }}>Open Tasks</th>
                <th style={{ width: '30%' }}>Workload Capacity</th>
              </tr>
            </thead>
            <tbody>
              {summaryList.map((member) => (
                <tr key={member.id}>
                  <td>
                    <div>
                      <strong style={{ display: 'block', fontSize: '14px' }}>{member.fullName}</strong>
                      <span style={{ fontSize: '12px', color: 'var(--secondary)' }}>{member.designation}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {member.assignedClients.map((client) => (
                        <span key={client} className="pill" style={{ fontSize: '10px', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
                          {client}
                        </span>
                      ))}
                      {member.assignedClients.length === 0 ? (
                        <span style={{ fontStyle: 'italic', fontSize: '12px', color: 'var(--muted)' }}>Unassigned</span>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <strong style={{ fontSize: '14px' }}>{member.openTasksCount}</strong>
                    <span style={{ fontSize: '12px', color: 'var(--secondary)', marginLeft: '4px' }}>tasks</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Horizontal capacity bar */}
                      <div style={{ flex: 1, height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${member.workloadPercentage}%`,
                            background: getWorkloadColor(member.workloadPercentage),
                            borderRadius: '4px',
                            transition: 'width 0.4s ease-in-out',
                          }}
                        />
                      </div>
                      <span
                        className="pill"
                        style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          padding: '2px 8px',
                          color: getWorkloadColor(member.workloadPercentage),
                          background: getWorkloadBg(member.workloadPercentage),
                          width: '52px',
                          textAlign: 'center',
                        }}
                      >
                        {member.workloadPercentage}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {summaryList.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>
                    No team members enrolled in the system.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}
