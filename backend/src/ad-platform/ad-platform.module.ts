import { Module } from '@nestjs/common'
import { AdPlatformController } from './ad-platform.controller'
import { AdPlatformService } from './ad-platform.service'
import { GoogleAdManagerConnector } from './connectors/google-ad-manager.connector'
import { GoogleAdsConnector } from './connectors/google-ads.connector'
import { LinkedInAdsConnector } from './connectors/linkedin-ads.connector'
import { MetaAdsConnector } from './connectors/meta-ads.connector'
import { AdSyncCronJob } from './scheduler/ad-sync-cron.job'

@Module({
  controllers: [AdPlatformController],
  providers: [
    AdPlatformService,
    GoogleAdsConnector,
    MetaAdsConnector,
    LinkedInAdsConnector,
    GoogleAdManagerConnector,
    AdSyncCronJob,
  ],
  exports: [AdPlatformService],
})
export class AdPlatformIntegrationModule {}
