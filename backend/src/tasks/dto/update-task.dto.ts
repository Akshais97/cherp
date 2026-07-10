import { ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator'

const statuses = [
  'yet_to_start',
  'ongoing',
  'blocked',
  'completed',
  'task_approved_by_manager',
  'rework',
  'task_approved_by_client',
] as const
const priorities = ['high', 'medium', 'low'] as const

export class UpdateTaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ enum: statuses })
  @IsOptional()
  @IsIn(statuses)
  status?: (typeof statuses)[number]

  @ApiPropertyOptional({ enum: priorities })
  @IsOptional()
  @IsIn(priorities)
  priority?: (typeof priorities)[number]

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  due_date?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_daily?: boolean

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((o, v) => v !== null)
  @IsUUID()
  assigned_to?: string | null

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string

  @ApiPropertyOptional()
  @IsOptional()
  checklist?: any

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  slot?: string | null

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((o, v) => v !== null)
  @IsUUID()
  client_id?: string | null

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((o, v) => v !== null)
  @IsDateString()
  start_date?: string | null

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsString({ each: true })
  labels?: string[]

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((o, v) => v !== null)
  @IsUUID()
  recurrence_series_id?: string | null

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((o, v) => v !== null)
  @IsString()
  recurrence_rule?: string | null

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((o, v) => v !== null)
  @IsDateString()
  recurrence_end_date?: string | null

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((o, v) => v !== null)
  @IsString()
  recurrence_type?: string | null
}
