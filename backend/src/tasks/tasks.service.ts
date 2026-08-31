import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { UserRole } from '../common/enums/user-role.enum'
import { RequestUser } from '../common/types/request-user.type'
import { NotificationsService } from '../notifications/notifications.service'
import { CreateSubtaskDto } from './dto/create-subtask.dto'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
import { TasksRepository } from './tasks.repository'
import { detectCycleInDependencies } from './utils/dependency-graph.util'

type TaskStatus =
  | 'yet_to_start'
  | 'ongoing'
  | 'blocked'
  | 'completed'
  | 'task_approved_by_manager'
  | 'rework'
  | 'task_approved_by_client'

const allowedTransitions: Record<TaskStatus, TaskStatus[]> = {
  yet_to_start: ['ongoing', 'blocked', 'completed'],
  ongoing: ['blocked', 'completed'],
  blocked: ['ongoing', 'rework'],
  completed: ['task_approved_by_manager', 'rework', 'blocked'],
  task_approved_by_manager: ['task_approved_by_client', 'rework', 'blocked'],
  rework: ['ongoing', 'blocked', 'completed'],
  task_approved_by_client: [],
}

const completedStatuses: TaskStatus[] = [
  'completed',
  'task_approved_by_manager',
  'task_approved_by_client',
]

@Injectable()
export class TasksService {
  constructor(
    private readonly repository: TasksRepository,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  async findMany(
    query: {
      startDate?: string
      endDate?: string
      targetUserId?: string
      clientIds?: string[]
      assigneeIds?: string[]
      labels?: string[]
      priorities?: string[]
      statuses?: string[]
      slots?: string[]
      searchText?: string
    },
    user: RequestUser
  ) {
    let userIdToQuery = user.id
    let roleToQuery = user.role as string

    if (query.targetUserId) {
      if (user.role === UserRole.TeamMember && query.targetUserId !== user.id) {
        throw new ForbiddenException('Team members can only view their own tasks.')
      }
      userIdToQuery = query.targetUserId
      roleToQuery = UserRole.TeamMember
    }

    return this.repository.findMany({
      tenantId: user.tenantId,
      userId: userIdToQuery,
      role: roleToQuery,
      startDate: query.startDate,
      endDate: query.endDate,
      clientIds: query.clientIds,
      assigneeIds: query.assigneeIds,
      labels: query.labels,
      priorities: query.priorities,
      statuses: query.statuses,
      slots: query.slots,
      searchText: query.searchText,
    })
  }

  async findAnalyticsSummary(
    query: {
      startDate?: string
      endDate?: string
      targetUserId?: string
      clientIds?: string[]
      assigneeIds?: string[]
      labels?: string[]
      priorities?: string[]
      statuses?: string[]
      slots?: string[]
      searchText?: string
    },
    user: RequestUser
  ) {
    let userIdToQuery = user.id
    let roleToQuery = user.role as string

    if (query.targetUserId) {
      if (user.role === UserRole.TeamMember && query.targetUserId !== user.id) {
        throw new ForbiddenException('Team members can only view their own analytics.')
      }
      userIdToQuery = query.targetUserId
      roleToQuery = UserRole.TeamMember
    }

    return this.repository.findAnalyticsSummary({
      tenantId: user.tenantId,
      userId: userIdToQuery,
      role: roleToQuery,
      startDate: query.startDate,
      endDate: query.endDate,
      clientIds: query.clientIds,
      assigneeIds: query.assigneeIds,
      labels: query.labels,
      priorities: query.priorities,
      statuses: query.statuses,
      slots: query.slots,
      searchText: query.searchText,
    })
  }

  async create(workflowId: string | null, dto: CreateTaskDto, user: RequestUser) {
    let workflow: any = null
    let clientId: string | null = dto.client_id || null

    if (workflowId) {
      workflow = await this.repository.findWorkflowForCreate({
        tenantId: user.tenantId,
        workflowId,
      })

      if (!workflow) {
        throw new NotFoundException('Workflow not found.')
      }

      if (workflow.status === 'completed') {
        throw new BadRequestException('Completed workflows cannot receive new tasks.')
      }

      clientId = workflow.client_id || null
    } else {
      if (!clientId) {
        throw new BadRequestException('Either workflow_id or client_id must be provided to create a task.')
      }
    }

    if (dto.assigned_to) {
      await this.assertAssignableUser(user.tenantId, dto.assigned_to)
    }

    const effectiveStartDate = dto.start_date ? this.toDate(dto.start_date) : undefined
    const effectiveDueDate = dto.due_date ? this.toDate(dto.due_date) : undefined
    if (effectiveStartDate && effectiveDueDate && effectiveDueDate.getTime() < effectiveStartDate.getTime()) {
      throw new BadRequestException('Due date cannot be earlier than start date.')
    }

    const task = await this.repository.createWithCompletion({
      tenantId: user.tenantId,
      userId: user.id,
      workflowId,
      data: {
        tenant: { connect: { id: user.tenantId } },
        ...(workflowId ? { workflow: { connect: { id: workflowId } } } : {}),
        ...(clientId ? { client: { connect: { id: clientId } } } : {}),
        assignee: dto.assigned_to ? { connect: { id: dto.assigned_to } } : undefined,
        assignor: { connect: { id: user.id } },
        title: dto.title,
        description: dto.description,
        status: 'yet_to_start',
        priority: dto.priority ?? 'medium',
        sort_order: dto.sort_order ?? (workflow ? workflow._count.tasks + 1 : 1),
        due_date: effectiveDueDate,
        start_date: effectiveStartDate,
        labels: dto.labels ?? [],
        recurrence_series_id: dto.recurrence_series_id ?? null,
        recurrence_rule: dto.recurrence_rule ?? null,
        recurrence_end_date: dto.recurrence_end_date ? this.toDate(dto.recurrence_end_date) : undefined,
        recurrence_type: dto.recurrence_type ?? null,
        is_daily: dto.is_daily ?? false,
        depends_on: [],
        is_subtask: false,
        slot: dto.slot ?? null,
      },
    })

    if (task.assigned_to) {
      await this.notifications?.notifyTaskAssigned({
        tenantId: user.tenantId,
        actorId: user.id,
        taskId: task.id,
        taskTitle: task.title,
        assigneeId: task.assigned_to,
      })
    }

    return task
  }

  async update(id: string, dto: UpdateTaskDto, user: RequestUser) {
    const existing = await this.getTaskForWrite(id, user)
    const nextStatus = dto.status ?? existing.status

    const { reason, checklist, ...updateFields } = dto

    const effectiveStartDate = updateFields.start_date !== undefined
      ? (updateFields.start_date ? this.toDate(updateFields.start_date) : null)
      : (existing.start_date ? new Date(existing.start_date) : null)

    const effectiveDueDate = updateFields.due_date !== undefined
      ? (updateFields.due_date ? this.toDate(updateFields.due_date) : null)
      : (existing.due_date ? new Date(existing.due_date) : null)

    if (effectiveStartDate && effectiveDueDate && effectiveDueDate.getTime() < effectiveStartDate.getTime()) {
      throw new BadRequestException('Due date cannot be earlier than start date.')
    }

    // Strict RBAC: Team Members can only edit status, description, comments, attachments, and checklist.
    if (user.role === UserRole.TeamMember) {
      if (
        updateFields.title !== undefined ||
        updateFields.priority !== undefined ||
        updateFields.due_date !== undefined ||
        updateFields.assigned_to !== undefined
      ) {
        throw new ForbiddenException('Team members cannot change task title, assignee, priority, or due date.')
      }
    }

    if (updateFields.assigned_to !== undefined) {
      this.assertCanAssign(user)
      if (updateFields.assigned_to) {
        await this.assertAssignableUser(user.tenantId, updateFields.assigned_to)
      }
    }

    if (updateFields.status && updateFields.status !== existing.status) {
      this.assertTransition(existing.status as TaskStatus, updateFields.status)
      if (
        ['task_approved_by_manager', 'task_approved_by_client', 'rework'].includes(updateFields.status) &&
        user.role !== UserRole.SuperAdmin &&
        user.role !== UserRole.ProjectManager
      ) {
        throw new ForbiddenException('Only project managers and admins can approve tasks or request rework.')
      }

      // Dependency lock check: prevent starting or completing if depends_on tasks are incomplete
      if (['ongoing', 'completed', 'task_approved_by_manager', 'task_approved_by_client'].includes(updateFields.status)) {
        if (existing.depends_on && existing.depends_on.length > 0) {
          const prereqs = await this.repository.findTasksByIds(user.tenantId, existing.depends_on)
          const incompletePrereq = prereqs.find(p => !completedStatuses.includes(p.status as TaskStatus))
          if (incompletePrereq) {
            throw new BadRequestException(`Cannot start or complete task until prerequisite dependency "${incompletePrereq.title}" is completed.`)
          }
        }
      }
    }

    const completing = nextStatus === 'completed' && existing.status !== 'completed'
    if (completing && existing._count.blockers > 0) {
      throw new BadRequestException('Tasks with open blockers cannot be completed.')
    }

    const data: Prisma.TaskUpdateInput = {
      ...(updateFields.title !== undefined ? { title: updateFields.title } : {}),
      ...(updateFields.description !== undefined ? { description: updateFields.description } : {}),
      ...(updateFields.priority !== undefined ? { priority: updateFields.priority } : {}),
      ...(updateFields.sort_order !== undefined ? { sort_order: updateFields.sort_order } : {}),
      ...(updateFields.due_date !== undefined ? { due_date: updateFields.due_date ? this.toDate(updateFields.due_date) : null } : {}),
      ...(updateFields.start_date !== undefined ? { start_date: updateFields.start_date ? this.toDate(updateFields.start_date) : null } : {}),
      ...(updateFields.labels !== undefined ? { labels: updateFields.labels } : {}),
      ...(updateFields.recurrence_series_id !== undefined ? { recurrence_series_id: updateFields.recurrence_series_id } : {}),
      ...(updateFields.recurrence_rule !== undefined ? { recurrence_rule: updateFields.recurrence_rule } : {}),
      ...(updateFields.recurrence_end_date !== undefined ? { recurrence_end_date: updateFields.recurrence_end_date ? this.toDate(updateFields.recurrence_end_date) : null } : {}),
      ...(updateFields.recurrence_type !== undefined ? { recurrence_type: updateFields.recurrence_type } : {}),
      ...(updateFields.is_daily !== undefined ? { is_daily: updateFields.is_daily } : {}),
      ...(updateFields.depends_on !== undefined ? { depends_on: updateFields.depends_on } : {}),
      ...(checklist !== undefined ? { checklist } : {}),
      ...(updateFields.slot !== undefined ? { slot: updateFields.slot } : {}),
      ...(updateFields.client_id !== undefined
        ? updateFields.client_id
          ? { client: { connect: { id: updateFields.client_id } } }
          : { client: { disconnect: true } }
        : {}),
      ...(updateFields.assigned_to !== undefined
        ? updateFields.assigned_to
          ? {
              assignee: { connect: { id: updateFields.assigned_to } },
              assignor: { connect: { id: user.id } },
            }
          : {
              assignee: { disconnect: true },
              assignor: { disconnect: true },
            }
        : {}),
      ...(updateFields.status !== undefined
        ? {
             status: updateFields.status,
             ...(completing
               ? {
                   completed_at: new Date(),
                   completer: { connect: { id: user.id } },
                 }
               : !completedStatuses.includes(updateFields.status as TaskStatus)
                 ? { completed_at: null, completer: { disconnect: true } }
                 : {}),
           }
         : {}),
    }

    const task = await this.repository.updateWithCompletion({
      tenantId: user.tenantId,
      userId: user.id,
      taskId: id,
      workflowId: existing.workflow_id,
      data,
      beforeValues: this.snapshot(existing),
      actionType: this.actionType(existing, updateFields as any, completing),
      reason: reason || null,
    })

    if (dto.status && dto.status !== existing.status) {
      await this.notifications?.notifyTaskStatusChanged({
        tenantId: user.tenantId,
        actorId: user.id,
        actorRole: user.role,
        taskId: id,
        taskTitle: task.title,
        previousStatus: existing.status,
        nextStatus: dto.status,
        assigneeId: task.assigned_to,
        projectManagerId: task.workflow?.project_manager_id,
        clientName: task.workflow?.client?.name || task.client?.name,
      })
    }

    if (updateFields.assigned_to && updateFields.assigned_to !== existing.assigned_to) {
      await this.notifications?.notifyTaskAssigned({
        tenantId: user.tenantId,
        actorId: user.id,
        taskId: id,
        taskTitle: task.title,
        assigneeId: updateFields.assigned_to,
      })
    }

    if (completing) {
      await this.handleRecurrence(task, user)

      // Subtask Parent Auto-Completion: if all subtasks under parent are complete, complete the parent task
      if (existing.parent_task_id) {
        const siblingSubtasks = await this.repository.findSubtasksByParentId(user.tenantId, existing.parent_task_id)
        const allSiblingsComplete = siblingSubtasks.every(s => s.id === id || completedStatuses.includes(s.status as TaskStatus))
        if (allSiblingsComplete) {
          try {
            await this.complete(existing.parent_task_id, user)
          } catch (e) {
            // Parent task might already be completed or have open blockers
          }
        }
      }
    }

    return task
  }

  async reorder(taskIds: string[], user: RequestUser) {
    if (user.role === UserRole.TeamMember) {
      throw new ForbiddenException('Only project managers and admins can reorder tasks.')
    }
    return this.repository.updateTaskSortOrders(user.tenantId, taskIds)
  }

  async complete(id: string, user: RequestUser) {
    const existing = await this.getTaskForWrite(id, user)

    if (existing.status === 'completed') {
      return existing
    }

    if (existing._count.blockers > 0) {
      throw new BadRequestException('Tasks with open blockers cannot be completed.')
    }

    this.assertTransition(existing.status as TaskStatus, 'completed')

    const task = await this.repository.updateWithCompletion({
      tenantId: user.tenantId,
      userId: user.id,
      taskId: id,
      workflowId: existing.workflow_id,
      data: {
        status: 'completed',
        completed_at: new Date(),
        completer: { connect: { id: user.id } },
      },
      beforeValues: this.snapshot(existing),
      actionType: 'completed',
    })

    await this.handleRecurrence(task, user)

    return task
  }

  async delete(id: string, user: RequestUser) {
    this.assertCanDelete(user)
    const existing = await this.getTaskForWrite(id, user)

    return this.repository.deleteWithCompletion({
      tenantId: user.tenantId,
      userId: user.id,
      taskId: id,
      workflowId: existing.workflow_id,
      beforeValues: this.snapshot(existing),
    })
  }

  async findOne(id: string, user: RequestUser) {
    return this.getTaskForRead(id, user)
  }

  private async getTaskForRead(id: string, user: RequestUser) {
    const task = await this.repository.findTaskForAccess({
      tenantId: user.tenantId,
      taskId: id,
    })

    if (!task) {
      throw new NotFoundException('Task not found.')
    }

    if (user.role === UserRole.Client) {
      const userClientId = (user as any).clientId
      if (userClientId && task.client_id !== userClientId) {
        throw new ForbiddenException('Clients can only view tasks belonging to their brand.')
      }
    }

    return task
  }

  private async getTaskForWrite(id: string, user: RequestUser) {
    const task = await this.getTaskForRead(id, user)
    return task
  }

  private assertTransition(from: TaskStatus, to: TaskStatus) {
    const allowed = allowedTransitions[from] || []
    if (!allowed.includes(to)) {
      throw new BadRequestException(`Task cannot transition from ${from} to ${to}.`)
    }
  }

  private assertCanAssign(user: RequestUser) {
    if (user.role !== UserRole.SuperAdmin && user.role !== UserRole.ProjectManager) {
      throw new ForbiddenException('Only admins and project managers can assign tasks.')
    }
  }

  private assertCanDelete(user: RequestUser) {
    if (user.role !== UserRole.SuperAdmin && user.role !== UserRole.ProjectManager) {
      throw new ForbiddenException('Only admins and project managers can delete tasks.')
    }
  }

  private async assertAssignableUser(tenantId: string, userId: string) {
    const assignee = await this.repository.userExists(tenantId, userId)
    if (!assignee) {
      throw new BadRequestException('Assigned user must exist in this tenant.')
    }
  }

  private toDate(value: string) {
    let date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      date = new Date(`${value}T00:00:00.000Z`)
    }
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid due date.')
    }
    return date
  }

  private actionType(
    existing: { status: string },
    dto: UpdateTaskDto,
    completing: boolean,
  ): 'updated' | 'assigned' | 'status_changed' | 'completed' {
    if (completing) return 'completed'
    if (dto.assigned_to !== undefined) return 'assigned'
    if (dto.status && dto.status !== existing.status) return 'status_changed'
    return 'updated'
  }

  private snapshot(task: {
    title: string
    description: string | null
    status: string
    priority: string
    assigned_to: string | null
    sort_order: number
    due_date: Date | null
    start_date: Date | null
    labels: string[]
    recurrence_series_id: string | null
    recurrence_rule: string | null
    recurrence_end_date: Date | null
    recurrence_type: string | null
    completed_by: string | null
    completed_at: Date | null
    checklist?: any
    slot: string | null
  }): Prisma.InputJsonObject {
    return {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigned_to: task.assigned_to,
      sort_order: task.sort_order,
      due_date: task.due_date?.toISOString() ?? null,
      start_date: task.start_date?.toISOString() ?? null,
      labels: task.labels ?? [],
      recurrence_series_id: task.recurrence_series_id,
      recurrence_rule: task.recurrence_rule,
      recurrence_end_date: task.recurrence_end_date?.toISOString() ?? null,
      recurrence_type: task.recurrence_type,
      completed_by: task.completed_by,
      completed_at: task.completed_at?.toISOString() ?? null,
      checklist: task.checklist ?? [],
      slot: task.slot,
    }
  }

  private async handleRecurrence(task: any, user: RequestUser) {
    if (!task.recurrence_rule) return

    const currentDueDate = task.due_date ? new Date(task.due_date) : new Date()
    const nextDueDate = new Date(currentDueDate)

    if (task.recurrence_rule === 'daily') {
      nextDueDate.setDate(currentDueDate.getDate() + 1)
    } else if (task.recurrence_rule === 'weekdays') {
      nextDueDate.setDate(currentDueDate.getDate() + 1)
      while (nextDueDate.getDay() === 0 || nextDueDate.getDay() === 6) {
        nextDueDate.setDate(nextDueDate.getDate() + 1)
      }
    } else if (task.recurrence_rule === 'weekly') {
      nextDueDate.setDate(currentDueDate.getDate() + 7)
    } else {
      nextDueDate.setDate(currentDueDate.getDate() + 1)
    }

    if (task.recurrence_end_date && nextDueDate > new Date(task.recurrence_end_date)) {
      return
    }

    let nextChecklist = []
    if (task.checklist) {
      try {
        const parsed = typeof task.checklist === 'string' ? JSON.parse(task.checklist) : task.checklist
        if (Array.isArray(parsed)) {
          nextChecklist = parsed.map((item: any) => ({ ...item, is_completed: false }))
        }
      } catch (e) {
        nextChecklist = []
      }
    }

    await this.repository.createWithCompletion({
      tenantId: user.tenantId,
      userId: user.id,
      workflowId: task.workflow_id,
      data: {
        tenant: { connect: { id: user.tenantId } },
        ...(task.workflow_id ? { workflow: { connect: { id: task.workflow_id } } } : {}),
        ...(task.client_id ? { client: { connect: { id: task.client_id } } } : {}),
        assignee: task.assigned_to ? { connect: { id: task.assigned_to } } : undefined,
        assignor: { connect: { id: user.id } },
        title: task.title,
        description: task.description,
        status: 'yet_to_start',
        priority: task.priority || 'medium',
        sort_order: task.sort_order || 1,
        due_date: nextDueDate,
        start_date: task.start_date ? new Date(task.start_date) : undefined,
        labels: task.labels || [],
        recurrence_series_id: task.recurrence_series_id || task.id,
        recurrence_rule: task.recurrence_rule,
        recurrence_end_date: task.recurrence_end_date ? new Date(task.recurrence_end_date) : undefined,
        recurrence_type: task.recurrence_type,
        checklist: nextChecklist,
        is_daily: task.is_daily || false,
        depends_on: [],
        is_subtask: task.is_subtask || false,
        slot: task.slot,
      }
    })
  }

  async getComments(id: string, user: RequestUser) {
    await this.getTaskForRead(id, user)
    return this.repository.findComments(user.tenantId, id)
  }

  async addComment(
    id: string,
    content: string,
    user: RequestUser,
    parentCommentId?: string,
    mentionedUserIds?: string[]
  ) {
    const task = await this.getTaskForRead(id, user)

    if (parentCommentId) {
      const parentComment = await this.repository.findCommentById(user.tenantId, id, parentCommentId)
      if (!parentComment) {
        throw new NotFoundException('Parent comment not found for this task.')
      }
    }

    const uniqueMentionedIds = new Set<string>(mentionedUserIds || [])

    // Also extract @mentions from text if present as @[User Name](uuid) or @uuid
    const uuidMentionRegex = /@\[?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]?/gi
    let match: RegExpExecArray | null
    while ((match = uuidMentionRegex.exec(content)) !== null) {
      if (match[1]) {
        uniqueMentionedIds.add(match[1])
      }
    }

    const finalMentionedIds = Array.from(uniqueMentionedIds)

    const comment = await this.repository.createComment(
      user.tenantId,
      id,
      user.id,
      content,
      parentCommentId,
      finalMentionedIds
    )

    if (finalMentionedIds.length > 0) {
      await this.notifications?.notifyTaskCommentMention({
        tenantId: user.tenantId,
        actorId: user.id,
        taskId: id,
        taskTitle: task.title,
        commentContent: content,
        mentionedUserIds: finalMentionedIds,
      })
    }

    return comment
  }

  async getAttachments(id: string, user: RequestUser) {
    await this.getTaskForRead(id, user)
    return this.repository.findAttachments(user.tenantId, id)
  }

  async addAttachment(id: string, dto: { file_name: string; file_url: string }, user: RequestUser) {
    await this.getTaskForRead(id, user)
    return this.repository.createAttachment(user.tenantId, id, user.id, dto.file_name, dto.file_url)
  }

  async deleteAttachment(id: string, attachmentId: string, user: RequestUser) {
    await this.getTaskForWrite(id, user)
    const result = await this.repository.deleteAttachment(user.tenantId, id, attachmentId, user.id)
    if (!result) {
      throw new NotFoundException('Attachment not found.')
    }
    return result
  }

  async getLogs(id: string, user: RequestUser) {
    await this.getTaskForRead(id, user)
    return this.repository.findLogs(user.tenantId, id)
  }

  async requestApproval(id: string, reason: string | undefined, user: RequestUser) {
    return this.update(id, { status: 'completed', reason }, user)
  }

  async approveTask(id: string, reason: string | undefined, user: RequestUser) {
    if (user.role !== UserRole.SuperAdmin && user.role !== UserRole.ProjectManager) {
      throw new ForbiddenException('Only project managers and admins can approve tasks.')
    }
    return this.update(id, { status: 'task_approved_by_manager', reason }, user)
  }

  async requestChanges(id: string, reason: string | undefined, user: RequestUser) {
    if (user.role !== UserRole.SuperAdmin && user.role !== UserRole.ProjectManager) {
      throw new ForbiddenException('Only project managers and admins can request changes/rework.')
    }
    if (reason) {
      await this.addComment(id, `Review changes requested: ${reason}`, user)
    }
    return this.update(id, { status: 'rework', reason }, user)
  }

  async getDailyReport(dateStr: string, user: RequestUser) {
    if (user.role !== UserRole.SuperAdmin && user.role !== UserRole.ProjectManager && user.role !== UserRole.TeamMember) {
      throw new ForbiddenException('Only team members, project managers, and super admins can view daily task reports.')
    }
    return this.repository.findDailyReportTasks(user.tenantId, user.id, dateStr)
  }

  async getDependencies(id: string, user: RequestUser) {
    const task = await this.getTaskForRead(id, user)
    const predecessors = await this.repository.findTasksByIds(user.tenantId, task.depends_on || [])
    const allTasks = await this.repository.findMany({ tenantId: user.tenantId, userId: user.id, role: user.role })
    const successors = allTasks.filter((t) => t.depends_on && t.depends_on.includes(id))

    const isComplete = completedStatuses.includes(task.status as TaskStatus)
    const incompletePrereqs = predecessors.filter((p) => !completedStatuses.includes(p.status as TaskStatus))

    let dependencyState: 'ready' | 'blocked_by_dependency' | 'complete' = 'ready'
    if (isComplete) {
      dependencyState = 'complete'
    } else if (incompletePrereqs.length > 0) {
      dependencyState = 'blocked_by_dependency'
    }

    return {
      id: task.id,
      dependency_state: dependencyState,
      predecessor_tasks: predecessors,
      successor_tasks: successors,
      blocked_by_dependencies: incompletePrereqs,
    }
  }

  async updateDependencies(id: string, dependsOn: string[], user: RequestUser) {
    if (user.role === UserRole.TeamMember) {
      throw new ForbiddenException('Only project managers and super admins can update task dependencies.')
    }
    const task = await this.getTaskForWrite(id, user)

    if (dependsOn.includes(id)) {
      throw new BadRequestException('A task cannot depend on itself.')
    }

    const isCycle = await detectCycleInDependencies(
      id,
      dependsOn,
      async (targetId: string) => {
        const found = await this.repository.findTaskForAccess({ tenantId: user.tenantId, taskId: targetId })
        return found?.depends_on || []
      }
    )

    if (isCycle) {
      throw new BadRequestException('Circular dependency detected. Task cannot depend on itself or form a dependency loop.')
    }

    return this.update(id, { depends_on: dependsOn } as any, user)
  }

  async addDependency(id: string, dependencyId: string, user: RequestUser) {
    const task = await this.getTaskForRead(id, user)
    const current = task.depends_on || []
    if (!current.includes(dependencyId)) {
      return this.updateDependencies(id, [...current, dependencyId], user)
    }
    return this.getDependencies(id, user)
  }

  async removeDependency(id: string, dependencyId: string, user: RequestUser) {
    const task = await this.getTaskForRead(id, user)
    const current = task.depends_on || []
    const updated = current.filter((dep) => dep !== dependencyId)
    return this.updateDependencies(id, updated, user)
  }

  async getSubtasks(id: string, user: RequestUser) {
    await this.getTaskForRead(id, user)
    const subtasks = await this.repository.findSubtasksByParentId(user.tenantId, id)
    const completedCount = subtasks.filter((s) => completedStatuses.includes(s.status as TaskStatus)).length
    return {
      parent_task_id: id,
      total_subtasks: subtasks.length,
      completed_subtasks: completedCount,
      subtasks,
    }
  }

  async createSubtask(parentId: string, dto: CreateSubtaskDto, user: RequestUser) {
    const parent = await this.getTaskForWrite(parentId, user)

    const subtask = await this.repository.createWithCompletion({
      tenantId: user.tenantId,
      userId: user.id,
      workflowId: parent.workflow_id,
      data: {
        tenant: { connect: { id: user.tenantId } },
        ...(parent.workflow_id ? { workflow: { connect: { id: parent.workflow_id } } } : {}),
        ...(parent.client_id ? { client: { connect: { id: parent.client_id } } } : {}),
        parent_task: { connect: { id: parentId } },
        assignee: dto.assigned_to ? { connect: { id: dto.assigned_to } } : undefined,
        assignor: { connect: { id: user.id } },
        title: dto.title,
        status: 'yet_to_start',
        priority: 'medium',
        due_date: dto.due_date ? this.toDate(dto.due_date) : undefined,
        estimated_hours: dto.estimated_hours ? dto.estimated_hours : undefined,
        is_subtask: true,
        depends_on: [],
      },
    })

    return subtask
  }
}
