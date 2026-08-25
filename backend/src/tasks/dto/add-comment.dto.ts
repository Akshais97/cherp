import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator'

export class AddCommentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parent_comment_id?: string

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  mentioned_user_ids?: string[]
}

