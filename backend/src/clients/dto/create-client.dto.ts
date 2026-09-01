import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  Allow,
  IsDateString,
  IsEmail,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator'

export class CreateClientDto {
  @ApiProperty()
  @IsString()
  name!: string

  @ApiProperty()
  @IsString()
  industry!: string

  @ApiProperty()
  @IsString()
  service_type!: string

  @ApiProperty({ description: 'Primary contact person name' })
  @IsString()
  contact_name!: string

  @ApiProperty({ description: 'Primary contact person email' })
  @IsEmail()
  contact_email!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contact_phone?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthly_retainer?: number

  @ApiProperty()
  @IsString()
  currency!: string

  @ApiProperty()
  @IsInt()
  @IsPositive()
  contract_duration!: number

  @ApiProperty()
  @IsDateString()
  contract_start!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payment_terms?: string

  @ApiPropertyOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  renewal_date?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  retainer_hours?: number

  @ApiProperty()
  @IsUUID()
  scope_template_id!: string

  @ApiPropertyOptional({
    description: 'Map of team category/role name to array of assigned user IDs',
    example: { 'Graphic Designer': ['uuid-1', 'uuid-2'] },
  })
  @IsOptional()
  @IsObject()
  team_assignments?: Record<string, string[]>
}
