import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma, withRetry } from '../../lib/prisma.js';
import { ApiResponse, ErrorCodes } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { gameAuth } from '../lib/gameAuth.js';
import { roomCodeSchema } from '../lib/gameSchemas.js';
import { authUser, validationError } from '../lib/http.js';
import { createRoomSchema } from './content.js';
import { createTypeWarsRoom, getOrLoadTypeWarsRoom, joinTypeWarsRoom, serializeTypeWarsRoom, TYPE_WARS_GAME_ID } from './state.js';

const router = Router();

const leaderboardQuerySchema = z.object({
  range: z.enum(['all', 'week', 'month']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

function rangeStart(range: 'all' | 'week' | 'month' | undefined): Date | undefined {
  if (range === 'week') return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (range === 'month') return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return undefined;
}

router.post('/rooms', gameAuth, async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;

    const parsed = createRoomSchema.safeParse(req.body || {});
    if (!parsed.success) return validationError(res, parsed.error);

    const room = await createTypeWarsRoom({
      host: { id: user.id, name: user.name, avatar: user.avatar },
      difficulty: parsed.data.passageDifficulty,
    });

    return ApiResponse.created(res, {
      code: room.code,
      passage: {
        id: room.passage.id,
        text: room.passage.text,
        wordCount: room.passage.wordCount,
      },
      room: serializeTypeWarsRoom(room, true),
    }, 'Type Wars room created');
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_PASSAGES') {
      return ApiResponse.notFound(res, 'No active passages are available');
    }
    logger.error('Failed to create Type Wars room', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to create room');
  }
});

router.post('/rooms/:code/join', gameAuth, async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;

    const parsed = roomCodeSchema.safeParse(req.params.code);
    if (!parsed.success) return validationError(res, parsed.error);

    const room = await joinTypeWarsRoom({
      code: parsed.data,
      user: { id: user.id, name: user.name, avatar: user.avatar },
    });

    return ApiResponse.success(res, { room: serializeTypeWarsRoom(room, true) }, 'Joined Type Wars room');
  } catch (error) {
    if (error instanceof Error && error.message === 'ROOM_NOT_FOUND') return ApiResponse.notFound(res, 'Room not found');
    if (error instanceof Error && error.message === 'ROOM_FULL') {
      return ApiResponse.error(res, {
        code: ErrorCodes.CONFLICT,
        message: 'Room is full',
        status: 409,
      });
    }
    if (error instanceof Error && error.message === 'ROOM_ALREADY_STARTED') {
      return ApiResponse.conflict(res, 'Race already started');
    }
    logger.error('Failed to join Type Wars room', {
      code: req.params.code,
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to join room');
  }
});

router.get('/rooms/:code', gameAuth, async (req: Request, res: Response) => {
  try {
    const parsed = roomCodeSchema.safeParse(req.params.code);
    if (!parsed.success) return validationError(res, parsed.error);

    const room = await getOrLoadTypeWarsRoom(parsed.data);
    if (!room) return ApiResponse.notFound(res, 'Room not found');

    return ApiResponse.success(res, { room: serializeTypeWarsRoom(room) });
  } catch (error) {
    logger.error('Failed to fetch Type Wars room', {
      code: req.params.code,
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to fetch room');
  }
});

router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const parsed = leaderboardQuerySchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, parsed.error);

    const limit = parsed.data.limit ?? 25;
    const since = rangeStart(parsed.data.range);
    const grouped = await withRetry(() => prisma.gameSession.groupBy({
      by: ['userId'],
      where: {
        gameId: TYPE_WARS_GAME_ID,
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      _sum: { score: true },
      _count: { _all: true },
      _max: { score: true, createdAt: true },
      orderBy: { _max: { score: 'desc' } },
      take: limit,
    }));

    const users = grouped.length > 0
      ? await withRetry(() => prisma.user.findMany({
        where: { id: { in: grouped.map((row) => row.userId) } },
        select: { id: true, name: true, avatar: true },
      }))
      : [];
    const userById = new Map(users.map((user) => [user.id, user]));

    return ApiResponse.success(res, {
      leaderboard: grouped.map((row, index) => {
        const user = userById.get(row.userId);
        return {
          rank: index + 1,
          user: {
            id: row.userId,
            name: user?.name ?? 'Unknown Player',
            avatar: user?.avatar ?? null,
          },
          totalScore: row._sum.score ?? 0,
          bestScore: row._max.score ?? 0,
          sessions: row._count._all,
          lastPlayedAt: row._max.createdAt?.toISOString() ?? null,
        };
      }),
      game: TYPE_WARS_GAME_ID,
      range: parsed.data.range ?? 'all',
    });
  } catch (error) {
    logger.error('Failed to fetch Type Wars leaderboard', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to fetch leaderboard');
  }
});

export { router as typeWarsRouter };
