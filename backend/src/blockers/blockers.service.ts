import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common'
import { UserRole } from '../common/enums/user-role.enum'
import { RequestUser } from '../common/types/request-user.type'
import { NotificationsService } from '../notifications/notifications.service'
import { BlockersRepository } from './blockers.repository'
import { BlockerQueryDto } from './dto/blocker-query.dto'
import { CreateBlockerDto } from './dto/create-blocker.dto'
import { ResolveBlockerDto } from './dto/resolve-blocker.dto'

type BlockerSeverity = 'high' | 'medium' | 'low'

const severityRank: Record<BlockerSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

@Injectable()
export class BlockersService {
  constructor(
    private readonly repository: BlockersRepository,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  async create(dto: CreateBlockerDto, user: RequestUser) {
    const task = await this.repository.findTaskForBlocker({
      tenantId: user.tenantId,
      taskId: dto.task_id,
    })

    if (!task) {
      throw new NotFoundException('Task not found.')
    }

    if (user.role === UserRole.TeamMember && task.assigned_to !== user.id) {
      throw new ForbiddenException(
        'Team members can create blockers only on assigned tasks.',
      )
    }

    if (task.status === 'task_approved_by_client') {
      throw new BadRequestException('Client-approved tasks cannot be blocked.')
    }

    const duplicate = await this.repository.findDuplicateOpenBlocker({
      tenantId: user.tenantId,
      taskId: dto.task_id,
      title: dto.title,
    })

    if (duplicate) {
      throw new ConflictException('An open blocker with this title already exists.')
    }

    const blocker = await this.repository.createAndBlockTask({
      tenantId: user.tenantId,
      userId: user.id,
      task,
      data: dto,
    })

    await this.notifications?.notifyBlockerCreated({
      tenantId: user.tenantId,
      actorId: user.id,
      blockerId: blocker.id,
      blockerTitle: blocker.title,
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: task.assigned_to,
      projectManagerId: blocker.task?.workflow?.project_manager_id,
      clientName: task.workflow?.client?.name || task.client?.name || '',
      notify: blocker.notify ? (blocker.notify as string[]) : undefined,
    })

    return blocker
  }

  async list(filters: BlockerQueryDto, user: RequestUser) {
    const blockers = await this.repository.findByTenant({
      tenantId: user.tenantId,
      filters,
      assignedUserId: user.role === UserRole.TeamMember ? user.id : undefined,
      assignedClientUserId: user.role !== UserRole.SuperAdmin ? user.id : undefined,
    })

    return blockers.sort((a, b) => {
      const severityDelta =
        severityRank[a.severity as BlockerSeverity] -
        severityRank[b.severity as BlockerSeverity]
      if (severityDelta !== 0) return severityDelta
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }

  async detail(id: string, user: RequestUser) {
    const blocker = await this.repository.findDetail({
      tenantId: user.tenantId,
      blockerId: id,
      assignedUserId: user.role === UserRole.TeamMember ? user.id : undefined,
      assignedClientUserId: user.role !== UserRole.SuperAdmin ? user.id : undefined,
    })

    if (!blocker) {
      throw new NotFoundException('Blocker not found.')
    }

    return blocker
  }

  async resolve(id: string, dto: ResolveBlockerDto, user: RequestUser) {
    const blocker = await this.repository.findDetail({
      tenantId: user.tenantId,
      blockerId: id,
      assignedClientUserId: user.role !== UserRole.SuperAdmin ? user.id : undefined,
    })

    if (!blocker) {
      throw new NotFoundException('Blocker not found.')
    }

    if (
      user.role === UserRole.TeamMember &&
      blocker.flagged_by !== user.id &&
      blocker.assigned_to !== user.id
    ) {
      throw new ForbiddenException(
        'Team members can resolve blockers only if they assigned it or are assigned to it.',
      )
    }

    if (blocker.status === 'resolved') {
      return blocker
    }

    return this.repository.resolveAndMaybeUnblockTask({
      tenantId: user.tenantId,
      userId: user.id,
      blocker,
      resolutionNotes: dto.resolution_notes,
    })
  }
}
