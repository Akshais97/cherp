import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common'
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

  @Patch('read-all')
  @ApiOkResponse({ description: 'Marks all notifications as read for the current user.' })
  markAllRead(@CurrentUser() user: RequestUser) {
    return this.service.markAllRead(user)
  }

  @Patch(':id/read')
  @ApiOkResponse({ description: 'Marks a notification as read.' })
  markRead(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.markRead(id, user)
  }

  @Get('preferences')
  @ApiOkResponse({ description: 'Retrieves notification preferences for the current user.' })
  getPreferences(@CurrentUser() user: RequestUser) {
    return this.service.getPreferences(user)
  }

  @Patch('preferences')
  @ApiOkResponse({ description: 'Updates a notification preference for the current user.' })
  updatePreference(
    @Body() body: { notification_type: string; in_app_enabled?: boolean; email_enabled?: boolean },
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.updatePreference(
      body.notification_type,
      body.in_app_enabled ?? true,
      body.email_enabled ?? false,
      user,
    )
  }
}
