import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
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
  private readonly logger = new Logger(UsersService.name)
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

  listTeamMembers(user: RequestUser) {
    return this.usersRepository.findTeamMembersByTenant(user.tenantId)
  }

  async getTeamMemberWorkload(id: string, user: RequestUser) {
    const member = await this.usersRepository.findTeamMemberById(user.tenantId, id)

    if (!member) {
      throw new NotFoundException('Team member not found.')
    }

    return {
      member,
      tasks: await this.usersRepository.findAssignedTasks(user.tenantId, id),
      blockers: await this.usersRepository.findAssignedTaskBlockers(user.tenantId, id),
    }
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

  async remove(id: string, actor: RequestUser) {
    if (id === actor.id) {
      throw new ForbiddenException('You cannot delete your own user account.')
    }

    const existing = await this.usersRepository.findById(actor.tenantId, id)

    if (!existing) {
      throw new NotFoundException('User not found.')
    }

    if (existing.role.name === 'super_admin') {
      const superAdminCount = await this.usersRepository.countUsersByRole(
        actor.tenantId,
        'super_admin',
      )

      if (superAdminCount <= 1) {
        throw new ConflictException('At least one Super Admin must remain active in this tenant.')
      }
    }

    const references = await this.usersRepository.countProtectedDeleteReferences(
      actor.tenantId,
      id,
    )
    const blockingLabels = Object.entries(references)
      .filter(([, count]) => count > 0)
      .map(([label, count]) => `${count} ${label}`)

    if (blockingLabels.length > 0) {
      throw new ConflictException(
        `User cannot be deleted because they are linked to ${blockingLabels.join(', ')}. Reassign or archive that operational history first.`,
      )
    }

    let deleted: typeof existing

    try {
      deleted = await this.usersRepository.deleteWithLog({
        tenantId: actor.tenantId,
        actorId: actor.id,
        user: existing,
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'User cannot be deleted because operational records still reference this account. Reassign or archive the linked records first.',
        )
      }

      this.logger.error(`Failed to delete ERP user ${existing.id}.`)
      throw error
    }

    const { error } = await this.supabase.auth.admin.deleteUser(existing.auth_user_id)

    if (error) {
      this.logger.error(
        `ERP user ${existing.id} was deleted, but Supabase Auth cleanup failed: ${error.message}`,
      )
      throw new InternalServerErrorException(
        'User was removed from the ERP, but Supabase Auth cleanup failed. Please contact an administrator to remove the login account.',
      )
    }

    return deleted
  }
}
