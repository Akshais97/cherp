import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'

export class ResolveScopeTemplateDto {
  @ApiProperty()
  @IsString()
  industry!: string

  @ApiProperty()
  @IsString()
  service_type!: string
}
