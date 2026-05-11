import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import type { Express } from 'express';
import type { Game } from '../index.js';
import { authMiddleware, getAuthUser } from '../../middleware/auth.js';
import { ApiResponse, ErrorCodes } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { prisma, withRetry } from '../../lib/prisma.js';

const SESSION_GAME_ID = 'smash-kart';
const DEFAULT_LEADERBOARD_LIMIT = 10;

const createSessionSchema = z.object({
  score: z.number().int().min(0).max(100000).optional(),
  durationSeconds: z.number().int().min(0).max(86400).optional(),
});

const leaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

const router = Router();

router.get('/health', (_req, res) => res.json({ ok: true, game: SESSION_GAME_ID }));

router.post('/session', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return ApiResponse.unauthorized(res, 'Sign in to start a Smash Kart session');
    }

    const parsed = createSessionSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return ApiResponse.error(res, {
        code: ErrorCodes.VALIDATION_ERROR,
        message: parsed.error.errors[0]?.message || 'Invalid session payload',
        status: 400,
      });
    }

    const session = await withRetry(() => prisma.gameSession.create({
      data: {
        gameId: SESSION_GAME_ID,
        userId: user.id,
        score: parsed.data.score ?? 0,
        durationSeconds: parsed.data.durationSeconds ?? null,
      },
      select: {
        id: true,
        gameId: true,
        score: true,
        durationSeconds: true,
        createdAt: true,
      },
    }));

    return ApiResponse.created(res, {
      session: {
        ...session,
        createdAt: session.createdAt.toISOString(),
      },
    }, 'Smash Kart session created');
  } catch (error) {
    logger.error('Failed to create Smash Kart session', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to create game session');
  }
});

router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const parsed = leaderboardQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return ApiResponse.error(res, {
        code: ErrorCodes.VALIDATION_ERROR,
        message: parsed.error.errors[0]?.message || 'Invalid leaderboard query',
        status: 400,
      });
    }

    const limit = parsed.data.limit ?? DEFAULT_LEADERBOARD_LIMIT;
    const grouped = await withRetry(() => prisma.gameSession.groupBy({
      by: ['userId'],
      where: { gameId: SESSION_GAME_ID },
      _count: { userId: true },
      _max: { score: true, createdAt: true },
      orderBy: {
        _count: { userId: 'desc' },
      },
      take: limit,
    }));

    if (grouped.length === 0) {
      return ApiResponse.success(res, { leaderboard: [] });
    }

    const users = await withRetry(() => prisma.user.findMany({
      where: { id: { in: grouped.map((entry) => entry.userId) } },
      select: { id: true, name: true, avatar: true },
    }));
    const usersById = new Map(users.map((user) => [user.id, user]));

    const leaderboard = grouped.map((entry, index) => {
      const player = usersById.get(entry.userId);
      return {
        rank: index + 1,
        user: {
          id: entry.userId,
          name: player?.name || 'Unknown Player',
          avatar: player?.avatar || null,
        },
        sessions: entry._count.userId,
        bestScore: entry._max?.score ?? 0,
        lastPlayedAt: entry._max?.createdAt?.toISOString() || null,
      };
    });

    return ApiResponse.success(res, { leaderboard });
  } catch (error) {
    logger.error('Failed to fetch Smash Kart leaderboard', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to fetch leaderboard');
  }
});

export const smashKartGame: Game = {
  id: SESSION_GAME_ID,
  name: 'Smash Kart',
  mountRouter(app: Express) {
    app.use('/api/games/smash-kart', router);
  },
};
