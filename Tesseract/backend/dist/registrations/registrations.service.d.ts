import { Prisma } from "@prisma/client";
import { ActivityService } from "../activity/activity.service";
import { PrismaService } from "../prisma/prisma.service";
export declare class RegistrationsService {
    private readonly prisma;
    private readonly activity;
    constructor(prisma: PrismaService, activity: ActivityService);
    register(eventId: string, userId: string, additionalFields?: unknown): Promise<{
        id: string;
        userId: string;
        eventId: string;
        registeredAt: Date;
        customFieldResponses: Prisma.JsonValue;
        event: {
            id: string;
            title: string;
            startsAt: Date;
            slug: string | null;
        };
    }>;
    unregister(eventId: string, userId: string): Promise<{
        ok: boolean;
    }>;
    myRegistrations(userId: string): Promise<({
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
        customFieldResponses: Prisma.JsonValue | null;
        attendanceToken: string | null;
        registeredAt: Date;
    })[]>;
    registrationStatus(eventId: string, userId: string): Promise<{
        isRegistered: boolean;
        registeredAt: Date | null;
    }>;
}
