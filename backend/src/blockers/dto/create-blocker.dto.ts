import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator'

const blockerSeverities = ['high', 'medium', 'low'] as const

export class CreateBlockerDto {
  @ApiProperty()
  @IsUUID()
  task_id!: string

  @ApiProperty()
  @IsString()
  @MinLength(2)
  title!: string

  @ApiProperty()
  @IsString()
  @MinLength(2)
  description!: string

  @ApiProperty({ enum: blockerSeverities })
  @IsIn(blockerSeverities)
  severity!: (typeof blockerSeverities)[number]

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  impact?: string
}
