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

  private static tokenCache = new Map<string, { promise: Promise<any>; expiresAt: number }>()

  private async getSupabaseUserCached(token: string): Promise<any> {
    const now = Date.now()
    const cached = JwtAuthGuard.tokenCache.get(token)
    if (cached && cached.expiresAt > now) {
      return cached.promise
    }

    const promise = this.supabase.auth.getUser(token).then(({ data, error }) => {
      if (error || !data.user) {
        throw new UnauthorizedException('Invalid or expired access token.')
      }
      return data.user
    }).catch(err => {
      JwtAuthGuard.tokenCache.delete(token)
      throw new UnauthorizedException(err.message || 'Invalid or expired access token.')
    })

    JwtAuthGuard.tokenCache.set(token, {
      promise,
      expiresAt: now + 5000,
    })

    return promise
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>()
    const token = getBearerTokenFromRequest(request)

    const supabaseUser = await this.getSupabaseUserCached(token)

    const erpUser = await this.prisma.user.findUnique({
      where: { auth_user_id: supabaseUser.id },
      select: {
        id: true,
        tenant_id: true,
        email: true,
        full_name: true,
        avatar_url: true,
        is_active: true,
        role: { select: { name: true } },
      },
    })

    if (!erpUser) {
      throw new UnauthorizedException('ERP user record not found for this Supabase user.')
    }

    if (!erpUser.is_active) {
      throw new UnauthorizedException('User is inactive.')
    }

    request.user = {
      id: erpUser.id,
      authUserId: supabaseUser.id,
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
