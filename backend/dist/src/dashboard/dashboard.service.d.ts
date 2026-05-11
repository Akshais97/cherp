export declare class DashboardService {
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
