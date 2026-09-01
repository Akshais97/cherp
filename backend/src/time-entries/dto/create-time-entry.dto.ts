import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'

export class CreateTimeEntryDto {
  @ApiProperty()
  @IsNumber()
  @Min(0.25)
  @Max(24)
  hours!: number

  @ApiProperty()
  @IsDateString()
  date!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_billable?: boolean
}
