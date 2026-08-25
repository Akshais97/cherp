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
import { ScopeTemplatesModule } from './scope-templates/scope-templates.module'
import { TasksModule } from './tasks/tasks.module'
import { UsersModule } from './users/users.module'
import { WorkflowsModule } from './workflows/workflows.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
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
  ],
})
export class AppModule {}
