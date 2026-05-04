import { ActivityService } from "../activity/activity.service";
import { PrismaService } from "../prisma/prisma.service";
import type { GuestRole } from "@prisma/client";
export declare class InvitationsService {
    private readonly prisma;
    private readonly activity;
    constructor(prisma: PrismaService, activity: ActivityService);
    create(eventId: string, invitations: {
        userId?: string;
        email?: string;
        guestRole: GuestRole;
        certificate?: boolean;
    }[], actorId: string): Promise<{
        results: ({
            status: string;
            userId: string;
            reason: string;
            id?: undefined;
            guestRole?: undefined;
        } | {
            status: string;
            id: string;
            guestRole: import(".prisma/client").$Enums.GuestRole;
            userId?: undefined;
            reason?: undefined;
        })[];
    }>;
    accept(invitationId: string, userId: string): Promise<{
        ok: boolean;
        status: string;
    }>;
    decline(invitationId: string, userId: string): Promise<{
        ok: boolean;
        status: string;
    }>;
    myInvitations(userId: string): Promise<({
        event: {
            id: string;
            title: string;
            coverUrl: string | null;
            status: import(".prisma/client").$Enums.EventStatus;
            startsAt: Date;
            endsAt: Date;
            location: string;
            slug: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        email: string | null;
        eventId: string;
        revokedAt: Date | null;
        guestRole: import(".prisma/client").$Enums.GuestRole;
        accepted: boolean;
        acceptedAt: Date | null;
        certificate: boolean;
    })[]>;
    eventInvitations(eventId: string): Promise<({
        user: {
            id: string;
            name: string;
            email: string;
            avatarUrl: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        email: string | null;
        eventId: string;
        revokedAt: Date | null;
        guestRole: import(".prisma/client").$Enums.GuestRole;
        accepted: boolean;
        acceptedAt: Date | null;
        certificate: boolean;
    })[]>;
}
