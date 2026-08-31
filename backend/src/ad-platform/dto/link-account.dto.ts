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
