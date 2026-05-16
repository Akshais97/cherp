import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { UserRole } from '../common/enums/user-role.enum'
import { RequestUser } from '../common/types/request-user.type'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
import { TasksRepository } from './tasks.repository'

type TaskStatus = 'pending' | 'in_progress' | 'blocked' | 'completed'

const allowedTransitions: Record<TaskStatus, TaskStatus[]> = {
  pending: ['in_progress', 'blocked'],
  in_progress: ['blocked', 'completed'],
  blocked: ['in_progress'],
  completed: [],
}

@Injectable()
export class TasksService {
  constructor(private readonly repository: TasksRepository) {}

  async create(workflowId: string, dto: CreateTaskDto, user: RequestUser) {
    const workflow = await this.repository.findWorkflowForCreate({
      tenantId: user.tenantId,
      workflowId,
    })

    if (!workflow) {
      throw new NotFoundException('Workflow not found.')
    }

    if (workflow.status === 'completed') {
      throw new BadRequestException('Completed workflows cannot receive new tasks.')
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
        workflow: { connect: { id: workflowId } },
        assignee: dto.assigned_to ? { connect: { id: dto.assigned_to } } : undefined,
        title: dto.title,
        description: dto.description,
        status: 'pending',
        priority: dto.priority ?? 'medium',
        sort_order: dto.sort_order ?? workflow._count.tasks + 1,
        due_date: dto.due_date ? this.toDate(dto.due_date) : undefined,
        depends_on: [],
        is_subtask: false,
      },
    })
  }

  async update(id: string, dto: UpdateTaskDto, user: RequestUser) {
    const existing = await this.getAccessibleTask(id, user)
    const nextStatus = dto.status ?? existing.status

    if (dto.assigned_to !== undefined) {
      this.assertCanAssign(user)
      if (dto.assigned_to) {
        await this.assertAssignableUser(user.tenantId, dto.assigned_to)
      }
    }

    if (dto.status && dto.status !== existing.status) {
      this.assertTransition(existing.status as TaskStatus, dto.status)
    }

    const completing = nextStatus === 'completed' && existing.status !== 'completed'
    if (completing && existing._count.blockers > 0) {
      throw new BadRequestException('Blocked tasks cannot be completed directly.')
    }

    const data: Prisma.TaskUpdateInput = {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
      ...(dto.sort_order !== undefined ? { sort_order: dto.sort_order } : {}),
      ...(dto.due_date !== undefined ? { due_date: this.toDate(dto.due_date) } : {}),
      ...(dto.assigned_to !== undefined
        ? dto.assigned_to
          ? { assignee: { connect: { id: dto.assigned_to } } }
          : { assignee: { disconnect: true } }
        : {}),
      ...(dto.status !== undefined
        ? {
            status: dto.status,
            ...(completing
              ? {
                  completed_at: new Date(),
                  completer: { connect: { id: user.id } },
                }
              : dto.status !== 'completed'
                ? { completed_at: null, completer: { disconnect: true } }
                : {}),
          }
        : {}),
    }

    return this.repository.updateWithCompletion({
      tenantId: user.tenantId,
      userId: user.id,
      taskId: id,
      workflowId: existing.workflow_id,
      data,
      beforeValues: this.snapshot(existing),
      actionType: this.actionType(existing, dto, completing),
    })
  }

  async complete(id: string, user: RequestUser) {
    const existing = await this.getAccessibleTask(id, user)

    if (existing.status === 'completed') {
      return existing
    }

    if (existing.status === 'blocked' || existing._count.blockers > 0) {
      throw new BadRequestException('Blocked tasks cannot be completed directly.')
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

  private async assertAssignableUser(tenantId: string, userId: string) {
    const assignee = await this.repository.userExists(tenantId, userId)
    if (!assignee) {
      throw new BadRequestException('Assigned user must exist in this tenant.')
    }
  }

  private toDate(value: string) {
    const date = new Date(`${value}T00:00:00.000Z`)
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
    }
  }
}
