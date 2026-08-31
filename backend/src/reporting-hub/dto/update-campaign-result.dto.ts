import { PartialType } from '@nestjs/swagger'
import { CreateCampaignResultDto } from './create-campaign-result.dto'

export class UpdateCampaignResultDto extends PartialType(CreateCampaignResultDto) {}
