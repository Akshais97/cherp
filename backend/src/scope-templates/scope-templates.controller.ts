import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { UserRole } from '../common/enums/user-role.enum'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { RequestUser } from '../common/types/request-user.type'
import { CreateScopeTemplateDto } from './dto/create-scope-template.dto'
import { ResolveScopeTemplateDto } from './dto/resolve-scope-template.dto'
import { UpdateScopeTemplateDto } from './dto/update-scope-template.dto'
import { ScopeTemplatesService } from './scope-templates.service'

@ApiTags('Scope Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SuperAdmin, UserRole.ProjectManager)
@Controller('scope-templates')
export class ScopeTemplatesController {
  constructor(private readonly service: ScopeTemplatesService) {}

  @Get()
  @ApiOkResponse({ description: 'Active tenant scope templates.' })
  list(@CurrentUser() user: RequestUser) {
    return this.service.list(user)
  }

  @Get('resolve')
  @ApiOkResponse({ description: 'Resolves a template by exact/fallback rules.' })
  resolve(
    @Query() query: ResolveScopeTemplateDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.resolve(query, user)
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Tenant scope template detail.' })
  detail(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.detail(id, user)
  }

  @Post()
  @ApiCreatedResponse({ description: 'Creates a tenant scope template.' })
  create(@Body() dto: CreateScopeTemplateDto, @CurrentUser() user: RequestUser) {
    return this.service.create(dto, user)
  }

  @Post('seed')
  @ApiOkResponse({ description: 'Seeds Phase 1 template presets for the tenant.' })
  seed(@CurrentUser() user: RequestUser) {
    return this.service.seed(user)
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Updates a tenant scope template.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateScopeTemplateDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, dto, user)
  }

  @Patch(':id/deactivate')
  @ApiOkResponse({ description: 'Deactivates a tenant scope template.' })
  deactivate(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.deactivate(id, user)
  }
}
