import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByTenant(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
      take: 100,
      select: this.safeSelect(),
    })
  }

  findById(tenantId: string, id: string) {
    return this.prisma.user.findFirst({
      where: { id, tenant_id: tenantId },
      select: this.safeSelect(),
    })
  }

  findRoleByName(name: string) {
    return this.prisma.role.findUnique({ where: { name } })
  }

  createWithLog(input: {
    tenantId: string
    actorId: string
    roleId: string
    authUserId: string
    email: string
    fullName: string
    avatarUrl?: string
  }) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenant_id: input.tenantId,
          role_id: input.roleId,
          auth_user_id: input.authUserId,
          email: input.email,
          full_name: input.fullName,
          avatar_url: input.avatarUrl,
          created_by: input.actorId,
          is_active: true,
        },
        select: this.safeSelect(),
      })

      await tx.activityLog.create({
        data: {
          tenant_id: input.tenantId,
          user_id: input.actorId,
          action_type: 'created',
          entity_type: 'user',
          entity_id: user.id,
          after_values: {
            email: user.email,
            role: user.role.name,
            is_active: user.is_active,
          },
        },
      })

      return user
    })
  }

  updateWithLog(input: {
    tenantId: string
    actorId: string
    userId: string
    data: Prisma.UserUpdateInput
    beforeValues: Prisma.InputJsonValue
  }) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: input.userId, tenant_id: input.tenantId },
        data: input.data,
        select: this.safeSelect(),
      })

      await tx.activityLog.create({
        data: {
          tenant_id: input.tenantId,
          user_id: input.actorId,
          action_type: 'updated',
          entity_type: 'user',
          entity_id: input.userId,
          before_values: input.beforeValues,
          after_values: {
            full_name: updated.full_name,
            avatar_url: updated.avatar_url,
            role: updated.role.name,
            is_active: updated.is_active,
          },
        },
      })

      return updated
    })
  }

  private safeSelect() {
    return {
      id: true,
      email: true,
      full_name: true,
      avatar_url: true,
      is_active: true,
      auth_user_id: true,
      created_at: true,
      updated_at: true,
      role: { select: { name: true, description: true } },
    } satisfies Prisma.UserSelect
  }
}
