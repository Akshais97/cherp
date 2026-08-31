import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SupabaseClient } from '@supabase/supabase-js'
import { ActivityLogsRepository } from '../activity-logs/activity-logs.repository'
import { createSupabaseAdminClient } from '../common/auth/supabase-admin-client'
import { RequestUser } from '../common/types/request-user.type'
import { PrismaService } from '../prisma/prisma.service'
import { LoginDto } from './dto/login.dto'

@Injectable()
export class AuthService {
  private readonly supabase: SupabaseClient

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly activityLogsRepo: ActivityLogsRepository,
  ) {
    this.supabase = createSupabaseAdminClient(this.configService)
  }

  async login(dto: LoginDto, ipAddress: string) {
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000)

    const failedCount = await this.prisma.authAttempt.count({
      where: {
        email: dto.email,
        ip_address: ipAddress,
        success: false,
        created_at: { gte: fifteenMinsAgo },
      },
    })

    const totalIpCount = await this.prisma.authAttempt.count({
      where: {
        ip_address: ipAddress,
        created_at: { gte: fifteenMinsAgo },
      },
    })

    if (failedCount >= 5 || totalIpCount >= 15) {
      throw new HttpException(
        'Too many failed login attempts. Please try again in 15 minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    })

    if (error || !data.session) {
      await this.prisma.authAttempt.create({
        data: {
          email: dto.email,
          ip_address: ipAddress,
          success: false,
          reason: error?.message || 'Invalid credentials',
        },
      })
      throw new UnauthorizedException('Invalid email or password.')
    }

    await this.prisma.authAttempt.create({
      data: {
        email: dto.email,
        ip_address: ipAddress,
        success: true,
      },
    })

    return {
      user: data.user,
      session: data.session,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    }
  }

  async logout(user: RequestUser) {
    await this.activityLogsRepo.create({
      tenantId: user.tenantId,
      userId: user.id,
      actionType: 'auth_logout',
      entityType: 'user',
      entityId: user.id,
    })

    return {
      user_id: user.id,
      message: 'Session successfully logged out.',
    }
  }

  async logoutAll(user: RequestUser) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { sessions_revoked_at: new Date() },
    })

    if (user.authUserId) {
      try {
        await this.supabase.auth.admin.signOut(user.authUserId, 'global')
      } catch (err) {
        // Ignore Supabase admin signout error if session already cleared
      }
    }

    await this.activityLogsRepo.create({
      tenantId: user.tenantId,
      userId: user.id,
      actionType: 'auth_logout_all',
      entityType: 'user',
      entityId: user.id,
    })

    return {
      user_id: user.id,
      message: 'All sessions revoked across all devices.',
    }
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
