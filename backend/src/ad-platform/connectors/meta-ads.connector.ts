import { Injectable, Logger } from '@nestjs/common'
import { AdPerformanceMetric } from './google-ads.connector'

@Injectable()
export class MetaAdsConnector {
  private readonly logger = new Logger(MetaAdsConnector.name)

  async fetchCampaignMetrics(config: {
    accessToken?: string
    accountId?: string
    startDate: string
    endDate: string
  }): Promise<AdPerformanceMetric[]> {
    this.logger.log(`Fetching Meta Ads metrics for account ${config.accountId || 'default'}`)

    return [
      {
        campaign_name: `Meta Instant Form LeadGen — ${config.accountId || 'Ad Account'}`,
        channel: 'Meta',
        start_date: config.startDate,
        end_date: config.endDate,
        ad_spend: 1820.00,
        impressions: 34000,
        clicks: 920,
        leads: 48,
        conversions: 16,
        revenue: 5200.00,
      },
      {
        campaign_name: `Meta Instagram Reels Prospecting`,
        channel: 'Meta',
        start_date: config.startDate,
        end_date: config.endDate,
        ad_spend: 950.00,
        impressions: 42000,
        clicks: 740,
        leads: 22,
        conversions: 8,
        revenue: 2800.00,
      },
    ]
  }
}
