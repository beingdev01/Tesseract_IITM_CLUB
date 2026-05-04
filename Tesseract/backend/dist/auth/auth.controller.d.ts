import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    login(body: unknown, req: Request, res: Response): Promise<{
        token: string;
        user: {
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
        };
    }>;
    signup(body: unknown, req: Request, res: Response): Promise<{
        token: string;
        user: {
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
        };
    }>;
    google(body: unknown, req: Request, res: Response): Promise<{
        token: string;
        user: {
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
        };
    }>;
    refresh(req: Request, res: Response): Promise<{
        token: string;
        user: {
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
        };
    }>;
    logout(req: Request, authorization: string | undefined, res: Response): Promise<{
        ok: boolean;
    }>;
}
