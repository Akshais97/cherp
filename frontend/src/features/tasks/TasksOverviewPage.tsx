import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarClock,
  UserRound,
  X,
  MessageSquare,
  Paperclip,
  History,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { useMemo, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../app/providers/useAuth'
import { normalizeApiError } from '../../lib/api/errors'
import { canManageTasks } from '../../lib/permissions/roles'
import { getBlockers, createBlocker, resolveBlocker } from '../blockers/api'
import {
  getWorkflow,
  getWorkflows,
  getUsers,
  getTask,
  createWorkflowTask,
  updateTask,
  deleteTask,
  getTaskComments,
  addTaskComment,
  getTaskAttachments,
  addTaskAttachment,
  deleteTaskAttachment,
  getTaskLogs,
  requestTaskApproval,
  approveTask,
  requestTaskChanges,
  completeTask,
  type TaskStatus,
  type WorkflowTask,
  type UserOption,
} from '../workflows/api'

const taskStatusLabels: Record<TaskStatus, string> = {
  yet_to_start: 'Yet to start',
  ongoing: 'Ongoing',
  blocked: 'Blocked',
  completed: 'Pending Approval',
  task_approved_by_manager: 'Approved by Manager',
  rework: 'Rework',
  task_approved_by_client: 'Approved by Client',
}

export function TasksOverviewPage({ initialTaskId }: { initialTaskId?: string | null } = {}) {
  const queryClient = useQueryClient()
  const { currentUser } = useAuth()
  const canManage = currentUser ? canManageTasks(currentUser.role) : false
  
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [selectedTask, setSelectedTask] = useState<WorkflowTask | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const workflowsQuery = useQuery({
    queryKey: ['task-overview-workflows'],
    queryFn: () => getWorkflows(),
  })

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: currentUser?.role === 'super_admin' || currentUser?.role === 'project_manager',
  })

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

  const workflows = workflowsQuery.data ?? []
  const effectiveWorkflowId = useMemo(() => {
    if (selectedWorkflowId && workflows.some(w => w.id === selectedWorkflowId)) {
      return selectedWorkflowId
    }
    return workflows[0]?.id || ''
  }, [selectedWorkflowId, workflows])

  const groupedWorkflows = useMemo(() => {
    const groups: Record<string, typeof workflows> = {}
    for (const w of workflows) {
      const clientName = w.client.name
      if (!groups[clientName]) {
        groups[clientName] = []
      }
      groups[clientName].push(w)
    }
    return groups
  }, [workflows])

  const workflowQuery = useQuery({
    queryKey: ['task-overview-workflow', effectiveWorkflowId],
    queryFn: () => getWorkflow(effectiveWorkflowId),
    enabled: Boolean(effectiveWorkflowId),
  })

  const workflow = workflowQuery.data
  const tasks = useMemo(() => {
    const allTasks = workflow?.tasks ?? []
    if (currentUser?.role === 'team_member') {
      return allTasks.filter((task) => task.assignee?.email === currentUser.email)
    }
    return assigneeId ? allTasks.filter((task) => task.assigned_to === assigneeId) : allTasks
  }, [assigneeId, currentUser, workflow?.tasks])

  const error = workflowsQuery.error || workflowQuery.error || usersQuery.error
  const errorMessage = error ? normalizeApiError(error).message : null

  const handleTaskClick = (task: WorkflowTask) => {
    setSelectedTask(task)
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['task-overview-workflow', effectiveWorkflowId] })
    queryClient.invalidateQueries({ queryKey: ['task-overview-workflows'] })
  }

  return (
    <section className="tasks-overview-page" data-testid="tasks-overview-page">
      <div className="page-heading">
        <div>
          <p>Brandwise tasks</p>
          <h1>Tasks Overview</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="pill">{canManage ? 'PM View' : 'Team View'}</span>
          {canManage && effectiveWorkflowId ? (
            <button
              className="primary-action compact"
              onClick={() => setShowCreateModal(true)}
              data-testid="button-create-task"
              type="button"
            >
              <Plus size={15} /> Create Task
            </button>
          ) : null}
        </div>
      </div>

      {errorMessage ? <div className="notice error">{errorMessage}</div> : null}

      <section className="panel task-overview-filters">
        <label className="field">
          <span>Brand</span>
          <select
            data-testid="select-task-brand"
            value={effectiveWorkflowId}
            onChange={(event) => setSelectedWorkflowId(event.target.value)}
          >
            {Object.entries(groupedWorkflows).map(([clientName, list]) => (
              <optgroup key={clientName} label={clientName}>
                {list.map((item) => (
                  <option key={item.id} value={item.id}>
                    Month {item.month_number} - {item.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        
        <label className="field">
          <span>Team Member Filter</span>
          <select
            data-testid="select-task-assignee-filter"
            value={currentUser?.role === 'team_member' ? currentUser.id : assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
            disabled={currentUser?.role === 'team_member'}
          >
            {currentUser?.role === 'team_member' ? (
              <option value={currentUser.id}>{currentUser.name}</option>
            ) : (
              <>
                <option value="">All assignees</option>
                {(usersQuery.data ?? []).map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name}
                  </option>
                ))}
              </>
            )}
          </select>
        </label>
      </section>

      <div className="task-overview-layout">
        <section className="panel">
          <div className="panel-header">
            <h2>{workflow?.client.name ?? 'Brand'} Tasks</h2>
            <span className="muted">{tasks.length} tasks</span>
          </div>
          <div className="task-overview-card-grid">
            {tasks.map((task) => {
              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'task_approved_by_manager' && task.status !== 'task_approved_by_client';
              return (
                <button
                  className={`overview-task-card priority-${task.priority} ${isOverdue ? 'overdue' : ''}`}
                  key={task.id}
                  onClick={() => handleTaskClick(task)}
                  type="button"
                  style={{
                    textAlign: 'left',
                    position: 'relative',
                    borderLeft: `4px solid ${
                      task.priority === 'high' ? 'var(--danger-red, #D44)' :
                      task.priority === 'medium' ? 'var(--warning-amber, #D48806)' :
                      'var(--muted-text, #9A9A9A)'
                    }`,
                  }}
                >
                  <span className={`status-badge ${task.status}`}>
                    {taskStatusLabels[task.status]}
                  </span>
                  <h3>{task.title}</h3>
                  <p className="task-desc">{task.description || 'No description added yet.'}</p>
                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '12px', color: 'var(--secondary-text, #6B6B6B)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CalendarClock size={12} /> {daysUntil(task.due_date)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <UserRound size={12} /> {task.assignee?.full_name ?? 'Unassigned'}
                    </span>
                  </div>
                </button>
              );
            })}
            {!workflowQuery.isLoading && tasks.length === 0 ? (
              <div className="muted-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '32px' }}>
                No tasks match these filters.
              </div>
            ) : null}
          </div>
        </section>

        <section className="panel task-matrix-panel">
          <div className="panel-header">
            <h2>Brand Matrix</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Brand</th>
                  {tasks.slice(0, 6).map((task) => (
                    <th key={task.id}>{task.title}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{workflow?.client.name ?? '-'}</td>
                  {tasks.slice(0, 6).map((task) => (
                    <td key={task.id}>
                      <span className={`status-badge ${task.status}`}>
                        {taskStatusLabels[task.status]}
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {showCreateModal && effectiveWorkflowId ? (
        <CreateTaskModal
          workflowId={effectiveWorkflowId}
          users={usersQuery.data ?? []}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleRefresh}
        />
      ) : null}

      {selectedTask ? (
        <InteractiveTaskDetailModal
          task={selectedTask}
          users={usersQuery.data ?? []}
          currentUser={currentUser}
          onClose={() => setSelectedTask(null)}
          onSuccess={() => {
            handleRefresh()
            // Keep the task details modal open with latest content by refetching
            const updatedTask = tasks.find(t => t.id === selectedTask.id)
            if (updatedTask) {
              setSelectedTask(updatedTask)
            } else {
              setSelectedTask(null)
            }
          }}
        />
      ) : null}
    </section>
  )
}

// ==================== CREATE TASK MODAL ====================
function CreateTaskModal({
  workflowId,
  users,
  onClose,
  onSuccess,
}: {
  workflowId: string
  users: UserOption[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [dueDate, setDueDate] = useState('')
  const [isDaily, setIsDaily] = useState(false)
  const [slot, setSlot] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      await createWorkflowTask(workflowId, {
        title,
        description,
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
    <div className="modal-backdrop" role="dialog" aria-modal="true">
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
            <span>Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Task Title"
              style={{ background: 'var(--input-bg, #F7F7F5)' }}
            />
          </label>
          <label className="field" style={{ marginTop: 0 }}>
            <span>Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task Description"
              rows={3}
              style={{ background: 'var(--input-bg, #F7F7F5)' }}
            />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label className="field" style={{ marginTop: 0 }}>
              <span>Assignee</span>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                style={{ background: 'var(--input-bg, #F7F7F5)' }}
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
                style={{ background: 'var(--input-bg, #F7F7F5)' }}
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
                style={{ background: 'var(--input-bg, #F7F7F5)', opacity: isDaily ? 0.5 : 1 }}
              />
            </label>

            <label className="field" style={{ marginTop: 0 }}>
              <span>Slot Time</span>
              <input
                type="text"
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                placeholder="e.g. 10:00 AM"
                style={{ background: 'var(--input-bg, #F7F7F5)' }}
              />
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
            <button className="primary-action" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body
  )
}

// ==================== INTERACTIVE TASK DETAILS MODAL ====================
type TabType = 'details' | 'comments' | 'attachments' | 'logs'

export function InteractiveTaskDetailModal({
  task,
  users,
  currentUser,
  onClose,
  onSuccess,
}: {
  task: WorkflowTask
  users: UserOption[]
  currentUser: any
  onClose: () => void
  onSuccess: () => void
}) {
  const queryClient = useQueryClient()
  const isPM = currentUser?.role === 'super_admin' || currentUser?.role === 'project_manager'
  const isAssigned = task.assignee?.email === currentUser?.email
  const canEditDetails = isPM
  const canEditProgress = isPM || isAssigned

  const [activeTab, setActiveTab] = useState<TabType>('details')
  const [error, setError] = useState<string | null>(null)
  
  // Title & description inline states
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')

  // Local states for bulk updates details tab
  const [localAssignee, setLocalAssignee] = useState(task.assigned_to ?? '')
  const [localStatus, setLocalStatus] = useState(task.status)
  const [localPriority, setLocalPriority] = useState(task.priority)
  const [localDueDate, setLocalDueDate] = useState(task.due_date ? task.due_date.slice(0, 10) : '')
  const [localSlot, setLocalSlot] = useState(task.slot ?? '')
  const [localIsDaily, setLocalIsDaily] = useState(task.is_daily ?? false)
  
  // Rework/Approval reasons
  const [showActionDialog, setShowActionDialog] = useState<'request_approval' | 'approve' | 'request_changes' | 'delete' | null>(null)
  const [actionReason, setActionReason] = useState('')
  const [isActionSubmitting, setIsActionSubmitting] = useState(false)

  // Checklist items state
  const checklist = useMemo<any[]>(() => {
    try {
      if (typeof task.checklist === 'string') {
        return JSON.parse(task.checklist)
      }
      return Array.isArray(task.checklist) ? task.checklist : []
    } catch {
      return []
    }
  }, [task.checklist])
  const [newChecklistItem, setNewChecklistItem] = useState('')

  // Query details for comments, attachments, logs
  const commentsQuery = useQuery({
    queryKey: ['task-comments', task.id],
    queryFn: () => getTaskComments(task.id),
    enabled: activeTab === 'comments',
  })

  const attachmentsQuery = useQuery({
    queryKey: ['task-attachments', task.id],
    queryFn: () => getTaskAttachments(task.id),
    enabled: activeTab === 'attachments',
  })

  const logsQuery = useQuery({
    queryKey: ['task-logs', task.id],
    queryFn: () => getTaskLogs(task.id),
    enabled: activeTab === 'logs',
  })

  // Blocker states & query
  const [blockerTitle, setBlockerTitle] = useState('')
  const [blockerDescription, setBlockerDescription] = useState('')
  const [blockerImpact, setBlockerImpact] = useState('')
  const [blockerSeverity, setBlockerSeverity] = useState<'high' | 'medium' | 'low'>('medium')
  const [blockerAssignee, setBlockerAssignee] = useState('')
  const [isBlockerSubmitting, setIsBlockerSubmitting] = useState(false)

  const [resolvingBlockerId, setResolvingBlockerId] = useState<string | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [isResolving, setIsResolving] = useState(false)

  const blockersQuery = useQuery({
    queryKey: ['task-blockers', task.id],
    queryFn: () => getBlockers({ task_id: task.id }),
  })

  const handleCreateBlocker = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!blockerTitle.trim() || !blockerDescription.trim() || !blockerAssignee) return
    setIsBlockerSubmitting(true)
    setError(null)
    try {
      await createBlocker({
        task_id: task.id,
        title: blockerTitle.trim(),
        description: blockerDescription.trim(),
        severity: blockerSeverity,
        impact: blockerImpact.trim() || undefined,
        assigned_to: blockerAssignee,
      })
      setBlockerTitle('')
      setBlockerDescription('')
      setBlockerImpact('')
      setBlockerSeverity('medium')
      setBlockerAssignee('')
      queryClient.invalidateQueries({ queryKey: ['task-blockers', task.id] })
      onSuccess()
    } catch (err: any) {
      setError(normalizeApiError(err).message)
    } finally {
      setIsBlockerSubmitting(false)
    }
  }

  const handleResolveBlocker = async (blockerId: string) => {
    if (!resolutionNotes.trim()) return
    setIsResolving(true)
    setError(null)
    try {
      await resolveBlocker(blockerId, { resolution_notes: resolutionNotes.trim() })
      setResolvingBlockerId(null)
      setResolutionNotes('')
      queryClient.invalidateQueries({ queryKey: ['task-blockers', task.id] })
      onSuccess()
    } catch (err: any) {
      setError(normalizeApiError(err).message)
    } finally {
      setIsResolving(false)
    }
  }

  // Complete Task handler
  const [isCompleting, setIsCompleting] = useState(false)
  const handleCompleteTask = async () => {
    setIsCompleting(true)
    setError(null)
    try {
      await completeTask(task.id)
      onSuccess()
    } catch (err: any) {
      setError(normalizeApiError(err).message)
    } finally {
      setIsCompleting(false)
    }
  }

  // Comments feed post
  const [commentContent, setCommentContent] = useState('')
  const [isCommentAdding, setIsCommentAdding] = useState(false)

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentContent.trim()) return
    setIsCommentAdding(true)
    try {
      await addTaskComment(task.id, { content: commentContent })
      setCommentContent('')
      queryClient.invalidateQueries({ queryKey: ['task-comments', task.id] })
      onSuccess()
    } catch (err: any) {
      setError(normalizeApiError(err).message)
    } finally {
      setIsCommentAdding(false)
    }
  }

  // Attachments post
  const [attachmentName, setAttachmentName] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [isAttachmentAdding, setIsAttachmentAdding] = useState(false)

  const handleAddAttachment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!attachmentName.trim() || !attachmentUrl.trim()) return
    setIsAttachmentAdding(true)
    try {
      await addTaskAttachment(task.id, { file_name: attachmentName, file_url: attachmentUrl })
      setAttachmentName('')
      setAttachmentUrl('')
      queryClient.invalidateQueries({ queryKey: ['task-attachments', task.id] })
      onSuccess()
    } catch (err: any) {
      setError(normalizeApiError(err).message)
    } finally {
      setIsAttachmentAdding(false)
    }
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await deleteTaskAttachment(task.id, attachmentId)
      queryClient.invalidateQueries({ queryKey: ['task-attachments', task.id] })
      onSuccess()
    } catch (err: any) {
      setError(normalizeApiError(err).message)
    }
  }



  const handleUpdateField = async (fields: Parameters<typeof updateTask>[1]) => {
    try {
      await updateTask(task.id, fields)
      onSuccess()
    } catch (err: any) {
      setError(normalizeApiError(err).message)
    }
  }

  // Checklist updates
  const handleAddChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChecklistItem.trim()) return
    const newItem = {
      id: Math.random().toString(36).substring(2, 9),
      text: newChecklistItem.trim(),
      is_completed: false,
    }
    const updatedChecklist = [...checklist, newItem]
    setNewChecklistItem('')
    await handleUpdateField({ checklist: updatedChecklist })
  }

  const handleToggleChecklistItem = async (itemId: string) => {
    const updatedChecklist = checklist.map((item) =>
      item.id === itemId ? { ...item, is_completed: !item.is_completed } : item
    )
    await handleUpdateField({ checklist: updatedChecklist })
  }

  const handleDeleteChecklistItem = async (itemId: string) => {
    const updatedChecklist = checklist.filter((item) => item.id !== itemId)
    await handleUpdateField({ checklist: updatedChecklist })
  }

  // Special actions (Approvals, Rework)
  const handleLifecycleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (showActionDialog === 'request_changes' && !actionReason.trim()) {
      setError('Rework reason is required')
      return
    }
    setIsActionSubmitting(true)
    setError(null)
    try {
      if (showActionDialog === 'request_approval') {
        await requestTaskApproval(task.id, { reason: actionReason })
      } else if (showActionDialog === 'approve') {
        await approveTask(task.id, { reason: actionReason })
      } else if (showActionDialog === 'request_changes') {
        await requestTaskChanges(task.id, { reason: actionReason })
      } else if (showActionDialog === 'delete') {
        await deleteTask(task.id)
        onClose()
        onSuccess()
        return
      }
      setShowActionDialog(null)
      setActionReason('')
      onSuccess()
    } catch (err: any) {
      setError(normalizeApiError(err).message)
    } finally {
      setIsActionSubmitting(false)
    }
  }

  // Effect to sync fields when task updates
  useEffect(() => {
    setTitle(task.title)
    setDescription(task.description || '')
    setLocalAssignee(task.assigned_to ?? '')
    setLocalStatus(task.status)
    setLocalPriority(task.priority)
    setLocalDueDate(task.due_date ? task.due_date.slice(0, 10) : '')
    setLocalSlot(task.slot ?? '')
    setLocalIsDaily(task.is_daily ?? false)
  }, [task])

  // Get allowed next statuses to restrict dropdown
  const allowedStatuses = useMemo(() => {
    const current = task.status
    if (isPM) {
      // PMs can set anything, but respect enums
      return Object.keys(taskStatusLabels) as TaskStatus[]
    }
    // Team members allowed transitions
    if (current === 'yet_to_start') return ['yet_to_start', 'ongoing', 'blocked'] as TaskStatus[]
    if (current === 'ongoing') return ['ongoing', 'blocked'] as TaskStatus[]
    if (current === 'blocked') return ['blocked', 'ongoing'] as TaskStatus[]
    if (current === 'rework') return ['rework', 'ongoing', 'blocked'] as TaskStatus[]
    return [current] as TaskStatus[]
  }, [task.status, isPM])

  const isLocked = task.status === 'task_approved_by_manager' || task.status === 'task_approved_by_client'

  return createPortal(
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="task-detail-modal" style={{ width: '800px', maxWidth: '95vw', padding: '24px', display: 'flex', flexDirection: 'column', height: '85vh', maxHeight: '90vh', overflow: 'hidden' }}>
        
        {/* Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--hover-bg, #F0F0EC)', paddingBottom: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            {isLocked ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success-green, #2DA86B)', fontSize: '12px', fontWeight: 'bold' }}>
                <CheckCircle size={14} /> Task Completed & Locked
              </div>
            ) : null}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!canEditDetails || isLocked}
              data-testid="input-edit-task-title"
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                border: 'none',
                background: 'transparent',
                padding: '4px 0',
                width: '100%',
                outline: 'none',
                color: 'var(--primary-text, #1A1A1A)',
                borderBottom: canEditDetails && !isLocked ? '1px dashed transparent' : undefined
              }}
              onFocus={(e) => {
                if (canEditDetails && !isLocked) e.currentTarget.style.borderBottom = '1px dashed var(--muted-text)'
              }}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="icon-button" onClick={onClose} type="button" aria-label="Close modal">
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid var(--hover-bg, #F0F0EC)', marginBottom: '16px', background: 'var(--secondary-bg, #F5F5F2)', padding: '2px', borderRadius: '6px' }}>
          {(['details', 'comments', 'attachments', 'logs'] as TabType[]).map((tab) => {
            const icons = {
              details: <Clock size={14} />,
              comments: <MessageSquare size={14} />,
              attachments: <Paperclip size={14} />,
              logs: <History size={14} />,
            }
            const labels = {
              details: 'Details',
              comments: 'Comments',
              attachments: 'Attachments',
              logs: 'Task Logs',
            }
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                type="button"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  border: 'none',
                  background: isActive ? 'var(--card-bg, #FFFFFF)' : 'transparent',
                  color: isActive ? 'var(--primary-text, #1A1A1A)' : 'var(--secondary-text, #6B6B6B)',
                  borderRadius: '4px',
                  fontWeight: isActive ? '600' : '500',
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {icons[tab]} {labels[tab]}
              </button>
            )
          })}
        </div>

        {/* Main Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', paddingBottom: '24px', marginBottom: '16px' }}>
          {error ? <div className="notice error" style={{ marginBottom: '16px' }}>{error}</div> : null}

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Row 1: Assignee, status, priority, due date, slot, is_daily */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', background: 'var(--secondary-bg, #F5F5F2)', padding: '16px', borderRadius: '8px' }}>
                <label className="field" style={{ marginTop: 0 }}>
                  <span>Assignee</span>
                  <select
                    value={localAssignee}
                    disabled={!canEditDetails || isLocked}
                    onChange={(e) => setLocalAssignee(e.target.value)}
                    style={{ background: 'var(--card-bg, #FFFFFF)' }}
                    data-testid="select-task-card-assignee"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                    {!isPM && task.assignee ? (
                      <option value={task.assignee.id}>{task.assignee.full_name}</option>
                    ) : null}
                  </select>
                </label>

                <label className="field" style={{ marginTop: 0 }}>
                  <span>Status</span>
                  <select
                    value={localStatus}
                    disabled={!canEditProgress || isLocked}
                    onChange={(e) => setLocalStatus(e.target.value as TaskStatus)}
                    style={{ background: 'var(--card-bg, #FFFFFF)' }}
                    data-testid="select-task-status"
                  >
                    {allowedStatuses.map((status) => (
                      <option key={status} value={status}>
                        {taskStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field" style={{ marginTop: 0 }}>
                  <span>Priority</span>
                  <select
                    value={localPriority}
                    disabled={!canEditDetails || isLocked}
                    onChange={(e) => setLocalPriority(e.target.value as any)}
                    style={{ background: 'var(--card-bg, #FFFFFF)' }}
                    data-testid="select-edit-task-priority"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>

                <label className="field" style={{ marginTop: 0 }}>
                  <span>Due Date</span>
                  <input
                    type="date"
                    value={localIsDaily ? '' : localDueDate}
                    disabled={!canEditDetails || isLocked || localIsDaily}
                    onChange={(e) => setLocalDueDate(e.target.value)}
                    style={{ background: 'var(--card-bg, #FFFFFF)', opacity: localIsDaily ? 0.5 : 1 }}
                    data-testid="input-edit-task-due-date"
                  />
                </label>

                <label className="field" style={{ marginTop: 0 }}>
                  <span>Slot Time</span>
                  <input
                    type="text"
                    value={localSlot}
                    disabled={!canEditDetails || isLocked}
                    onChange={(e) => setLocalSlot(e.target.value)}
                    placeholder="e.g. 10:00 AM"
                    style={{ background: 'var(--card-bg, #FFFFFF)' }}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '600', color: 'var(--secondary)', cursor: 'pointer', marginTop: '24px' }}>
                  <input
                    type="checkbox"
                    checked={localIsDaily}
                    disabled={!canEditDetails || isLocked}
                    onChange={(e) => setLocalIsDaily(e.target.checked)}
                  />
                  Daily Task
                </label>
              </div>

              {/* Description field */}
              <label className="field" style={{ marginTop: 0 }}>
                <span>Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!canEditProgress || isLocked}
                  placeholder="Task Description"
                  rows={3}
                  data-testid="textarea-edit-task-description"
                  style={{
                    background: 'var(--input-bg, #F7F7F5)',
                    padding: '12px',
                    borderRadius: '6px',
                    lineHeight: '1.5',
                  }}
                />
              </label>



              {/* Blockers list and Log Blocker form */}
              <div style={{ borderTop: '1px solid var(--hover-bg, #F0F0EC)', paddingTop: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger-red, #D44)' }}>
                  <AlertCircle size={16} /> Blockers ({blockersQuery.data?.length ?? 0})
                </h3>

                {/* List Blockers */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  {blockersQuery.data?.map((blocker) => (
                    <div key={blocker.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px', borderRadius: '6px', background: 'var(--red-light, #FFF5F5)', border: '1px solid var(--red-border, #FFE3E3)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '13.5px', color: 'var(--red, #C53030)' }}>{blocker.title}</strong>
                        <span className={`status-badge ${blocker.status}`} style={{ fontSize: '11px' }}>
                          {blocker.status}
                        </span>
                      </div>
                      <p style={{ fontSize: '12.5px', color: '#4A5568', margin: '2px 0' }}>{blocker.description}</p>
                      {blocker.impact ? (
                        <div style={{ fontSize: '11px', color: '#718096' }}>
                          <strong>Impact:</strong> {blocker.impact}
                        </div>
                      ) : null}
                      
                      {/* Show Assignee and Flagged By */}
                      <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#718096', marginTop: '2px', flexWrap: 'wrap' }}>
                        <span><strong>Assigned By:</strong> {blocker.flagger?.full_name || 'System'}</span>
                        <span>·</span>
                        <span><strong>Assignee:</strong> {blocker.assignee?.full_name || 'Unassigned'}</span>
                      </div>

                      {blocker.resolution_notes ? (
                        <div style={{ fontSize: '12px', color: 'var(--success-green, #287A4A)', background: '#F0FFF4', padding: '6px', borderRadius: '4px', marginTop: '4px' }}>
                          <strong>Resolution:</strong> {blocker.resolution_notes}
                        </div>
                      ) : null}

                      {/* Blocker Resolution Form */}
                      {blocker.status === 'open' && (isPM || currentUser?.id === blocker.flagged_by || currentUser?.id === blocker.assigned_to) && (
                        <div style={{ marginTop: '8px', borderTop: '1px dashed #FFE3E3', paddingTop: '8px' }}>
                          {resolvingBlockerId === blocker.id ? (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <input
                                type="text"
                                value={resolutionNotes}
                                onChange={(e) => setResolutionNotes(e.target.value)}
                                placeholder="Resolution Notes *"
                                required
                                style={{ flex: 1, padding: '4px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--hover-bg, #F0F0EC)', background: '#FFFFFF' }}
                              />
                              <button
                                className="primary-action compact"
                                onClick={() => handleResolveBlocker(blocker.id)}
                                disabled={isResolving}
                                style={{ background: 'var(--success-green, #2DA86B)', fontSize: '11px', padding: '4px 10px' }}
                              >
                                {isResolving ? 'Resolving...' : 'Submit'}
                              </button>
                              <button
                                className="ghost-button compact"
                                onClick={() => { setResolvingBlockerId(null); setResolutionNotes(''); }}
                                style={{ fontSize: '11px', padding: '4px 10px' }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              className="ghost-button compact"
                              onClick={() => { setResolvingBlockerId(blocker.id); setResolutionNotes(''); }}
                              style={{ fontSize: '11px', padding: '2px 8px', color: 'var(--success-green, #2DA86B)', borderColor: 'var(--success-green, #2DA86B)', background: '#FFFFFF' }}
                            >
                              Resolve Blocker
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {blockersQuery.data?.length === 0 ? (
                    <p style={{ fontSize: '13px', color: 'var(--muted-text, #9A9A9A)', fontStyle: 'italic' }}>No blockers logged for this task.</p>
                  ) : null}
                </div>

                {/* Log Blocker form */}
                {!isLocked && (
                  <form onSubmit={handleCreateBlocker} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--secondary-bg, #F5F5F2)', padding: '12px', borderRadius: '8px', marginTop: '12px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 4px 0' }}>Log a Blocker</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <input
                        type="text"
                        value={blockerTitle}
                        onChange={(e) => setBlockerTitle(e.target.value)}
                        placeholder="Blocker Title *"
                        required
                        data-testid="input-blocker-title"
                        style={{ padding: '6px 10px', fontSize: '13px', background: '#FFFFFF', border: '1px solid var(--hover-bg, #F0F0EC)', borderRadius: '4px' }}
                      />
                      <input
                        type="text"
                        value={blockerImpact}
                        onChange={(e) => setBlockerImpact(e.target.value)}
                        placeholder="Impact (optional)"
                        data-testid="input-blocker-impact"
                        style={{ padding: '6px 10px', fontSize: '13px', background: '#FFFFFF', border: '1px solid var(--hover-bg, #F0F0EC)', borderRadius: '4px' }}
                      />
                    </div>
                    <textarea
                      value={blockerDescription}
                      onChange={(e) => setBlockerDescription(e.target.value)}
                      placeholder="Blocker Description / Details *"
                      required
                      rows={2}
                      data-testid="textarea-blocker-description"
                      style={{ padding: '6px 10px', fontSize: '13px', background: '#FFFFFF', border: '1px solid var(--hover-bg, #F0F0EC)', borderRadius: '4px' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                          <span>Severity:</span>
                          <select
                            value={blockerSeverity}
                            onChange={(e) => setBlockerSeverity(e.target.value as any)}
                            data-testid="select-blocker-severity"
                            style={{ padding: '2px 6px', background: '#FFFFFF', border: '1px solid var(--hover-bg, #F0F0EC)', borderRadius: '4px' }}
                          >
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                          <span>Assignee:</span>
                          <select
                            value={blockerAssignee}
                            onChange={(e) => setBlockerAssignee(e.target.value)}
                            required
                            style={{ padding: '2px 6px', background: '#FFFFFF', border: '1px solid var(--hover-bg, #F0F0EC)', borderRadius: '4px' }}
                          >
                            <option value="" disabled>Select Assignee *</option>
                            {users.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.full_name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <button
                        className="primary-action compact"
                        type="submit"
                        disabled={isBlockerSubmitting}
                        data-testid="button-create-blocker"
                      >
                        {isBlockerSubmitting ? 'Logging...' : 'Create Blocker'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Checklist builder */}
              <div style={{ borderTop: '1px solid var(--hover-bg, #F0F0EC)', paddingTop: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckSquare size={16} /> Checklist ({checklist.filter(c => c.is_completed).length}/{checklist.length})
                </h3>
                
                {/* List Checklist items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  {checklist.map((item) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px', borderRadius: '4px', background: 'var(--secondary-bg, #F5F5F2)' }}>
                      <button
                        onClick={() => !isLocked && handleToggleChecklistItem(item.id)}
                        disabled={isLocked}
                        type="button"
                        style={{ border: 'none', background: 'transparent', padding: 0, cursor: isLocked ? 'default' : 'pointer', color: 'var(--primary-accent, #3B6DD6)' }}
                      >
                        {item.is_completed ? <CheckSquare size={17} /> : <Square size={17} />}
                      </button>
                      <span style={{ fontSize: '13.5px', textDecoration: item.is_completed ? 'line-through' : 'none', color: item.is_completed ? 'var(--muted-text, #9A9A9A)' : 'var(--primary-text, #1A1A1A)', flex: 1 }}>
                        {item.text}
                      </span>
                      {!isLocked ? (
                        <button
                          onClick={() => handleDeleteChecklistItem(item.id)}
                          type="button"
                          className="icon-button"
                          style={{ padding: '4px', color: 'var(--danger-red, #D44)' }}
                          aria-label="Delete item"
                        >
                          <Trash2 size={13} />
                        </button>
                      ) : null}
                    </div>
                  ))}
                  {checklist.length === 0 ? (
                    <p style={{ fontSize: '13px', color: 'var(--muted-text, #9A9A9A)', fontStyle: 'italic' }}>No checklist items added.</p>
                  ) : null}
                </div>

                {/* Add item form */}
                {!isLocked && canEditProgress ? (
                  <form onSubmit={handleAddChecklistItem} style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      placeholder="Add checklist item..."
                      style={{ flex: 1, padding: '6px 10px', fontSize: '13px', background: 'var(--input-bg, #F7F7F5)', border: '1px solid var(--hover-bg, #F0F0EC)', borderRadius: '4px' }}
                    />
                    <button className="ghost-button" type="submit" style={{ padding: '6px 12px', fontSize: '13px' }}>
                      Add
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--hover-bg, #F0F0EC)', borderRadius: '8px', padding: '12px', background: 'var(--secondary-bg, #F5F5F2)' }}>
                {commentsQuery.isLoading ? <p>Loading comments...</p> : null}
                {commentsQuery.data?.map((comment) => (
                  <div key={comment.id} style={{ display: 'flex', gap: '10px', background: '#FFFFFF', padding: '12px', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary-accent, #3B6DD6)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                      {comment.author.full_name.split(' ').map((p: any) => p[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted-text, #9A9A9A)' }}>
                        <strong>{comment.author.full_name}</strong>
                        <span>{new Date(comment.created_at).toLocaleString()}</span>
                      </div>
                      <p style={{ fontSize: '13.5px', color: 'var(--primary-text, #1A1A1A)', lineHeight: '1.4', marginTop: '4px' }}>
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))}
                {commentsQuery.data?.length === 0 ? (
                  <p style={{ fontStyle: 'italic', color: 'var(--muted-text, #9A9A9A)', textAlign: 'center', padding: '16px' }}>No comments posted yet.</p>
                ) : null}
              </div>

              {!isLocked ? (
                <form onSubmit={handleAddComment} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <textarea
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder="Type a comment..."
                    rows={3}
                    required
                    style={{ background: 'var(--input-bg, #F7F7F5)', padding: '10px', borderRadius: '6px', fontSize: '13px' }}
                  />
                  <button className="primary-action compact" type="submit" disabled={isCommentAdding} style={{ alignSelf: 'flex-end' }}>
                    {isCommentAdding ? 'Posting...' : 'Post Comment'}
                  </button>
                </form>
              ) : null}
            </div>
          )}

          {/* Attachments Tab */}
          {activeTab === 'attachments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Add Attachment form */}
              {!isLocked ? (
                <form onSubmit={handleAddAttachment} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '10px', background: 'var(--secondary-bg, #F5F5F2)', padding: '12px', borderRadius: '8px' }}>
                  <input
                    type="text"
                    value={attachmentName}
                    onChange={(e) => setAttachmentName(e.target.value)}
                    required
                    placeholder="File name (e.g. Final Design Docs)"
                    style={{ fontSize: '13px', background: '#FFFFFF', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--hover-bg, #F0F0EC)' }}
                  />
                  <input
                    type="url"
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    required
                    placeholder="Google Drive link or folder URL"
                    style={{ fontSize: '13px', background: '#FFFFFF', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--hover-bg, #F0F0EC)' }}
                  />
                  <button className="primary-action compact" type="submit" disabled={isAttachmentAdding}>
                    Add
                  </button>
                </form>
              ) : null}

              {/* Attachments list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {attachmentsQuery.isLoading ? <p>Loading attachments...</p> : null}
                {attachmentsQuery.data?.map((att) => (
                  <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--hover-bg, #F0F0EC)', background: 'var(--card-bg, #FFFFFF)' }}>
                    <Paperclip size={16} style={{ color: 'var(--primary-accent, #3B6DD6)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                      <a href={att.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '14px', fontWeight: '600', color: 'var(--primary-accent, #3B6DD6)', textDecoration: 'none' }}>
                        {att.file_name}
                      </a>
                      <span style={{ fontSize: '11px', color: 'var(--muted-text, #9A9A9A)' }}>
                        Uploaded by {att.uploader?.full_name ?? 'user'}
                      </span>
                    </div>
                    {!isLocked ? (
                      <button
                        onClick={() => handleDeleteAttachment(att.id)}
                        type="button"
                        className="icon-button"
                        style={{ color: 'var(--danger-red, #D44)' }}
                        aria-label="Remove attachment"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : null}
                  </div>
                ))}
                {attachmentsQuery.data?.length === 0 ? (
                  <p style={{ fontStyle: 'italic', color: 'var(--muted-text, #9A9A9A)', textAlign: 'center', padding: '16px' }}>No attachments linked yet.</p>
                ) : null}
              </div>
            </div>
          )}

          {/* Task Logs Tab */}
          {activeTab === 'logs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="table-wrap">
                <table style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Modifier</th>
                      <th>Field Changed</th>
                      <th>Old Value</th>
                      <th>New Value</th>
                      <th>Notes/Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsQuery.isLoading ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center' }}>Loading logs...</td></tr>
                    ) : null}
                    {logsQuery.data?.map((log) => (
                      <tr key={log.id}>
                        <td>{new Date(log.created_at).toLocaleString()}</td>
                        <td><strong>{log.user.full_name}</strong></td>
                        <td><span className="pill">{log.field}</span></td>
                        <td style={{ color: 'var(--danger-red, #D44)', fontStyle: 'italic' }}>{log.old_value || '-'}</td>
                        <td style={{ color: 'var(--success-green, #2DA86B)', fontWeight: 'bold' }}>{log.new_value || '-'}</td>
                        <td>{log.reason || <span style={{ color: 'var(--muted-text, #9A9A9A)', fontStyle: 'italic' }}>None</span>}</td>
                      </tr>
                    ))}
                    {logsQuery.data?.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', fontStyle: 'italic', color: 'var(--muted-text)' }}>No changes recorded yet.</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions (Lifecycle Transitions) */}
        <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--hover-bg, #F0F0EC)', paddingTop: '16px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          
          {/* Delete Option for PM */}
          {isPM && (
            <button
              className="ghost-button"
              onClick={() => setShowActionDialog('delete')}
              type="button"
              style={{ color: 'var(--danger-red, #D44)', marginRight: 'auto' }}
            >
              <Trash2 size={14} /> Delete Task
            </button>
          )}

          {/* Apply changes option */}
          {activeTab === 'details' && !isLocked && (
            <button
              className="primary-action"
              type="button"
              data-testid="button-save-task"
              onClick={async () => {
                setError(null)
                try {
                  await updateTask(task.id, {
                    title: title.trim() || undefined,
                    description: description || undefined,
                    assigned_to: localAssignee || null,
                    status: localStatus as TaskStatus,
                    priority: localPriority as any,
                    due_date: localIsDaily ? null : (localDueDate || null),
                    is_daily: localIsDaily,
                    slot: localSlot || null,
                  })
                  onSuccess()
                } catch (err: any) {
                  setError(normalizeApiError(err).message)
                }
              }}
            >
              Apply changes
            </button>
          )}

          {/* Complete Task Option */}
          {(!isLocked && task.status !== 'completed' && canEditProgress) ? (
            <button
              className="primary-action"
              onClick={handleCompleteTask}
              type="button"
              data-testid="button-complete-task"
              disabled={isCompleting}
              style={{ background: 'var(--success-green, #2DA86B)' }}
            >
              {isCompleting ? 'Completing...' : 'Complete Task'}
            </button>
          ) : null}

          {/* Request Approval for TM */}
          {!isPM && isAssigned && (task.status === 'ongoing' || task.status === 'rework') ? (
            <button
              className="primary-action"
              onClick={() => setShowActionDialog('request_approval')}
              type="button"
            >
              Request Approval
            </button>
          ) : null}

          {/* PM Review Buttons */}
          {isPM && task.status === 'completed' ? (
            <>
              <button
                className="ghost-button"
                onClick={() => setShowActionDialog('request_changes')}
                type="button"
                style={{ color: 'var(--warning-amber, #D48806)' }}
              >
                Request Changes
              </button>
              <button
                className="primary-action"
                onClick={() => setShowActionDialog('approve')}
                type="button"
                style={{ background: 'var(--success-green, #2DA86B)' }}
              >
                Approve Task
              </button>
            </>
          ) : null}
        </div>
      </section>

      {/* Action Dialog / Reason popups */}
      {showActionDialog ? (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <section className="task-detail-modal" style={{ maxWidth: '440px', padding: '20px' }}>
            <div className="panel-header" style={{ marginBottom: '14px' }}>
              <h2>
                {showActionDialog === 'delete' ? 'Delete Task' :
                 showActionDialog === 'request_approval' ? 'Request Approval' :
                 showActionDialog === 'approve' ? 'Approve Task' :
                 'Request Changes'}
              </h2>
              <button className="icon-button" onClick={() => { setShowActionDialog(null); setActionReason(''); }} type="button">
                <X size={15} />
              </button>
            </div>
            
            <form onSubmit={handleLifecycleActionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {showActionDialog === 'delete' ? (
                <p style={{ fontSize: '13.5px', color: 'var(--primary-text, #1A1A1A)', lineHeight: '1.4' }}>
                  Are you absolutely sure you want to delete <strong>"{task.title}"</strong>? This will permanently remove the task and all comments, attachments, and logs. This action cannot be undone.
                </p>
              ) : (
                <label className="field">
                  <span>
                    {showActionDialog === 'request_changes' ? 'Feedback / Changes Needed *' : 'Reason / Review Notes (optional)'}
                  </span>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    required={showActionDialog === 'request_changes'}
                    placeholder={
                      showActionDialog === 'request_changes' ? 'Describe the changes needed...' :
                      showActionDialog === 'request_approval' ? 'Notes about completed work...' :
                      'Approval feedback notes...'
                    }
                    rows={4}
                    style={{ background: 'var(--input-bg, #F7F7F5)', padding: '10px' }}
                  />
                </label>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  className="ghost-button"
                  onClick={() => { setShowActionDialog(null); setActionReason(''); }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="primary-action"
                  type="submit"
                  disabled={isActionSubmitting}
                  style={{
                    background: showActionDialog === 'delete' ? 'var(--danger-red, #D44)' :
                                showActionDialog === 'request_changes' ? 'var(--warning-amber, #D48806)' :
                                showActionDialog === 'approve' ? 'var(--success-green, #2DA86B)' :
                                undefined
                  }}
                >
                  {isActionSubmitting ? 'Processing...' :
                   showActionDialog === 'delete' ? 'Confirm Delete' :
                   showActionDialog === 'request_changes' ? 'Send Back to TM' :
                   'Submit'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>,
    document.body
  )
}

function daysUntil(value?: string | null) {
  if (!value) return 'No deadline'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(`${value.slice(0, 10)}T00:00:00.000Z`)
  const days = Math.ceil((due.getTime() - today.getTime()) / 86_400_000)
  if (days < 0) return `${Math.abs(days)} days overdue`
  if (days === 0) return 'Due today'
  return `${days} days left`
}
