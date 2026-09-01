export type CampaignResult = {
  id: string
  tenant_id: string
  client_id: string
  campaign_name: string
  channel: string
  start_date: string
  end_date: string
  ad_spend?: number | null
  impressions?: number | null
  clicks?: number | null
  leads?: number | null
  conversions?: number | null
  revenue?: number | null
  cpl?: number | null
  roas?: number | null
  notes?: string | null
  created_at: string
  client?: {
    id: string
    name: string
  }
}

export type CreateCampaignResultPayload = {
  client_id: string
  campaign_name: string
  channel: string
  start_date: string
  end_date: string
  ad_spend?: number
  impressions?: number
  clicks?: number
  leads?: number
  conversions?: number
  revenue?: number
  roas?: number
  notes?: string
}

export type UpdateCampaignResultPayload = Partial<CreateCampaignResultPayload>

export type ChannelSummary = {
  channel: string
  ad_spend: number
  impressions: number
  clicks: number
  leads: number
  conversions: number
  revenue: number
  cpl: number | null
  roas: number | null
  count: number
}

export type ChannelBreakdownResponse = {
  channels: ChannelSummary[]
  totals: {
    ad_spend: number
    impressions: number
    clicks: number
    leads: number
    conversions: number
    revenue: number
    cpl: number | null
    roas: number | null
  }
}

export type ContentPerformance = {
  id: string
  tenant_id: string
  client_id: string
  title: string
  content_type: string
  channel?: string | null
  published_at?: string | null
  views?: number | null
  engagement_rate?: number | null
  leads_attributed?: number | null
  url?: string | null
  notes?: string | null
  created_at: string
  client?: {
    id: string
    name: string
  }
}

export type CreateContentPerformancePayload = {
  client_id: string
  title: string
  content_type: string
  channel?: string
  published_at?: string
  views?: number
  engagement_rate?: number
  leads_attributed?: number
  url?: string
  notes?: string
}
