import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '../../prisma/prisma.service'
import { GoogleAdsConnector } from '../connectors/google-ads.connector'
import { MetaAdsConnector } from '../connectors/meta-ads.connector'
import { LinkedInAdsConnector } from '../connectors/linkedin-ads.connector'
import { GoogleAdManagerConnector } from '../connectors/google-ad-manager.connector'
import { decryptSecret } from '../../common/utils/crypto.util'

@Injectable()
export class AdSyncCronJob {
  private readonly logger = new Logger(AdSyncCronJob.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleAdsConnector: GoogleAdsConnector,
    private readonly metaAdsConnector: MetaAdsConnector,
    private readonly linkedInAdsConnector: LinkedInAdsConnector,
    private readonly gamConnector: GoogleAdManagerConnector,
  ) {}

  // Run daily at 02:00 AM
  @Cron('0 2 * * *')
  async handleDailySync() {
    this.logger.log('Starting Automated Ad Platform Daily Ingestion Job...')

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const activeLinks = await this.prisma.clientAdAccount.findMany({
      where: { is_active: true },
    })

    this.logger.log(`Found ${activeLinks.length} active client ad account linkages.`)

    for (const link of activeLinks) {
      try {
        const integration = await this.prisma.tenantAdIntegration.findUnique({
          where: {
            tenant_id_platform: { tenant_id: link.tenant_id, platform: link.platform },
          },
        })

        if (!integration || !integration.is_enabled) continue

        const decryptedDevToken = integration.developer_token ? decryptSecret(integration.developer_token) : undefined
        const decryptedAccess = integration.access_token ? decryptSecret(integration.access_token) : undefined

        let metrics: any[] = []
        if (link.platform === 'google_ads') {
          metrics = await this.googleAdsConnector.fetchCampaignMetrics({
            developerToken: decryptedDevToken,
            accountId: link.external_account_id,
            startDate: yesterday,
            endDate: yesterday,
          })
        } else if (link.platform === 'meta_ads') {
          metrics = await this.metaAdsConnector.fetchCampaignMetrics({
            accessToken: decryptedAccess,
            accountId: link.external_account_id,
            startDate: yesterday,
            endDate: yesterday,
          })
        } else if (link.platform === 'linkedin_ads') {
          metrics = await this.linkedInAdsConnector.fetchCampaignMetrics({
            accessToken: decryptedAccess,
            accountId: link.external_account_id,
            startDate: yesterday,
            endDate: yesterday,
          })
        } else if (link.platform === 'google_ad_manager') {
          metrics = await this.gamConnector.fetchCampaignMetrics({
            serviceAccountJson: integration.service_account_json,
            networkCode: link.external_account_id,
            startDate: yesterday,
            endDate: yesterday,
          })
        }

        const defaultAdmin = await this.prisma.user.findFirst({
          where: { tenant_id: link.tenant_id, role: { name: 'super_admin' } },
        })
        const createdById = defaultAdmin?.id || '00000000-0000-0000-0000-000000000000'

        for (const m of metrics) {
          const cpl = m.leads > 0 && m.ad_spend > 0 ? m.ad_spend / m.leads : null
          const roas = m.ad_spend > 0 && m.revenue > 0 ? m.revenue / m.ad_spend : null

          await this.prisma.campaignResult.create({
            data: {
              tenant_id: link.tenant_id,
              client_id: link.client_id,
              campaign_name: m.campaign_name,
              channel: m.channel,
              start_date: new Date(m.start_date),
              end_date: new Date(m.end_date),
              ad_spend: m.ad_spend,
              impressions: m.impressions,
              clicks: m.clicks,
              leads: m.leads,
              conversions: m.conversions,
              revenue: m.revenue,
              cpl: cpl ?? undefined,
              roas: roas ?? undefined,
              notes: `Automated daily sync via ${link.platform}`,
              created_by: createdById,
            },
          })
        }

        await this.prisma.adSyncLog.create({
          data: {
            tenant_id: link.tenant_id,
            platform: link.platform,
            account_id: link.external_account_id,
            sync_type: 'scheduled_daily',
            status: 'success',
            records_synced: metrics.length,
            started_at: new Date(),
            completed_at: new Date(),
          },
        })
      } catch (err: any) {
        this.logger.error(`Error syncing ad platform ${link.platform} for account ${link.external_account_id}: ${err.message}`)
        await this.prisma.adSyncLog.create({
          data: {
            tenant_id: link.tenant_id,
            platform: link.platform,
            account_id: link.external_account_id,
            sync_type: 'scheduled_daily',
            status: 'failed',
            records_synced: 0,
            error_message: err.message,
            started_at: new Date(),
            completed_at: new Date(),
          },
        })
      }
    }
  }
}
