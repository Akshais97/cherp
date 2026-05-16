import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { TemplatePreset } from './template-presets'

@Injectable()
export class ScopeTemplatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveByTenant(tenantId: string) {
    return this.prisma.scopeTemplate.findMany({
      where: { tenant_id: tenantId, is_active: true },
      orderBy: [{ industry: 'asc' }, { service_type: 'asc' }],
      take: 100,
      select: this.templateSelect(),
    })
  }

  findById(tenantId: string, id: string) {
    return this.prisma.scopeTemplate.findFirst({
      where: { id, tenant_id: tenantId },
      select: this.templateSelect(),
    })
  }

  findActiveById(
    tenantId: string,
    id: string,
    tx: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    return tx.scopeTemplate.findFirst({
      where: { id, tenant_id: tenantId, is_active: true },
      select: this.templateSelect(),
    })
  }

  findByIndustryService(input: {
    tenantId: string
    industry: string
    serviceType: string
  }) {
    return this.prisma.scopeTemplate.findFirst({
      where: {
        tenant_id: input.tenantId,
        industry: input.industry,
        service_type: input.serviceType,
      },
      select: { id: true, industry: true, service_type: true },
    })
  }

  async resolve(input: {
    tenantId: string
    industry: string
    serviceType: string
  }) {
    const exact = await this.prisma.scopeTemplate.findFirst({
      where: {
        tenant_id: input.tenantId,
        is_active: true,
        industry: input.industry,
        service_type: input.serviceType,
      },
      orderBy: { created_at: 'desc' },
      select: this.templateSelect(),
    })

    if (exact) return { template: exact, resolution: 'exact' as const }

    const sameIndustry = await this.prisma.scopeTemplate.findFirst({
      where: {
        tenant_id: input.tenantId,
        is_active: true,
        industry: input.industry,
      },
      orderBy: { created_at: 'desc' },
      select: this.templateSelect(),
    })

    if (sameIndustry) {
      return { template: sameIndustry, resolution: 'same_industry' as const }
    }

    const sameService = await this.prisma.scopeTemplate.findFirst({
      where: {
        tenant_id: input.tenantId,
        is_active: true,
        service_type: input.serviceType,
      },
      orderBy: { created_at: 'desc' },
      select: this.templateSelect(),
    })

    if (sameService) {
      return { template: sameService, resolution: 'same_service' as const }
    }

    return { template: null, resolution: 'manual_selection_required' as const }
  }

  createWithLog(input: {
    tenantId: string
    userId: string
    data: Prisma.ScopeTemplateCreateInput
  }) {
    return this.prisma.$transaction(async (tx) => {
      const template = await tx.scopeTemplate.create({
        data: input.data,
        select: this.templateSelect(),
      })

      await tx.activityLog.create({
        data: {
          tenant_id: input.tenantId,
          user_id: input.userId,
          action_type: 'created',
          entity_type: 'scope_template',
          entity_id: template.id,
          after_values: {
            name: template.name,
            industry: template.industry,
            service_type: template.service_type,
          },
        },
      })

      return template
    })
  }

  updateWithLog(input: {
    tenantId: string
    userId: string
    templateId: string
    data: Prisma.ScopeTemplateUpdateInput
    beforeValues: Prisma.InputJsonValue
    actionType?: 'updated' | 'archived'
  }) {
    return this.prisma.$transaction(async (tx) => {
      const template = await tx.scopeTemplate.update({
        where: { id: input.templateId, tenant_id: input.tenantId },
        data: input.data,
        select: this.templateSelect(),
      })

      await tx.activityLog.create({
        data: {
          tenant_id: input.tenantId,
          user_id: input.userId,
          action_type: input.actionType ?? 'updated',
          entity_type: 'scope_template',
          entity_id: input.templateId,
          before_values: input.beforeValues,
          after_values: {
            name: template.name,
            industry: template.industry,
            service_type: template.service_type,
            is_active: template.is_active,
          },
        },
      })

      return template
    })
  }

  async seedPresets(tenantId: string, userId: string, presets: TemplatePreset[]) {
    return this.prisma.$transaction(async (tx) => {
      const results = []

      for (const preset of presets) {
        results.push(
          await tx.scopeTemplate.upsert({
            where: {
              tenant_id_industry_service_type: {
                tenant_id: tenantId,
                industry: preset.industry,
                service_type: preset.service_type,
              },
            },
            update: {
              name: preset.name,
              description: preset.description,
              duration_months: preset.duration_months,
              default_tasks: preset.default_tasks,
              kpi_framework: preset.kpi_framework,
              is_active: true,
            },
            create: {
              tenant_id: tenantId,
              created_by: userId,
              ...preset,
            },
            select: this.templateSelect(),
          }),
        )
      }

      await tx.activityLog.create({
        data: {
          tenant_id: tenantId,
          user_id: userId,
          action_type: 'created',
          entity_type: 'scope_template',
          entity_id: results[0].id,
          after_values: { seeded_count: results.length },
        },
      })

      return results
    })
  }

  private templateSelect() {
    return {
      id: true,
      tenant_id: true,
      name: true,
      industry: true,
      service_type: true,
      description: true,
      duration_months: true,
      default_tasks: true,
      kpi_framework: true,
      is_active: true,
      created_by: true,
      created_at: true,
      updated_at: true,
    } satisfies Prisma.ScopeTemplateSelect
  }
}
