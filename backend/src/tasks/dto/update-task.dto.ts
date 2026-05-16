import { ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'

const statuses = ['pending', 'in_progress', 'blocked', 'completed'] as const
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

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  assigned_to?: string | null

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number
}
