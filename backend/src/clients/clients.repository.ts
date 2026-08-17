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
      where.client_users = {
        some: {
          user_id: input.assignedUserId,
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
        brand_url: true,
        instagram_profile: true,
        social_profiles: true,
        brand_guidelines: true,
        logo_assets: true,
        color_palette: true,
        fonts: true,
        target_audience: true,
        competitor_list: true,
        positioning_statement: true,
        campaign_history: true,
        communication_history: true,
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
              client_users: {
                some: {
                  user_id: input.assignedUserId,
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
        brand_url: true,
        instagram_profile: true,
        social_profiles: true,
        brand_guidelines: true,
        logo_assets: true,
        color_palette: true,
        fonts: true,
        target_audience: true,
        competitor_list: true,
        positioning_statement: true,
        campaign_history: true,
        communication_history: true,
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
        brand_url: true,
        instagram_profile: true,
        social_profiles: true,
        brand_guidelines: true,
        logo_assets: true,
        color_palette: true,
        fonts: true,
        target_audience: true,
        competitor_list: true,
        positioning_statement: true,
        campaign_history: true,
        communication_history: true,
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
            brand_url: client.brand_url,
            instagram_profile: client.instagram_profile,
            social_profiles: client.social_profiles,
            brand_guidelines: client.brand_guidelines,
            logo_assets: client.logo_assets,
            color_palette: client.color_palette,
            fonts: client.fonts,
            target_audience: client.target_audience,
            competitor_list: client.competitor_list,
            positioning_statement: client.positioning_statement,
            campaign_history: client.campaign_history,
            communication_history: client.communication_history,
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
      target_role?: string
      checklist?: Array<{ id: string; text: string; completed: boolean }>
      subtasks?: Array<{
        title: string
        description?: string
        priority: string
        due_date?: Date
        target_role?: string
        checklist?: Array<{ id: string; text: string; completed: boolean }>
      }>
    }>
    teamAssignments?: Record<string, string[]>
  }) {
    return this.prisma.$transaction(async (tx) => {
      const client = await tx.client.create({ data: input.client })

      const assignedUserIds = new Set<string>([input.userId])
      if (input.teamAssignments) {
        for (const userIds of Object.values(input.teamAssignments)) {
          if (Array.isArray(userIds)) {
            for (const uid of userIds) {
              if (uid) assignedUserIds.add(uid)
            }
          }
        }
      }

      for (const uid of assignedUserIds) {
        await tx.clientUser.create({
          data: {
            tenant_id: input.tenantId,
            client_id: client.id,
            user_id: uid,
          },
        })
      }

      // Automatically link any client-role users who do not have a client assignment
      const unassignedClientUsers = await tx.user.findMany({
        where: {
          tenant_id: input.tenantId,
          role: { name: 'client' },
          client_users: { none: {} },
        },
      })
      for (const cu of unassignedClientUsers) {
        if (!assignedUserIds.has(cu.id)) {
          await tx.clientUser.create({
            data: {
              tenant_id: input.tenantId,
              client_id: client.id,
              user_id: cu.id,
            },
          })
        }
      }

      const roleCounters: Record<string, number> = {}
      const getAssignedUserForRole = (targetRole?: string): string | undefined => {
        if (!targetRole || !input.teamAssignments) return undefined

        const roleLower = targetRole.toLowerCase()
        const teamKey = Object.keys(input.teamAssignments).find((k) => {
          const kLower = k.toLowerCase()
          return (
            kLower === roleLower ||
            (roleLower.includes('graphic') && (kLower.includes('creative') || kLower.includes('designer'))) ||
            (roleLower.includes('writer') && (kLower.includes('copywriter') || kLower.includes('writer'))) ||
            (roleLower.includes('performance') && kLower.includes('performance')) ||
            (roleLower.includes('seo') && kLower.includes('seo')) ||
            (roleLower.includes('crm') && (kLower.includes('automation') || kLower.includes('crm'))) ||
            (roleLower.includes('social') && (kLower.includes('video') || kLower.includes('social'))) ||
            (roleLower.includes('brand') && kLower.includes('brand'))
          )
        })

        if (!teamKey || !input.teamAssignments[teamKey] || input.teamAssignments[teamKey].length === 0) {
          return undefined
        }

        const candidates = input.teamAssignments[teamKey]
        const count = roleCounters[teamKey] || 0
        roleCounters[teamKey] = count + 1
        return candidates[count % candidates.length]
      }

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

      const createdTasks: Array<{ id: string; title: string }> = []
      let globalSortOrder = 1
      for (const parentTaskInput of input.tasks) {
        const parentAssignedTo = getAssignedUserForRole(parentTaskInput.target_role)

        const parentTask = await tx.task.create({
          data: {
            tenant_id: input.tenantId,
            workflow_id: workflow.id,
            client_id: client.id,
            assigned_to: parentAssignedTo,
            assigned_by: input.userId,
            title: parentTaskInput.title,
            description: parentTaskInput.description,
            status: 'yet_to_start',
            priority: parentTaskInput.priority,
            sort_order: globalSortOrder++,
            due_date: parentTaskInput.due_date,
            labels: parentTaskInput.target_role ? [parentTaskInput.target_role] : [],
            checklist: parentTaskInput.checklist ? (parentTaskInput.checklist as Prisma.InputJsonValue) : [],
            depends_on: [],
            is_subtask: false,
          },
          select: { id: true, title: true },
        })
        createdTasks.push(parentTask)

        if (parentTaskInput.subtasks && parentTaskInput.subtasks.length > 0) {
          for (const subtaskInput of parentTaskInput.subtasks) {
            const subtaskAssignedTo =
              getAssignedUserForRole(subtaskInput.target_role) || parentAssignedTo

            const subtask = await tx.task.create({
              data: {
                tenant_id: input.tenantId,
                workflow_id: workflow.id,
                client_id: client.id,
                assigned_to: subtaskAssignedTo,
                assigned_by: input.userId,
                parent_task_id: parentTask.id,
                title: subtaskInput.title,
                description: subtaskInput.description,
                status: 'yet_to_start',
                priority: subtaskInput.priority,
                sort_order: globalSortOrder++,
                due_date: subtaskInput.due_date || parentTaskInput.due_date,
                labels: subtaskInput.target_role ? [subtaskInput.target_role] : [],
                checklist: subtaskInput.checklist ? (subtaskInput.checklist as Prisma.InputJsonValue) : [],
                depends_on: [],
                is_subtask: true,
              },
              select: { id: true, title: true },
            })
            createdTasks.push(subtask)
          }
        }
      }

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

  findClientMappingForUser(tenantId: string, userId: string) {
    return this.prisma.clientUser.findFirst({
      where: { tenant_id: tenantId, user_id: userId },
      select: { client_id: true },
    })
  }

  findWorkflowTasks(tenantId: string, workflowId: string) {
    return this.prisma.workflow.findFirst({
      where: { id: workflowId, tenant_id: tenantId },
      select: {
        id: true,
        tasks: {
          orderBy: { sort_order: 'asc' },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            due_date: true,
            completed_at: true,
            completed_by: true,
            description: true,
            assignee: { select: { full_name: true } },
          },
        },
      },
    })
  }

  findLogs(tenantId: string, clientId: string) {
    return this.prisma.activityLog.findMany({
      where: {
        tenant_id: tenantId,
        entity_type: 'client',
        entity_id: clientId,
      },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        action_type: true,
        entity_type: true,
        entity_id: true,
        before_values: true,
        after_values: true,
        created_at: true,
        user: {
          select: {
            id: true,
            full_name: true,
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
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
