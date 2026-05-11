import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma, withRetry } from '../../lib/prisma.js';
import { ApiResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { auditLog } from '../../utils/audit.js';
import { gameAdminAuth } from '../lib/gameAuth.js';
import { authUser, parseBooleanQuery, validationError } from '../lib/http.js';
import { cleanScribblPromptInput, scribblPromptInputSchema, scribblPromptPatchSchema } from './content.js';

const adminRouter = Router();

const listQuerySchema = z.object({
  active: z.string().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(300).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const bulkImportSchema = z.object({
  words: z.array(z.string().trim().min(2).max(48)).min(1).max(500),
  category: z.string().trim().max(80).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
});

adminRouter.use(gameAdminAuth);

adminRouter.get('/prompts', async (req: Request, res: Response) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, parsed.error);
    const active = parseBooleanQuery(parsed.data.active);
    const where = {
      ...(active !== undefined ? { active } : {}),
      ...(parsed.data.difficulty ? { difficulty: parsed.data.difficulty } : {}),
      ...(parsed.data.search ? { word: { contains: parsed.data.search, mode: 'insensitive' as const } } : {}),
    };
    const [prompts, total] = await Promise.all([
      withRetry(() => prisma.scribblPrompt.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: parsed.data.limit ?? 100,
        skip: parsed.data.offset ?? 0,
      })),
      withRetry(() => prisma.scribblPrompt.count({ where })),
    ]);
    return ApiResponse.success(res, { prompts, total });
  } catch (error) {
    logger.error('Failed to list Scribbl prompts', { error: error instanceof Error ? error.message : String(error) });
    return ApiResponse.internal(res, 'Failed to list prompts');
  }
});

adminRouter.post('/prompts', async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const parsed = scribblPromptInputSchema.safeParse(req.body || {});
    if (!parsed.success) return validationError(res, parsed.error);
    const prompt = await withRetry(() => prisma.scribblPrompt.create({
      data: { ...cleanScribblPromptInput(parsed.data), createdById: user.id },
    }));
    await auditLog(user.id, 'scribbl.prompt.create', 'game_content', prompt.id, { gameId: 'scribbl' });
    return ApiResponse.created(res, { prompt }, 'Prompt created');
  } catch (error) {
    logger.error('Failed to create Scribbl prompt', { error: error instanceof Error ? error.message : String(error) });
    return ApiResponse.internal(res, 'Failed to create prompt');
  }
});

adminRouter.post('/prompts/bulk', async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const parsed = bulkImportSchema.safeParse(req.body || {});
    if (!parsed.success) return validationError(res, parsed.error);
    let created = 0;
    for (const word of parsed.data.words) {
      await withRetry(() => prisma.scribblPrompt.upsert({
        where: { word: word.trim().toLowerCase() },
        update: {},
        create: {
          word: word.trim().toLowerCase(),
          category: parsed.data.category ?? null,
          difficulty: parsed.data.difficulty ?? 'EASY',
          createdById: user.id,
        },
      }));
      created += 1;
    }
    await auditLog(user.id, 'scribbl.prompt.bulk_create', 'game_content', undefined, { gameId: 'scribbl', count: created });
    return ApiResponse.created(res, { count: created }, 'Prompts imported');
  } catch (error) {
    logger.error('Failed to import Scribbl prompts', { error: error instanceof Error ? error.message : String(error) });
    return ApiResponse.internal(res, 'Failed to import prompts');
  }
});

adminRouter.patch('/prompts/:id', async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const parsed = scribblPromptPatchSchema.safeParse(req.body || {});
    if (!parsed.success) return validationError(res, parsed.error);
    const prompt = await withRetry(() => prisma.scribblPrompt.update({
      where: { id: req.params.id },
      data: {
        ...(parsed.data.word !== undefined ? { word: parsed.data.word.trim().toLowerCase() } : {}),
        ...(parsed.data.category !== undefined ? { category: parsed.data.category || null } : {}),
        ...(parsed.data.difficulty !== undefined ? { difficulty: parsed.data.difficulty } : {}),
        ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
      },
    }));
    await auditLog(user.id, 'scribbl.prompt.update', 'game_content', prompt.id, { gameId: 'scribbl' });
    return ApiResponse.success(res, { prompt }, 'Prompt updated');
  } catch (error) {
    logger.error('Failed to update Scribbl prompt', { id: req.params.id, error: error instanceof Error ? error.message : String(error) });
    return ApiResponse.internal(res, 'Failed to update prompt');
  }
});

adminRouter.delete('/prompts/:id', async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    await withRetry(() => prisma.scribblPrompt.delete({ where: { id: req.params.id } }));
    await auditLog(user.id, 'scribbl.prompt.delete', 'game_content', req.params.id, { gameId: 'scribbl' });
    return ApiResponse.noContent(res);
  } catch (error) {
    logger.error('Failed to delete Scribbl prompt', { id: req.params.id, error: error instanceof Error ? error.message : String(error) });
    return ApiResponse.internal(res, 'Failed to delete prompt');
  }
});

export { adminRouter as scribblAdminRouter };
