import type { Request } from "express";
import { MembersService } from "./members.service";
export declare class MembersController {
    private readonly members;
    constructor(members: MembersService);
    me(req: Request & {
        user: {
            id: string;
            role: "guest" | "member" | "core" | "admin";
        };
    }): Promise<{
        status: string;
        requestedAt: Date | null;
        latestRequest: {
            id: string;
            status: import(".prisma/client").$Enums.MembershipStatus;
        } | null;
    }>;
    request(body: unknown, req: Request & {
        user: {
            id: string;
            role: "guest" | "member" | "core" | "admin";
        };
    }): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.MembershipStatus;
    }>;
    directory(query: Record<string, unknown>, req: Request & {
        user: {
            id: string;
            role: "admin";
        };
    }): Promise<import("../common/envelope").EnvelopeResult<{
        id: string;
        name: string;
        email: string;
        avatar: string | null;
        role: import("../common/types").Role;
        rollNumber: string | null | undefined;
        level: string;
        joinedAt: Date;
        xp: number;
        rank: number;
        streak: number;
        bio: string | null;
        phone: string | null | undefined;
        course: string | null;
        branch: string | null;
        year: string | null;
        profileCompleted: boolean;
        badges: never[];
        membershipStatus: string;
        membershipRequestedAt: Date | null;
    }[]>>;
}
