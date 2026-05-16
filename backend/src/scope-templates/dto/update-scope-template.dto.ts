import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsObject, IsOptional, IsPositive, IsString } from 'class-validator'

export class UpdateScopeTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  industry?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  service_type?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsPositive()
  duration_months?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  default_tasks?: Record<string, unknown>

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  kpi_framework?: Record<string, unknown>
}
