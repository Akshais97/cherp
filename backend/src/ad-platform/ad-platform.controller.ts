import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RequestUser } from '../common/types/request-user.type'
import { AdPlatformService } from './ad-platform.service'
import { LinkClientAdAccountDto } from './dto/link-account.dto'
import { SaveAdCredentialsDto } from './dto/save-credentials.dto'
import { TriggerAdSyncDto } from './dto/trigger-sync.dto'

@Controller('ad-platform')
@UseGuards(JwtAuthGuard)
export class AdPlatformController {
  constructor(private readonly adPlatformService: AdPlatformService) {}

  @Post('credentials')
  async saveCredentials(@Body() dto: SaveAdCredentialsDto, @CurrentUser() user: RequestUser) {
    return this.adPlatformService.saveCredentials(dto, user)
  }

  @Get('credentials')
  async getCredentials(@CurrentUser() user: RequestUser) {
    return this.adPlatformService.getCredentials(user)
  }

  @Get('oauth/:platform')
  async getOAuthUrl(@Param('platform') platform: string, @CurrentUser() user: RequestUser) {
    return this.adPlatformService.getOAuthUrl(platform, user)
  }

  @Get('callback/:platform')
  async handleOAuthCallback(
    @Param('platform') platform: string,
    @Query('code') code: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.adPlatformService.handleOAuthCallback(platform, code, user)
  }

  @Post('test-connection')
  async testConnection(@Body('platform') platform: string, @CurrentUser() user: RequestUser) {
    return this.adPlatformService.testConnection(platform, user)
  }

  @Get('accounts/:platform')
  async listAvailableAdAccounts(@Param('platform') platform: string, @CurrentUser() user: RequestUser) {
    return this.adPlatformService.listAvailableAdAccounts(platform, user)
  }

  @Post('link-account')
  async linkClientAdAccount(@Body() dto: LinkClientAdAccountDto, @CurrentUser() user: RequestUser) {
    return this.adPlatformService.linkClientAdAccount(dto, user)
  }

  @Get('client-accounts')
  async getLinkedClientAdAccounts(@Query('client_id') clientId: string, @CurrentUser() user: RequestUser) {
    return this.adPlatformService.getLinkedClientAdAccounts(clientId, user)
  }

  @Post('sync')
  async syncMetrics(@Body() dto: TriggerAdSyncDto, @CurrentUser() user: RequestUser) {
    return this.adPlatformService.syncMetrics(dto, user)
  }

  @Get('sync-logs')
  async getSyncLogs(@CurrentUser() user: RequestUser) {
    return this.adPlatformService.getSyncLogs(user)
  }
}
