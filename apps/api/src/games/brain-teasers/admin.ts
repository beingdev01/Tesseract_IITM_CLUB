import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma, withRetry } from '../../lib/prisma.js';
import { ApiResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { auditLog } from '../../utils/audit.js';
import { gameAdminAuth } from '../lib/gameAuth.js';
import { authUser, parseBooleanQuery, validationError } from '../lib/http.js';
import { brainTeaserDateLabel, ensureBrainTeaserDay, regenerateBrainTeaserDay } from './day.js';
import { brainTeaserInputSchema, brainTeaserPatchSchema, cleanBrainTeaserInput } from './content.js';

const adminRouter = Router();

const listQuerySchema = z.object({
  active: z.string().optional(),
  difficulty: z.enum(['EASY', 'NORMAL', 'HARD', 'DEVIOUS', 'BONUS']).optional(),
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

adminRouter.use(gameAdminAuth);

adminRouter.get('/teasers', async (req: Request, res: Response) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, parsed.error);
    const active = parseBooleanQuery(parsed.data.active);
    const where = {
      ...(active !== undefined ? { active } : {}),
      ...(parsed.data.difficulty ? { difficulty: parsed.data.difficulty } : {}),
      ...(parsed.data.search ? { prompt: { contains: parsed.data.search, mode: 'insensitive' as const } } : {}),
    };
    const [teasers, total] = await Promise.all([
      withRetry(() => prisma.brainTeaser.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: parsed.data.limit ?? 50,
        skip: parsed.data.offset ?? 0,
      })),
      withRetry(() => prisma.brainTeaser.count({ where })),
    ]);
    return ApiResponse.success(res, {
      teasers: teasers.map((teaser) => ({
        ...teaser,
        createdAt: teaser.createdAt.toISOString(),
        updatedAt: teaser.updatedAt.toISOString(),
      })),
      total,
    });
  } catch (error) {
    logger.error('Failed to list Brain Teasers content', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to list teasers');
  }
});

adminRouter.get('/days/today', async (_req: Request, res: Response) => {
  try {
    const dayId = await ensureBrainTeaserDay();
    const day = await withRetry(() => prisma.brainTeaserDay.findUnique({
      where: { id: dayId },
      include: {
        entries: {
          include: { teaser: true },
        },
      },
    }));
    return ApiResponse.success(res, {
      day: day ? {
        id: day.id,
        date: brainTeaserDateLabel(day.date),
        entries: day.entries.map((entry) => ({
          difficulty: entry.difficulty,
          teaser: entry.teaser,
        })),
      } : null,
    });
  } catch (error) {
    logger.error('Failed to fetch Brain Teasers day', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to fetch today\'s set');
  }
});

adminRouter.post('/teasers', async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const parsed = brainTeaserInputSchema.safeParse(req.body || {});
    if (!parsed.success) return validationError(res, parsed.error);
    const teaser = await withRetry(() => prisma.brainTeaser.create({
      data: { ...cleanBrainTeaserInput(parsed.data), createdById: user.id },
    }));
    await auditLog(user.id, 'brain-teasers.teaser.create', 'game_content', teaser.id, { gameId: 'brain-teasers' });
    return ApiResponse.created(res, { teaser }, 'Teaser created');
  } catch (error) {
    logger.error('Failed to create Brain Teaser', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to create teaser');
  }
});

adminRouter.patch('/teasers/:id', async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const parsed = brainTeaserPatchSchema.safeParse(req.body || {});
    if (!parsed.success) return validationError(res, parsed.error);
    const teaser = await withRetry(() => prisma.brainTeaser.update({
      where: { id: req.params.id },
      data: {
        ...(parsed.data.prompt !== undefined ? { prompt: parsed.data.prompt } : {}),
        ...(parsed.data.answer !== undefined ? { answer: parsed.data.answer } : {}),
        ...(parsed.data.explanation !== undefined ? { explanation: parsed.data.explanation || null } : {}),
        ...(parsed.data.difficulty !== undefined ? { difficulty: parsed.data.difficulty } : {}),
        ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
      },
    }));
    await auditLog(user.id, 'brain-teasers.teaser.update', 'game_content', teaser.id, { gameId: 'brain-teasers' });
    return ApiResponse.success(res, { teaser }, 'Teaser updated');
  } catch (error) {
    logger.error('Failed to update Brain Teaser', {
      id: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to update teaser');
  }
});

adminRouter.delete('/teasers/:id', async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    await withRetry(() => prisma.brainTeaser.delete({ where: { id: req.params.id } }));
    await auditLog(user.id, 'brain-teasers.teaser.delete', 'game_content', req.params.id, { gameId: 'brain-teasers' });
    return ApiResponse.noContent(res);
  } catch (error) {
    logger.error('Failed to delete Brain Teaser', {
      id: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to delete teaser');
  }
});

adminRouter.post('/days/today/regenerate', async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const dayId = await regenerateBrainTeaserDay();
    await auditLog(user.id, 'brain-teasers.day.regenerate', 'game_content', dayId, { gameId: 'brain-teasers' });
    return ApiResponse.success(res, { dayId }, 'Today\'s set regenerated');
  } catch (error) {
    logger.error('Failed to regenerate Brain Teasers day', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to regenerate today\'s set');
  }
});

export { adminRouter as brainTeasersAdminRouter };
