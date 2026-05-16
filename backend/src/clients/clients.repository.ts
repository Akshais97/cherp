import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ClientsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByTenant(input: {
    tenantId: string
    filters?: {
      search?: string
      industry?: string
      service_type?: string
      status?: string
    }
    assignedUserId?: string
  }) {
    const where: Prisma.ClientWhereInput = {
      tenant_id: input.tenantId,
      status: input.filters?.status ?? { not: 'archived' },
    }

    if (input.assignedUserId) {
      where.workflows = {
        some: {
          tasks: { some: { assigned_to: input.assignedUserId } },
        },
      }
    }

    if (input.filters?.industry) {
      where.industry = input.filters.industry
    }

    if (input.filters?.service_type) {
      where.service_type = input.filters.service_type
    }

    if (input.filters?.search) {
      where.OR = [
        { name: { contains: input.filters.search, mode: 'insensitive' } },
        { industry: { contains: input.filters.search, mode: 'insensitive' } },
        { service_type: { contains: input.filters.search, mode: 'insensitive' } },
      ]
    }

    return this.prisma.client.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 100,
      select: {
        id: true,
        name: true,
        industry: true,
        service_type: true,
        status: true,
        contact_name: true,
        contact_email: true,
        contract_start: true,
        contract_end: true,
        created_at: true,
      },
    })
  }

  findById(input: {
    tenantId: string
    id: string
    assignedUserId?: string
    includeFinancials?: boolean
  }) {
    return this.prisma.client.findFirst({
      where: {
        id: input.id,
        tenant_id: input.tenantId,
        ...(input.assignedUserId
          ? {
              workflows: {
                some: {
                  tasks: { some: { assigned_to: input.assignedUserId } },
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        tenant_id: true,
        name: true,
        industry: true,
        service_type: true,
        contact_name: true,
        contact_email: true,
        contact_phone: true,
        address: true,
        status: true,
        monthly_retainer: Boolean(input.includeFinancials),
        currency: true,
        contract_duration: true,
        contract_start: true,
        contract_end: true,
        payment_terms: Boolean(input.includeFinancials),
        renewal_date: Boolean(input.includeFinancials),
        notes: true,
        retainer_hours: Boolean(input.includeFinancials),
        created_by: true,
        created_at: true,
        updated_at: true,
        scope_template: {
          select: {
            id: true,
            name: true,
            industry: true,
            service_type: true,
            duration_months: true,
          },
        },
        workflows: {
          where: {
            tenant_id: input.tenantId,
            ...(input.assignedUserId
              ? { tasks: { some: { assigned_to: input.assignedUserId } } }
              : {}),
          },
          orderBy: { month_number: 'asc' },
          take: 12,
          select: {
            id: true,
            title: true,
            status: true,
            month_number: true,
            completion_percentage: true,
            start_date: true,
            end_date: true,
            _count: { select: { tasks: true } },
          },
        },
      },
    })
  }

  findSnapshotById(input: { tenantId: string; id: string }) {
    return this.prisma.client.findFirst({
      where: { id: input.id, tenant_id: input.tenantId },
      select: {
        id: true,
        name: true,
        industry: true,
        service_type: true,
        contact_name: true,
        contact_email: true,
        contact_phone: true,
        address: true,
        status: true,
        monthly_retainer: true,
        currency: true,
        contract_duration: true,
        contract_start: true,
        contract_end: true,
        payment_terms: true,
        renewal_date: true,
        notes: true,
        retainer_hours: true,
      },
    })
  }

  updateWithLog(input: {
    tenantId: string
    userId: string
    clientId: string
    data: Prisma.ClientUpdateInput
    beforeValues: Prisma.InputJsonValue
    actionType?: 'updated' | 'status_changed' | 'archived'
  }) {
    return this.prisma.$transaction(async (tx) => {
      const client = await tx.client.update({
        where: { id: input.clientId, tenant_id: input.tenantId },
        data: input.data,
      })

      await tx.activityLog.create({
        data: {
          tenant_id: input.tenantId,
          user_id: input.userId,
          action_type: input.actionType ?? 'updated',
          entity_type: 'client',
          entity_id: input.clientId,
          before_values: input.beforeValues,
          after_values: {
            name: client.name,
            industry: client.industry,
            service_type: client.service_type,
            status: client.status,
            contract_start: client.contract_start,
            contract_end: client.contract_end,
            payment_terms: client.payment_terms,
            renewal_date: client.renewal_date,
          },
        },
      })

      return client
    })
  }

  updateStatusWithWorkflowSync(input: {
    tenantId: string
    userId: string
    clientId: string
    status: 'active' | 'paused' | 'completed' | 'archived'
    beforeValues: Prisma.InputJsonValue
  }) {
    return this.prisma.$transaction(async (tx) => {
      const client = await tx.client.update({
        where: { id: input.clientId, tenant_id: input.tenantId },
        data: { status: input.status },
      })

      const workflowStatus = this.workflowStatusForClientStatus(input.status)
      const workflowUpdate = workflowStatus
        ? await tx.workflow.updateMany({
            where: {
              tenant_id: input.tenantId,
              client_id: input.clientId,
              status:
                workflowStatus === 'active'
                  ? 'paused'
                  : { in: ['active', 'draft'] },
            },
            data: { status: workflowStatus },
          })
        : { count: 0 }

      await tx.activityLog.create({
        data: {
          tenant_id: input.tenantId,
          user_id: input.userId,
          action_type: input.status === 'archived' ? 'archived' : 'status_changed',
          entity_type: 'client',
          entity_id: input.clientId,
          before_values: input.beforeValues,
          after_values: {
            status: client.status,
            workflow_status: workflowStatus,
            workflows_updated: workflowUpdate.count,
          },
        },
      })

      return client
    })
  }

  createWithWorkflow(input: {
    tenantId: string
    userId: string
    templateId: string
    client: Prisma.ClientCreateInput
    workflowTitle: string
    workflowStartDate: Date
    workflowEndDate: Date
    tasks: Array<{
      title: string
      description?: string
      priority: string
      sort_order: number
      due_date?: Date
    }>
  }) {
    return this.prisma.$transaction(async (tx) => {
      const client = await tx.client.create({ data: input.client })

      const workflow = await tx.workflow.create({
        data: {
          tenant_id: input.tenantId,
          client_id: client.id,
          template_id: input.templateId,
          project_manager_id: input.userId,
          title: input.workflowTitle,
          status: 'active',
          month_number: 1,
          completion_percentage: 0,
          start_date: input.workflowStartDate,
          end_date: input.workflowEndDate,
          auto_generated: true,
        },
      })

      const createdTasks = await tx.task.createManyAndReturn({
        data: input.tasks.map((task) => ({
          tenant_id: input.tenantId,
          workflow_id: workflow.id,
          title: task.title,
          description: task.description,
          status: 'pending',
          priority: task.priority,
          sort_order: task.sort_order,
          due_date: task.due_date,
          depends_on: [],
          is_subtask: false,
        })),
        select: { id: true, title: true },
      })

      await tx.activityLog.createMany({
        data: [
          {
            tenant_id: input.tenantId,
            user_id: input.userId,
            action_type: 'created',
            entity_type: 'client',
            entity_id: client.id,
            after_values: { name: client.name, scope_template_id: input.templateId },
          },
          {
            tenant_id: input.tenantId,
            user_id: input.userId,
            action_type: 'created',
            entity_type: 'workflow',
            entity_id: workflow.id,
            after_values: { client_id: client.id, month_number: 1 },
          },
          ...createdTasks.map((task) => ({
            tenant_id: input.tenantId,
            user_id: input.userId,
            action_type: 'created',
            entity_type: 'task',
            entity_id: task.id,
            after_values: { workflow_id: workflow.id, title: task.title },
          })),
        ],
      })

      return { client, workflow, tasks: createdTasks }
    })
  }

  private workflowStatusForClientStatus(
    status: 'active' | 'paused' | 'completed' | 'archived',
  ) {
    if (status === 'active') return 'active'
    if (status === 'paused' || status === 'archived') return 'paused'
    return null
  }
}
