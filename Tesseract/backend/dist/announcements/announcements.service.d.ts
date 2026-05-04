import { ActivityService } from "../activity/activity.service";
import { PrismaService } from "../prisma/prisma.service";
type AnnouncementInput = {
    title: string;
    content: string;
    priority?: number;
    pinned?: boolean;
};
export declare class AnnouncementsService {
    private readonly prisma;
    private readonly activity;
    constructor(prisma: PrismaService, activity: ActivityService);
    list(query: Record<string, unknown>): Promise<import("../common/envelope").EnvelopeResult<({
        createdBy: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        createdById: string;
        content: string;
        priority: number;
        pinned: boolean;
        publishedAt: Date;
    })[]>>;
    get(id: string): Promise<{
        createdBy: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        createdById: string;
        content: string;
        priority: number;
        pinned: boolean;
        publishedAt: Date;
    }>;
    create(payload: AnnouncementInput, actorId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        createdById: string;
        content: string;
        priority: number;
        pinned: boolean;
        publishedAt: Date;
    }>;
    update(id: string, patch: Partial<AnnouncementInput>, actorId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        createdById: string;
        content: string;
        priority: number;
        pinned: boolean;
        publishedAt: Date;
    }>;
    remove(id: string, actorId: string): Promise<{
        ok: boolean;
    }>;
}
export {};
