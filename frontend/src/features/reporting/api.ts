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
  clientId?: string
  channel?: string
  startDate?: string
  endDate?: string
}): Promise<CampaignResult[]> {
  const query = new URLSearchParams()
  if (params?.clientId) query.append('client_id', params.clientId)
  if (params?.channel) query.append('channel', params.channel)
  if (params?.startDate) query.append('start_date', params.startDate)
  if (params?.endDate) query.append('end_date', params.endDate)

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
  clientId?: string
  startDate?: string
  endDate?: string
}): Promise<ChannelBreakdownResponse> {
  const query = new URLSearchParams()
  if (params?.clientId) query.append('client_id', params.clientId)
  if (params?.startDate) query.append('start_date', params.startDate)
  if (params?.endDate) query.append('end_date', params.endDate)

  const queryString = query.toString()
  return apiClient
    .get<ChannelBreakdownResponse>(`/reporting-hub/channel-breakdown${queryString ? `?${queryString}` : ''}`)
    .then((res) => res.data)
}

export async function getContentPerformances(params?: { clientId?: string } | string): Promise<ContentPerformance[]> {
  const clientId = typeof params === 'string' ? params : params?.clientId
  const queryString = clientId ? `?client_id=${clientId}` : ''
  return apiClient
    .get<ContentPerformance[]>(`/reporting-hub/content-performance${queryString}`)
    .then((res) => (Array.isArray(res.data) ? res.data : []))
}

// Aliases for getContentPerformances
export const getContentPerformance = getContentPerformances

export async function createContentPerformance(
  payload: CreateContentPerformancePayload,
): Promise<ContentPerformance> {
  return apiClient
    .post<ContentPerformance>('/reporting-hub/content-performance', payload)
    .then((res) => res.data)
}

// Alias for createContentPerformance
export const createContentPerformanceItem = createContentPerformance

export async function deleteContentPerformance(id: string): Promise<void> {
  return apiClient
    .delete<void>(`/reporting-hub/content-performance/${id}`)
    .then((res) => res.data)
}

// Alias for deleteContentPerformance
export const deleteContentPerformanceItem = deleteContentPerformance

export async function downloadPdfReport(params: { clientId: string; startDate?: string; endDate?: string } | string): Promise<Blob> {
  const query = new URLSearchParams()
  if (typeof params === 'string') {
    query.append('client_id', params)
  } else {
    query.append('client_id', params.clientId)
    if (params.startDate) query.append('startDate', params.startDate)
    if (params.endDate) query.append('endDate', params.endDate)
  }
  return apiClient.getBlob(`/reports/executive-summary/pdf?${query.toString()}`)
}

// Alias for downloadPdfReport
export const exportPdfReport = downloadPdfReport
