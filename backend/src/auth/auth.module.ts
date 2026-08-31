import { Module } from '@nestjs/common'
import { ActivityLogsModule } from '../activity-logs/activity-logs.module'
import { CommonModule } from '../common/common.module'
import { UsersModule } from '../users/users.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'

@Module({
  imports: [CommonModule, UsersModule, ActivityLogsModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
