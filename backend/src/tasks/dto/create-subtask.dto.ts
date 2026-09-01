import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator'

export class CreateSubtaskDto {
  @ApiProperty()
  @IsString()
  title!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigned_to?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  due_date?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.25)
  estimated_hours?: number
}
