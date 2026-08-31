import { Module } from '@nestjs/common'
import { CommonModule } from '../common/common.module'
import { PrismaModule } from '../prisma/prisma.module'
import { ReportsController } from './reports.controller'
import { ReportsService } from './reports.service'

@Module({
  imports: [CommonModule, PrismaModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
