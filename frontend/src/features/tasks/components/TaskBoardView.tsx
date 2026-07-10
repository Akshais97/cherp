import React, { useMemo, useState, useEffect } from 'react'
import { Repeat, CheckSquare } from 'lucide-react'
import { type WorkflowTask, type UserOption, updateTask } from '../../workflows/api'
import { SpotlightCard } from '../../../components/ui/SpotlightCard'

const getSlotNumber = (slot: string | null | undefined): number => {
  if (!slot) return 999
  const match = slot.match(/\d+/)
  return match ? parseInt(match[0], 10) : 999
}

const getTaskColumnId = (task: WorkflowTask, groupBy: string): string => {
  const todayStr = new Date().toISOString().split('T')[0]
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const now = new Date()
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
  const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6))

  if (groupBy === 'priority') {
    return task.priority || 'medium'
  }
  if (groupBy === 'status') {
    return ['completed', 'task_approved_by_manager', 'task_approved_by_client', 'rework'].includes(task.status)
      ? 'completed'
      : task.status
  }
  if (groupBy === 'slot') {
    return task.slot || 'unslotted'
  }
  if (groupBy === 'assigned_to') {
    return task.assigned_to || 'unassigned'
  }
  if (groupBy === 'bucket') {
    const clientObj = task.client || task.workflow?.client
    return clientObj?.id || 'internal'
  }
  if (groupBy === 'label') {
    return task.labels && task.labels.length > 0 ? task.labels[0] : 'no_label'
  }
  if (groupBy === 'due_date') {
    if (!task.due_date) {
      return 'none'
    }
    const dueStr = new Date(task.due_date).toISOString().split('T')[0]
    const isCompleted = ['completed', 'task_approved_by_manager', 'task_approved_by_client'].includes(task.status)
    
    if (isCompleted) {
      return 'later'
    }
    if (dueStr < todayStr) {
      return 'overdue'
    }
    if (dueStr === todayStr) {
      return 'today'
    }
    if (dueStr === tomorrowStr) {
      return 'tomorrow'
    }
    const dueTime = new Date(task.due_date).getTime()
    if (dueTime >= startOfWeek.getTime() && dueTime <= endOfWeek.getTime()) {
      return 'week'
    }
    return 'later'
  }
  return ''
}

interface TaskBoardViewProps {
  tasks: WorkflowTask[]
  users: UserOption[]
  groupBy: 'bucket' | 'assigned_to' | 'label' | 'due_date' | 'priority' | 'status' | 'slot'
  onTaskClick: (task: WorkflowTask) => void
  onRefresh: () => void
}

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

export function TaskBoardView({ tasks, users, groupBy, onTaskClick, onRefresh }: TaskBoardViewProps) {
  const [localTasks, setLocalTasks] = useState<WorkflowTask[]>(tasks)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [draggedOverCardId, setDraggedOverCardId] = useState<string | null>(null)
  const [draggedOverColumnId, setDraggedOverColumnId] = useState<string | null>(null)

  useEffect(() => {
    setLocalTasks(tasks)
  }, [tasks])
  
  // Calculate column list dynamically based on grouping
  const columns = useMemo(() => {
    switch (groupBy) {
      case 'priority':
        return [
          { id: 'high', title: 'High' },
          { id: 'medium', title: 'Medium' },
          { id: 'low', title: 'Low' }
        ]
      case 'status':
        return [
          { id: 'yet_to_start', title: 'Not Started' },
          { id: 'ongoing', title: 'In Progress' },
          { id: 'blocked', title: 'Blocked' },
          { id: 'completed', title: 'Completed' }
        ]
      case 'slot':
        return [
          { id: 'Slot 1', title: 'Slot 1' },
          { id: 'Slot 2', title: 'Slot 2' },
          { id: 'Slot 3', title: 'Slot 3' },
          { id: 'Slot 4', title: 'Slot 4' },
          { id: 'Slot 5', title: 'Slot 5' },
          { id: 'Slot 6', title: 'Slot 6' },
          { id: 'Slot 7', title: 'Slot 7' },
          { id: 'Slot 8', title: 'Slot 8' },
          { id: 'Slot 9', title: 'Slot 9' },
          { id: 'Slot 10', title: 'Slot 10' },
          { id: 'Slot 11', title: 'Slot 11' },
          { id: 'unslotted', title: 'Unslotted' }
        ]
      case 'assigned_to':
        const assignees = users.map(u => ({ id: u.id, title: u.full_name }))
        return [{ id: 'unassigned', title: 'Unassigned' }, ...assignees]
      case 'bucket':
        const clientMap = new Map<string, string>()
        tasks.forEach(t => {
          const client = t.client || t.workflow?.client
          if (client) {
            clientMap.set(client.id, client.name)
          }
        })
        const brandCols = Array.from(clientMap.entries()).map(([id, name]) => ({ id, title: name }))
        return brandCols.length > 0 ? brandCols : [{ id: 'internal', title: 'Internal' }]
      case 'label':
        const defaultLabels = [
          'Content Marketing', 'Search Engine Optimization', 'Performance Marketing',
          'Strategy', 'Creative Statics', 'Video / Motion Graphics', 'Social Media',
          'Follow Up', 'Website Dev', 'BM Task List'
        ]
        return [...defaultLabels.map(l => ({ id: l, title: l })), { id: 'no_label', title: 'No Label' }]
      case 'due_date':
        return [
          { id: 'overdue', title: 'Overdue' },
          { id: 'today', title: 'Due Today' },
          { id: 'tomorrow', title: 'Due Tomorrow' },
          { id: 'week', title: 'Due This Week' },
          { id: 'later', title: 'Later' },
          { id: 'none', title: 'No Due Date' }
        ]
      default:
        return []
    }
  }, [groupBy, tasks, users])

  // Map tasks to column buckets
  const columnTasks = useMemo(() => {
    const map: Record<string, WorkflowTask[]> = {}
    columns.forEach(col => {
      map[col.id] = []
    })

    localTasks.forEach(task => {
      const colId = getTaskColumnId(task, groupBy)
      if (map[colId]) {
        map[colId].push(task)
      }
    })

    // Sort tasks in columns: sort_order -> Slot -> Priority -> Due Date
    const priorityWeights: Record<string, number> = { high: 1, medium: 2, low: 3 }
    const statusWeights: Record<string, number> = { blocked: 1, rework: 2, ongoing: 3, yet_to_start: 4, completed: 5, task_approved_by_manager: 6, task_approved_by_client: 7 }

    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => {
        // 1. Sort by custom sort_order
        const orderA = a.sort_order ?? 0
        const orderB = b.sort_order ?? 0
        if (orderA !== orderB) return orderA - orderB

        // 2. Sort by Slot number (natural numerical sorting)
        const slotA = getSlotNumber(a.slot)
        const slotB = getSlotNumber(b.slot)
        if (slotA !== slotB) return slotA - slotB

        // 3. Sort by Priority (High -> Medium -> Low)
        const wA = priorityWeights[a.priority] || 2
        const wB = priorityWeights[b.priority] || 2
        if (wA !== wB) return wA - wB

        // 4. Sort by Status urgency
        const sA = statusWeights[a.status] || 4
        const sB = statusWeights[b.status] || 4
        if (sA !== sB) return sA - sB

        // 5. Sort by Due Date
        const timeA = a.due_date ? new Date(a.due_date).getTime() : Infinity
        const timeB = b.due_date ? new Date(b.due_date).getTime() : Infinity
        return timeA - timeB
      })
    })

    return map
  }, [columns, groupBy, localTasks])

  // Helper to determine updated fields based on group column ID
  const getColumnUpdatePayload = (columnId: string) => {
    let updatePayload: any = {}
    switch (groupBy) {
      case 'priority':
        updatePayload = { priority: columnId }
        break
      case 'status':
        updatePayload = { status: columnId }
        break
      case 'slot':
        updatePayload = { slot: columnId === 'unslotted' ? null : columnId }
        break
      case 'assigned_to':
        updatePayload = { assigned_to: columnId === 'unassigned' ? null : columnId }
        break
      case 'bucket':
        updatePayload = { client_id: columnId === 'internal' ? null : columnId }
        break
      case 'label':
        updatePayload = { labels: columnId === 'no_label' ? [] : [columnId] }
        break
      case 'due_date':
        // Map relative columns to actual dates
        const today = new Date().toISOString().split('T')[0] + 'T12:00:00.000Z'
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStr = tomorrow.toISOString().split('T')[0] + 'T12:00:00.000Z'
        
        if (columnId === 'today') {
          updatePayload = { due_date: today }
        } else if (columnId === 'tomorrow') {
          updatePayload = { due_date: tomorrowStr }
        } else if (columnId === 'none') {
          updatePayload = { due_date: null }
        }
        break
    }
    return updatePayload
  }

  // Handle HTML5 drop action on column background
  const handleDrop = async (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    setDraggedTaskId(null)
    setDraggedOverCardId(null)
    setDraggedOverColumnId(null)
    const sourceTaskId = e.dataTransfer.getData('text/plain')
    if (!sourceTaskId) return

    const sourceTask = localTasks.find(t => t.id === sourceTaskId)
    if (!sourceTask) return

    const updatePayload = getColumnUpdatePayload(columnId)

    // Optimistically update local tasks
    setLocalTasks(currentTasks => {
      const filtered = currentTasks.filter(t => t.id !== sourceTaskId)
      const targetColTasks = filtered.filter(t => getTaskColumnId(t, groupBy) === columnId)
      const newOrder = targetColTasks.length + 1
      const updatedSourceTask = { ...sourceTask, ...updatePayload, sort_order: newOrder }
      return [...filtered, updatedSourceTask]
    })

    try {
      const targetColTasks = (columnTasks[columnId] || []).filter(t => t.id !== sourceTaskId)
      const newOrder = targetColTasks.length + 1
      await updateTask(sourceTaskId, { ...updatePayload, sort_order: newOrder })
      onRefresh()
    } catch (err) {
      console.error('Failed to update task column', err)
      setLocalTasks(tasks)
    }
  }

  // Handle HTML5 drop action directly on a target card
  const handleDropOnCard = async (e: React.DragEvent, targetTaskId: string, columnId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDraggedTaskId(null)
    setDraggedOverCardId(null)
    setDraggedOverColumnId(null)
    const sourceTaskId = e.dataTransfer.getData('text/plain')
    if (!sourceTaskId || sourceTaskId === targetTaskId) return

    const sourceTask = localTasks.find(t => t.id === sourceTaskId)
    if (!sourceTask) return

    const updatePayload = getColumnUpdatePayload(columnId)

    // Calculate optimistic new task states
    let optimisticTasks: WorkflowTask[] = []
    setLocalTasks(currentTasks => {
      const filtered = currentTasks.filter(t => t.id !== sourceTaskId)
      const targetColTasks = filtered.filter(t => getTaskColumnId(t, groupBy) === columnId)
      const targetIndex = targetColTasks.findIndex(t => t.id === targetTaskId)
      if (targetIndex < 0) return currentTasks

      const updatedSourceTask = { ...sourceTask, ...updatePayload }
      const reorderedColTasks = [...targetColTasks]
      reorderedColTasks.splice(targetIndex, 0, updatedSourceTask)

      optimisticTasks = currentTasks.map(t => {
        if (t.id === sourceTaskId) {
          return { ...updatedSourceTask, sort_order: targetIndex + 1 }
        }
        const idx = reorderedColTasks.findIndex(rt => rt.id === t.id)
        if (idx >= 0) {
          return { ...t, sort_order: idx + 1 }
        }
        return t
      })
      return optimisticTasks
    })

    try {
      const targetColTasks = [...(columnTasks[columnId] || [])]
      const filteredTargetTasks = targetColTasks.filter(t => t.id !== sourceTaskId)
      const targetIndex = filteredTargetTasks.findIndex(t => t.id === targetTaskId)
      if (targetIndex >= 0) {
        const reorderedTasks = [...filteredTargetTasks]
        reorderedTasks.splice(targetIndex, 0, { ...sourceTask, ...updatePayload })

        await Promise.all(
          reorderedTasks.map((task, index) => {
            const newOrder = index + 1
            if (task.id === sourceTaskId) {
              return updateTask(task.id, { ...updatePayload, sort_order: newOrder })
            } else if (task.sort_order !== newOrder) {
              return updateTask(task.id, { sort_order: newOrder })
            }
            return Promise.resolve()
          })
        )
        onRefresh()
      }
    } catch (err) {
      console.error('Failed to reorder tasks in column', err)
      setLocalTasks(tasks)
    }
  }

  // Get due date display formatting and chip styles
  const getDueDateChip = (task: WorkflowTask) => {
    if (!task.due_date) return null
    const isCompleted = ['completed', 'task_approved_by_manager', 'task_approved_by_client'].includes(task.status)
    if (isCompleted) {
      return {
        label: new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        style: { background: 'var(--green-light, #EDFBF3)', color: 'var(--green, #2DA86B)', border: '1px solid rgba(45, 168, 107, 0.2)' }
      }
    }

    const dueStr = new Date(task.due_date).toISOString().split('T')[0]
    const todayStr = new Date().toISOString().split('T')[0]
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const formattedDate = new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })

    if (dueStr < todayStr) {
      return {
        label: `Late - ${formattedDate}`,
        style: { background: 'var(--red-light, #FEF0F0)', color: 'var(--red, #D44)', border: '1px solid rgba(221, 68, 68, 0.2)', fontWeight: 'bold' }
      }
    }
    if (dueStr === todayStr) {
      return {
        label: `Today`,
        style: { background: 'var(--amber-light, #FEF7E6)', color: 'var(--amber, #D48806)', border: '1px solid rgba(212, 136, 6, 0.2)', fontWeight: 'bold' }
      }
    }
    if (dueStr === tomorrowStr) {
      return {
        label: `Tomorrow`,
        style: { background: 'var(--accent-light, #EEF4FF)', color: 'var(--accent, #3B6DD6)', border: '1px solid rgba(59, 109, 214, 0.2)' }
      }
    }
    return {
      label: formattedDate,
      style: { background: 'var(--hover-bg, #F5F5F2)', color: 'var(--secondary-text, #6B6B6B)', border: '1px solid var(--border)' }
    }
  }

  return (
    <div data-testid="task-board-view" style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px', height: 'calc(80vh - 120px)', alignItems: 'stretch' }}>
      {columns.map((col) => {
        const colTasks = columnTasks[col.id] || []
        
        return (
          <div 
            key={col.id} 
            onDragOver={(e) => {
              e.preventDefault()
              if (draggedOverColumnId !== col.id) {
                setDraggedOverColumnId(col.id)
              }
            }}
            onDragEnter={(e) => {
              e.preventDefault()
              setDraggedOverColumnId(col.id)
            }}
            onDragLeave={() => {
              if (draggedOverColumnId === col.id) {
                setDraggedOverColumnId(null)
              }
            }}
            onDrop={(e) => handleDrop(e, col.id)}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              width: '280px', 
              minWidth: '280px',
              backgroundColor: draggedOverColumnId === col.id ? 'var(--accent-light, rgba(59, 109, 214, 0.05))' : 'var(--hover-bg, #F5F5F2)', 
              borderRadius: '12px', 
              padding: '12px',
              height: '100%',
              border: draggedOverColumnId === col.id ? '1px dashed var(--accent, #3B6DD6)' : '1px solid var(--border)',
              transition: 'background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease'
            }}
          >
            {/* Column Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 4px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                {col.title}
              </span>
              <span style={{ fontSize: '11px', background: 'var(--card, #FFF)', border: '1px solid var(--border)', borderRadius: '12px', padding: '2px 8px', fontWeight: 'bold', color: 'var(--secondary-text)' }}>
                {colTasks.length}
              </span>
            </div>

            {/* Column Cards Container */}
            <div className="no-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1, minHeight: '150px' }}>
              {colTasks.map((task) => {
                const dueInfo = getDueDateChip(task)
                const checklist = task.checklist || []
                const checklistDone = checklist.filter(item => item.is_completed).length

                return (
                  <SpotlightCard
                    as="div"
                    key={task.id}
                    draggable="true"
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', task.id)
                      setDraggedTaskId(task.id)
                    }}
                    onDragEnd={() => {
                      setDraggedTaskId(null)
                      setDraggedOverCardId(null)
                      setDraggedOverColumnId(null)
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (draggedTaskId !== task.id) {
                        setDraggedOverCardId(task.id)
                      }
                    }}
                    onDragLeave={() => {
                      if (draggedOverCardId === task.id) {
                        setDraggedOverCardId(null)
                      }
                    }}
                    onDrop={(e) => {
                      handleDropOnCard(e, task.id, col.id)
                      setDraggedOverCardId(null)
                    }}
                    onClick={() => onTaskClick(task)}
                    spotlightColor="rgba(59, 109, 214, 0.1)"
                    style={{
                      background: 'var(--card, #FFF)',
                      borderRadius: '10px',
                      cursor: 'grab',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      flexShrink: 0
                    }}
                    className={`task-card task-board-card hover:border-accent ${draggedTaskId === task.id ? 'dragging' : ''} ${draggedOverCardId === task.id ? 'drop-target' : ''}`}
                  >
                    {/* Inner flex layout wrapper so SpotlightCard content fits perfectly */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', flexGrow: 1, boxSizing: 'border-box' }}>
                      {/* Visual Priority Line */}
                      <div style={{
                        position: 'absolute',
                        left: 0, top: 0, bottom: 0,
                        width: '4px',
                        borderRadius: '4px 0 0 4px',
                        backgroundColor: task.priority === 'high' ? 'var(--red, #D44)' : task.priority === 'medium' ? 'var(--amber, #D48806)' : 'var(--muted-text, #9A9A9A)'
                      }}></div>

                      {/* Top Row: Labels / Category Pills */}
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', paddingLeft: '4px' }}>
                        {task.labels && task.labels.slice(0, 2).map((lbl) => {
                          const styling = labelColors[lbl] || { bg: '#F1F5F9', text: '#334155' }
                          return (
                            <span 
                              key={lbl} 
                              style={{ 
                                fontSize: '8px', 
                                padding: '1px 5px', 
                                borderRadius: '3px', 
                                backgroundColor: styling.bg, 
                                color: styling.text, 
                                fontWeight: '700' 
                              }}
                            >
                              {lbl}
                            </span>
                          )
                        })}
                        {task.slot && (
                          <span style={{ fontSize: '8px', padding: '1px 5px', borderRadius: '3px', background: 'var(--accent-light, #EEF4FF)', color: 'var(--accent, #3B6DD6)', fontWeight: '800' }}>
                            {task.slot}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: 'var(--text)', paddingLeft: '4px', lineHeight: '1.4' }}>
                        {task.title}
                      </h4>

                      {/* Description excerpt */}
                      {task.description && (
                        <p style={{ margin: '0 0 0 4px', fontSize: '11px', color: 'var(--secondary-text, #6B6B6B)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.4' }}>
                          {task.description}
                        </p>
                      )}

                      {/* Brand Meta info (if not grouping by bucket) */}
                      {groupBy !== 'bucket' && (
                        <span style={{ fontSize: '10px', color: 'var(--muted-text, #9A9A9A)', paddingLeft: '4px', fontWeight: '500' }}>
                          🏢 {task.client?.name || task.workflow?.client?.name || 'Internal'}
                        </span>
                      )}

                      {/* Divider */}
                      <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />

                      {/* Bottom Metadata row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {/* Due Date Badge */}
                          {dueInfo && (
                            <span style={{ 
                              fontSize: '9px', 
                              padding: '2px 6px', 
                              borderRadius: '4px',
                              ...dueInfo.style
                            }}>
                              {dueInfo.label}
                            </span>
                          )}
                          {/* Checklist Counter */}
                          {checklist.length > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '10px', color: 'var(--secondary-text)' }}>
                              <CheckSquare size={10} /> {checklistDone}/{checklist.length}
                            </span>
                          )}
                          {/* Recurrence Repeat indicator */}
                          {task.recurrence_rule && (
                            <span title={`Repeats ${task.recurrence_rule}`}>
                              <Repeat size={10} style={{ color: 'var(--secondary-text)' }} />
                            </span>
                          )}
                        </div>

                        {/* Assignee Avatar */}
                        <div>
                          {task.assignee ? (
                            task.assignee.avatar_url ? (
                              <img 
                                src={task.assignee.avatar_url} 
                                alt={task.assignee.full_name} 
                                style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }}
                                title={task.assignee.full_name}
                              />
                            ) : (
                              <div 
                                style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--accent-light, #EEF4FF)', color: 'var(--accent, #3B6DD6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold' }}
                                title={task.assignee.full_name}
                              >
                                {task.assignee.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                            )
                          ) : (
                            <div 
                              style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--border)', color: 'var(--secondary-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px' }}
                              title="Unassigned"
                            >
                              ?
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </SpotlightCard>
                )
              })}
              {colTasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', border: '1px dashed var(--border)', borderRadius: '8px', fontSize: '11px', color: 'var(--muted-text)', fontStyle: 'italic' }}>
                  No tasks here
                </div>
              ) : null}
            </div>

          </div>
        )
      })}
    </div>
  )
}
