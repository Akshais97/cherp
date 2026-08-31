import { Body, Controller, Delete, Get, Header, Param, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { UserRole } from '../common/enums/user-role.enum'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { RequestUser } from '../common/types/request-user.type'
import { CreateTimeEntryDto } from './dto/create-time-entry.dto'
import { TimeEntryReportQueryDto } from './dto/time-entry-report-query.dto'
import { TimeEntriesService } from './time-entries.service'

@ApiTags('Time Entries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class TimeEntriesController {
  constructor(private readonly service: TimeEntriesService) {}

  @Post('tasks/:taskId/time-entries')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
  @ApiCreatedResponse({ description: 'Logs a time entry against a task.' })
  create(
    @Param('taskId') taskId: string,
    @Body() dto: CreateTimeEntryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.create(taskId, dto, user)
  }

  @Get('tasks/:taskId/time-entries')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
  @ApiOkResponse({ description: 'Retrieves all time entries for a task.' })
  findByTask(
    @Param('taskId') taskId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findByTask(taskId, user)
  }

  @Delete('time-entries/:id')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
  @ApiOkResponse({ description: 'Deletes a time entry.' })
  delete(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.delete(id, user)
  }

  @Get('time-entries/report')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
  @ApiOkResponse({ description: 'Aggregates time entries report by client/user/date range.' })
  getReport(
    @Query() query: TimeEntryReportQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.getReport(query, user)
  }

  @Get('time-entries/export.csv')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="time-entries-report.csv"')
  @ApiOkResponse({ description: 'Exports time entries report as CSV file.' })
  exportCsv(
    @Query() query: TimeEntryReportQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.generateCsvExport(query, user)
  }
}
