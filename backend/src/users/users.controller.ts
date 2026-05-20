import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { UserRole } from '../common/enums/user-role.enum'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { RequestUser } from '../common/types/request-user.type'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { UsersService } from './users.service'

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager)
  @ApiOkResponse({ description: 'Tenant users with safe profile and role fields.' })
  list(@CurrentUser() user: RequestUser) {
    return this.usersService.list(user)
  }

  @Post()
  @Roles(UserRole.SuperAdmin)
  @ApiCreatedResponse({ description: 'Creates a Supabase Auth user and ERP user in this tenant.' })
  create(@Body() dto: CreateUserDto, @CurrentUser() user: RequestUser) {
    return this.usersService.create(dto, user)
  }

  @Get('team-members')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager)
  @ApiOkResponse({ description: 'Tenant team members available for workload review.' })
  listTeamMembers(@CurrentUser() user: RequestUser) {
    return this.usersService.listTeamMembers(user)
  }

  @Get('team-members/:id/workload')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager)
  @ApiOkResponse({ description: 'Assigned tasks and related blockers for a team member.' })
  getTeamMemberWorkload(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.usersService.getTeamMemberWorkload(id, user)
  }

  @Patch(':id')
  @Roles(UserRole.SuperAdmin)
  @ApiOkResponse({ description: 'Updates role-sensitive user fields.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.usersService.update(id, dto, user)
  }

  @Delete(':id')
  @Roles(UserRole.SuperAdmin)
  @ApiOkResponse({ description: 'Deletes a tenant user when no protected historical records depend on them.' })
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.usersService.remove(id, user)
  }
}
