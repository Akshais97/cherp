import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RequestUser } from '../common/types/request-user.type'
import { CreateCampaignResultDto } from './dto/create-campaign-result.dto'
import { CreateContentPerformanceDto } from './dto/create-content-performance.dto'
import { UpdateCampaignResultDto } from './dto/update-campaign-result.dto'
import { ReportingHubService } from './reporting-hub.service'

@Controller('reporting-hub')
@UseGuards(JwtAuthGuard)
export class ReportingHubController {
  constructor(private readonly reportingHubService: ReportingHubService) {}

  @Post('campaign-results')
  async createCampaignResult(@Body() dto: CreateCampaignResultDto, @CurrentUser() user: RequestUser) {
    return this.reportingHubService.createCampaignResult(dto, user)
  }

  @Get('campaign-results')
  async listCampaignResults(
    @Query('client_id') clientId?: string,
    @Query('channel') channel?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.reportingHubService.listCampaignResults(
      { client_id: clientId, channel, start_date: startDate, end_date: endDate },
      user!,
    )
  }

  @Patch('campaign-results/:id')
  async updateCampaignResult(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignResultDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reportingHubService.updateCampaignResult(id, dto, user)
  }

  @Delete('campaign-results/:id')
  async deleteCampaignResult(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.reportingHubService.deleteCampaignResult(id, user)
  }

  @Get('channel-breakdown')
  async getChannelBreakdown(
    @Query('client_id') clientId?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.reportingHubService.getChannelBreakdown(
      { client_id: clientId, start_date: startDate, end_date: endDate },
      user!,
    )
  }

  @Post('content-performance')
  async createContentPerformance(@Body() dto: CreateContentPerformanceDto, @CurrentUser() user: RequestUser) {
    return this.reportingHubService.createContentPerformance(dto, user)
  }

  @Get('content-performance')
  async listContentPerformances(@Query('client_id') clientId: string, @CurrentUser() user: RequestUser) {
    return this.reportingHubService.listContentPerformances(clientId, user)
  }

  @Delete('content-performance/:id')
  async deleteContentPerformance(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.reportingHubService.deleteContentPerformance(id, user)
  }
}
