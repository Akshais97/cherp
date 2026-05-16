import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class TasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  findWorkflowForCreate(input: { tenantId: string; workflowId: string }) {
    return this.prisma.workflow.findFirst({
      where: {
        id: input.workflowId,
        tenant_id: input.tenantId,
        client: { tenant_id: input.tenantId },
      },
      select: {
        id: true,
        tenant_id: true,
        status: true,
        _count: { select: { tasks: true } },
      },
    })
  }

  findTaskForAccess(input: { tenantId: string; taskId: string }) {
    return this.prisma.task.findFirst({
      where: {
        id: input.taskId,
        tenant_id: input.tenantId,
        workflow: { tenant_id: input.tenantId, client: { tenant_id: input.tenantId } },
      },
      select: {
        id: true,
        tenant_id: true,
        workflow_id: true,
        assigned_to: true,
        completed_by: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        sort_order: true,
        due_date: true,
        completed_at: true,
        _count: { select: { blockers: { where: { status: 'open' } } } },
      },
    })
  }

  userExists(tenantId: string, userId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId, tenant_id: tenantId, is_active: true },
      select: { id: true },
    })
  }

  createWithCompletion(input: {
    tenantId: string
    userId: string
    workflowId: string
    data: Prisma.TaskCreateInput
  }) {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: input.data,
        select: this.taskSelect(),
      })

      await this.recalculateCompletion(tx, input.tenantId, input.workflowId)

      await tx.activityLog.create({
        data: {
          tenant_id: input.tenantId,
          user_id: input.userId,
          action_type: 'created',
          entity_type: 'task',
          entity_id: task.id,
          after_values: {
            workflow_id: input.workflowId,
            title: task.title,
            assigned_to: task.assigned_to,
          },
        },
      })

      return task
    })
  }

  updateWithCompletion(input: {
    tenantId: string
    userId: string
    taskId: string
    workflowId: string
    data: Prisma.TaskUpdateInput
    beforeValues: Prisma.InputJsonValue
    actionType: 'updated' | 'assigned' | 'status_changed' | 'completed'
  }) {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.update({
        where: { id: input.taskId, tenant_id: input.tenantId },
        data: input.data,
        select: this.taskSelect(),
      })

      await this.recalculateCompletion(tx, input.tenantId, input.workflowId)

      await tx.activityLog.create({
        data: {
          tenant_id: input.tenantId,
          user_id: input.userId,
          action_type: input.actionType,
          entity_type: 'task',
          entity_id: input.taskId,
          before_values: input.beforeValues,
          after_values: {
            title: task.title,
            status: task.status,
            priority: task.priority,
            assigned_to: task.assigned_to,
            completed_by: task.completed_by,
            completed_at: task.completed_at,
          },
        },
      })

      return task
    })
  }

  private async recalculateCompletion(
    tx: Prisma.TransactionClient,
    tenantId: string,
    workflowId: string,
  ) {
    const total = await tx.task.count({
      where: { tenant_id: tenantId, workflow_id: workflowId },
    })
    const completed = await tx.task.count({
      where: { tenant_id: tenantId, workflow_id: workflowId, status: 'completed' },
    })
    const completion = total === 0 ? 0 : Math.round((completed / total) * 10000) / 100

    await tx.workflow.update({
      where: { id: workflowId, tenant_id: tenantId },
      data: { completion_percentage: completion },
    })
  }

  private taskSelect() {
    return {
      id: true,
      workflow_id: true,
      assigned_to: true,
      completed_by: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      sort_order: true,
      due_date: true,
      completed_at: true,
      created_at: true,
      updated_at: true,
      assignee: {
        select: { id: true, full_name: true, email: true },
      },
      completer: {
        select: { id: true, full_name: true, email: true },
      },
      _count: { select: { blockers: { where: { status: 'open' } } } },
    } satisfies Prisma.TaskSelect
  }
}
