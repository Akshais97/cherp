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
      assignedUserId: user.role === UserRole.TeamMember ? user.id : undefined,
      assignedClientUserId: user.role !== UserRole.SuperAdmin ? user.id : undefined,
    })
  }

  async detail(id: string, user: RequestUser) {
    const workflow = await this.repository.findDetail({
      tenantId: user.tenantId,
      workflowId: id,
      assignedUserId: user.role === UserRole.TeamMember ? user.id : undefined,
      assignedClientUserId: user.role !== UserRole.SuperAdmin ? user.id : undefined,
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
      assignedUserId: user.role === UserRole.TeamMember ? user.id : undefined,
      assignedClientUserId: user.role !== UserRole.SuperAdmin ? user.id : undefined,
    })

    return workflows
  }
}
