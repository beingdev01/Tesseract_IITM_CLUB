import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

import { ActivityService } from "../activity/activity.service";
import { AppError } from "../common/app-error";
import { generateAttendanceToken } from "../common/attendance-token";
import { getRegistrationStatus } from "../common/registration-status";
import {
  validateRegistrationFieldSubmissions,
  type RegistrationFieldDefinition,
  type RegistrationFieldSubmission
} from "../common/registration-fields";
import { PrismaService } from "../prisma/prisma.service";

const TRANSACTION_RETRIES = 3;

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService
  ) {}

  /**
   * Register for an event (individual, non-team).
   * Uses serializable isolation + retry loop to prevent capacity race conditions.
   */
  async register(eventId: string, userId: string, additionalFields?: unknown) {
    // Pre-check: team registration gate
    const eventGate = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { teamRegistration: true }
    });
    if (!eventGate) throw new AppError("not_found", "Event not found.", 404);
    if (eventGate.teamRegistration) {
      throw new AppError(
        "team_required",
        "This event requires team registration. Please create or join a team instead.",
        400
      );
    }

    let registration: {
      id: string;
      userId: string;
      eventId: string;
      registeredAt: Date;
      customFieldResponses: Prisma.JsonValue | null;
      attendanceToken: string | null;
      event: { id: string; title: string; startsAt: Date; slug: string | null };
    } | null = null;

    for (let attempt = 0; attempt < TRANSACTION_RETRIES; attempt++) {
      const registrationId = randomUUID();
      try {
        registration = await this.prisma.$transaction(
          async (tx) => {
            // Fetch event with PARTICIPANT registration count
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

            if (!event) throw new AppError("not_found", "Event not found.", 404);

            // Check event not ended
            if (
              event.endsAt.getTime() < Date.now() ||
              ["completed", "past", "cancelled"].includes(event.status)
            ) {
              throw new AppError("event_ended", "This event has ended.", 410);
            }

            // Check registration window
            const regStatus = getRegistrationStatus({
              registrationStartDate: event.registrationStartDate,
              registrationEndDate: event.registrationEndDate,
              startsAt: event.startsAt,
              endsAt: event.endsAt,
              capacity: event.capacity,
              registeredCount: event._count.registrations,
              allowLateRegistration: event.allowLateRegistration
            });
            if (regStatus === "not_started") {
              throw new AppError("registration_not_started", "Registration has not started yet.", 400);
            }
            if (regStatus === "closed") {
              throw new AppError("registration_closed", "Registration is closed.", 400);
            }

            // Check not already registered
            const existing = await tx.eventRegistration.findUnique({
              where: { eventId_userId: { eventId, userId } }
            });
            if (existing) {
              throw new AppError("already_registered", "You are already registered for this event.", 409);
            }

            // Validate custom fields
            const fieldSchema = Array.isArray(event.registrationFields)
              ? (event.registrationFields as unknown as RegistrationFieldDefinition[])
              : [];
            const validatedFields = validateRegistrationFieldSubmissions(fieldSchema, additionalFields);

            // Check capacity (only PARTICIPANT count)
            if (event.capacity > 0 && event._count.registrations >= event.capacity) {
              throw new AppError("capacity_full", "This event is full.", 422);
            }

            // Create registration
            const attendanceToken = generateAttendanceToken(userId, eventId, registrationId);
            const reg = await tx.eventRegistration.create({
              data: {
                id: registrationId,
                eventId,
                userId,
                registrationType: "PARTICIPANT",
                customFieldResponses: validatedFields.length > 0 ? (validatedFields as unknown as Prisma.JsonArray) : Prisma.JsonNull,
                attendanceToken
              },
              include: {
                event: {
                  select: { id: true, title: true, startsAt: true, slug: true }
                }
              }
            });

            // Create day attendance rows
            if (event.eventDays > 1) {
              await tx.dayAttendance.createMany({
                data: Array.from({ length: event.eventDays }, (_, i) => ({
                  registrationId: reg.id,
                  dayNumber: i + 1
                }))
              });
            }

            // Update denormalized counter
            await tx.event.update({
              where: { id: eventId },
              data: { registeredCount: { increment: 1 } }
            });

            return reg;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );
        break; // Success, exit retry loop
      } catch (error) {
        // Retry on serialization failure (P2034)
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034" &&
          attempt < TRANSACTION_RETRIES - 1
        ) {
          // Jittered backoff
          await new Promise((resolve) =>
            setTimeout(resolve, Math.random() * 100 * (attempt + 1))
          );
          continue;
        }
        throw error;
      }
    }

    if (!registration) {
      throw new AppError("registration_failed", "Registration failed after retries.", 500);
    }

    // Side effects (non-blocking)
    this.activity
      .log({
        action: "event_register",
        title: `Registered for ${registration.event.title}`,
        actorUserId: userId,
        subjectUserId: userId,
        meta: { eventId, registrationId: registration.id }
      })
      .catch(() => {}); // fire-and-forget

    return {
      id: registration.id,
      userId: registration.userId,
      eventId: registration.eventId,
      registeredAt: registration.registeredAt,
      customFieldResponses: registration.customFieldResponses,
      event: registration.event
    };
  }

  /**
   * Unregister from an event.
   */
  async unregister(eventId: string, userId: string) {
    const registration = await this.prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
      include: { event: { select: { startsAt: true, title: true } } }
    });
    if (!registration) {
      throw new AppError("not_registered", "You are not registered for this event.", 404);
    }

    // Block if event already started
    if (registration.event.startsAt.getTime() <= Date.now()) {
      throw new AppError("event_started", "Cannot unregister after the event has started.", 400);
    }

    // Block if user is a team leader
    const teamMembership = await this.prisma.eventTeamMember.findFirst({
      where: { registrationId: registration.id, role: "LEADER" }
    });
    if (teamMembership) {
      throw new AppError(
        "team_leader",
        "Team leaders cannot unregister. Dissolve the team first.",
        400
      );
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
      .catch(() => {});

    return { ok: true };
  }

  /**
   * Get all registrations for the current user.
   */
  async myRegistrations(userId: string) {
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

  /**
   * Check if the current user is registered for an event.
   */
  async registrationStatus(eventId: string, userId: string) {
    const registration = await this.prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { id: true, registeredAt: true }
    });
    return {
      isRegistered: Boolean(registration),
      registeredAt: registration?.registeredAt ?? null
    };
  }
}
