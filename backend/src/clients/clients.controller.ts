import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { UserRole } from '../common/enums/user-role.enum'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { RequestUser } from '../common/types/request-user.type'
import { ClientsService } from './clients.service'
import { ClientQueryDto } from './dto/client-query.dto'
import { CreateClientDto } from './dto/create-client.dto'
import { UpdateClientStatusDto } from './dto/update-client-status.dto'
import { UpdateClientDto } from './dto/update-client.dto'

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly service: ClientsService) {}

  @Get()
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
  @ApiOkResponse({ description: 'Tenant client directory.' })
  list(@CurrentUser() user: RequestUser, @Query() query: ClientQueryDto) {
    return this.service.list(user, query)
  }

  @Get(':id')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
  @ApiOkResponse({ description: 'Client detail with linked workflow summary.' })
  detail(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.detail(id, user)
  }

  @Post()
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager)
  @ApiCreatedResponse({
    description: 'Creates client, Month 1 workflow, tasks, and activity logs atomically.',
  })
  create(@Body() dto: CreateClientDto, @CurrentUser() user: RequestUser) {
    return this.service.create(dto, user)
  }

  @Patch(':id')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager)
  @ApiOkResponse({ description: 'Updates tenant client profile fields.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, dto, user)
  }

  @Patch(':id/status')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager)
  @ApiOkResponse({ description: 'Changes client lifecycle status.' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateClientStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.updateStatus(id, dto, user)
  }

  @Delete(':id')
  @Roles(UserRole.SuperAdmin)
  @ApiOkResponse({ description: 'Soft archives a client.' })
  archive(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.archive(id, user)
  }
}
