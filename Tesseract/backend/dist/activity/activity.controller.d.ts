import type { Request } from "express";
import { ActivityService } from "./activity.service";
export declare class ActivityController {
    private readonly activity;
    constructor(activity: ActivityService);
    feed(query: Record<string, unknown>, req: Request & {
        user: {
            id: string;
            role: string;
        };
    }): Promise<import("../common/envelope").EnvelopeResult<{
        id: string;
        type: string;
        title: string;
        description: string | null;
        at: Date;
        meta: unknown;
    }[]>>;
    notifications(query: Record<string, unknown>, req: Request & {
        user: {
            id: string;
        };
    }): Promise<import("../common/envelope").EnvelopeResult<{
        id: string;
        title: string;
        body: string;
        at: Date;
        read: boolean;
        kind: "info" | "event" | "game" | "success" | "warning";
    }[]>>;
    markRead(id: string, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        ok: boolean;
    }>;
}
