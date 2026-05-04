import { Injectable } from "@nestjs/common";

import { ActivityService } from "../activity/activity.service";
import { AppError } from "../common/app-error";
import { paginationMeta, withMeta } from "../common/envelope";
import { getRegistrationStatus, type RegistrationStatus } from "../common/registration-status";
import { sanitizeHtml } from "../common/sanitize";
import { generateUniqueSlug } from "../common/slug";
import { hasMinRole } from "../common/types";
import { parseQueryInt } from "../common/zod";
import { FeatureService } from "../features/feature.service";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UserService } from "../users/user.service";
import type { Role } from "../common/types";
import { sanitizeRegistrationFields } from "../common/registration-fields";

type EventCategory = "hackathon" | "quiz" | "meetup" | "workshop" | "tournament" | "social";
type EventStatus = "upcoming" | "live" | "completed" | "past" | "cancelled";

export type EventInput = {
  title: string;
  description: string;
  cover?: string | null;
  category: EventCategory;
  status?: EventStatus;
  startsAt: string | Date;
  endsAt: string | Date;
  location: string;
  capacity: number;
  xpReward?: number;
  organizers?: string[];
  tags?: string[];
  // Rich fields
  shortDescription?: string | null;
  agenda?: string | null;
  highlights?: string | null;
  learningOutcomes?: string | null;
  targetAudience?: string | null;
  prerequisites?: string | null;
  speakers?: unknown[];
  resources?: unknown[];
  faqs?: unknown[];
  imageGallery?: string[];
  videoUrl?: string | null;
  venue?: string | null;
  eventType?: string | null;
  featured?: boolean;
  allowLateRegistration?: boolean;
  eventDays?: number;
  dayLabels?: string[];
  registrationFields?: unknown[];
  registrationStartDate?: string | Date | null;
  registrationEndDate?: string | Date | null;
  teamRegistration?: boolean;
  teamMinSize?: number;
  teamMaxSize?: number;
};

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly users: UserService,
    private readonly features: FeatureService
  ) {}

  async list(userId: string | undefined, query: Record<string, unknown>) {
    const page = parseQueryInt(query.page, 1, 1, 100000);
    const pageSize = parseQueryInt(query.page_size ?? query.limit, 20, 1, 100);
    const status = typeof query.status === "string" ? (query.status as EventStatus) : undefined;
    const search = typeof query.query === "string" ? query.query : undefined;
    const featured = query.featured === "true" ? true : undefined;
    const where = {
      ...(status ? { status } : {}),
      ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
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
    return withMeta(
      items.map((item) => this.publicEvent(item, false, item._count.registrations)),
      paginationMeta(page, pageSize, total)
    );
  }

  async get(idOrSlug: string, userId?: string) {
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
    if (!event) throw new AppError("not_found", "Event not found.", 404);
    const participantCount = event._count.registrations;
    const joined = userId
      ? Boolean(
          await this.prisma.eventRegistration.findUnique({
            where: { eventId_userId: { eventId: event.id, userId } }
          })
        )
      : false;

    const registrationStatus = getRegistrationStatus({
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

  async create(payload: EventInput, actor: { id: string; role: Role }) {
    const enabled = await this.features.isEnabledForUser(actor.id, "events.creation_enabled");
    if (!enabled) throw new AppError("feature_disabled", "Event creation is disabled.", 403, { flag: "events.creation_enabled" });

    this.validateTimeline(payload);
    this.validateTeamConfig(payload);

    const slug = await generateUniqueSlug(payload.title, this.prisma);

    const event = await this.prisma.event.create({
      data: {
        title: payload.title,
        description: sanitizeHtml(payload.description) ?? payload.description,
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
        agenda: sanitizeHtml(payload.agenda),
        highlights: sanitizeHtml(payload.highlights),
        learningOutcomes: sanitizeHtml(payload.learningOutcomes),
        targetAudience: payload.targetAudience ?? null,
        prerequisites: payload.prerequisites ?? null,
        speakers: (Array.isArray(payload.speakers) ? payload.speakers.slice(0, 100) : []) as Prisma.InputJsonValue,
        resources: (Array.isArray(payload.resources) ? payload.resources.slice(0, 100) : []) as Prisma.InputJsonValue,
        faqs: (Array.isArray(payload.faqs) ? payload.faqs.slice(0, 100) : []) as Prisma.InputJsonValue,
        imageGallery: (Array.isArray(payload.imageGallery) ? payload.imageGallery.slice(0, 50) : []) as Prisma.InputJsonValue,
        videoUrl: payload.videoUrl ?? null,
        venue: payload.venue ?? null,
        eventType: payload.eventType ?? null,
        featured: payload.featured ?? false,
        allowLateRegistration: payload.allowLateRegistration ?? false,
        eventDays: payload.eventDays ?? 1,
        dayLabels: (Array.isArray(payload.dayLabels) ? payload.dayLabels : []) as Prisma.InputJsonValue,
        registrationFields: sanitizeRegistrationFields(payload.registrationFields) as unknown as Prisma.InputJsonValue,
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

  async update(id: string, patch: Partial<EventInput>, actor: { id: string; role: Role }) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { _count: { select: { registrations: true } } }
    });
    if (!event) throw new AppError("not_found", "Event not found.", 404);
    if (!hasMinRole(actor.role, "admin") && event.createdById !== actor.id) {
      throw new AppError("forbidden", "You cannot edit this event.", 403);
    }

    // Capacity cannot go below current registrations
    if (patch.capacity != null && patch.capacity < event._count.registrations) {
      throw new AppError("invalid_capacity", "Capacity cannot be below current registrations.", 422);
    }

    // Cannot toggle team registration if registrations exist
    if (patch.teamRegistration !== undefined && patch.teamRegistration !== event.teamRegistration && event._count.registrations > 0) {
      throw new AppError("team_toggle_blocked", "Cannot change team registration mode when registrations exist.", 422);
    }

    // Validate timeline with merged values
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

    // Regenerate slug if title changed
    let newSlug: string | undefined;
    if (patch.title && patch.title !== event.title) {
      newSlug = await generateUniqueSlug(patch.title, this.prisma, id);
    }

    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.description !== undefined ? { description: sanitizeHtml(patch.description) ?? patch.description } : {}),
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
        ...(patch.agenda !== undefined ? { agenda: sanitizeHtml(patch.agenda) } : {}),
        ...(patch.highlights !== undefined ? { highlights: sanitizeHtml(patch.highlights) } : {}),
        ...(patch.learningOutcomes !== undefined ? { learningOutcomes: sanitizeHtml(patch.learningOutcomes) } : {}),
        ...(patch.targetAudience !== undefined ? { targetAudience: patch.targetAudience } : {}),
        ...(patch.prerequisites !== undefined ? { prerequisites: patch.prerequisites } : {}),
        ...(patch.speakers !== undefined ? { speakers: (Array.isArray(patch.speakers) ? patch.speakers.slice(0, 100) : []) as Prisma.InputJsonValue } : {}),
        ...(patch.resources !== undefined ? { resources: (Array.isArray(patch.resources) ? patch.resources.slice(0, 100) : []) as Prisma.InputJsonValue } : {}),
        ...(patch.faqs !== undefined ? { faqs: (Array.isArray(patch.faqs) ? patch.faqs.slice(0, 100) : []) as Prisma.InputJsonValue } : {}),
        ...(patch.imageGallery !== undefined ? { imageGallery: (Array.isArray(patch.imageGallery) ? patch.imageGallery.slice(0, 50) : []) as Prisma.InputJsonValue } : {}),
        ...(patch.videoUrl !== undefined ? { videoUrl: patch.videoUrl } : {}),
        ...(patch.venue !== undefined ? { venue: patch.venue } : {}),
        ...(patch.eventType !== undefined ? { eventType: patch.eventType } : {}),
        ...(patch.featured !== undefined ? { featured: patch.featured } : {}),
        ...(patch.allowLateRegistration !== undefined ? { allowLateRegistration: patch.allowLateRegistration } : {}),
        ...(patch.eventDays !== undefined ? { eventDays: patch.eventDays } : {}),
        ...(patch.dayLabels !== undefined ? { dayLabels: patch.dayLabels as Prisma.InputJsonValue } : {}),
        ...(patch.registrationFields !== undefined ? { registrationFields: sanitizeRegistrationFields(patch.registrationFields) as unknown as Prisma.InputJsonValue } : {}),
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

  async remove(id: string, actor: { id: string; role: Role }) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new AppError("not_found", "Event not found.", 404);
    if (!hasMinRole(actor.role, "admin") && event.createdById !== actor.id) {
      throw new AppError("forbidden", "You cannot delete this event.", 403);
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



  async participants(id: string) {
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

  // --- Validation helpers ---

  private validateTimeline(payload: {
    startsAt?: string | Date;
    endsAt?: string | Date;
    registrationStartDate?: string | Date | null;
    registrationEndDate?: string | Date | null;
    allowLateRegistration?: boolean;
  }) {
    const startDate = payload.startsAt ? new Date(payload.startsAt) : undefined;
    const endDate = payload.endsAt ? new Date(payload.endsAt) : undefined;
    const regStart = payload.registrationStartDate ? new Date(payload.registrationStartDate) : undefined;
    const regEnd = payload.registrationEndDate ? new Date(payload.registrationEndDate) : undefined;

    if (startDate && endDate && endDate < startDate) {
      throw new AppError("validation_error", "End date cannot be before start date.", 422);
    }
    if (regStart && regEnd && regStart > regEnd) {
      throw new AppError("validation_error", "Registration start date cannot be after registration end date.", 422);
    }
    if (regStart && endDate && regStart > endDate) {
      throw new AppError("validation_error", "Registration start date cannot be after event end date.", 422);
    }
    if (regEnd && startDate) {
      const maxEnd = payload.allowLateRegistration && endDate ? endDate : startDate;
      if (regEnd > maxEnd) {
        throw new AppError(
          "validation_error",
          payload.allowLateRegistration
            ? "Registration end date cannot be after event end date when late registration is enabled."
            : "Registration end date cannot be after event start date when late registration is disabled.",
          422
        );
      }
    }
  }

  private validateTeamConfig(payload: { teamMinSize?: number; teamMaxSize?: number }) {
    const min = payload.teamMinSize ?? 1;
    const max = payload.teamMaxSize ?? 5;
    if (min > max) {
      throw new AppError("validation_error", "Team minimum size cannot exceed maximum size.", 422);
    }
  }

  // --- Public projection ---

  publicEvent(
    event: {
      id: string;
      title: string;
      description: string;
      coverUrl: string | null;
      category: EventCategory;
      status: EventStatus;
      startsAt: Date;
      endsAt: Date;
      location: string;
      capacity: number;
      registeredCount: number;
      xpReward: number;
      organizers: unknown;
      tags: unknown;
      slug?: string | null;
      shortDescription?: string | null;
      agenda?: string | null;
      highlights?: string | null;
      learningOutcomes?: string | null;
      targetAudience?: string | null;
      prerequisites?: string | null;
      speakers?: unknown;
      resources?: unknown;
      faqs?: unknown;
      imageGallery?: unknown;
      videoUrl?: string | null;
      venue?: string | null;
      eventType?: string | null;
      featured?: boolean;
      allowLateRegistration?: boolean;
      eventDays?: number;
      dayLabels?: unknown;
      registrationFields?: unknown;
      registrationStartDate?: Date | null;
      registrationEndDate?: Date | null;
      teamRegistration?: boolean;
      teamMinSize?: number;
      teamMaxSize?: number;
    },
    joined: boolean,
    participantCount?: number
  ) {
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
      // Rich content
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
      // Registration config
      allowLateRegistration: event.allowLateRegistration ?? false,
      eventDays: event.eventDays ?? 1,
      dayLabels: Array.isArray(event.dayLabels) ? event.dayLabels : [],
      registrationFields: Array.isArray(event.registrationFields) ? event.registrationFields : [],
      registrationStartDate: event.registrationStartDate ?? null,
      registrationEndDate: event.registrationEndDate ?? null,
      // Team config
      teamRegistration: event.teamRegistration ?? false,
      teamMinSize: event.teamMinSize ?? 1,
      teamMaxSize: event.teamMaxSize ?? 5
    };
  }
}
