import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsObject, IsOptional, IsPositive, IsString } from 'class-validator'

export class CreateScopeTemplateDto {
  @ApiProperty()
  @IsString()
  name!: string

  @ApiProperty()
  @IsString()
  industry!: string

  @ApiProperty()
  @IsString()
  service_type!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty()
  @IsInt()
  @IsPositive()
  duration_months!: number

  @ApiProperty()
  @IsObject()
  default_tasks!: Record<string, unknown>

  @ApiProperty()
  @IsObject()
  kpi_framework!: Record<string, unknown>
}
