import { ApiProperty } from '@nestjs/swagger'
import { IsIn } from 'class-validator'

const statuses = ['active', 'paused', 'completed', 'archived'] as const

export class UpdateClientStatusDto {
  @ApiProperty({ enum: statuses })
  @IsIn(statuses)
  status!: (typeof statuses)[number]
}
