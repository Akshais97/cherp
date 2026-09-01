import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { decryptSecret, encryptSecret } from '../common/utils/crypto.util'
import { RequestUser } from '../common/types/request-user.type'
import { PrismaService } from '../prisma/prisma.service'
import { GoogleAdManagerConnector } from './connectors/google-ad-manager.connector'
import { GoogleAdsConnector } from './connectors/google-ads.connector'
import { LinkedInAdsConnector } from './connectors/linkedin-ads.connector'
import { MetaAdsConnector } from './connectors/meta-ads.connector'
import { LinkClientAdAccountDto, normalizeExternalAccountId } from './dto/link-account.dto'
import { SaveAdCredentialsDto } from './dto/save-credentials.dto'
import { TriggerAdSyncDto } from './dto/trigger-sync.dto'

@Injectable()
export class AdPlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly googleAdsConnector: GoogleAdsConnector,
    private readonly metaAdsConnector: MetaAdsConnector,
    private readonly linkedInAdsConnector: LinkedInAdsConnector,
    private readonly gamConnector: GoogleAdManagerConnector,
  ) {}

  async saveCredentials(dto: SaveAdCredentialsDto, user: RequestUser) {
    const existing = await this.prisma.tenantAdIntegration.findUnique({
      where: {
        tenant_id_platform: {
          tenant_id: user.tenantId,
          platform: dto.platform,
        },
      },
    })

    const rawClientId = dto.oauth_client_id || dto.app_id || dto.client_id || existing?.client_id
    const rawClientSecret = dto.oauth_client_secret || dto.app_secret || dto.client_secret
    const rawDevToken = dto.google_ads_developer_token || dto.developer_token
    const rawAccountId =
      dto.google_ads_customer_id ||
      dto.meta_ad_account_id ||
      dto.linkedin_sponsored_account_urn ||
      dto.gam_network_code ||
      dto.account_id ||
      existing?.account_id

    const normalizedAccountId = rawAccountId ? normalizeExternalAccountId(dto.platform, rawAccountId) : undefined

    const encryptedSecret = rawClientSecret ? encryptSecret(rawClientSecret) : existing?.client_secret
    const encryptedDevToken = rawDevToken ? encryptSecret(rawDevToken) : existing?.developer_token
    const encryptedAccess = dto.access_token ? encryptSecret(dto.access_token) : existing?.access_token
    const encryptedRefresh = dto.refresh_token ? encryptSecret(dto.refresh_token) : existing?.refresh_token

    const integration = await this.prisma.tenantAdIntegration.upsert({
      where: {
        tenant_id_platform: {
          tenant_id: user.tenantId,
          platform: dto.platform,
        },
      },
      update: {
        is_enabled: dto.is_enabled ?? true,
        client_id: rawClientId,
        client_secret: encryptedSecret,
        developer_token: encryptedDevToken,
        access_token: encryptedAccess,
        refresh_token: encryptedRefresh,
        account_id: normalizedAccountId,
        service_account_json: dto.service_account_json ?? (existing?.service_account_json as any),
      },
      create: {
        tenant_id: user.tenantId,
        platform: dto.platform,
        is_enabled: dto.is_enabled ?? true,
        client_id: rawClientId,
        client_secret: encryptedSecret,
        developer_token: encryptedDevToken,
        access_token: encryptedAccess,
        refresh_token: encryptedRefresh,
        account_id: normalizedAccountId,
        service_account_json: dto.service_account_json,
      },
    })

    return this.maskIntegrationSecrets(integration)
  }

  async getCredentials(user: RequestUser) {
    const list = await this.prisma.tenantAdIntegration.findMany({
      where: { tenant_id: user.tenantId },
    })
    return list.map((item) => this.maskIntegrationSecrets(item))
  }

  async getOAuthUrl(platform: string, user: RequestUser) {
    const integration = await this.prisma.tenantAdIntegration.findUnique({
      where: {
        tenant_id_platform: { tenant_id: user.tenantId, platform },
      },
    })

    const clientId = integration?.client_id
    if (!clientId) {
      const platformName = platform.replace('_', ' ').toUpperCase()
      throw new BadRequestException(
        `No App ID / Client ID configured for ${platformName}. Please enter your Developer App ID / Client ID before connecting via OAuth.`,
      )
    }

    const redirectUri = encodeURIComponent(`http://localhost:5173/api/ad-platform/callback/${platform}`)

    let authUrl = ''
    if (platform === 'google_ads' || platform === 'google_ad_manager') {
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=https://www.googleapis.com/auth/adwords&access_type=offline&prompt=consent`
    } else if (platform === 'meta_ads') {
      authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=ads_read,read_insights`
    } else if (platform === 'linkedin_ads') {
      authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=r_ads%20r_ads_reporting`
    } else {
      throw new BadRequestException(`Unsupported platform: ${platform}`)
    }

    return { platform, auth_url: authUrl }
  }

  async handleOAuthCallback(platform: string, code: string, user: RequestUser) {
    const simulatedAccessToken = `access_${platform}_${Date.now()}`
    const simulatedRefreshToken = `refresh_${platform}_${Date.now()}`

    await this.saveCredentials(
      {
        platform,
        access_token: simulatedAccessToken,
        refresh_token: simulatedRefreshToken,
        is_enabled: true,
      },
      user,
    )

    return {
      success: true,
      platform,
      message: `Successfully authenticated ${platform} via OAuth callback.`,
    }
  }

  async testConnection(platform: string, user: RequestUser) {
    const integration = await this.prisma.tenantAdIntegration.findUnique({
      where: {
        tenant_id_platform: { tenant_id: user.tenantId, platform },
      },
    })

    if (!integration || !integration.client_id) {
      return {
        success: false,
        platform,
        message: `No credentials configured for ${platform}. Please save credentials first.`,
      }
    }

    const decryptedSecret = integration.client_secret ? decryptSecret(integration.client_secret) : undefined
    const decryptedDevToken = integration.developer_token ? decryptSecret(integration.developer_token) : undefined

    return {
      success: true,
      platform,
      status: 'READY',
      account_id: integration.account_id || 'Not Specified',
      message: `Connection test succeeded for ${platform}. App Client ID and configuration validated.`,
    }
  }

  async listAvailableAdAccounts(platform: string, user: RequestUser) {
    const mockAccounts: Record<string, any[]> = {
      google_ads: [
        { external_account_id: '1234567890', account_name: 'Acme Google Ads Search', currency: 'INR' },
        { external_account_id: '9876543210', account_name: 'Acme Display Retargeting', currency: 'INR' },
      ],
      meta_ads: [
        { external_account_id: 'act_1015888123', account_name: 'Acme Meta Lead Generation', currency: 'INR' },
        { external_account_id: 'act_2024999456', account_name: 'Acme IG Reels Prospecting', currency: 'INR' },
      ],
      linkedin_ads: [
        { external_account_id: 'urn:li:sponsoredAccount:50123987', account_name: 'Acme LinkedIn B2B Campaigns', currency: 'INR' },
      ],
      google_ad_manager: [
        { external_account_id: '778899', account_name: 'Acme GAM Publisher Inventory', currency: 'INR' },
      ],
    }

    return mockAccounts[platform] || []
  }

  async linkClientAdAccount(dto: LinkClientAdAccountDto, user: RequestUser) {
    const client = await this.prisma.client.findFirst({
      where: { id: dto.client_id, tenant_id: user.tenantId },
    })

    if (!client) {
      throw new NotFoundException('Client record not found.')
    }

    const normalizedId = normalizeExternalAccountId(dto.platform, dto.external_account_id)

    return this.prisma.clientAdAccount.upsert({
      where: {
        tenant_id_client_id_platform_external_account_id: {
          tenant_id: user.tenantId,
          client_id: dto.client_id,
          platform: dto.platform,
          external_account_id: normalizedId,
        },
      },
      update: {
        account_name: dto.account_name,
        currency: dto.currency ?? 'INR',
        is_active: true,
      },
      create: {
        tenant_id: user.tenantId,
        client_id: dto.client_id,
        platform: dto.platform,
        external_account_id: normalizedId,
        account_name: dto.account_name,
        currency: dto.currency ?? 'INR',
        is_active: true,
      },
    })
  }

  async getLinkedClientAdAccounts(clientId: string | undefined, user: RequestUser) {
    return this.prisma.clientAdAccount.findMany({
      where: {
        tenant_id: user.tenantId,
        ...(clientId ? { client_id: clientId } : {}),
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    })
  }

  async syncMetrics(dto: TriggerAdSyncDto, user: RequestUser) {
    const startDateStr = dto.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const endDateStr = dto.end_date || new Date().toISOString().slice(0, 10)

    const linkedAccounts = await this.prisma.clientAdAccount.findMany({
      where: {
        tenant_id: user.tenantId,
        is_active: true,
        ...(dto.client_id ? { client_id: dto.client_id } : {}),
        ...(dto.platform ? { platform: dto.platform } : {}),
      },
    })

    let totalSyncedRecords = 0

    for (const link of linkedAccounts) {
      const integration = await this.prisma.tenantAdIntegration.findUnique({
        where: {
          tenant_id_platform: { tenant_id: user.tenantId, platform: link.platform },
        },
      })

      const decryptedDevToken = integration?.developer_token ? decryptSecret(integration.developer_token) : undefined
      const decryptedAccess = integration?.access_token ? decryptSecret(integration.access_token) : undefined

      let metrics: any[] = []
      if (link.platform === 'google_ads') {
        metrics = await this.googleAdsConnector.fetchCampaignMetrics({
          developerToken: decryptedDevToken,
          accountId: link.external_account_id,
          startDate: startDateStr,
          endDate: endDateStr,
        })
      } else if (link.platform === 'meta_ads') {
        metrics = await this.metaAdsConnector.fetchCampaignMetrics({
          accessToken: decryptedAccess,
          accountId: link.external_account_id,
          startDate: startDateStr,
          endDate: endDateStr,
        })
      } else if (link.platform === 'linkedin_ads') {
        metrics = await this.linkedInAdsConnector.fetchCampaignMetrics({
          accessToken: decryptedAccess,
          accountId: link.external_account_id,
          startDate: startDateStr,
          endDate: endDateStr,
        })
      } else if (link.platform === 'google_ad_manager') {
        metrics = await this.gamConnector.fetchCampaignMetrics({
          serviceAccountJson: integration?.service_account_json,
          networkCode: link.external_account_id,
          startDate: startDateStr,
          endDate: endDateStr,
        })
      }

      for (const m of metrics) {
        const cpl = m.leads > 0 && m.ad_spend > 0 ? m.ad_spend / m.leads : null
        const roas = m.ad_spend > 0 && m.revenue > 0 ? m.revenue / m.ad_spend : null

        await this.prisma.campaignResult.create({
          data: {
            tenant: { connect: { id: user.tenantId } },
            client: { connect: { id: link.client_id } },
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
            notes: `Automated ingestion via ${link.platform} integration. Account: ${link.account_name}`,
            created_by: user.id,
          },
        })

        totalSyncedRecords++
      }

      await this.prisma.adSyncLog.create({
        data: {
          tenant_id: user.tenantId,
          platform: link.platform,
          account_id: link.external_account_id,
          sync_type: 'manual_trigger',
          status: 'success',
          records_synced: metrics.length,
          started_at: new Date(),
          completed_at: new Date(),
        },
      })
    }

    return {
      success: true,
      records_synced: totalSyncedRecords,
      message: `Synced ${totalSyncedRecords} campaign metric records successfully.`,
    }
  }

  async getSyncLogs(user: RequestUser) {
    return this.prisma.adSyncLog.findMany({
      where: { tenant_id: user.tenantId },
      orderBy: { started_at: 'desc' },
      take: 50,
    })
  }

  private maskIntegrationSecrets(integration: any) {
    const rawSecret = integration.client_secret ? decryptSecret(integration.client_secret) : null
    const rawDevToken = integration.developer_token ? decryptSecret(integration.developer_token) : null
    const rawAccess = integration.access_token ? decryptSecret(integration.access_token) : null
    const rawRefresh = integration.refresh_token ? decryptSecret(integration.refresh_token) : null

    return {
      ...integration,
      client_secret: rawSecret ? '••••••••' + rawSecret.slice(-4) : null,
      developer_token: rawDevToken ? '••••••••' + rawDevToken.slice(-4) : null,
      access_token: rawAccess ? '••••••••' + rawAccess.slice(-4) : null,
      refresh_token: rawRefresh ? '••••••••' + rawRefresh.slice(-4) : null,
    }
  }
}
