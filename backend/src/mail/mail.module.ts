import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { MailService } from './mail.service'
import { ResendProvider } from './resend.provider'

@Module({
  imports: [PrismaModule],
  providers: [ResendProvider, MailService],
  exports: [MailService, ResendProvider],
})
export class MailModule {}
