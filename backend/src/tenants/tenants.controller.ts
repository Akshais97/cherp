import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RequestUser } from '../common/types/request-user.type'
import { TenantsService } from './tenants.service'

@Controller('tenant/settings')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  async getSettings(@CurrentUser() user: RequestUser) {
    return this.tenantsService.getSettings(user)
  }

  @Patch()
  async updateSettings(
    @Body() dto: { resend_api_key?: string; resend_from_email?: string },
    @CurrentUser() user: RequestUser,
  ) {
    return this.tenantsService.updateSettings(dto, user)
  }
}
