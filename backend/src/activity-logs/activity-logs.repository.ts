import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

type ActivityLogInput = {
  tenantId: string
  userId: string
  actionType: string
  entityType: string
  entityId: string
  beforeValues?: Prisma.InputJsonValue
  afterValues?: Prisma.InputJsonValue
}

@Injectable()
export class ActivityLogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    input: ActivityLogInput,
    tx: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    return tx.activityLog.create({
      data: {
        tenant_id: input.tenantId,
        user_id: input.userId,
        action_type: input.actionType,
        entity_type: input.entityType,
        entity_id: input.entityId,
        before_values: input.beforeValues,
        after_values: input.afterValues,
      },
    })
  }

  findMany(input: { tenantId: string; entityType?: string; actionType?: string; userId?: string }) {
    return this.prisma.activityLog.findMany({
      where: {
        tenant_id: input.tenantId,
        ...(input.entityType ? { entity_type: input.entityType } : {}),
        ...(input.actionType ? { action_type: input.actionType } : {}),
        ...(input.userId ? { user_id: input.userId } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    })
  }
}
