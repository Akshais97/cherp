import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateString, IsOptional, IsUUID } from 'class-validator'

export class TimeEntryReportQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  client_id?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clientId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  user_id?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  start_date?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  end_date?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string
}
