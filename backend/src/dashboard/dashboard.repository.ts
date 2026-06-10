import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

export type DashboardFilters = {
  projectManagerId?: string
  clientStatus?: string
  dateFrom?: Date
  dateTo?: Date
  activityCursor?: string
  assignedUserId?: string
}

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  countActiveClients(tenantId: string, filters: DashboardFilters) {
    return this.prisma.client.count({
      where: this.clientWhere(tenantId, { ...filters, clientStatus: 'active' }),
    })
  }

  countActiveWorkflows(tenantId: string, filters: DashboardFilters) {
    return this.prisma.workflow.count({
      where: this.workflowWhere(tenantId, filters, { status: 'active' }),
    })
  }

  countTasksByStatus(tenantId: string, status?: string) {
    return this.prisma.task.count({
      where: {
        tenant_id: tenantId,
        ...(status ? { status } : {}),
      },
    })
  }

  countOpenBlockers(tenantId: string, filters: DashboardFilters) {
    return this.prisma.blocker.count({
      where: this.blockerWhere(tenantId, filters, { status: 'open' }),
    })
  }

  averageActiveWorkflowCompletion(tenantId: string, filters: DashboardFilters) {
    return this.prisma.workflow.aggregate({
      where: this.workflowWhere(tenantId, filters, { status: 'active' }),
      _avg: { completion_percentage: true },
    })
  }

  countDeliveryUsers(tenantId: string) {
    return this.prisma.user.count({
      where: {
        tenant_id: tenantId,
        is_active: true,
        role: { name: { in: ['super_admin', 'project_manager', 'team_member'] } },
      },
    })
  }

  findUsersWithOpenAssignedTasks(tenantId: string, filters: DashboardFilters) {
    return this.prisma.user.findMany({
      where: {
        tenant_id: tenantId,
        is_active: true,
        role: { name: { in: ['super_admin', 'project_manager', 'team_member'] } },
        assigned_tasks: {
          some: {
            tenant_id: tenantId,
            ...(filters.assignedUserId ? { assigned_to: filters.assignedUserId } : {}),
            status: { in: ['yet_to_start', 'ongoing', 'blocked', 'completed', 'rework'] },
            workflow: this.workflowRelationWhere(tenantId, filters),
          },
        },
      },
      select: { id: true },
      take: 100,
    })
  }

  findClientHealthRows(tenantId: string, filters: DashboardFilters) {
    return this.prisma.client.findMany({
      where: this.clientWhere(tenantId, filters),
      orderBy: { created_at: 'desc' },
      take: 20,
      select: {
        id: true,
        name: true,
        workflows: {
          where: this.workflowRelationWhere(tenantId, filters),
          orderBy: [{ month_number: 'desc' }, { created_at: 'desc' }],
          take: 1,
          select: {
            id: true,
            title: true,
            month_number: true,
            completion_percentage: true,
          },
        },
        _count: {
          select: {
            blockers: {
              where: {
                tenant_id: tenantId,
                status: 'open',
                ...(filters.assignedUserId
                  ? { task: { assigned_to: filters.assignedUserId } }
                  : {}),
              },
            },
          },
        },
      },
    })
  }

  findUpcomingDeadlines(input: {
    tenantId: string
    dueBefore: Date
    dueFrom?: Date
    filters: DashboardFilters
  }) {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    return this.prisma.task.findMany({
      where: {
        tenant_id: input.tenantId,
        ...(input.filters.assignedUserId ? { assigned_to: input.filters.assignedUserId } : {}),
        OR: [
          {
            workflow: this.workflowRelationWhere(input.tenantId, input.filters),
          },
          {
            workflow_id: null,
            client: this.clientWhere(input.tenantId, input.filters),
          },
        ],
        AND: [
          {
            OR: [
              {
                status: { notIn: ['task_approved_by_client', 'task_approved_by_manager', 'completed'] },
                due_date: { lte: input.dueBefore },
              },
              {
                status: { in: ['task_approved_by_client', 'task_approved_by_manager', 'completed'] },
                completed_at: { gte: thirtyDaysAgo },
              },
            ],
          }
        ]
      },
      orderBy: [{ due_date: 'asc' }, { created_at: 'desc' }],
      take: 100,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        due_date: true,
        completed_at: true,
        workflow: {
          select: {
            id: true,
            title: true,
            month_number: true,
            client: { select: { id: true, name: true } },
          },
        },
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })
  }

  findOpenBlockers(tenantId: string, filters: DashboardFilters) {
    return this.prisma.blocker.findMany({
      where: this.blockerWhere(tenantId, filters, { status: 'open' }),
      orderBy: [{ flagged_at: 'desc' }],
      take: 50,
      select: {
        id: true,
        title: true,
        severity: true,
        status: true,
        impact: true,
        flagged_at: true,
        task: {
          select: {
            id: true,
            title: true,
            workflow: { select: { id: true, title: true } },
          },
        },
        client: { select: { id: true, name: true } },
        flagger: { select: { id: true, full_name: true, email: true } },
      },
    })
  }

  findRecentActivity(tenantId: string, filters: DashboardFilters) {
    return this.prisma.activityLog.findMany({
      where: {
        tenant_id: tenantId,
        ...(filters.assignedUserId ? { user_id: filters.assignedUserId } : {}),
        created_at: {
          gte: filters.dateFrom,
          lte: filters.dateTo,
        },
      },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      ...(filters.activityCursor ? { cursor: { id: filters.activityCursor }, skip: 1 } : {}),
      take: 20,
      select: {
        id: true,
        action_type: true,
        entity_type: true,
        entity_id: true,
        before_values: true,
        after_values: true,
        created_at: true,
        user: { select: { id: true, full_name: true, email: true } },
      },
    })
  }

  private clientWhere(
    tenantId: string,
    filters: DashboardFilters,
  ): Prisma.ClientWhereInput {
    return {
      tenant_id: tenantId,
      status: filters.clientStatus ?? { not: 'archived' },
      created_at: {
        gte: filters.dateFrom,
        lte: filters.dateTo,
      },
      ...(filters.projectManagerId
        ? {
            workflows: {
              some: {
                tenant_id: tenantId,
                project_manager_id: filters.projectManagerId,
              },
            },
          }
        : {}),
      ...(filters.assignedUserId
        ? {
            client_users: {
              some: {
                user_id: filters.assignedUserId,
              },
            },
          }
        : {}),
    }
  }

  private workflowWhere(
    tenantId: string,
    filters: DashboardFilters,
    overrides?: Prisma.WorkflowWhereInput,
  ): Prisma.WorkflowWhereInput {
    return {
      tenant_id: tenantId,
      ...(filters.projectManagerId ? { project_manager_id: filters.projectManagerId } : {}),
      ...(filters.assignedUserId
        ? { tasks: { some: { tenant_id: tenantId, assigned_to: filters.assignedUserId } } }
        : {}),
      created_at: {
        gte: filters.dateFrom,
        lte: filters.dateTo,
      },
      client: {
        tenant_id: tenantId,
        status: filters.clientStatus ?? { not: 'archived' },
        ...(filters.assignedUserId
          ? {
              client_users: {
                some: {
                  user_id: filters.assignedUserId,
                },
              },
            }
          : {}),
      },
      ...overrides,
    }
  }

  private workflowRelationWhere(
    tenantId: string,
    filters: DashboardFilters,
  ): Prisma.WorkflowWhereInput {
    return this.workflowWhere(tenantId, filters)
  }

  private blockerWhere(
    tenantId: string,
    filters: DashboardFilters,
    overrides?: Prisma.BlockerWhereInput,
  ): Prisma.BlockerWhereInput {
    return {
      tenant_id: tenantId,
      flagged_at: {
        gte: filters.dateFrom,
        lte: filters.dateTo,
      },
      task: {
        tenant_id: tenantId,
        ...(filters.assignedUserId ? { assigned_to: filters.assignedUserId } : {}),
        workflow: this.workflowRelationWhere(tenantId, filters),
      },
      client: {
        tenant_id: tenantId,
        status: filters.clientStatus ?? { not: 'archived' },
      },
      ...overrides,
    }
  }

  searchClients(tenantId: string, query: string, filters: { assignedUserId?: string }) {
    return this.prisma.client.findMany({
      where: {
        tenant_id: tenantId,
        status: { not: 'archived' },
        name: { contains: query, mode: 'insensitive' },
        ...(filters.assignedUserId
          ? {
              client_users: {
                some: {
                  user_id: filters.assignedUserId,
                },
              },
            }
          : {}),
      },
      select: { id: true, name: true },
      take: 10,
    })
  }

  searchBrandsOnly(tenantId: string, query: string, filters: { assignedUserId?: string }) {
    return this.prisma.client.findMany({
      where: {
        tenant_id: tenantId,
        status: { not: 'archived' },
        name: { contains: query, mode: 'insensitive' },
        workflows: {
          some: {
            tenant_id: tenantId,
            tasks: {
              some: {
                tenant_id: tenantId,
                assigned_to: filters.assignedUserId,
              },
            },
          },
        },
      },
      select: { id: true, name: true },
      take: 10,
    })
  }

  searchWorkflows(tenantId: string, query: string, filters: { assignedUserId?: string }) {
    return this.prisma.workflow.findMany({
      where: {
        tenant_id: tenantId,
        title: { contains: query, mode: 'insensitive' },
        client: {
          tenant_id: tenantId,
          ...(filters.assignedUserId
            ? {
                client_users: {
                  some: {
                    user_id: filters.assignedUserId,
                  },
                },
              }
            : {}),
        },
      },
      select: { id: true, title: true, month_number: true, client: { select: { name: true } } },
      take: 10,
    })
  }

  searchTasks(tenantId: string, query: string, filters: { assignedUserId?: string }) {
    return this.prisma.task.findMany({
      where: {
        tenant_id: tenantId,
        title: { contains: query, mode: 'insensitive' },
        ...(filters.assignedUserId ? { assigned_to: filters.assignedUserId } : {}),
      },
      select: { id: true, title: true, status: true, workflow: { select: { id: true, title: true } } },
      take: 10,
    })
  }

  searchBlockers(tenantId: string, query: string, filters: { assignedUserId?: string }) {
    return this.prisma.blocker.findMany({
      where: {
        tenant_id: tenantId,
        title: { contains: query, mode: 'insensitive' },
        ...(filters.assignedUserId ? { task: { assigned_to: filters.assignedUserId } } : {}),
      },
      select: { id: true, title: true, status: true, task: { select: { workflow_id: true } } },
      take: 10,
    })
  }

  searchUsers(tenantId: string, query: string, showSystemUsers: boolean) {
    return this.prisma.user.findMany({
      where: {
        tenant_id: tenantId,
        is_active: true,
        full_name: { contains: query, mode: 'insensitive' },
        ...(!showSystemUsers
          ? { role: { name: { in: ['super_admin', 'project_manager', 'team_member'] } } }
          : {}),
      },
      select: { id: true, full_name: true, email: true },
      take: 10,
    })
  }
}
