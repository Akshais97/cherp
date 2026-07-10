import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { UserRole } from '../common/enums/user-role.enum'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { RequestUser } from '../common/types/request-user.type'
import { BlockersService } from './blockers.service'
import { BlockerQueryDto } from './dto/blocker-query.dto'
import { CreateBlockerDto } from './dto/create-blocker.dto'
import { ResolveBlockerDto } from './dto/resolve-blocker.dto'

@ApiTags('Blockers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('blockers')
export class BlockersController {
  constructor(private readonly service: BlockersService) {}

  @Post()
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
  @ApiCreatedResponse({ description: 'Creates a blocker and blocks the linked task.' })
  create(@Body() dto: CreateBlockerDto, @CurrentUser() user: RequestUser) {
    return this.service.create(dto, user)
  }

  @Get()
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
  @ApiOkResponse({ description: 'Lists tenant blockers.' })
  list(@Query() filters: BlockerQueryDto, @CurrentUser() user: RequestUser) {
    return this.service.list(filters, user)
  }

  @Get(':id')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
  @ApiOkResponse({ description: 'Returns blocker detail.' })
  detail(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.detail(id, user)
  }

  @Patch(':id/resolve')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
  @ApiOkResponse({ description: 'Resolves a blocker and restores the task when allowed.' })
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveBlockerDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.resolve(id, dto, user)
  }
}
