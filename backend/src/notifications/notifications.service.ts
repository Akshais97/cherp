import { Injectable } from '@nestjs/common'
import { RequestUser } from '../common/types/request-user.type'
import { NotificationsRepository } from './notifications.repository'
import { TeamsIntegrationService } from '../users/teams-integration.service'

@Injectable()
export class NotificationsService {
  constructor(
    private readonly repository: NotificationsRepository,
    private readonly teamsService: TeamsIntegrationService,
  ) {}

  list(user: RequestUser, unreadOnly = false) {
    return this.repository.findForUser({
      tenantId: user.tenantId,
      userId: user.id,
      unreadOnly,
    })
  }

  markRead(id: string, user: RequestUser) {
    return this.repository.markRead({
      tenantId: user.tenantId,
      userId: user.id,
      notificationId: id,
    })
  }

  async notifyTaskStatusChanged(input: {
    tenantId: string
    actorId: string
    actorRole?: string
    taskId: string
    taskTitle: string
    previousStatus: string
    nextStatus: string
    assigneeId?: string | null
    projectManagerId?: string | null
    clientName?: string | null
  }) {
    const recipients = new Set<string>()

    if (input.assigneeId && input.assigneeId !== input.actorId) {
      recipients.add(input.assigneeId)
    }

    if (
      input.previousStatus === 'ongoing' &&
      input.actorRole === 'team_member' &&
      input.projectManagerId &&
      input.projectManagerId !== input.actorId
    ) {
      recipients.add(input.projectManagerId)
    }

    if (
      input.nextStatus === 'completed' &&
      input.projectManagerId &&
      input.projectManagerId !== input.actorId
    ) {
      recipients.add(input.projectManagerId)
    }

    if (
      input.nextStatus === 'rework' &&
      input.assigneeId &&
      input.assigneeId !== input.actorId
    ) {
      recipients.add(input.assigneeId)
    }

    await this.repository.createMany(
      [...recipients].map((userId) => ({
        tenant_id: input.tenantId,
        user_id: userId,
        type: this.notificationType(input.nextStatus),
        title: this.notificationTitle(input.nextStatus),
        message: `${input.taskTitle} moved from ${input.previousStatus} to ${input.nextStatus}${input.clientName ? ` for ${input.clientName}` : ''}.`,
        related_entity_type: 'task',
        related_entity_id: input.taskId,
      })),
    )

    // Dispatch to Microsoft Teams (non-blocking background task)
    const title = this.notificationTitle(input.nextStatus)
    const message = `${input.taskTitle} moved from ${input.previousStatus} to ${input.nextStatus}${input.clientName ? ` for ${input.clientName}` : ''}.`
    Promise.all(
      [...recipients].map((userId) =>
        this.teamsService.sendNotification({
          tenantId: input.tenantId,
          userId,
          title,
          message,
        }),
      ),
    ).catch((err) => {
      console.error('Error dispatching Teams status change notifications:', err)
    })
  }

  async notifyBlockerCreated(input: {
    tenantId: string
    actorId: string
    blockerId: string
    blockerTitle: string
    taskId: string
    taskTitle: string
    assigneeId?: string | null
    projectManagerId?: string | null
    clientName?: string | null
    notify?: string[]
  }) {
    const recipients = new Set<string>()

    if (input.assigneeId && input.assigneeId !== input.actorId) {
      recipients.add(input.assigneeId)
    }

    if (input.projectManagerId && input.projectManagerId !== input.actorId) {
      recipients.add(input.projectManagerId)
    }

    if (input.notify && input.notify.length > 0) {
      const stakeholders = await this.repository.findUsersByDesignation(
        input.tenantId,
        input.notify,
      )
      for (const sh of stakeholders) {
        if (sh.id !== input.actorId) {
          recipients.add(sh.id)
        }
      }
    }

    await this.repository.createMany(
      [...recipients].map((userId) => ({
        tenant_id: input.tenantId,
        user_id: userId,
        type: 'task_blocker_created',
        title: 'Task blocker logged',
        message: `${input.blockerTitle} was logged on ${input.taskTitle}${input.clientName ? ` for ${input.clientName}` : ''}.`,
        related_entity_type: 'blocker',
        related_entity_id: input.blockerId,
      })),
    )

    // Dispatch to Microsoft Teams (non-blocking background task)
    const title = 'Task blocker logged'
    const message = `${input.blockerTitle} was logged on ${input.taskTitle}${input.clientName ? ` for ${input.clientName}` : ''}.`
    Promise.all(
      [...recipients].map((userId) =>
        this.teamsService.sendNotification({
          tenantId: input.tenantId,
          userId,
          title,
          message,
        }),
      ),
    ).catch((err) => {
      console.error('Error dispatching Teams blocker notifications:', err)
    })
  }

  private notificationType(status: string) {
    if (status === 'completed') return 'task_approval_requested'
    if (status === 'rework') return 'task_rework_requested'
    return 'task_status_changed'
  }

  private notificationTitle(status: string) {
    if (status === 'completed') return 'Task ready for approval'
    if (status === 'rework') return 'Task sent for rework'
    return 'Task status updated'
  }
}
