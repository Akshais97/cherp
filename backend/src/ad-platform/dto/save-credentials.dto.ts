import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator'

export class SaveAdCredentialsDto {
  @IsString()
  platform!: string // 'google_ads', 'meta_ads', 'linkedin_ads', 'google_ad_manager'

  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean

  // Meta Ads specific
  @IsOptional()
  @IsString()
  app_id?: string

  @IsOptional()
  @IsString()
  app_secret?: string

  @IsOptional()
  @IsString()
  business_manager_id?: string

  @IsOptional()
  @IsString()
  meta_ad_account_id?: string

  // Google & LinkedIn & GAM OAuth specific
  @IsOptional()
  @IsString()
  oauth_client_id?: string

  @IsOptional()
  @IsString()
  oauth_client_secret?: string

  // Google Ads specific
  @IsOptional()
  @IsString()
  google_ads_developer_token?: string

  @IsOptional()
  @IsString()
  google_ads_customer_id?: string

  @IsOptional()
  @IsString()
  google_ads_login_customer_id?: string

  // LinkedIn Ads specific
  @IsOptional()
  @IsString()
  linkedin_sponsored_account_urn?: string

  // Google Ad Manager specific
  @IsOptional()
  @IsString()
  auth_mode?: string // 'OAUTH_WEB' | 'SERVICE_ACCOUNT'

  @IsOptional()
  @IsString()
  gam_network_code?: string

  @IsOptional()
  @IsString()
  application_name?: string

  @IsOptional()
  @IsString()
  service_account_email?: string

  @IsOptional()
  @IsObject()
  service_account_json?: any

  // Generic fallback compatibility
  @IsOptional()
  @IsString()
  client_id?: string

  @IsOptional()
  @IsString()
  client_secret?: string

  @IsOptional()
  @IsString()
  developer_token?: string

  @IsOptional()
  @IsString()
  account_id?: string

  @IsOptional()
  @IsString()
  access_token?: string

  @IsOptional()
  @IsString()
  refresh_token?: string
}
