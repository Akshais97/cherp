import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { UserRole } from '../common/enums/user-role.enum'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { RequestUser } from '../common/types/request-user.type'
import { AddAttachmentDto } from './dto/add-attachment.dto'
import { AddCommentDto } from './dto/add-comment.dto'
import { CreateTaskDto } from './dto/create-task.dto'
import { ReviewTaskDto } from './dto/review-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
import { TasksService } from './tasks.service'

const toUuidArray = (val: any, allowUnassigned = false): string[] | undefined => {
  if (!val) return undefined
  const arr = Array.isArray(val) ? val : [val]
  const clean = arr
    .map(v => typeof v === 'string' ? v.trim() : v)
    .filter(v => {
      if (!v) return false
      if (allowUnassigned && v === 'unassigned') return true
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
    })
  return clean.length > 0 ? clean : undefined
}

const toStringArray = (val: any): string[] | undefined => {
  if (!val) return undefined
  const arr = Array.isArray(val) ? val : [val]
  const clean = arr
    .map(v => typeof v === 'string' ? v.trim() : v)
    .filter(Boolean)
  return clean.length > 0 ? clean : undefined
}

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Post()
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager)
  @ApiOkResponse({ description: 'Creates a workflow-independent task.' })
  create(
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.create(dto.workflow_id || null, dto, user)
  }

  @Get('daily-report')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
  @ApiOkResponse({ description: 'Retrieves user task completions and assignments for the daily report.' })
  getDailyReport(
    @Query('date') date: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.getDailyReport(date, user)
  }

  @Get('analytics')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
  @ApiOkResponse({ description: 'Retrieves task analytics aggregated counts.' })
  getAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') targetUserId?: string,
    @Query('clientIds') clientIds?: string[],
    @Query('assigneeIds') assigneeIds?: string[],
    @Query('labels') labels?: string[],
    @Query('priorities') priorities?: string[],
    @Query('statuses') statuses?: string[],
    @Query('slots') slots?: string[],
    @Query('searchText') searchText?: string,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.service.findAnalyticsSummary({
      startDate,
      endDate,
      targetUserId,
      clientIds: toUuidArray(clientIds),
      assigneeIds: toUuidArray(assigneeIds, true),
      labels: toStringArray(labels),
      priorities: toStringArray(priorities),
      statuses: toStringArray(statuses),
      slots: toStringArray(slots),
      searchText,
    }, user!)
  }

  @Get(':id')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
  @ApiOkResponse({ description: 'Retrieves a single task.' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findOne(id, user)
  }

  @Get()
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
  @ApiOkResponse({ description: 'Retrieves all tasks matching the user access scopes and optional filters.' })
  findMany(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') targetUserId?: string,
    @Query('clientIds') clientIds?: string[],
    @Query('assigneeIds') assigneeIds?: string[],
    @Query('labels') labels?: string[],
    @Query('priorities') priorities?: string[],
    @Query('statuses') statuses?: string[],
    @Query('slots') slots?: string[],
    @Query('searchText') searchText?: string,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.service.findMany({
      startDate,
      endDate,
      targetUserId,
      clientIds: toUuidArray(clientIds),
      assigneeIds: toUuidArray(assigneeIds, true),
      labels: toStringArray(labels),
      priorities: toStringArray(priorities),
      statuses: toStringArray(statuses),
      slots: toStringArray(slots),
      searchText,
    }, user!)
  }

  @Patch(':id')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
  @ApiOkResponse({ description: 'Updates a tenant task.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, dto, user)
  }

  @Patch(':id/complete')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
  @ApiOkResponse({ description: 'Completes a tenant task.' })
  complete(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.complete(id, user)
  }

  @Delete(':id')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager)
  @ApiOkResponse({ description: 'Deletes a tenant task and recalculates workflow completion.' })
  delete(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.delete(id, user)
  }

  @Post(':id/comments')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
  @ApiOkResponse({ description: 'Adds a comment to a task.' })
  addComment(
    @Param('id') id: string,
    @Body() dto: AddCommentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.addComment(id, dto.content, user)
  }

  @Get(':id/comments')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
  @ApiOkResponse({ description: 'Retrieves all comments for a task.' })
  getComments(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.getComments(id, user)
  }

  @Post(':id/attachments')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
  @ApiOkResponse({ description: 'Adds an attachment link to a task.' })
  addAttachment(
    @Param('id') id: string,
    @Body() dto: AddAttachmentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.addAttachment(id, dto, user)
  }

  @Get(':id/attachments')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
  @ApiOkResponse({ description: 'Retrieves all attachments for a task.' })
  getAttachments(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.getAttachments(id, user)
  }

  @Delete(':id/attachments/:attachmentId')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
  @ApiOkResponse({ description: 'Deletes a task attachment.' })
  deleteAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.deleteAttachment(id, attachmentId, user)
  }

  @Get(':id/logs')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
  @ApiOkResponse({ description: 'Retrieves audit logs for a task.' })
  getLogs(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.getLogs(id, user)
  }

  @Patch(':id/request-approval')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember)
  @ApiOkResponse({ description: 'Requests approval for a task, moving status to completed.' })
  requestApproval(
    @Param('id') id: string,
    @Body() dto: ReviewTaskDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.requestApproval(id, dto.reason, user)
  }

  @Patch(':id/approve')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager)
  @ApiOkResponse({ description: 'Approves a task, moving status to task_approved_by_manager.' })
  approveTask(
    @Param('id') id: string,
    @Body() dto: ReviewTaskDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.approveTask(id, dto.reason, user)
  }

  @Patch(':id/request-changes')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager)
  @ApiOkResponse({ description: 'Requests changes for a task, moving status to rework.' })
  requestChanges(
    @Param('id') id: string,
    @Body() dto: ReviewTaskDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.requestChanges(id, dto.reason, user)
  }
}
