import { Router, type Request, type Response } from 'express';
import { prisma, withRetry } from '../../lib/prisma.js';
import { ApiResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { gameAuth } from '../lib/gameAuth.js';
import { authUser, todayIstDate, validationError } from '../lib/http.js';
import { recordGameSession } from '../lib/sessionRecorder.js';
import { BRAIN_POINTS, brainSubmitSchema, isBrainAnswerCorrect } from './content.js';
import { brainTeaserDateLabel, ensureBrainTeaserDay } from './day.js';

export const BRAIN_TEASERS_GAME_ID = 'brain-teasers';
const router = Router();

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

router.get('/today', gameAuth, async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const dayId = await ensureBrainTeaserDay();
    const day = await withRetry(() => prisma.brainTeaserDay.findUnique({
      where: { id: dayId },
      include: {
        entries: {
          include: {
            teaser: {
              select: {
                id: true,
                prompt: true,
                difficulty: true,
              },
            },
          },
          orderBy: { difficulty: 'asc' },
        },
      },
    }));
    const attempts = await withRetry(() => prisma.brainTeaserAttempt.findMany({
      where: {
        userId: user.id,
        dayId,
      },
      include: {
        teaser: { select: { explanation: true, answer: true } },
      },
    }));
    if (!day) return ApiResponse.notFound(res, 'Daily brain teasers not found');

    return ApiResponse.success(res, {
      day: {
        id: day.id,
        date: brainTeaserDateLabel(day.date),
        teasers: day.entries.map((entry) => ({
          id: entry.teaser.id,
          prompt: entry.teaser.prompt,
          difficulty: entry.teaser.difficulty,
          points: BRAIN_POINTS[entry.teaser.difficulty],
        })),
      },
      attempts: attempts.map((attempt) => ({
        teaserId: attempt.teaserId,
        submission: attempt.submission,
        correct: attempt.correct,
        pointsAwarded: attempt.pointsAwarded,
        explanation: attempt.teaser.explanation,
        submittedAt: attempt.submittedAt.toISOString(),
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_TEASERS') {
      return ApiResponse.notFound(res, 'No active brain teasers are available');
    }
    logger.error('Failed to fetch Brain Teasers day', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to fetch brain teasers');
  }
});

router.post('/:teaserId/submit', gameAuth, async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const parsed = brainSubmitSchema.safeParse(req.body || {});
    if (!parsed.success) return validationError(res, parsed.error);

    const dayId = await ensureBrainTeaserDay();
    const entry = await withRetry(() => prisma.brainTeaserDayEntry.findFirst({
      where: { dayId, teaserId: req.params.teaserId },
      include: { teaser: true },
    }));
    if (!entry) return ApiResponse.notFound(res, 'Teaser is not in today\'s set');

    const existing = await withRetry(() => prisma.brainTeaserAttempt.findUnique({
      where: {
        userId_teaserId: {
          userId: user.id,
          teaserId: entry.teaserId,
        },
      },
      select: { id: true },
    }));
    if (existing) return ApiResponse.conflict(res, 'This teaser was already submitted');

    const correct = isBrainAnswerCorrect(entry.teaser.answer, parsed.data.submission);
    const pointsAwarded = correct ? BRAIN_POINTS[entry.teaser.difficulty] : 0;
    const attempt = await withRetry(() => prisma.brainTeaserAttempt.create({
      data: {
        userId: user.id,
        teaserId: entry.teaserId,
        dayId,
        submission: parsed.data.submission,
        correct,
        pointsAwarded,
      },
    }));

    const submittedCount = await withRetry(() => prisma.brainTeaserAttempt.count({
      where: { userId: user.id, dayId },
    }));
    if (submittedCount >= 5) {
      const today = todayIstDate();
      const existingSession = await withRetry(() => prisma.gameSession.findFirst({
        where: {
          userId: user.id,
          gameId: BRAIN_TEASERS_GAME_ID,
          createdAt: { gte: today, lt: addDays(today, 1) },
        },
        select: { id: true },
      }));
      if (!existingSession) {
        const attempts = await withRetry(() => prisma.brainTeaserAttempt.findMany({
          where: { userId: user.id, dayId },
          select: { pointsAwarded: true },
        }));
        await recordGameSession({
          gameId: BRAIN_TEASERS_GAME_ID,
          userId: user.id,
          score: attempts.reduce((sum, item) => sum + item.pointsAwarded, 0),
          durationSeconds: null,
        });
      }
    }

    return ApiResponse.success(res, {
      attempt: {
        teaserId: attempt.teaserId,
        correct: attempt.correct,
        pointsAwarded: attempt.pointsAwarded,
        explanation: entry.teaser.explanation,
        submittedAt: attempt.submittedAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to submit Brain Teaser answer', {
      teaserId: req.params.teaserId,
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to submit teaser');
  }
});

export { router as brainTeasersRouter };
