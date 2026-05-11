import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma, withRetry } from '../../lib/prisma.js';
import { ApiResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { auditLog } from '../../utils/audit.js';
import { gameAdminAuth } from '../lib/gameAuth.js';
import { authUser, parseBooleanQuery, validationError } from '../lib/http.js';
import { cleanPuzzleInput, puzzleInputSchema, puzzlePatchSchema } from './content.js';
import { ensurePuzzleRunDay, regeneratePuzzleRunDay, puzzleRunDateLabel } from './day.js';

const adminRouter = Router();

const listQuerySchema = z.object({
  active: z.string().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

function asHints(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

adminRouter.use(gameAdminAuth);

adminRouter.get('/puzzles', async (req: Request, res: Response) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, parsed.error);
    const active = parseBooleanQuery(parsed.data.active);
    const where = {
      ...(active !== undefined ? { active } : {}),
      ...(parsed.data.difficulty ? { difficulty: parsed.data.difficulty } : {}),
      ...(parsed.data.search ? { prompt: { contains: parsed.data.search, mode: 'insensitive' as const } } : {}),
    };
    const [puzzles, total] = await Promise.all([
      withRetry(() => prisma.puzzleRunPuzzle.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: parsed.data.limit ?? 50,
        skip: parsed.data.offset ?? 0,
      })),
      withRetry(() => prisma.puzzleRunPuzzle.count({ where })),
    ]);
    return ApiResponse.success(res, {
      puzzles: puzzles.map((puzzle) => ({
        ...puzzle,
        hints: asHints(puzzle.hintsJson),
        createdAt: puzzle.createdAt.toISOString(),
        updatedAt: puzzle.updatedAt.toISOString(),
      })),
      total,
    });
  } catch (error) {
    logger.error('Failed to list Puzzle Run puzzles', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to list puzzles');
  }
});

adminRouter.get('/days/today', async (_req: Request, res: Response) => {
  try {
    const dayId = await ensurePuzzleRunDay();
    const day = await withRetry(() => prisma.puzzleRunDay.findUnique({
      where: { id: dayId },
      include: {
        puzzles: {
          orderBy: { order: 'asc' },
          include: { puzzle: true },
        },
      },
    }));
    return ApiResponse.success(res, {
      day: day ? {
        id: day.id,
        date: puzzleRunDateLabel(day.date),
        puzzles: day.puzzles.map((entry) => ({
          order: entry.order,
          ...entry.puzzle,
          hints: asHints(entry.puzzle.hintsJson),
        })),
      } : null,
    });
  } catch (error) {
    logger.error('Failed to fetch Puzzle Run admin day', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to fetch today\'s deck');
  }
});

adminRouter.post('/puzzles', async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const parsed = puzzleInputSchema.safeParse(req.body || {});
    if (!parsed.success) return validationError(res, parsed.error);
    const puzzle = await withRetry(() => prisma.puzzleRunPuzzle.create({
      data: { ...cleanPuzzleInput(parsed.data), createdById: user.id },
    }));
    await auditLog(user.id, 'puzzle-run.puzzle.create', 'game_content', puzzle.id, { gameId: 'puzzle-run' });
    return ApiResponse.created(res, { puzzle }, 'Puzzle created');
  } catch (error) {
    logger.error('Failed to create Puzzle Run puzzle', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to create puzzle');
  }
});

adminRouter.patch('/puzzles/:id', async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const parsed = puzzlePatchSchema.safeParse(req.body || {});
    if (!parsed.success) return validationError(res, parsed.error);
    const data = {
      ...(parsed.data.prompt !== undefined ? { prompt: parsed.data.prompt } : {}),
      ...(parsed.data.answer !== undefined ? { answer: parsed.data.answer } : {}),
      ...(parsed.data.hints !== undefined ? { hintsJson: parsed.data.hints } : {}),
      ...(parsed.data.basePoints !== undefined ? { basePoints: parsed.data.basePoints } : {}),
      ...(parsed.data.hintPenalty !== undefined ? { hintPenalty: parsed.data.hintPenalty } : {}),
      ...(parsed.data.difficulty !== undefined ? { difficulty: parsed.data.difficulty } : {}),
      ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
    };
    const puzzle = await withRetry(() => prisma.puzzleRunPuzzle.update({ where: { id: req.params.id }, data }));
    await auditLog(user.id, 'puzzle-run.puzzle.update', 'game_content', puzzle.id, { gameId: 'puzzle-run' });
    return ApiResponse.success(res, { puzzle }, 'Puzzle updated');
  } catch (error) {
    logger.error('Failed to update Puzzle Run puzzle', {
      id: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to update puzzle');
  }
});

adminRouter.delete('/puzzles/:id', async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    await withRetry(() => prisma.puzzleRunPuzzle.delete({ where: { id: req.params.id } }));
    await auditLog(user.id, 'puzzle-run.puzzle.delete', 'game_content', req.params.id, { gameId: 'puzzle-run' });
    return ApiResponse.noContent(res);
  } catch (error) {
    logger.error('Failed to delete Puzzle Run puzzle', {
      id: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to delete puzzle');
  }
});

adminRouter.post('/days/today/regenerate', async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const dayId = await regeneratePuzzleRunDay();
    await auditLog(user.id, 'puzzle-run.day.regenerate', 'game_content', dayId, { gameId: 'puzzle-run' });
    return ApiResponse.success(res, { dayId }, 'Today\'s deck regenerated');
  } catch (error) {
    logger.error('Failed to regenerate Puzzle Run day', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to regenerate today\'s deck');
  }
});

export { adminRouter as puzzleRunAdminRouter };
