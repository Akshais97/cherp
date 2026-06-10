import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class ReviewTaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string
}
