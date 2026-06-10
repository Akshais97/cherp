import { Module } from '@nestjs/common'
import { NotificationsModule } from '../notifications/notifications.module'
import { BlockersController } from './blockers.controller'
import { BlockersRepository } from './blockers.repository'
import { BlockersService } from './blockers.service'

@Module({
  imports: [NotificationsModule],
  controllers: [BlockersController],
  providers: [BlockersService, BlockersRepository],
  exports: [BlockersService, BlockersRepository],
})
export class BlockersModule {}
