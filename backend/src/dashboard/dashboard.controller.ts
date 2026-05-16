import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { UserRole } from '../common/enums/user-role.enum'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { RequestUser } from '../common/types/request-user.type'
import { DashboardQueryDto } from './dto/dashboard-query.dto'
import { DashboardService } from './dashboard.service'

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOkResponse({ description: 'Derived internal dashboard summary.' })
  getSummary(@CurrentUser() user: RequestUser, @Query() query: DashboardQueryDto) {
    return this.dashboardService.getSummary(user, query)
  }

  @Get('client-health')
  @ApiOkResponse({ description: 'Derived client health rows.' })
  getClientHealth(@CurrentUser() user: RequestUser, @Query() query: DashboardQueryDto) {
    return this.dashboardService.getClientHealth(user, query)
  }

  @Get('upcoming-deadlines')
  @ApiOkResponse({ description: 'Incomplete overdue and next-7-days task deadlines.' })
  getUpcomingDeadlines(@CurrentUser() user: RequestUser, @Query() query: DashboardQueryDto) {
    return this.dashboardService.getUpcomingDeadlines(user, query)
  }

  @Get('open-blockers')
  @ApiOkResponse({ description: 'Open blockers sorted by severity and flagged date.' })
  getOpenBlockers(@CurrentUser() user: RequestUser, @Query() query: DashboardQueryDto) {
    return this.dashboardService.getOpenBlockers(user, query)
  }

  @Get('recent-activity')
  @ApiOkResponse({ description: 'Recent append-only activity log entries.' })
  getRecentActivity(@CurrentUser() user: RequestUser, @Query() query: DashboardQueryDto) {
    return this.dashboardService.getRecentActivity(user, query)
  }
}
