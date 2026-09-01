import { IsOptional, IsString } from 'class-validator'

export class LinkClientAdAccountDto {
  @IsString()
  client_id!: string

  @IsString()
  platform!: string // 'google_ads', 'meta_ads', 'linkedin_ads', 'google_ad_manager'

  @IsString()
  external_account_id!: string

  @IsString()
  account_name!: string

  @IsOptional()
  @IsString()
  currency?: string
}

export function normalizeExternalAccountId(platform: string, rawAccountId: string): string {
  if (!rawAccountId) return rawAccountId
  const cleaned = rawAccountId.trim()

  if (platform === 'google_ads') {
    // Strip dashes (123-456-7890 -> 1234567890)
    return cleaned.replace(/-/g, '')
  }

  if (platform === 'meta_ads') {
    // Ensure act_ prefix (1015888 -> act_1015888)
    return cleaned.startsWith('act_') ? cleaned : `act_${cleaned}`
  }

  if (platform === 'linkedin_ads') {
    // Ensure URN prefix (50123987 -> urn:li:sponsoredAccount:50123987)
    return cleaned.startsWith('urn:li:sponsoredAccount:')
      ? cleaned
      : `urn:li:sponsoredAccount:${cleaned.replace(/^urn:li:sponsoredAccount:/, '')}`
  }

  return cleaned
}
