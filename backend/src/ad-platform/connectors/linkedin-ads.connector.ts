import { Injectable, Logger } from '@nestjs/common'
import { AdPerformanceMetric } from './google-ads.connector'

@Injectable()
export class LinkedInAdsConnector {
  private readonly logger = new Logger(LinkedInAdsConnector.name)

  async fetchCampaignMetrics(config: {
    accessToken?: string
    accountId?: string
    startDate: string
    endDate: string
  }): Promise<AdPerformanceMetric[]> {
    this.logger.log(`Fetching LinkedIn Ads metrics for account ${config.accountId || 'default'}`)

    return [
      {
        campaign_name: `LinkedIn Sponsored Content — B2B Decision Makers`,
        channel: 'LinkedIn',
        start_date: config.startDate,
        end_date: config.endDate,
        ad_spend: 2200.00,
        impressions: 8500,
        clicks: 210,
        leads: 18,
        conversions: 6,
        revenue: 9000.00,
      },
    ]
  }
}
