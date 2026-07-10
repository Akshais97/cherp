import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RequestUser } from '../common/types/request-user.type'
import { NotificationsService } from './notifications.service'

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOkResponse({ description: 'Lists notifications for the current user.' })
  list(@CurrentUser() user: RequestUser, @Query('unread') unread?: string) {
    return this.service.list(user, unread === 'true')
  }

  @Patch(':id/read')
  @ApiOkResponse({ description: 'Marks a notification as read.' })
  markRead(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.markRead(id, user)
  }
}
