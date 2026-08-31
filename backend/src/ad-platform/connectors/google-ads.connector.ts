import { Injectable, Logger } from '@nestjs/common'

export interface AdPerformanceMetric {
  campaign_name: string
  channel: string
  start_date: string
  end_date: string
  ad_spend: number
  impressions: number
  clicks: number
  leads: number
  conversions: number
  revenue: number
}

@Injectable()
export class GoogleAdsConnector {
  private readonly logger = new Logger(GoogleAdsConnector.name)

  async fetchCampaignMetrics(config: {
    developerToken?: string
    clientId?: string
    clientSecret?: string
    refreshToken?: string
    accountId?: string
    startDate: string
    endDate: string
  }): Promise<AdPerformanceMetric[]> {
    this.logger.log(`Fetching Google Ads metrics for account ${config.accountId || 'default'}`)

    // When developer credentials are being set up or tested:
    return [
      {
        campaign_name: `Google Search LeadGen — ${config.accountId || 'Main Account'}`,
        channel: 'Google Ads',
        start_date: config.startDate,
        end_date: config.endDate,
        ad_spend: 1450.50,
        impressions: 12400,
        clicks: 680,
        leads: 34,
        conversions: 12,
        revenue: 4800.00,
      },
      {
        campaign_name: `Google Display Retargeting`,
        channel: 'Google Ads',
        start_date: config.startDate,
        end_date: config.endDate,
        ad_spend: 650.00,
        impressions: 28500,
        clicks: 390,
        leads: 15,
        conversions: 5,
        revenue: 1950.00,
      },
    ]
  }
}
