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
exports.EventsService = void 0;
const common_1 = require("@nestjs/common");
const activity_service_1 = require("../activity/activity.service");
const app_error_1 = require("../common/app-error");
const envelope_1 = require("../common/envelope");
const registration_status_1 = require("../common/registration-status");
const sanitize_1 = require("../common/sanitize");
const slug_1 = require("../common/slug");
const types_1 = require("../common/types");
const zod_1 = require("../common/zod");
const feature_service_1 = require("../features/feature.service");
const prisma_service_1 = require("../prisma/prisma.service");
const user_service_1 = require("../users/user.service");
const registration_fields_1 = require("../common/registration-fields");
let EventsService = class EventsService {
    prisma;
    activity;
    users;
    features;
    constructor(prisma, activity, users, features) {
        this.prisma = prisma;
        this.activity = activity;
        this.users = users;
        this.features = features;
    }
    async list(userId, query) {
        const page = (0, zod_1.parseQueryInt)(query.page, 1, 1, 100000);
        const pageSize = (0, zod_1.parseQueryInt)(query.page_size ?? query.limit, 20, 1, 100);
        const status = typeof query.status === "string" ? query.status : undefined;
        const search = typeof query.query === "string" ? query.query : undefined;
        const featured = query.featured === "true" ? true : undefined;
        const where = {
            ...(status ? { status } : {}),
            ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
            ...(featured !== undefined ? { featured } : {})
        };
        const [items, total] = await Promise.all([
            this.prisma.event.findMany({
                where,
                orderBy: { startsAt: "asc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    _count: {
                        select: {
                            registrations: { where: { registrationType: "PARTICIPANT" } }
                        }
                    }
                }
            }),
            this.prisma.event.count({ where })
        ]);
        return (0, envelope_1.withMeta)(items.map((item) => this.publicEvent(item, false, item._count.registrations)), (0, envelope_1.paginationMeta)(page, pageSize, total));
    }
    async get(idOrSlug, userId) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrSlug);
        const event = await this.prisma.event.findFirst({
            where: isUuid ? { id: idOrSlug } : { slug: idOrSlug },
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
        const participantCount = event._count.registrations;
        const joined = userId
            ? Boolean(await this.prisma.eventRegistration.findUnique({
                where: { eventId_userId: { eventId: event.id, userId } }
            }))
            : false;
        const registrationStatus = (0, registration_status_1.getRegistrationStatus)({
            registrationStartDate: event.registrationStartDate,
            registrationEndDate: event.registrationEndDate,
            startsAt: event.startsAt,
            endsAt: event.endsAt,
            capacity: event.capacity,
            registeredCount: participantCount,
            allowLateRegistration: event.allowLateRegistration
        });
        return {
            ...this.publicEvent(event, joined, participantCount),
            spotsRemaining: event.capacity > 0 ? Math.max(0, event.capacity - participantCount) : null,
            registrationStatus
        };
    }
    async create(payload, actor) {
        const enabled = await this.features.isEnabledForUser(actor.id, "events.creation_enabled");
        if (!enabled)
            throw new app_error_1.AppError("feature_disabled", "Event creation is disabled.", 403, { flag: "events.creation_enabled" });
        this.validateTimeline(payload);
        this.validateTeamConfig(payload);
        const slug = await (0, slug_1.generateUniqueSlug)(payload.title, this.prisma);
        const event = await this.prisma.event.create({
            data: {
                title: payload.title,
                description: (0, sanitize_1.sanitizeHtml)(payload.description) ?? payload.description,
                coverUrl: payload.cover,
                category: payload.category,
                status: payload.status ?? "upcoming",
                startsAt: new Date(payload.startsAt),
                endsAt: new Date(payload.endsAt),
                location: payload.location,
                capacity: payload.capacity,
                xpReward: payload.xpReward ?? 0,
                organizers: payload.organizers ?? [],
                tags: (payload.tags ?? []).slice(0, 40),
                createdById: actor.id,
                slug,
                shortDescription: payload.shortDescription ?? null,
                agenda: (0, sanitize_1.sanitizeHtml)(payload.agenda),
                highlights: (0, sanitize_1.sanitizeHtml)(payload.highlights),
                learningOutcomes: (0, sanitize_1.sanitizeHtml)(payload.learningOutcomes),
                targetAudience: payload.targetAudience ?? null,
                prerequisites: payload.prerequisites ?? null,
                speakers: (Array.isArray(payload.speakers) ? payload.speakers.slice(0, 100) : []),
                resources: (Array.isArray(payload.resources) ? payload.resources.slice(0, 100) : []),
                faqs: (Array.isArray(payload.faqs) ? payload.faqs.slice(0, 100) : []),
                imageGallery: (Array.isArray(payload.imageGallery) ? payload.imageGallery.slice(0, 50) : []),
                videoUrl: payload.videoUrl ?? null,
                venue: payload.venue ?? null,
                eventType: payload.eventType ?? null,
                featured: payload.featured ?? false,
                allowLateRegistration: payload.allowLateRegistration ?? false,
                eventDays: payload.eventDays ?? 1,
                dayLabels: (Array.isArray(payload.dayLabels) ? payload.dayLabels : []),
                registrationFields: (0, registration_fields_1.sanitizeRegistrationFields)(payload.registrationFields),
                registrationStartDate: payload.registrationStartDate ? new Date(payload.registrationStartDate) : null,
                registrationEndDate: payload.registrationEndDate ? new Date(payload.registrationEndDate) : null,
                teamRegistration: payload.teamRegistration ?? false,
                teamMinSize: payload.teamMinSize ?? 1,
                teamMaxSize: payload.teamMaxSize ?? 5
            }
        });
        await this.activity.log({
            action: "event_create",
            title: `Created event: ${event.title}`,
            actorUserId: actor.id,
            subjectUserId: actor.id,
            meta: { eventId: event.id }
        });
        return this.publicEvent(event, false, 0);
    }
    async update(id, patch, actor) {
        const event = await this.prisma.event.findUnique({
            where: { id },
            include: { _count: { select: { registrations: true } } }
        });
        if (!event)
            throw new app_error_1.AppError("not_found", "Event not found.", 404);
        if (!(0, types_1.hasMinRole)(actor.role, "admin") && event.createdById !== actor.id) {
            throw new app_error_1.AppError("forbidden", "You cannot edit this event.", 403);
        }
        if (patch.capacity != null && patch.capacity < event._count.registrations) {
            throw new app_error_1.AppError("invalid_capacity", "Capacity cannot be below current registrations.", 422);
        }
        if (patch.teamRegistration !== undefined && patch.teamRegistration !== event.teamRegistration && event._count.registrations > 0) {
            throw new app_error_1.AppError("team_toggle_blocked", "Cannot change team registration mode when registrations exist.", 422);
        }
        const merged = {
            startsAt: patch.startsAt ?? event.startsAt,
            endsAt: patch.endsAt ?? event.endsAt,
            registrationStartDate: patch.registrationStartDate !== undefined ? patch.registrationStartDate : event.registrationStartDate,
            registrationEndDate: patch.registrationEndDate !== undefined ? patch.registrationEndDate : event.registrationEndDate,
            allowLateRegistration: patch.allowLateRegistration ?? event.allowLateRegistration
        };
        this.validateTimeline(merged);
        if (patch.teamRegistration !== undefined || patch.teamMinSize !== undefined || patch.teamMaxSize !== undefined) {
            this.validateTeamConfig({
                teamMinSize: patch.teamMinSize ?? event.teamMinSize,
                teamMaxSize: patch.teamMaxSize ?? event.teamMaxSize
            });
        }
        let newSlug;
        if (patch.title && patch.title !== event.title) {
            newSlug = await (0, slug_1.generateUniqueSlug)(patch.title, this.prisma, id);
        }
        const updated = await this.prisma.event.update({
            where: { id },
            data: {
                ...(patch.title !== undefined ? { title: patch.title } : {}),
                ...(patch.description !== undefined ? { description: (0, sanitize_1.sanitizeHtml)(patch.description) ?? patch.description } : {}),
                ...(patch.cover !== undefined ? { coverUrl: patch.cover } : {}),
                ...(patch.category !== undefined ? { category: patch.category } : {}),
                ...(patch.status !== undefined ? { status: patch.status } : {}),
                ...(patch.startsAt !== undefined ? { startsAt: new Date(patch.startsAt) } : {}),
                ...(patch.endsAt !== undefined ? { endsAt: new Date(patch.endsAt) } : {}),
                ...(patch.location !== undefined ? { location: patch.location } : {}),
                ...(patch.capacity !== undefined ? { capacity: patch.capacity } : {}),
                ...(patch.xpReward !== undefined ? { xpReward: patch.xpReward } : {}),
                ...(patch.organizers !== undefined ? { organizers: patch.organizers } : {}),
                ...(patch.tags !== undefined ? { tags: (patch.tags ?? []).slice(0, 40) } : {}),
                ...(newSlug ? { slug: newSlug } : {}),
                ...(patch.shortDescription !== undefined ? { shortDescription: patch.shortDescription } : {}),
                ...(patch.agenda !== undefined ? { agenda: (0, sanitize_1.sanitizeHtml)(patch.agenda) } : {}),
                ...(patch.highlights !== undefined ? { highlights: (0, sanitize_1.sanitizeHtml)(patch.highlights) } : {}),
                ...(patch.learningOutcomes !== undefined ? { learningOutcomes: (0, sanitize_1.sanitizeHtml)(patch.learningOutcomes) } : {}),
                ...(patch.targetAudience !== undefined ? { targetAudience: patch.targetAudience } : {}),
                ...(patch.prerequisites !== undefined ? { prerequisites: patch.prerequisites } : {}),
                ...(patch.speakers !== undefined ? { speakers: (Array.isArray(patch.speakers) ? patch.speakers.slice(0, 100) : []) } : {}),
                ...(patch.resources !== undefined ? { resources: (Array.isArray(patch.resources) ? patch.resources.slice(0, 100) : []) } : {}),
                ...(patch.faqs !== undefined ? { faqs: (Array.isArray(patch.faqs) ? patch.faqs.slice(0, 100) : []) } : {}),
                ...(patch.imageGallery !== undefined ? { imageGallery: (Array.isArray(patch.imageGallery) ? patch.imageGallery.slice(0, 50) : []) } : {}),
                ...(patch.videoUrl !== undefined ? { videoUrl: patch.videoUrl } : {}),
                ...(patch.venue !== undefined ? { venue: patch.venue } : {}),
                ...(patch.eventType !== undefined ? { eventType: patch.eventType } : {}),
                ...(patch.featured !== undefined ? { featured: patch.featured } : {}),
                ...(patch.allowLateRegistration !== undefined ? { allowLateRegistration: patch.allowLateRegistration } : {}),
                ...(patch.eventDays !== undefined ? { eventDays: patch.eventDays } : {}),
                ...(patch.dayLabels !== undefined ? { dayLabels: patch.dayLabels } : {}),
                ...(patch.registrationFields !== undefined ? { registrationFields: (0, registration_fields_1.sanitizeRegistrationFields)(patch.registrationFields) } : {}),
                ...(patch.registrationStartDate !== undefined ? { registrationStartDate: patch.registrationStartDate ? new Date(patch.registrationStartDate) : null } : {}),
                ...(patch.registrationEndDate !== undefined ? { registrationEndDate: patch.registrationEndDate ? new Date(patch.registrationEndDate) : null } : {}),
                ...(patch.teamRegistration !== undefined ? { teamRegistration: patch.teamRegistration } : {}),
                ...(patch.teamMinSize !== undefined ? { teamMinSize: patch.teamMinSize } : {}),
                ...(patch.teamMaxSize !== undefined ? { teamMaxSize: patch.teamMaxSize } : {})
            }
        });
        await this.activity.log({
            action: "event_update",
            title: `Updated event: ${updated.title}`,
            actorUserId: actor.id,
            subjectUserId: actor.id,
            meta: { eventId: id }
        });
        return this.publicEvent(updated, false);
    }
    async remove(id, actor) {
        const event = await this.prisma.event.findUnique({ where: { id } });
        if (!event)
            throw new app_error_1.AppError("not_found", "Event not found.", 404);
        if (!(0, types_1.hasMinRole)(actor.role, "admin") && event.createdById !== actor.id) {
            throw new app_error_1.AppError("forbidden", "You cannot delete this event.", 403);
        }
        await this.prisma.event.delete({ where: { id } });
        await this.activity.log({
            action: "event_delete",
            title: `Deleted event: ${event.title}`,
            actorUserId: actor.id,
            subjectUserId: actor.id,
            meta: { eventId: id }
        });
        return { ok: true };
    }
    async participants(id) {
        const rows = await this.prisma.eventRegistration.findMany({
            where: { eventId: id, registrationType: "PARTICIPANT" },
            include: { user: true },
            orderBy: { registeredAt: "asc" }
        });
        const users = [];
        for (const row of rows) {
            users.push(await this.users.publicUser(row.user, { id: row.user.id, role: "admin" }));
        }
        return users;
    }
    validateTimeline(payload) {
        const startDate = payload.startsAt ? new Date(payload.startsAt) : undefined;
        const endDate = payload.endsAt ? new Date(payload.endsAt) : undefined;
        const regStart = payload.registrationStartDate ? new Date(payload.registrationStartDate) : undefined;
        const regEnd = payload.registrationEndDate ? new Date(payload.registrationEndDate) : undefined;
        if (startDate && endDate && endDate < startDate) {
            throw new app_error_1.AppError("validation_error", "End date cannot be before start date.", 422);
        }
        if (regStart && regEnd && regStart > regEnd) {
            throw new app_error_1.AppError("validation_error", "Registration start date cannot be after registration end date.", 422);
        }
        if (regStart && endDate && regStart > endDate) {
            throw new app_error_1.AppError("validation_error", "Registration start date cannot be after event end date.", 422);
        }
        if (regEnd && startDate) {
            const maxEnd = payload.allowLateRegistration && endDate ? endDate : startDate;
            if (regEnd > maxEnd) {
                throw new app_error_1.AppError("validation_error", payload.allowLateRegistration
                    ? "Registration end date cannot be after event end date when late registration is enabled."
                    : "Registration end date cannot be after event start date when late registration is disabled.", 422);
            }
        }
    }
    validateTeamConfig(payload) {
        const min = payload.teamMinSize ?? 1;
        const max = payload.teamMaxSize ?? 5;
        if (min > max) {
            throw new app_error_1.AppError("validation_error", "Team minimum size cannot exceed maximum size.", 422);
        }
    }
    publicEvent(event, joined, participantCount) {
        return {
            id: event.id,
            title: event.title,
            slug: event.slug ?? null,
            description: event.description,
            shortDescription: event.shortDescription ?? null,
            cover: event.coverUrl,
            category: event.category,
            status: event.status === "past" ? "completed" : event.status,
            startsAt: event.startsAt,
            endsAt: event.endsAt,
            location: event.location,
            venue: event.venue ?? null,
            eventType: event.eventType ?? null,
            capacity: event.capacity,
            registered: participantCount ?? event.registeredCount,
            participants_count: participantCount ?? event.registeredCount,
            is_user_joined: joined,
            xpReward: event.xpReward,
            organizers: Array.isArray(event.organizers) ? event.organizers : [],
            tags: Array.isArray(event.tags) ? event.tags : [],
            featured: event.featured ?? false,
            agenda: event.agenda ?? null,
            highlights: event.highlights ?? null,
            learningOutcomes: event.learningOutcomes ?? null,
            targetAudience: event.targetAudience ?? null,
            prerequisites: event.prerequisites ?? null,
            speakers: Array.isArray(event.speakers) ? event.speakers : [],
            resources: Array.isArray(event.resources) ? event.resources : [],
            faqs: Array.isArray(event.faqs) ? event.faqs : [],
            imageGallery: Array.isArray(event.imageGallery) ? event.imageGallery : [],
            videoUrl: event.videoUrl ?? null,
            allowLateRegistration: event.allowLateRegistration ?? false,
            eventDays: event.eventDays ?? 1,
            dayLabels: Array.isArray(event.dayLabels) ? event.dayLabels : [],
            registrationFields: Array.isArray(event.registrationFields) ? event.registrationFields : [],
            registrationStartDate: event.registrationStartDate ?? null,
            registrationEndDate: event.registrationEndDate ?? null,
            teamRegistration: event.teamRegistration ?? false,
            teamMinSize: event.teamMinSize ?? 1,
            teamMaxSize: event.teamMaxSize ?? 5
        };
    }
};
exports.EventsService = EventsService;
exports.EventsService = EventsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        activity_service_1.ActivityService,
        user_service_1.UserService,
        feature_service_1.FeatureService])
], EventsService);
//# sourceMappingURL=events.service.js.map