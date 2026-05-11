import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { ApiResponse, ErrorCodes } from '../utils/response.js';
import { GAME_CATALOG, GAME_BY_ID } from './catalog.js';
import { withRetry } from '../lib/prisma.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';

const LIVE_WINDOW_MS = 10 * 60 * 1000;

const BASE_PLAYS_BY_GAME_ID: Record<string, number> = {
  'smash-kart': 0,
  scribbl: 3890,
  'puzzle-run': 5620,
  'brain-teasers': 2140,
  'cipher-lab': 1890,
  'riddle-room': 1440,
  'type-wars': 990,
  'trivia-tower': 2310,
};

type GameStats = {
  totalSessions: number;
  liveSessions: number;
};

const toGameStatsMap = async (): Promise<Map<string, GameStats>> => {
  const [totalByGame, liveByGame] = await Promise.all([
    withRetry(() => prisma.gameSession.groupBy({
      by: ['gameId'],
      _count: { _all: true },
    })),
    withRetry(() => prisma.gameSession.groupBy({
      by: ['gameId'],
      where: {
        createdAt: {
          gte: new Date(Date.now() - LIVE_WINDOW_MS),
        },
      },
      _count: { _all: true },
    })),
  ]);

  const liveByGameMap = new Map(liveByGame.map((row) => [row.gameId, row._count._all]));
  const statsMap = new Map<string, GameStats>();
  for (const row of totalByGame) {
    statsMap.set(row.gameId, {
      totalSessions: row._count._all,
      liveSessions: liveByGameMap.get(row.gameId) || 0,
    });
  }
  return statsMap;
};

const KNOWN_GAME_IDS = new Set(GAME_CATALOG.map((game) => game.id));

const leaderboardQuerySchema = z.object({
  game: z.string().min(1).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  range: z.enum(['all', 'week', 'month']).optional(),
});

function rangeStart(range: 'all' | 'week' | 'month' | undefined): Date | undefined {
  if (range === 'week') return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (range === 'month') return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return undefined;
}

export const gamesRouter = Router();

gamesRouter.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const parsed = leaderboardQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return ApiResponse.error(res, {
        code: ErrorCodes.VALIDATION_ERROR,
        message: parsed.error.errors[0]?.message || 'Invalid leaderboard query',
        status: 400,
      });
    }

    const { game, range } = parsed.data;
    const limit = parsed.data.limit ?? 25;
    const since = rangeStart(range);

    if (game && !KNOWN_GAME_IDS.has(game)) {
      return ApiResponse.notFound(res, 'Unknown game');
    }

    const whereClause = {
      ...(game ? { gameId: game } : {}),
      ...(since ? { createdAt: { gte: since } } : {}),
    };

    const grouped = await withRetry(() => prisma.gameSession.groupBy({
      by: ['userId'],
      where: whereClause,
      _sum: { score: true },
      _count: { _all: true },
      _max: { score: true, createdAt: true },
      orderBy: game
        ? { _max: { score: 'desc' } }
        : { _sum: { score: 'desc' } },
      take: limit,
    }));

    if (grouped.length === 0) {
      return ApiResponse.success(res, {
        leaderboard: [],
        game: game ?? null,
        range: range ?? 'all',
      });
    }

    const userIds = grouped.map((row) => row.userId);
    const users = await withRetry(() => prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, avatar: true },
    }));
    const userById = new Map(users.map((user) => [user.id, user]));

    // For the overall leaderboard, also surface a per-game breakdown of each
    // user's session counts so the UI can show what each player has played.
    let breakdownByUser = new Map<string, Record<string, number>>();
    if (!game) {
      const breakdownRows = await withRetry(() => prisma.gameSession.groupBy({
        by: ['userId', 'gameId'],
        where: {
          userId: { in: userIds },
          ...(since ? { createdAt: { gte: since } } : {}),
        },
        _count: { _all: true },
      }));
      for (const row of breakdownRows) {
        const existing = breakdownByUser.get(row.userId) ?? {};
        existing[row.gameId] = row._count._all;
        breakdownByUser.set(row.userId, existing);
      }
    }

    const leaderboard = grouped.map((row, index) => {
      const player = userById.get(row.userId);
      return {
        rank: index + 1,
        user: {
          id: row.userId,
          name: player?.name || 'Unknown Player',
          avatar: player?.avatar || null,
        },
        totalScore: row._sum.score ?? 0,
        bestScore: row._max.score ?? 0,
        sessions: row._count._all,
        lastPlayedAt: row._max.createdAt?.toISOString() || null,
        breakdown: breakdownByUser.get(row.userId) || undefined,
      };
    });

    return ApiResponse.success(res, {
      leaderboard,
      game: game ?? null,
      range: range ?? 'all',
    });
  } catch (error) {
    logger.error('Failed to fetch games leaderboard', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to fetch leaderboard');
  }
});

gamesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const statsByGameId = await toGameStatsMap();
    return ApiResponse.success(res, {
      games: GAME_CATALOG.map((game) => {
        const stats = statsByGameId.get(game.id);
        const dynamicPlays = (BASE_PLAYS_BY_GAME_ID[game.id] || 0) + (stats?.totalSessions || 0);
        return {
          ...game,
          plays: dynamicPlays,
          live: stats?.liveSessions || 0,
        };
      }),
    });
  } catch (error) {
    logger.error('Failed to list games', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to fetch games');
  }
});

gamesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const game = GAME_BY_ID.get(req.params.id);
    if (!game) {
      return ApiResponse.notFound(res, 'Game not found');
    }

    const [sessionCount, liveCount] = await Promise.all([
      withRetry(() => prisma.gameSession.count({ where: { gameId: game.id } })),
      withRetry(() => prisma.gameSession.count({
        where: {
          gameId: game.id,
          createdAt: { gte: new Date(Date.now() - LIVE_WINDOW_MS) },
        },
      })),
    ]);

    return ApiResponse.success(res, {
      ...game,
      plays: (BASE_PLAYS_BY_GAME_ID[game.id] || 0) + sessionCount,
      live: liveCount,
    });
  } catch (error) {
    logger.error('Failed to fetch game detail', {
      gameId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to fetch game');
  }
});

