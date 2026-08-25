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
      blockerAssigneeId: blocker.assigned_to,
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
      assignedClientUserId: user.role === UserRole.Client ? user.id : undefined,
    })

    const mapped = blockers.map(b => this.attachTimeToResolve(b))
    return mapped.sort((a, b) => {
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
      assignedClientUserId: user.role === UserRole.Client ? user.id : undefined,
    })

    if (!blocker) {
      throw new NotFoundException('Blocker not found.')
    }

    return this.attachTimeToResolve(blocker)
  }

  async resolve(id: string, dto: ResolveBlockerDto, user: RequestUser) {
    const blocker = await this.repository.findDetail({
      tenantId: user.tenantId,
      blockerId: id,
      assignedClientUserId: user.role === UserRole.Client ? user.id : undefined,
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
      return this.attachTimeToResolve(blocker)
    }

    const resolved = await this.repository.resolveAndMaybeUnblockTask({
      tenantId: user.tenantId,
      userId: user.id,
      blocker,
      resolutionNotes: dto.resolution_notes,
    })

    await this.notifications?.notifyBlockerResolved({
      tenantId: user.tenantId,
      actorId: user.id,
      blockerId: blocker.id,
      blockerTitle: blocker.title,
      taskId: blocker.task_id,
      taskTitle: blocker.task?.title || 'Task',
      flaggerId: blocker.flagged_by,
      assigneeId: blocker.assigned_to,
      taskAssigneeId: blocker.task?.assigned_to,
      projectManagerId: blocker.task?.workflow?.project_manager_id,
      resolutionNotes: dto.resolution_notes,
      notify: blocker.notify ? (blocker.notify as string[]) : undefined,
    })

    return this.attachTimeToResolve(resolved)
  }

  async checkEscalations(user: RequestUser) {
    const openBlockers = await this.repository.findByTenant({
      tenantId: user.tenantId,
      filters: { status: 'open' },
    })

    const now = new Date()
    const slaDays: Record<string, number> = { high: 3, medium: 5, low: 7 }

    const escalated = openBlockers.filter(b => {
      const daysOpen = (now.getTime() - new Date(b.flagged_at || b.created_at).getTime()) / (1000 * 60 * 60 * 24)
      const threshold = slaDays[b.severity?.toLowerCase()] || 5
      return daysOpen > threshold
    })

    return escalated.map(b => ({
      ...this.attachTimeToResolve(b),
      is_escalated: true,
      days_open: Math.floor((now.getTime() - new Date(b.flagged_at || b.created_at).getTime()) / (1000 * 60 * 60 * 24)),
    }))
  }

  private attachTimeToResolve(blocker: any) {
    if (!blocker) return blocker
    if (blocker.status === 'resolved' && blocker.resolved_at) {
      const start = new Date(blocker.flagged_at || blocker.created_at).getTime()
      const end = new Date(blocker.resolved_at).getTime()
      const minutes = Math.max(0, Math.round((end - start) / (1000 * 60)))
      
      let formatted = `${minutes} mins`
      if (minutes >= 1440) {
        formatted = `${(minutes / 1440).toFixed(1)} days`
      } else if (minutes >= 60) {
        formatted = `${(minutes / 60).toFixed(1)} hours`
      }

      return {
        ...blocker,
        time_to_resolve_minutes: minutes,
        time_to_resolve_formatted: formatted,
      }
    }
    return {
      ...blocker,
      time_to_resolve_minutes: null,
      time_to_resolve_formatted: null,
    }
  }
}
