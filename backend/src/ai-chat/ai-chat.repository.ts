import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AiChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  findWorkflowByBrand(input: { tenantId: string; brandName: string }) {
    return this.prisma.workflow.findFirst({
      where: {
        tenant_id: input.tenantId,
        client: {
          tenant_id: input.tenantId,
          name: { contains: input.brandName, mode: 'insensitive' },
        },
      },
      orderBy: [{ month_number: 'desc' }, { created_at: 'desc' }],
      select: {
        id: true,
        client: { select: { id: true, name: true } },
      },
    })
  }

  findUserByName(input: { tenantId: string; name: string }) {
    return this.prisma.user.findFirst({
      where: {
        tenant_id: input.tenantId,
        is_active: true,
        full_name: { contains: input.name, mode: 'insensitive' },
      },
      select: { id: true, full_name: true, email: true },
    })
  }

  findTaskByTitle(input: { tenantId: string; title: string }) {
    return this.prisma.task.findFirst({
      where: {
        tenant_id: input.tenantId,
        title: { contains: input.title, mode: 'insensitive' },
      },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        due_date: true,
        assigned_to: true,
        assignee: { select: { id: true, full_name: true, email: true } },
        workflow: {
          select: {
            id: true,
            title: true,
            client: { select: { id: true, name: true } },
          },
        },
        _count: { select: { blockers: { where: { status: 'open' } } } },
      },
    })
  }

  findBrandByName(input: { tenantId: string; brandName: string }) {
    return this.prisma.client.findFirst({
      where: {
        tenant_id: input.tenantId,
        name: { contains: input.brandName, mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
      },
    })
  }
}
