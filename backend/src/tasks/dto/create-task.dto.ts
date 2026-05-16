import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'

const priorities = ['high', 'medium', 'low'] as const

export class CreateTaskDto {
  @ApiProperty()
  @IsString()
  title!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

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
  @IsUUID()
  assigned_to?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number
}
