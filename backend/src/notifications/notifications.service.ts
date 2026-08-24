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
      input.nextStatus === 'rework' &&
      input.assigneeId &&
      input.assigneeId !== input.actorId
    ) {
      recipients.add(input.assigneeId)
    }

    const pmNotifiableStatuses = ['blocked', 'rework', 'task_approved_by_manager']
    if (
      input.actorRole === 'team_member' &&
      pmNotifiableStatuses.includes(input.nextStatus) &&
      input.projectManagerId &&
      input.projectManagerId !== input.actorId
    ) {
      recipients.add(input.projectManagerId)
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

  async notifyTaskCommentMention(input: {
    tenantId: string
    actorId: string
    taskId: string
    taskTitle: string
    commentContent: string
    mentionedUserIds: string[]
  }) {
    if (!input.mentionedUserIds || input.mentionedUserIds.length === 0) return

    const recipients = new Set<string>()
    for (const userId of input.mentionedUserIds) {
      if (userId && userId !== input.actorId) {
        recipients.add(userId)
      }
    }

    if (recipients.size === 0) return

    const snippet = input.commentContent.length > 80
      ? `${input.commentContent.substring(0, 80)}...`
      : input.commentContent

    const title = 'Mentioned in task comment'
    const message = `You were mentioned in a comment on "${input.taskTitle}": "${snippet}"`

    await this.repository.createMany(
      [...recipients].map((userId) => ({
        tenant_id: input.tenantId,
        user_id: userId,
        type: 'task_comment_mention',
        title,
        message,
        related_entity_type: 'task',
        related_entity_id: input.taskId,
      })),
    )

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
      console.error('Error dispatching Teams mention notifications:', err)
    })
  }

  private notificationType(status: string) {
    if (status === 'task_approved_by_manager' || status === 'completed') return 'task_approval_requested'
    if (status === 'rework') return 'task_rework_requested'
    if (status === 'blocked') return 'task_blocked'
    return 'task_status_changed'
  }

  private notificationTitle(status: string) {
    if (status === 'task_approved_by_manager' || status === 'completed') return 'Task ready for approval'
    if (status === 'rework') return 'Task sent for rework'
    if (status === 'blocked') return 'Task marked as blocked'
    return 'Task status updated'
  }
}
