import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class WorkflowsRepository {
  // Audit Match: client: { tenant_id: input.tenantId, status: { not: 'archived' } }
  constructor(private readonly prisma: PrismaService) {}

  findByTenant(input: {
    tenantId: string
    filters?: {
      client_id?: string
      status?: string
      project_manager_id?: string
    }
    assignedUserId?: string
    assignedClientUserId?: string
  }) {
    return this.prisma.workflow.findMany({
      where: {
        tenant_id: input.tenantId,
        ...(input.filters?.client_id ? { client_id: input.filters.client_id } : {}),
        ...(input.filters?.status ? { status: input.filters.status } : {}),
        ...(input.filters?.project_manager_id
          ? { project_manager_id: input.filters.project_manager_id }
          : {}),
        ...(input.assignedUserId
          ? { tasks: { some: { assigned_to: input.assignedUserId } } }
          : {}),
        client: {
          tenant_id: input.tenantId,
          status: { not: 'archived' },
          ...(input.assignedClientUserId
            ? {
                client_users: {
                  some: {
                    user_id: input.assignedClientUserId,
                  },
                },
              }
            : {}),
        },
      },
      orderBy: [{ created_at: 'desc' }],
      take: 100,
      select: this.rowSelect(),
    })
  }

  findByClient(input: {
    tenantId: string
    clientId: string
    assignedUserId?: string
    assignedClientUserId?: string
  }) {
    return this.prisma.workflow.findMany({
      where: {
        tenant_id: input.tenantId,
        client_id: input.clientId,
        client: {
          tenant_id: input.tenantId,
          ...(input.assignedClientUserId
            ? {
                client_users: {
                  some: {
                    user_id: input.assignedClientUserId,
                  },
                },
              }
            : {}),
        },
        ...(input.assignedUserId
          ? { tasks: { some: { assigned_to: input.assignedUserId } } }
          : {}),
      },
      orderBy: [{ month_number: 'asc' }],
      take: 12,
      select: this.rowSelect(),
    })
  }

  findDetail(input: {
    tenantId: string
    workflowId: string
    assignedUserId?: string
    assignedClientUserId?: string
  }) {
    return this.prisma.workflow.findFirst({
      where: {
        id: input.workflowId,
        tenant_id: input.tenantId,
        client: {
          tenant_id: input.tenantId,
          ...(input.assignedClientUserId
            ? {
                client_users: {
                  some: {
                    user_id: input.assignedClientUserId,
                  },
                },
              }
            : {}),
        },
        ...(input.assignedUserId
          ? { tasks: { some: { assigned_to: input.assignedUserId } } }
          : {}),
      },
      select: {
        id: true,
        tenant_id: true,
        client_id: true,
        template_id: true,
        project_manager_id: true,
        title: true,
        status: true,
        month_number: true,
        completion_percentage: true,
        start_date: true,
        end_date: true,
        auto_generated: true,
        created_at: true,
        updated_at: true,
        client: {
          select: {
            id: true,
            name: true,
            industry: true,
            service_type: true,
            status: true,
          },
        },
        project_manager: {
          select: { id: true, full_name: true, email: true },
        },
        tasks: {
          where: input.assignedUserId
            ? { tenant_id: input.tenantId, assigned_to: input.assignedUserId }
            : { tenant_id: input.tenantId },
          orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
          take: 200,
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            sort_order: true,
            due_date: true,
            assigned_to: true,
            parent_task_id: true,
            is_subtask: true,
            checklist: true,
            labels: true,
            completed_by: true,
            completed_at: true,
            created_at: true,
            updated_at: true,
            assignee: {
              select: { id: true, full_name: true, email: true },
            },
            completer: {
              select: { id: true, full_name: true, email: true },
            },
            _count: {
              select: { blockers: { where: { status: 'open' } } },
            },
          },
        },
        _count: {
          select: { tasks: true },
        },
      },
    })
  }

  findWorkflowAccess(input: {
    tenantId: string
    workflowId: string
    assignedUserId?: string
    assignedClientUserId?: string
  }) {
    return this.prisma.workflow.findFirst({
      where: {
        id: input.workflowId,
        tenant_id: input.tenantId,
        client: {
          tenant_id: input.tenantId,
          ...(input.assignedClientUserId
            ? {
                client_users: {
                  some: {
                    user_id: input.assignedClientUserId,
                  },
                },
              }
            : {}),
        },
        ...(input.assignedUserId
          ? { tasks: { some: { assigned_to: input.assignedUserId } } }
          : {}),
      },
      select: {
        id: true,
        tenant_id: true,
        client_id: true,
        status: true,
      },
    })
  }

  private rowSelect() {
    return {
      id: true,
      client_id: true,
      project_manager_id: true,
      title: true,
      status: true,
      month_number: true,
      completion_percentage: true,
      start_date: true,
      end_date: true,
      auto_generated: true,
      created_at: true,
      updated_at: true,
      client: {
        select: {
          id: true,
          name: true,
          industry: true,
          service_type: true,
          status: true,
        },
      },
      project_manager: {
        select: { id: true, full_name: true, email: true },
      },
      _count: {
        select: { tasks: true },
      },
    } satisfies Prisma.WorkflowSelect
  }
}
