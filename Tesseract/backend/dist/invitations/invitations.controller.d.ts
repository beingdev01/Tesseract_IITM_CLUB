import type { Request } from "express";
import { InvitationsService } from "./invitations.service";
export declare class InvitationsController {
    private readonly invitations;
    constructor(invitations: InvitationsService);
    create(body: unknown, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
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
    accept(id: string, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        ok: boolean;
        status: string;
    }>;
    decline(id: string, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        ok: boolean;
        status: string;
    }>;
    myInvitations(req: Request & {
        user: {
            id: string;
        };
    }): Promise<({
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
