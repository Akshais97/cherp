import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator'

const roles = ['super_admin', 'project_manager', 'team_member', 'client'] as const

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email!: string

  @ApiProperty()
  @IsString()
  @MinLength(2)
  full_name!: string

  @ApiProperty({ enum: roles })
  @IsIn(roles)
  role!: (typeof roles)[number]

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/, { message: 'password must include one uppercase letter' })
  @Matches(/[0-9]/, { message: 'password must include one number' })
  password!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatar_url?: string
}
