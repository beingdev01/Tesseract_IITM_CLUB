import { ActivityService } from "../activity/activity.service";
import { PrismaService } from "../prisma/prisma.service";
export declare class TeamsService {
    private readonly prisma;
    private readonly activity;
    constructor(prisma: PrismaService, activity: ActivityService);
    createTeam(eventId: string, userId: string, teamName: string, customFieldResponses?: unknown): Promise<{
        team: Record<string, unknown>;
        event: Record<string, unknown>;
    }>;
    joinTeam(userId: string, inviteCode: string, customFieldResponses?: unknown): Promise<{
        team: Record<string, unknown>;
        event: Record<string, unknown>;
    }>;
    myTeam(eventId: string, userId: string): Promise<{
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
    toggleLock(teamId: string, userId: string, lock: boolean): Promise<{
        ok: boolean;
        isLocked: boolean;
    }>;
    dissolveTeam(teamId: string, userId: string): Promise<{
        ok: boolean;
    }>;
    removeMember(teamId: string, leaderId: string, targetUserId: string): Promise<{
        ok: boolean;
    }>;
}
