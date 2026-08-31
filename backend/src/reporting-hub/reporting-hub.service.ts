import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { RequestUser } from '../common/types/request-user.type'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCampaignResultDto } from './dto/create-campaign-result.dto'
import { CreateContentPerformanceDto } from './dto/create-content-performance.dto'
import { UpdateCampaignResultDto } from './dto/update-campaign-result.dto'

export type CampaignResultFilterQuery = {
  client_id?: string
  channel?: string
  start_date?: string
  end_date?: string
}

@Injectable()
export class ReportingHubService {
  constructor(private readonly prisma: PrismaService) {}

  async createCampaignResult(dto: CreateCampaignResultDto, user: RequestUser) {
    const startDate = new Date(dto.start_date)
    const endDate = new Date(dto.end_date)

    if (endDate < startDate) {
      throw new BadRequestException('end_date cannot be earlier than start_date.')
    }

    const adSpend = dto.ad_spend ?? 0
    const leads = dto.leads ?? 0
    const revenue = dto.revenue ?? 0

    const computedCpl = leads > 0 && adSpend > 0 ? adSpend / leads : null
    const computedRoas = dto.roas ?? (adSpend > 0 && revenue > 0 ? revenue / adSpend : null)

    const result = await this.prisma.campaignResult.create({
      data: {
        tenant: { connect: { id: user.tenantId } },
        client: { connect: { id: dto.client_id } },
        campaign_name: dto.campaign_name,
        channel: dto.channel,
        start_date: startDate,
        end_date: endDate,
        ad_spend: dto.ad_spend ?? undefined,
        impressions: dto.impressions ?? 0,
        clicks: dto.clicks ?? 0,
        leads: dto.leads ?? 0,
        conversions: dto.conversions ?? 0,
        revenue: dto.revenue ?? undefined,
        cpl: computedCpl ?? undefined,
        roas: computedRoas ?? undefined,
        notes: dto.notes,
        created_by: user.id,
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    })

    if (this.prisma.activityLog) {
      await this.prisma.activityLog.create({
        data: {
          tenant_id: user.tenantId,
          user_id: user.id,
          action_type: 'created',
          entity_type: 'campaign_result',
          entity_id: result.id,
          after_values: {
            campaign_name: result.campaign_name,
            channel: result.channel,
            ad_spend: result.ad_spend,
            leads: result.leads,
          },
        },
      })
    }

    return result
  }

  async listCampaignResults(query: CampaignResultFilterQuery, user: RequestUser) {
    const where: any = { tenant_id: user.tenantId }

    if (query.client_id) {
      where.client_id = query.client_id
    }
    if (query.channel) {
      where.channel = query.channel
    }
    if (query.start_date || query.end_date) {
      where.start_date = {}
      if (query.start_date) where.start_date.gte = new Date(query.start_date)
      if (query.end_date) where.start_date.lte = new Date(query.end_date)
    }

    return this.prisma.campaignResult.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
      },
      orderBy: { start_date: 'desc' },
    })
  }

  async updateCampaignResult(id: string, dto: UpdateCampaignResultDto, user: RequestUser) {
    const existing = await this.prisma.campaignResult.findFirst({
      where: { id, tenant_id: user.tenantId },
    })

    if (!existing) {
      throw new NotFoundException('Campaign result not found.')
    }

    const startDate = dto.start_date ? new Date(dto.start_date) : existing.start_date
    const endDate = dto.end_date ? new Date(dto.end_date) : existing.end_date

    if (endDate < startDate) {
      throw new BadRequestException('end_date cannot be earlier than start_date.')
    }

    const adSpend = dto.ad_spend !== undefined ? dto.ad_spend : Number(existing.ad_spend ?? 0)
    const leads = dto.leads !== undefined ? dto.leads : (existing.leads ?? 0)
    const revenue = dto.revenue !== undefined ? dto.revenue : Number(existing.revenue ?? 0)

    const computedCpl = leads > 0 && adSpend > 0 ? adSpend / leads : null
    const computedRoas = dto.roas !== undefined ? dto.roas : (adSpend > 0 && revenue > 0 ? revenue / adSpend : existing.roas ? Number(existing.roas) : null)

    const updated = await this.prisma.campaignResult.update({
      where: { id },
      data: {
        ...(dto.campaign_name !== undefined ? { campaign_name: dto.campaign_name } : {}),
        ...(dto.channel !== undefined ? { channel: dto.channel } : {}),
        ...(dto.start_date !== undefined ? { start_date: startDate } : {}),
        ...(dto.end_date !== undefined ? { end_date: endDate } : {}),
        ...(dto.ad_spend !== undefined ? { ad_spend: dto.ad_spend } : {}),
        ...(dto.impressions !== undefined ? { impressions: dto.impressions } : {}),
        ...(dto.clicks !== undefined ? { clicks: dto.clicks } : {}),
        ...(dto.leads !== undefined ? { leads: dto.leads } : {}),
        ...(dto.conversions !== undefined ? { conversions: dto.conversions } : {}),
        ...(dto.revenue !== undefined ? { revenue: dto.revenue } : {}),
        cpl: computedCpl ?? undefined,
        roas: computedRoas ?? undefined,
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    })

    if (this.prisma.activityLog) {
      await this.prisma.activityLog.create({
        data: {
          tenant_id: user.tenantId,
          user_id: user.id,
          action_type: 'updated',
          entity_type: 'campaign_result',
          entity_id: updated.id,
          before_values: {
            campaign_name: existing.campaign_name,
            channel: existing.channel,
            ad_spend: existing.ad_spend,
          },
          after_values: {
            campaign_name: updated.campaign_name,
            channel: updated.channel,
            ad_spend: updated.ad_spend,
          },
        },
      })
    }

    return updated
  }

  async deleteCampaignResult(id: string, user: RequestUser) {
    const existing = await this.prisma.campaignResult.findFirst({
      where: { id, tenant_id: user.tenantId },
    })
    if (!existing) {
      throw new NotFoundException('Campaign result not found.')
    }

    const deleted = await this.prisma.campaignResult.delete({ where: { id } })

    if (this.prisma.activityLog) {
      await this.prisma.activityLog.create({
        data: {
          tenant_id: user.tenantId,
          user_id: user.id,
          action_type: 'deleted',
          entity_type: 'campaign_result',
          entity_id: id,
          before_values: {
            campaign_name: existing.campaign_name,
            channel: existing.channel,
          },
        },
      })
    }

    return deleted
  }

  async getChannelBreakdown(query: CampaignResultFilterQuery, user: RequestUser) {
    const results = await this.listCampaignResults(query, user)

    const defaultChannels = ['Google Ads', 'Meta', 'LinkedIn', 'Organic', 'Email']
    const channelMap: Record<string, {
      channel: string
      ad_spend: number
      impressions: number
      clicks: number
      leads: number
      conversions: number
      revenue: number
      count: number
    }> = {}

    for (const ch of defaultChannels) {
      channelMap[ch] = {
        channel: ch,
        ad_spend: 0,
        impressions: 0,
        clicks: 0,
        leads: 0,
        conversions: 0,
        revenue: 0,
        count: 0,
      }
    }

    for (const item of results) {
      const ch = item.channel || 'Other'
      if (!channelMap[ch]) {
        channelMap[ch] = {
          channel: ch,
          ad_spend: 0,
          impressions: 0,
          clicks: 0,
          leads: 0,
          conversions: 0,
          revenue: 0,
          count: 0,
        }
      }
      channelMap[ch].ad_spend += Number(item.ad_spend ?? 0)
      channelMap[ch].impressions += item.impressions ?? 0
      channelMap[ch].clicks += item.clicks ?? 0
      channelMap[ch].leads += item.leads ?? 0
      channelMap[ch].conversions += item.conversions ?? 0
      channelMap[ch].revenue += Number(item.revenue ?? 0)
      channelMap[ch].count += 1
    }

    const channels = Object.values(channelMap).map((c) => {
      const cpl = c.leads > 0 && c.ad_spend > 0 ? c.ad_spend / c.leads : null
      const roas = c.ad_spend > 0 && c.revenue > 0 ? c.revenue / c.ad_spend : null
      return {
        ...c,
        cpl,
        roas,
      }
    })

    const totals = channels.reduce(
      (acc, curr) => ({
        ad_spend: acc.ad_spend + curr.ad_spend,
        impressions: acc.impressions + curr.impressions,
        clicks: acc.clicks + curr.clicks,
        leads: acc.leads + curr.leads,
        conversions: acc.conversions + curr.conversions,
        revenue: acc.revenue + curr.revenue,
      }),
      { ad_spend: 0, impressions: 0, clicks: 0, leads: 0, conversions: 0, revenue: 0 },
    )

    const totalCpl = totals.leads > 0 && totals.ad_spend > 0 ? totals.ad_spend / totals.leads : null
    const totalRoas = totals.ad_spend > 0 && totals.revenue > 0 ? totals.revenue / totals.ad_spend : null

    return {
      channels,
      totals: {
        ...totals,
        cpl: totalCpl,
        roas: totalRoas,
      },
    }
  }

  async createContentPerformance(dto: CreateContentPerformanceDto, user: RequestUser) {
    return this.prisma.contentPerformance.create({
      data: {
        tenant: { connect: { id: user.tenantId } },
        client: { connect: { id: dto.client_id } },
        title: dto.title,
        content_type: dto.content_type,
        channel: dto.channel,
        published_at: dto.published_at ? new Date(dto.published_at) : undefined,
        views: dto.views,
        engagement_rate: dto.engagement_rate ? dto.engagement_rate : undefined,
        leads_attributed: dto.leads_attributed,
        url: dto.url,
        notes: dto.notes,
        created_by: user.id,
      },
    })
  }

  async listContentPerformances(clientId: string | undefined, user: RequestUser) {
    return this.prisma.contentPerformance.findMany({
      where: {
        tenant_id: user.tenantId,
        ...(clientId ? { client_id: clientId } : {}),
      },
      include: {
        client: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    })
  }

  async deleteContentPerformance(id: string, user: RequestUser) {
    const existing = await this.prisma.contentPerformance.findFirst({
      where: { id, tenant_id: user.tenantId },
    })
    if (!existing) {
      throw new NotFoundException('Content performance record not found.')
    }
    return this.prisma.contentPerformance.delete({ where: { id } })
  }
}
