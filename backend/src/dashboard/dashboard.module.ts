import { Module } from '@nestjs/common'
import { CommonModule } from '../common/common.module'
import { DashboardController } from './dashboard.controller'
import { DashboardRepository } from './dashboard.repository'
import { DashboardService } from './dashboard.service'

@Module({
  imports: [CommonModule],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardRepository],
})
export class DashboardModule {}
