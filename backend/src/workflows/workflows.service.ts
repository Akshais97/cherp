import { Injectable, NotFoundException } from '@nestjs/common'
import { UserRole } from '../common/enums/user-role.enum'
import { RequestUser } from '../common/types/request-user.type'
import { WorkflowQueryDto } from './dto/workflow-query.dto'
import { WorkflowsRepository } from './workflows.repository'

@Injectable()
export class WorkflowsService {
  constructor(private readonly repository: WorkflowsRepository) {}

  list(user: RequestUser, filters: WorkflowQueryDto) {
    return this.repository.findByTenant({
      tenantId: user.tenantId,
      filters,
      assignedClientUserId: user.role === UserRole.Client ? user.id : undefined,
    })
  }

  async detail(id: string, user: RequestUser) {
    const workflow = await this.repository.findDetail({
      tenantId: user.tenantId,
      workflowId: id,
      assignedClientUserId: user.role === UserRole.Client ? user.id : undefined,
    })

    if (!workflow) {
      throw new NotFoundException('Workflow not found.')
    }

    return {
      ...workflow,
      open_blocker_count: workflow.tasks.reduce(
        (count, task) => count + task._count.blockers,
        0,
      ),
      tasks: workflow.tasks.map(({ _count, ...task }) => ({
        ...task,
        open_blocker_count: _count.blockers,
      })),
    }
  }

  async listByClient(clientId: string, user: RequestUser) {
    const workflows = await this.repository.findByClient({
      tenantId: user.tenantId,
      clientId,
      assignedClientUserId: user.role === UserRole.Client ? user.id : undefined,
    })

    return workflows
  }

  async getMonthPlanningReadiness(user: RequestUser) {
    const activeWorkflows = await this.repository.findByTenant({
      tenantId: user.tenantId,
      filters: { status: 'active' },
      assignedClientUserId: user.role === UserRole.Client ? user.id : undefined,
    })

    const now = new Date()
    return activeWorkflows.map((wf: any) => {
      const endDate = wf.end_date ? new Date(wf.end_date) : new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      const needsMonthPlanning = daysRemaining <= 14

      return {
        id: wf.id,
        title: wf.title,
        month_number: wf.month_number,
        client: wf.client,
        project_manager: wf.project_manager,
        completion_percentage: wf.completion_percentage,
        end_date: wf.end_date,
        days_remaining: daysRemaining,
        needs_month_planning: needsMonthPlanning,
        next_month_number: wf.month_number + 1,
      }
    })
  }
}
