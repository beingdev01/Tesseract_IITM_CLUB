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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const decorators_1 = require("../common/decorators");
const zod_2 = require("../common/zod");
const feature_service_1 = require("../features/feature.service");
const prisma_service_1 = require("../prisma/prisma.service");
const admin_service_1 = require("./admin.service");
const audit_service_1 = require("./audit.service");
const roleSchema = zod_1.z.object({ role: zod_1.z.enum(["guest", "member", "core", "admin"]), reason: zod_1.z.string().optional() });
const suspendSchema = zod_1.z.object({ reason: zod_1.z.string().min(1), expiresAt: zod_1.z.string().datetime().optional() });
const noteSchema = zod_1.z.object({ note: zod_1.z.string().optional().nullable(), reviewerNote: zod_1.z.string().optional().nullable() });
const rejectSchema = zod_1.z.object({ note: zod_1.z.string().min(1), reviewerNote: zod_1.z.string().optional() });
const statusSchema = zod_1.z.object({ status: zod_1.z.enum(["upcoming", "live", "completed", "past", "cancelled"]) });
const flagDefaultSchema = zod_1.z.object({ defaultValue: zod_1.z.unknown() });
const flagOverrideSchema = zod_1.z.object({ value: zod_1.z.unknown(), reason: zod_1.z.string().optional() });
const notificationSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(255),
    body: zod_1.z.string().min(1),
    kind: zod_1.z.enum(["info", "success", "warning", "event", "game"]),
    targetRole: zod_1.z.enum(["all", "guest", "member", "core", "admin"]).optional()
});
let AdminController = class AdminController {
    admin;
    features;
    prisma;
    audit;
    constructor(admin, features, prisma, audit) {
        this.admin = admin;
        this.features = features;
        this.prisma = prisma;
        this.audit = audit;
    }
    async analytics() {
        return this.admin.analytics();
    }
    async users(query, req) {
        return this.admin.listUsers(query, req.user);
    }
    async userFeatures(id) {
        return this.features.detailForUser(id);
    }
    async setUserFeature(id, key, body, req) {
        const payload = (0, zod_2.parseBody)(flagOverrideSchema, body);
        const before = await this.prisma.userFeatureOverride.findUnique({ where: { userId_flagKey: { userId: id, flagKey: key } } });
        const after = await this.features.setUserOverride(id, key, payload.value, req.user.id, payload.reason);
        await this.audit.log({ actorId: req.user.id, action: "flag.user.override.set", targetType: "flag", targetId: `${id}:${key}`, before, after, request: req, note: payload.reason });
        return after;
    }
    async removeUserFeature(id, key, req) {
        const before = await this.features.removeUserOverride(id, key);
        await this.audit.log({ actorId: req.user.id, action: "flag.user.override.remove", targetType: "flag", targetId: `${id}:${key}`, before, after: null, request: req });
        return { ok: true };
    }
    async userDetail(id, req) {
        return this.admin.userDetail(id, req.user);
    }
    async updateUser(id, body, req) {
        return this.admin.updateUser(id, body, req.user.id, req);
    }
    async setRole(id, body, req) {
        const payload = (0, zod_2.parseBody)(roleSchema, body);
        return this.admin.setRole(id, payload.role, req.user.id, req, payload.reason);
    }
    async suspend(id, body, req) {
        const payload = (0, zod_2.parseBody)(suspendSchema, body);
        return this.admin.suspend(id, req.user.id, payload.reason, req, payload.expiresAt);
    }
    async unsuspend(id, req) {
        return this.admin.unsuspend(id, req.user.id, req);
    }
    async forceLogout(id, req) {
        return this.admin.forceLogout(id, req.user.id, req);
    }
    async resetOtp(id, req) {
        return this.admin.resetOtpAttempts(id, req.user.id, req);
    }
    async verifyEmail(id, req) {
        return this.admin.verifyEmail(id, req.user.id, req);
    }
    async deleteUser(id, req) {
        return this.admin.deleteUser(id, req.user.id, req);
    }
    async membershipRequests(query) {
        return this.admin.membershipRequests(query);
    }
    async approveMembership(id, body, req) {
        const payload = (0, zod_2.parseBody)(noteSchema, body);
        return this.admin.approveMembership(id, req.user.id, req, payload.note ?? payload.reviewerNote);
    }
    async rejectMembership(id, body, req) {
        const payload = (0, zod_2.parseBody)(rejectSchema, body);
        return this.admin.rejectMembership(id, req.user.id, req, payload.note || payload.reviewerNote || "");
    }
    async forceAddParticipant(id, userId, req) {
        return this.admin.forceAddParticipant(id, userId, req.user.id, req);
    }
    async forceRemoveParticipant(id, userId, req) {
        return this.admin.forceRemoveParticipant(id, userId, req.user.id, req);
    }
    async setEventStatus(id, body, req) {
        const payload = (0, zod_2.parseBody)(statusSchema, body);
        return this.admin.setEventStatus(id, payload.status, req.user.id, req);
    }
    async listFeatures() {
        return this.features.listFlags();
    }
    async updateFeature(key, body, req) {
        const payload = (0, zod_2.parseBody)(flagDefaultSchema, body);
        const before = await this.prisma.featureFlag.findUnique({ where: { key } });
        const after = await this.features.updateGlobalDefault(key, payload.defaultValue);
        await this.audit.log({ actorId: req.user.id, action: "flag.global.update", targetType: "flag", targetId: key, before, after, request: req });
        return after;
    }
    async featureOverrides(key) {
        return this.features.overridesForFlag(key);
    }
    async broadcast(body, req) {
        return this.admin.broadcastNotification(req.user.id, req, (0, zod_2.parseBody)(notificationSchema, body));
    }
    async notifyUser(id, body, req) {
        const payload = (0, zod_2.parseBody)(notificationSchema.omit({ targetRole: true }), body);
        return this.admin.notifyUser(req.user.id, id, req, payload);
    }
    async statsOverview() {
        return this.admin.statsOverview();
    }
    async signupsTimeline(daysRaw) {
        const days = Number.parseInt(daysRaw ?? "30", 10) || 30;
        const rows = [];
        for (let i = days - 1; i >= 0; i -= 1) {
            const date = new Date(Date.now() - i * 24 * 60 * 60_000);
            const start = new Date(date);
            start.setUTCHours(0, 0, 0, 0);
            const end = new Date(start.getTime() + 24 * 60 * 60_000);
            rows.push({
                date: start.toISOString().slice(0, 10),
                count: await this.prisma.user.count({ where: { joinedAt: { gte: start, lt: end } } })
            });
        }
        return rows;
    }
    async auditLogs(query) {
        return this.admin.auditLogs(query);
    }
    async auditLog(id) {
        return this.prisma.adminAuditLog.findUniqueOrThrow({ where: { id } });
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)("analytics"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "analytics", null);
__decorate([
    (0, common_1.Get)("users"),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "users", null);
__decorate([
    (0, common_1.Get)("users/:id/features"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "userFeatures", null);
__decorate([
    (0, common_1.Put)("users/:id/features/:key"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("key")),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "setUserFeature", null);
__decorate([
    (0, common_1.Delete)("users/:id/features/:key"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("key")),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "removeUserFeature", null);
__decorate([
    (0, common_1.Get)("users/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "userDetail", null);
__decorate([
    (0, common_1.Patch)("users/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateUser", null);
__decorate([
    (0, common_1.Patch)("users/:id/role"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "setRole", null);
__decorate([
    (0, common_1.Post)("users/:id/suspend"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "suspend", null);
__decorate([
    (0, common_1.Post)("users/:id/unsuspend"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "unsuspend", null);
__decorate([
    (0, common_1.Post)("users/:id/force-logout"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "forceLogout", null);
__decorate([
    (0, common_1.Post)("users/:id/reset-otp-attempts"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "resetOtp", null);
__decorate([
    (0, common_1.Post)("users/:id/verify-email"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "verifyEmail", null);
__decorate([
    (0, common_1.Delete)("users/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteUser", null);
__decorate([
    (0, common_1.Get)("membership-requests"),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "membershipRequests", null);
__decorate([
    (0, common_1.Post)("membership-requests/:id/approve"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "approveMembership", null);
__decorate([
    (0, common_1.Post)("membership-requests/:id/reject"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "rejectMembership", null);
__decorate([
    (0, common_1.Post)("events/:id/participants/:userId"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("userId")),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "forceAddParticipant", null);
__decorate([
    (0, common_1.Delete)("events/:id/participants/:userId"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("userId")),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "forceRemoveParticipant", null);
__decorate([
    (0, common_1.Patch)("events/:id/status"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "setEventStatus", null);
__decorate([
    (0, common_1.Get)("features"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listFeatures", null);
__decorate([
    (0, common_1.Patch)("features/:key"),
    __param(0, (0, common_1.Param)("key")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateFeature", null);
__decorate([
    (0, common_1.Get)("features/:key/overrides"),
    __param(0, (0, common_1.Param)("key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "featureOverrides", null);
__decorate([
    (0, common_1.Post)("notifications/broadcast"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "broadcast", null);
__decorate([
    (0, common_1.Post)("notifications/user/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "notifyUser", null);
__decorate([
    (0, common_1.Get)("stats/overview"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "statsOverview", null);
__decorate([
    (0, common_1.Get)("stats/signups-timeline"),
    __param(0, (0, common_1.Query)("days")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "signupsTimeline", null);
__decorate([
    (0, common_1.Get)("audit-logs"),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "auditLogs", null);
__decorate([
    (0, common_1.Get)("audit-logs/:id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "auditLog", null);
exports.AdminController = AdminController = __decorate([
    (0, decorators_1.Roles)("admin"),
    (0, common_1.Controller)("admin"),
    __metadata("design:paramtypes", [admin_service_1.AdminService,
        feature_service_1.FeatureService,
        prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map