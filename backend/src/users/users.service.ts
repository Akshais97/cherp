import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SupabaseClient } from '@supabase/supabase-js'
import { Prisma } from '@prisma/client'
import { createSupabaseAdminClient } from '../common/auth/supabase-admin-client'
import { RequestUser } from '../common/types/request-user.type'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { UsersRepository } from './users.repository'

@Injectable()
export class UsersService {
  private readonly supabase: SupabaseClient

  constructor(
    private readonly configService: ConfigService,
    private readonly usersRepository: UsersRepository,
  ) {
    this.supabase = createSupabaseAdminClient(this.configService)
  }

  list(user: RequestUser) {
    return this.usersRepository.findByTenant(user.tenantId)
  }

  async create(dto: CreateUserDto, actor: RequestUser) {
    const role = await this.usersRepository.findRoleByName(dto.role)

    if (!role) {
      throw new BadRequestException('Requested role does not exist.')
    }

    const { data, error } = await this.supabase.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
      user_metadata: {
        full_name: dto.full_name,
        role: dto.role,
        tenant_id: actor.tenantId,
      },
    })

    if (error || !data.user) {
      if (error?.message.toLowerCase().includes('already')) {
        throw new ConflictException('A Supabase Auth user already exists for this email.')
      }

      throw new InternalServerErrorException('Unable to create Supabase Auth user.')
    }

    try {
      const created = await this.usersRepository.createWithLog({
        tenantId: actor.tenantId,
        actorId: actor.id,
        roleId: role.id,
        authUserId: data.user.id,
        email: dto.email,
        fullName: dto.full_name,
        avatarUrl: dto.avatar_url,
      })

      await this.supabase.auth.admin.updateUserById(data.user.id, {
        user_metadata: {
          full_name: created.full_name,
          role: created.role.name,
          tenant_id: actor.tenantId,
          erp_user_id: created.id,
          is_active: created.is_active,
        },
      })

      return created
    } catch (error) {
      await this.supabase.auth.admin.deleteUser(data.user.id)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('ERP user already exists for this Supabase user.')
      }

      throw error
    }
  }

  async update(id: string, dto: UpdateUserDto, actor: RequestUser) {
    const existing = await this.usersRepository.findById(actor.tenantId, id)

    if (!existing) {
      throw new NotFoundException('User not found.')
    }

    const data: Prisma.UserUpdateInput = {}
    let nextRoleName = existing.role.name

    if (dto.full_name !== undefined) data.full_name = dto.full_name
    if (dto.avatar_url !== undefined) data.avatar_url = dto.avatar_url
    if (dto.is_active !== undefined) data.is_active = dto.is_active

    if (dto.role !== undefined) {
      const role = await this.usersRepository.findRoleByName(dto.role)

      if (!role) {
        throw new BadRequestException('Requested role does not exist.')
      }

      data.role = { connect: { id: role.id } }
      nextRoleName = dto.role
    }

    const updated = await this.usersRepository.updateWithLog({
      tenantId: actor.tenantId,
      actorId: actor.id,
      userId: id,
      data,
      beforeValues: {
        full_name: existing.full_name,
        avatar_url: existing.avatar_url,
        role: existing.role.name,
        is_active: existing.is_active,
      },
    })

    await this.supabase.auth.admin.updateUserById(existing.auth_user_id, {
      user_metadata: {
        full_name: updated.full_name,
        role: nextRoleName,
        tenant_id: actor.tenantId,
        erp_user_id: updated.id,
        is_active: updated.is_active,
      },
    })

    return updated
  }
}
