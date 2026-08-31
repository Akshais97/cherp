import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator'

export class SaveAdCredentialsDto {
  @IsString()
  platform!: string // 'google_ads', 'meta_ads', 'linkedin_ads', 'google_ad_manager'

  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean

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
  access_token?: string

  @IsOptional()
  @IsString()
  refresh_token?: string

  @IsOptional()
  @IsString()
  account_id?: string

  @IsOptional()
  @IsObject()
  service_account_json?: any
}
