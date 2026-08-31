import { apiClient } from '../../lib/api/client'
import type {
  CampaignResult,
  ChannelBreakdownResponse,
  ContentPerformance,
  CreateCampaignResultPayload,
  CreateContentPerformancePayload,
  UpdateCampaignResultPayload,
} from './types'

export async function getCampaignResults(params?: {
  client_id?: string
  channel?: string
  start_date?: string
  end_date?: string
}): Promise<CampaignResult[]> {
  const query = new URLSearchParams()
  if (params?.client_id) query.append('client_id', params.client_id)
  if (params?.channel) query.append('channel', params.channel)
  if (params?.start_date) query.append('start_date', params.start_date)
  if (params?.end_date) query.append('end_date', params.end_date)

  const queryString = query.toString()
  return apiClient
    .get<CampaignResult[]>(`/reporting-hub/campaign-results${queryString ? `?${queryString}` : ''}`)
    .then((res) => (Array.isArray(res.data) ? res.data : []))
}

export async function createCampaignResult(
  payload: CreateCampaignResultPayload,
): Promise<CampaignResult> {
  return apiClient
    .post<CampaignResult>('/reporting-hub/campaign-results', payload)
    .then((res) => res.data)
}

export async function updateCampaignResult(
  id: string,
  payload: UpdateCampaignResultPayload,
): Promise<CampaignResult> {
  return apiClient
    .patch<CampaignResult>(`/reporting-hub/campaign-results/${id}`, payload)
    .then((res) => res.data)
}

export async function deleteCampaignResult(id: string): Promise<void> {
  return apiClient
    .delete<void>(`/reporting-hub/campaign-results/${id}`)
    .then((res) => res.data)
}

export async function getChannelBreakdown(params?: {
  client_id?: string
  start_date?: string
  end_date?: string
}): Promise<ChannelBreakdownResponse> {
  const query = new URLSearchParams()
  if (params?.client_id) query.append('client_id', params.client_id)
  if (params?.start_date) query.append('start_date', params.start_date)
  if (params?.end_date) query.append('end_date', params.end_date)

  const queryString = query.toString()
  return apiClient
    .get<ChannelBreakdownResponse>(`/reporting-hub/channel-breakdown${queryString ? `?${queryString}` : ''}`)
    .then((res) => res.data)
}

export async function getContentPerformances(clientId?: string): Promise<ContentPerformance[]> {
  const queryString = clientId ? `?client_id=${clientId}` : ''
  return apiClient
    .get<ContentPerformance[]>(`/reporting-hub/content-performance${queryString}`)
    .then((res) => (Array.isArray(res.data) ? res.data : []))
}

export async function createContentPerformance(
  payload: CreateContentPerformancePayload,
): Promise<ContentPerformance> {
  return apiClient
    .post<ContentPerformance>('/reporting-hub/content-performance', payload)
    .then((res) => res.data)
}

export async function deleteContentPerformance(id: string): Promise<void> {
  return apiClient
    .delete<void>(`/reporting-hub/content-performance/${id}`)
    .then((res) => res.data)
}

export async function downloadPdfReport(clientId: string): Promise<Blob> {
  return apiClient.getBlob(`/reports/executive-summary/pdf?client_id=${clientId}`)
}
