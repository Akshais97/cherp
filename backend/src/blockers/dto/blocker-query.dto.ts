import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsOptional, IsUUID } from 'class-validator'

const blockerStatuses = ['open', 'resolved'] as const
const blockerSeverities = ['high', 'medium', 'low'] as const

export class BlockerQueryDto {
  @ApiPropertyOptional({ enum: blockerStatuses })
  @IsOptional()
  @IsIn(blockerStatuses)
  status?: (typeof blockerStatuses)[number]

  @ApiPropertyOptional({ enum: blockerSeverities })
  @IsOptional()
  @IsIn(blockerSeverities)
  severity?: (typeof blockerSeverities)[number]

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  client_id?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  task_id?: string
}
