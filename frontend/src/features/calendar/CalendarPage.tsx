import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  CheckCircle,
  X,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { useAuth } from '../../app/providers/useAuth'
import { apiClient } from '../../lib/api/client'
import { getUsers } from '../workflows/api'

type Task = {
  id: string
  title: string
  status: string
  priority: string
  due_date: string
  is_daily?: boolean
  slot?: string | null
  assigned_to?: string | null
  assignee?: { id: string; full_name: string; email: string } | null
  workflow: {
    id: string
    title: string
    client: { id: string; name: string }
  }
}

type HistoryPayload = {
  completed_daily: number
  completed_weekly: number
  completed_monthly: number
  completed_tasks?: Array<{
    id: string
    title: string
    status: string
    completed_at: string
    workflow_title: string
    client_name: string
  }>
}

type HistoryRecord = {
  id: string
  date: string
  payload: HistoryPayload
}

export function CalendarPage() {
  const { currentUser } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const isPm = currentUser?.role === 'super_admin' || currentUser?.role === 'project_manager'

  // Calculations for current month view
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0)
  
  // Date range for fetching tasks
  const monthStartStr = new Date(year, month, 1, 0, 0, 0).toISOString()
  const monthEndStr = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

  // Grid dates calculation
  const totalDays = monthEnd.getDate()
  const startOffset = monthStart.getDay() // 0 = Sunday, 1 = Monday etc.

  // Fetch users for PM/Owner dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: isPm,
  })

  // Filter out only PM and TM users to display in selector
  const eligibleUsers = useMemo(() => {
    return users.filter((u) => ['team_member', 'project_manager', 'super_admin'].includes(u.role.name))
  }, [users])

  // Fetch tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['calendar-tasks', selectedUserId, monthStartStr, monthEndStr],
    queryFn: () =>
      apiClient
        .get<Task[]>('/tasks', {
          params: {
            startDate: monthStartStr,
            endDate: monthEndStr,
            userId: selectedUserId || undefined,
          },
        })
        .then((res) => res.data),
  })

  // Fetch user history
  const { data: histories = [] } = useQuery<HistoryRecord[]>({
    queryKey: ['calendar-history', selectedUserId, monthStartStr, monthEndStr],
    queryFn: () =>
      apiClient
        .get<HistoryRecord[]>('/users/history', {
          params: {
            userId: selectedUserId || undefined,
            startDate: monthStartStr,
            endDate: monthEndStr,
          },
        })
        .then((res) => res.data),
  })

  // Generate grid days array
  const calendarCells = useMemo(() => {
    const cells: { date: Date | null; isCurrentMonth: boolean }[] = []
    
    // Previous month padding
    const prevMonthEnd = new Date(year, month, 0).getDate()
    for (let i = startOffset - 1; i >= 0; i--) {
      cells.push({
        date: new Date(year, month - 1, prevMonthEnd - i),
        isCurrentMonth: false
      })
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      cells.push({
        date: new Date(year, month, d),
        isCurrentMonth: true
      })
    }

    // Next month padding to keep 6 rows grid
    const totalCells = 42
    const remaining = totalCells - cells.length
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      })
    }

    return cells
  }, [year, month, startOffset, totalDays])

  // Map tasks by date
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const task of tasks) {
      if (task.is_daily) {
        for (const cell of calendarCells) {
          if (cell.date) {
            const dateKey = cell.date.toISOString().split('T')[0]
            if (!map[dateKey]) map[dateKey] = []
            if (!map[dateKey].some((t) => t.id === task.id)) {
              map[dateKey].push(task)
            }
          }
        }
      } else if (task.due_date) {
        const dateKey = new Date(task.due_date).toISOString().split('T')[0]
        if (!map[dateKey]) map[dateKey] = []
        map[dateKey].push(task)
      }
    }
    return map
  }, [tasks, calendarCells])

  // Map history records by date
  const historyByDate = useMemo(() => {
    const map: Record<string, HistoryPayload> = {}
    for (const record of histories) {
      if (record.date) {
        const dateKey = new Date(record.date).toISOString().split('T')[0]
        map[dateKey] = record.payload
      }
    }
    return map
  }, [histories])

  // Date formatting helpers
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
    setSelectedDay(null)
  }

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
    setSelectedDay(null)
  }

  // Calendar cells generation moved above tasksByDate map

  // Calculate stats for calendar summary
  const totalIncomplete = tasks.filter(
    (t) => !['completed', 'task_approved_by_manager', 'task_approved_by_client'].includes(t.status)
  ).length

  const selectedDayKey = selectedDay ? selectedDay.toISOString().split('T')[0] : null
  const selectedDayTasks = selectedDayKey ? (tasksByDate[selectedDayKey] || []) : []
  const selectedDayHistory = selectedDayKey ? (historyByDate[selectedDayKey] || null) : null

  // Split selected day tasks into incomplete (deadlines) and completed (handled by history array)
  const selectedDayDeadlines = selectedDayTasks.filter(
    (t) => !['completed', 'task_approved_by_manager', 'task_approved_by_client'].includes(t.status)
  )

  const selectedDayDoneTasks = selectedDayHistory?.completed_tasks || []

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)' }}>
      {/* Header / Selector Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text)', margin: 0 }}>
            {monthNames[month]} {year}
          </h2>
          <div style={{ display: 'flex', gap: '4px', background: 'var(--hover)', borderRadius: '6px', padding: '2px' }}>
            <button className="icon-button" onClick={prevMonth} style={{ padding: '6px', color: 'var(--text)', background: 'transparent' }} type="button">
              <ChevronLeft size={16} />
            </button>
            <button className="icon-button" onClick={nextMonth} style={{ padding: '6px', color: 'var(--text)', background: 'transparent' }} type="button">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isPm && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={15} style={{ color: 'var(--muted)' }} />
              <select
                className="select"
                value={selectedUserId}
                onChange={(e) => {
                  setSelectedUserId(e.target.value)
                  setSelectedDay(null)
                }}
                style={{ padding: '6px 12px', fontSize: '13px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)' }}
              >
                <option value="" style={{ color: 'var(--text)', background: 'var(--card)' }}>All Members</option>
                {eligibleUsers.map((u) => (
                  <option key={u.id} value={u.id} style={{ color: 'var(--text)', background: 'var(--card)' }}>
                    {u.full_name} ({u.role.description})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--muted)' }}>
            <span>
              <strong style={{ color: 'var(--text)' }}>{totalIncomplete}</strong> deadlines
            </span>
          </div>
        </div>
      </div>

      {/* Main Layout (Grid + Drawer) */}
      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: '520px', position: 'relative' }}>
        
        {/* Calendar Month Grid */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* Days of week headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: '500', fontSize: '12px', color: 'var(--muted)', paddingBottom: '6px' }}>
            <div>SUN</div>
            <div>MON</div>
            <div>TUE</div>
            <div>WED</div>
            <div>THU</div>
            <div>FRI</div>
            <div>SAT</div>
          </div>

          {/* Grid Cells */}
          {tasksLoading ? (
            <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center', color: 'var(--muted)' }}>
              Loading tasks...
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gridTemplateRows: 'repeat(6, 1fr)',
              flex: 1,
              gap: '6px',
              background: 'var(--bg-secondary)',
              padding: '6px',
              borderRadius: '12px',
              border: '1px solid var(--border)'
            }}>
              {calendarCells.map((cell, idx) => {
                if (!cell.date) return <div key={idx} />
                const dateKey = cell.date.toISOString().split('T')[0]
                const cellTasks = tasksByDate[dateKey] || []
                const cellHistory = historyByDate[dateKey] || null

                const incompleteTasks = cellTasks.filter(
                  (t) => !['completed', 'task_approved_by_manager', 'task_approved_by_client'].includes(t.status)
                )
                
                // Sort incomplete tasks by time if time exists
                const sortedIncomplete = [...incompleteTasks].sort((a, b) => {
                  return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
                })

                // Get done tasks count from history
                const doneCount = cellHistory?.completed_tasks?.length || 0

                const isToday = new Date().toDateString() === cell.date.toDateString()
                const isSelected = selectedDay && selectedDay.toDateString() === cell.date.toDateString()

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDay(cell.date)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      textAlign: 'left',
                      background: isSelected
                        ? 'var(--blue-light)'
                        : cell.isCurrentMonth
                        ? 'var(--card)'
                        : 'transparent',
                      border: isSelected
                        ? '1px solid var(--blue)'
                        : isToday
                        ? '2px solid var(--blue)'
                        : cell.isCurrentMonth
                        ? '1px solid var(--border)'
                        : 'none',
                      borderRadius: '8px',
                      padding: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      opacity: cell.isCurrentMonth ? 1 : 0.4,
                      minHeight: '85px',
                      position: 'relative',
                      boxShadow: isSelected
                        ? '0 2px 8px rgba(59, 109, 214, 0.15)'
                        : cell.isCurrentMonth
                        ? '0 1px 3px rgba(0, 0, 0, 0.02)'
                        : 'none',
                    }}
                    type="button"
                  >
                    {/* Day number */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: isToday ? '700' : '500',
                        color: isToday ? 'var(--blue)' : cell.isCurrentMonth ? 'var(--text)' : 'var(--muted)',
                        background: isToday ? 'var(--blue-light)' : 'transparent',
                        padding: isToday ? '2px 6px' : '0',
                        borderRadius: '4px'
                      }}>
                        {cell.date.getDate()}
                      </span>
                      {doneCount > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', background: 'var(--green-light)', border: '1px solid rgba(45, 168, 107, 0.2)', borderRadius: '12px', padding: '1px 6px', fontSize: '9px', color: 'var(--green)', fontWeight: '500' }}>
                          ✓ {doneCount} done
                        </span>
                      )}
                    </div>

                    {/* Task titles */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', flex: 1 }}>
                      {sortedIncomplete.slice(0, 3).map((task) => {
                        const hasTime = task.due_date ? (task.due_date.includes('T') && !task.due_date.includes('00:00:00')) : false
                        const timeStr = task.slot || (hasTime && task.due_date
                          ? new Date(task.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '')

                        return (
                          <div
                            key={task.id}
                            style={{
                              fontSize: '9px',
                              lineHeight: '1.2',
                              padding: '2px 4px',
                              borderRadius: '4px',
                              background: task.priority === 'high' ? 'var(--red-light)' : 'var(--blue-light)',
                              borderLeft: task.priority === 'high' ? '2px solid var(--red)' : '2px solid var(--blue)',
                              color: task.priority === 'high' ? 'var(--red)' : 'var(--blue)',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                              overflow: 'hidden'
                            }}
                            title={`${timeStr ? timeStr + ' - ' : ''}${task.title}`}
                          >
                            {timeStr && <span style={{ opacity: 0.6, marginRight: '3px' }}>{timeStr}</span>}
                            {task.title}
                          </div>
                        )
                      })}
                      {sortedIncomplete.length > 3 && (
                        <div style={{ fontSize: '8px', color: 'var(--muted)', textAlign: 'center', paddingTop: '2px' }}>
                          + {sortedIncomplete.length - 3} more
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Side Panel Drawer (Day Detail list) */}
        {selectedDay && (
          <div style={{
            width: '320px',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            zIndex: 10,
            boxShadow: '-4px 0 24px rgba(26, 26, 26, 0.05)',
            animation: 'slideIn 0.2s ease-out'
          }}>
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text)', fontWeight: '600' }}>
                  {selectedDay.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Daily Snapshots</span>
              </div>
              <button
                className="icon-button"
                onClick={() => setSelectedDay(null)}
                style={{ padding: '6px', background: 'var(--hover)', borderRadius: '50%' }}
                type="button"
              >
                <X size={15} />
              </button>
            </div>

            {/* Drawer Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Deadlines Section */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={13} style={{ color: 'var(--blue)' }} />
                  Deadlines ({selectedDayDeadlines.length})
                </h4>
                {selectedDayDeadlines.length === 0 ? (
                  <div style={{ padding: '12px', background: 'var(--bg-secondary)', border: '1px dashed var(--border)', borderRadius: '8px', fontSize: '12px', color: 'var(--muted)', textAlign: 'center' }}>
                    No deadlines for this day
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedDayDeadlines.map((task) => {
                      const hasTime = task.due_date ? (task.due_date.includes('T') && !task.due_date.includes('00:00:00')) : false
                      const timeStr = task.slot || (hasTime && task.due_date
                        ? new Date(task.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '')

                      return (
                        <div
                          key={task.id}
                          style={{
                            padding: '12px',
                            background: 'var(--input)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text)', wordBreak: 'break-word' }}>
                              {task.title}
                            </span>
                            {timeStr && (
                              <span style={{ fontSize: '10px', color: 'var(--secondary)', background: 'var(--hover)', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                {timeStr}
                              </span>
                            )}
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'var(--secondary)', marginTop: '6px' }}>
                            <span>{task.workflow.client.name}</span>
                            <span style={{
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: task.priority === 'high' ? 'var(--red-light)' : 'var(--blue-light)',
                              color: task.priority === 'high' ? 'var(--red)' : 'var(--blue)'
                            }}>
                              {task.priority}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Completed Tasks Section */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={13} style={{ color: 'var(--green)' }} />
                  Completed ({selectedDayDoneTasks.length})
                </h4>
                {selectedDayDoneTasks.length === 0 ? (
                  <div style={{ padding: '12px', background: 'var(--bg-secondary)', border: '1px dashed var(--border)', borderRadius: '8px', fontSize: '12px', color: 'var(--muted)', textAlign: 'center' }}>
                    No completed tasks on this day
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedDayDoneTasks.map((task) => {
                      const compTime = task.completed_at
                        ? new Date(task.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : ''

                      return (
                        <div
                          key={task.id}
                          style={{
                            padding: '12px',
                            background: 'var(--green-light)',
                            border: '1px solid rgba(45, 168, 107, 0.2)',
                            borderRadius: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text)', wordBreak: 'break-word', textDecoration: 'line-through', opacity: 0.8 }}>
                              {task.title}
                            </span>
                            {compTime && (
                              <span style={{ fontSize: '10px', color: 'var(--green)', background: 'rgba(45, 168, 107, 0.08)', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                {compTime}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'var(--secondary)', marginTop: '6px' }}>
                            <span>{task.client_name}</span>
                            <span>{task.workflow_title}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  )
}
