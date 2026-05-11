import { Router, type Request, type Response } from 'express';
import { prisma, withRetry } from '../../lib/prisma.js';
import { ApiResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { gameAuth } from '../lib/gameAuth.js';
import { authUser, validationError } from '../lib/http.js';
import { recordGameSession } from '../lib/sessionRecorder.js';
import { cipherHintSchema, cipherScore, cipherSubmitSchema, isCipherSolved } from './content.js';
import { getActiveCipherChallenge } from './rotation.js';

export const CIPHER_LAB_GAME_ID = 'cipher-lab';
const router = Router();

function asHints(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function publicCipher(challenge: Awaited<ReturnType<typeof getActiveCipherChallenge>>) {
  if (!challenge) return null;
  const hints = asHints(challenge.hintsJson);
  return {
    id: challenge.id,
    title: challenge.title,
    ciphertext: challenge.ciphertext,
    cipherType: challenge.cipherType,
    hintCount: hints.length,
    basePoints: challenge.basePoints,
    hintPenalty: challenge.hintPenalty,
    timeLimitSeconds: challenge.timeLimitSeconds,
    activeUntil: challenge.activeUntil?.toISOString() ?? null,
    difficulty: challenge.difficulty,
  };
}

router.get('/active', gameAuth, async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const challenge = await getActiveCipherChallenge();
    if (!challenge) return ApiResponse.notFound(res, 'No active cipher challenge');
    const attempt = await withRetry(() => prisma.cipherAttempt.findUnique({
      where: { userId_challengeId: { userId: user.id, challengeId: challenge.id } },
    }));
    return ApiResponse.success(res, {
      cipher: publicCipher(challenge),
      attempt: attempt ? {
        startedAt: attempt.startedAt.toISOString(),
        submittedAt: attempt.submittedAt?.toISOString() ?? null,
        hintsUsed: attempt.hintsUsed,
        solved: attempt.solved,
        pointsAwarded: attempt.pointsAwarded,
        durationSeconds: attempt.durationSeconds,
      } : null,
    });
  } catch (error) {
    logger.error('Failed to fetch active cipher', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to fetch cipher');
  }
});

router.post('/start', gameAuth, async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const challenge = await getActiveCipherChallenge();
    if (!challenge) return ApiResponse.notFound(res, 'No active cipher challenge');
    const attempt = await withRetry(() => prisma.cipherAttempt.upsert({
      where: { userId_challengeId: { userId: user.id, challengeId: challenge.id } },
      update: {},
      create: { userId: user.id, challengeId: challenge.id },
    }));
    return ApiResponse.success(res, {
      attempt: {
        startedAt: attempt.startedAt.toISOString(),
        hintsUsed: attempt.hintsUsed,
        submittedAt: attempt.submittedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    logger.error('Failed to start cipher attempt', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to start cipher');
  }
});

router.post('/hint', gameAuth, async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const parsed = cipherHintSchema.safeParse(req.body || {});
    if (!parsed.success) return validationError(res, parsed.error);
    const challenge = await getActiveCipherChallenge();
    if (!challenge) return ApiResponse.notFound(res, 'No active cipher challenge');
    const hints = asHints(challenge.hintsJson);
    const hint = hints[parsed.data.index];
    if (!hint) return ApiResponse.notFound(res, 'Hint not found');
    const requestedHintsUsed = Math.max(parsed.data.index + 1, 1);
    const existingAttempt = await withRetry(() => prisma.cipherAttempt.findUnique({
      where: { userId_challengeId: { userId: user.id, challengeId: challenge.id } },
      select: { hintsUsed: true },
    }));
    const nextHintsUsed = Math.max(existingAttempt?.hintsUsed ?? 0, requestedHintsUsed);
    const attempt = await withRetry(() => prisma.cipherAttempt.upsert({
      where: { userId_challengeId: { userId: user.id, challengeId: challenge.id } },
      update: { hintsUsed: nextHintsUsed },
      create: { userId: user.id, challengeId: challenge.id, hintsUsed: nextHintsUsed },
    }));
    return ApiResponse.success(res, { hint, hintsUsed: attempt.hintsUsed });
  } catch (error) {
    logger.error('Failed to reveal cipher hint', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to reveal hint');
  }
});

router.post('/submit', gameAuth, async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const parsed = cipherSubmitSchema.safeParse(req.body || {});
    if (!parsed.success) return validationError(res, parsed.error);
    const challenge = await getActiveCipherChallenge();
    if (!challenge) return ApiResponse.notFound(res, 'No active cipher challenge');

    const attempt = await withRetry(() => prisma.cipherAttempt.upsert({
      where: { userId_challengeId: { userId: user.id, challengeId: challenge.id } },
      update: {},
      create: { userId: user.id, challengeId: challenge.id },
    }));
    if (attempt.submittedAt) {
      return ApiResponse.success(res, {
        solved: attempt.solved,
        pointsAwarded: attempt.pointsAwarded,
        durationSeconds: attempt.durationSeconds,
      });
    }

    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000));
    const timedOut = elapsedSeconds > challenge.timeLimitSeconds;
    const solved = !timedOut && isCipherSolved(challenge.plaintext, parsed.data.submission);
    const pointsAwarded = cipherScore({
      solved,
      basePoints: challenge.basePoints,
      hintsUsed: attempt.hintsUsed,
      hintPenalty: challenge.hintPenalty,
      elapsedSeconds,
    });

    const updated = await withRetry(() => prisma.cipherAttempt.update({
      where: { id: attempt.id },
      data: {
        submission: parsed.data.submission,
        submittedAt: new Date(),
        solved,
        pointsAwarded,
        durationSeconds: elapsedSeconds,
      },
    }));

    await recordGameSession({
      gameId: CIPHER_LAB_GAME_ID,
      userId: user.id,
      score: pointsAwarded,
      durationSeconds: elapsedSeconds,
    });

    return ApiResponse.success(res, {
      solved: updated.solved,
      pointsAwarded: updated.pointsAwarded,
      durationSeconds: updated.durationSeconds,
      timedOut,
    });
  } catch (error) {
    logger.error('Failed to submit cipher answer', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to submit cipher');
  }
});

export { router as cipherLabRouter };
