import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { UserRole } from '../common/enums/user-role.enum'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { RequestUser } from '../common/types/request-user.type'
import { WorkflowQueryDto } from './dto/workflow-query.dto'
import { WorkflowsService } from './workflows.service'

@ApiTags('Workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly service: WorkflowsService) {}

  @Get()
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
  @ApiOkResponse({ description: 'Tenant workflow list.' })
  list(@CurrentUser() user: RequestUser, @Query() query: WorkflowQueryDto) {
    return this.service.list(user, query)
  }

  @Get('month-planning-readiness')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager)
  @ApiOkResponse({ description: 'Lists active workflows requiring month planning within 14 days.' })
  getMonthPlanningReadiness(@CurrentUser() user: RequestUser) {
    return this.service.getMonthPlanningReadiness(user)
  }

  @Get(':id')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
  @ApiOkResponse({ description: 'Workflow detail with tasks and blockers.' })
  detail(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.detail(id, user)
  }
}
