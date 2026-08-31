import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { MailService } from '../mail/mail.service'
import { NotificationsService } from '../notifications/notifications.service'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class DailyDigestJob {
  private readonly logger = new Logger(DailyDigestJob.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
  ) {}

  // Run daily at 08:30
  @Cron('30 8 * * *')
  async handleCron() {
    this.logger.log('Starting Daily Digest Summary Daemon Job...')
    const todayStr = new Date().toISOString().slice(0, 10)

    const activeUsers = await this.prisma.user.findMany({
      where: { is_active: true },
    })

    for (const user of activeUsers) {
      const idempotencyKey = `daily_digest:${user.id}:${todayStr}`

      const alreadySent = await this.prisma.notificationDeliveryLog.findUnique({
        where: { tenant_id_idempotency_key: { tenant_id: user.tenant_id, idempotency_key: idempotencyKey } },
      })

      if (alreadySent) continue

      const dueTodayCount = await this.prisma.task.count({
        where: {
          tenant_id: user.tenant_id,
          assigned_to: user.id,
          status: { in: ['yet_to_start', 'ongoing', 'rework'] },
          due_date: {
            gte: new Date(`${todayStr}T00:00:00.000Z`),
            lte: new Date(`${todayStr}T23:59:59.999Z`),
          },
        },
      })

      const overdueCount = await this.prisma.task.count({
        where: {
          tenant_id: user.tenant_id,
          assigned_to: user.id,
          status: { in: ['yet_to_start', 'ongoing', 'rework'] },
          due_date: { lt: new Date(`${todayStr}T00:00:00.000Z`) },
        },
      })

      const openBlockersCount = await this.prisma.blocker.count({
        where: {
          tenant_id: user.tenant_id,
          assigned_to: user.id,
          status: 'open',
        },
      })

      if (dueTodayCount > 0 || overdueCount > 0 || openBlockersCount > 0) {
        await this.notifications.createNotification(
          user.tenant_id,
          user.id,
          'daily_digest',
          '☀️ Daily Digest Briefing',
          `Today: ${dueTodayCount} tasks due today, ${overdueCount} overdue, ${openBlockersCount} open blockers.`,
        )

        if (user.email) {
          await this.mail.sendDailyDigestEmail({
            tenantId: user.tenant_id,
            toEmail: user.email,
            recipientName: user.full_name,
            dueTodayCount,
            overdueCount,
            openBlockersCount,
          })
        }

        await this.prisma.notificationDeliveryLog.create({
          data: {
            tenant_id: user.tenant_id,
            user_id: user.id,
            channel: 'email',
            type: 'daily_digest',
            idempotency_key: idempotencyKey,
            status: 'delivered',
          },
        })
      }
    }
  }
}
