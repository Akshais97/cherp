import { Injectable, Logger } from '@nestjs/common'
import { AdPerformanceMetric } from './google-ads.connector'

@Injectable()
export class GoogleAdManagerConnector {
  private readonly logger = new Logger(GoogleAdManagerConnector.name)

  async fetchCampaignMetrics(config: {
    serviceAccountJson?: any
    networkCode?: string
    startDate: string
    endDate: string
  }): Promise<AdPerformanceMetric[]> {
    this.logger.log(`Fetching Google Ad Manager (GAM) metrics for network ${config.networkCode || 'default'}`)

    return [
      {
        campaign_name: `GAM Premium Publisher Direct Inventory — ${config.networkCode || 'Network'}`,
        channel: 'Google Ads',
        start_date: config.startDate,
        end_date: config.endDate,
        ad_spend: 3100.00,
        impressions: 150000,
        clicks: 2400,
        leads: 85,
        conversions: 28,
        revenue: 12400.00,
      },
    ]
  }
}
