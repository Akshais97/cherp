import { Injectable, ForbiddenException } from '@nestjs/common'
import { UserRole } from '../common/enums/user-role.enum'
import { RequestUser } from '../common/types/request-user.type'
import { ActivityLogsRepository } from './activity-logs.repository'

@Injectable()
export class ActivityLogsService {
  constructor(private readonly repository: ActivityLogsRepository) {}

  async findMany(
    user: RequestUser,
    query: { entityType?: string; actionType?: string; userId?: string }
  ) {
    if (user.role !== UserRole.SuperAdmin && user.role !== UserRole.ProjectManager) {
      throw new ForbiddenException('Only super admins and project managers can view activity audit logs.')
    }

    return this.repository.findMany({
      tenantId: user.tenantId,
      entityType: query.entityType,
      actionType: query.actionType,
      userId: query.userId,
    })
  }
}
