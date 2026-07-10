import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createMany(
    notifications: Array<{
      tenant_id: string
      user_id: string
      type: string
      title: string
      message: string
      related_entity_type?: string
      related_entity_id?: string
    }>,
  ) {
    if (notifications.length === 0) {
      return Promise.resolve({ count: 0 })
    }

    return this.prisma.notification.createMany({
      data: notifications,
      skipDuplicates: true,
    })
  }

  findUsersByDesignation(tenantId: string, designations: string[]) {
    return this.prisma.user.findMany({
      where: {
        tenant_id: tenantId,
        is_active: true,
        designation: {
          in: designations,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    })
  }

  findForUser(input: { tenantId: string; userId: string; unreadOnly?: boolean }) {
    return this.prisma.notification.findMany({
      where: {
        tenant_id: input.tenantId,
        user_id: input.userId,
        ...(input.unreadOnly ? { is_read: false } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    })
  }

  markRead(input: { tenantId: string; userId: string; notificationId: string }) {
    return this.prisma.notification.update({
      where: {
        id: input.notificationId,
        tenant_id: input.tenantId,
        user_id: input.userId,
      },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    })
  }
}
