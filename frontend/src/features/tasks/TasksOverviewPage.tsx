import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  X,
  Plus,
  Search,
  Filter,
  Table,
  Kanban,
  Calendar,
  BarChart4
} from 'lucide-react'
import React, { useMemo, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../app/providers/useAuth'
import { ShinyText } from '../../components/ui/ShinyText'
import { normalizeApiError } from '../../lib/api/errors'
import { canManageTasks } from '../../lib/permissions/roles'
import { getClients } from '../clients/api'
import {
  getUsers,
  updateTask,
  getTasks,
  createTask,
  getTask,
  type WorkflowTask,
  type UserOption,
} from '../workflows/api'
import { type ClientRow } from '../clients/api'

// View subcomponents
import { TaskGridView } from './components/TaskGridView'
import { TaskBoardView } from './components/TaskBoardView'
import { TaskCalendarView } from './components/TaskCalendarView'
import { TaskChartsView } from './components/TaskChartsView'
import { TaskDetailsDrawer } from './components/TaskDetailsDrawer'

interface FilterState {
  assigneeIds: string[]
  labels: string[]
  priorities: string[]
  clientIds: string[]
  statuses: string[]
  slots: string[]
  dueDateFilter: 'overdue' | 'today' | 'tomorrow' | 'week' | 'next_week' | 'custom' | null
  customStartDate: string
  customEndDate: string
}

// Encode filterState and searchText to URLSearchParams
const updateURL = (filters: FilterState, search: string, activeTab: string, groupBy: string) => {
  const params = new URLSearchParams()
  params.set('view', activeTab)
  params.set('groupBy', groupBy)
  if (search) params.set('search', search)
  
  if (filters.assigneeIds.length > 0) params.set('assignees', filters.assigneeIds.join(','))
  if (filters.labels.length > 0) params.set('labels', filters.labels.join(','))
  if (filters.priorities.length > 0) params.set('priorities', filters.priorities.join(','))
  if (filters.clientIds.length > 0) params.set('clients', filters.clientIds.join(','))
  if (filters.statuses.length > 0) params.set('statuses', filters.statuses.join(','))
  if (filters.slots.length > 0) params.set('slots', filters.slots.join(','))
  if (filters.dueDateFilter) params.set('dueDate', filters.dueDateFilter)
  if (filters.customStartDate) params.set('customStart', filters.customStartDate)
  if (filters.customEndDate) params.set('customEnd', filters.customEndDate)
  
  const newUrl = `${window.location.pathname}?${params.toString()}`
  window.history.replaceState({}, '', newUrl)
}

// Decode URLSearchParams to filterState on mount
const parseURLParams = () => {
  const params = new URLSearchParams(window.location.search)
  const activeTab = params.get('view') || 'board'
  const groupBy = params.get('groupBy') || 'bucket'
  const searchText = params.get('search') || ''
  
  const assigneeIds = params.get('assignees') ? params.get('assignees')!.split(',').filter(Boolean) : []
  const labels = params.get('labels') ? params.get('labels')!.split(',').filter(Boolean) : []
  const priorities = params.get('priorities') ? params.get('priorities')!.split(',').filter(Boolean) : []
  const clientIds = params.get('clients') ? params.get('clients')!.split(',').filter(Boolean) : []
  const statuses = params.get('statuses') ? params.get('statuses')!.split(',').filter(Boolean) : []
  const slots = params.get('slots') ? params.get('slots')!.split(',').filter(Boolean) : []
  const dueDateFilter = params.get('dueDate') || null
  const customStartDate = params.get('customStart') || ''
  const customEndDate = params.get('customEnd') || ''
  
  return {
    activeTab,
    groupBy,
    searchText,
    filters: {
      assigneeIds,
      labels,
      priorities,
      clientIds,
      statuses,
      slots,
      dueDateFilter: dueDateFilter as any,
      customStartDate,
      customEndDate
    }
  }
}

export function TasksOverviewPage({ initialTaskId }: { initialTaskId?: string | null } = {}) {
  const queryClient = useQueryClient()
  const { currentUser } = useAuth()
  const canManage = currentUser ? canManageTasks(currentUser.role) : false

  const parsed = useMemo(() => parseURLParams(), [])

  // State Management
  const [activeTab, setActiveTab] = useState(parsed.activeTab)
  const [groupBy, setGroupBy] = useState<'bucket' | 'assigned_to' | 'label' | 'due_date' | 'priority' | 'status' | 'slot'>(parsed.groupBy as any)
  const [searchText, setSearchText] = useState(parsed.searchText)
  const [filterState, setFilterState] = useState<FilterState>(parsed.filters as any)

  const [showFilterPopover, setShowFilterPopover] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<WorkflowTask | null>(null)

  // Sync to URL
  useEffect(() => {
    updateURL(filterState, searchText, activeTab, groupBy)
  }, [filterState, searchText, activeTab, groupBy])

  // Auto-open task if initialTaskId is provided
  useEffect(() => {
    if (initialTaskId) {
      getTask(initialTaskId)
        .then((task) => {
          setSelectedTask(task)
        })
        .catch((err) => {
          console.error('Failed to auto-open task', err)
        })
    }
  }, [initialTaskId])

  // Queries
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: currentUser?.role === 'super_admin' || currentUser?.role === 'project_manager',
  })

  const { data: clients = [] } = useQuery({
    queryKey: ['brands-clients'],
    queryFn: () => getClients(),
  })

  // Fallback assignee list for team members (who cannot query all users)
  const allUsers = useMemo(() => {
    if (users.length > 0) return users
    if (currentUser) {
      return [{ id: currentUser.id, full_name: currentUser.name, email: currentUser.email }] as UserOption[]
    }
    return []
  }, [users, currentUser])

  // Calculate API Query Params
  const queryParams = useMemo(() => {
    const params: any = {}
    if (searchText) params.searchText = searchText
    if (filterState.assigneeIds.length > 0) params.assigneeIds = filterState.assigneeIds
    if (filterState.labels.length > 0) params.labels = filterState.labels
    if (filterState.priorities.length > 0) params.priorities = filterState.priorities
    if (filterState.clientIds.length > 0) params.clientIds = filterState.clientIds
    if (filterState.slots.length > 0) params.slots = filterState.slots
    
    if (filterState.statuses.length > 0) {
      params.statuses = filterState.statuses
    }

    let start: string | undefined
    let end: string | undefined
    
    if (filterState.dueDateFilter === 'overdue') {
      if (!params.statuses) params.statuses = []
      if (!params.statuses.includes('late')) {
        params.statuses = [...params.statuses, 'late']
      }
    } else if (filterState.dueDateFilter === 'today') {
      const today = new Date()
      today.setHours(0,0,0,0)
      start = today.toISOString()
      today.setHours(23,59,59,999)
      end = today.toISOString()
    } else if (filterState.dueDateFilter === 'tomorrow') {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0,0,0,0)
      start = tomorrow.toISOString()
      tomorrow.setHours(23,59,59,999)
      end = tomorrow.toISOString()
    } else if (filterState.dueDateFilter === 'week') {
      const today = new Date()
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()))
      startOfWeek.setHours(0,0,0,0)
      const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6))
      endOfWeek.setHours(23,59,59,999)
      start = startOfWeek.toISOString()
      end = endOfWeek.toISOString()
    } else if (filterState.dueDateFilter === 'next_week') {
      const today = new Date()
      const startOfNextWeek = new Date(today.setDate(today.getDate() - today.getDay() + 7))
      startOfNextWeek.setHours(0,0,0,0)
      const endOfNextWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6))
      endOfNextWeek.setHours(23,59,59,999)
      start = startOfNextWeek.toISOString()
      end = endOfNextWeek.toISOString()
    } else if (filterState.dueDateFilter === 'custom' && filterState.customStartDate && filterState.customEndDate) {
      start = new Date(filterState.customStartDate + 'T00:00:00.000Z').toISOString()
      end = new Date(filterState.customEndDate + 'T23:59:59.000Z').toISOString()
    }
    
    if (start && end) {
      params.startDate = start
      params.endDate = end
    }
    
    return params
  }, [filterState, searchText])

  // Fetch tasks
  const { data: tasks = [], isLoading: tasksLoading, error: tasksError } = useQuery({
    queryKey: ['planner-tasks', queryParams],
    queryFn: () => getTasks(queryParams),
  })

  const handleUpdateTask = async (taskId: string, fields: any) => {
    try {
      const updated = await updateTask(taskId, fields)
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(updated)
      }
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks-analytics'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] })
      return updated
    } catch (err) {
      console.error('Failed to update task', err)
      throw err
    }
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['planner-tasks'] })
    queryClient.invalidateQueries({ queryKey: ['tasks-analytics'] })
    queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] })
  }

  const clearAllFilters = () => {
    setFilterState({
      assigneeIds: [],
      labels: [],
      priorities: [],
      clientIds: [],
      statuses: [],
      slots: [],
      dueDateFilter: null,
      customStartDate: '',
      customEndDate: ''
    })
    setSearchText('')
  }

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filterState.assigneeIds.length > 0) count++
    if (filterState.labels.length > 0) count++
    if (filterState.priorities.length > 0) count++
    if (filterState.clientIds.length > 0) count++
    if (filterState.statuses.length > 0) count++
    if (filterState.slots.length > 0) count++
    if (filterState.dueDateFilter) count++
    if (searchText) count++
    return count
  }, [filterState, searchText])

  const viewTabs = [
    { id: 'grid', label: 'Grid', icon: <Table size={14} /> },
    { id: 'board', label: 'Board', icon: <Kanban size={14} /> },
    { id: 'calendar', label: 'Calendar', icon: <Calendar size={14} /> },
    { id: 'charts', label: 'Charts', icon: <BarChart4 size={14} /> }
  ]

  const errorMessage = tasksError ? normalizeApiError(tasksError).message : null

  return (
    <section className="tasks-overview-page" data-testid="tasks-overview-page" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* Header toolbar container */}
      <div className="tasks-page-header" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '16px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--card)',
        position: 'relative',
        zIndex: 50
      }}>
        {/* Row 1: Title & Action Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Operations Command Center
            </p>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'var(--text)' }}>
              <ShinyText text="Tasks Workspace" speed={4} />
            </h1>
          </div>

          {/* Create Task Button (Only if PM/Admin) */}
          {canManage && (
            <button
              className="primary-action compact"
              onClick={() => setShowCreateModal(true)}
              style={{ height: '34px', padding: '0 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', width: 'auto', margin: 0 }}
            >
              <Plus size={14} /> New Task
            </button>
          )}
        </div>

        {/* Row 2: Tabs & View Controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          {/* Tab switches & Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Tab switches */}
            <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '2px', border: '1px solid var(--border)' }}>
              {viewTabs.map(tab => (
                <button
                  key={tab.id}
                  data-testid={`view-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    border: 'none',
                    background: activeTab === tab.id ? 'var(--card)' : 'transparent',
                    color: activeTab === tab.id ? 'var(--blue)' : 'var(--secondary)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Filter Popover Button */}
            <div style={{ position: 'relative' }}>
              <button
                className="ghost-button"
                data-testid="filter-toggle-button"
                onClick={() => setShowFilterPopover(!showFilterPopover)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '34px',
                  padding: '0 12px',
                  fontSize: '13px',
                  background: showFilterPopover ? 'var(--hover)' : 'var(--card)'
                }}
              >
                <Filter size={14} />
                Filter
                {activeFiltersCount > 0 && (
                  <span style={{
                    background: 'var(--blue)',
                    color: '#FFF',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    marginLeft: '2px'
                  }}>
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Nested dropdown panel */}
              {showFilterPopover && (
                <FilterPopoverPanel
                  filterState={filterState}
                  setFilterState={setFilterState}
                  users={allUsers}
                  clients={clients}
                  onClose={() => setShowFilterPopover(false)}
                  clearAll={clearAllFilters}
                />
              )}
            </div>
          </div>

          {/* Controls: Search, Group By */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
              
              {/* Text Search */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 10px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                background: 'var(--input)',
                width: '200px',
                height: '34px'
              }}>
                <Search size={14} style={{ color: 'var(--muted)' }} />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '12px',
                    color: 'var(--text)',
                    width: '100%'
                  }}
                />
                {searchText && (
                  <button
                    onClick={() => setSearchText('')}
                    style={{ border: 'none', background: 'transparent', padding: 0, color: 'var(--muted)', cursor: 'pointer' }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Group By selector (Only for Board view) */}
              {activeTab === 'board' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--secondary)', fontWeight: '500' }}>Group by:</span>
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as any)}
                    style={{
                      height: '34px',
                      padding: '0 8px',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      background: 'var(--card)',
                      fontSize: '12px',
                      color: 'var(--text)',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="bucket">Brand / Bucket</option>
                    <option value="assigned_to">Assigned To</option>
                    <option value="label">Label</option>
                    <option value="due_date">Due Date</option>
                    <option value="priority">Priority</option>
                    <option value="status">Status</option>
                    <option value="slot">Slot</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {errorMessage ? <div className="notice error" style={{ margin: '16px 24px 0' }}>{errorMessage}</div> : null}

      {/* Main Scrollable View Area */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        {tasksLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: 'var(--secondary)' }}>
            <span>Loading workspace tasks...</span>
          </div>
        ) : (
          <>
            {activeTab === 'grid' && (
              <TaskGridView
                tasks={tasks}
                users={allUsers}
                onTaskClick={setSelectedTask}
                onUpdateTask={handleUpdateTask}
              />
            )}
            {activeTab === 'board' && (
              <TaskBoardView
                tasks={tasks}
                users={allUsers}
                groupBy={groupBy}
                onTaskClick={setSelectedTask}
                onRefresh={handleRefresh}
              />
            )}
            {activeTab === 'calendar' && (
              <TaskCalendarView
                filters={queryParams}
                users={allUsers}
                onTaskClick={setSelectedTask}
                onUpdateTask={handleUpdateTask}
              />
            )}
            {activeTab === 'charts' && (
              <TaskChartsView
                filters={queryParams}
              />
            )}
          </>
        )}
      </div>

      {/* Slide Drawer/Modal details edit */}
      {selectedTask && (
        <TaskDetailsDrawer
          task={selectedTask}
          users={allUsers}
          onClose={() => setSelectedTask(null)}
          onSuccess={handleRefresh}
          onUpdateTask={handleUpdateTask}
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateTaskModal
          users={allUsers}
          clients={clients}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleRefresh}
        />
      )}

    </section>
  )
}

// ==================== CREATE TASK MODAL ====================
function CreateTaskModal({
  users,
  clients,
  onClose,
  onSuccess,
}: {
  users: UserOption[]
  clients: ClientRow[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [clientId, setClientId] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [dueDate, setDueDate] = useState('')
  const [isDaily, setIsDaily] = useState(false)
  const [slot, setSlot] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Default brand selection to first brand if available
  useEffect(() => {
    if (clients.length > 0 && !clientId) {
      setClientId(clients[0].id)
    }
  }, [clients, clientId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!clientId) {
      setError('Brand selection is required')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      await createTask({
        title,
        description,
        client_id: clientId,
        assigned_to: assignedTo || undefined,
        priority,
        due_date: isDaily ? undefined : (dueDate || undefined),
        is_daily: isDaily,
        slot: slot || undefined,
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(normalizeApiError(err).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return createPortal(
    <div className="modal-backdrop" role="dialog" aria-modal="true" style={{ zIndex: 1100 }}>
      <section className="task-detail-modal" style={{ maxWidth: '520px', padding: '24px' }}>
        <div className="panel-header" style={{ marginBottom: '16px' }}>
          <h2>Create Custom Task</h2>
          <button className="icon-button" onClick={onClose} type="button" aria-label="Close modal">
            <X size={17} />
          </button>
        </div>
        {error ? <div className="notice error" style={{ marginBottom: '16px' }}>{error}</div> : null}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <label className="field" style={{ marginTop: 0 }}>
            <span>Task Title *</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Schedule June Content Calendar"
              style={{ background: 'var(--input)' }}
            />
          </label>

          <label className="field" style={{ marginTop: 0 }}>
            <span>Brand (Bucket) *</span>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              style={{ background: 'var(--input)' }}
            >
              <option value="" disabled>Select Brand...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          <label className="field" style={{ marginTop: 0 }}>
            <span>Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe the deliverables..."
              rows={3}
              style={{ background: 'var(--input)' }}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label className="field" style={{ marginTop: 0 }}>
              <span>Assignee</span>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                style={{ background: 'var(--input)' }}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field" style={{ marginTop: 0 }}>
              <span>Priority</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                style={{ background: 'var(--input)' }}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label className="field" style={{ marginTop: 0 }}>
              <span>Due Date</span>
              <input
                type="date"
                value={isDaily ? '' : dueDate}
                disabled={isDaily}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ background: 'var(--input)', opacity: isDaily ? 0.5 : 1 }}
              />
            </label>

            <label className="field" style={{ marginTop: 0 }}>
              <span>Slot Assignment</span>
              <select
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                style={{ background: 'var(--input)' }}
              >
                <option value="">Unslotted</option>
                <option value="Slot 1">Slot 1</option>
                <option value="Slot 2">Slot 2</option>
                <option value="Slot 3">Slot 3</option>
                <option value="Slot 4">Slot 4</option>
                <option value="Slot 5">Slot 5</option>
                <option value="Slot 6">Slot 6</option>
                <option value="Slot 7">Slot 7</option>
                <option value="Slot 8">Slot 8</option>
                <option value="Slot 9">Slot 9</option>
                <option value="Slot 10">Slot 10</option>
                <option value="Slot 11">Slot 11</option>
              </select>
            </label>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '600', color: 'var(--secondary)', cursor: 'pointer', marginTop: '4px' }}>
            <input
              type="checkbox"
              checked={isDaily}
              onChange={(e) => setIsDaily(e.target.checked)}
            />
            Daily Task (Recurring Everyday)
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button className="ghost-button" onClick={onClose} type="button">Cancel</button>
            <button className="primary-action" type="submit" disabled={isSubmitting} style={{ width: 'auto', margin: 0 }}>
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body
  )
}

// ==================== FILTER POPOVER PANEL ====================
function FilterPopoverPanel({
  filterState,
  setFilterState,
  users,
  clients,
  onClose: _onClose,
  clearAll
}: {
  filterState: FilterState
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>
  users: UserOption[]
  clients: ClientRow[]
  onClose: () => void
  clearAll: () => void
}) {
  const [activeCat, setActiveCat] = useState<'assignment' | 'labels' | 'priority' | 'bucket' | 'status' | 'dueDate' | 'slot'>('assignment')
  const [userSearch, setUserSearch] = useState('')
  const [brandSearch, setBrandSearch] = useState('')

  const categories = [
    { id: 'assignment', label: 'Assignment' },
    { id: 'labels', label: 'Labels' },
    { id: 'priority', label: 'Priority' },
    { id: 'bucket', label: 'Bucket (Brand)' },
    { id: 'status', label: 'Status' },
    { id: 'dueDate', label: 'Due Date' },
    { id: 'slot', label: 'Slot' }
  ] as const

  const toggleFilter = (field: keyof FilterState, value: string) => {
    setFilterState(prev => {
      const arr = prev[field] as string[]
      const next = arr.includes(value) ? arr.filter(item => item !== value) : [...arr, value]
      return { ...prev, [field]: next }
    })
  }

  const filteredUsers = users.filter(u => u.full_name.toLowerCase().includes(userSearch.toLowerCase()))
  const filteredBrands = clients.filter(c => c.name.toLowerCase().includes(brandSearch.toLowerCase()))

  const labelColors: Record<string, { bg: string; text: string }> = {
    'Content Marketing': { bg: '#E0F2FE', text: '#0369A1' },
    'Search Engine Optimization': { bg: '#E0F8E9', text: '#15803D' },
    'Performance Marketing': { bg: '#FEE2E2', text: '#B91C1C' },
    'Strategy': { bg: '#F3E8FF', text: '#6B21A8' },
    'Creative Statics': { bg: '#FEF3C7', text: '#B45309' },
    'Video / Motion Graphics': { bg: '#FCE7F3', text: '#BE185D' },
    'Social Media': { bg: '#E0F7FA', text: '#006064' },
    'Follow Up': { bg: '#F1F5F9', text: '#334155' },
    'Website Dev': { bg: '#FFF1F2', text: '#9F1239' },
    'BM Task List': { bg: '#ECFDF5', text: '#047857' }
  }

  return (
    <div style={{
      position: 'absolute',
      top: '100%',
      left: 0,
      zIndex: 1000,
      width: '420px',
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      marginTop: '8px',
      display: 'flex',
      height: '360px',
      overflow: 'hidden'
    }}>
      {/* Left Column - Category Selector */}
      <div style={{
        width: '150px',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        padding: '8px 0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: '8px 16px', fontSize: '11px', fontWeight: 'bold', color: 'var(--muted)', textTransform: 'uppercase' }}>
          Filter by
        </div>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCat(cat.id)}
            style={{
              padding: '10px 16px',
              textAlign: 'left',
              border: 'none',
              background: activeCat === cat.id ? 'var(--card)' : 'transparent',
              color: activeCat === cat.id ? 'var(--blue)' : 'var(--text)',
              fontSize: '13px',
              fontWeight: activeCat === cat.id ? '700' : '500',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>{cat.label}</span>
            {activeCat === cat.id && <span style={{ width: '4px', height: '14px', background: 'var(--blue)', borderRadius: '2px' }} />}
          </button>
        ))}
        
        {/* Bottom clear all */}
        <button
          onClick={clearAll}
          style={{
            marginTop: 'auto',
            marginInline: '12px',
            marginBottom: '8px',
            padding: '8px',
            fontSize: '11px',
            fontWeight: 'bold',
            color: 'var(--red)',
            background: 'transparent',
            border: '1px solid rgba(221, 68, 68, 0.2)',
            borderRadius: '6px',
            cursor: 'pointer',
            textAlign: 'center'
          }}
        >
          Clear All Filters
        </button>
      </div>

      {/* Right Column - Category Options list */}
      <div style={{
        flex: 1,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        overflowY: 'auto'
      }}>
        {/* Category: Assignment */}
        {activeCat === 'assignment' && (
          <>
            <input
              type="text"
              placeholder="Search people..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '12px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                background: 'var(--input)',
                outline: 'none',
                color: 'var(--text)'
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text)' }}>
                <input
                  type="checkbox"
                  checked={filterState.assigneeIds.includes('unassigned')}
                  onChange={() => toggleFilter('assigneeIds', 'unassigned')}
                />
                <span style={{ fontStyle: 'italic', color: 'var(--secondary)' }}>Unassigned Tasks</span>
              </label>
              {filteredUsers.map(user => (
                <label key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text)' }}>
                  <input
                    type="checkbox"
                    checked={filterState.assigneeIds.includes(user.id)}
                    onChange={() => toggleFilter('assigneeIds', user.id)}
                  />
                  <span>{user.full_name}</span>
                </label>
              ))}
            </div>
          </>
        )}

        {/* Category: Labels */}
        {activeCat === 'labels' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(labelColors).map(([labelName, styling]) => {
              const isChecked = filterState.labels.includes(labelName)
              return (
                <label 
                  key={labelName} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    fontSize: '13px', 
                    cursor: 'pointer',
                    color: 'var(--text)' 
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleFilter('labels', labelName)}
                  />
                  <span style={{
                    backgroundColor: styling.bg,
                    color: styling.text,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '700'
                  }}>
                    {labelName}
                  </span>
                </label>
              )
            })}
          </div>
        )}

        {/* Category: Priority */}
        {activeCat === 'priority' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['high', 'medium', 'low'].map(prio => (
              <label key={prio} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text)', textTransform: 'capitalize' }}>
                <input
                  type="checkbox"
                  checked={filterState.priorities.includes(prio)}
                  onChange={() => toggleFilter('priorities', prio)}
                />
                <span>{prio}</span>
              </label>
            ))}
          </div>
        )}

        {/* Category: Bucket (Brand) */}
        {activeCat === 'bucket' && (
          <>
            <input
              type="text"
              placeholder="Search brands..."
              value={brandSearch}
              onChange={(e) => setBrandSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '12px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                background: 'var(--input)',
                outline: 'none',
                color: 'var(--text)'
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
              {filteredBrands.map(client => (
                <label key={client.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text)' }}>
                  <input
                    type="checkbox"
                    checked={filterState.clientIds.includes(client.id)}
                    onChange={() => toggleFilter('clientIds', client.id)}
                  />
                  <span>{client.name}</span>
                </label>
              ))}
            </div>
          </>
        )}

        {/* Category: Status */}
        {activeCat === 'status' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { id: 'yet_to_start', label: 'Not started' },
              { id: 'ongoing', label: 'In progress' },
              { id: 'blocked', label: 'Blocked' },
              { id: 'completed', label: 'Completed' },
              { id: 'late', label: 'Late' }
            ].map(status => (
              <label key={status.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text)' }}>
                <input
                  type="checkbox"
                  checked={filterState.statuses.includes(status.id)}
                  onChange={() => toggleFilter('statuses', status.id)}
                />
                <span>{status.label}</span>
              </label>
            ))}
          </div>
        )}

        {/* Category: Due Date */}
        {activeCat === 'dueDate' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { id: 'overdue', label: 'Overdue' },
              { id: 'today', label: 'Today' },
              { id: 'tomorrow', label: 'Tomorrow' },
              { id: 'week', label: 'This Week' },
              { id: 'next_week', label: 'Next Week' }
            ].map(item => (
              <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text)' }}>
                <input
                  type="radio"
                  name="dueDateFilter"
                  checked={filterState.dueDateFilter === item.id}
                  onChange={() => setFilterState(prev => ({ ...prev, dueDateFilter: item.id as any }))}
                />
                <span>{item.label}</span>
              </label>
            ))}
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text)' }}>
              <input
                type="radio"
                name="dueDateFilter"
                checked={filterState.dueDateFilter === 'custom'}
                onChange={() => setFilterState(prev => ({ ...prev, dueDateFilter: 'custom' }))}
              />
              <span>Custom Range</span>
            </label>

            {filterState.dueDateFilter === 'custom' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '20px' }}>
                <input
                  type="date"
                  value={filterState.customStartDate}
                  onChange={(e) => setFilterState(prev => ({ ...prev, customStartDate: e.target.value }))}
                  style={{ padding: '4px', fontSize: '11px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--card)', color: 'var(--text)' }}
                />
                <input
                  type="date"
                  value={filterState.customEndDate}
                  onChange={(e) => setFilterState(prev => ({ ...prev, customEndDate: e.target.value }))}
                  style={{ padding: '4px', fontSize: '11px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--card)', color: 'var(--text)' }}
                />
              </div>
            )}

            {filterState.dueDateFilter && (
              <button
                onClick={() => setFilterState(prev => ({ ...prev, dueDateFilter: null, customStartDate: '', customEndDate: '' }))}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  color: 'var(--secondary)',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  alignSelf: 'flex-start'
                }}
              >
                Clear Due Date Filter
              </button>
            )}
          </div>
        )}

        {/* Category: Slot */}
        {activeCat === 'slot' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { id: 'unslotted', label: 'Unslotted' },
              { id: 'Slot 1', label: 'Slot 1' },
              { id: 'Slot 2', label: 'Slot 2' },
              { id: 'Slot 3', label: 'Slot 3' },
              { id: 'Slot 4', label: 'Slot 4' },
              { id: 'Slot 5', label: 'Slot 5' },
              { id: 'Slot 6', label: 'Slot 6' },
              { id: 'Slot 7', label: 'Slot 7' },
              { id: 'Slot 8', label: 'Slot 8' },
              { id: 'Slot 9', label: 'Slot 9' },
              { id: 'Slot 10', label: 'Slot 10' },
              { id: 'Slot 11', label: 'Slot 11' }
            ].map(item => (
              <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text)' }}>
                <input
                  type="checkbox"
                  checked={filterState.slots.includes(item.id)}
                  onChange={() => toggleFilter('slots', item.id)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
