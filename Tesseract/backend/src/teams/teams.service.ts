import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

import { ActivityService } from "../activity/activity.service";
import { AppError } from "../common/app-error";
import { generateAttendanceToken } from "../common/attendance-token";
import { generateInviteCode } from "../common/invite-code";
import { getRegistrationStatus } from "../common/registration-status";
import {
  validateRegistrationFieldSubmissions,
  type RegistrationFieldDefinition
} from "../common/registration-fields";
import { PrismaService } from "../prisma/prisma.service";

const TRANSACTION_RETRIES = 3;

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService
  ) {}

  /**
   * Create a team for a team-registration event.
   * The creator becomes the team leader.
   */
  async createTeam(
    eventId: string,
    userId: string,
    teamName: string,
    customFieldResponses?: unknown
  ) {
    let result: {
      team: Record<string, unknown>;
      event: Record<string, unknown>;
    } | null = null;

    for (let attempt = 0; attempt < TRANSACTION_RETRIES; attempt++) {
      const registrationId = randomUUID();
      try {
        result = await this.prisma.$transaction(
          async (tx) => {
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
            if (!event.teamRegistration) {
              throw new AppError("not_team_event", "This event does not support team registration.", 400);
            }

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

            // Check team name not taken
            const existingTeam = await tx.eventTeam.findFirst({
              where: { eventId, teamName }
            });
            if (existingTeam) {
              throw new AppError("team_name_taken", "This team name is already taken for this event.", 409);
            }

            // Validate custom fields
            const fieldSchema = Array.isArray(event.registrationFields)
              ? (event.registrationFields as unknown as RegistrationFieldDefinition[])
              : [];
            const validatedFields = validateRegistrationFieldSubmissions(fieldSchema, customFieldResponses);

            // Check capacity
            if (event.capacity > 0 && event._count.registrations >= event.capacity) {
              throw new AppError("capacity_full", "This event is full.", 422);
            }

            // Create registration
            const attendanceToken = generateAttendanceToken(userId, eventId, registrationId);
            const registration = await tx.eventRegistration.create({
              data: {
                id: registrationId,
                eventId,
                userId,
                registrationType: "PARTICIPANT",
                customFieldResponses: validatedFields.length > 0 ? (validatedFields as unknown as Prisma.JsonArray) : Prisma.JsonNull,
                attendanceToken
              }
            });

            // Create team with invite code
            const inviteCode = generateInviteCode();
            const team = await tx.eventTeam.create({
              data: {
                eventId,
                teamName,
                inviteCode,
                leaderId: userId
              }
            });

            // Create team member (leader)
            await tx.eventTeamMember.create({
              data: {
                teamId: team.id,
                registrationId: registration.id,
                userId,
                role: "LEADER"
              }
            });

            // Create day attendance rows
            if (event.eventDays > 1) {
              await tx.dayAttendance.createMany({
                data: Array.from({ length: event.eventDays }, (_, i) => ({
                  registrationId: registration.id,
                  dayNumber: i + 1
                }))
              });
            }

            // Update counter
            await tx.event.update({
              where: { id: eventId },
              data: { registeredCount: { increment: 1 } }
            });

            // Fetch complete team with members
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
                id: completeTeam!.id,
                teamName: completeTeam!.teamName,
                inviteCode: completeTeam!.inviteCode,
                leaderId: completeTeam!.leaderId,
                isLocked: completeTeam!.isLocked,
                createdAt: completeTeam!.createdAt,
                members: completeTeam!.members.map((m) => ({
                  id: m.id,
                  userId: m.userId,
                  role: m.role,
                  joinedAt: m.joinedAt,
                  user: m.registration.user
                })),
                isComplete: completeTeam!.members.length >= event.teamMinSize,
                isFull: completeTeam!.members.length >= event.teamMaxSize
              },
              event: {
                teamMinSize: event.teamMinSize,
                teamMaxSize: event.teamMaxSize,
                title: event.title,
                startsAt: event.startsAt,
                slug: event.slug
              }
            };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );
        break;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034" &&
          attempt < TRANSACTION_RETRIES - 1
        ) {
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 100 * (attempt + 1)));
          continue;
        }
        throw error;
      }
    }

    if (!result) {
      throw new AppError("team_create_failed", "Team creation failed after retries.", 500);
    }

    this.activity
      .log({
        action: "team_create",
        title: `Created team: ${teamName}`,
        actorUserId: userId,
        subjectUserId: userId,
        meta: { eventId, teamId: (result.team as { id: string }).id }
      })
      .catch(() => {});

    return result;
  }

  /**
   * Join an existing team via invite code.
   */
  async joinTeam(userId: string, inviteCode: string, customFieldResponses?: unknown) {
    if (inviteCode.length !== 8) {
      throw new AppError("invalid_code", "Invalid invite code.", 400);
    }

    let result: {
      team: Record<string, unknown>;
      event: Record<string, unknown>;
    } | null = null;

    for (let attempt = 0; attempt < TRANSACTION_RETRIES; attempt++) {
      const registrationId = randomUUID();
      try {
        result = await this.prisma.$transaction(
          async (tx) => {
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

            if (!team) throw new AppError("team_not_found", "Team not found.", 404);
            if (team.isLocked) throw new AppError("team_locked", "This team is locked.", 400);

            const event = team.event;

            // Check team not full
            if (team.members.length >= event.teamMaxSize) {
              throw new AppError("team_full", "This team is full.", 422);
            }

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
            if (regStatus === "closed" || regStatus === "not_started") {
              throw new AppError("registration_closed", "Registration is closed.", 400);
            }

            // Check not already registered
            const existing = await tx.eventRegistration.findUnique({
              where: { eventId_userId: { eventId: event.id, userId } }
            });
            if (existing) {
              throw new AppError("already_registered", "You are already registered for this event.", 409);
            }

            // Validate custom fields
            const fieldSchema = Array.isArray(event.registrationFields)
              ? (event.registrationFields as unknown as RegistrationFieldDefinition[])
              : [];
            const validatedFields = validateRegistrationFieldSubmissions(fieldSchema, customFieldResponses);

            // Check capacity
            if (event.capacity > 0 && event._count.registrations >= event.capacity) {
              throw new AppError("capacity_full", "This event is full.", 422);
            }

            // Create registration
            const attendanceToken = generateAttendanceToken(userId, event.id, registrationId);
            const registration = await tx.eventRegistration.create({
              data: {
                id: registrationId,
                eventId: event.id,
                userId,
                registrationType: "PARTICIPANT",
                customFieldResponses: validatedFields.length > 0 ? (validatedFields as unknown as Prisma.JsonArray) : Prisma.JsonNull,
                attendanceToken
              }
            });

            // Create team member
            await tx.eventTeamMember.create({
              data: {
                teamId: team.id,
                registrationId: registration.id,
                userId,
                role: "MEMBER"
              }
            });

            // Day attendance
            if (event.eventDays > 1) {
              await tx.dayAttendance.createMany({
                data: Array.from({ length: event.eventDays }, (_, i) => ({
                  registrationId: registration.id,
                  dayNumber: i + 1
                }))
              });
            }

            // Update counter
            await tx.event.update({
              where: { id: event.id },
              data: { registeredCount: { increment: 1 } }
            });

            // Fetch complete team
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
                id: completeTeam!.id,
                teamName: completeTeam!.teamName,
                inviteCode: completeTeam!.inviteCode,
                leaderId: completeTeam!.leaderId,
                isLocked: completeTeam!.isLocked,
                createdAt: completeTeam!.createdAt,
                members: completeTeam!.members.map((m) => ({
                  id: m.id,
                  userId: m.userId,
                  role: m.role,
                  joinedAt: m.joinedAt,
                  user: m.registration.user
                })),
                isComplete: completeTeam!.members.length >= event.teamMinSize,
                isFull: completeTeam!.members.length >= event.teamMaxSize
              },
              event: {
                teamMinSize: event.teamMinSize,
                teamMaxSize: event.teamMaxSize,
                title: event.title,
                startsAt: event.startsAt,
                slug: event.slug
              }
            };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );
        break;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034" &&
          attempt < TRANSACTION_RETRIES - 1
        ) {
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 100 * (attempt + 1)));
          continue;
        }
        throw error;
      }
    }

    if (!result) {
      throw new AppError("join_failed", "Joining team failed after retries.", 500);
    }

    this.activity
      .log({
        action: "team_join",
        title: `Joined team: ${(result.team as { teamName: string }).teamName}`,
        actorUserId: userId,
        subjectUserId: userId,
        meta: { teamId: (result.team as { id: string }).id }
      })
      .catch(() => {});

    return result;
  }

  /**
   * Get the user's team for a specific event.
   */
  async myTeam(eventId: string, userId: string) {
    const registration = await this.prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } }
    });
    if (!registration) return null;

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
    if (!membership) return null;

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

  /**
   * Lock or unlock a team (leader only).
   */
  async toggleLock(teamId: string, userId: string, lock: boolean) {
    const team = await this.prisma.eventTeam.findUnique({ where: { id: teamId } });
    if (!team) throw new AppError("not_found", "Team not found.", 404);
    if (team.leaderId !== userId) {
      throw new AppError("forbidden", "Only the team leader can lock/unlock the team.", 403);
    }

    await this.prisma.eventTeam.update({
      where: { id: teamId },
      data: { isLocked: lock }
    });

    return { ok: true, isLocked: lock };
  }

  /**
   * Dissolve a team (leader only). This removes the team and unregisters all members.
   */
  async dissolveTeam(teamId: string, userId: string) {
    const team = await this.prisma.eventTeam.findUnique({
      where: { id: teamId },
      include: { members: true, event: true }
    });
    if (!team) throw new AppError("not_found", "Team not found.", 404);
    if (team.leaderId !== userId) {
      throw new AppError("forbidden", "Only the team leader can dissolve the team.", 403);
    }
    if (team.event.startsAt.getTime() <= Date.now()) {
      throw new AppError("event_started", "Cannot dissolve team after the event has started.", 400);
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
    }).catch(() => {});

    return { ok: true };
  }

  /**
   * Remove a member from the team (leader only).
   */
  async removeMember(teamId: string, leaderId: string, targetUserId: string) {
    const team = await this.prisma.eventTeam.findUnique({
      where: { id: teamId },
      include: { members: true, event: true }
    });
    if (!team) throw new AppError("not_found", "Team not found.", 404);
    if (team.leaderId !== leaderId) {
      throw new AppError("forbidden", "Only the team leader can remove members.", 403);
    }
    if (team.event.startsAt.getTime() <= Date.now()) {
      throw new AppError("event_started", "Cannot remove members after the event has started.", 400);
    }
    if (leaderId === targetUserId) {
      throw new AppError("forbidden", "Cannot remove yourself. Dissolve the team instead.", 400);
    }

    const memberToRemove = team.members.find(m => m.userId === targetUserId);
    if (!memberToRemove) {
      throw new AppError("not_found", "User is not in this team.", 404);
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
}
