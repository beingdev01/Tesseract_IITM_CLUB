import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma, withRetry } from '../../lib/prisma.js';
import { ApiResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { auditLog } from '../../utils/audit.js';
import { gameAdminAuth } from '../lib/gameAuth.js';
import { authUser, parseBooleanQuery, validationError } from '../lib/http.js';
import { cleanPassageInput, passageInputSchema, passagePatchSchema } from './content.js';

const adminRouter = Router();

const listQuerySchema = z.object({
  active: z.string().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const bulkImportSchema = z.object({
  passages: z.array(passageInputSchema).min(1).max(100),
});

adminRouter.use(gameAdminAuth);

adminRouter.get('/passages', async (req: Request, res: Response) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, parsed.error);

    const active = parseBooleanQuery(parsed.data.active);
    const where = {
      ...(active !== undefined ? { active } : {}),
      ...(parsed.data.difficulty ? { difficulty: parsed.data.difficulty } : {}),
      ...(parsed.data.search
        ? { text: { contains: parsed.data.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [items, total] = await Promise.all([
      withRetry(() => prisma.typeWarsPassage.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: parsed.data.limit ?? 50,
        skip: parsed.data.offset ?? 0,
      })),
      withRetry(() => prisma.typeWarsPassage.count({ where })),
    ]);

    return ApiResponse.success(res, {
      passages: items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      total,
    });
  } catch (error) {
    logger.error('Failed to list Type Wars passages', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to list passages');
  }
});

adminRouter.post('/passages', async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const parsed = passageInputSchema.safeParse(req.body || {});
    if (!parsed.success) return validationError(res, parsed.error);

    const passage = await withRetry(() => prisma.typeWarsPassage.create({
      data: {
        ...cleanPassageInput(parsed.data),
        createdById: user.id,
      },
    }));
    await auditLog(user.id, 'type-wars.passage.create', 'game_content', passage.id, { gameId: 'type-wars' });
    return ApiResponse.created(res, { passage }, 'Passage created');
  } catch (error) {
    logger.error('Failed to create Type Wars passage', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to create passage');
  }
});

adminRouter.post('/passages/bulk', async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const parsed = bulkImportSchema.safeParse(req.body || {});
    if (!parsed.success) return validationError(res, parsed.error);

    const created = [];
    for (const passageInput of parsed.data.passages) {
      const passage = await withRetry(() => prisma.typeWarsPassage.create({
        data: {
          ...cleanPassageInput(passageInput),
          createdById: user.id,
        },
      }));
      created.push(passage);
    }
    await auditLog(user.id, 'type-wars.passage.bulk_create', 'game_content', undefined, {
      gameId: 'type-wars',
      count: created.length,
    });
    return ApiResponse.created(res, { passages: created }, 'Passages imported');
  } catch (error) {
    logger.error('Failed to import Type Wars passages', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to import passages');
  }
});

adminRouter.patch('/passages/:id', async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const parsed = passagePatchSchema.safeParse(req.body || {});
    if (!parsed.success) return validationError(res, parsed.error);

    const data = {
      ...(parsed.data.text !== undefined ? { text: parsed.data.text, wordCount: cleanPassageInput({
        text: parsed.data.text,
        difficulty: parsed.data.difficulty ?? 'MEDIUM',
      }).wordCount } : {}),
      ...(parsed.data.category !== undefined ? { category: parsed.data.category?.trim() || null } : {}),
      ...(parsed.data.source !== undefined ? { source: parsed.data.source?.trim() || null } : {}),
      ...(parsed.data.difficulty !== undefined ? { difficulty: parsed.data.difficulty } : {}),
      ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
    };

    const passage = await withRetry(() => prisma.typeWarsPassage.update({
      where: { id: req.params.id },
      data,
    }));
    await auditLog(user.id, 'type-wars.passage.update', 'game_content', passage.id, { gameId: 'type-wars' });
    return ApiResponse.success(res, { passage }, 'Passage updated');
  } catch (error) {
    logger.error('Failed to update Type Wars passage', {
      id: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to update passage');
  }
});

adminRouter.delete('/passages/:id', async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    await withRetry(() => prisma.typeWarsPassage.delete({ where: { id: req.params.id } }));
    await auditLog(user.id, 'type-wars.passage.delete', 'game_content', req.params.id, { gameId: 'type-wars' });
    return ApiResponse.noContent(res);
  } catch (error) {
    logger.error('Failed to delete Type Wars passage', {
      id: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to delete passage');
  }
});

export { adminRouter as typeWarsAdminRouter };
