import { ActivityService } from "../activity/activity.service";
import { PrismaService } from "../prisma/prisma.service";
import { UserService } from "../users/user.service";
import type { Role } from "../common/types";
export declare class MembersService {
    private readonly prisma;
    private readonly users;
    private readonly activity;
    constructor(prisma: PrismaService, users: UserService, activity: ActivityService);
    me(userId: string, role: Role): Promise<{
        status: string;
        requestedAt: Date | null;
        latestRequest: {
            id: string;
            status: import(".prisma/client").$Enums.MembershipStatus;
        } | null;
    }>;
    request(userId: string, role: Role, note?: string | null): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.MembershipStatus;
    }>;
    directory(viewer: {
        id: string;
        role: Role;
    }, query: Record<string, unknown>): Promise<import("../common/envelope").EnvelopeResult<{
        id: string;
        name: string;
        email: string;
        avatar: string | null;
        role: Role;
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
