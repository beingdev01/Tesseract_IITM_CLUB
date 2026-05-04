import type { Request } from "express";
import { TeamsService } from "./teams.service";
export declare class TeamsController {
    private readonly teams;
    constructor(teams: TeamsService);
    create(body: unknown, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        team: Record<string, unknown>;
        event: Record<string, unknown>;
    }>;
    join(body: unknown, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        team: Record<string, unknown>;
        event: Record<string, unknown>;
    }>;
    myTeam(eventId: string, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        id: string;
        eventId: string;
        teamName: string;
        inviteCode: string | undefined;
        leaderId: string;
        isLocked: boolean;
        createdAt: Date;
        members: {
            id: string;
            userId: string;
            role: import(".prisma/client").$Enums.TeamRole;
            joinedAt: Date;
            user: {
                id: string;
                name: string;
                email: string;
                avatarUrl: string | null;
            };
        }[];
        minimumTeamSize: number;
        maximumTeamSize: number;
        isComplete: boolean;
        isFull: boolean;
    } | null>;
    toggleLock(teamId: string, body: unknown, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        ok: boolean;
        isLocked: boolean;
    }>;
    dissolve(teamId: string, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        ok: boolean;
    }>;
    removeMember(teamId: string, body: unknown, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        ok: boolean;
    }>;
}
