import type { Request } from "express";
import { AnnouncementsService } from "./announcements.service";
export declare class AnnouncementsController {
    private readonly announcements;
    constructor(announcements: AnnouncementsService);
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
    create(body: unknown, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
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
    update(id: string, body: unknown, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
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
    remove(id: string, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        ok: boolean;
    }>;
}
