import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, IsUrl } from 'class-validator'

export class AddAttachmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  file_name!: string

  @ApiProperty()
  @IsUrl()
  @IsNotEmpty()
  file_url!: string
}
