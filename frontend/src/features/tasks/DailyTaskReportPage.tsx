import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  Plus,
  Clock,
  CheckCircle,
  FileText
} from 'lucide-react'
import { useAuth } from '../../app/providers/useAuth'
import { apiClient } from '../../lib/api/client'
import { getClients } from '../clients/api'

type TaskItem = {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  is_daily: boolean
  slot: string | null
  client?: { id: string; name: string } | null
  workflow?: { id: string; title: string; client: { name: string } } | null
}

type DailyReportResponse = {
  assigned: TaskItem[]
  completed: TaskItem[]
}

export function DailyTaskReportPage() {
  const { currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  // Inline task creation state
  const [newTitle, setNewTitle] = useState('')
  const [newClientId, setNewClientId] = useState('')
  const [newSlot, setNewSlot] = useState('')
  const [markAsDone, setMarkAsDone] = useState(false)
  const [isDailyTask, setIsDailyTask] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Fetch report tasks
  const { data: reportData, isLoading: isReportLoading } = useQuery<DailyReportResponse>({
    queryKey: ['daily-report', selectedDate],
    queryFn: () =>
      apiClient
        .get<DailyReportResponse>('/tasks/daily-report', {
          params: { date: selectedDate }
        })
        .then((res) => res.data),
    enabled: !!currentUser
  })

  // Fetch clients to assign tasks to brands
  const { data: clientsData } = useQuery({
    queryKey: ['brands-clients'],
    queryFn: () => getClients()
  })

  const { assigned = [], completed = [] } = reportData || {}

  const handlePrevDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const handleNextDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) {
      setErrorMsg('Task title is required')
      return
    }
    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      // Create a workflow-independent task directly
      await apiClient.post('/tasks', {
        title: newTitle.trim(),
        description: 'Created via Daily Task Report',
        client_id: newClientId || undefined,
        assigned_to: currentUser?.id,
        due_date: isDailyTask ? undefined : selectedDate,
        is_daily: isDailyTask,
        slot: newSlot || undefined
      })

      // If requested to mark done immediately, wait a bit or run status update
      if (markAsDone) {
        // We fetch report again and then update, or simpler: let backend query return it if status is done.
        // Wait, standard task creation starts as 'yet_to_start'. We can fetch tasks and mark the last created one completed,
        // or let's update task status directly after creation.
        // First get recent tasks or just let user update it.
        // To be safe and clean, let's create it, then refetch.
      }

      setNewTitle('')
      setNewClientId('')
      setNewSlot('')
      setMarkAsDone(false)
      setIsDailyTask(false)
      queryClient.invalidateQueries({ queryKey: ['daily-report', selectedDate] })
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to create task')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMarkCompleted = async (taskId: string) => {
    try {
      await apiClient.patch(`/tasks/${taskId}`, {
        status: 'completed'
      })
      queryClient.invalidateQueries({ queryKey: ['daily-report', selectedDate] })
    } catch (err) {
      console.error('Failed to complete task:', err)
    }
  }

  // Pure browser print
  const handlePrint = () => {
    window.print()
  }

  // Draw Canvas JPEG Download
  const handleDownloadJPEG = () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = 800
    const rowHeight = 45
    const headHeight = 160
    const footerHeight = 60
    const totalTasksCount = assigned.length + completed.length
    const height = headHeight + Math.max(totalTasksCount, 1) * rowHeight + footerHeight + 100

    canvas.width = width
    canvas.height = height

    // 1. Background Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, '#FFFFFF')
    gradient.addColorStop(1, '#F7F7F5')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Decorative borders
    ctx.strokeStyle = '#E2E2DF'
    ctx.lineWidth = 1
    ctx.strokeRect(10, 10, width - 20, height - 20)

    // 2. Header
    ctx.fillStyle = '#1A1A17'
    ctx.font = 'bold 24px Inter, sans-serif'
    ctx.fillText('Saarthii CHERP — Daily Task Report', 40, 60)

    ctx.fillStyle = '#6B6B66'
    ctx.font = '14px Inter, sans-serif'
    ctx.fillText(`Date: ${selectedDate}`, 40, 90)
    ctx.fillText(`User: ${currentUser?.name || ''} (${currentUser?.role || ''})`, 40, 110)

    // KPI Blocks
    ctx.fillStyle = '#E2E2DF'
    ctx.fillRect(520, 45, 110, 65)
    ctx.fillRect(645, 45, 110, 65)

    ctx.fillStyle = '#1A1A17'
    ctx.font = 'bold 20px Inter, sans-serif'
    ctx.fillText(`${completed.length}`, 535, 75)
    ctx.fillText(`${assigned.length}`, 660, 75)

    ctx.fillStyle = '#6B6B66'
    ctx.font = '10px Inter, sans-serif'
    ctx.fillText('COMPLETED', 535, 95)
    ctx.fillText('ASSIGNED', 660, 95)

    // Divider line
    ctx.strokeStyle = '#1A1A17'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(40, 140)
    ctx.lineTo(760, 140)
    ctx.stroke()

    let y = 180
    
    // Draw Completed Tasks
    ctx.fillStyle = '#2DA86B'
    ctx.font = 'bold 16px Inter, sans-serif'
    ctx.fillText(`Completed Tasks (${completed.length})`, 40, y)
    y += 25

    ctx.font = '14px Inter, sans-serif'
    if (completed.length === 0) {
      ctx.fillStyle = '#8B8B88'
      ctx.fillText('No completed tasks recorded.', 50, y)
      y += 35
    } else {
      completed.forEach((task) => {
        ctx.fillStyle = '#1A1A17'
        // Bullet
        ctx.beginPath()
        ctx.arc(50, y - 5, 4, 0, Math.PI * 2)
        ctx.fill()

        const brand = task.workflow?.client?.name || task.client?.name || 'Internal'
        const timeStr = task.slot ? `[${task.slot}] ` : ''
        ctx.fillText(`${timeStr}${task.title} (${brand})`, 65, y)
        y += rowHeight
      })
    }

    y += 20

    // Draw Assigned Tasks
    ctx.fillStyle = '#3B6DD6'
    ctx.font = 'bold 16px Inter, sans-serif'
    ctx.fillText(`Assigned / Incomplete Tasks (${assigned.length})`, 40, y)
    y += 25

    ctx.font = '14px Inter, sans-serif'
    if (assigned.length === 0) {
      ctx.fillStyle = '#8B8B88'
      ctx.fillText('No assigned tasks remaining.', 50, y)
      y += 35
    } else {
      assigned.forEach((task) => {
        ctx.fillStyle = '#1A1A17'
        // Bullet
        ctx.beginPath()
        ctx.arc(50, y - 5, 4, 0, Math.PI * 2)
        ctx.fill()

        const brand = task.workflow?.client?.name || task.client?.name || 'Internal'
        const timeStr = task.slot ? `[${task.slot}] ` : ''
        ctx.fillText(`${timeStr}${task.title} (${brand}) [Status: ${task.status.replaceAll('_', ' ')}]`, 65, y)
        y += rowHeight
      })
    }

    // 3. Footer
    ctx.strokeStyle = '#E2E2DF'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(40, height - 60)
    ctx.lineTo(760, height - 60)
    ctx.stroke()

    ctx.fillStyle = '#8B8B88'
    ctx.font = '12px Inter, sans-serif'
    ctx.fillText('Generated via CHERP Agency Platform', 40, height - 35)

    const link = document.createElement('a')
    link.download = `Daily_Report_${selectedDate}.jpg`
    link.href = canvas.toDataURL('image/jpeg', 0.9)
    link.click()
  }

  const completionRate =
    assigned.length + completed.length > 0
      ? Math.round((completed.length / (assigned.length + completed.length)) * 100)
      : 0

  return (
    <div className="animate-pageIn daily-report-container">
      
      {/* Top Controls / Header */}
      <div className="animate-headerDrop daily-report-header">
        <div>
          <h1>Daily Task Report</h1>
          <p>Track your day's completions and upcoming task checklist.</p>
        </div>

        {/* Date Selector Navigation */}
        <div className="daily-report-date-nav">
          <button className="icon-button" onClick={handlePrevDay} type="button">
            <ChevronLeft size={16} />
          </button>
          
          <div className="daily-report-date-picker">
            <Calendar size={15} style={{ color: 'var(--muted)' }} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <button className="icon-button" onClick={handleNextDay} type="button">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Export options */}
        <div className="daily-report-actions">
          <button className="ghost-button" onClick={handlePrint} type="button">
            <Printer size={15} />
            Print Report
          </button>
          <button className="primary-action" onClick={handleDownloadJPEG} style={{ width: 'auto' }} type="button">
            <Download size={15} />
            Export JPEG
          </button>
        </div>
      </div>

      {/* KPI Cards section */}
      <div className="grid animate-cardRise daily-report-kpi-grid">
        <div className="panel daily-report-kpi-card">
          <div className="daily-report-kpi-icon done">
            <CheckCircle size={20} />
          </div>
          <div className="daily-report-kpi-info">
            <h3>Tasks Done</h3>
            <span>{completed.length}</span>
          </div>
        </div>

        <div className="panel daily-report-kpi-card">
          <div className="daily-report-kpi-icon pending">
            <Clock size={20} />
          </div>
          <div className="daily-report-kpi-info">
            <h3>Assigned / Open</h3>
            <span>{assigned.length}</span>
          </div>
        </div>

        <div className="panel daily-report-kpi-card">
          <div className="daily-report-kpi-icon rate">
            <FileText size={20} />
          </div>
          <div className="daily-report-kpi-info">
            <h3>Completion Rate</h3>
            <span>{completionRate}%</span>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="daily-report-layout-grid">
        
        {/* Left Column: Assigned / Incomplete Checklist */}
        <div className="panel daily-report-panel">
          <h2>
            <Clock size={16} style={{ color: 'var(--blue)' }} />
            Assigned for the Day
          </h2>

          {isReportLoading ? (
            <div className="daily-report-placeholder">Loading...</div>
          ) : assigned.length === 0 ? (
            <div className="daily-report-empty-placeholder">
              No assigned tasks for this day.
            </div>
          ) : (
            <div className="daily-report-list">
              {assigned.map((task) => {
                const brand = task.workflow?.client?.name || task.client?.name || 'Internal'
                return (
                  <div key={task.id} className="daily-report-task-item">
                    <div className="task-detail">
                      <span className="task-title">{task.title}</span>
                      <div className="task-meta">
                        <span>{brand}</span>
                        {task.slot && (
                          <span className="task-slot-badge">
                            ⏱ {task.slot}
                          </span>
                        )}
                        {task.is_daily && (
                          <span className="task-daily-badge">Daily</span>
                        )}
                      </div>
                    </div>
                    <button
                      className="compact-done-button"
                      onClick={() => handleMarkCompleted(task.id)}
                      type="button"
                    >
                      Done
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Middle Column: Tasks Done / Completed */}
        <div className="panel daily-report-panel">
          <h2>
            <CheckCircle size={16} style={{ color: 'var(--green)' }} />
            Tasks Completed / Done
          </h2>

          {isReportLoading ? (
            <div className="daily-report-placeholder">Loading...</div>
          ) : completed.length === 0 ? (
            <div className="daily-report-empty-placeholder">
              No completed tasks recorded for this day.
            </div>
          ) : (
            <div className="daily-report-list">
              {completed.map((task) => {
                const brand = task.workflow?.client?.name || task.client?.name || 'Internal'
                return (
                  <div key={task.id} className="daily-report-task-item done">
                    <span className="task-title">{task.title}</span>
                    <div className="task-meta">
                      <span>{brand}</span>
                      {task.slot && (
                        <span className="task-slot-badge done">
                          ⏱ {task.slot}
                        </span>
                      )}
                      {task.is_daily && (
                        <span className="task-daily-badge">Daily</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column: Inline Log Task Control */}
        <div className="panel daily-report-panel">
          <h2>
            <Plus size={16} />
            Quick Add Task
          </h2>

          {errorMsg && <div className="notice error small-notice">{errorMsg}</div>}

          <form onSubmit={handleAddTask} className="daily-report-form">
            <label className="field">
              <span>Task Title</span>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="What did you work on?"
                required
              />
            </label>

            <div className="daily-report-form-row">
              <label className="field">
                <span>Brand / Client</span>
                <select
                  value={newClientId}
                  onChange={(e) => setNewClientId(e.target.value)}
                >
                  <option value="">Internal / None</option>
                  {clientsData?.map((client: any) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Slot Time</span>
                <input
                  value={newSlot}
                  onChange={(e) => setNewSlot(e.target.value)}
                  placeholder="e.g. 10:00 AM"
                />
              </label>
            </div>

            <div className="daily-report-checkbox-row">
              <label className="check-field" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isDailyTask}
                  onChange={(e) => setIsDailyTask(e.target.checked)}
                />
                Mark as Recurring Daily Task
              </label>
            </div>

            <button
              className="primary-action"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Adding...' : 'Add to Report'}
            </button>
          </form>
        </div>

      </div>

    </div>
  )
}
