import { IsISO8601, IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class CreateContentPerformanceDto {
  @IsString()
  client_id!: string

  @IsString()
  title!: string

  @IsString()
  content_type!: string

  @IsOptional()
  @IsString()
  channel?: string

  @IsOptional()
  @IsISO8601()
  published_at?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  views?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  engagement_rate?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  leads_attributed?: number

  @IsOptional()
  @IsString()
  url?: string

  @IsOptional()
  @IsString()
  notes?: string
}
