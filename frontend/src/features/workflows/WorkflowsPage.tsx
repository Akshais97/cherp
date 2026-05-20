import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  GripVertical,
  Save,
  UserRound,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../app/providers/useAuth'
import { normalizeApiError } from '../../lib/api/errors'
import { canManageTasks } from '../../lib/permissions/roles'
import { createBlocker } from '../blockers/api'
import {
  createBlockerSchema,
  type CreateBlockerInput,
  type CreateBlockerValues,
} from '../blockers/blockerSchemas'
import {
  completeTask,
  createWorkflowTask,
  getUsers,
  getWorkflow,
  getWorkflows,
  updateTask,
  type TaskPriority,
  type TaskStatus,
  type UserOption,
  type WorkflowDetail,
  type WorkflowStatus,
  type WorkflowTask,
} from './api'
import {
  createTaskSchema,
  type CreateTaskInput,
  type CreateTaskValues,
  updateTaskSchema,
  type UpdateTaskInput,
  type UpdateTaskValues,
} from './workflowSchemas'

const workflowStatusLabels: Record<WorkflowStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
}

const taskStatusLabels: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  blocked: 'Blocked',
  completed: 'Completed',
}

const priorityLabels: Record<TaskPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
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
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(
    initialWorkflowId ?? null,
  )
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | ''>('')
  const [searchValue, setSearchValue] = useState('')
  const workflowsQuery = useQuery({
    queryKey: ['workflows', statusFilter],
    queryFn: () => getWorkflows({ status: statusFilter || undefined }),
  })
  const workflowsError = workflowsQuery.error
    ? normalizeApiError(workflowsQuery.error).message
    : null

  const workflows = useMemo(() => {
    const search = searchValue.trim().toLowerCase()
    return (workflowsQuery.data ?? []).filter((workflow) => {
      if (!search) return true
      return `${workflow.title} ${workflow.client.name} ${workflow.client.industry} ${workflow.client.service_type}`
        .toLowerCase()
        .includes(search)
    })
  }, [searchValue, workflowsQuery.data])

  useEffect(() => {
    if (selectedWorkflowId || workflows.length === 0) return
    setSelectedWorkflowId(workflows[0].id)
  }, [selectedWorkflowId, workflows])

  useEffect(() => {
    if (initialWorkflowId) {
      setSelectedWorkflowId(initialWorkflowId)
    }
  }, [initialWorkflowId])

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
              {workflowsQuery.isLoading ? 'Loading...' : `${workflows.length} workflows`}
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
            {workflows.map((workflow) => (
              <button
                className={
                  selectedWorkflowId === workflow.id
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
            {!workflowsQuery.isLoading && workflows.length === 0 ? (
              <div className="muted-card">No workflows found.</div>
            ) : null}
          </div>
        </section>

        <WorkflowDetailPanel workflowId={selectedWorkflowId} />
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
  const [dragState, setDragState] = useState<TaskDragState | null>(null)
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null)
  const dragStateRef = useRef<TaskDragState | null>(null)
  const dragOverTaskIdRef = useRef<string | null>(null)
  const pendingPointerRef = useRef<PendingTaskPointerState | null>(null)
  const suppressClickUntilRef = useRef(0)
  const workflowQuery = useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: () => getWorkflow(workflowId ?? ''),
    enabled: Boolean(workflowId),
  })
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: canManage,
  })
  const workflowError = workflowQuery.error
    ? normalizeApiError(workflowQuery.error).message
    : null
  const usersError = canManage && usersQuery.error ? normalizeApiError(usersQuery.error).message : null

  const workflow = workflowQuery.data
  const users = canManage ? usersQuery.data ?? [] : []
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

  useEffect(() => {
    if (!workflow?.tasks.length || !openTaskId) {
      return
    }

    if (!workflow.tasks.some((task) => task.id === openTaskId)) {
      setOpenTaskId(null)
    }
  }, [openTaskId, workflow])

  const refreshWorkflow = () => {
    queryClient.invalidateQueries({ queryKey: ['workflow', workflowId] })
    queryClient.invalidateQueries({ queryKey: ['workflows'] })
  }

  const finishDrag = () => {
    const current = dragStateRef.current
    const targetTaskId = dragOverTaskIdRef.current

    pendingPointerRef.current = null
    setDragState(null)
    setDragOverTaskId(null)
    suppressClickUntilRef.current = Date.now() + POST_DRAG_CLICK_SUPPRESSION_MS

    if (!current || !targetTaskId || targetTaskId === current.taskId) return
    reorderMutation.mutate({
      sourceTaskId: current.taskId,
      targetTaskId,
    })
  }

  const cancelDragInteraction = () => {
    pendingPointerRef.current = null
    if (dragStateRef.current) {
      suppressClickUntilRef.current = Date.now() + POST_DRAG_CLICK_SUPPRESSION_MS
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

    suppressClickUntilRef.current = Date.now() + POST_DRAG_CLICK_SUPPRESSION_MS

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
      finishDrag()
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

    cancelDragInteraction()
  }

  const handleTaskToggle = (
    event: React.MouseEvent<HTMLButtonElement>,
    taskId: string,
  ) => {
    if (Date.now() < suppressClickUntilRef.current || dragStateRef.current) {
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

  if (workflowQuery.isLoading) {
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
            onSuccess={() => {
              setPanelError(null)
              refreshWorkflow()
            }}
          />
        ))}
      </div>
      {dragState && draggedTask ? (
        <TaskDragOverlay dragState={dragState} task={draggedTask} />
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
  users,
  canManage,
  isOpen,
  isDragging,
  isDropTarget,
  onError,
  onDragCancel,
  onDragEnd,
  onDragMove,
  onDragStart,
  onToggle,
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
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateTaskInput, unknown, UpdateTaskValues>({
    resolver: zodResolver(updateTaskSchema),
    defaultValues: taskFormDefaults(task),
  })
  const dueTone = getDueTone(task)

  useEffect(() => {
    reset(taskFormDefaults(task))
  }, [reset, task])

  const saveTaskMutation = useMutation({
    mutationFn: (values: UpdateTaskValues) => updateTask(task.id, values),
    onSuccess,
    onError: (error) => onError(normalizeApiError(error).message),
  })

  return (
    <article
      className={`task-card priority-${task.priority} ${dueTone}${isOpen ? ' open' : ''}${isDragging ? ' dragging' : ''}${isDropTarget ? ' drop-target' : ''}`}
      data-task-id={task.id}
      data-testid="task-card"
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
        >
          <GripVertical size={16} />
        </button>
      ) : null}
      <button
        aria-expanded={isOpen}
        className="task-accordion-header"
        data-testid="button-task-accordion"
        onClick={onToggle}
        type="button"
      >
        <span className="task-main">
          <span>
            <h3>{task.title}</h3>
            <p>{task.description || 'No description'}</p>
          </span>
          <span className={`status-badge ${task.status}`}>
            {taskStatusLabels[task.status]}
          </span>
        </span>
        <ChevronDown size={16} />
      </button>

      {isOpen ? (
        <div className="task-accordion-body">
          <div className="task-meta-row">
            <span>
              <UserRound size={14} />
              {task.assignee?.full_name ?? 'Unassigned'}
            </span>
            <span>
              <CalendarClock size={14} />
              {task.due_date?.slice(0, 10) ?? 'No due date'}
            </span>
            <span>{priorityLabels[task.priority]}</span>
            {task.open_blocker_count > 0 ? (
              <span className="task-blocker">{task.open_blocker_count} blockers</span>
            ) : null}
          </div>

          <div className="task-controls">
            <label className="field">
              <span>Status</span>
              <select
                data-testid="select-task-status"
                disabled={updateMutation.isPending || task.status === 'completed'}
                value={task.status}
                onChange={(event) =>
                  updateMutation.mutate({ status: event.target.value as TaskStatus })
                }
              >
                {Object.entries(taskStatusLabels).map(([status, label]) => (
                  <option key={status} value={status}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {canManage ? (
              <label className="field">
                <span>Assignee</span>
                <select
                  data-testid="select-task-card-assignee"
                  disabled={updateMutation.isPending}
                  value={task.assigned_to ?? ''}
                  onChange={(event) =>
                    updateMutation.mutate({ assigned_to: event.target.value || null })
                  }
                >
                  <option value="">Unassigned</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <button
              className="ghost-button"
              data-testid="button-complete-task"
              disabled={
                completeMutation.isPending ||
                task.status !== 'in_progress' ||
                task.open_blocker_count > 0
              }
              onClick={() => completeMutation.mutate()}
              type="button"
            >
              <CheckCircle2 size={14} />
              Complete
            </button>
          </div>

          <form
            className="task-edit-form"
            data-testid="task-edit-form"
            onSubmit={handleSubmit((values) => saveTaskMutation.mutate(values))}
          >
        <div className="task-edit-primary">
          <label className="field">
            <span>Title</span>
            <input data-testid="input-edit-task-title" {...register('title')} />
            {errors.title ? <small>{errors.title.message}</small> : null}
          </label>
          <label className="field">
            <span>Description</span>
            <textarea
              data-testid="textarea-edit-task-description"
              {...register('description')}
            />
          </label>
        </div>

        <div className="task-edit-secondary">
          <label className="field">
            <span>Due Date</span>
            <input
              data-testid="input-edit-task-due-date"
              type="date"
              {...register('due_date')}
            />
            {errors.due_date ? <small>{errors.due_date.message}</small> : null}
          </label>
          <label className="field">
            <span>Priority</span>
            <select data-testid="select-edit-task-priority" {...register('priority')}>
              {Object.entries(priorityLabels).map(([priority, label]) => (
                <option key={priority} value={priority}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="ghost-button task-save-button"
            data-testid="button-save-task"
            disabled={saveTaskMutation.isPending}
            type="submit"
          >
            <Save size={14} />
            {saveTaskMutation.isPending ? 'Saving...' : 'Save task'}
          </button>
        </div>
          </form>

          <CreateBlockerForm
            disabled={task.status === 'completed'}
            onError={onError}
            onSuccess={onSuccess}
            taskId={task.id}
          />
        </div>
      ) : null}
    </article>
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
    <article
      className={`task-card task-drag-preview priority-${task.priority} ${getDueTone(task)}`}
      style={{
        height: dragState.height,
        left,
        top,
        width: dragState.width,
      }}
    >
      <div className="task-accordion-header">
        <span className="task-main">
          <span>
            <h3>{task.title}</h3>
            <p>{task.description || 'No description'}</p>
          </span>
          <span className={`status-badge ${task.status}`}>
            {taskStatusLabels[task.status]}
          </span>
        </span>
      </div>
    </article>
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

function CreateBlockerForm({
  disabled,
  onError,
  onSuccess,
  taskId,
}: {
  disabled: boolean
  onError: (message: string | null) => void
  onSuccess: () => void
  taskId: string
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateBlockerInput, unknown, CreateBlockerValues>({
    resolver: zodResolver(createBlockerSchema),
    defaultValues: { severity: 'medium' },
  })
  const mutation = useMutation({
    mutationFn: (values: CreateBlockerValues) =>
      createBlocker({ ...values, task_id: taskId }),
    onSuccess: () => {
      reset({ severity: 'medium' })
      onSuccess()
    },
    onError: (error) => onError(normalizeApiError(error).message),
  })

  return (
    <form
      className="task-blocker-form"
      data-testid="task-blocker-form"
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
    >
      <div className="panel-header compact-header">
        <h2>Log blocker</h2>
        <AlertTriangle size={15} />
      </div>
      <div className="task-edit-primary">
        <label className="field">
          <span>Title</span>
          <input
            data-testid="input-blocker-title"
            disabled={disabled}
            {...register('title')}
          />
          {errors.title ? <small>{errors.title.message}</small> : null}
        </label>
        <label className="field">
          <span>Description</span>
          <textarea
            data-testid="textarea-blocker-description"
            disabled={disabled}
            {...register('description')}
          />
          {errors.description ? <small>{errors.description.message}</small> : null}
        </label>
      </div>
      <div className="task-edit-secondary">
        <label className="field">
          <span>Severity</span>
          <select
            data-testid="select-blocker-severity"
            disabled={disabled}
            {...register('severity')}
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label className="field blocker-impact-field">
          <span>Impact</span>
          <input
            data-testid="input-blocker-impact"
            disabled={disabled}
            {...register('impact')}
          />
        </label>
        <button
          className="ghost-button task-save-button"
          data-testid="button-create-blocker"
          disabled={disabled || mutation.isPending}
          type="submit"
        >
          <AlertTriangle size={14} />
          {mutation.isPending ? 'Logging...' : 'Log blocker'}
        </button>
      </div>
    </form>
  )
}

function taskFormDefaults(task: WorkflowTask): UpdateTaskInput {
  return {
    title: task.title,
    description: task.description ?? '',
    due_date: task.due_date?.slice(0, 10) ?? '',
    priority: task.priority,
  }
}

function getDueTone(task: WorkflowTask) {
  if (!task.due_date || task.status === 'completed') return ''

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(`${task.due_date.slice(0, 10)}T00:00:00.000Z`)
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / 86_400_000)

  if (diffDays < 0) return 'overdue'
  if (diffDays <= 3) return 'due-soon'
  return ''
}
