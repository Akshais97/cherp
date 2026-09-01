import { IsISO8601, IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class CreateCampaignResultDto {
  @IsString()
  client_id!: string

  @IsString()
  campaign_name!: string

  @IsString()
  channel!: string

  @IsISO8601()
  start_date!: string

  @IsISO8601()
  end_date!: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  ad_spend?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  impressions?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  clicks?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  leads?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  conversions?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  revenue?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  roas?: number

  @IsOptional()
  @IsString()
  notes?: string
}
