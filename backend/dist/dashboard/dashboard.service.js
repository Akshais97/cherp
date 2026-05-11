"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
let DashboardService = class DashboardService {
    getSummary() {
        return {
            activeClients: 8,
            activeWorkflows: 14,
            taskCompletionRate: 87,
            openBlockers: 3,
            teamUtilization: 74,
        };
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
        ];
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)()
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map