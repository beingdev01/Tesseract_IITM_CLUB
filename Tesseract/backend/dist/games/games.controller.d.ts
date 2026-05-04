import type { Request } from "express";
import { GamesService } from "./games.service";
export declare class GamesController {
    private readonly games;
    constructor(games: GamesService);
    list(query: Record<string, unknown>): Promise<import("../common/envelope").EnvelopeResult<{
        id: string;
        name: string;
        tagline: string;
        cover: string | null;
        emoji: string;
        category: string;
        difficulty: "easy" | "medium" | "hard" | "nightmare";
        playersOnline: number;
        highScore: number;
        bestPlayer: string | undefined;
        description: string;
        howToPlay: any[];
        rules: any[];
        xpReward: number;
    }[]>>;
    get(id: string): Promise<{
        id: string;
        name: string;
        tagline: string;
        cover: string | null;
        emoji: string;
        category: string;
        difficulty: "easy" | "medium" | "hard" | "nightmare";
        playersOnline: number;
        highScore: number;
        bestPlayer: string | undefined;
        description: string;
        howToPlay: any[];
        rules: any[];
        xpReward: number;
    }>;
    create(body: unknown, req: Request & {
        user: {
            id: string;
            role: "guest" | "member" | "core" | "admin";
        };
    }): Promise<{
        id: string;
        name: string;
        tagline: string;
        cover: string | null;
        emoji: string;
        category: string;
        difficulty: "easy" | "medium" | "hard" | "nightmare";
        playersOnline: number;
        highScore: number;
        bestPlayer: string | undefined;
        description: string;
        howToPlay: any[];
        rules: any[];
        xpReward: number;
    }>;
    update(id: string, body: unknown, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        id: string;
        name: string;
        tagline: string;
        cover: string | null;
        emoji: string;
        category: string;
        difficulty: "easy" | "medium" | "hard" | "nightmare";
        playersOnline: number;
        highScore: number;
        bestPlayer: string | undefined;
        description: string;
        howToPlay: any[];
        rules: any[];
        xpReward: number;
    }>;
    remove(id: string, req: Request & {
        user: {
            id: string;
        };
    }): Promise<{
        ok: boolean;
    }>;
    submitScore(id: string, body: unknown, idempotencyKey: string | undefined, req: Request & {
        user: {
            id: string;
            role: "guest" | "member" | "core" | "admin";
        };
    }): Promise<{
        rank: number;
        personalBest: boolean;
        xpAwarded: number;
    }>;
}
