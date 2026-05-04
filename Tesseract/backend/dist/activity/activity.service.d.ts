import { FeatureService } from "../features/feature.service";
import { PrismaService } from "../prisma/prisma.service";
type NotificationKind = "info" | "success" | "warning" | "event" | "game";
export declare class ActivityService {
    private readonly prisma;
    private readonly features;
    constructor(prisma: PrismaService, features: FeatureService);
    log(input: {
        action: string;
        title: string;
        actorUserId?: string | null;
        subjectUserId?: string | null;
        description?: string | null;
        meta?: Record<string, unknown>;
        xpDelta?: number;
    }): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        action: string;
        title: string;
        meta: import("@prisma/client/runtime/library").JsonValue;
        xpDelta: number;
        actorUserId: string | null;
        subjectUserId: string | null;
    }>;
    notify(userId: string, title: string, body: string, kind?: NotificationKind, meta?: Record<string, unknown>): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        meta: import("@prisma/client/runtime/library").JsonValue;
        body: string;
        kind: import(".prisma/client").$Enums.NotificationKind;
        readAt: Date | null;
    } | null>;
    listForUser(viewerId: string, viewerRole: string, query: Record<string, unknown>): Promise<import("../common/envelope").EnvelopeResult<{
        id: string;
        type: string;
        title: string;
        description: string | null;
        at: Date;
        meta: unknown;
    }[]>>;
    notifications(userId: string, query: Record<string, unknown>): Promise<import("../common/envelope").EnvelopeResult<{
        id: string;
        title: string;
        body: string;
        at: Date;
        read: boolean;
        kind: NotificationKind;
    }[]>>;
    markNotificationRead(id: string, userId: string): Promise<{
        ok: boolean;
    }>;
}
export {};
