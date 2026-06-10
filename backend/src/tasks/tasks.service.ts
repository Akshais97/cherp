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
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
import { TasksRepository } from './tasks.repository'

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

  async findMany(query: { startDate?: string; endDate?: string; targetUserId?: string }, user: RequestUser) {
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

    return this.repository.createWithCompletion({
      tenantId: user.tenantId,
      userId: user.id,
      workflowId,
      data: {
        tenant: { connect: { id: user.tenantId } },
        ...(workflowId ? { workflow: { connect: { id: workflowId } } } : {}),
        ...(clientId ? { client: { connect: { id: clientId } } } : {}),
        assignee: dto.assigned_to ? { connect: { id: dto.assigned_to } } : undefined,
        title: dto.title,
        description: dto.description,
        status: 'yet_to_start',
        priority: dto.priority ?? 'medium',
        sort_order: dto.sort_order ?? (workflow ? workflow._count.tasks + 1 : 1),
        due_date: dto.due_date ? this.toDate(dto.due_date) : undefined,
        is_daily: dto.is_daily ?? false,
        depends_on: [],
        is_subtask: false,
        slot: dto.slot ?? null,
      },
    })
  }

  async update(id: string, dto: UpdateTaskDto, user: RequestUser) {
    const existing = await this.getAccessibleTask(id, user)
    const nextStatus = dto.status ?? existing.status

    const { reason, checklist, ...updateFields } = dto

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
      ...(updateFields.is_daily !== undefined ? { is_daily: updateFields.is_daily } : {}),
      ...(checklist !== undefined ? { checklist } : {}),
      ...(updateFields.slot !== undefined ? { slot: updateFields.slot } : {}),
      ...(updateFields.client_id !== undefined
        ? updateFields.client_id
          ? { client: { connect: { id: updateFields.client_id } } }
          : { client: { disconnect: true } }
        : {}),
      ...(updateFields.assigned_to !== undefined
        ? updateFields.assigned_to
          ? { assignee: { connect: { id: updateFields.assigned_to } } }
          : { assignee: { disconnect: true } }
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
        taskId: id,
        taskTitle: task.title,
        previousStatus: existing.status,
        nextStatus: dto.status,
        assigneeId: task.assigned_to,
        projectManagerId: task.workflow?.project_manager_id,
        clientName: task.workflow?.client?.name,
      })
    }

    return task
  }

  async complete(id: string, user: RequestUser) {
    const existing = await this.getAccessibleTask(id, user)

    if (existing.status === 'completed') {
      return existing
    }

    if (existing._count.blockers > 0) {
      throw new BadRequestException('Tasks with open blockers cannot be completed.')
    }

    this.assertTransition(existing.status as TaskStatus, 'completed')

    return this.repository.updateWithCompletion({
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
  }

  async delete(id: string, user: RequestUser) {
    this.assertCanDelete(user)
    const existing = await this.getAccessibleTask(id, user)

    return this.repository.deleteWithCompletion({
      tenantId: user.tenantId,
      userId: user.id,
      taskId: id,
      workflowId: existing.workflow_id,
      beforeValues: this.snapshot(existing),
    })
  }

  async findOne(id: string, user: RequestUser) {
    return this.getAccessibleTask(id, user)
  }

  private async getAccessibleTask(id: string, user: RequestUser) {
    const task = await this.repository.findTaskForAccess({
      tenantId: user.tenantId,
      taskId: id,
    })

    if (!task) {
      throw new NotFoundException('Task not found.')
    }

    if (user.role === UserRole.TeamMember && task.assigned_to !== user.id) {
      throw new ForbiddenException('Team members can only update assigned tasks.')
    }

    return task
  }

  private assertTransition(from: TaskStatus, to: TaskStatus) {
    if (!allowedTransitions[from].includes(to)) {
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
    completed_by: string | null
    completed_at: Date | null
    checklist?: any
  }): Prisma.InputJsonObject {
    return {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigned_to: task.assigned_to,
      sort_order: task.sort_order,
      due_date: task.due_date?.toISOString() ?? null,
      completed_by: task.completed_by,
      completed_at: task.completed_at?.toISOString() ?? null,
      checklist: task.checklist ?? [],
    }
  }

  async getComments(id: string, user: RequestUser) {
    await this.getAccessibleTask(id, user)
    return this.repository.findComments(user.tenantId, id)
  }

  async addComment(id: string, content: string, user: RequestUser) {
    await this.getAccessibleTask(id, user)
    return this.repository.createComment(user.tenantId, id, user.id, content)
  }

  async getAttachments(id: string, user: RequestUser) {
    await this.getAccessibleTask(id, user)
    return this.repository.findAttachments(user.tenantId, id)
  }

  async addAttachment(id: string, dto: { file_name: string; file_url: string }, user: RequestUser) {
    await this.getAccessibleTask(id, user)
    return this.repository.createAttachment(user.tenantId, id, user.id, dto.file_name, dto.file_url)
  }

  async deleteAttachment(id: string, attachmentId: string, user: RequestUser) {
    await this.getAccessibleTask(id, user)
    const result = await this.repository.deleteAttachment(user.tenantId, id, attachmentId, user.id)
    if (!result) {
      throw new NotFoundException('Attachment not found.')
    }
    return result
  }

  async getLogs(id: string, user: RequestUser) {
    await this.getAccessibleTask(id, user)
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
}
