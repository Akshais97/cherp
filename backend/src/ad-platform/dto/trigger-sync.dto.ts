import { IsOptional, IsString } from 'class-validator'

export class TriggerAdSyncDto {
  @IsOptional()
  @IsString()
  client_id?: string

  @IsOptional()
  @IsString()
  platform?: string

  @IsOptional()
  @IsString()
  start_date?: string

  @IsOptional()
  @IsString()
  end_date?: string
}
