import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { MailService } from '../mail/mail.service'
import { NotificationsService } from '../notifications/notifications.service'
import { PrismaService } from '../prisma/prisma.service'

const SLA_THRESHOLDS_DAYS: Record<string, number> = {
  high: 3,
  medium: 5,
  low: 7,
}

@Injectable()
export class BlockerEscalationJob {
  private readonly logger = new Logger(BlockerEscalationJob.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
  ) {}

  // Run hourly daemon job
  @Cron('0 * * * *')
  async handleCron() {
    this.logger.log('Starting hourly Blocker SLA Escalation Daemon Job...')
    const now = new Date()

    const openBlockers = await this.prisma.blocker.findMany({
      where: { status: 'open' },
      include: {
        task: true,
        client: true,
        flagger: true,
        assignee: true,
      },
    })

    for (const blocker of openBlockers) {
      const thresholdDays = SLA_THRESHOLDS_DAYS[blocker.severity.toLowerCase()] || 7
      const ageInDays = (now.getTime() - new Date(blocker.flagged_at).getTime()) / (1000 * 60 * 60 * 24)

      if (ageInDays >= thresholdDays) {
        const idempotencyKey = `blocker_escalated:${blocker.id}:${Math.floor(ageInDays)}`
        const alreadyEscalated = await this.prisma.notificationDeliveryLog.findUnique({
          where: { tenant_id_idempotency_key: { tenant_id: blocker.tenant_id, idempotency_key: idempotencyKey } },
        })

        if (!alreadyEscalated) {
          this.logger.log(`Escalating open ${blocker.severity} blocker "${blocker.title}" (Open ${ageInDays.toFixed(1)} days)`)

          // Notify assignee / PM / Flagger in-app
          if (blocker.assignee) {
            await this.notifications.createNotification(
              blocker.tenant_id,
              blocker.assignee.id,
              'blocker_escalated',
              `[ESCALATION] ${blocker.severity.toUpperCase()} Blocker: ${blocker.title}`,
              `Blocker on task "${blocker.task.title}" has been open for ${Math.floor(ageInDays)} days (SLA: ${thresholdDays} days).`,
              'blocker',
              blocker.id,
            )

            if (blocker.assignee.email) {
              await this.mail.sendBlockerEscalationEmail({
                tenantId: blocker.tenant_id,
                toEmail: blocker.assignee.email,
                recipientName: blocker.assignee.full_name,
                blockerTitle: blocker.title,
                severity: blocker.severity,
                taskTitle: blocker.task.title,
                daysOpen: Math.floor(ageInDays),
              })
            }
          }

          // Record delivery log for idempotency
          await this.prisma.notificationDeliveryLog.create({
            data: {
              tenant_id: blocker.tenant_id,
              user_id: blocker.assigned_to || blocker.flagged_by,
              channel: 'email',
              type: 'blocker_escalated',
              idempotency_key: idempotencyKey,
              status: 'delivered',
            },
          })
        }
      }
    }
  }
}
