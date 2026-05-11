"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const supabase_js_1 = require("@supabase/supabase-js");
const user_role_enum_1 = require("../enums/user-role.enum");
let JwtAuthGuard = class JwtAuthGuard {
    configService;
    supabase;
    constructor(configService) {
        this.configService = configService;
        const url = this.configService.get('SUPABASE_URL');
        const serviceKey = this.configService.get('SUPABASE_SERVICE_ROLE_KEY');
        if (!url || !serviceKey) {
            throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
        }
        this.supabase = (0, supabase_js_1.createClient)(url, serviceKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const token = this.getBearerToken(request);
        const { data, error } = await this.supabase.auth.getUser(token);
        if (error || !data.user) {
            throw new common_1.UnauthorizedException('Invalid or expired access token.');
        }
        const metadata = data.user.user_metadata;
        const role = this.toRole(metadata.role);
        const tenantId = metadata.tenant_id;
        if (!tenantId || metadata.is_active === false) {
            throw new common_1.UnauthorizedException('User is inactive or missing tenant context.');
        }
        request.user = {
            id: metadata.erp_user_id ?? data.user.id,
            authUserId: data.user.id,
            tenantId,
            email: data.user.email ?? '',
            fullName: metadata.full_name ??
                metadata.name ??
                data.user.email?.split('@')[0] ??
                'Agency User',
            role,
            avatarUrl: metadata.avatar_url,
            isActive: metadata.is_active !== false,
        };
        return true;
    }
    getBearerToken(request) {
        const authorization = request.headers.authorization;
        if (!authorization?.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('Bearer token is required.');
        }
        return authorization.slice('Bearer '.length);
    }
    toRole(value) {
        if (value === user_role_enum_1.UserRole.SuperAdmin ||
            value === user_role_enum_1.UserRole.ProjectManager ||
            value === user_role_enum_1.UserRole.TeamMember ||
            value === user_role_enum_1.UserRole.Client) {
            return value;
        }
        throw new common_1.UnauthorizedException('User role is not allowed.');
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], JwtAuthGuard);
//# sourceMappingURL=jwt-auth.guard.js.map