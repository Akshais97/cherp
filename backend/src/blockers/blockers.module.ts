import { Module } from '@nestjs/common'
import { BlockersController } from './blockers.controller'
import { BlockersRepository } from './blockers.repository'
import { BlockersService } from './blockers.service'

@Module({
  controllers: [BlockersController],
  providers: [BlockersService, BlockersRepository],
  exports: [BlockersService, BlockersRepository],
})
export class BlockersModule {}
