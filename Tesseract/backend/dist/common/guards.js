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
exports.FeatureGuard = exports.SuspensionGuard = exports.RoleGuard = exports.AuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const auth_service_1 = require("../auth/auth.service");
const feature_service_1 = require("../features/feature.service");
const prisma_service_1 = require("../prisma/prisma.service");
const app_error_1 = require("./app-error");
const decorators_1 = require("./decorators");
const types_1 = require("./types");
const cache_service_1 = require("./cache.service");
const env_1 = require("../config/env");
let AuthGuard = class AuthGuard {
    reflector;
    auth;
    prisma;
    cache;
    constructor(reflector, auth, prisma, cache) {
        this.reflector = reflector;
        this.auth = auth;
        this.prisma = prisma;
        this.cache = cache;
    }
    async canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(decorators_1.PUBLIC_ROUTE, [context.getHandler(), context.getClass()]);
        if (isPublic)
            return true;
        const req = context.switchToHttp().getRequest();
        const header = req.headers.authorization;
        if (!header?.startsWith("Bearer "))
            throw new app_error_1.AppError("unauthenticated", "Authentication required.", 401);
        const token = header.slice("Bearer ".length);
        const payload = this.auth.verifyAccessToken(token);
        const blacklisted = await this.cache.getJson(`blacklist:access:${payload.jti}`);
        if (blacklisted)
            throw new app_error_1.AppError("invalid_token", "Invalid or expired access token.", 401);
        const user = await this.prisma.user.findFirst({
            where: { id: payload.sub, deletedAt: null },
            select: { id: true, role: true, email: true }
        });
        if (!user)
            throw new app_error_1.AppError("unauthenticated", "Authentication required.", 401);
        const count = await this.cache.incrementWithTtl(`rate:user:${user.id}`, 60);
        if (count > env_1.env.userRateLimitPerMinute)
            throw new app_error_1.AppError("rate_limited", "Too many requests.", 429);
        req.user = user;
        return true;
    }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        auth_service_1.AuthService,
        prisma_service_1.PrismaService,
        cache_service_1.CacheService])
], AuthGuard);
let RoleGuard = class RoleGuard {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const roles = this.reflector.getAllAndOverride(decorators_1.ROLES, [context.getHandler(), context.getClass()]);
        if (!roles?.length)
            return true;
        const req = context.switchToHttp().getRequest();
        const user = req.user;
        if (!user)
            throw new app_error_1.AppError("unauthenticated", "Authentication required.", 401);
        const allowed = roles.some((role) => (0, types_1.hasMinRole)(user.role, role));
        if (!allowed)
            throw new app_error_1.AppError("forbidden", "You do not have access to this resource.", 403);
        return true;
    }
};
exports.RoleGuard = RoleGuard;
exports.RoleGuard = RoleGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], RoleGuard);
let SuspensionGuard = class SuspensionGuard {
    reflector;
    prisma;
    constructor(reflector, prisma) {
        this.reflector = reflector;
        this.prisma = prisma;
    }
    async canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(decorators_1.PUBLIC_ROUTE, [context.getHandler(), context.getClass()]);
        const allowSuspended = this.reflector.getAllAndOverride(decorators_1.ALLOW_SUSPENDED, [context.getHandler(), context.getClass()]);
        if (isPublic || allowSuspended)
            return true;
        const req = context.switchToHttp().getRequest();
        if (!req.user)
            return true;
        const suspension = await this.prisma.userSuspension.findFirst({
            where: {
                userId: req.user.id,
                liftedAt: null,
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
            },
            orderBy: { createdAt: "desc" }
        });
        if (!suspension)
            return true;
        throw new app_error_1.AppError("suspended", "Your account is suspended.", 403, {
            until: suspension.expiresAt,
            reason: suspension.reason
        });
    }
};
exports.SuspensionGuard = SuspensionGuard;
exports.SuspensionGuard = SuspensionGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        prisma_service_1.PrismaService])
], SuspensionGuard);
let FeatureGuard = class FeatureGuard {
    reflector;
    features;
    constructor(reflector, features) {
        this.reflector = reflector;
        this.features = features;
    }
    async canActivate(context) {
        const key = this.reflector.getAllAndOverride(decorators_1.FEATURE_FLAG, [context.getHandler(), context.getClass()]);
        if (!key)
            return true;
        const req = context.switchToHttp().getRequest();
        if (!req.user)
            throw new app_error_1.AppError("unauthenticated", "Authentication required.", 401);
        const enabled = await this.features.isEnabledForUser(req.user.id, key);
        if (!enabled)
            throw new app_error_1.AppError("feature_disabled", "This feature is currently disabled.", 403, { flag: key });
        return true;
    }
};
exports.FeatureGuard = FeatureGuard;
exports.FeatureGuard = FeatureGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        feature_service_1.FeatureService])
], FeatureGuard);
//# sourceMappingURL=guards.js.map