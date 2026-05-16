import { Module } from '@nestjs/common'
import { ScopeTemplatesController } from './scope-templates.controller'
import { ScopeTemplatesRepository } from './scope-templates.repository'
import { ScopeTemplatesService } from './scope-templates.service'

@Module({
  controllers: [ScopeTemplatesController],
  providers: [ScopeTemplatesService, ScopeTemplatesRepository],
  exports: [ScopeTemplatesRepository],
})
export class ScopeTemplatesModule {}
