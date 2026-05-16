import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { UserRole } from '../common/enums/user-role.enum'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { RequestUser } from '../common/types/request-user.type'
import { CreateTaskDto } from '../tasks/dto/create-task.dto'
import { TasksService } from '../tasks/tasks.service'

@ApiTags('Workflow Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('workflows/:workflowId/tasks')
export class WorkflowTasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager)
  @ApiCreatedResponse({ description: 'Creates a custom task in a workflow.' })
  create(
    @Param('workflowId') workflowId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.tasksService.create(workflowId, dto, user)
  }
}
