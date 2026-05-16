import { ApiProperty } from '@nestjs/swagger'
import { IsString, MinLength } from 'class-validator'

export class ResolveBlockerDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  resolution_notes!: string
}
