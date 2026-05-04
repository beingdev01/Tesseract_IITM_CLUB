import { Injectable } from "@nestjs/common";

import { ActivityService } from "../activity/activity.service";
import { AppError } from "../common/app-error";
import { PrismaService } from "../prisma/prisma.service";
import type { GuestRole } from "@prisma/client";

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService
  ) {}

  /**
   * Create one or more invitations for an event.
   * Only core+ members can invite guests.
   */
  async create(
    eventId: string,
    invitations: { userId?: string; email?: string; guestRole: GuestRole; certificate?: boolean }[],
    actorId: string
  ) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new AppError("not_found", "Event not found.", 404);

    const results = [];

    for (const inv of invitations) {
      if (!inv.userId && !inv.email) {
        continue; // skip invalid entries
      }

      // Check for duplicate invitation
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
      .catch(() => {});

    return { results };
  }

  /**
   * Accept an invitation.
   */
  async accept(invitationId: string, userId: string) {
    const invitation = await this.prisma.eventInvitation.findUnique({
      where: { id: invitationId },
      include: { event: { select: { title: true } } }
    });
    if (!invitation) throw new AppError("not_found", "Invitation not found.", 404);
    if (invitation.userId && invitation.userId !== userId) {
      throw new AppError("forbidden", "This invitation is not for you.", 403);
    }
    if (invitation.revokedAt) {
      throw new AppError("revoked", "This invitation has been revoked.", 400);
    }
    if (invitation.accepted) {
      return { ok: true, status: "already_accepted" };
    }

    await this.prisma.eventInvitation.update({
      where: { id: invitationId },
      data: { accepted: true, acceptedAt: new Date(), userId }
    });

    // Also create an EventRegistration as GUEST if not already registered
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

  /**
   * Decline an invitation.
   */
  async decline(invitationId: string, userId: string) {
    const invitation = await this.prisma.eventInvitation.findUnique({ where: { id: invitationId } });
    if (!invitation) throw new AppError("not_found", "Invitation not found.", 404);
    if (invitation.userId && invitation.userId !== userId) {
      throw new AppError("forbidden", "This invitation is not for you.", 403);
    }

    await this.prisma.eventInvitation.update({
      where: { id: invitationId },
      data: { revokedAt: new Date() }
    });

    return { ok: true, status: "declined" };
  }

  /**
   * List the current user's invitations.
   */
  async myInvitations(userId: string) {
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

  /**
   * List all invitations for an event (admin view).
   */
  async eventInvitations(eventId: string) {
    return this.prisma.eventInvitation.findMany({
      where: { eventId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } }
      },
      orderBy: { createdAt: "desc" }
    });
  }
}
