import { ForbiddenException, Injectable } from '@nestjs/common'
import { UserRole } from '../common/enums/user-role.enum'
import { RequestUser } from '../common/types/request-user.type'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getExecutiveSummary(clientId: string | undefined, user: RequestUser) {
    let targetClientId = clientId

    if (user.role === UserRole.Client) {
      const userClientId = (user as any).clientId
      if (userClientId && clientId && clientId !== userClientId) {
        throw new ForbiddenException('Clients can only view reports for their own brand.')
      }
      targetClientId = userClientId || clientId
    }

    const where: any = {
      tenant_id: user.tenantId,
      ...(targetClientId ? { client_id: targetClientId } : {}),
    }

    const [totalTasks, completedTasks, openBlockers, campaignResults] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.count({
        where: {
          ...where,
          status: { in: ['completed', 'task_approved_by_manager', 'task_approved_by_client'] },
        },
      }),
      this.prisma.blocker.count({
        where: {
          tenant_id: user.tenantId,
          status: 'open',
          ...(targetClientId ? { task: { client_id: targetClientId } } : {}),
        },
      }),
      this.prisma.campaignResult
        ? this.prisma.campaignResult.findMany({
            where: {
              tenant_id: user.tenantId,
              ...(targetClientId ? { client_id: targetClientId } : {}),
            },
          })
        : Promise.resolve([]),
    ])

    const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 10000) / 100

    const totalAdSpend = campaignResults.reduce((sum: number, item: any) => sum + Number(item.ad_spend ?? 0), 0)
    const totalLeads = campaignResults.reduce((sum: number, item: any) => sum + (item.leads ?? 0), 0)
    const totalClicks = campaignResults.reduce((sum: number, item: any) => sum + (item.clicks ?? 0), 0)
    const avgCpl = totalLeads > 0 && totalAdSpend > 0 ? totalAdSpend / totalLeads : null

    return {
      client_id: targetClientId || 'all',
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      open_blockers: openBlockers,
      completion_rate: completionRate,
      ppc_summary: {
        total_campaigns: campaignResults.length,
        total_ad_spend: totalAdSpend,
        total_leads: totalLeads,
        total_clicks: totalClicks,
        avg_cpl: avgCpl,
      },
    }
  }

  async generatePdfReport(clientId: string | undefined, user: RequestUser): Promise<Buffer> {
    const summary = await this.getExecutiveSummary(clientId, user)
    const pdfContent = `
%PDF-1.4
===========================================================
               CHERP ERP EXECUTIVE REPORT                  
===========================================================
Client ID: ${summary.client_id}
Total Tasks: ${summary.total_tasks}
Completed Tasks: ${summary.completed_tasks}
Completion Rate: ${summary.completion_rate}%
Open Blockers: ${summary.open_blockers}

---------------- PERFORMANCE MARKETING (PPC) --------------
Total Campaigns Logged: ${summary.ppc_summary.total_campaigns}
Total Ad Spend: ₹${summary.ppc_summary.total_ad_spend.toLocaleString()}
Total Leads: ${summary.ppc_summary.total_leads}
Total Clicks: ${summary.ppc_summary.total_clicks}
Average CPL: ${summary.ppc_summary.avg_cpl != null ? `₹${summary.ppc_summary.avg_cpl.toFixed(2)}` : 'N/A'}
===========================================================
Generated At: ${new Date().toISOString()}
%%EOF
    `
    return Buffer.from(pdfContent.trim(), 'utf-8')
  }
}
