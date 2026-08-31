import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { MailModule } from '../mail/mail.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { PrismaModule } from '../prisma/prisma.module'
import { BlockerEscalationJob } from './blocker-escalation.job'
import { DailyDigestJob } from './daily-digest.job'
import { DeadlineReminderJob } from './deadline-reminder.job'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    NotificationsModule,
    MailModule,
  ],
  providers: [
    BlockerEscalationJob,
    DeadlineReminderJob,
    DailyDigestJob,
  ],
})
export class SchedulersModule {}
