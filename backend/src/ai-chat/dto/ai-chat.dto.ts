import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsOptional, IsString, IsArray } from 'class-validator'

export const aiChatActions = [
  'menu',
  'create_task',
  'update_task_status',
  'read_task',
  'delete_task',
  'ask_approval',
  'give_approval',
  'add_blocker',
  'chat',
] as const

export class AiChatDto {
  @ApiProperty({ enum: aiChatActions })
  @IsIn(aiChatActions)
  action!: (typeof aiChatActions)[number]

  @ApiProperty()
  @IsString()
  message!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workflow_id?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  history?: { role: 'user' | 'model'; parts: { text: string }[] }[]
}
