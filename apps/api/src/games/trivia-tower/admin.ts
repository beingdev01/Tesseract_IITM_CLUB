import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma, withRetry } from '../../lib/prisma.js';
import { ApiResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { auditLog } from '../../utils/audit.js';
import { gameAdminAuth } from '../lib/gameAuth.js';
import { authUser, parseBooleanQuery, validationError } from '../lib/http.js';
import { cleanTriviaQuestionInput, triviaQuestionInputSchema, triviaQuestionPatchSchema } from './content.js';

const adminRouter = Router();

const listQuerySchema = z.object({
  active: z.string().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'EXPERT']).optional(),
  floor: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const bulkImportSchema = z.object({
  questions: z.array(triviaQuestionInputSchema).min(1).max(150),
});

adminRouter.use(gameAdminAuth);

adminRouter.get('/questions', async (req: Request, res: Response) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, parsed.error);
    const active = parseBooleanQuery(parsed.data.active);
    const where = {
      ...(active !== undefined ? { active } : {}),
      ...(parsed.data.difficulty ? { difficulty: parsed.data.difficulty } : {}),
      ...(parsed.data.floor ? { floor: parsed.data.floor } : {}),
      ...(parsed.data.search ? { prompt: { contains: parsed.data.search, mode: 'insensitive' as const } } : {}),
    };
    const [questions, total] = await Promise.all([
      withRetry(() => prisma.triviaQuestion.findMany({
        where,
        orderBy: [{ floor: 'asc' }, { updatedAt: 'desc' }],
        take: parsed.data.limit ?? 50,
        skip: parsed.data.offset ?? 0,
      })),
      withRetry(() => prisma.triviaQuestion.count({ where })),
    ]);
    return ApiResponse.success(res, {
      questions: questions.map((question) => ({
        ...question,
        createdAt: question.createdAt.toISOString(),
        updatedAt: question.updatedAt.toISOString(),
      })),
      total,
    });
  } catch (error) {
    logger.error('Failed to list Trivia Tower questions', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to list questions');
  }
});

adminRouter.post('/questions', async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const parsed = triviaQuestionInputSchema.safeParse(req.body || {});
    if (!parsed.success) return validationError(res, parsed.error);
    const question = await withRetry(() => prisma.triviaQuestion.create({
      data: { ...cleanTriviaQuestionInput(parsed.data), createdById: user.id },
    }));
    await auditLog(user.id, 'trivia-tower.question.create', 'game_content', question.id, { gameId: 'trivia-tower' });
    return ApiResponse.created(res, { question }, 'Question created');
  } catch (error) {
    logger.error('Failed to create Trivia Tower question', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to create question');
  }
});

adminRouter.post('/questions/bulk', async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const parsed = bulkImportSchema.safeParse(req.body || {});
    if (!parsed.success) return validationError(res, parsed.error);
    const created = [];
    for (const questionInput of parsed.data.questions) {
      created.push(await withRetry(() => prisma.triviaQuestion.create({
        data: { ...cleanTriviaQuestionInput(questionInput), createdById: user.id },
      })));
    }
    await auditLog(user.id, 'trivia-tower.question.bulk_create', 'game_content', undefined, {
      gameId: 'trivia-tower',
      count: created.length,
    });
    return ApiResponse.created(res, { questions: created }, 'Questions imported');
  } catch (error) {
    logger.error('Failed to import Trivia Tower questions', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to import questions');
  }
});

adminRouter.patch('/questions/:id', async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const parsed = triviaQuestionPatchSchema.safeParse(req.body || {});
    if (!parsed.success) return validationError(res, parsed.error);
    const question = await withRetry(() => prisma.triviaQuestion.update({
      where: { id: req.params.id },
      data: {
        ...(parsed.data.prompt !== undefined ? { prompt: parsed.data.prompt } : {}),
        ...(parsed.data.options !== undefined ? { options: parsed.data.options } : {}),
        ...(parsed.data.correctIndex !== undefined ? { correctIndex: parsed.data.correctIndex } : {}),
        ...(parsed.data.difficulty !== undefined ? { difficulty: parsed.data.difficulty } : {}),
        ...(parsed.data.category !== undefined ? { category: parsed.data.category || null } : {}),
        ...(parsed.data.floor !== undefined ? { floor: parsed.data.floor } : {}),
        ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
      },
    }));
    await auditLog(user.id, 'trivia-tower.question.update', 'game_content', question.id, { gameId: 'trivia-tower' });
    return ApiResponse.success(res, { question }, 'Question updated');
  } catch (error) {
    logger.error('Failed to update Trivia Tower question', {
      id: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to update question');
  }
});

adminRouter.delete('/questions/:id', async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    await withRetry(() => prisma.triviaQuestion.delete({ where: { id: req.params.id } }));
    await auditLog(user.id, 'trivia-tower.question.delete', 'game_content', req.params.id, { gameId: 'trivia-tower' });
    return ApiResponse.noContent(res);
  } catch (error) {
    logger.error('Failed to delete Trivia Tower question', {
      id: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to delete question');
  }
});

export { adminRouter as triviaTowerAdminRouter };
