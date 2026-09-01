import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class TimeEntriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    tenantId: string
    taskId: string
    userId: string
    hours: number
    date: Date
    description?: string
    isBillable?: boolean
  }) {
    return this.prisma.timeEntry.create({
      data: {
        tenant_id: input.tenantId,
        task_id: input.taskId,
        user_id: input.userId,
        hours: new Prisma.Decimal(input.hours),
        date: input.date,
        description: input.description || null,
        is_billable: input.isBillable ?? true,
      },
      include: {
        task: { select: { id: true, title: true, client_id: true } },
        user: { select: { id: true, full_name: true, email: true } },
      },
    })
  }

  findByTask(tenantId: string, taskId: string) {
    return this.prisma.timeEntry.findMany({
      where: { tenant_id: tenantId, task_id: taskId, deleted_at: null },
      include: {
        user: { select: { id: true, full_name: true } },
      },
      orderBy: { date: 'desc' },
    })
  }

  findById(tenantId: string, id: string) {
    return this.prisma.timeEntry.findFirst({
      where: { id, tenant_id: tenantId, deleted_at: null },
      include: {
        task: { select: { id: true, title: true } },
        user: { select: { id: true, full_name: true } },
      },
    })
  }

  delete(tenantId: string, id: string) {
    return this.prisma.timeEntry.update({
      where: { id, tenant_id: tenantId },
      data: { deleted_at: new Date() },
    })
  }

  findReport(input: {
    tenantId: string
    clientId?: string
    userId?: string
    startDate?: Date
    endDate?: Date
  }) {
    const where: Prisma.TimeEntryWhereInput = {
      tenant_id: input.tenantId,
      deleted_at: null,
      ...(input.userId ? { user_id: input.userId } : {}),
      ...(input.startDate || input.endDate
        ? {
            date: {
              ...(input.startDate ? { gte: input.startDate } : {}),
              ...(input.endDate ? { lte: input.endDate } : {}),
            },
          }
        : {}),
      ...(input.clientId
        ? {
            task: {
              OR: [
                { client_id: input.clientId },
                { workflow: { client_id: input.clientId } },
              ],
            },
          }
        : {}),
    }

    return this.prisma.timeEntry.findMany({
      where,
      include: {
        task: {
          select: {
            id: true,
            title: true,
            client: { select: { id: true, name: true } },
            workflow: { select: { client: { select: { id: true, name: true } } } },
          },
        },
        user: { select: { id: true, full_name: true, email: true } },
      },
      orderBy: { date: 'desc' },
    })
  }
}
