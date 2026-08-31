import { Controller, Get, Header, Query, Res, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Response } from 'express'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { UserRole } from '../common/enums/user-role.enum'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { RequestUser } from '../common/types/request-user.type'
import { ReportsService } from './reports.service'

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('summary')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.TeamMember, UserRole.Client)
  @ApiOkResponse({ description: 'Executive summary report.' })
  getSummary(
    @Query('clientId') clientId?: string,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.service.getExecutiveSummary(clientId, user!)
  }

  @Get('executive-pdf')
  @Roles(UserRole.SuperAdmin, UserRole.ProjectManager, UserRole.Client)
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="executive-report.pdf"')
  @ApiOkResponse({ description: 'Generates downloadable Executive PDF Report.' })
  async downloadPdf(
    @Res() res: Response,
    @Query('clientId') clientId?: string,
    @CurrentUser() user?: RequestUser,
  ) {
    const pdfBuffer = await this.service.generatePdfReport(clientId, user!)
    res.end(pdfBuffer)
  }
}
