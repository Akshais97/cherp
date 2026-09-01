import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { UserRole } from '../common/enums/user-role.enum'
import { RequestUser } from '../common/types/request-user.type'
import { CreateTimeEntryDto } from './dto/create-time-entry.dto'
import { TimeEntryReportQueryDto } from './dto/time-entry-report-query.dto'
import { TimeEntriesRepository } from './time-entries.repository'

@Injectable()
export class TimeEntriesService {
  constructor(private readonly repository: TimeEntriesRepository) {}

  async create(taskId: string, dto: CreateTimeEntryDto, user: RequestUser) {
    const entryDate = new Date(dto.date)
    return this.repository.create({
      tenantId: user.tenantId,
      taskId,
      userId: user.id,
      hours: dto.hours,
      date: entryDate,
      description: dto.description,
      isBillable: dto.is_billable,
    })
  }

  async findByTask(taskId: string, user: RequestUser) {
    return this.repository.findByTask(user.tenantId, taskId)
  }

  async delete(id: string, user: RequestUser) {
    const existing = await this.repository.findById(user.tenantId, id)
    if (!existing) {
      throw new NotFoundException('Time entry not found.')
    }
    if (user.role === UserRole.TeamMember && existing.user.id !== user.id) {
      throw new ForbiddenException('Team members can only delete their own time entries.')
    }
    return this.repository.delete(user.tenantId, id)
  }

  async getReport(query: TimeEntryReportQueryDto, user: RequestUser) {
    const rawUserId = query.user_id || query.userId
    const rawClientId = query.client_id || query.clientId
    const rawStartDate = query.start_date || query.startDate
    const rawEndDate = query.end_date || query.endDate

    if (user.role === UserRole.TeamMember && rawUserId && rawUserId !== user.id) {
      throw new ForbiddenException('Team members can only view their own time report.')
    }

    const startDate = rawStartDate ? new Date(rawStartDate) : undefined
    const endDate = rawEndDate ? new Date(rawEndDate) : undefined

    const entries = await this.repository.findReport({
      tenantId: user.tenantId,
      clientId: rawClientId,
      userId: user.role === UserRole.TeamMember ? user.id : rawUserId,
      startDate,
      endDate,
    })

    const totalHours = entries.reduce((acc, curr) => acc + Number(curr.hours), 0)
    const billableHours = entries
      .filter((e) => e.is_billable)
      .reduce((acc, curr) => acc + Number(curr.hours), 0)

    return {
      entries_count: entries.length,
      total_hours: Math.round(totalHours * 100) / 100,
      billable_hours: Math.round(billableHours * 100) / 100,
      non_billable_hours: Math.round((totalHours - billableHours) * 100) / 100,
      entries,
    }
  }

  async generateCsvExport(query: TimeEntryReportQueryDto, user: RequestUser): Promise<string> {
    const report = await this.getReport(query, user)
    const header = 'ID,Date,User,Task,Client,Hours,Billable,Description\n'
    const rows = report.entries.map((e) => {
      const clientName = e.task.client?.name || e.task.workflow?.client?.name || 'Internal'
      const desc = (e.description || '').replace(/"/g, '""')
      return `"${e.id}","${new Date(e.date).toISOString().slice(0, 10)}","${e.user.full_name}","${e.task.title}","${clientName}",${e.hours},${e.is_billable ? 'Yes' : 'No'},"${desc}"`
    }).join('\n')

    return header + rows
  }
}
