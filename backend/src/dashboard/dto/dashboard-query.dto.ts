import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator'

const clientStatuses = ['active', 'paused', 'completed', 'archived'] as const

export class DashboardQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  project_manager_id?: string

  @ApiPropertyOptional({ enum: clientStatuses })
  @IsOptional()
  @IsIn(clientStatuses)
  client_status?: (typeof clientStatuses)[number]

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date_from?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date_to?: string

  @ApiPropertyOptional()
  @IsOptional()
  activity_cursor?: string
}
