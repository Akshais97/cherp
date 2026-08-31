import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { UserRole } from '../common/enums/user-role.enum'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { RequestUser } from '../common/types/request-user.type'
import { ActivityLogsService } from './activity-logs.service'

@ApiTags('Activity Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private readonly service: ActivityLogsService) {}

  @Get()
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager)
  @ApiOkResponse({ description: 'Lists system audit logs with optional entity, user, or action filters.' })
  findMany(
    @Query('entityType') entityType?: string,
    @Query('actionType') actionType?: string,
    @Query('userId') userId?: string,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.service.findMany(user!, { entityType, actionType, userId })
  }

  @Get('export.csv')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager)
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="audit-logs.csv"')
  @ApiOkResponse({ description: 'Exports audit logs to CSV format.' })
  exportCsv(
    @Query('entityType') entityType?: string,
    @Query('actionType') actionType?: string,
    @Query('userId') userId?: string,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.service.generateCsvExport(user!, { entityType, actionType, userId })
  }
}
