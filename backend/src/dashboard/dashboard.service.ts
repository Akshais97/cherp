import { Injectable } from '@nestjs/common'
import { UserRole } from '../common/enums/user-role.enum'
import { RequestUser } from '../common/types/request-user.type'
import { DashboardQueryDto } from './dto/dashboard-query.dto'
import { DashboardRepository } from './dashboard.repository'

type HealthStatus = 'on_track' | 'at_risk' | 'off_track'
type BlockerSeverity = 'high' | 'medium' | 'low'

const severityRank: Record<BlockerSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

@Injectable()
export class DashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  async getSummary(user: RequestUser, query: DashboardQueryDto) {
    const filters = this.toFilters(query, user)
    const [
      activeClients,
      activeWorkflows,
      completionAggregate,
      openBlockers,
      deliveryUsers,
      usersWithAssignedTasks,
    ] = await Promise.all([
      this.repository.countActiveClients(user.tenantId, filters),
      this.repository.countActiveWorkflows(user.tenantId, filters),
      this.repository.averageActiveWorkflowCompletion(user.tenantId, filters),
      this.repository.countOpenBlockers(user.tenantId, filters),
      this.repository.countDeliveryUsers(user.tenantId),
      this.repository.findUsersWithOpenAssignedTasks(user.tenantId, filters),
    ])
    const averageCompletionPercentage = Math.round(
      Number(completionAggregate._avg.completion_percentage ?? 0),
    )

    return {
      activeClients,
      activeWorkflows,
      averageCompletionPercentage,
      taskCompletionRate: averageCompletionPercentage,
      openBlockers,
      teamUtilization: this.percentage(usersWithAssignedTasks.length, deliveryUsers),
    }
  }

  async getClientHealth(user: RequestUser, query: DashboardQueryDto) {
    const clients = await this.repository.findClientHealthRows(user.tenantId, this.toFilters(query, user))

    return clients.map((client) => {
      const workflow = client.workflows[0]
      const progress = workflow ? Number(workflow.completion_percentage) : 0
      const blockers = client._count.blockers

      return {
        clientId: client.id,
        workflowId: workflow?.id ?? null,
        client: client.name,
        workflow: workflow?.title ?? null,
        monthNumber: workflow?.month_number ?? null,
        progress,
        status: this.healthStatus(progress),
        blockers,
      }
    })
  }

  async getUpcomingDeadlines(user: RequestUser, query: DashboardQueryDto) {
    const filters = this.toFilters(query, user)
    const today = this.startOfToday()
    const dueBefore = filters.dateTo ?? new Date(today)
    if (!filters.dateTo) {
      dueBefore.setDate(dueBefore.getDate() + 7)
    }

    const tasks = await this.repository.findUpcomingDeadlines({
      tenantId: user.tenantId,
      dueBefore,
      dueFrom: filters.dateFrom,
      filters,
    })

    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: task.due_date,
      completedAt: task.completed_at,
      urgency: task.due_date && task.due_date < today ? 'overdue' : 'upcoming',
      workflow: task.workflow
        ? {
            id: task.workflow.id,
            title: task.workflow.title,
            monthNumber: task.workflow.month_number,
          }
        : null,
      client: task.workflow?.client || task.client || null,
    }))
  }

  async getOpenBlockers(user: RequestUser, query: DashboardQueryDto) {
    const blockers = await this.repository.findOpenBlockers(user.tenantId, this.toFilters(query, user))

    return blockers
      .sort((a, b) => {
        const severityDelta =
          severityRank[a.severity as BlockerSeverity] -
          severityRank[b.severity as BlockerSeverity]
        if (severityDelta !== 0) return severityDelta
        return new Date(b.flagged_at).getTime() - new Date(a.flagged_at).getTime()
      })
      .slice(0, 20)
  }

  async getRecentActivity(user: RequestUser, query: DashboardQueryDto) {
    const result = await this.repository.findRecentActivity(user.tenantId, {
      ...this.toFilters(query, user),
      activityCursor: query.activity_cursor,
    })
    const last = result.at(-1)

    return {
      items: result,
      nextCursor: result.length === 20 && last ? last.id : null,
    }
  }

  async search(query: string, user: RequestUser) {
    const q = query?.trim()
    if (!q || q.length < 2) {
      return { clients: [], workflows: [], tasks: [], blockers: [], users: [] }
    }

    const filters = {
      assignedUserId: user.role !== UserRole.SuperAdmin ? user.id : undefined,
    }

    const showClients = user.role !== UserRole.TeamMember
    const showWorkflows = true
    const showTasks = true
    const showBlockers = true
    const showUsers = true
    const showSystemUsers = user.role === UserRole.SuperAdmin

    const [clients, workflows, tasks, blockers, users] = await Promise.all([
      showClients
        ? this.repository.searchClients(user.tenantId, q, filters)
        : this.repository.searchBrandsOnly(user.tenantId, q, filters),
      showWorkflows
        ? this.repository.searchWorkflows(user.tenantId, q, filters)
        : [],
      showTasks
        ? this.repository.searchTasks(user.tenantId, q, filters)
        : [],
      showBlockers
        ? this.repository.searchBlockers(user.tenantId, q, filters)
        : [],
      showUsers
        ? this.repository.searchUsers(user.tenantId, q, showSystemUsers)
        : [],
    ])

    return {
      clients,
      workflows,
      tasks,
      blockers,
      users,
    }
  }

  private toFilters(query: DashboardQueryDto, user: RequestUser) {
    return {
      projectManagerId: query.project_manager_id,
      clientStatus: query.client_status,
      dateFrom: query.date_from ? this.toDayStart(query.date_from) : undefined,
      dateTo: query.date_to ? this.toDayEnd(query.date_to) : undefined,
      assignedUserId: user.role !== UserRole.SuperAdmin ? user.id : undefined,
    }
  }

  private toDayStart(value: string) {
    return new Date(`${value}T00:00:00.000Z`)
  }

  private toDayEnd(value: string) {
    return new Date(`${value}T23:59:59.999Z`)
  }

  private percentage(value: number, total: number) {
    if (total <= 0) return 0
    return Math.round((value / total) * 100)
  }

  private healthStatus(progress: number): HealthStatus {
    if (progress >= 70) return 'on_track'
    if (progress >= 50) return 'at_risk'
    return 'off_track'
  }

  private startOfToday() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  }
}
