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
exports.TeamsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const activity_service_1 = require("../activity/activity.service");
const app_error_1 = require("../common/app-error");
const attendance_token_1 = require("../common/attendance-token");
const invite_code_1 = require("../common/invite-code");
const registration_status_1 = require("../common/registration-status");
const registration_fields_1 = require("../common/registration-fields");
const prisma_service_1 = require("../prisma/prisma.service");
const TRANSACTION_RETRIES = 3;
let TeamsService = class TeamsService {
    prisma;
    activity;
    constructor(prisma, activity) {
        this.prisma = prisma;
        this.activity = activity;
    }
    async createTeam(eventId, userId, teamName, customFieldResponses) {
        let result = null;
        for (let attempt = 0; attempt < TRANSACTION_RETRIES; attempt++) {
            const registrationId = (0, crypto_1.randomUUID)();
            try {
                result = await this.prisma.$transaction(async (tx) => {
                    const event = await tx.event.findUnique({
                        where: { id: eventId },
                        include: {
                            _count: {
                                select: {
                                    registrations: { where: { registrationType: "PARTICIPANT" } }
                                }
                            }
                        }
                    });
                    if (!event)
                        throw new app_error_1.AppError("not_found", "Event not found.", 404);
                    if (!event.teamRegistration) {
                        throw new app_error_1.AppError("not_team_event", "This event does not support team registration.", 400);
                    }
                    if (event.endsAt.getTime() < Date.now() ||
                        ["completed", "past", "cancelled"].includes(event.status)) {
                        throw new app_error_1.AppError("event_ended", "This event has ended.", 410);
                    }
                    const regStatus = (0, registration_status_1.getRegistrationStatus)({
                        registrationStartDate: event.registrationStartDate,
                        registrationEndDate: event.registrationEndDate,
                        startsAt: event.startsAt,
                        endsAt: event.endsAt,
                        capacity: event.capacity,
                        registeredCount: event._count.registrations,
                        allowLateRegistration: event.allowLateRegistration
                    });
                    if (regStatus === "not_started") {
                        throw new app_error_1.AppError("registration_not_started", "Registration has not started yet.", 400);
                    }
                    if (regStatus === "closed") {
                        throw new app_error_1.AppError("registration_closed", "Registration is closed.", 400);
                    }
                    const existing = await tx.eventRegistration.findUnique({
                        where: { eventId_userId: { eventId, userId } }
                    });
                    if (existing) {
                        throw new app_error_1.AppError("already_registered", "You are already registered for this event.", 409);
                    }
                    const existingTeam = await tx.eventTeam.findFirst({
                        where: { eventId, teamName }
                    });
                    if (existingTeam) {
                        throw new app_error_1.AppError("team_name_taken", "This team name is already taken for this event.", 409);
                    }
                    const fieldSchema = Array.isArray(event.registrationFields)
                        ? event.registrationFields
                        : [];
                    const validatedFields = (0, registration_fields_1.validateRegistrationFieldSubmissions)(fieldSchema, customFieldResponses);
                    if (event.capacity > 0 && event._count.registrations >= event.capacity) {
                        throw new app_error_1.AppError("capacity_full", "This event is full.", 422);
                    }
                    const attendanceToken = (0, attendance_token_1.generateAttendanceToken)(userId, eventId, registrationId);
                    const registration = await tx.eventRegistration.create({
                        data: {
                            id: registrationId,
                            eventId,
                            userId,
                            registrationType: "PARTICIPANT",
                            customFieldResponses: validatedFields.length > 0 ? validatedFields : client_1.Prisma.JsonNull,
                            attendanceToken
                        }
                    });
                    const inviteCode = (0, invite_code_1.generateInviteCode)();
                    const team = await tx.eventTeam.create({
                        data: {
                            eventId,
                            teamName,
                            inviteCode,
                            leaderId: userId
                        }
                    });
                    await tx.eventTeamMember.create({
                        data: {
                            teamId: team.id,
                            registrationId: registration.id,
                            userId,
                            role: "LEADER"
                        }
                    });
                    if (event.eventDays > 1) {
                        await tx.dayAttendance.createMany({
                            data: Array.from({ length: event.eventDays }, (_, i) => ({
                                registrationId: registration.id,
                                dayNumber: i + 1
                            }))
                        });
                    }
                    await tx.event.update({
                        where: { id: eventId },
                        data: { registeredCount: { increment: 1 } }
                    });
                    const completeTeam = await tx.eventTeam.findUnique({
                        where: { id: team.id },
                        include: {
                            members: {
                                include: {
                                    registration: {
                                        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } }
                                    }
                                }
                            }
                        }
                    });
                    return {
                        team: {
                            id: completeTeam.id,
                            teamName: completeTeam.teamName,
                            inviteCode: completeTeam.inviteCode,
                            leaderId: completeTeam.leaderId,
                            isLocked: completeTeam.isLocked,
                            createdAt: completeTeam.createdAt,
                            members: completeTeam.members.map((m) => ({
                                id: m.id,
                                userId: m.userId,
                                role: m.role,
                                joinedAt: m.joinedAt,
                                user: m.registration.user
                            })),
                            isComplete: completeTeam.members.length >= event.teamMinSize,
                            isFull: completeTeam.members.length >= event.teamMaxSize
                        },
                        event: {
                            teamMinSize: event.teamMinSize,
                            teamMaxSize: event.teamMaxSize,
                            title: event.title,
                            startsAt: event.startsAt,
                            slug: event.slug
                        }
                    };
                }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable });
                break;
            }
            catch (error) {
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                    error.code === "P2034" &&
                    attempt < TRANSACTION_RETRIES - 1) {
                    await new Promise((resolve) => setTimeout(resolve, Math.random() * 100 * (attempt + 1)));
                    continue;
                }
                throw error;
            }
        }
        if (!result) {
            throw new app_error_1.AppError("team_create_failed", "Team creation failed after retries.", 500);
        }
        this.activity
            .log({
            action: "team_create",
            title: `Created team: ${teamName}`,
            actorUserId: userId,
            subjectUserId: userId,
            meta: { eventId, teamId: result.team.id }
        })
            .catch(() => { });
        return result;
    }
    async joinTeam(userId, inviteCode, customFieldResponses) {
        if (inviteCode.length !== 8) {
            throw new app_error_1.AppError("invalid_code", "Invalid invite code.", 400);
        }
        let result = null;
        for (let attempt = 0; attempt < TRANSACTION_RETRIES; attempt++) {
            const registrationId = (0, crypto_1.randomUUID)();
            try {
                result = await this.prisma.$transaction(async (tx) => {
                    const team = await tx.eventTeam.findUnique({
                        where: { inviteCode },
                        include: {
                            members: true,
                            event: {
                                include: {
                                    _count: {
                                        select: {
                                            registrations: { where: { registrationType: "PARTICIPANT" } }
                                        }
                                    }
                                }
                            }
                        }
                    });
                    if (!team)
                        throw new app_error_1.AppError("team_not_found", "Team not found.", 404);
                    if (team.isLocked)
                        throw new app_error_1.AppError("team_locked", "This team is locked.", 400);
                    const event = team.event;
                    if (team.members.length >= event.teamMaxSize) {
                        throw new app_error_1.AppError("team_full", "This team is full.", 422);
                    }
                    if (event.endsAt.getTime() < Date.now() ||
                        ["completed", "past", "cancelled"].includes(event.status)) {
                        throw new app_error_1.AppError("event_ended", "This event has ended.", 410);
                    }
                    const regStatus = (0, registration_status_1.getRegistrationStatus)({
                        registrationStartDate: event.registrationStartDate,
                        registrationEndDate: event.registrationEndDate,
                        startsAt: event.startsAt,
                        endsAt: event.endsAt,
                        capacity: event.capacity,
                        registeredCount: event._count.registrations,
                        allowLateRegistration: event.allowLateRegistration
                    });
                    if (regStatus === "closed" || regStatus === "not_started") {
                        throw new app_error_1.AppError("registration_closed", "Registration is closed.", 400);
                    }
                    const existing = await tx.eventRegistration.findUnique({
                        where: { eventId_userId: { eventId: event.id, userId } }
                    });
                    if (existing) {
                        throw new app_error_1.AppError("already_registered", "You are already registered for this event.", 409);
                    }
                    const fieldSchema = Array.isArray(event.registrationFields)
                        ? event.registrationFields
                        : [];
                    const validatedFields = (0, registration_fields_1.validateRegistrationFieldSubmissions)(fieldSchema, customFieldResponses);
                    if (event.capacity > 0 && event._count.registrations >= event.capacity) {
                        throw new app_error_1.AppError("capacity_full", "This event is full.", 422);
                    }
                    const attendanceToken = (0, attendance_token_1.generateAttendanceToken)(userId, event.id, registrationId);
                    const registration = await tx.eventRegistration.create({
                        data: {
                            id: registrationId,
                            eventId: event.id,
                            userId,
                            registrationType: "PARTICIPANT",
                            customFieldResponses: validatedFields.length > 0 ? validatedFields : client_1.Prisma.JsonNull,
                            attendanceToken
                        }
                    });
                    await tx.eventTeamMember.create({
                        data: {
                            teamId: team.id,
                            registrationId: registration.id,
                            userId,
                            role: "MEMBER"
                        }
                    });
                    if (event.eventDays > 1) {
                        await tx.dayAttendance.createMany({
                            data: Array.from({ length: event.eventDays }, (_, i) => ({
                                registrationId: registration.id,
                                dayNumber: i + 1
                            }))
                        });
                    }
                    await tx.event.update({
                        where: { id: event.id },
                        data: { registeredCount: { increment: 1 } }
                    });
                    const completeTeam = await tx.eventTeam.findUnique({
                        where: { id: team.id },
                        include: {
                            members: {
                                include: {
                                    registration: {
                                        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } }
                                    }
                                }
                            }
                        }
                    });
                    return {
                        team: {
                            id: completeTeam.id,
                            teamName: completeTeam.teamName,
                            inviteCode: completeTeam.inviteCode,
                            leaderId: completeTeam.leaderId,
                            isLocked: completeTeam.isLocked,
                            createdAt: completeTeam.createdAt,
                            members: completeTeam.members.map((m) => ({
                                id: m.id,
                                userId: m.userId,
                                role: m.role,
                                joinedAt: m.joinedAt,
                                user: m.registration.user
                            })),
                            isComplete: completeTeam.members.length >= event.teamMinSize,
                            isFull: completeTeam.members.length >= event.teamMaxSize
                        },
                        event: {
                            teamMinSize: event.teamMinSize,
                            teamMaxSize: event.teamMaxSize,
                            title: event.title,
                            startsAt: event.startsAt,
                            slug: event.slug
                        }
                    };
                }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable });
                break;
            }
            catch (error) {
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                    error.code === "P2034" &&
                    attempt < TRANSACTION_RETRIES - 1) {
                    await new Promise((resolve) => setTimeout(resolve, Math.random() * 100 * (attempt + 1)));
                    continue;
                }
                throw error;
            }
        }
        if (!result) {
            throw new app_error_1.AppError("join_failed", "Joining team failed after retries.", 500);
        }
        this.activity
            .log({
            action: "team_join",
            title: `Joined team: ${result.team.teamName}`,
            actorUserId: userId,
            subjectUserId: userId,
            meta: { teamId: result.team.id }
        })
            .catch(() => { });
        return result;
    }
    async myTeam(eventId, userId) {
        const registration = await this.prisma.eventRegistration.findUnique({
            where: { eventId_userId: { eventId, userId } }
        });
        if (!registration)
            return null;
        const membership = await this.prisma.eventTeamMember.findFirst({
            where: { registrationId: registration.id },
            include: {
                team: {
                    include: {
                        event: { select: { teamMinSize: true, teamMaxSize: true } },
                        members: {
                            include: {
                                registration: {
                                    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } }
                                }
                            }
                        }
                    }
                }
            }
        });
        if (!membership)
            return null;
        const team = membership.team;
        const isLeader = team.leaderId === userId;
        return {
            id: team.id,
            eventId: team.eventId,
            teamName: team.teamName,
            inviteCode: isLeader ? team.inviteCode : undefined,
            leaderId: team.leaderId,
            isLocked: team.isLocked,
            createdAt: team.createdAt,
            members: team.members.map((m) => ({
                id: m.id,
                userId: m.userId,
                role: m.role,
                joinedAt: m.joinedAt,
                user: m.registration.user
            })),
            minimumTeamSize: team.event.teamMinSize,
            maximumTeamSize: team.event.teamMaxSize,
            isComplete: team.members.length >= team.event.teamMinSize,
            isFull: team.members.length >= team.event.teamMaxSize
        };
    }
    async toggleLock(teamId, userId, lock) {
        const team = await this.prisma.eventTeam.findUnique({ where: { id: teamId } });
        if (!team)
            throw new app_error_1.AppError("not_found", "Team not found.", 404);
        if (team.leaderId !== userId) {
            throw new app_error_1.AppError("forbidden", "Only the team leader can lock/unlock the team.", 403);
        }
        await this.prisma.eventTeam.update({
            where: { id: teamId },
            data: { isLocked: lock }
        });
        return { ok: true, isLocked: lock };
    }
    async dissolveTeam(teamId, userId) {
        const team = await this.prisma.eventTeam.findUnique({
            where: { id: teamId },
            include: { members: true, event: true }
        });
        if (!team)
            throw new app_error_1.AppError("not_found", "Team not found.", 404);
        if (team.leaderId !== userId) {
            throw new app_error_1.AppError("forbidden", "Only the team leader can dissolve the team.", 403);
        }
        if (team.event.startsAt.getTime() <= Date.now()) {
            throw new app_error_1.AppError("event_started", "Cannot dissolve team after the event has started.", 400);
        }
        const registrationIds = team.members.map(m => m.registrationId);
        await this.prisma.$transaction([
            this.prisma.eventTeamMember.deleteMany({ where: { teamId } }),
            this.prisma.eventTeam.delete({ where: { id: teamId } }),
            this.prisma.dayAttendance.deleteMany({ where: { registrationId: { in: registrationIds } } }),
            this.prisma.eventRegistration.deleteMany({ where: { id: { in: registrationIds } } }),
            this.prisma.event.update({
                where: { id: team.eventId },
                data: { registeredCount: { decrement: team.members.length } }
            })
        ]);
        this.activity.log({
            action: "team_dissolved",
            title: `Dissolved team: ${team.teamName}`,
            actorUserId: userId,
            subjectUserId: userId,
            meta: { eventId: team.eventId, teamId }
        }).catch(() => { });
        return { ok: true };
    }
    async removeMember(teamId, leaderId, targetUserId) {
        const team = await this.prisma.eventTeam.findUnique({
            where: { id: teamId },
            include: { members: true, event: true }
        });
        if (!team)
            throw new app_error_1.AppError("not_found", "Team not found.", 404);
        if (team.leaderId !== leaderId) {
            throw new app_error_1.AppError("forbidden", "Only the team leader can remove members.", 403);
        }
        if (team.event.startsAt.getTime() <= Date.now()) {
            throw new app_error_1.AppError("event_started", "Cannot remove members after the event has started.", 400);
        }
        if (leaderId === targetUserId) {
            throw new app_error_1.AppError("forbidden", "Cannot remove yourself. Dissolve the team instead.", 400);
        }
        const memberToRemove = team.members.find(m => m.userId === targetUserId);
        if (!memberToRemove) {
            throw new app_error_1.AppError("not_found", "User is not in this team.", 404);
        }
        await this.prisma.$transaction([
            this.prisma.eventTeamMember.delete({ where: { id: memberToRemove.id } }),
            this.prisma.dayAttendance.deleteMany({ where: { registrationId: memberToRemove.registrationId } }),
            this.prisma.eventRegistration.delete({ where: { id: memberToRemove.registrationId } }),
            this.prisma.event.update({
                where: { id: team.eventId },
                data: { registeredCount: { decrement: 1 } }
            })
        ]);
        return { ok: true };
    }
};
exports.TeamsService = TeamsService;
exports.TeamsService = TeamsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        activity_service_1.ActivityService])
], TeamsService);
//# sourceMappingURL=teams.service.js.map