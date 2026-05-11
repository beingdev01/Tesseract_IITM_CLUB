import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma, withRetry } from '../../lib/prisma.js';
import { ApiResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { auditLog } from '../../utils/audit.js';
import { gameAdminAuth } from '../lib/gameAuth.js';
import { authUser, parseBooleanQuery, validationError } from '../lib/http.js';
import { cipherInputSchema, cipherPatchSchema, cipherPreviewSchema, cleanCipherInput, encodeCipher } from './content.js';

const adminRouter = Router();

const listQuerySchema = z.object({
  active: z.string().optional(),
  cipherType: z.enum(['CAESAR', 'VIGENERE', 'ATBASH', 'RAILFENCE', 'SUBSTITUTION', 'BASE64', 'MORSE', 'CUSTOM']).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'INSANE']).optional(),
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

function asHints(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

adminRouter.use(gameAdminAuth);

adminRouter.get('/challenges', async (req: Request, res: Response) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, parsed.error);
    const active = parseBooleanQuery(parsed.data.active);
    const where = {
      ...(active !== undefined ? { active } : {}),
      ...(parsed.data.cipherType ? { cipherType: parsed.data.cipherType } : {}),
      ...(parsed.data.difficulty ? { difficulty: parsed.data.difficulty } : {}),
      ...(parsed.data.search ? { title: { contains: parsed.data.search, mode: 'insensitive' as const } } : {}),
    };
    const [challenges, total] = await Promise.all([
      withRetry(() => prisma.cipherChallenge.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: parsed.data.limit ?? 50,
        skip: parsed.data.offset ?? 0,
      })),
      withRetry(() => prisma.cipherChallenge.count({ where })),
    ]);
    return ApiResponse.success(res, {
      challenges: challenges.map((challenge) => ({
        ...challenge,
        hints: asHints(challenge.hintsJson),
        activeFrom: challenge.activeFrom?.toISOString() ?? null,
        activeUntil: challenge.activeUntil?.toISOString() ?? null,
        createdAt: challenge.createdAt.toISOString(),
        updatedAt: challenge.updatedAt.toISOString(),
      })),
      total,
    });
  } catch (error) {
    logger.error('Failed to list Cipher Lab challenges', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to list cipher challenges');
  }
});

adminRouter.post('/preview', (req: Request, res: Response) => {
  const parsed = cipherPreviewSchema.safeParse(req.body || {});
  if (!parsed.success) return validationError(res, parsed.error);
  return ApiResponse.success(res, {
    ciphertext: encodeCipher(parsed.data.cipherType, parsed.data.plaintext, parsed.data.key),
  });
});

adminRouter.post('/challenges', async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const parsed = cipherInputSchema.safeParse(req.body || {});
    if (!parsed.success) return validationError(res, parsed.error);
    const challenge = await withRetry(() => prisma.cipherChallenge.create({
      data: { ...cleanCipherInput(parsed.data), createdById: user.id },
    }));
    await auditLog(user.id, 'cipher-lab.challenge.create', 'game_content', challenge.id, { gameId: 'cipher-lab' });
    return ApiResponse.created(res, { challenge }, 'Cipher challenge created');
  } catch (error) {
    logger.error('Failed to create Cipher Lab challenge', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to create cipher challenge');
  }
});

adminRouter.patch('/challenges/:id', async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const parsed = cipherPatchSchema.safeParse(req.body || {});
    if (!parsed.success) return validationError(res, parsed.error);
    const data = {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.cipherType !== undefined ? { cipherType: parsed.data.cipherType } : {}),
      ...(parsed.data.plaintext !== undefined ? { plaintext: parsed.data.plaintext } : {}),
      ...(parsed.data.ciphertext !== undefined ? { ciphertext: parsed.data.ciphertext } : {}),
      ...(parsed.data.hints !== undefined ? { hintsJson: parsed.data.hints } : {}),
      ...(parsed.data.basePoints !== undefined ? { basePoints: parsed.data.basePoints } : {}),
      ...(parsed.data.hintPenalty !== undefined ? { hintPenalty: parsed.data.hintPenalty } : {}),
      ...(parsed.data.timeLimitSeconds !== undefined ? { timeLimitSeconds: parsed.data.timeLimitSeconds } : {}),
      ...(parsed.data.difficulty !== undefined ? { difficulty: parsed.data.difficulty } : {}),
      ...(parsed.data.activeFrom !== undefined ? { activeFrom: parsed.data.activeFrom ? new Date(parsed.data.activeFrom) : null } : {}),
      ...(parsed.data.activeUntil !== undefined ? { activeUntil: parsed.data.activeUntil ? new Date(parsed.data.activeUntil) : null } : {}),
      ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
    };
    const challenge = await withRetry(() => prisma.cipherChallenge.update({
      where: { id: req.params.id },
      data,
    }));
    await auditLog(user.id, 'cipher-lab.challenge.update', 'game_content', challenge.id, { gameId: 'cipher-lab' });
    return ApiResponse.success(res, { challenge }, 'Cipher challenge updated');
  } catch (error) {
    logger.error('Failed to update Cipher Lab challenge', {
      id: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to update cipher challenge');
  }
});

adminRouter.delete('/challenges/:id', async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    await withRetry(() => prisma.cipherChallenge.delete({ where: { id: req.params.id } }));
    await auditLog(user.id, 'cipher-lab.challenge.delete', 'game_content', req.params.id, { gameId: 'cipher-lab' });
    return ApiResponse.noContent(res);
  } catch (error) {
    logger.error('Failed to delete Cipher Lab challenge', {
      id: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to delete cipher challenge');
  }
});

export { adminRouter as cipherLabAdminRouter };
