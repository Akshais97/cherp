import { Module } from '@nestjs/common'
import { UsersController } from './users.controller'
import { UsersRepository } from './users.repository'
import { UsersService } from './users.service'
import { IntegrationsController } from './integrations.controller'
import { TeamsIntegrationService } from './teams-integration.service'

@Module({
  controllers: [UsersController, IntegrationsController],
  providers: [UsersService, UsersRepository, TeamsIntegrationService],
  exports: [UsersService, TeamsIntegrationService],
})
export class UsersModule {}
