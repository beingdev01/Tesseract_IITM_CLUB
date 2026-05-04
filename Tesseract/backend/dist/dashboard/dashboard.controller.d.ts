import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
export declare class DashboardController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    stats(req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        eventsJoined: number;
        gamesPlayed: number;
        totalXP: number;
        streak: number;
        rank: number;
        weeklyXP: {
            day: string;
            xp: number;
        }[];
    }>;
    publicSummary(): Promise<{
        totalUsers: number;
        totalGames: number;
        activeEvents: number;
        liveGames: {
            id: string;
            name: string;
            emoji: string;
            playersOnline: number;
        }[];
        topPlayers: never[];
    }>;
}
