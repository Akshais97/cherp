import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { UserRole } from '../common/enums/user-role.enum'
import { RequestUser } from '../common/types/request-user.type'
import { ScopeTemplatesRepository } from '../scope-templates/scope-templates.repository'
import { ClientsRepository } from './clients.repository'
import { ClientQueryDto } from './dto/client-query.dto'
import { CreateClientDto } from './dto/create-client.dto'
import { UpdateClientStatusDto } from './dto/update-client-status.dto'
import { UpdateClientDto } from './dto/update-client.dto'

type TemplateTask = {
  title?: unknown
  description?: unknown
  priority?: unknown
  due_offset_days?: unknown
}

@Injectable()
export class ClientsService {
  constructor(
    private readonly clientsRepository: ClientsRepository,
    private readonly templatesRepository: ScopeTemplatesRepository,
  ) {}

  list(user: RequestUser, filters: ClientQueryDto) {
    return this.clientsRepository.findByTenant({
      tenantId: user.tenantId,
      filters,
      assignedUserId: user.role !== UserRole.SuperAdmin ? user.id : undefined,
    })
  }

  async detail(id: string, user: RequestUser) {
    const client = await this.clientsRepository.findById({
      tenantId: user.tenantId,
      id,
      assignedUserId: user.role !== UserRole.SuperAdmin ? user.id : undefined,
      includeFinancials:
        user.role === UserRole.SuperAdmin || user.role === UserRole.ProjectManager,
    })

    if (!client) {
      throw new NotFoundException('Client not found.')
    }

    return client
  }

  async create(dto: CreateClientDto, user: RequestUser) {
    const template = await this.templatesRepository.findActiveById(
      user.tenantId,
      dto.scope_template_id,
    )

    if (!template) {
      throw new NotFoundException('Active scope template not found.')
    }

    if (
      template.industry !== dto.industry ||
      template.service_type !== dto.service_type
    ) {
      throw new BadRequestException('Selected template does not match client industry/service type.')
    }

    const startDate = this.toDate(dto.contract_start)
    const endDate = this.addMonths(startDate, dto.contract_duration)
    const tasks = this.extractMonthOneTasks(template.default_tasks, startDate)

    if (tasks.length === 0) {
      throw new BadRequestException('Selected template has no Month 1 tasks.')
    }

    const clientData: Prisma.ClientCreateInput = {
      tenant: { connect: { id: user.tenantId } },
      creator: { connect: { id: user.id } },
      scope_template: { connect: { id: template.id } },
      name: dto.name,
      industry: dto.industry,
      service_type: dto.service_type,
      contact_name: dto.contact_name,
      contact_email: dto.contact_email,
      contact_phone: dto.contact_phone,
      address: dto.address,
      status: 'active',
      monthly_retainer: dto.monthly_retainer,
      currency: dto.currency,
      contract_duration: dto.contract_duration,
      contract_start: startDate,
      contract_end: endDate,
      payment_terms: dto.payment_terms,
      renewal_date: dto.renewal_date ? this.toDate(dto.renewal_date, 'Invalid renewal date.') : undefined,
      notes: dto.notes,
      retainer_hours: dto.retainer_hours,
      health_score: 0,
    }

    return this.clientsRepository.createWithWorkflow({
      tenantId: user.tenantId,
      userId: user.id,
      templateId: template.id,
      client: clientData,
      workflowTitle: `${dto.name} — Month 1`,
      workflowStartDate: startDate,
      workflowEndDate: endDate,
      tasks,
    })
  }

  async update(id: string, dto: UpdateClientDto, user: RequestUser) {
    const existing = await this.clientsRepository.findSnapshotById({
      tenantId: user.tenantId,
      id,
    })

    if (!existing) {
      throw new NotFoundException('Client not found.')
    }

    if (user.role === UserRole.TeamMember) {
      const allowedBrandFields = [
        'brand_url',
        'instagram_profile',
        'social_profiles',
        'brand_guidelines',
        'logo_assets',
        'color_palette',
        'fonts',
        'target_audience',
        'competitor_list',
        'positioning_statement',
        'campaign_history',
        'communication_history',
      ]
      const keys = Object.keys(dto).filter((k) => (dto as any)[k] !== undefined)
      const forbiddenKeys = keys.filter((k) => !allowedBrandFields.includes(k))
      if (forbiddenKeys.length > 0) {
        throw new ForbiddenException('Team members can only update brand profile fields.')
      }
    }

    const contractStart = dto.contract_start
      ? this.toDate(dto.contract_start)
      : existing.contract_start
    const contractDuration = dto.contract_duration ?? existing.contract_duration
    const contractEnd =
      contractStart && contractDuration
        ? this.addMonths(contractStart, contractDuration)
        : existing.contract_end

    const data: Prisma.ClientUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.industry !== undefined ? { industry: dto.industry } : {}),
      ...(dto.service_type !== undefined ? { service_type: dto.service_type } : {}),
      ...(dto.contact_name !== undefined ? { contact_name: dto.contact_name } : {}),
      ...(dto.contact_email !== undefined ? { contact_email: dto.contact_email } : {}),
      ...(dto.contact_phone !== undefined ? { contact_phone: dto.contact_phone } : {}),
      ...(dto.address !== undefined ? { address: dto.address } : {}),
      ...(dto.monthly_retainer !== undefined
        ? { monthly_retainer: dto.monthly_retainer }
        : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
      ...(dto.contract_duration !== undefined
        ? { contract_duration: dto.contract_duration }
        : {}),
      ...(dto.contract_start !== undefined ? { contract_start: contractStart } : {}),
      ...(dto.contract_start !== undefined || dto.contract_duration !== undefined
        ? { contract_end: contractEnd }
        : {}),
      ...(dto.payment_terms !== undefined ? { payment_terms: dto.payment_terms } : {}),
      ...(dto.renewal_date !== undefined
        ? { renewal_date: this.toDate(dto.renewal_date, 'Invalid renewal date.') }
        : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      ...(dto.retainer_hours !== undefined ? { retainer_hours: dto.retainer_hours } : {}),
      ...(dto.brand_url !== undefined ? { brand_url: dto.brand_url } : {}),
      ...(dto.instagram_profile !== undefined ? { instagram_profile: dto.instagram_profile } : {}),
      ...(dto.social_profiles !== undefined ? { social_profiles: dto.social_profiles } : {}),
      ...(dto.brand_guidelines !== undefined ? { brand_guidelines: dto.brand_guidelines } : {}),
      ...(dto.logo_assets !== undefined ? { logo_assets: dto.logo_assets } : {}),
      ...(dto.color_palette !== undefined ? { color_palette: dto.color_palette } : {}),
      ...(dto.fonts !== undefined ? { fonts: dto.fonts } : {}),
      ...(dto.target_audience !== undefined ? { target_audience: dto.target_audience } : {}),
      ...(dto.competitor_list !== undefined ? { competitor_list: dto.competitor_list } : {}),
      ...(dto.positioning_statement !== undefined ? { positioning_statement: dto.positioning_statement } : {}),
      ...(dto.campaign_history !== undefined ? { campaign_history: dto.campaign_history } : {}),
      ...(dto.communication_history !== undefined ? { communication_history: dto.communication_history } : {}),
    }

    return this.clientsRepository.updateWithLog({
      tenantId: user.tenantId,
      userId: user.id,
      clientId: id,
      data,
      beforeValues: this.clientSnapshot(existing),
    })
  }

  async updateStatus(id: string, dto: UpdateClientStatusDto, user: RequestUser) {
    const existing = await this.clientsRepository.findSnapshotById({
      tenantId: user.tenantId,
      id,
    })

    if (!existing) {
      throw new NotFoundException('Client not found.')
    }

    return this.clientsRepository.updateStatusWithWorkflowSync({
      tenantId: user.tenantId,
      userId: user.id,
      clientId: id,
      status: dto.status,
      beforeValues: { status: existing.status },
    })
  }

  async archive(id: string, user: RequestUser) {
    const existing = await this.clientsRepository.findSnapshotById({
      tenantId: user.tenantId,
      id,
    })

    if (!existing) {
      throw new NotFoundException('Client not found.')
    }

    if (existing.status === 'archived') {
      throw new BadRequestException('Client is already archived.')
    }

    return this.clientsRepository.updateStatusWithWorkflowSync({
      tenantId: user.tenantId,
      userId: user.id,
      clientId: id,
      status: 'archived',
      beforeValues: { status: existing.status },
    })
  }

  private toDate(value: string, errorMessage = 'Invalid contract start date.') {
    const date = new Date(`${value}T00:00:00.000Z`)
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(errorMessage)
    }
    return date
  }

  private addMonths(date: Date, months: number) {
    const next = new Date(date)
    next.setUTCMonth(next.getUTCMonth() + months)
    return next
  }

  private extractMonthOneTasks(defaultTasks: Prisma.JsonValue, startDate: Date) {
    const source = this.getMonthOneTaskArray(defaultTasks)

    return source.map((task, index) => {
      const offset =
        typeof task.due_offset_days === 'number' ? task.due_offset_days : index * 3
      const dueDate = new Date(startDate)
      dueDate.setUTCDate(dueDate.getUTCDate() + offset)

      return {
        title:
          typeof task.title === 'string' && task.title.trim()
            ? task.title
            : `Month 1 Task ${index + 1}`,
        description:
          typeof task.description === 'string' ? task.description : undefined,
        priority:
          task.priority === 'high' || task.priority === 'low'
            ? task.priority
            : 'medium',
        sort_order: index + 1,
        due_date: dueDate,
      }
    })
  }

  private getMonthOneTaskArray(defaultTasks: Prisma.JsonValue): TemplateTask[] {
    if (Array.isArray(defaultTasks)) {
      return defaultTasks as TemplateTask[]
    }

    if (
      defaultTasks &&
      typeof defaultTasks === 'object' &&
      !Array.isArray(defaultTasks) &&
      Array.isArray(defaultTasks.month_1)
    ) {
      return defaultTasks.month_1 as TemplateTask[]
    }

    return []
  }

  private clientSnapshot(client: any): Prisma.InputJsonObject {
    return {
      name: client.name,
      industry: client.industry,
      service_type: client.service_type,
      contact_name: client.contact_name,
      contact_email: client.contact_email,
      contact_phone: client.contact_phone,
      address: client.address,
      status: client.status,
      monthly_retainer: client.monthly_retainer?.toString() ?? null,
      currency: client.currency,
      contract_duration: client.contract_duration,
      contract_start: client.contract_start?.toISOString() ?? null,
      contract_end: client.contract_end?.toISOString() ?? null,
      payment_terms: client.payment_terms,
      renewal_date: client.renewal_date?.toISOString() ?? null,
      notes: client.notes,
      retainer_hours: client.retainer_hours,
      brand_url: client.brand_url,
      instagram_profile: client.instagram_profile,
      social_profiles: client.social_profiles,
      brand_guidelines: client.brand_guidelines,
      logo_assets: client.logo_assets,
      color_palette: client.color_palette,
      fonts: client.fonts,
      target_audience: client.target_audience,
      competitor_list: client.competitor_list,
      positioning_statement: client.positioning_statement,
      campaign_history: client.campaign_history,
      communication_history: client.communication_history,
    }
  }

  async getClientDashboard(user: RequestUser) {
    const clientUserMapping = await this.clientsRepository.findClientMappingForUser(user.tenantId, user.id)
    if (!clientUserMapping) {
      throw new NotFoundException('No client assigned to this user.')
    }
    const clientId = clientUserMapping.client_id

    const client = await this.clientsRepository.findById({
      tenantId: user.tenantId,
      id: clientId,
      includeFinancials: true,
    })

    if (!client) {
      throw new NotFoundException('Client details not found.')
    }

    const activeWorkflow = client.workflows[0]
    let tasks: any[] = []
    if (activeWorkflow) {
      const fullWorkflow = await this.clientsRepository.findWorkflowTasks(user.tenantId, activeWorkflow.id)
      tasks = fullWorkflow?.tasks ?? []
    }

    return {
      client,
      activeWorkflow,
      tasks,
    }
  }

  async getLogs(id: string, user: RequestUser) {
    const existing = await this.clientsRepository.findSnapshotById({
      tenantId: user.tenantId,
      id,
    })

    if (!existing) {
      throw new NotFoundException('Client not found.')
    }

    return this.clientsRepository.findLogs(user.tenantId, id)
  }
}
