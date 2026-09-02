import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SupabaseClient } from '@supabase/supabase-js'
import { Request } from 'express'
import { PrismaService } from '../../prisma/prisma.service'
import { getBearerTokenFromRequest } from '../auth/bearer-token'
import { createSupabaseAdminClient } from '../auth/supabase-admin-client'
import { UserRole } from '../enums/user-role.enum'
import { RequestUser } from '../types/request-user.type'

type RequestWithUser = Request & {
  user?: RequestUser
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly supabase: SupabaseClient

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.supabase = createSupabaseAdminClient(this.configService)
  }

  private async getVerifiedSubject(token: string): Promise<string> {
    const { data, error } = await this.supabase.auth.getClaims(token)
    const subject = data?.claims.sub

    if (error || typeof subject !== 'string' || subject.length === 0) {
      throw new UnauthorizedException('Invalid or expired access token.')
    }

    return subject
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>()
    const token = getBearerTokenFromRequest(request)
    const authUserId = await this.getVerifiedSubject(token)

    const erpUser = await this.prisma.user.findUnique({
      where: { auth_user_id: authUserId },
      select: {
        id: true,
        tenant_id: true,
        email: true,
        full_name: true,
        avatar_url: true,
        is_active: true,
        sessions_revoked_at: true,
        role: { select: { name: true } },
      },
    })

    if (!erpUser) {
      throw new UnauthorizedException('ERP user record not found for this Supabase user.')
    }

    if (!erpUser.is_active) {
      throw new UnauthorizedException('User is inactive.')
    }

    if (erpUser.sessions_revoked_at) {
      try {
        const parts = token.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'))
          if (payload.iat && payload.iat * 1000 < erpUser.sessions_revoked_at.getTime()) {
            throw new UnauthorizedException('Session has been revoked. Please sign in again.')
          }
        }
      } catch (err) {
        if (err instanceof UnauthorizedException) throw err
      }
    }

    request.user = {
      id: erpUser.id,
      authUserId,
      tenantId: erpUser.tenant_id,
      email: erpUser.email,
      fullName: erpUser.full_name,
      role: this.toRole(erpUser.role.name),
      avatarUrl: erpUser.avatar_url ?? undefined,
      isActive: erpUser.is_active,
    }

    return true
  }

  private toRole(value: unknown): UserRole {
    if (
      value === UserRole.SuperAdmin ||
      value === UserRole.ProjectManager ||
      value === UserRole.TeamMember ||
      value === UserRole.Client
    ) {
      return value
    }

    throw new UnauthorizedException('User role is not allowed.')
  }
}
