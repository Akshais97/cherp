import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { MailService } from '../mail/mail.service'
import { NotificationsService } from '../notifications/notifications.service'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class DeadlineReminderJob {
  private readonly logger = new Logger(DeadlineReminderJob.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
  ) {}

  // Run daily at 08:00
  @Cron('0 8 * * *')
  async handleCron() {
    this.logger.log('Starting Task Deadline Reminder Daemon Job...')
    const now = new Date()
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const activeTasks = await this.prisma.task.findMany({
      where: {
        status: { in: ['yet_to_start', 'ongoing', 'rework'] },
        due_date: { not: null },
      },
      include: {
        assignee: true,
      },
    })

    for (const task of activeTasks) {
      if (!task.due_date || !task.assignee) continue

      const dueDate = new Date(task.due_date)
      const isOverdue = dueDate < now
      const isDueSoon = dueDate >= now && dueDate <= in24Hours

      if (isOverdue || isDueSoon) {
        const dateStr = dueDate.toISOString().slice(0, 10)
        const type = isOverdue ? 'task_overdue' : 'task_due_soon'
        const idempotencyKey = `${type}:${task.id}:${dateStr}`

        const alreadySent = await this.prisma.notificationDeliveryLog.findUnique({
          where: { tenant_id_idempotency_key: { tenant_id: task.tenant_id, idempotency_key: idempotencyKey } },
        })

        if (!alreadySent) {
          const statusLabel = isOverdue ? 'OVERDUE' : 'due in 24 hours'

          await this.notifications.createNotification(
            task.tenant_id,
            task.assignee.id,
            type,
            `Task ${isOverdue ? 'Overdue' : 'Due Soon'}: ${task.title}`,
            `Task "${task.title}" is ${statusLabel} (Due: ${dateStr}).`,
            'task',
            task.id,
          )

          if (task.assignee.email) {
            await this.mail.sendDeadlineReminderEmail({
              tenantId: task.tenant_id,
              toEmail: task.assignee.email,
              recipientName: task.assignee.full_name,
              taskTitle: task.title,
              dueDate: dateStr,
              isOverdue,
            })
          }

          await this.prisma.notificationDeliveryLog.create({
            data: {
              tenant_id: task.tenant_id,
              user_id: task.assignee.id,
              channel: 'email',
              type,
              idempotency_key: idempotencyKey,
              status: 'delivered',
            },
          })
        }
      }
    }
  }
}
