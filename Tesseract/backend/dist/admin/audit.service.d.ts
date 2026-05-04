import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
export declare class AuditService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    log(input: {
        actorId: string;
        action: string;
        targetType: string;
        targetId: string;
        before?: unknown;
        after?: unknown;
        request?: Request;
        note?: string | null;
    }): Promise<{
        id: string;
        createdAt: Date;
        action: string;
        note: string | null;
        targetType: string;
        targetId: string;
        before: import("@prisma/client/runtime/library").JsonValue | null;
        after: import("@prisma/client/runtime/library").JsonValue | null;
        ipAddress: string | null;
        userAgent: string | null;
        actorId: string;
    }>;
}
export declare function toJson(value: unknown): any | undefined;
