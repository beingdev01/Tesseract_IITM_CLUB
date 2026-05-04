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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const activity_service_1 = require("../activity/activity.service");
const app_error_1 = require("../common/app-error");
const envelope_1 = require("../common/envelope");
const zod_1 = require("../common/zod");
const events_service_1 = require("../events/events.service");
const feature_service_1 = require("../features/feature.service");
const prisma_service_1 = require("../prisma/prisma.service");
const user_service_1 = require("../users/user.service");
const audit_service_1 = require("./audit.service");
let AdminService = class AdminService {
    prisma;
    users;
    events;
    features;
    activity;
    audit;
    constructor(prisma, users, events, features, activity, audit) {
        this.prisma = prisma;
        this.users = users;
        this.events = events;
        this.features = features;
        this.activity = activity;
        this.audit = audit;
    }
    async analytics() {
        const [users, games, events, liveNow] = await Promise.all([
            this.prisma.user.count({ where: { deletedAt: null } }),
            this.prisma.game.count(),
            this.prisma.event.count(),
            this.prisma.activityLog.count({ where: { createdAt: { gte: new Date(Date.now() - 15 * 60_000) } } })
        ]);
        return {
            dau: 0,
            wau: 0,
            mau: 0,
            events,
            games,
            liveNow,
            engagement: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => ({ label, value: 0 })),
            funnel: [
                { stage: "Users", count: users },
                { stage: "Games", count: games },
                { stage: "Events", count: events }
            ]
        };
    }
    async listUsers(query, viewer) {
        const page = (0, zod_1.parseQueryInt)(query.page, 1, 1, 100000);
        const pageSize = (0, zod_1.parseQueryInt)(query.page_size ?? query.limit, 20, 1, 100);
        const search = typeof query.search === "string" ? query.search : typeof query.query === "string" ? query.query : undefined;
        const role = typeof query.role === "string" ? query.role : undefined;
        const where = {
            ...(role ? { role } : {}),
            ...(query.status === "deleted" ? { deletedAt: { not: null } } : { deletedAt: null }),
            ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {})
        };
        const [rows, total] = await Promise.all([
            this.prisma.user.findMany({ where, orderBy: { joinedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
            this.prisma.user.count({ where })
        ]);
        const items = [];
        for (const user of rows)
            items.push(await this.adminUserView(user.id, viewer));
        return (0, envelope_1.withMeta)(items, (0, envelope_1.paginationMeta)(page, pageSize, total));
    }
    async adminUserView(userId, viewer) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new app_error_1.AppError("not_found", "User not found.", 404);
        const [suspension, activeSessions, overrideCount, membershipRequest] = await Promise.all([
            this.prisma.userSuspension.findFirst({ where: { userId, liftedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, orderBy: { createdAt: "desc" } }),
            this.prisma.refreshSession.count({ where: { userId, revokedAt: null, expiresAt: { gt: new Date() } } }),
            this.prisma.userFeatureOverride.count({ where: { userId } }),
            this.prisma.membershipRequest.findFirst({ where: { userId }, orderBy: { requestedAt: "desc" } })
        ]);
        return {
            ...(await this.users.publicUser(user, viewer)),
            suspension,
            activeSessions,
            lastLoginAt: user.lastLoginAt,
            overrideCount,
            membershipRequest
        };
    }
    async userDetail(userId, viewer) {
        const base = await this.adminUserView(userId, viewer);
        const [suspensions, overrides, activity, sessions] = await Promise.all([
            this.prisma.userSuspension.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
            this.prisma.userFeatureOverride.findMany({ where: { userId }, orderBy: { setAt: "desc" } }),
            this.prisma.activityLog.findMany({ where: { subjectUserId: userId }, orderBy: { createdAt: "desc" }, take: 50 }),
            this.prisma.refreshSession.findMany({ where: { userId, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } })
        ]);
        return { ...base, suspensions, overrides, activity, sessions };
    }
    async updateUser(userId, patch, actorId, req) {
        const before = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!before)
            throw new app_error_1.AppError("not_found", "User not found.", 404);
        const after = await this.prisma.user.update({
            where: { id: userId },
            data: {
                ...(typeof patch.name === "string" ? { name: patch.name } : {}),
                ...(typeof patch.bio === "string" || patch.bio === null ? { bio: patch.bio } : {}),
                ...(typeof patch.avatarUrl === "string" || patch.avatarUrl === null ? { avatarUrl: patch.avatarUrl } : {}),
                ...(typeof patch.rollNumber === "string" || patch.rollNumber === null ? { rollNumber: patch.rollNumber } : {}),
                ...(typeof patch.xp === "number" ? { xp: patch.xp, level: (0, user_service_1.levelForXp)(patch.xp) } : {})
            }
        });
        await this.audit.log({ actorId, action: "user.update", targetType: "user", targetId: userId, before, after, request: req, note: typeof patch.reason === "string" ? patch.reason : null });
        return this.users.publicUser(after, { id: actorId, role: "admin" });
    }
    async setRole(userId, role, actorId, req, reason) {
        const before = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!before)
            throw new app_error_1.AppError("not_found", "User not found.", 404);
        if (before.role === "admin" && role !== "admin")
            await this.assertNotLastAdmin(userId);
        const after = await this.prisma.user.update({ where: { id: userId }, data: { role } });
        await this.audit.log({ actorId, action: "user.role.set", targetType: "user", targetId: userId, before, after, request: req, note: reason });
        return this.users.publicUser(after, { id: actorId, role: "admin" });
    }
    async suspend(userId, actorId, reason, req, expiresAt) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new app_error_1.AppError("not_found", "User not found.", 404);
        if (user.role === "admin")
            await this.assertNotLastAdmin(userId);
        const suspension = await this.prisma.userSuspension.create({ data: { userId, suspendedBy: actorId, reason, expiresAt: expiresAt ? new Date(expiresAt) : null } });
        await this.prisma.refreshSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
        await this.audit.log({ actorId, action: "user.suspend", targetType: "user", targetId: userId, before: user, after: suspension, request: req, note: reason });
        return suspension;
    }
    async unsuspend(userId, actorId, req) {
        const before = await this.prisma.userSuspension.findMany({ where: { userId, liftedAt: null } });
        await this.prisma.userSuspension.updateMany({ where: { userId, liftedAt: null }, data: { liftedAt: new Date(), liftedBy: actorId } });
        await this.audit.log({ actorId, action: "user.unsuspend", targetType: "user", targetId: userId, before, after: { lifted: true }, request: req });
        return { ok: true };
    }
    async forceLogout(userId, actorId, req) {
        const before = await this.prisma.refreshSession.count({ where: { userId, revokedAt: null } });
        await this.prisma.refreshSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
        await this.audit.log({ actorId, action: "user.force_logout", targetType: "user", targetId: userId, before: { sessions: before }, after: { sessions: 0 }, request: req });
        return { ok: true };
    }
    async resetOtpAttempts(userId, actorId, req) {
        const user = await this.users.mustGetById(userId);
        await this.prisma.otpChallenge.updateMany({ where: { email: user.email, consumedAt: null }, data: { attempts: 0 } });
        await this.audit.log({ actorId, action: "user.otp_reset", targetType: "user", targetId: userId, before: null, after: { reset: true }, request: req });
        return { ok: true };
    }
    async verifyEmail(userId, actorId, req) {
        const before = await this.users.mustGetById(userId);
        const after = await this.prisma.user.update({ where: { id: userId }, data: { verifiedAt: before.verifiedAt ?? new Date() } });
        await this.audit.log({ actorId, action: "user.email_verified_manual", targetType: "user", targetId: userId, before, after, request: req });
        return this.users.publicUser(after, { id: actorId, role: "admin" });
    }
    async deleteUser(userId, actorId, req) {
        const before = await this.users.mustGetById(userId);
        if (before.role === "admin")
            await this.assertNotLastAdmin(userId);
        const after = await this.prisma.user.update({
            where: { id: userId },
            data: {
                deletedAt: new Date(),
                email: `deleted_${userId}@tesseract.local`,
                name: "Deleted User",
                bio: null,
                avatarUrl: null,
                rollNumber: null
            }
        });
        await this.prisma.refreshSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
        await this.prisma.membershipRequest.updateMany({ where: { userId, status: "pending" }, data: { status: "rejected", reviewerNote: "User deleted" } });
        await this.audit.log({ actorId, action: "user.delete", targetType: "user", targetId: userId, before, after, request: req });
        return { ok: true };
    }
    async membershipRequests(query) {
        const page = (0, zod_1.parseQueryInt)(query.page, 1, 1, 100000);
        const pageSize = (0, zod_1.parseQueryInt)(query.page_size ?? query.limit, 20, 1, 100);
        const status = typeof query.status === "string" ? query.status : undefined;
        const where = status ? { status } : {};
        const [items, total] = await Promise.all([
            this.prisma.membershipRequest.findMany({ where, include: { user: true }, orderBy: { requestedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
            this.prisma.membershipRequest.count({ where })
        ]);
        return (0, envelope_1.withMeta)(items, (0, envelope_1.paginationMeta)(page, pageSize, total));
    }
    async approveMembership(id, actorId, req, note) {
        const before = await this.prisma.membershipRequest.findUnique({ where: { id }, include: { user: true } });
        if (!before)
            throw new app_error_1.AppError("not_found", "Membership request not found.", 404);
        if (before.status !== "pending")
            throw new app_error_1.AppError("closed", "Membership request is already closed.", 409);
        const after = await this.prisma.membershipRequest.update({ where: { id }, data: { status: "approved", reviewedAt: new Date(), reviewedById: actorId, reviewerNote: note ?? null } });
        await this.prisma.user.update({ where: { id: before.userId }, data: { role: "member" } });
        await this.activity.log({ action: "membership_approved", title: "Membership approved", actorUserId: actorId, subjectUserId: before.userId, description: note ?? null });
        await this.activity.notify(before.userId, "Membership approved", "You're now a Tesseract member.", "success");
        await this.audit.log({ actorId, action: "member.approve", targetType: "membership_request", targetId: id, before, after, request: req, note });
        return after;
    }
    async rejectMembership(id, actorId, req, note) {
        const before = await this.prisma.membershipRequest.findUnique({ where: { id } });
        if (!before)
            throw new app_error_1.AppError("not_found", "Membership request not found.", 404);
        if (before.status !== "pending")
            throw new app_error_1.AppError("closed", "Membership request is already closed.", 409);
        const after = await this.prisma.membershipRequest.update({ where: { id }, data: { status: "rejected", reviewedAt: new Date(), reviewedById: actorId, reviewerNote: note } });
        await this.activity.log({ action: "membership_rejected", title: "Membership rejected", actorUserId: actorId, subjectUserId: before.userId, description: note });
        await this.audit.log({ actorId, action: "member.reject", targetType: "membership_request", targetId: id, before, after, request: req, note });
        return after;
    }
    async forceAddParticipant(eventId, userId, actorId, req) {
        const before = await this.prisma.eventParticipant.findUnique({ where: { eventId_userId: { eventId, userId } } });
        const participant = await this.prisma.eventParticipant.upsert({
            where: { eventId_userId: { eventId, userId } },
            update: { status: "registered" },
            create: { eventId, userId, status: "registered" }
        });
        if (!before)
            await this.prisma.event.update({ where: { id: eventId }, data: { registeredCount: { increment: 1 } } });
        await this.audit.log({ actorId, action: "event.participant.force_add", targetType: "event", targetId: eventId, before, after: participant, request: req });
        return { participantStatus: "registered" };
    }
    async forceRemoveParticipant(eventId, userId, actorId, req) {
        const before = await this.prisma.eventParticipant.findUnique({ where: { eventId_userId: { eventId, userId } } });
        if (before) {
            await this.prisma.eventParticipant.delete({ where: { eventId_userId: { eventId, userId } } });
            await this.prisma.event.update({ where: { id: eventId }, data: { registeredCount: { decrement: 1 } } });
        }
        await this.audit.log({ actorId, action: "event.participant.force_remove", targetType: "event", targetId: eventId, before, after: null, request: req });
        return { ok: true };
    }
    async setEventStatus(eventId, status, actorId, req) {
        const before = await this.prisma.event.findUnique({ where: { id: eventId } });
        if (!before)
            throw new app_error_1.AppError("not_found", "Event not found.", 404);
        const after = await this.prisma.event.update({ where: { id: eventId }, data: { status } });
        await this.audit.log({ actorId, action: "event.status.set", targetType: "event", targetId: eventId, before, after, request: req });
        return this.events.publicEvent(after, false);
    }
    async broadcastNotification(actorId, req, input) {
        const where = { deletedAt: null, ...(input.targetRole && input.targetRole !== "all" ? { role: input.targetRole } : {}) };
        const users = await this.prisma.user.findMany({ where, select: { id: true } });
        if (users.length) {
            await this.prisma.notification.createMany({ data: users.map((user) => ({ userId: user.id, title: input.title, body: input.body, kind: input.kind })) });
        }
        await this.audit.log({ actorId, action: "notification.broadcast", targetType: "notification", targetId: "broadcast", before: null, after: { recipientCount: users.length }, request: req });
        return { recipientCount: users.length };
    }
    async notifyUser(actorId, userId, req, input) {
        const notification = await this.prisma.notification.create({ data: { userId, title: input.title, body: input.body, kind: input.kind } });
        await this.audit.log({ actorId, action: "notification.user", targetType: "notification", targetId: notification.id, before: null, after: notification, request: req });
        return notification;
    }
    async statsOverview() {
        const now = Date.now();
        const [total, guest, member, core, admin, suspended, deleted, pendingRequests, eventsTotal, upcoming, live, past, cancelled, totalRSVPs, activeSessions] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.user.count({ where: { role: "guest", deletedAt: null } }),
            this.prisma.user.count({ where: { role: "member", deletedAt: null } }),
            this.prisma.user.count({ where: { role: "core", deletedAt: null } }),
            this.prisma.user.count({ where: { role: "admin", deletedAt: null } }),
            this.prisma.userSuspension.count({ where: { liftedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } }),
            this.prisma.user.count({ where: { deletedAt: { not: null } } }),
            this.prisma.membershipRequest.count({ where: { status: "pending" } }),
            this.prisma.event.count(),
            this.prisma.event.count({ where: { status: "upcoming" } }),
            this.prisma.event.count({ where: { status: "live" } }),
            this.prisma.event.count({ where: { status: { in: ["past", "completed"] } } }),
            this.prisma.event.count({ where: { status: "cancelled" } }),
            this.prisma.eventParticipant.count(),
            this.prisma.refreshSession.count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } })
        ]);
        return {
            users: {
                total,
                byRole: { guest, member, core, admin },
                suspended,
                deleted,
                active7d: await this.prisma.user.count({ where: { lastSeenAt: { gte: new Date(now - 7 * 24 * 60 * 60_000) } } }),
                active30d: await this.prisma.user.count({ where: { lastSeenAt: { gte: new Date(now - 30 * 24 * 60 * 60_000) } } }),
                signups7d: await this.prisma.user.count({ where: { joinedAt: { gte: new Date(now - 7 * 24 * 60 * 60_000) } } }),
                signups30d: await this.prisma.user.count({ where: { joinedAt: { gte: new Date(now - 30 * 24 * 60 * 60_000) } } })
            },
            members: { total: member + core + admin, pendingRequests },
            events: { total: eventsTotal, upcoming, live, past, cancelled, totalRSVPs },
            activity: {
                last24h: await this.prisma.activityLog.count({ where: { createdAt: { gte: new Date(now - 24 * 60 * 60_000) } } }),
                last7d: await this.prisma.activityLog.count({ where: { createdAt: { gte: new Date(now - 7 * 24 * 60 * 60_000) } } })
            },
            sessions: { active: activeSessions }
        };
    }
    async auditLogs(query) {
        const page = (0, zod_1.parseQueryInt)(query.page, 1, 1, 100000);
        const pageSize = (0, zod_1.parseQueryInt)(query.page_size ?? query.limit, 20, 1, 100);
        const where = {
            ...(typeof query.actor === "string" ? { actorId: query.actor } : {}),
            ...(typeof query.action === "string" ? { action: query.action } : {}),
            ...(typeof query.targetType === "string" ? { targetType: query.targetType } : {}),
            ...(typeof query.targetId === "string" ? { targetId: query.targetId } : {})
        };
        const [items, total] = await Promise.all([
            this.prisma.adminAuditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
            this.prisma.adminAuditLog.count({ where })
        ]);
        return (0, envelope_1.withMeta)(items, (0, envelope_1.paginationMeta)(page, pageSize, total));
    }
    async assertNotLastAdmin(userId) {
        const admins = await this.prisma.user.count({ where: { role: "admin", deletedAt: null, id: { not: userId } } });
        if (admins <= 0)
            throw new app_error_1.AppError("last_admin", "Cannot modify the only remaining admin.", 422);
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        user_service_1.UserService,
        events_service_1.EventsService,
        feature_service_1.FeatureService,
        activity_service_1.ActivityService,
        audit_service_1.AuditService])
], AdminService);
//# sourceMappingURL=admin.service.js.map