import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getSummary(): {
        activeClients: number;
        activeWorkflows: number;
        taskCompletionRate: number;
        openBlockers: number;
        teamUtilization: number;
    };
    getClientHealth(): {
        client: string;
        progress: number;
        status: string;
        blockers: number;
    }[];
}
