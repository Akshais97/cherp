import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { UserRole } from '../common/enums/user-role.enum'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { RequestUser } from '../common/types/request-user.type'
import { WorkflowsService } from './workflows.service'

@ApiTags('Client Workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clients/:clientId/workflows')
export class ClientWorkflowsController {
  constructor(private readonly service: WorkflowsService) {}

  @Get()
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
  @ApiOkResponse({ description: 'Tenant workflows for a client.' })
  listByClient(
    @Param('clientId') clientId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.listByClient(clientId, user)
  }
}
