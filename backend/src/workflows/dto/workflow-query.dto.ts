import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsOptional, IsUUID } from 'class-validator'

const workflowStatuses = ['draft', 'active', 'paused', 'completed'] as const

export class WorkflowQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  client_id?: string

  @ApiPropertyOptional({ enum: workflowStatuses })
  @IsOptional()
  @IsIn(workflowStatuses)
  status?: (typeof workflowStatuses)[number]

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  project_manager_id?: string
}
