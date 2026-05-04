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
exports.AnnouncementsService = void 0;
const common_1 = require("@nestjs/common");
const activity_service_1 = require("../activity/activity.service");
const app_error_1 = require("../common/app-error");
const envelope_1 = require("../common/envelope");
const sanitize_1 = require("../common/sanitize");
const zod_1 = require("../common/zod");
const prisma_service_1 = require("../prisma/prisma.service");
let AnnouncementsService = class AnnouncementsService {
    prisma;
    activity;
    constructor(prisma, activity) {
        this.prisma = prisma;
        this.activity = activity;
    }
    async list(query) {
        const page = (0, zod_1.parseQueryInt)(query.page, 1, 1, 100000);
        const pageSize = (0, zod_1.parseQueryInt)(query.page_size ?? query.limit, 20, 1, 100);
        const [items, total] = await Promise.all([
            this.prisma.announcement.findMany({
                orderBy: [{ pinned: "desc" }, { priority: "desc" }, { publishedAt: "desc" }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    createdBy: { select: { id: true, name: true, avatarUrl: true } }
                }
            }),
            this.prisma.announcement.count()
        ]);
        return (0, envelope_1.withMeta)(items, (0, envelope_1.paginationMeta)(page, pageSize, total));
    }
    async get(id) {
        const announcement = await this.prisma.announcement.findUnique({
            where: { id },
            include: {
                createdBy: { select: { id: true, name: true, avatarUrl: true } }
            }
        });
        if (!announcement)
            throw new app_error_1.AppError("not_found", "Announcement not found.", 404);
        return announcement;
    }
    async create(payload, actorId) {
        const announcement = await this.prisma.announcement.create({
            data: {
                title: payload.title,
                content: (0, sanitize_1.sanitizeHtml)(payload.content) ?? payload.content,
                priority: payload.priority ?? 0,
                pinned: payload.pinned ?? false,
                createdById: actorId
            }
        });
        this.activity
            .log({
            action: "announcement_create",
            title: `Created announcement: ${announcement.title}`,
            actorUserId: actorId,
            subjectUserId: actorId,
            meta: { announcementId: announcement.id }
        })
            .catch(() => { });
        return announcement;
    }
    async update(id, patch, actorId) {
        const existing = await this.prisma.announcement.findUnique({ where: { id } });
        if (!existing)
            throw new app_error_1.AppError("not_found", "Announcement not found.", 404);
        const updated = await this.prisma.announcement.update({
            where: { id },
            data: {
                ...(patch.title !== undefined ? { title: patch.title } : {}),
                ...(patch.content !== undefined ? { content: (0, sanitize_1.sanitizeHtml)(patch.content) ?? patch.content } : {}),
                ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
                ...(patch.pinned !== undefined ? { pinned: patch.pinned } : {})
            }
        });
        return updated;
    }
    async remove(id, actorId) {
        const existing = await this.prisma.announcement.findUnique({ where: { id } });
        if (!existing)
            throw new app_error_1.AppError("not_found", "Announcement not found.", 404);
        await this.prisma.announcement.delete({ where: { id } });
        this.activity
            .log({
            action: "announcement_delete",
            title: `Deleted announcement: ${existing.title}`,
            actorUserId: actorId,
            subjectUserId: actorId,
            meta: { announcementId: id }
        })
            .catch(() => { });
        return { ok: true };
    }
};
exports.AnnouncementsService = AnnouncementsService;
exports.AnnouncementsService = AnnouncementsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        activity_service_1.ActivityService])
], AnnouncementsService);
//# sourceMappingURL=announcements.service.js.map