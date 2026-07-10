import { Module } from '@nestjs/common'
import { BlockersModule } from '../blockers/blockers.module'
import { PrismaModule } from '../prisma/prisma.module'
import { TasksModule } from '../tasks/tasks.module'
import { AiChatController } from './ai-chat.controller'
import { AiChatRepository } from './ai-chat.repository'
import { AiChatService } from './ai-chat.service'

@Module({
  imports: [PrismaModule, TasksModule, BlockersModule],
  controllers: [AiChatController],
  providers: [AiChatService, AiChatRepository],
})
export class AiChatModule {}
