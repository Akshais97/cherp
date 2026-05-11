import { Injectable } from '@nestjs/common'

@Injectable()
export class DashboardService {
  getSummary() {
    return {
      activeClients: 8,
      activeWorkflows: 14,
      taskCompletionRate: 87,
      openBlockers: 3,
      teamUtilization: 74,
    }
  }

  getClientHealth() {
    return [
      { client: 'Bright Homes', progress: 87, status: 'on_track', blockers: 1 },
      {
        client: 'TechFlow Solutions',
        progress: 67,
        status: 'at_risk',
        blockers: 0,
      },
      { client: 'DataStream Inc', progress: 45, status: 'off_track', blockers: 2 },
      { client: 'Nova Finance', progress: 92, status: 'on_track', blockers: 0 },
    ]
  }
}
