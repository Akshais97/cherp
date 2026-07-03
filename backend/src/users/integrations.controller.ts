import { Controller, Get, Post, Body, UseGuards, ForbiddenException } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { RequestUser } from '../common/types/request-user.type'
import { TeamsIntegrationService } from './teams-integration.service'

@ApiTags('Integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly teamsService: TeamsIntegrationService) {}

  private checkOwner(user: RequestUser) {
    if (user.email !== 'akshaiofficial97@gmail.com') {
      throw new ForbiddenException('Only the Super Admin/Owner can access integrations.')
    }
  }

  @Get('teams')
  async getSettings(@CurrentUser() user: RequestUser) {
    this.checkOwner(user)
    return this.teamsService.getSettings(user.tenantId)
  }

  @Post('teams')
  async saveSettings(@CurrentUser() user: RequestUser, @Body() body: any) {
    this.checkOwner(user)
    return this.teamsService.saveSettings(user.tenantId, {
      enabled: body.enabled,
      tenantId: body.tenantId,
      clientId: body.clientId,
      clientSecret: body.clientSecret,
    })
  }

  @Post('teams/test')
  async testConnection(@CurrentUser() user: RequestUser, @Body() body: any) {
    this.checkOwner(user)
    return this.teamsService.testConnection({
      tenantId: body.tenantId,
      clientId: body.clientId,
      clientSecret: body.clientSecret,
    })
  }

  @Post('teams/sync')
  async syncUsers(@CurrentUser() user: RequestUser) {
    this.checkOwner(user)
    return this.teamsService.syncUsers(user.tenantId)
  }
}
