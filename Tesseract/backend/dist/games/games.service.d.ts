import { ActivityService } from "../activity/activity.service";
import { FeatureService } from "../features/feature.service";
import { PrismaService } from "../prisma/prisma.service";
import type { Role } from "../common/types";
type GameDifficulty = "easy" | "medium" | "hard" | "nightmare";
type GameInput = {
    name: string;
    tagline: string;
    cover?: string | null;
    emoji: string;
    category: string;
    difficulty: GameDifficulty;
    playersOnline?: number;
    description: string;
    howToPlay?: string[];
    rules?: string[];
    xpReward?: number;
};
export type GameAdapter = {
    validateScore(input: {
        score: number;
        userId: string;
        gameId: string;
    }): Promise<{
        valid: boolean;
        score: number;
    }>;
    startSession(input: {
        userId: string;
        gameId: string;
    }): Promise<unknown>;
    finishSession(input: {
        userId: string;
        gameId: string;
        sessionId: string;
    }): Promise<unknown>;
};
export declare class GamesService {
    private readonly prisma;
    private readonly features;
    private readonly activity;
    constructor(prisma: PrismaService, features: FeatureService, activity: ActivityService);
    list(query: Record<string, unknown>): Promise<import("../common/envelope").EnvelopeResult<{
        id: string;
        name: string;
        tagline: string;
        cover: string | null;
        emoji: string;
        category: string;
        difficulty: GameDifficulty;
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
        difficulty: GameDifficulty;
        playersOnline: number;
        highScore: number;
        bestPlayer: string | undefined;
        description: string;
        howToPlay: any[];
        rules: any[];
        xpReward: number;
    }>;
    create(payload: GameInput, actor: {
        id: string;
        role: Role;
    }): Promise<{
        id: string;
        name: string;
        tagline: string;
        cover: string | null;
        emoji: string;
        category: string;
        difficulty: GameDifficulty;
        playersOnline: number;
        highScore: number;
        bestPlayer: string | undefined;
        description: string;
        howToPlay: any[];
        rules: any[];
        xpReward: number;
    }>;
    update(id: string, patch: Partial<GameInput>, actor: {
        id: string;
    }): Promise<{
        id: string;
        name: string;
        tagline: string;
        cover: string | null;
        emoji: string;
        category: string;
        difficulty: GameDifficulty;
        playersOnline: number;
        highScore: number;
        bestPlayer: string | undefined;
        description: string;
        howToPlay: any[];
        rules: any[];
        xpReward: number;
    }>;
    remove(id: string, actor: {
        id: string;
    }): Promise<{
        ok: boolean;
    }>;
    submitScore(id: string, score: number, user: {
        id: string;
        role: Role;
    }, idempotencyKey?: string): Promise<{
        rank: number;
        personalBest: boolean;
        xpAwarded: number;
    }>;
    publicGame(game: {
        id: string;
        name: string;
        tagline: string;
        coverUrl: string | null;
        emoji: string;
        category: string;
        difficulty: GameDifficulty;
        playersOnline: number;
        highScore: number;
        bestPlayer?: {
            name: string;
        } | null;
        description: string;
        howToPlay: unknown;
        rules: unknown;
        xpReward: number;
    }): {
        id: string;
        name: string;
        tagline: string;
        cover: string | null;
        emoji: string;
        category: string;
        difficulty: GameDifficulty;
        playersOnline: number;
        highScore: number;
        bestPlayer: string | undefined;
        description: string;
        howToPlay: any[];
        rules: any[];
        xpReward: number;
    };
}
export {};
