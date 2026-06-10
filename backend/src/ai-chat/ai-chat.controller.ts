import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RequestUser } from '../common/types/request-user.type'
import { AiChatService } from './ai-chat.service'
import { AiChatDto } from './dto/ai-chat.dto'

@ApiTags('AI Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai-chat')
export class AiChatController {
  constructor(private readonly service: AiChatService) {}

  @Post()
  @ApiOkResponse({ description: 'Runs a guided AI chatbot action.' })
  chat(@Body() dto: AiChatDto, @CurrentUser() user: RequestUser) {
    return this.service.chat(dto, user)
  }
}
