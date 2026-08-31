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

  async generateCsvExport(
    user: RequestUser,
    query: { entityType?: string; actionType?: string; userId?: string }
  ): Promise<string> {
    const logs = await this.findMany(user, query)
    const header = 'ID,Date,Actor,Action,Entity,Entity_ID\n'
    const rows = logs.map((l: any) => {
      const actorName = l.user?.full_name || l.user_id || 'System'
      return `"${l.id}","${new Date(l.created_at).toISOString()}","${actorName}","${l.action_type}","${l.entity_type}","${l.entity_id}"`
    }).join('\n')

    return header + rows
  }
}
