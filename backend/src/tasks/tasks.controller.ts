import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { UserRole } from '../common/enums/user-role.enum'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { RequestUser } from '../common/types/request-user.type'
import { UpdateTaskDto } from './dto/update-task.dto'
import { TasksService } from './tasks.service'

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Patch(':id')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
  @ApiOkResponse({ description: 'Updates a tenant task.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, dto, user)
  }

  @Patch(':id/complete')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
  @ApiOkResponse({ description: 'Completes a tenant task.' })
  complete(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.complete(id, user)
  }
}
