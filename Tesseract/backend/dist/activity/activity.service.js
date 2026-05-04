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
exports.ActivityService = void 0;
const common_1 = require("@nestjs/common");
const app_error_1 = require("../common/app-error");
const envelope_1 = require("../common/envelope");
const zod_1 = require("../common/zod");
const feature_service_1 = require("../features/feature.service");
const prisma_service_1 = require("../prisma/prisma.service");
let ActivityService = class ActivityService {
    prisma;
    features;
    constructor(prisma, features) {
        this.prisma = prisma;
        this.features = features;
    }
    async log(input) {
        return this.prisma.activityLog.create({
            data: {
                action: input.action,
                title: input.title,
                actorUserId: input.actorUserId ?? null,
                subjectUserId: input.subjectUserId ?? null,
                description: input.description ?? null,
                meta: (input.meta ?? {}),
                xpDelta: input.xpDelta ?? 0
            }
        });
    }
    async notify(userId, title, body, kind = "info", meta = {}) {
        const enabled = await this.features.isEnabledForUser(userId, "notifications.in_app_enabled");
        if (!enabled)
            return null;
        return this.prisma.notification.create({ data: { userId, title, body, kind, meta: meta } });
    }
    async listForUser(viewerId, viewerRole, query) {
        const requested = typeof query.user === "string" ? query.user : typeof query.userId === "string" ? query.userId : "me";
        const targetUserId = requested === "me" ? viewerId : requested;
        if (targetUserId !== viewerId && !["core", "admin"].includes(viewerRole)) {
            const flags = await this.features.resolveForUser(targetUserId);
            if (flags["activity.feed_visibility"] !== "public" && flags["activity.feed_visibility"] !== "members") {
                throw new app_error_1.AppError("forbidden", "You do not have access to this activity feed.", 403);
            }
        }
        const page = (0, zod_1.parseQueryInt)(query.page, 1, 1, 100000);
        const pageSize = (0, zod_1.parseQueryInt)(query.page_size, 20, 1, 100);
        const where = {
            subjectUserId: targetUserId,
            ...(typeof query.type === "string" ? { action: query.type } : {})
        };
        const [items, total] = await Promise.all([
            this.prisma.activityLog.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize
            }),
            this.prisma.activityLog.count({ where })
        ]);
        return (0, envelope_1.withMeta)(items.map((item) => ({
            id: item.id,
            type: item.action,
            title: item.title,
            description: item.description,
            at: item.createdAt,
            meta: item.meta
        })), (0, envelope_1.paginationMeta)(page, pageSize, total));
    }
    async notifications(userId, query) {
        const page = (0, zod_1.parseQueryInt)(query.page, 1, 1, 100000);
        const pageSize = (0, zod_1.parseQueryInt)(query.page_size, 20, 1, 100);
        const [items, total] = await Promise.all([
            this.prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize
            }),
            this.prisma.notification.count({ where: { userId } })
        ]);
        return (0, envelope_1.withMeta)(items.map((item) => ({
            id: item.id,
            title: item.title,
            body: item.body,
            at: item.createdAt,
            read: item.readAt != null,
            kind: item.kind
        })), (0, envelope_1.paginationMeta)(page, pageSize, total));
    }
    async markNotificationRead(id, userId) {
        const notification = await this.prisma.notification.findFirst({ where: { id, userId } });
        if (!notification)
            throw new app_error_1.AppError("not_found", "Notification not found.", 404);
        await this.prisma.notification.update({ where: { id }, data: { readAt: notification.readAt ?? new Date() } });
        return { ok: true };
    }
};
exports.ActivityService = ActivityService;
exports.ActivityService = ActivityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        feature_service_1.FeatureService])
], ActivityService);
//# sourceMappingURL=activity.service.js.map