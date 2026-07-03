import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Clock, CheckCircle, X } from 'lucide-react'
import { apiClient } from '../../../lib/api/client'
import { type WorkflowTask, type UserOption } from '../../workflows/api'

interface TaskCalendarViewProps {
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
  users: UserOption[]
  onTaskClick: (task: WorkflowTask) => void
  onUpdateTask: (taskId: string, fields: any) => void
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

export function TaskCalendarView({ filters, users: _users, onTaskClick, onUpdateTask }: TaskCalendarViewProps) {
  const queryClient = useQueryClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

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

  // Merge local calendar date range into global filters for query
  const queryParams = useMemo(() => {
    return {
      ...filters,
      startDate: monthStartStr,
      endDate: monthEndStr,
    }
  }, [filters, monthStartStr, monthEndStr])

  // Fetch tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<WorkflowTask[]>({
    queryKey: ['calendar-tasks', queryParams],
    queryFn: () =>
      apiClient
        .get<WorkflowTask[]>('/tasks', { params: queryParams })
        .then((res) => res.data),
  })

  // Fetch user history based on first assignee filtered, if any
  const targetUserId = filters.assigneeIds?.[0] || ''
  const { data: histories = [] } = useQuery<HistoryRecord[]>({
    queryKey: ['calendar-history', targetUserId, monthStartStr, monthEndStr],
    queryFn: () =>
      apiClient
        .get<HistoryRecord[]>('/users/history', {
          params: {
            userId: targetUserId || undefined,
            startDate: monthStartStr,
            endDate: monthEndStr,
          },
        })
        .then((res) => res.data),
    enabled: true,
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
    const map: Record<string, WorkflowTask[]> = {}
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

  // Handle dropping a task onto a date cell
  const handleDropOnDate = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain')
    if (!taskId) return

    // Calculate due date preserving existing time component if applicable, or defaulting to noon UTC
    const dateStr = targetDate.toISOString().split('T')[0] + 'T12:00:00.000Z'
    
    try {
      await onUpdateTask(taskId, { due_date: dateStr })
      queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] })
    } catch (err) {
      console.error('Failed to reschedule task', err)
    }
  }

  const totalIncomplete = tasks.filter(
    (t) => !['completed', 'task_approved_by_manager', 'task_approved_by_client'].includes(t.status)
  ).length

  const selectedDayKey = selectedDay ? selectedDay.toISOString().split('T')[0] : null
  const selectedDayTasks = selectedDayKey ? (tasksByDate[selectedDayKey] || []) : []
  const selectedDayHistory = selectedDayKey ? (historyByDate[selectedDayKey] || null) : null

  const selectedDayDeadlines = selectedDayTasks.filter(
    (t) => !['completed', 'task_approved_by_manager', 'task_approved_by_client'].includes(t.status)
  )
  const selectedDayDoneTasks = selectedDayHistory?.completed_tasks || []

  return (
    <div data-testid="task-calendar-view" className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', position: 'relative' }}>
      
      {/* Calendar Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', margin: 0 }}>
            {monthNames[month]} {year}
          </h2>
          <div style={{ display: 'flex', gap: '4px', background: 'var(--hover-bg, #F5F5F2)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border)' }}>
            <button className="icon-button" onClick={prevMonth} style={{ padding: '4px 8px', color: 'var(--text)', background: 'transparent', cursor: 'pointer' }} type="button">
              <ChevronLeft size={16} />
            </button>
            <button className="icon-button" onClick={nextMonth} style={{ padding: '4px 8px', color: 'var(--text)', background: 'transparent', cursor: 'pointer' }} type="button">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: 'var(--secondary-text)' }}>
          <span>
            <strong style={{ color: 'var(--text)' }}>{totalIncomplete}</strong> unresolved deadlines
          </span>
        </div>
      </div>

      {/* Grid Container */}
      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: '500px', position: 'relative' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          
          {/* Days Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: '600', fontSize: '11px', color: 'var(--muted-text)', paddingBottom: '6px', borderBottom: '1px solid var(--border)' }}>
            <div>SUN</div>
            <div>MON</div>
            <div>TUE</div>
            <div>WED</div>
            <div>THU</div>
            <div>FRI</div>
            <div>SAT</div>
          </div>

          {/* Cells Grid */}
          {tasksLoading ? (
            <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center', color: 'var(--muted-text)' }}>
              Loading tasks...
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gridTemplateRows: 'repeat(6, 1fr)',
              flex: 1,
              gap: '6px',
              background: 'var(--hover-bg, #F5F5F2)',
              padding: '6px',
              borderRadius: '10px',
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
                
                const sortedIncomplete = [...incompleteTasks].sort((a, b) => {
                  if (!a.due_date || !b.due_date) return 0
                  return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
                })

                const doneCount = cellHistory?.completed_tasks?.length || 0
                const isToday = new Date().toDateString() === cell.date.toDateString()
                const isSelected = selectedDay && selectedDay.toDateString() === cell.date.toDateString()

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDay(cell.date)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropOnDate(e, cell.date!)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      textAlign: 'left',
                      background: isSelected
                        ? 'var(--accent-light, #EEF4FF)'
                        : cell.isCurrentMonth
                        ? 'var(--card, #FFF)'
                        : 'transparent',
                      border: isSelected
                        ? '1px solid var(--accent, #3B6DD6)'
                        : isToday
                        ? '2px solid var(--accent, #3B6DD6)'
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
                    }}
                    type="button"
                  >
                    {/* Day label info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: isToday ? '700' : '600',
                        color: isToday ? 'var(--accent, #3B6DD6)' : cell.isCurrentMonth ? 'var(--text)' : 'var(--muted-text)',
                        background: isToday ? 'var(--accent-light, #EEF4FF)' : 'transparent',
                        padding: isToday ? '2px 6px' : '0',
                        borderRadius: '4px'
                      }}>
                        {cell.date.getDate()}
                      </span>
                      {doneCount > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', background: 'var(--green-light, #EDFBF3)', border: '1px solid rgba(45,168,107,0.2)', borderRadius: '12px', padding: '1px 5px', fontSize: '9px', color: 'var(--green, #2DA86B)', fontWeight: '600' }}>
                          ✓ {doneCount}
                        </span>
                      )}
                    </div>

                    {/* Task list chips */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden', flex: 1 }}>
                      {sortedIncomplete.slice(0, 3).map((task) => {
                        const timeStr = task.slot || ''

                        return (
                          <div
                            key={task.id}
                            draggable="true"
                            onDragStart={(e) => {
                              e.stopPropagation()
                              e.dataTransfer.setData('text/plain', task.id)
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              onTaskClick(task)
                            }}
                            style={{
                              fontSize: '9px',
                              lineHeight: '1.3',
                              padding: '2px 4px',
                              borderRadius: '4px',
                              background: task.priority === 'high' ? 'var(--red-light, #FEF0F0)' : 'var(--accent-light, #EEF4FF)',
                              borderLeft: task.priority === 'high' ? '2px solid var(--red, #D44)' : '2px solid var(--accent, #3B6DD6)',
                              color: task.priority === 'high' ? 'var(--red, #D44)' : 'var(--accent, #3B6DD6)',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                              cursor: 'grab'
                            }}
                            title={`${timeStr ? timeStr + ' - ' : ''}${task.title}`}
                          >
                            {timeStr && <span style={{ opacity: 0.7, marginRight: '3px', fontWeight: 'bold' }}>{timeStr}</span>}
                            {task.title}
                          </div>
                        )
                      })}
                      {sortedIncomplete.length > 3 && (
                        <div style={{ fontSize: '8px', color: 'var(--muted-text)', textAlign: 'center', paddingTop: '2px' }}>
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
            width: '300px',
            background: 'var(--card, #FFF)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            zIndex: 10,
            boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.05)',
          }}>
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text)', fontWeight: '700' }}>
                  {selectedDay.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--muted-text)' }}>Day Summary</span>
              </div>
              <button
                className="icon-button"
                onClick={() => setSelectedDay(null)}
                style={{ padding: '4px', background: 'var(--hover-bg, #F5F5F2)', borderRadius: '50%', border: 'none', cursor: 'pointer' }}
                type="button"
              >
                <X size={14} />
              </button>
            </div>

            {/* Drawer Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Deadlines Section */}
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--secondary-text)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                  <Clock size={12} style={{ color: 'var(--accent, #3B6DD6)' }} />
                  Deadlines ({selectedDayDeadlines.length})
                </h4>
                {selectedDayDeadlines.length === 0 ? (
                  <div style={{ padding: '10px', background: 'var(--hover-bg, #F5F5F2)', border: '1px dashed var(--border)', borderRadius: '6px', fontSize: '11px', color: 'var(--muted-text)', textAlign: 'center' }}>
                    No deadlines
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedDayDeadlines.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => onTaskClick(task)}
                        style={{
                          padding: '10px',
                          background: 'var(--card, #FFF)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                        className="hover:border-accent"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text)', wordBreak: 'break-word' }}>
                            {task.title}
                          </span>
                          {task.slot && (
                            <span style={{ fontSize: '9px', color: 'var(--text)', background: 'var(--hover-bg, #F5F5F2)', padding: '2px 4px', borderRadius: '4px', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
                              {task.slot}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: 'var(--muted-text)', marginTop: '4px' }}>
                          <span>{task.client?.name || task.workflow?.client?.name || 'Internal'}</span>
                          <span style={{
                            padding: '1px 4px',
                            borderRadius: '4px',
                            background: task.priority === 'high' ? 'var(--red-light, #FEF0F0)' : 'var(--accent-light, #EEF4FF)',
                            color: task.priority === 'high' ? 'var(--red, #D44)' : 'var(--accent, #3B6DD6)',
                            fontWeight: 'bold'
                          }}>
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Completed Tasks Section */}
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--secondary-text)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                  <CheckCircle size={12} style={{ color: 'var(--green, #2DA86B)' }} />
                  Completed ({selectedDayDoneTasks.length})
                </h4>
                {selectedDayDoneTasks.length === 0 ? (
                  <div style={{ padding: '10px', background: 'var(--hover-bg, #F5F5F2)', border: '1px dashed var(--border)', borderRadius: '6px', fontSize: '11px', color: 'var(--muted-text)', textAlign: 'center' }}>
                    No completed tasks
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedDayDoneTasks.map((task) => (
                      <div
                        key={task.id}
                        style={{
                          padding: '10px',
                          background: 'var(--green-light, #EDFBF3)',
                          border: '1px solid rgba(45, 168, 107, 0.15)',
                          borderRadius: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text)', wordBreak: 'break-word', textDecoration: 'line-through', opacity: 0.7 }}>
                            {task.title}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: 'var(--muted-text)', marginTop: '4px' }}>
                          <span>{task.client_name}</span>
                          <span>{task.workflow_title}</span>
                        </div>
                      </div>
                    ))}
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
