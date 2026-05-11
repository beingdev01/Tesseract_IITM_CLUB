import { Router, type Request, type Response } from 'express';
import { prisma, withRetry } from '../../lib/prisma.js';
import { ApiResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { gameAuth } from '../lib/gameAuth.js';
import { authUser, todayIstDate, validationError } from '../lib/http.js';
import { recordGameSession } from '../lib/sessionRecorder.js';
import { ensurePuzzleRunDay, puzzleRunDateLabel } from './day.js';
import { isPuzzleAnswerCorrect, puzzleAttemptSchema, puzzlePoints } from './content.js';

export const PUZZLE_RUN_GAME_ID = 'puzzle-run';
const router = Router();

function asHints(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

async function computePuzzleStreak(userId: string, today: Date): Promise<number> {
  let streak = 1;
  let cursor = addDays(today, -1);
  for (;;) {
    const next = addDays(cursor, 1);
    const session = await withRetry(() => prisma.gameSession.findFirst({
      where: {
        userId,
        gameId: PUZZLE_RUN_GAME_ID,
        createdAt: { gte: cursor, lt: next },
      },
      select: { id: true },
    }));
    if (!session) break;
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

router.get('/today', gameAuth, async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;

    const date = todayIstDate();
    const dayId = await ensurePuzzleRunDay(date);
    const day = await withRetry(() => prisma.puzzleRunDay.findUnique({
      where: { id: dayId },
      include: {
        puzzles: {
          orderBy: { order: 'asc' },
          include: {
            puzzle: {
              select: {
                id: true,
                prompt: true,
                hintsJson: true,
                hintPenalty: true,
                basePoints: true,
                difficulty: true,
              },
            },
          },
        },
        attempts: {
          where: { userId: user.id },
          select: {
            puzzleId: true,
            solved: true,
            pointsAwarded: true,
            hintsUsed: true,
            attemptedAt: true,
          },
        },
      },
    }));

    if (!day) return ApiResponse.notFound(res, 'Daily puzzle run not found');

    return ApiResponse.success(res, {
      day: {
        id: day.id,
        date: puzzleRunDateLabel(day.date),
        puzzles: day.puzzles.map((entry) => ({
          id: entry.puzzle.id,
          order: entry.order,
          prompt: entry.puzzle.prompt,
          hints: asHints(entry.puzzle.hintsJson),
          hintPenalty: entry.puzzle.hintPenalty,
          basePoints: entry.puzzle.basePoints,
          difficulty: entry.puzzle.difficulty,
        })),
      },
      attempts: day.attempts.map((attempt) => ({
        ...attempt,
        attemptedAt: attempt.attemptedAt.toISOString(),
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_PUZZLES') {
      return ApiResponse.notFound(res, 'No active puzzles are available');
    }
    logger.error('Failed to fetch Puzzle Run day', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to fetch daily puzzles');
  }
});

router.post('/puzzle/:puzzleId/attempt', gameAuth, async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const parsed = puzzleAttemptSchema.safeParse(req.body || {});
    if (!parsed.success) return validationError(res, parsed.error);

    const date = todayIstDate();
    const dayId = await ensurePuzzleRunDay(date);
    const dayPuzzle = await withRetry(() => prisma.puzzleRunDayPuzzle.findUnique({
      where: {
        dayId_puzzleId: {
          dayId,
          puzzleId: req.params.puzzleId,
        },
      },
      include: { puzzle: true },
    }));
    if (!dayPuzzle) return ApiResponse.notFound(res, 'Puzzle is not in today\'s deck');

    const solved = isPuzzleAnswerCorrect(dayPuzzle.puzzle.answer, parsed.data.submission);
    const hintsUsed = parsed.data.hintsUsed ?? 0;
    const pointsAwarded = puzzlePoints({
      solved,
      hintsUsed,
      basePoints: dayPuzzle.puzzle.basePoints,
      hintPenalty: dayPuzzle.puzzle.hintPenalty,
    });

    const attempt = await withRetry(() => prisma.puzzleRunAttempt.upsert({
      where: {
        userId_dayId_puzzleId: {
          userId: user.id,
          dayId,
          puzzleId: dayPuzzle.puzzleId,
        },
      },
      update: {
        hintsUsed,
        solved,
        pointsAwarded,
        attemptedAt: new Date(),
      },
      create: {
        userId: user.id,
        dayId,
        puzzleId: dayPuzzle.puzzleId,
        hintsUsed,
        solved,
        pointsAwarded,
      },
    }));

    return ApiResponse.success(res, {
      attempt: {
        puzzleId: attempt.puzzleId,
        solved: attempt.solved,
        pointsAwarded: attempt.pointsAwarded,
        hintsUsed: attempt.hintsUsed,
        attemptedAt: attempt.attemptedAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to submit Puzzle Run attempt', {
      puzzleId: req.params.puzzleId,
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to submit attempt');
  }
});

router.post('/complete', gameAuth, async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const date = todayIstDate();
    const dayId = await ensurePuzzleRunDay(date);
    const nextDay = addDays(date, 1);

    const existingSession = await withRetry(() => prisma.gameSession.findFirst({
      where: {
        userId: user.id,
        gameId: PUZZLE_RUN_GAME_ID,
        createdAt: { gte: date, lt: nextDay },
      },
      select: { score: true },
    }));

    const attempts = await withRetry(() => prisma.puzzleRunAttempt.findMany({
      where: { userId: user.id, dayId },
      select: { pointsAwarded: true },
    }));
    const baseTotal = attempts.reduce((sum, attempt) => sum + attempt.pointsAwarded, 0);
    const streakDays = await computePuzzleStreak(user.id, date);
    const totalScore = existingSession?.score ?? Math.round(baseTotal * (1 + Math.max(0, streakDays - 1) * 0.1));

    if (!existingSession) {
      await recordGameSession({
        gameId: PUZZLE_RUN_GAME_ID,
        userId: user.id,
        score: totalScore,
        durationSeconds: null,
      });
    }

    return ApiResponse.success(res, { totalScore, streakDays });
  } catch (error) {
    logger.error('Failed to complete Puzzle Run', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to complete puzzle run');
  }
});

export { router as puzzleRunRouter };
