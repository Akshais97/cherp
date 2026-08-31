import { Module } from '@nestjs/common'
import { CommonModule } from '../common/common.module'
import { TimeEntriesController } from './time-entries.controller'
import { TimeEntriesRepository } from './time-entries.repository'
import { TimeEntriesService } from './time-entries.service'

@Module({
  imports: [CommonModule],
  controllers: [TimeEntriesController],
  providers: [TimeEntriesRepository, TimeEntriesService],
  exports: [TimeEntriesRepository, TimeEntriesService],
})
export class TimeEntriesModule {}
