import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RequestUser } from '../common/types/request-user.type'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Client should clear local session state.' })
  logout(@CurrentUser() user: RequestUser) {
    return {
      user_id: user.id,
      message: 'Session accepted for client-side invalidation.',
    }
  }
}
