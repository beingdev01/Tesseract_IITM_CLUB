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
exports.InvitationsService = void 0;
const common_1 = require("@nestjs/common");
const activity_service_1 = require("../activity/activity.service");
const app_error_1 = require("../common/app-error");
const prisma_service_1 = require("../prisma/prisma.service");
let InvitationsService = class InvitationsService {
    prisma;
    activity;
    constructor(prisma, activity) {
        this.prisma = prisma;
        this.activity = activity;
    }
    async create(eventId, invitations, actorId) {
        const event = await this.prisma.event.findUnique({ where: { id: eventId } });
        if (!event)
            throw new app_error_1.AppError("not_found", "Event not found.", 404);
        const results = [];
        for (const inv of invitations) {
            if (!inv.userId && !inv.email) {
                continue;
            }
            if (inv.userId) {
                const existing = await this.prisma.eventInvitation.findUnique({
                    where: { eventId_userId: { eventId, userId: inv.userId } }
                });
                if (existing) {
                    results.push({ status: "skipped", userId: inv.userId, reason: "already_invited" });
                    continue;
                }
            }
            const invitation = await this.prisma.eventInvitation.create({
                data: {
                    eventId,
                    userId: inv.userId ?? null,
                    email: inv.email ?? null,
                    guestRole: inv.guestRole,
                    certificate: inv.certificate ?? false
                }
            });
            results.push({ status: "created", id: invitation.id, guestRole: inv.guestRole });
        }
        this.activity
            .log({
            action: "invitation_create",
            title: `Invited ${results.filter((r) => r.status === "created").length} guests to ${event.title}`,
            actorUserId: actorId,
            subjectUserId: actorId,
            meta: { eventId, count: results.length }
        })
            .catch(() => { });
        return { results };
    }
    async accept(invitationId, userId) {
        const invitation = await this.prisma.eventInvitation.findUnique({
            where: { id: invitationId },
            include: { event: { select: { title: true } } }
        });
        if (!invitation)
            throw new app_error_1.AppError("not_found", "Invitation not found.", 404);
        if (invitation.userId && invitation.userId !== userId) {
            throw new app_error_1.AppError("forbidden", "This invitation is not for you.", 403);
        }
        if (invitation.revokedAt) {
            throw new app_error_1.AppError("revoked", "This invitation has been revoked.", 400);
        }
        if (invitation.accepted) {
            return { ok: true, status: "already_accepted" };
        }
        await this.prisma.eventInvitation.update({
            where: { id: invitationId },
            data: { accepted: true, acceptedAt: new Date(), userId }
        });
        const existing = await this.prisma.eventRegistration.findUnique({
            where: { eventId_userId: { eventId: invitation.eventId, userId } }
        });
        if (!existing) {
            await this.prisma.eventRegistration.create({
                data: {
                    eventId: invitation.eventId,
                    userId,
                    registrationType: "GUEST"
                }
            });
        }
        return { ok: true, status: "accepted" };
    }
    async decline(invitationId, userId) {
        const invitation = await this.prisma.eventInvitation.findUnique({ where: { id: invitationId } });
        if (!invitation)
            throw new app_error_1.AppError("not_found", "Invitation not found.", 404);
        if (invitation.userId && invitation.userId !== userId) {
            throw new app_error_1.AppError("forbidden", "This invitation is not for you.", 403);
        }
        await this.prisma.eventInvitation.update({
            where: { id: invitationId },
            data: { revokedAt: new Date() }
        });
        return { ok: true, status: "declined" };
    }
    async myInvitations(userId) {
        return this.prisma.eventInvitation.findMany({
            where: { userId, revokedAt: null },
            include: {
                event: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        startsAt: true,
                        endsAt: true,
                        status: true,
                        coverUrl: true,
                        location: true
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });
    }
    async eventInvitations(eventId) {
        return this.prisma.eventInvitation.findMany({
            where: { eventId },
            include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } }
            },
            orderBy: { createdAt: "desc" }
        });
    }
};
exports.InvitationsService = InvitationsService;
exports.InvitationsService = InvitationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        activity_service_1.ActivityService])
], InvitationsService);
//# sourceMappingURL=invitations.service.js.map