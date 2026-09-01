import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ActivityLogsModule } from './activity-logs/activity-logs.module'
import { AiChatModule } from './ai-chat/ai-chat.module'
import { AuthModule } from './auth/auth.module'
import { BlockersModule } from './blockers/blockers.module'
import { ClientsModule } from './clients/clients.module'
import { DashboardModule } from './dashboard/dashboard.module'
import { NotificationsModule } from './notifications/notifications.module'
import { PrismaModule } from './prisma/prisma.module'
import { ReportsModule } from './reports/reports.module'
import { ScopeTemplatesModule } from './scope-templates/scope-templates.module'
import { TasksModule } from './tasks/tasks.module'
import { TimeEntriesModule } from './time-entries/time-entries.module'
import { UsersModule } from './users/users.module'
import { WorkflowsModule } from './workflows/workflows.module'
import { MailModule } from './mail/mail.module'
import { ReportingHubModule } from './reporting-hub/reporting-hub.module'
import { SchedulersModule } from './schedulers/schedulers.module'
import { TenantsModule } from './tenants/tenants.module'
import { AdPlatformIntegrationModule } from './ad-platform/ad-platform.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    MailModule,
    TenantsModule,
    AdPlatformIntegrationModule,
    SchedulersModule,
    ReportingHubModule,
    ActivityLogsModule,
    AiChatModule,
    AuthModule,
    DashboardModule,
    NotificationsModule,
    ScopeTemplatesModule,
    ClientsModule,
    UsersModule,
    WorkflowsModule,
    TasksModule,
    BlockersModule,
    TimeEntriesModule,
    ReportsModule,
  ],
})
export class AppModule {}
