import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { RequestUser } from '../common/types/request-user.type'
import { CreateScopeTemplateDto } from './dto/create-scope-template.dto'
import { ResolveScopeTemplateDto } from './dto/resolve-scope-template.dto'
import { UpdateScopeTemplateDto } from './dto/update-scope-template.dto'
import { ScopeTemplatesRepository } from './scope-templates.repository'
import { templatePresets } from './template-presets'

@Injectable()
export class ScopeTemplatesService {
  constructor(private readonly repository: ScopeTemplatesRepository) {}

  list(user: RequestUser) {
    return this.repository.findActiveByTenant(user.tenantId)
  }

  async detail(id: string, user: RequestUser) {
    const template = await this.repository.findById(user.tenantId, id)

    if (!template) {
      throw new NotFoundException('Scope template not found.')
    }

    return template
  }

  async resolve(query: ResolveScopeTemplateDto, user: RequestUser) {
    return this.repository.resolve({
      tenantId: user.tenantId,
      industry: query.industry,
      serviceType: query.service_type,
    })
  }

  async create(dto: CreateScopeTemplateDto, user: RequestUser) {
    const existing = await this.repository.findByIndustryService({
      tenantId: user.tenantId,
      industry: dto.industry,
      serviceType: dto.service_type,
    })

    if (existing) {
      throw new ConflictException(
        'A scope template already exists for this industry and service type.',
      )
    }

    return this.repository.createWithLog({
      tenantId: user.tenantId,
      userId: user.id,
      data: {
        tenant: { connect: { id: user.tenantId } },
        creator: { connect: { id: user.id } },
        name: dto.name,
        industry: dto.industry,
        service_type: dto.service_type,
        description: dto.description,
        duration_months: dto.duration_months,
        default_tasks: dto.default_tasks as Prisma.InputJsonObject,
        kpi_framework: dto.kpi_framework as Prisma.InputJsonObject,
        is_active: true,
      },
    })
  }

  async update(id: string, dto: UpdateScopeTemplateDto, user: RequestUser) {
    const existing = await this.repository.findById(user.tenantId, id)

    if (!existing) {
      throw new NotFoundException('Scope template not found.')
    }

    if (existing.is_active === false) {
      throw new BadRequestException('Inactive templates cannot be updated.')
    }

    const nextIndustry = dto.industry ?? existing.industry
    const nextServiceType = dto.service_type ?? existing.service_type

    if (
      nextIndustry !== existing.industry ||
      nextServiceType !== existing.service_type
    ) {
      const conflict = await this.repository.findByIndustryService({
        tenantId: user.tenantId,
        industry: nextIndustry,
        serviceType: nextServiceType,
      })

      if (conflict && conflict.id !== id) {
        throw new ConflictException(
          'A scope template already exists for this industry and service type.',
        )
      }
    }

    return this.repository.updateWithLog({
      tenantId: user.tenantId,
      userId: user.id,
      templateId: id,
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.industry !== undefined ? { industry: dto.industry } : {}),
        ...(dto.service_type !== undefined
          ? { service_type: dto.service_type }
          : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.duration_months !== undefined
          ? { duration_months: dto.duration_months }
          : {}),
        ...(dto.default_tasks !== undefined
          ? { default_tasks: dto.default_tasks as Prisma.InputJsonObject }
          : {}),
        ...(dto.kpi_framework !== undefined
          ? { kpi_framework: dto.kpi_framework as Prisma.InputJsonObject }
          : {}),
      },
      beforeValues: this.snapshot(existing),
    })
  }

  async deactivate(id: string, user: RequestUser) {
    const existing = await this.repository.findById(user.tenantId, id)

    if (!existing) {
      throw new NotFoundException('Scope template not found.')
    }

    if (!existing.is_active) {
      throw new BadRequestException('Scope template is already inactive.')
    }

    return this.repository.updateWithLog({
      tenantId: user.tenantId,
      userId: user.id,
      templateId: id,
      data: { is_active: false },
      beforeValues: this.snapshot(existing),
      actionType: 'archived',
    })
  }

  seed(user: RequestUser) {
    return this.repository.seedPresets(user.tenantId, user.id, templatePresets)
  }

  private snapshot(template: {
    name: string
    industry: string
    service_type: string
    description: string | null
    duration_months: number
    default_tasks: Prisma.JsonValue
    kpi_framework: Prisma.JsonValue
    is_active: boolean
  }): Prisma.InputJsonObject {
    return {
      name: template.name,
      industry: template.industry,
      service_type: template.service_type,
      description: template.description,
      duration_months: template.duration_months,
      default_tasks: template.default_tasks as Prisma.InputJsonValue,
      kpi_framework: template.kpi_framework as Prisma.InputJsonValue,
      is_active: template.is_active,
    }
  }
}
