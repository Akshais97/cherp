import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { areServiceTypesCompatible } from './service-types.constants'
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

    if (exact) {
      return {
        template: exact,
        resolution: 'exact' as const,
        exact_match: exact,
        suggestions: [],
      }
    }

    const allActive = await this.prisma.scopeTemplate.findMany({
      where: { tenant_id: input.tenantId, is_active: true },
      select: this.templateSelect(),
    })

    // Check for compatible service_type alias for the same industry
    const aliasMatch = allActive.find(
      (t) =>
        t.industry.toLowerCase() === input.industry.toLowerCase() &&
        areServiceTypesCompatible(t.service_type, input.serviceType),
    )

    if (aliasMatch) {
      return {
        template: aliasMatch,
        resolution: 'exact' as const,
        exact_match: aliasMatch,
        suggestions: [],
      }
    }

    const suggestions = allActive
      .map((template) => {
        const sameIndustry =
          template.industry.toLowerCase() === input.industry.toLowerCase()
        const sameService =
          template.service_type.toLowerCase() === input.serviceType.toLowerCase() ||
          areServiceTypesCompatible(template.service_type, input.serviceType)

        let match_score = 0.5
        const reasons: string[] = []

        if (sameService && sameIndustry) {
          match_score = 1.0
          reasons.push('exact match')
        } else if (sameService) {
          match_score = 0.85
          reasons.push('same service type')
        } else if (sameIndustry) {
          match_score = 0.7
          reasons.push('same industry')
        } else {
          reasons.push('popular scope template')
        }

        return {
          template,
          match_score,
          reasons,
        }
      })
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 5)

    const topSuggestion = suggestions[0]?.template ?? null
    const topResolution = suggestions[0]?.match_score === 0.85
      ? ('same_service' as const)
      : suggestions[0]?.match_score === 0.7
        ? ('same_industry' as const)
        : ('manual_selection_required' as const)

    return {
      template: topSuggestion,
      resolution: topResolution,
      exact_match: null,
      suggestions,
    }
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

      // Check if user exists to satisfy foreign key constraint
      const validUser = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true },
      })
      const creatorId = validUser?.id ?? userId

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
              created_by: creatorId,
              ...preset,
            },
            select: this.templateSelect(),
          }),
        )
      }

      if (results.length > 0 && results[0]?.id && validUser) {
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
      }

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
