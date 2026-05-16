import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  IsDateString,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Min,
} from 'class-validator'

export class UpdateClientDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  industry?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  service_type?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contact_name?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  contact_email?: string

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsPositive()
  contract_duration?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  contract_start?: string

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
}
