import type { Request } from "express";
import { RegistrationsService } from "./registrations.service";
export declare class RegistrationsController {
    private readonly registrations;
    constructor(registrations: RegistrationsService);
    register(eventId: string, body: {
        additionalFields?: unknown;
    }, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        id: string;
        userId: string;
        eventId: string;
        registeredAt: Date;
        customFieldResponses: import("@prisma/client/runtime/library").JsonValue;
        event: {
            id: string;
            title: string;
            startsAt: Date;
            slug: string | null;
        };
    }>;
    unregister(eventId: string, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        ok: boolean;
    }>;
    myRegistrations(req: Request & {
        user: {
            id: string;
        };
    }): Promise<({
        event: {
            id: string;
            _count: {
                registrations: number;
            };
            title: string;
            coverUrl: string | null;
            status: import(".prisma/client").$Enums.EventStatus;
            startsAt: Date;
            endsAt: Date;
            capacity: number;
            slug: string | null;
            eventType: string | null;
            teamRegistration: boolean;
            teamMinSize: number;
            teamMaxSize: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        registrationType: import(".prisma/client").$Enums.RegistrationType;
        eventId: string;
        customFieldResponses: import("@prisma/client/runtime/library").JsonValue | null;
        attendanceToken: string | null;
        registeredAt: Date;
    })[]>;
    status(eventId: string, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        isRegistered: boolean;
        registeredAt: Date | null;
    }>;
}
