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
exports.RegistrationsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const activity_service_1 = require("../activity/activity.service");
const app_error_1 = require("../common/app-error");
const attendance_token_1 = require("../common/attendance-token");
const registration_status_1 = require("../common/registration-status");
const registration_fields_1 = require("../common/registration-fields");
const prisma_service_1 = require("../prisma/prisma.service");
const TRANSACTION_RETRIES = 3;
let RegistrationsService = class RegistrationsService {
    prisma;
    activity;
    constructor(prisma, activity) {
        this.prisma = prisma;
        this.activity = activity;
    }
    async register(eventId, userId, additionalFields) {
        const eventGate = await this.prisma.event.findUnique({
            where: { id: eventId },
            select: { teamRegistration: true }
        });
        if (!eventGate)
            throw new app_error_1.AppError("not_found", "Event not found.", 404);
        if (eventGate.teamRegistration) {
            throw new app_error_1.AppError("team_required", "This event requires team registration. Please create or join a team instead.", 400);
        }
        let registration = null;
        for (let attempt = 0; attempt < TRANSACTION_RETRIES; attempt++) {
            const registrationId = (0, crypto_1.randomUUID)();
            try {
                registration = await this.prisma.$transaction(async (tx) => {
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
                    const fieldSchema = Array.isArray(event.registrationFields)
                        ? event.registrationFields
                        : [];
                    const validatedFields = (0, registration_fields_1.validateRegistrationFieldSubmissions)(fieldSchema, additionalFields);
                    if (event.capacity > 0 && event._count.registrations >= event.capacity) {
                        throw new app_error_1.AppError("capacity_full", "This event is full.", 422);
                    }
                    const attendanceToken = (0, attendance_token_1.generateAttendanceToken)(userId, eventId, registrationId);
                    const reg = await tx.eventRegistration.create({
                        data: {
                            id: registrationId,
                            eventId,
                            userId,
                            registrationType: "PARTICIPANT",
                            customFieldResponses: validatedFields.length > 0 ? validatedFields : client_1.Prisma.JsonNull,
                            attendanceToken
                        },
                        include: {
                            event: {
                                select: { id: true, title: true, startsAt: true, slug: true }
                            }
                        }
                    });
                    if (event.eventDays > 1) {
                        await tx.dayAttendance.createMany({
                            data: Array.from({ length: event.eventDays }, (_, i) => ({
                                registrationId: reg.id,
                                dayNumber: i + 1
                            }))
                        });
                    }
                    await tx.event.update({
                        where: { id: eventId },
                        data: { registeredCount: { increment: 1 } }
                    });
                    return reg;
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
        if (!registration) {
            throw new app_error_1.AppError("registration_failed", "Registration failed after retries.", 500);
        }
        this.activity
            .log({
            action: "event_register",
            title: `Registered for ${registration.event.title}`,
            actorUserId: userId,
            subjectUserId: userId,
            meta: { eventId, registrationId: registration.id }
        })
            .catch(() => { });
        return {
            id: registration.id,
            userId: registration.userId,
            eventId: registration.eventId,
            registeredAt: registration.registeredAt,
            customFieldResponses: registration.customFieldResponses,
            event: registration.event
        };
    }
    async unregister(eventId, userId) {
        const registration = await this.prisma.eventRegistration.findUnique({
            where: { eventId_userId: { eventId, userId } },
            include: { event: { select: { startsAt: true, title: true } } }
        });
        if (!registration) {
            throw new app_error_1.AppError("not_registered", "You are not registered for this event.", 404);
        }
        if (registration.event.startsAt.getTime() <= Date.now()) {
            throw new app_error_1.AppError("event_started", "Cannot unregister after the event has started.", 400);
        }
        const teamMembership = await this.prisma.eventTeamMember.findFirst({
            where: { registrationId: registration.id, role: "LEADER" }
        });
        if (teamMembership) {
            throw new app_error_1.AppError("team_leader", "Team leaders cannot unregister. Dissolve the team first.", 400);
        }
        await this.prisma.$transaction([
            this.prisma.eventTeamMember.deleteMany({ where: { registrationId: registration.id } }),
            this.prisma.dayAttendance.deleteMany({ where: { registrationId: registration.id } }),
            this.prisma.eventRegistration.delete({
                where: { eventId_userId: { eventId, userId } }
            }),
            this.prisma.event.update({
                where: { id: eventId },
                data: { registeredCount: { decrement: 1 } }
            })
        ]);
        this.activity
            .log({
            action: "event_unregister",
            title: `Unregistered from ${registration.event.title}`,
            actorUserId: userId,
            subjectUserId: userId,
            meta: { eventId }
        })
            .catch(() => { });
        return { ok: true };
    }
    async myRegistrations(userId) {
        return this.prisma.eventRegistration.findMany({
            where: { userId, registrationType: "PARTICIPANT" },
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
                        capacity: true,
                        eventType: true,
                        teamRegistration: true,
                        teamMinSize: true,
                        teamMaxSize: true,
                        _count: {
                            select: {
                                registrations: { where: { registrationType: "PARTICIPANT" } }
                            }
                        }
                    }
                }
            },
            orderBy: { registeredAt: "desc" }
        });
    }
    async registrationStatus(eventId, userId) {
        const registration = await this.prisma.eventRegistration.findUnique({
            where: { eventId_userId: { eventId, userId } },
            select: { id: true, registeredAt: true }
        });
        return {
            isRegistered: Boolean(registration),
            registeredAt: registration?.registeredAt ?? null
        };
    }
};
exports.RegistrationsService = RegistrationsService;
exports.RegistrationsService = RegistrationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        activity_service_1.ActivityService])
], RegistrationsService);
//# sourceMappingURL=registrations.service.js.map