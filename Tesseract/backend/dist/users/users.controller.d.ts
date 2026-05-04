import type { Request } from "express";
import { ActivityService } from "../activity/activity.service";
import { UserService } from "./user.service";
export declare class UsersController {
    private readonly users;
    private readonly activity;
    constructor(users: UserService, activity: ActivityService);
    me(req: Request & {
        user: {
            id: string;
            role: "guest" | "member" | "core" | "admin";
        };
    }): Promise<{
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
    }>;
    patchMe(body: unknown, req: Request & {
        user: {
            id: string;
            role: "guest" | "member" | "core" | "admin";
        };
    }): Promise<{
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
    }>;
    profile(id: string, req: Request & {
        user: {
            id: string;
            role: "guest" | "member" | "core" | "admin";
        };
    }): Promise<{
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
    }>;
}
