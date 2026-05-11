import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma, withRetry } from '../../lib/prisma.js';
import { ApiResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { auditLog } from '../../utils/audit.js';
import { gameAdminAuth } from '../lib/gameAuth.js';
import { authUser, parseBooleanQuery, validationError } from '../lib/http.js';
import {
  cleanRiddleBundleInput,
  cleanRiddleClueInput,
  riddleBundleInputSchema,
  riddleClueInputSchema,
  riddleCluePatchSchema,
} from './content.js';

const adminRouter = Router();

const listQuerySchema = z.object({
  active: z.string().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

adminRouter.use(gameAdminAuth);

adminRouter.get('/clues', async (req: Request, res: Response) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, parsed.error);
    const active = parseBooleanQuery(parsed.data.active);
    const where = {
      ...(active !== undefined ? { active } : {}),
      ...(parsed.data.difficulty ? { difficulty: parsed.data.difficulty } : {}),
      ...(parsed.data.search ? { title: { contains: parsed.data.search, mode: 'insensitive' as const } } : {}),
    };
    const [clues, total] = await Promise.all([
      withRetry(() => prisma.riddleClue.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: parsed.data.limit ?? 50,
        skip: parsed.data.offset ?? 0,
      })),
      withRetry(() => prisma.riddleClue.count({ where })),
    ]);
    return ApiResponse.success(res, { clues, total });
  } catch (error) {
    logger.error('Failed to list riddle clues', { error: error instanceof Error ? error.message : String(error) });
    return ApiResponse.internal(res, 'Failed to list clues');
  }
});

adminRouter.get('/bundles', async (_req: Request, res: Response) => {
  try {
    const bundles = await withRetry(() => prisma.riddleBundle.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { clues: { orderBy: { order: 'asc' }, include: { clue: true } } },
    }));
    return ApiResponse.success(res, { bundles });
  } catch (error) {
    logger.error('Failed to list riddle bundles', { error: error instanceof Error ? error.message : String(error) });
    return ApiResponse.internal(res, 'Failed to list bundles');
  }
});

adminRouter.post('/clues', async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const parsed = riddleClueInputSchema.safeParse(req.body || {});
    if (!parsed.success) return validationError(res, parsed.error);
    const clue = await withRetry(() => prisma.riddleClue.create({
      data: { ...cleanRiddleClueInput(parsed.data), createdById: user.id },
    }));
    await auditLog(user.id, 'riddle-room.clue.create', 'game_content', clue.id, { gameId: 'riddle-room' });
    return ApiResponse.created(res, { clue }, 'Clue created');
  } catch (error) {
    logger.error('Failed to create riddle clue', { error: error instanceof Error ? error.message : String(error) });
    return ApiResponse.internal(res, 'Failed to create clue');
  }
});

adminRouter.patch('/clues/:id', async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const parsed = riddleCluePatchSchema.safeParse(req.body || {});
    if (!parsed.success) return validationError(res, parsed.error);
    const clue = await withRetry(() => prisma.riddleClue.update({
      where: { id: req.params.id },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.prompt !== undefined ? { prompt: parsed.data.prompt } : {}),
        ...(parsed.data.answer !== undefined ? { answer: parsed.data.answer } : {}),
        ...(parsed.data.hint !== undefined ? { hint: parsed.data.hint || null } : {}),
        ...(parsed.data.difficulty !== undefined ? { difficulty: parsed.data.difficulty } : {}),
        ...(parsed.data.lockSeconds !== undefined ? { lockSeconds: parsed.data.lockSeconds } : {}),
        ...(parsed.data.basePoints !== undefined ? { basePoints: parsed.data.basePoints } : {}),
        ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
      },
    }));
    await auditLog(user.id, 'riddle-room.clue.update', 'game_content', clue.id, { gameId: 'riddle-room' });
    return ApiResponse.success(res, { clue }, 'Clue updated');
  } catch (error) {
    logger.error('Failed to update riddle clue', { id: req.params.id, error: error instanceof Error ? error.message : String(error) });
    return ApiResponse.internal(res, 'Failed to update clue');
  }
});

adminRouter.delete('/clues/:id', async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    await withRetry(() => prisma.riddleClue.delete({ where: { id: req.params.id } }));
    await auditLog(user.id, 'riddle-room.clue.delete', 'game_content', req.params.id, { gameId: 'riddle-room' });
    return ApiResponse.noContent(res);
  } catch (error) {
    logger.error('Failed to delete riddle clue', { id: req.params.id, error: error instanceof Error ? error.message : String(error) });
    return ApiResponse.internal(res, 'Failed to delete clue');
  }
});

adminRouter.post('/bundles', async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const parsed = riddleBundleInputSchema.safeParse(req.body || {});
    if (!parsed.success) return validationError(res, parsed.error);
    const bundle = await withRetry(() => prisma.riddleBundle.create({
      data: {
        ...cleanRiddleBundleInput(parsed.data),
        clues: parsed.data.clueIds ? {
          create: parsed.data.clueIds.map((clueId, index) => ({ clueId, order: index })),
        } : undefined,
      },
      include: { clues: { include: { clue: true }, orderBy: { order: 'asc' } } },
    }));
    await auditLog(user.id, 'riddle-room.bundle.create', 'game_content', bundle.id, { gameId: 'riddle-room' });
    return ApiResponse.created(res, { bundle }, 'Bundle created');
  } catch (error) {
    logger.error('Failed to create riddle bundle', { error: error instanceof Error ? error.message : String(error) });
    return ApiResponse.internal(res, 'Failed to create bundle');
  }
});

adminRouter.patch('/bundles/:id', async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const parsed = riddleBundleInputSchema.partial().safeParse(req.body || {});
    if (!parsed.success) return validationError(res, parsed.error);
    const bundle = await withRetry(async () => {
      if (parsed.data.clueIds) {
        await prisma.riddleBundleClue.deleteMany({ where: { bundleId: req.params.id } });
        await prisma.riddleBundleClue.createMany({
          data: parsed.data.clueIds.map((clueId, index) => ({ bundleId: req.params.id, clueId, order: index })),
        });
      }
      return prisma.riddleBundle.update({
        where: { id: req.params.id },
        data: {
          ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
          ...(parsed.data.description !== undefined ? { description: parsed.data.description || null } : {}),
          ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
        },
        include: { clues: { include: { clue: true }, orderBy: { order: 'asc' } } },
      });
    });
    await auditLog(user.id, 'riddle-room.bundle.update', 'game_content', bundle.id, { gameId: 'riddle-room' });
    return ApiResponse.success(res, { bundle }, 'Bundle updated');
  } catch (error) {
    logger.error('Failed to update riddle bundle', { id: req.params.id, error: error instanceof Error ? error.message : String(error) });
    return ApiResponse.internal(res, 'Failed to update bundle');
  }
});

adminRouter.delete('/bundles/:id', async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    await withRetry(() => prisma.riddleBundle.delete({ where: { id: req.params.id } }));
    await auditLog(user.id, 'riddle-room.bundle.delete', 'game_content', req.params.id, { gameId: 'riddle-room' });
    return ApiResponse.noContent(res);
  } catch (error) {
    logger.error('Failed to delete riddle bundle', { id: req.params.id, error: error instanceof Error ? error.message : String(error) });
    return ApiResponse.internal(res, 'Failed to delete bundle');
  }
});

export { adminRouter as riddleRoomAdminRouter };
