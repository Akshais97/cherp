import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

type BlockerFilters = {
  status?: string
  severity?: string
  client_id?: string
  task_id?: string
}

@Injectable()
export class BlockersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findTaskForBlocker(input: { tenantId: string; taskId: string }) {
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
        status: true,
        title: true,
        workflow: {
          select: {
            id: true,
            client_id: true,
            client: { select: { id: true, name: true } },
          },
        },
      },
    })
  }

  findDuplicateOpenBlocker(input: {
    tenantId: string
    taskId: string
    title: string
  }) {
    return this.prisma.blocker.findFirst({
      where: {
        tenant_id: input.tenantId,
        task_id: input.taskId,
        status: 'open',
        title: input.title,
      },
      select: { id: true },
    })
  }

  findByTenant(input: {
    tenantId: string
    filters?: BlockerFilters
    assignedUserId?: string
  }) {
    return this.prisma.blocker.findMany({
      where: this.blockerWhere(input),
      orderBy: [{ created_at: 'desc' }],
      take: 100,
      select: this.rowSelect(),
    })
  }

  findDetail(input: {
    tenantId: string
    blockerId: string
    assignedUserId?: string
  }) {
    return this.prisma.blocker.findFirst({
      where: {
        id: input.blockerId,
        ...this.blockerWhere({
          tenantId: input.tenantId,
          assignedUserId: input.assignedUserId,
        }),
      },
      select: this.detailSelect(),
    })
  }

  createAndBlockTask(input: {
    tenantId: string
    userId: string
    task: {
      id: string
      workflow_id: string
      status: string
      title: string
      workflow: { client_id: string }
    }
    data: {
      title: string
      description: string
      severity: string
      impact?: string
    }
  }) {
    return this.prisma.$transaction(async (tx) => {
      const blocker = await tx.blocker.create({
        data: {
          tenant_id: input.tenantId,
          task_id: input.task.id,
          client_id: input.task.workflow.client_id,
          flagged_by: input.userId,
          title: input.data.title,
          description: input.data.description,
          severity: input.data.severity,
          impact: input.data.impact,
          status: 'open',
        },
        select: this.detailSelect(),
      })

      const taskStatusChanged = input.task.status !== 'blocked'
      if (taskStatusChanged) {
        await tx.task.update({
          where: { id: input.task.id, tenant_id: input.tenantId },
          data: {
            status: 'blocked',
            completed_at: null,
            completed_by: null,
          },
          select: { id: true },
        })
      }

      await this.recalculateCompletion(tx, input.tenantId, input.task.workflow_id)

      await tx.activityLog.create({
        data: {
          tenant_id: input.tenantId,
          user_id: input.userId,
          action_type: 'blocked',
          entity_type: 'blocker',
          entity_id: blocker.id,
          after_values: {
            task_id: input.task.id,
            client_id: input.task.workflow.client_id,
            title: blocker.title,
            severity: blocker.severity,
            status: blocker.status,
          },
        },
      })

      if (taskStatusChanged) {
        await tx.activityLog.create({
          data: {
            tenant_id: input.tenantId,
            user_id: input.userId,
            action_type: 'status_changed',
            entity_type: 'task',
            entity_id: input.task.id,
            before_values: { status: input.task.status },
            after_values: { status: 'blocked', blocker_id: blocker.id },
          },
        })
      }

      return blocker
    })
  }

  resolveAndMaybeUnblockTask(input: {
    tenantId: string
    userId: string
    blocker: {
      id: string
      task_id: string
      status: string
      severity: string
      title: string
      task: { id: string; workflow_id: string; status: string }
    }
    resolutionNotes: string
  }) {
    return this.prisma.$transaction(async (tx) => {
      const resolvedAt = new Date()
      const blocker = await tx.blocker.update({
        where: { id: input.blocker.id, tenant_id: input.tenantId },
        data: {
          status: 'resolved',
          resolution_notes: input.resolutionNotes,
          resolved_by: input.userId,
          resolved_at: resolvedAt,
        },
        select: this.detailSelect(),
      })

      const remainingOpenBlockers = await tx.blocker.count({
        where: {
          tenant_id: input.tenantId,
          task_id: input.blocker.task_id,
          status: 'open',
        },
      })
      const shouldRestoreTask =
        remainingOpenBlockers === 0 && input.blocker.task.status === 'blocked'

      if (shouldRestoreTask) {
        await tx.task.update({
          where: { id: input.blocker.task_id, tenant_id: input.tenantId },
          data: { status: 'in_progress' },
          select: { id: true },
        })
      }

      await this.recalculateCompletion(
        tx,
        input.tenantId,
        input.blocker.task.workflow_id,
      )

      await tx.activityLog.create({
        data: {
          tenant_id: input.tenantId,
          user_id: input.userId,
          action_type: 'resolved',
          entity_type: 'blocker',
          entity_id: input.blocker.id,
          before_values: {
            status: input.blocker.status,
            severity: input.blocker.severity,
          },
          after_values: {
            status: 'resolved',
            resolution_notes: input.resolutionNotes,
            resolved_at: resolvedAt.toISOString(),
          },
        },
      })

      if (shouldRestoreTask) {
        await tx.activityLog.create({
          data: {
            tenant_id: input.tenantId,
            user_id: input.userId,
            action_type: 'status_changed',
            entity_type: 'task',
            entity_id: input.blocker.task_id,
            before_values: { status: 'blocked' },
            after_values: { status: 'in_progress', blocker_id: input.blocker.id },
          },
        })
      }

      return blocker
    })
  }

  private blockerWhere(input: {
    tenantId: string
    filters?: BlockerFilters
    assignedUserId?: string
  }): Prisma.BlockerWhereInput {
    return {
      tenant_id: input.tenantId,
      ...(input.filters?.status ? { status: input.filters.status } : {}),
      ...(input.filters?.severity ? { severity: input.filters.severity } : {}),
      ...(input.filters?.client_id ? { client_id: input.filters.client_id } : {}),
      ...(input.filters?.task_id ? { task_id: input.filters.task_id } : {}),
      task: {
        tenant_id: input.tenantId,
        workflow: { tenant_id: input.tenantId, client: { tenant_id: input.tenantId } },
        ...(input.assignedUserId ? { assigned_to: input.assignedUserId } : {}),
      },
      client: { tenant_id: input.tenantId },
    }
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

  private rowSelect() {
    return {
      id: true,
      task_id: true,
      client_id: true,
      flagged_by: true,
      resolved_by: true,
      title: true,
      description: true,
      severity: true,
      status: true,
      impact: true,
      resolution_notes: true,
      flagged_at: true,
      resolved_at: true,
      created_at: true,
      updated_at: true,
      task: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          workflow: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
      client: {
        select: {
          id: true,
          name: true,
          industry: true,
          service_type: true,
        },
      },
      flagger: { select: { id: true, full_name: true, email: true } },
      resolver: { select: { id: true, full_name: true, email: true } },
    } satisfies Prisma.BlockerSelect
  }

  private detailSelect() {
    return {
      ...this.rowSelect(),
      task: {
        select: {
          id: true,
          workflow_id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          due_date: true,
          assigned_to: true,
          assignee: { select: { id: true, full_name: true, email: true } },
          workflow: {
            select: {
              id: true,
              title: true,
              month_number: true,
              completion_percentage: true,
            },
          },
        },
      },
    } satisfies Prisma.BlockerSelect
  }
}
