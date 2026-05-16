import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseAdminClient } from '../common/auth/supabase-admin-client'

@Injectable()
export class AuthService {
  private readonly supabase: SupabaseClient

  constructor(private readonly configService: ConfigService) {
    this.supabase = createSupabaseAdminClient(this.configService)
  }

  async sendPasswordReset(email: string) {
    const redirectTo = this.configService.get<string>(
      'SUPABASE_PASSWORD_RESET_REDIRECT_URL',
    )
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (error) {
      throw new InternalServerErrorException(
        'Unable to send password reset email.',
      )
    }

    return { message: 'If the email exists, a password reset email will be sent.' }
  }
}
