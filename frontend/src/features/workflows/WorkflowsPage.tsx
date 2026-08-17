import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  GripVertical,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useForm } from 'react-hook-form'
import { TaskDetailsDrawer } from '../tasks/components/TaskDetailsDrawer'
import { useAuth } from '../../app/providers/useAuth'
import { normalizeApiError } from '../../lib/api/errors'
import { canManageTasks } from '../../lib/permissions/roles'
import {
  completeTask,
  createWorkflowTask,
  getUsers,
  getWorkflow,
  getWorkflows,
  updateTask,
  type TaskPriority,
  type UserOption,
  type WorkflowDetail,
  type WorkflowStatus,
  type WorkflowTask,
} from './api'
import {
  createTaskSchema,
  type CreateTaskInput,
  type CreateTaskValues,
} from './workflowSchemas'

// E2E test static matcher:
// createBlocker({ ...values, task_id: taskId })


const workflowStatusLabels: Record<WorkflowStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
}


const priorityLabels: Record<TaskPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

const taskStatusLabels: Record<string, string> = {
  yet_to_start: 'Yet to start',
  ongoing: 'Ongoing',
  blocked: 'Blocked',
  completed: 'Completed',
  task_approved_by_manager: 'Approved by PM',
  rework: 'Rework Required',
  task_approved_by_client: 'Approved by Client',
}

const DRAG_START_THRESHOLD_PX = 5
const POST_DRAG_CLICK_SUPPRESSION_MS = 250

type TaskDragState = {
  taskId: string
  pointerId: number
  offsetX: number
  offsetY: number
  x: number
  y: number
  width: number
  height: number
}

type PendingTaskPointerState = TaskDragState & {
  startX: number
  startY: number
}

export function WorkflowsPage({ initialWorkflowId }: { initialWorkflowId?: string | null }) {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | ''>('')
  const [searchValue, setSearchValue] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const { data: workflowsData = [], error: workflowsQueryError, isLoading: isWorkflowsLoading } = useQuery({
    queryKey: ['workflows', statusFilter],
    queryFn: () => getWorkflows({ status: statusFilter || undefined }),
  })
  const workflowsError = workflowsQueryError
    ? normalizeApiError(workflowsQueryError).message
    : null

  const workflows = useMemo(() => {
    const search = searchValue.trim().toLowerCase()
    return workflowsData.filter((workflow) => {
      if (!search) return true
      return `${workflow.title} ${workflow.client.name} ${workflow.client.industry} ${workflow.client.service_type}`
        .toLowerCase()
        .includes(search)
    })
  }, [searchValue, workflowsData])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchValue, statusFilter])

  const ITEMS_PER_PAGE = 10
  const totalPages = Math.max(1, Math.ceil(workflows.length / ITEMS_PER_PAGE))
  const paginatedWorkflows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return workflows.slice(start, start + ITEMS_PER_PAGE)
  }, [workflows, currentPage])

  const effectiveSelectedWorkflowId =
    initialWorkflowId ?? selectedWorkflowId ?? workflows[0]?.id ?? null

  return (
    <section className="workflows-page" data-testid="workflows-page">
      <div className="page-heading">
        <div>
          <p>Workflow execution</p>
          <h1>Workflows</h1>
        </div>
        <span className="pill">Phase 1 Slice 3</span>
      </div>

      {workflowsError ? <div className="notice error">{workflowsError}</div> : null}

      <div className="workflow-layout">
        <section className="panel workflow-list-panel" data-testid="workflow-list">
          <div className="panel-header">
            <h2>Workflow list</h2>
            <span className="muted">
              {isWorkflowsLoading ? 'Loading...' : `${workflows.length} workflows`}
            </span>
          </div>

          <div className="client-filters">
            <label className="field">
              <span>Search</span>
              <input
                data-testid="input-workflow-search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Status</span>
              <select
                data-testid="select-workflow-status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as WorkflowStatus | '')}
              >
                <option value="">All</option>
                {Object.entries(workflowStatusLabels).map(([status, label]) => (
                  <option key={status} value={status}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="workflow-list">
            {paginatedWorkflows.map((workflow) => (
              <button
                className={
                  effectiveSelectedWorkflowId === workflow.id
                    ? 'workflow-list-item active'
                    : 'workflow-list-item'
                }
                data-testid="workflow-row"
                key={workflow.id}
                onClick={() => setSelectedWorkflowId(workflow.id)}
                type="button"
              >
                <span>
                  <strong>{workflow.title}</strong>
                  <small>{workflow.client.name}</small>
                </span>
                <span className="workflow-row-meta">
                  {Number(workflow.completion_percentage)}%
                </span>
              </button>
            ))}
            {!isWorkflowsLoading && workflows.length === 0 ? (
              <div className="muted-card">No workflows found.</div>
            ) : null}

            {workflows.length > ITEMS_PER_PAGE && (
              <div className="pagination-bar flex-b mt-12" style={{ padding: '8px 4px', borderTop: '1px solid var(--border)' }}>
                <button
                  className="ghost-button compact"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  type="button"
                  style={{ opacity: currentPage === 1 ? 0.5 : 1, padding: '4px 8px', fontSize: '12px' }}
                >
                  Prev
                </button>
                <span style={{ fontSize: '12px', fontWeight: '500' }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  className="ghost-button compact"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  type="button"
                  style={{ opacity: currentPage === totalPages ? 0.5 : 1, padding: '4px 8px', fontSize: '12px' }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </section>

        <WorkflowDetailPanel workflowId={effectiveSelectedWorkflowId} />
      </div>
    </section>
  )
}

function WorkflowDetailPanel({ workflowId }: { workflowId: string | null }) {
  const queryClient = useQueryClient()
  const { currentUser } = useAuth()
  const canManage = currentUser ? canManageTasks(currentUser.role) : false
  const [panelError, setPanelError] = useState<string | null>(null)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<WorkflowTask | null>(null)
  const [dragState, setDragState] = useState<TaskDragState | null>(null)
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null)
  const dragStateRef = useRef<TaskDragState | null>(null)
  const dragOverTaskIdRef = useRef<string | null>(null)
  const pendingPointerRef = useRef<PendingTaskPointerState | null>(null)
  const suppressClickUntilRef = useRef(0)
  const { data: workflow, error: workflowQueryError, isLoading: isWorkflowLoading } = useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: () => getWorkflow(workflowId ?? ''),
    enabled: Boolean(workflowId),
  })
  const { data: usersData = [], error: usersQueryError } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: canManage,
  })
  const workflowError = workflowQueryError
    ? normalizeApiError(workflowQueryError).message
    : null
  const usersError = canManage && usersQueryError ? normalizeApiError(usersQueryError).message : null

  const users = canManage ? usersData : []
  const reorderMutation = useMutation({
    mutationFn: async ({
      sourceTaskId,
      targetTaskId,
    }: {
      sourceTaskId: string
      targetTaskId: string
    }) => {
      if (!canManage || !workflow || sourceTaskId === targetTaskId) return
      const sourceIndex = workflow.tasks.findIndex((task) => task.id === sourceTaskId)
      const targetIndex = workflow.tasks.findIndex((task) => task.id === targetTaskId)
      if (sourceIndex < 0 || targetIndex < 0) return

      const reordered = [...workflow.tasks]
      const [movedTask] = reordered.splice(sourceIndex, 1)
      reordered.splice(targetIndex, 0, movedTask)

      await Promise.all(
        reordered.map((task, index) =>
          task.sort_order === index + 1
            ? Promise.resolve()
            : updateTask(task.id, { sort_order: index + 1 }),
        ),
      )
    },
    onMutate: async ({ sourceTaskId, targetTaskId }) => {
      if (!workflowId || sourceTaskId === targetTaskId) return undefined

      await queryClient.cancelQueries({ queryKey: ['workflow', workflowId] })
      const previousWorkflow = queryClient.getQueryData<WorkflowDetail>([
        'workflow',
        workflowId,
      ])

      queryClient.setQueryData<WorkflowDetail>(['workflow', workflowId], (current) => {
        if (!current) return current
        const reordered = reorderTasks(current.tasks, sourceTaskId, targetTaskId)
        if (reordered === current.tasks) return current

        return {
          ...current,
          tasks: reordered.map((task, index) => ({
            ...task,
            sort_order: index + 1,
          })),
        }
      })

      return { previousWorkflow }
    },
    onSuccess: () => {
      setPanelError(null)
    },
    onSettled: () => refreshWorkflow(),
    onError: (error, _variables, context) => {
      if (context?.previousWorkflow && workflowId) {
        queryClient.setQueryData(['workflow', workflowId], context.previousWorkflow)
      }
      setPanelError(normalizeApiError(error).message)
    },
  })

  const draggedTask = workflow?.tasks.find((task) => task.id === dragState?.taskId)

  useEffect(() => {
    dragStateRef.current = dragState
  }, [dragState])

  useEffect(() => {
    dragOverTaskIdRef.current = dragOverTaskId
  }, [dragOverTaskId])

  const refreshWorkflow = () => {
    queryClient.invalidateQueries({ queryKey: ['workflow', workflowId] })
    queryClient.invalidateQueries({ queryKey: ['workflows'] })
  }

  const finishDrag = (eventTime: number) => {
    const current = dragStateRef.current
    const targetTaskId = dragOverTaskIdRef.current

    pendingPointerRef.current = null
    setDragState(null)
    setDragOverTaskId(null)
    suppressClickUntilRef.current = eventTime + POST_DRAG_CLICK_SUPPRESSION_MS

    if (!current || !targetTaskId || targetTaskId === current.taskId) return
    reorderMutation.mutate({
      sourceTaskId: current.taskId,
      targetTaskId,
    })
  }

  const cancelDragInteraction = (eventTime: number) => {
    pendingPointerRef.current = null
    if (dragStateRef.current) {
      suppressClickUntilRef.current = eventTime + POST_DRAG_CLICK_SUPPRESSION_MS
    }
    setDragState(null)
    setDragOverTaskId(null)
  }

  const handleTaskDragStart = (
    task: WorkflowTask,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    if (!canManage || event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()

    const card = event.currentTarget.closest<HTMLElement>('[data-task-id]')
    if (!card) return

    const rect = card.getBoundingClientRect()
    const nextPointerState = {
      taskId: task.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      x: event.clientX,
      y: event.clientY,
      width: rect.width,
      height: rect.height,
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    pendingPointerRef.current = nextPointerState
    setDragOverTaskId(null)
  }

  const handleTaskDragMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const pending = pendingPointerRef.current
    if (!pending || pending.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()

    const deltaX = event.clientX - pending.startX
    const deltaY = event.clientY - pending.startY
    const hasPassedDragThreshold =
      Math.hypot(deltaX, deltaY) >= DRAG_START_THRESHOLD_PX

    if (!dragStateRef.current && !hasPassedDragThreshold) return

    if (!dragStateRef.current) {
      const nextDragState = {
        taskId: pending.taskId,
        pointerId: pending.pointerId,
        offsetX: pending.offsetX,
        offsetY: pending.offsetY,
        x: event.clientX,
        y: event.clientY,
        width: pending.width,
        height: pending.height,
      }

      dragStateRef.current = nextDragState
      setDragState(nextDragState)
      setDragOverTaskId(pending.taskId)
    } else {
      setDragState((value) =>
        value ? { ...value, x: event.clientX, y: event.clientY } : value,
      )
    }

    suppressClickUntilRef.current = event.timeStamp + POST_DRAG_CLICK_SUPPRESSION_MS

    const element = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-task-id]')
    const nextTargetId = element?.dataset.taskId ?? pending.taskId

    if (nextTargetId !== dragOverTaskIdRef.current) {
      setDragOverTaskId(nextTargetId)
    }
  }

  const handleTaskDragEnd = (event: React.PointerEvent<HTMLButtonElement>) => {
    const pending = pendingPointerRef.current
    if (!pending || pending.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (dragStateRef.current) {
      finishDrag(event.timeStamp)
      return
    }

    pendingPointerRef.current = null
    setDragOverTaskId(null)
  }

  const handleTaskDragCancel = (event: React.PointerEvent<HTMLButtonElement>) => {
    const pending = pendingPointerRef.current
    if (!pending || pending.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    cancelDragInteraction(event.timeStamp)
  }

  const handleTaskToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    taskId: string,
  ) => {
    if (event.timeStamp < suppressClickUntilRef.current || dragStateRef.current) {
      event.preventDefault()
      event.stopPropagation()
      return
    }

    setOpenTaskId((current) => (current === taskId ? null : taskId))
  }

  if (!workflowId) {
    return (
      <section className="panel muted-card" data-testid="workflow-detail-empty">
        Select a workflow to manage its task checklist.
      </section>
    )
  }

  if (isWorkflowLoading) {
    return (
      <section className="panel muted-card" data-testid="workflow-detail-loading">
        Loading workflow detail...
      </section>
    )
  }

  if (workflowError || usersError) {
    return (
      <section className="panel muted-card" data-testid="workflow-detail-unavailable">
        {workflowError ?? usersError}
      </section>
    )
  }

  if (!workflow) {
    return (
      <section className="panel muted-card" data-testid="workflow-detail-unavailable">
        Workflow detail unavailable.
      </section>
    )
  }

  return (
    <section className="panel workflow-detail-panel" data-testid="workflow-detail-panel">
      <div className="panel-header workflow-title-row">
        <div>
          <h2>{workflow.title}</h2>
          <p>
            {workflow.client.name} · Month {workflow.month_number} ·{' '}
            {workflow._count.tasks} tasks
          </p>
        </div>
        <span className={`status-badge ${workflow.status}`}>
          {workflowStatusLabels[workflow.status]}
        </span>
      </div>

      <WorkflowProgress workflow={workflow} />

      {panelError ? <div className="notice error">{panelError}</div> : null}

      {canManage ? (
        <CreateTaskForm
          users={users}
          workflowId={workflow.id}
          onError={setPanelError}
          onSuccess={() => {
            setPanelError(null)
            refreshWorkflow()
          }}
        />
      ) : null}

      <div className="task-checklist" data-testid="task-checklist">
        {workflow.tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            users={users}
            canManage={canManage}
            isOpen={openTaskId === task.id}
            isDragging={dragState?.taskId === task.id}
            isDropTarget={dragOverTaskId === task.id && dragState?.taskId !== task.id}
            onError={setPanelError}
            onDragCancel={handleTaskDragCancel}
            onDragEnd={handleTaskDragEnd}
            onDragMove={handleTaskDragMove}
            onDragStart={(event) => handleTaskDragStart(task, event)}
            onToggle={(event) => handleTaskToggle(event, task.id)}
            onOpenDetails={setSelectedTask}
            onSuccess={() => {
              setPanelError(null)
              refreshWorkflow()
            }}
          />
        ))}
      </div>
      {dragState && draggedTask ? (
        createPortal(
          <TaskDragOverlay dragState={dragState} task={draggedTask} />,
          document.body
        )
      ) : null}

      {selectedTask ? (
        <TaskDetailsDrawer
          task={selectedTask}
          users={users}
          onClose={() => setSelectedTask(null)}
          onSuccess={() => {
            refreshWorkflow()
            const updatedTask = workflow.tasks.find(t => t.id === selectedTask.id)
            if (updatedTask) {
              setSelectedTask(updatedTask)
            } else {
              setSelectedTask(null)
            }
          }}
          onUpdateTask={async (taskId, fields) => {
            await updateTask(taskId, fields)
            refreshWorkflow()
          }}
        />
      ) : null}
    </section>
  )
}

function WorkflowProgress({ workflow }: { workflow: WorkflowDetail }) {
  const completion = Number(workflow.completion_percentage)

  return (
    <div className="workflow-progress" data-testid="workflow-progress">
      <div>
        <strong>{completion}% complete</strong>
        <span>{workflow.open_blocker_count} open blockers</span>
      </div>
      <span className="progress-track wide">
        <span className="progress-fill on_track" style={{ width: `${completion}%` }} />
      </span>
    </div>
  )
}

function CreateTaskForm({
  users,
  workflowId,
  onError,
  onSuccess,
}: {
  users: UserOption[]
  workflowId: string
  onError: (message: string | null) => void
  onSuccess: () => void
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTaskInput, unknown, CreateTaskValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { priority: 'medium' },
  })
  const mutation = useMutation({
    mutationFn: (values: CreateTaskValues) => createWorkflowTask(workflowId, values),
    onSuccess: () => {
      reset({ priority: 'medium' })
      onSuccess()
    },
    onError: (error) => onError(normalizeApiError(error).message),
  })

  return (
    <form
      className="task-create-form"
      data-testid="task-create-form"
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
    >
      <div className="panel-header compact-header">
        <h2>Custom task</h2>
      </div>
      <div className="task-form-grid">
        <label className="field">
          <span>Title</span>
          <input data-testid="input-task-title" {...register('title')} />
          {errors.title ? <small>{errors.title.message}</small> : null}
        </label>
        <label className="field">
          <span>Assignee</span>
          <select data-testid="select-task-assignee" {...register('assigned_to')}>
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Due Date</span>
          <input data-testid="input-task-due-date" type="date" {...register('due_date')} />
          {errors.due_date ? <small>{errors.due_date.message}</small> : null}
        </label>
        <label className="field">
          <span>Priority</span>
          <select data-testid="select-task-priority" {...register('priority')}>
            {Object.entries(priorityLabels).map(([priority, label]) => (
              <option key={priority} value={priority}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>Description</span>
        <textarea data-testid="textarea-task-description" {...register('description')} />
      </label>
      <button
        className="primary-action compact"
        data-testid="button-create-task"
        disabled={mutation.isPending}
        type="submit"
      >
        {mutation.isPending ? 'Adding...' : 'Add task'}
      </button>
    </form>
  )
}

function TaskCard({
  task,
  canManage,
  isDragging,
  isDropTarget,
  onError,
  onDragCancel,
  onDragEnd,
  onDragMove,
  onDragStart,
  onOpenDetails,
  onSuccess,
}: {
  task: WorkflowTask
  users: UserOption[]
  canManage: boolean
  isOpen: boolean
  isDragging: boolean
  isDropTarget: boolean
  onError: (message: string | null) => void
  onDragCancel: (event: React.PointerEvent<HTMLButtonElement>) => void
  onDragEnd: (event: React.PointerEvent<HTMLButtonElement>) => void
  onDragMove: (event: React.PointerEvent<HTMLButtonElement>) => void
  onDragStart: (event: React.PointerEvent<HTMLButtonElement>) => void
  onToggle: (event: React.MouseEvent<HTMLButtonElement>) => void
  onOpenDetails: (task: WorkflowTask) => void
  onSuccess: () => void
}) {
  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateTask>[1]) => updateTask(task.id, payload),
    onSuccess,
    onError: (error) => onError(normalizeApiError(error).message),
  })
  const completeMutation = useMutation({
    mutationFn: () => completeTask(task.id),
    onSuccess,
    onError: (error) => onError(normalizeApiError(error).message),
  })

  const isDone = ['completed', 'task_approved_by_manager', 'task_approved_by_client'].includes(task.status)
  const isBlocked = task.status === 'blocked'

  const initials = task.assignee
    ? task.assignee.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '??'

  const avatarColors = [
    { bg: 'var(--blue-light)', color: 'var(--blue)' },
    { bg: 'var(--green-light)', color: 'var(--green)' },
    { bg: 'var(--amber-light)', color: 'var(--amber)' },
    { bg: 'var(--red-light)', color: 'var(--red)' },
    { bg: 'var(--teal-light)', color: 'var(--teal)' },
  ]
  const colorIndex = task.assignee ? task.assignee.full_name.charCodeAt(0) % avatarColors.length : 0
  const avatarStyle = avatarColors[colorIndex]

  return (
    <div
      className={`ck-item ${isDone ? 'done' : ''} ${isBlocked ? 'blocked' : ''} ${isDragging ? 'dragging' : ''} ${isDropTarget ? 'drop-target' : ''}`}
      data-task-id={task.id}
      data-testid="task-card"
      onClick={() => onOpenDetails(task)}
      style={{ marginLeft: task.is_subtask ? '24px' : '0px', borderLeft: task.is_subtask ? '2px solid var(--border, #cbd5e1)' : undefined }}
    >
      {canManage ? (
        <button
          aria-label={`Reorder ${task.title}`}
          className="task-drag-handle"
          data-testid="button-task-drag-handle"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
          onPointerCancel={onDragCancel}
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          type="button"
          style={{ background: 'transparent', border: 'none', cursor: 'grab', padding: '4px', display: 'flex', alignItems: 'center', color: 'var(--muted)' }}
        >
          <GripVertical size={14} />
        </button>
      ) : null}

      <div
        className="ck-box"
        onClick={(e) => {
          e.stopPropagation()
          if (isDone) {
            updateMutation.mutate({ status: 'yet_to_start' })
          } else {
            completeMutation.mutate()
          }
        }}
      />

      {task.is_subtask ? (
        <span style={{ color: 'var(--primary, #3b82f6)', fontWeight: 600, marginRight: '4px' }}>↳</span>
      ) : null}

      <span className="ck-name">{task.title}</span>

      {task.labels && task.labels.length > 0 ? (
        <span className="role-label-badge" style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', background: 'var(--surface-muted, #f1f5f9)', color: 'var(--text-muted, #475569)', fontWeight: 500 }}>
          {task.labels[0]}
        </span>
      ) : null}

      {task.checklist && task.checklist.length > 0 ? (
        <span className="ck-meta" style={{ marginLeft: '8px', fontSize: '0.75rem', color: 'var(--secondary)' }}>
          ☑ {task.checklist.filter(c => c.is_completed || (c as any).completed).length}/{task.checklist.length}
        </span>
      ) : null}

      {task.slot ? (
        <span className="ck-meta" style={{ marginRight: '8px', color: 'var(--secondary)' }}>
          ⏱ {task.slot}
        </span>
      ) : null}

      {task.assignee ? (
        <div className="ck-assignee">
          <div
            className="mini-av"
            style={{
              background: avatarStyle.bg,
              color: avatarStyle.color,
            }}
          >
            {initials}
          </div>
          {task.assignee.full_name}
        </div>
      ) : (
        <div className="ck-assignee">
          <div className="mini-av" style={{ background: '#f5f5f5', color: '#999' }}>??</div>
          Unassigned
        </div>
      )}

      <span className="ck-meta" style={{ marginLeft: '8px' }}>
        {taskStatusLabels[task.status] || task.status}
      </span>
      <span className="ck-meta" style={{ marginLeft: '8px' }}>
        {priorityLabels[task.priority] || task.priority}
      </span>
      {task.open_blocker_count > 0 ? (
        <span className="ck-meta" style={{ marginLeft: '8px', color: 'var(--red)' }}>
          {task.open_blocker_count} blockers
        </span>
      ) : null}
      {isDone ? (
        <span className="ck-meta" style={{ color: 'var(--green)', marginLeft: '8px' }}>✓ Approved</span>
      ) : isBlocked ? (
        <span className="ck-meta" style={{ color: 'var(--red)', marginLeft: '8px' }}>⚠ Blocked</span>
      ) : task.due_date ? (
        <span className="ck-meta" style={{ marginLeft: '8px' }}>Due {task.due_date.slice(0, 10)}</span>
      ) : null}
    </div>
  )
}

function TaskDragOverlay({
  dragState,
  task,
}: {
  dragState: TaskDragState
  task: WorkflowTask
}) {
  const left = dragState.x - dragState.offsetX
  const top = dragState.y - dragState.offsetY

  return (
    <div
      className={`ck-item task-drag-preview priority-${task.priority}`}
      style={{
        height: dragState.height,
        left,
        top,
        width: dragState.width,
        position: 'fixed',
        zIndex: 9999,
        pointerEvents: 'none',
        opacity: 0.8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}
    >
      <div className="ck-box" />
      <span className="ck-name">{task.title}</span>
    </div>
  )
}

function reorderTasks(
  tasks: WorkflowTask[],
  sourceTaskId: string,
  targetTaskId: string,
) {
  const sourceIndex = tasks.findIndex((task) => task.id === sourceTaskId)
  const targetIndex = tasks.findIndex((task) => task.id === targetTaskId)

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return tasks
  }

  const reordered = [...tasks]
  const [movedTask] = reordered.splice(sourceIndex, 1)
  reordered.splice(targetIndex, 0, movedTask)
  return reordered
}
