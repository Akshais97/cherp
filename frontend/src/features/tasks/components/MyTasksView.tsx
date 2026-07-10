import React, { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  X,
  Plus,
  Search,
  Filter,
  Table,
  Kanban,
  Calendar,
  AlertTriangle,
  CheckSquare,
  ChevronDown,
  Users,
  Tag,
  CircleDot,
  Check,
  Clock,
  CheckCircle2,
  FolderDot
} from 'lucide-react'
import { useAuth } from '../../../app/providers/useAuth'
import {
  getUsers,
  updateTask,
  getTasks,
  createTask,
  type WorkflowTask,
  type UserOption
} from '../../workflows/api'
import { TaskDetailsDrawer } from './TaskDetailsDrawer'

interface FilterState {
  priorities: string[]
  statuses: string[]
  dueDateFilter: 'overdue' | 'today' | 'tomorrow' | 'week' | 'next_week' | 'none' | null
}

const getSlotNumber = (slot: string | null | undefined): number => {
  if (!slot) return 999
  const match = slot.match(/\d+/)
  return match ? parseInt(match[0], 10) : 999
}

export function MyTasksView() {
  const queryClient = useQueryClient()
  const { currentUser } = useAuth()
  
  // State
  const [activeTab, setActiveTab] = useState<'board' | 'grid'>('board')
  const [scope, setScope] = useState<'all' | 'private' | 'assigned_to_me' | 'flagged_emails'>('assigned_to_me')
  const [groupBy, setGroupBy] = useState<'status' | 'due_date' | 'priority' | 'bucket' | 'assigned_to' | 'label'>('status')
  const [searchText, setSearchText] = useState('')
  const [showFilterPopover, setShowFilterPopover] = useState(false)
  const [showGroupByDropdown, setShowGroupByDropdown] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<WorkflowTask | null>(null)
  
  // Filter state
  const [filterState, setFilterState] = useState<FilterState>({
    priorities: [],
    statuses: [],
    dueDateFilter: null
  })

  // Inline add state for Board columns
  const [inlineAddTitle, setInlineAddTitle] = useState<Record<string, string>>({})
  const [inlineAddActive, setInlineAddActive] = useState<Record<string, boolean>>({})

  // Queries
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: currentUser?.role === 'super_admin' || currentUser?.role === 'project_manager',
  })



  // Fallback assignee list for team members
  const allUsers = useMemo(() => {
    if (users.length > 0) return users
    if (currentUser) {
      return [{ id: currentUser.id, full_name: currentUser.name, email: currentUser.email }] as UserOption[]
    }
    return []
  }, [users, currentUser])

  // Fetch only current user's tasks
  const { data: tasks = [], isLoading: tasksLoading, refetch } = useQuery({
    queryKey: ['planner-my-tasks', currentUser?.id],
    queryFn: () => getTasks({ assigneeIds: [currentUser?.id] }),
    enabled: !!currentUser?.id,
  })

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filterState.priorities.length > 0) count++
    if (filterState.statuses.length > 0) count++
    if (filterState.dueDateFilter) count++
    if (searchText) count++
    return count
  }, [filterState, searchText])

  const clearAllFilters = () => {
    setFilterState({
      priorities: [],
      statuses: [],
      dueDateFilter: null
    })
    setSearchText('')
  }

  // Filter tasks in frontend
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // 1. Filter by Scope
      if (scope === 'private') {
        const hasWorkflow = !!task.workflow_id
        const hasClient = !!task.client_id
        if (hasWorkflow || hasClient) return false
      } else if (scope === 'flagged_emails') {
        return false // Mocked email filter
      }

      // 2. Search Text
      if (searchText) {
        const text = searchText.toLowerCase()
        const titleMatch = task.title.toLowerCase().includes(text)
        const descMatch = task.description?.toLowerCase().includes(text) || false
        if (!titleMatch && !descMatch) return false
      }

      // 3. Priorities Filter
      if (filterState.priorities.length > 0) {
        if (!filterState.priorities.includes(task.priority)) return false
      }

      // 4. Status Filter
      if (filterState.statuses.length > 0) {
        const mappedStatus = ['completed', 'task_approved_by_manager', 'task_approved_by_client'].includes(task.status)
          ? 'completed'
          : ['ongoing', 'blocked', 'rework'].includes(task.status)
            ? 'in_progress'
            : 'not_started'
        if (!filterState.statuses.includes(mappedStatus)) return false
      }

      // 5. Due Date Filter
      if (filterState.dueDateFilter) {
        const isCompleted = ['completed', 'task_approved_by_manager', 'task_approved_by_client'].includes(task.status)
        if (!task.due_date) {
          if (filterState.dueDateFilter !== 'none') return false
        } else {
          const todayStr = new Date().toISOString().split('T')[0]
          const dueStr = new Date(task.due_date).toISOString().split('T')[0]
          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)
          const tomorrowStr = tomorrow.toISOString().split('T')[0]

          const now = new Date()
          const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
          const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6))
          const startOfNextWeek = new Date(now.setDate(now.getDate() - now.getDay() + 7))
          const endOfNextWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6))

          const dueTime = new Date(task.due_date).getTime()

          if (filterState.dueDateFilter === 'overdue') {
            if (dueStr >= todayStr || isCompleted) return false
          } else if (filterState.dueDateFilter === 'today') {
            if (dueStr !== todayStr) return false
          } else if (filterState.dueDateFilter === 'tomorrow') {
            if (dueStr !== tomorrowStr) return false
          } else if (filterState.dueDateFilter === 'week') {
            if (dueTime < startOfWeek.getTime() || dueTime > endOfWeek.getTime()) return false
          } else if (filterState.dueDateFilter === 'next_week') {
            if (dueTime < startOfNextWeek.getTime() || dueTime > endOfNextWeek.getTime()) return false
          }
        }
      }

      return true
    })
  }, [tasks, scope, searchText, filterState])

  // Handle task status update
  const handleUpdateTask = async (taskId: string, fields: any) => {
    try {
      const updated = await updateTask(taskId, fields)
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(updated)
      }
      queryClient.invalidateQueries({ queryKey: ['planner-my-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks-analytics'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] })
      return updated
    } catch (err) {
      console.error('Failed to update task', err)
      throw err
    }
  }

  // Handle task check/uncheck status
  const handleToggleComplete = async (task: WorkflowTask, e: React.MouseEvent) => {
    e.stopPropagation()
    const isCompleted = ['completed', 'task_approved_by_manager', 'task_approved_by_client'].includes(task.status)
    const newStatus = isCompleted ? 'ongoing' : 'completed'
    await handleUpdateTask(task.id, { status: newStatus })
  }

  // Handle quick inline task creation
  const handleInlineAddSubmit = async (columnId: string) => {
    const title = inlineAddTitle[columnId]?.trim()
    if (!title) return

    const payload: any = {
      title,
      assigned_to: currentUser?.id,
      priority: 'medium',
      status: 'yet_to_start'
    }

    // Adapt fields to grouping columns
    if (groupBy === 'status') {
      if (columnId === 'completed') {
        payload.status = 'completed'
      } else if (columnId === 'in_progress') {
        payload.status = 'ongoing'
      } else {
        payload.status = 'yet_to_start'
      }
    } else if (groupBy === 'priority') {
      payload.priority = columnId
    } else if (groupBy === 'due_date') {
      const today = new Date()
      if (columnId === 'today') {
        payload.due_date = today.toISOString()
      } else if (columnId === 'tomorrow') {
        today.setDate(today.getDate() + 1)
        payload.due_date = today.toISOString()
      } else if (columnId === 'week') {
        today.setDate(today.getDate() + 3)
        payload.due_date = today.toISOString()
      }
    } else if (groupBy === 'bucket') {
      payload.client_id = columnId === 'internal' ? null : columnId
    } else if (groupBy === 'assigned_to') {
      payload.assigned_to = columnId === 'unassigned' ? null : columnId
    } else if (groupBy === 'label') {
      payload.labels = columnId === 'no_label' ? [] : [columnId]
    }

    try {
      await createTask(payload)
      setInlineAddTitle(prev => ({ ...prev, [columnId]: '' }))
      setInlineAddActive(prev => ({ ...prev, [columnId]: false }))
      refetch()
      queryClient.invalidateQueries({ queryKey: ['planner-my-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks-analytics'] })
    } catch (err) {
      console.error('Failed to create task inline', err)
    }
  }

  const cancelInlineAdd = (columnId: string) => {
    setInlineAddTitle(prev => ({ ...prev, [columnId]: '' }))
    setInlineAddActive(prev => ({ ...prev, [columnId]: false }))
  }

  // Columns for board grouping
  const columns = useMemo(() => {
    if (groupBy === 'status') {
      return [
        { id: 'not_started', title: 'Not started' },
        { id: 'in_progress', title: 'In progress' },
        { id: 'completed', title: 'Completed' }
      ]
    }
    if (groupBy === 'priority') {
      return [
        { id: 'high', title: 'High' },
        { id: 'medium', title: 'Medium' },
        { id: 'low', title: 'Low' }
      ]
    }
    if (groupBy === 'due_date') {
      return [
        { id: 'overdue', title: 'Overdue' },
        { id: 'today', title: 'Due Today' },
        { id: 'tomorrow', title: 'Due Tomorrow' },
        { id: 'week', title: 'Due This Week' },
        { id: 'later', title: 'Later' },
        { id: 'none', title: 'No Due Date' }
      ]
    }
    if (groupBy === 'bucket') {
      const clientMap = new Map<string, string>()
      tasks.forEach(t => {
        const client = t.client || t.workflow?.client
        if (client) {
          clientMap.set(client.id, client.name)
        }
      })
      const brandCols = Array.from(clientMap.entries()).map(([id, name]) => ({ id, title: name }))
      return brandCols.length > 0 ? brandCols : [{ id: 'internal', title: 'Internal' }]
    }
    if (groupBy === 'assigned_to') {
      const assignees = allUsers.map(u => ({ id: u.id, title: u.full_name }))
      return [{ id: 'unassigned', title: 'Unassigned' }, ...assignees]
    }
    if (groupBy === 'label') {
      const defaultLabels = [
        'Content Marketing', 'Search Engine Optimization', 'Performance Marketing',
        'Strategy', 'Creative Statics', 'Video / Motion Graphics', 'Social Media',
        'Follow Up', 'Website Dev', 'BM Task List'
      ]
      return [...defaultLabels.map(l => ({ id: l, title: l })), { id: 'no_label', title: 'No Label' }]
    }
    return []
  }, [groupBy, tasks])

  // Group tasks for Board View
  const groupedTasks = useMemo(() => {
    const map: Record<string, WorkflowTask[]> = {}
    columns.forEach(col => {
      map[col.id] = []
    })

    filteredTasks.forEach(task => {
      let colId = 'not_started'

      if (groupBy === 'status') {
        colId = ['completed', 'task_approved_by_manager', 'task_approved_by_client'].includes(task.status)
          ? 'completed'
          : ['ongoing', 'blocked', 'rework'].includes(task.status)
            ? 'in_progress'
            : 'not_started'
      } else if (groupBy === 'priority') {
        colId = task.priority || 'medium'
      } else if (groupBy === 'due_date') {
        if (!task.due_date) {
          colId = 'none'
        } else {
          const isCompleted = ['completed', 'task_approved_by_manager', 'task_approved_by_client'].includes(task.status)
          const todayStr = new Date().toISOString().split('T')[0]
          const dueStr = new Date(task.due_date).toISOString().split('T')[0]
          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)
          const tomorrowStr = tomorrow.toISOString().split('T')[0]

          const now = new Date()
          const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
          const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6))

          const dueTime = new Date(task.due_date).getTime()

          if (isCompleted) {
            colId = 'later'
          } else if (dueStr < todayStr) {
            colId = 'overdue'
          } else if (dueStr === todayStr) {
            colId = 'today'
          } else if (dueStr === tomorrowStr) {
            colId = 'tomorrow'
          } else if (dueTime >= startOfWeek.getTime() && dueTime <= endOfWeek.getTime()) {
            colId = 'week'
          } else {
            colId = 'later'
          }
        }
      } else if (groupBy === 'bucket') {
        const clientObj = task.client || task.workflow?.client
        colId = clientObj?.id || 'internal'
      } else if (groupBy === 'assigned_to') {
        colId = task.assigned_to || 'unassigned'
      } else if (groupBy === 'label') {
        colId = task.labels && task.labels.length > 0 ? task.labels[0] : 'no_label'
      }

      if (map[colId]) {
        map[colId].push(task)
      }
    })

    // Sort tasks: sort_order -> slot -> priority
    const priorityWeights: Record<string, number> = { high: 1, medium: 2, low: 3 }
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => {
        const orderA = a.sort_order ?? 0
        const orderB = b.sort_order ?? 0
        if (orderA !== orderB) return orderA - orderB

        const slotA = getSlotNumber(a.slot)
        const slotB = getSlotNumber(b.slot)
        if (slotA !== slotB) return slotA - slotB

        const wA = priorityWeights[a.priority] || 2
        const wB = priorityWeights[b.priority] || 2
        return wA - wB
      })
    })

    return map
  }, [columns, groupBy, filteredTasks])

  // Drag and drop helpers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain')
    if (!taskId) return

    let updatePayload: any = {}
    if (groupBy === 'status') {
      if (targetColumnId === 'completed') {
        updatePayload = { status: 'completed' }
      } else if (targetColumnId === 'in_progress') {
        updatePayload = { status: 'ongoing' }
      } else {
        updatePayload = { status: 'yet_to_start' }
      }
    } else if (groupBy === 'priority') {
      updatePayload = { priority: targetColumnId }
    } else if (groupBy === 'due_date') {
      const today = new Date().toISOString().split('T')[0] + 'T12:00:00.000Z'
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0] + 'T12:00:00.000Z'

      if (targetColumnId === 'today') {
        updatePayload = { due_date: today }
      } else if (targetColumnId === 'tomorrow') {
        updatePayload = { due_date: tomorrowStr }
      } else if (targetColumnId === 'none') {
        updatePayload = { due_date: null }
      }
    } else if (groupBy === 'bucket') {
      updatePayload = { client_id: targetColumnId === 'internal' ? null : targetColumnId }
    } else if (groupBy === 'assigned_to') {
      updatePayload = { assigned_to: targetColumnId === 'unassigned' ? null : targetColumnId }
    } else if (groupBy === 'label') {
      updatePayload = { labels: targetColumnId === 'no_label' ? [] : [targetColumnId] }
    }

    await handleUpdateTask(taskId, updatePayload)
  }

  const toggleFilter = (key: 'priorities' | 'statuses', value: string) => {
    setFilterState(prev => {
      const list = prev[key]
      const updated = list.includes(value)
        ? list.filter(v => v !== value)
        : [...list, value]
      return { ...prev, [key]: updated }
    })
  }

  const handleCloseFilter = () => {
    setShowFilterPopover(false)
    setExpandedCategory(null)
  }

  const getChecklistStats = (task: WorkflowTask) => {
    const list = task.checklist || []
    const completed = list.filter(item => item.is_completed).length
    return {
      completed,
      total: list.length
    }
  }

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* 1. Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            My tasks
          </h2>
        </div>
      </div>

      {/* 2. Sub-Toolbar with controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', background: 'var(--card)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: '12px' }}>
        
        {/* Left Toolbar section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          
          {/* Grid / Board toggler */}
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '2px', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setActiveTab('grid')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                border: 'none',
                background: activeTab === 'grid' ? 'var(--card)' : 'transparent',
                color: activeTab === 'grid' ? 'var(--blue)' : 'var(--secondary)',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Table size={14} /> Grid
            </button>
            <button
              onClick={() => setActiveTab('board')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                border: 'none',
                background: activeTab === 'board' ? 'var(--card)' : 'transparent',
                color: activeTab === 'board' ? 'var(--blue)' : 'var(--secondary)',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Kanban size={14} /> Board
            </button>
          </div>

          <div style={{ width: '1px', height: '24px', background: 'var(--border)' }} />

          {/* Scope selection pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All your tasks' },
              { id: 'private', label: 'Private tasks' },
              { id: 'assigned_to_me', label: 'Assigned to me' },
              { id: 'flagged_emails', label: 'Flagged emails' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setScope(item.id as any)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: scope === item.id ? '1px solid var(--blue)' : '1px solid var(--border)',
                  background: scope === item.id ? 'rgba(0, 91, 165, 0.05)' : 'var(--card)',
                  color: scope === item.id ? 'var(--blue)' : 'var(--text)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

        </div>

        {/* Right Toolbar section (Search, Filter, Group By) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          {/* Search box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 10px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--input)', width: '180px', height: '34px' }}>
            <Search size={14} style={{ color: 'var(--muted)' }} />
            <input
              type="text"
              placeholder="Search..."
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

          {/* Premium Filter Popover Trigger */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setShowFilterPopover(!showFilterPopover)
                setShowGroupByDropdown(false)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                height: '34px',
                padding: '0 12px',
                fontSize: '13px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                background: showFilterPopover ? 'var(--hover-bg, #f5f5f2)' : 'var(--card)',
                color: 'var(--text)',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              <Filter size={14} />
              Filter
              {activeFiltersCount > 0 && (
                <span style={{
                  background: 'var(--blue)',
                  color: '#FFF',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  fontSize: '9px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  marginLeft: '4px'
                }}>
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* CUSTOM FILTER POPOVER (Screenshot 1) */}
            {showFilterPopover && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                zIndex: 100,
                width: '240px',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                marginTop: '6px',
                padding: '12px',
                color: 'var(--text)',
                fontFamily: 'Inter, sans-serif'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: '750', fontSize: '14px' }}>Filter by</span>
                  <button
                    onClick={clearAllFilters}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: '15px',
                      padding: '2px 10px',
                      fontSize: '11px',
                      color: 'var(--blue)',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Clear all
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {/* Category: Priority */}
                  <div>
                    <button
                      onClick={() => setExpandedCategory(expandedCategory === 'priority' ? null : 'priority')}
                      style={{
                        width: '100%',
                        padding: '10px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text)',
                        fontSize: '13px',
                        cursor: 'pointer',
                        borderRadius: '6px'
                      }}
                      className="hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={14} style={{ color: 'var(--secondary)' }} />
                        <span>Priority</span>
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--secondary)' }}>{expandedCategory === 'priority' ? '▼' : '▶'}</span>
                    </button>
                    {expandedCategory === 'priority' && (
                      <div style={{ padding: '4px 12px 10px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '1px solid var(--border)', marginLeft: '14px' }}>
                        {['high', 'medium', 'low'].map(prio => (
                          <label key={prio} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', textTransform: 'capitalize' }}>
                            <input
                              type="checkbox"
                              checked={filterState.priorities.includes(prio)}
                              onChange={() => toggleFilter('priorities', prio)}
                              style={{ accentColor: 'var(--blue)' }}
                            />
                            <span>{prio}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Category: Status */}
                  <div>
                    <button
                      onClick={() => setExpandedCategory(expandedCategory === 'status' ? null : 'status')}
                      style={{
                        width: '100%',
                        padding: '10px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text)',
                        fontSize: '13px',
                        cursor: 'pointer',
                        borderRadius: '6px'
                      }}
                      className="hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CircleDot size={14} style={{ color: 'var(--secondary)' }} />
                        <span>Status</span>
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--secondary)' }}>{expandedCategory === 'status' ? '▼' : '▶'}</span>
                    </button>
                    {expandedCategory === 'status' && (
                      <div style={{ padding: '4px 12px 10px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '1px solid var(--border)', marginLeft: '14px' }}>
                        {[
                          { id: 'not_started', label: 'Not started' },
                          { id: 'in_progress', label: 'In progress' },
                          { id: 'completed', label: 'Completed' }
                        ].map(item => (
                          <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={filterState.statuses.includes(item.id)}
                              onChange={() => toggleFilter('statuses', item.id)}
                              style={{ accentColor: 'var(--blue)' }}
                            />
                            <span>{item.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Category: Due Date */}
                  <div>
                    <button
                      onClick={() => setExpandedCategory(expandedCategory === 'due_date' ? null : 'due_date')}
                      style={{
                        width: '100%',
                        padding: '10px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text)',
                        fontSize: '13px',
                        cursor: 'pointer',
                        borderRadius: '6px'
                      }}
                      className="hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={14} style={{ color: 'var(--secondary)' }} />
                        <span>Due date</span>
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--secondary)' }}>{expandedCategory === 'due_date' ? '▼' : '▶'}</span>
                    </button>
                    {expandedCategory === 'due_date' && (
                      <div style={{ padding: '4px 12px 10px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '1px solid var(--border)', marginLeft: '14px' }}>
                        {[
                          { id: 'overdue', label: 'Overdue' },
                          { id: 'today', label: 'Today' },
                          { id: 'tomorrow', label: 'Tomorrow' },
                          { id: 'week', label: 'This Week' },
                          { id: 'next_week', label: 'Next Week' },
                          { id: 'none', label: 'No Due Date' }
                        ].map(item => (
                          <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name="dueDateFilter"
                              checked={filterState.dueDateFilter === item.id}
                              onChange={() => setFilterState(prev => ({ ...prev, dueDateFilter: item.id as any }))}
                              style={{ accentColor: 'var(--blue)' }}
                            />
                            <span>{item.label}</span>
                          </label>
                        ))}
                        {filterState.dueDateFilter && (
                          <button
                            onClick={() => setFilterState(prev => ({ ...prev, dueDateFilter: null }))}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--red)',
                              fontSize: '10px',
                              cursor: 'pointer',
                              padding: 0,
                              textAlign: 'left',
                              marginTop: '4px'
                            }}
                          >
                            Clear due date filter
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                  <button
                    onClick={handleCloseFilter}
                    style={{
                      background: 'var(--blue)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 12px',
                      fontSize: '12px',
                      color: '#fff',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* CUSTOM GROUP BY DROPDOWN (Screenshot 2) */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setShowGroupByDropdown(!showGroupByDropdown)
                setShowFilterPopover(false)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                height: '34px',
                padding: '0 12px',
                fontSize: '13px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                background: showGroupByDropdown ? 'var(--hover-bg, #f5f5f2)' : 'var(--card)',
                color: 'var(--text)',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              {groupBy === 'status' ? <CircleDot size={14} /> : groupBy === 'priority' ? <AlertTriangle size={14} /> : groupBy === 'due_date' ? <Calendar size={14} /> : groupBy === 'assigned_to' ? <Users size={14} /> : groupBy === 'label' ? <Tag size={14} /> : <FolderDot size={14} />}
              <span>Group by: {groupBy === 'status' ? 'Status' : groupBy === 'priority' ? 'Priority' : groupBy === 'due_date' ? 'Due date' : groupBy === 'assigned_to' ? 'Assigned to' : groupBy === 'label' ? 'Labels' : 'Bucket'}</span>
              <ChevronDown size={14} />
            </button>

            {showGroupByDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                zIndex: 100,
                width: '200px',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                marginTop: '6px',
                padding: '6px 0',
                color: 'var(--text)',
                fontFamily: 'Inter, sans-serif'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px 8px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '750', fontSize: '12px' }}>Group by</span>
                  <button
                    onClick={() => {
                      setGroupBy('status')
                      setShowGroupByDropdown(false)
                    }}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: '15px',
                      padding: '2px 8px',
                      fontSize: '10px',
                      color: 'var(--blue)',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Clear all
                  </button>
                </div>
                {[
                  { id: 'assigned_to', label: 'Assigned to', icon: <Users size={13} /> },
                  { id: 'bucket', label: 'Bucket', icon: <FolderDot size={13} /> },
                  { id: 'label', label: 'Labels', icon: <Tag size={13} /> },
                  { id: 'due_date', label: 'Due date', icon: <Calendar size={13} /> },
                  { id: 'priority', label: 'Priority', icon: <AlertTriangle size={13} /> },
                  { id: 'status', label: 'Status', icon: <CircleDot size={13} /> }
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setGroupBy(option.id as any)
                      setShowGroupByDropdown(false)
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                    className="hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <div style={{ width: '18px', display: 'flex', alignItems: 'center' }}>
                      {groupBy === option.id && <Check size={13} style={{ color: 'var(--blue)' }} />}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '4px' }}>
                      {option.icon}
                      <span>{option.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 3. Main content area (Scrollable) */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        
        {tasksLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: 'var(--secondary)' }}>
            <span>Loading your tasks...</span>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '250px', color: 'var(--secondary)', gap: '8px' }}>
            <FolderDot size={36} style={{ color: 'var(--border)' }} />
            <span>No tasks found matching current filters.</span>
          </div>
        ) : activeTab === 'grid' ? (
          
          /* GRID VIEW */
          <div className="panel" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', borderRadius: '12px' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: 'var(--secondary)' }}>Task Name</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: 'var(--secondary)' }}>Due Date</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: 'var(--secondary)' }}>Plan / Brand</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: 'var(--secondary)' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: 'var(--secondary)' }}>Priority</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: 'var(--secondary)' }}>Checklist</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map(task => {
                    const { completed, total } = getChecklistStats(task)
                    const isCompleted = ['completed', 'task_approved_by_manager', 'task_approved_by_client'].includes(task.status)
                    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isCompleted
                    
                    return (
                      <tr 
                        key={task.id}
                        style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-900"
                        onClick={() => setSelectedTask(task)}
                      >
                        <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={(e) => handleToggleComplete(task, e)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              color: isCompleted ? 'var(--blue)' : 'var(--muted)'
                            }}
                          >
                            {isCompleted ? (
                              <CheckCircle2 size={17} style={{ fill: 'rgba(0, 91, 165, 0.1)' }} />
                            ) : (
                              <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid var(--border)' }} />
                            )}
                          </button>
                          <span style={{ textDecoration: isCompleted ? 'line-through' : 'none', color: isCompleted ? 'var(--muted)' : 'var(--text)', fontWeight: '500' }}>
                            {task.title}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {task.due_date ? (
                            <span style={{ color: isOverdue ? 'var(--red)' : 'var(--text)', fontWeight: isOverdue ? '600' : 'normal' }}>
                              {new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          ) : '-'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {task.client?.name || task.workflow?.client?.name || 'Internal'}
                        </td>
                        <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>
                          {task.status.replace(/_/g, ' ')}
                        </td>
                        <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            background: task.priority === 'high' ? 'rgba(239, 68, 68, 0.1)' : task.priority === 'medium' ? 'rgba(245, 158, 11), 0.1' : 'rgba(59, 130, 246, 0.1)',
                            color: task.priority === 'high' ? 'var(--red)' : task.priority === 'medium' ? '#d97706' : 'var(--blue)'
                          }}>
                            {task.priority}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--secondary)' }}>
                          {total > 0 ? `${completed}/${total}` : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          
          /* BOARD VIEW */
          <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '16px', height: '100%', alignItems: 'flex-start' }}>
            {columns.map(col => {
              const columnTasksList = groupedTasks[col.id] || []
              const isAddingActive = inlineAddActive[col.id] || false
              const activeTitle = inlineAddTitle[col.id] || ''

              return (
                <div 
                  key={col.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id)}
                  style={{
                    width: '320px',
                    minWidth: '320px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '100%',
                    border: '1px solid var(--border)'
                  }}
                >
                  
                  {/* Column Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text)' }}>{col.title}</span>
                    <span style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '2px 8px', fontSize: '11px', color: 'var(--secondary)' }}>
                      {columnTasksList.length}
                    </span>
                  </div>

                  {/* Add Task Trigger */}
                  {!isAddingActive ? (
                    <button
                      onClick={() => setInlineAddActive(prev => ({ ...prev, [col.id]: true }))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px dashed var(--border)',
                        background: 'transparent',
                        color: 'var(--secondary)',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        marginBottom: '12px',
                        transition: 'all 0.15s'
                      }}
                      className="hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <Plus size={14} /> Add task
                    </button>
                  ) : (
                    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Enter a task name"
                        value={activeTitle}
                        onChange={(e) => setInlineAddTitle(prev => ({ ...prev, [col.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleInlineAddSubmit(col.id)
                          if (e.key === 'Escape') cancelInlineAdd(col.id)
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          fontSize: '12px',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          background: 'var(--input)',
                          color: 'var(--text)',
                          outline: 'none'
                        }}
                        autoFocus
                      />
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => cancelInlineAdd(col.id)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            borderRadius: '4px',
                            border: '1px solid var(--border)',
                            background: 'transparent',
                            color: 'var(--text)',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleInlineAddSubmit(col.id)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            borderRadius: '4px',
                            border: 'none',
                            background: 'var(--blue)',
                            color: '#FFF',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tasks Cards Container */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1 }}>
                    {columnTasksList.map(task => {
                      const clientName = task.client?.name || task.workflow?.client?.name || 'Internal'
                      const isCompleted = ['completed', 'task_approved_by_manager', 'task_approved_by_client'].includes(task.status)
                      const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isCompleted
                      const { completed: chkCompleted, total: chkTotal } = getChecklistStats(task)
                      const initials = currentUser?.name
                        .split(' ')
                        .map((part) => part[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onClick={() => setSelectedTask(task)}
                          style={{
                            background: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            padding: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            position: 'relative'
                          }}
                          className="shadow-sm hover:shadow"
                        >
                          {/* Label line */}
                          <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {clientName}
                          </span>

                          {/* Checkbox and Title */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <button
                              onClick={(e) => handleToggleComplete(task, e)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                color: isCompleted ? 'var(--blue)' : 'var(--muted)',
                                marginTop: '2px'
                              }}
                            >
                              {isCompleted ? (
                                <CheckCircle2 size={16} style={{ fill: 'rgba(0, 91, 165, 0.1)' }} />
                              ) : (
                                <div style={{ width: '15px', height: '15px', borderRadius: '50%', border: '2px solid var(--border)' }} />
                              )}
                            </button>
                            <span style={{
                              fontSize: '13px',
                              fontWeight: '600',
                              color: isCompleted ? 'var(--muted)' : 'var(--text)',
                              textDecoration: isCompleted ? 'line-through' : 'none',
                              lineHeight: '1.4'
                            }}>
                              {task.title}
                            </span>
                          </div>

                          {/* Completed details text */}
                          {isCompleted && task.completer && (
                            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                              Completed by {task.completer.full_name} on {task.completed_at ? new Date(task.completed_at).toLocaleDateString([], { month: '2-digit', day: '2-digit' }) : ''}
                            </span>
                          )}

                          {/* Footer details row */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              
                              {/* Checklist status */}
                              {chkTotal > 0 && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: 'var(--secondary)' }}>
                                  <CheckSquare size={12} />
                                  {chkCompleted}/{chkTotal}
                                </span>
                              )}

                              {/* Due Date badge */}
                              {task.due_date && (
                                <span style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontSize: '11px',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  border: isOverdue ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border)',
                                  background: isOverdue ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                                  color: isOverdue ? 'var(--red)' : 'var(--secondary)'
                                }}>
                                  {isOverdue ? <Clock size={11} /> : <Calendar size={11} />}
                                  {formatDate(task.due_date)}
                                </span>
                              )}

                            </div>

                            {/* Avatar */}
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text)',
                              fontSize: '9px',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid var(--border)'
                            }}>
                              {initials}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* Slide Drawer detail edit */}
      {selectedTask && (
        <TaskDetailsDrawer
          task={selectedTask}
          users={allUsers}
          onClose={() => setSelectedTask(null)}
          onSuccess={refetch}
          onUpdateTask={handleUpdateTask}
        />
      )}

    </div>
  )
}
