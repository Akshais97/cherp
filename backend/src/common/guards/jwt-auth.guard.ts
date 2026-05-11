import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Request } from 'express'
import { UserRole } from '../enums/user-role.enum'
import { RequestUser } from '../types/request-user.type'

type RequestWithUser = Request & {
  user?: RequestUser
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly supabase: SupabaseClient

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('SUPABASE_URL')
    const serviceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')

    if (!url || !serviceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.')
    }

    this.supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>()
    const token = this.getBearerToken(request)

    const { data, error } = await this.supabase.auth.getUser(token)

    if (error || !data.user) {
      throw new UnauthorizedException('Invalid or expired access token.')
    }

    const metadata = data.user.user_metadata
    const role = this.toRole(metadata.role)
    const tenantId = metadata.tenant_id

    if (!tenantId || metadata.is_active === false) {
      throw new UnauthorizedException('User is inactive or missing tenant context.')
    }

    request.user = {
      id: metadata.erp_user_id ?? data.user.id,
      authUserId: data.user.id,
      tenantId,
      email: data.user.email ?? '',
      fullName:
        metadata.full_name ??
        metadata.name ??
        data.user.email?.split('@')[0] ??
        'Agency User',
      role,
      avatarUrl: metadata.avatar_url,
      isActive: metadata.is_active !== false,
    }

    return true
  }

  private getBearerToken(request: Request): string {
    const authorization = request.headers.authorization

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token is required.')
    }

    return authorization.slice('Bearer '.length)
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
