import { Module } from '@nestjs/common'
import { ScopeTemplatesModule } from '../scope-templates/scope-templates.module'
import { ClientsController } from './clients.controller'
import { ClientsRepository } from './clients.repository'
import { ClientsService } from './clients.service'

@Module({
  imports: [ScopeTemplatesModule],
  controllers: [ClientsController],
  providers: [ClientsService, ClientsRepository],
})
export class ClientsModule {}
