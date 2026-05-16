import { Module } from '@nestjs/common'
import { ActivityLogsRepository } from './activity-logs.repository'

@Module({
  providers: [ActivityLogsRepository],
  exports: [ActivityLogsRepository],
})
export class ActivityLogsModule {}
