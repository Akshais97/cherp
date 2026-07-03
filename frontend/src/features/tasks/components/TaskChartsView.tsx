import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { normalizeApiError } from '../../../lib/api/errors'
import { apiClient } from '../../../lib/api/client'
import { UserMinus, UserCheck, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { getWorkloadSummary } from '../../users/api'

interface TaskChartsViewProps {
  filters: {
    startDate?: string
    endDate?: string
    clientIds?: string[]
    assigneeIds?: string[]
    labels?: string[]
    priorities?: string[]
    statuses?: string[]
    slots?: string[]
    searchText?: string
  }
}

type AnalyticsData = {
  statusCounts: { yet_to_start: number; ongoing: number; blocked: number; completed: number; late: number }
  priorityCounts: Record<string, { yet_to_start: number; ongoing: number; blocked: number; completed: number; late: number }>
  clientCounts: Record<string, { name: string; yet_to_start: number; ongoing: number; blocked: number; completed: number; late: number }>
  memberCounts: Record<string, { name: string; yet_to_start: number; ongoing: number; blocked: number; completed: number; late: number }>
}

const statusColors = {
  completed: '#2DA86B', // green
  late: '#D44444',      // red
  blocked: '#D48806',   // amber
  ongoing: '#3B6DD6',   // blue
  yet_to_start: '#9A9A9A' // gray
}

const statusDisplayLabels = {
  yet_to_start: 'Yet to start',
  ongoing: 'Ongoing',
  blocked: 'Blocked',
  completed: 'Completed',
  late: 'Late'
}

export function TaskChartsView({ filters }: TaskChartsViewProps) {
  const [hoveredDonutSegment, setHoveredDonutSegment] = useState<string | null>(null)
  
  // Bar hover tooltip state
  const [hoveredBarSegment, setHoveredBarSegment] = useState<{
    x: number
    y: number
    label: string
    status: string
    count: number
    chartType: 'priority' | 'client' | 'member'
  } | null>(null)

  const { data: analytics, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ['tasks-analytics', filters],
    queryFn: () =>
      apiClient
        .get<AnalyticsData>('/tasks/analytics', { params: filters })
        .then((res) => res.data),
  })

  const { data: summaryList = [] } = useQuery({
    queryKey: ['analytics-workload-summary'],
    queryFn: getWorkloadSummary,
  })

  // Determine most overloaded and most free members
  const sortedByWorkload = [...summaryList].sort((a, b) => b.workloadPercentage - a.workloadPercentage)
  const mostOverloaded = sortedByWorkload.length > 0 && sortedByWorkload[0].workloadPercentage > 0 ? sortedByWorkload[0] : null
  
  const sortedByWorkloadAsc = [...summaryList].sort((a, b) => a.workloadPercentage - b.workloadPercentage)
  const mostFree = sortedByWorkloadAsc.length > 0 ? sortedByWorkloadAsc[0] : null

  // Calculate Donut properties
  const donutSegments = useMemo(() => {
    if (!analytics) return []
    const { statusCounts } = analytics
    const entries = Object.entries(statusCounts) as [string, number][]
    const total = entries.reduce((sum, [_, count]) => sum + count, 0)
    
    let accumulatedPercent = 0
    return entries.map(([status, count]) => {
      const percentage = total > 0 ? (count / total) * 100 : 0
      const startPercent = accumulatedPercent
      accumulatedPercent += percentage
      return {
        status,
        count,
        percentage,
        startPercent,
        color: statusColors[status as keyof typeof statusColors] || '#999'
      }
    }).filter(s => s.count > 0)
  }, [analytics])

  const tasksLeft = useMemo(() => {
    if (!analytics) return 0
    const { yet_to_start, ongoing, blocked, late } = analytics.statusCounts
    return yet_to_start + ongoing + blocked + late
  }, [analytics])

  const handleBarMouseMove = (
    e: React.MouseEvent,
    label: string,
    status: string,
    count: number,
    chartType: 'priority' | 'client' | 'member'
  ) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setHoveredBarSegment({
      x: e.clientX - rect.left + 15,
      y: e.clientY - rect.top - 35,
      label,
      status,
      count,
      chartType,
    })
  }

  const handleBarMouseLeave = () => {
    setHoveredBarSegment(null)
  }

  if (isLoading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: 'var(--secondary-text)' }}>
        <p className="animate-pulse">Loading analytics dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="panel notice error" style={{ margin: '24px' }}>
        <h3>Failed to load task analytics</h3>
        <p>{normalizeApiError(error).message}</p>
      </div>
    )
  }

  if (!analytics) return null

  // Circle Circumference for Donut (radius = 30) => 2 * pi * r = 188.495
  const circumference = 188.495

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Workload Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        
        {/* Most Overloaded Card */}
        <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid var(--red)', padding: '16px' }}>
          <div style={{ background: 'var(--red-light)', padding: '12px', borderRadius: '8px' }}>
            <UserMinus size={24} style={{ color: 'var(--red)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '12px', color: 'var(--secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>
              Highest Load member
            </span>
            <h3 style={{ margin: '4px 0 2px', fontSize: '16px', fontWeight: 'bold', color: 'var(--text)' }}>
              {mostOverloaded ? mostOverloaded.fullName : 'All members under capacity'}
            </h3>
            <span style={{ fontSize: '13px', color: 'var(--secondary)' }}>
              {mostOverloaded ? `${mostOverloaded.designation} · ${mostOverloaded.workloadPercentage}% Workload` : 'No member is overloaded'}
            </span>
          </div>
          {mostOverloaded && <AlertTriangle size={20} style={{ color: 'var(--red)' }} />}
        </div>

        {/* Most Free Card */}
        <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid var(--green)', padding: '16px' }}>
          <div style={{ background: 'var(--green-light)', padding: '12px', borderRadius: '8px' }}>
            <UserCheck size={24} style={{ color: 'var(--green)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '12px', color: 'var(--secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>
              Most Available member
            </span>
            <h3 style={{ margin: '4px 0 2px', fontSize: '16px', fontWeight: 'bold', color: 'var(--text)' }}>
              {mostFree ? mostFree.fullName : 'All members busy'}
            </h3>
            <span style={{ fontSize: '13px', color: 'var(--secondary)' }}>
              {mostFree ? `${mostFree.designation} · ${mostFree.workloadPercentage}% Workload` : 'No free member currently'}
            </span>
          </div>
          {mostFree && <CheckCircle2 size={20} style={{ color: 'var(--green)' }} />}
        </div>
      </div>

      <div data-testid="task-charts-view" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
      
      {/* 1. Status Donut Chart Panel */}
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '600', alignSelf: 'flex-start', color: 'var(--text)' }}>
          Task Status Progress
        </h3>
        
        <div style={{ position: 'relative', width: '200px', height: '200px', marginBottom: '24px' }}>
          <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
            {/* Base grey background circle if total is 0 */}
            {donutSegments.length === 0 ? (
              <circle cx="50" cy="50" r="30" fill="transparent" stroke="var(--border, #E6E6E2)" strokeWidth="8" />
            ) : (
              donutSegments.map((segment) => {
                const dashLength = (segment.percentage / 100) * circumference
                const gapLength = circumference - dashLength
                const strokeDash = `${dashLength} ${gapLength}`
                const strokeOffset = circumference - ((segment.startPercent / 100) * circumference)
                const isHovered = hoveredDonutSegment === segment.status

                return (
                  <circle
                    key={segment.status}
                    cx="50"
                    cy="50"
                    r="30"
                    fill="transparent"
                    stroke={segment.color}
                    strokeWidth={isHovered ? 11 : 8}
                    strokeDasharray={strokeDash}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-width 0.2s ease, stroke 0.2s' }}
                    onMouseEnter={() => setHoveredDonutSegment(segment.status)}
                    onMouseLeave={() => setHoveredDonutSegment(null)}
                  />
                )
              })
            )}
          </svg>

          {/* Centered Donut Content */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', pointerEvents: 'none'
          }}>
            {hoveredDonutSegment ? (
              <>
                <span style={{ fontSize: '20px', fontWeight: '700', color: statusColors[hoveredDonutSegment as keyof typeof statusColors] }}>
                  {analytics.statusCounts[hoveredDonutSegment as keyof typeof analytics.statusCounts]}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--secondary-text)', textTransform: 'capitalize' }}>
                  {statusDisplayLabels[hoveredDonutSegment as keyof typeof statusDisplayLabels]}
                </span>
              </>
            ) : (
              <>
                <span style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text, #1A1A1A)' }}>
                  {tasksLeft}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--muted-text, #9A9A9A)' }}>
                  Tasks Left
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', width: '100%' }}>
          {Object.entries(statusDisplayLabels).map(([statusKey, label]) => {
            const count = analytics.statusCounts[statusKey as keyof typeof analytics.statusCounts] || 0
            const color = statusColors[statusKey as keyof typeof statusColors]
            const isHovered = hoveredDonutSegment === statusKey

            return (
              <div 
                key={statusKey} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  opacity: hoveredDonutSegment && !isHovered ? 0.4 : 1,
                  transition: 'opacity 0.2s',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  background: isHovered ? 'var(--hover-bg, #F5F5F2)' : 'transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }}></span>
                  <span style={{ fontSize: '12px', color: 'var(--text)' }}>{label}</span>
                </div>
                <strong style={{ fontSize: '12px', color: 'var(--text)' }}>{count}</strong>
              </div>
            )
          })}
        </div>
      </div>

      {/* 2. Priority Stacked Bar Chart */}
      <div className="panel" style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', position: 'relative' }}>
        <h3 style={{ margin: '0 0 24px 0', fontSize: '15px', fontWeight: '600', color: 'var(--text)' }}>
          Priority Workload
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '220px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
          {Object.entries(analytics.priorityCounts).map(([priority, counts]) => {
            const total = Object.values(counts).reduce((s, c) => s + c, 0)
            return (
              <div key={priority} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '40px' }}>
                <div style={{ position: 'relative', width: '16px', height: '130px', background: 'var(--hover-bg, #F5F5F2)', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column-reverse' }}>
                  {Object.entries(counts).map(([status, count]) => {
                    if (count === 0) return null
                    const heightPct = total > 0 ? (count / total) * 100 : 0
                    return (
                      <div
                        key={status}
                        style={{
                          height: `${heightPct}%`,
                          backgroundColor: statusColors[status as keyof typeof statusColors],
                          cursor: 'pointer'
                        }}
                        onMouseMove={(e) => handleBarMouseMove(e, priority.toUpperCase(), status, count, 'priority')}
                        onMouseLeave={handleBarMouseLeave}
                      />
                    )
                  })}
                </div>
                <span style={{ fontSize: '11px', textTransform: 'capitalize', color: 'var(--secondary-text)', marginTop: '8px', fontWeight: '600' }}>
                  {priority}
                </span>
              </div>
            )
          })}
        </div>

        {/* Status Legend Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', justifyContent: 'center', marginTop: '16px', width: '100%' }}>
          {Object.entries(statusDisplayLabels).map(([statusKey, label]) => (
            <div key={statusKey} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColors[statusKey as keyof typeof statusColors] }}></span>
              <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>{label}</span>
            </div>
          ))}
        </div>
        
        {/* Floating Tooltip Card */}
        {hoveredBarSegment && hoveredBarSegment.chartType === 'priority' && (
          <div style={{
            position: 'absolute',
            left: `${hoveredBarSegment.x}px`,
            top: `${hoveredBarSegment.y}px`,
            background: 'var(--text, #1A1A1A)',
            color: 'var(--card, #FFF)',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '11px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 10,
            pointerEvents: 'none',
            whiteSpace: 'nowrap'
          }}>
            <strong style={{ display: 'block', marginBottom: '2px' }}>{hoveredBarSegment.label}</strong>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColors[hoveredBarSegment.status as keyof typeof statusColors] }}></span>
              {statusDisplayLabels[hoveredBarSegment.status as keyof typeof statusDisplayLabels]}: {hoveredBarSegment.count} tasks
            </span>
          </div>
        )}
      </div>

      {/* 3. Bucket / Client Stacked Bar Chart */}
      <div className="panel" style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', position: 'relative' }}>
        <h3 style={{ margin: '0 0 24px 0', fontSize: '15px', fontWeight: '600', color: 'var(--text)' }}>
          Brand Task Load
        </h3>
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', alignItems: 'flex-end', height: '220px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
          {Object.entries(analytics.clientCounts).map(([clientId, data]) => {
            const { name, ...counts } = data
            const total = Object.values(counts).reduce((s, c) => s + c, 0)
            return (
              <div key={clientId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px', flex: 1 }}>
                <div style={{ position: 'relative', width: '16px', height: '130px', background: 'var(--hover-bg, #F5F5F2)', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column-reverse' }}>
                  {Object.entries(counts).map(([status, count]) => {
                    if (count === 0) return null
                    const heightPct = total > 0 ? (count / total) * 100 : 0
                    return (
                      <div
                        key={status}
                        style={{
                          height: `${heightPct}%`,
                          backgroundColor: statusColors[status as keyof typeof statusColors],
                          cursor: 'pointer'
                        }}
                        onMouseMove={(e) => handleBarMouseMove(e, name, status, count, 'client')}
                        onMouseLeave={handleBarMouseLeave}
                      />
                    )
                  })}
                </div>
                <span 
                  style={{ fontSize: '10px', color: 'var(--secondary-text)', marginTop: '8px', maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}
                  title={name}
                >
                  {name}
                </span>
              </div>
            )
          })}
          {Object.keys(analytics.clientCounts).length === 0 ? (
            <div style={{ display: 'flex', flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-text)', fontSize: '12px', fontStyle: 'italic' }}>
              No brands queried
            </div>
          ) : null}
        </div>

        {/* Status Legend Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', justifyContent: 'center', marginTop: '16px', width: '100%' }}>
          {Object.entries(statusDisplayLabels).map(([statusKey, label]) => (
            <div key={statusKey} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColors[statusKey as keyof typeof statusColors] }}></span>
              <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Floating Tooltip Card */}
        {hoveredBarSegment && hoveredBarSegment.chartType === 'client' && (
          <div style={{
            position: 'absolute',
            left: `${hoveredBarSegment.x}px`,
            top: `${hoveredBarSegment.y}px`,
            background: 'var(--text, #1A1A1A)',
            color: 'var(--card, #FFF)',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '11px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 10,
            pointerEvents: 'none',
            whiteSpace: 'nowrap'
          }}>
            <strong style={{ display: 'block', marginBottom: '2px' }}>{hoveredBarSegment.label}</strong>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColors[hoveredBarSegment.status as keyof typeof statusColors] }}></span>
              {statusDisplayLabels[hoveredBarSegment.status as keyof typeof statusDisplayLabels]}: {hoveredBarSegment.count} tasks
            </span>
          </div>
        )}
      </div>

      {/* 4. Members Workload Stacked Bar Chart */}
      <div className="panel" style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', position: 'relative' }}>
        <h3 style={{ margin: '0 0 24px 0', fontSize: '15px', fontWeight: '600', color: 'var(--text)' }}>
          Resource Capacity
        </h3>
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', alignItems: 'flex-end', height: '220px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
          {Object.entries(analytics.memberCounts).map(([memberId, data]) => {
            const { name, ...counts } = data
            const total = Object.values(counts).reduce((s, c) => s + c, 0)
            return (
              <div key={memberId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px', flex: 1 }}>
                <div style={{ position: 'relative', width: '16px', height: '130px', background: 'var(--hover-bg, #F5F5F2)', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column-reverse' }}>
                  {Object.entries(counts).map(([status, count]) => {
                    if (count === 0) return null
                    const heightPct = total > 0 ? (count / total) * 100 : 0
                    return (
                      <div
                        key={status}
                        style={{
                          height: `${heightPct}%`,
                          backgroundColor: statusColors[status as keyof typeof statusColors],
                          cursor: 'pointer'
                        }}
                        onMouseMove={(e) => handleBarMouseMove(e, name, status, count, 'member')}
                        onMouseLeave={handleBarMouseLeave}
                      />
                    )
                  })}
                </div>
                <span 
                  style={{ fontSize: '10px', color: 'var(--secondary-text)', marginTop: '8px', maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}
                  title={name}
                >
                  {name.split(' ')[0]}
                </span>
              </div>
            )
          })}
          {Object.keys(analytics.memberCounts).length === 0 ? (
            <div style={{ display: 'flex', flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-text)', fontSize: '12px', fontStyle: 'italic' }}>
              No members assigned
            </div>
          ) : null}
        </div>

        {/* Status Legend Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', justifyContent: 'center', marginTop: '16px', width: '100%' }}>
          {Object.entries(statusDisplayLabels).map(([statusKey, label]) => (
            <div key={statusKey} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColors[statusKey as keyof typeof statusColors] }}></span>
              <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Floating Tooltip Card */}
        {hoveredBarSegment && hoveredBarSegment.chartType === 'member' && (
          <div style={{
            position: 'absolute',
            left: `${hoveredBarSegment.x}px`,
            top: `${hoveredBarSegment.y}px`,
            background: 'var(--text, #1A1A1A)',
            color: 'var(--card, #FFF)',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '11px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 10,
            pointerEvents: 'none',
            whiteSpace: 'nowrap'
          }}>
            <strong style={{ display: 'block', marginBottom: '2px' }}>{hoveredBarSegment.label}</strong>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColors[hoveredBarSegment.status as keyof typeof statusColors] }}></span>
              {statusDisplayLabels[hoveredBarSegment.status as keyof typeof statusDisplayLabels]}: {hoveredBarSegment.count} tasks
            </span>
          </div>
        )}
      </div>

    </div>
  </div>
)
}
