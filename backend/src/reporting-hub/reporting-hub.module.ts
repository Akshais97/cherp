import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { ReportingHubController } from './reporting-hub.controller'
import { ReportingHubService } from './reporting-hub.service'

@Module({
  imports: [PrismaModule],
  controllers: [ReportingHubController],
  providers: [ReportingHubService],
  exports: [ReportingHubService],
})
export class ReportingHubModule {}
