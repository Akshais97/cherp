import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator'

const roles = ['super_admin', 'project_manager', 'team_member', 'client'] as const

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  full_name?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatar_url?: string

  @ApiPropertyOptional({ enum: roles })
  @IsOptional()
  @IsIn(roles)
  role?: (typeof roles)[number]

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean
}
