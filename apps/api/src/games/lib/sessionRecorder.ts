import { prisma, withRetry } from '../../lib/prisma.js';
import { logger } from '../../utils/logger.js';

export interface RecordSessionInput {
  gameId: string;
  userId: string;
  score?: number;
  durationSeconds?: number | null;
}

// Writes a row into the shared `game_sessions` table. Every game records its
// per-user run-end via this helper so the catalog/leaderboard aggregations in
// `games/router.ts` work uniformly without per-game special cases.
export async function recordGameSession(input: RecordSessionInput): Promise<void> {
  try {
    await withRetry(() => prisma.gameSession.create({
      data: {
        gameId: input.gameId,
        userId: input.userId,
        score: input.score ?? 0,
        durationSeconds: input.durationSeconds ?? null,
      },
      select: { id: true },
    }));
  } catch (error) {
    logger.error('Failed to record game session', {
      gameId: input.gameId,
      userId: input.userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function recordGameSessionsBatch(inputs: RecordSessionInput[]): Promise<void> {
  if (inputs.length === 0) return;
  try {
    await withRetry(() => prisma.gameSession.createMany({
      data: inputs.map((entry) => ({
        gameId: entry.gameId,
        userId: entry.userId,
        score: entry.score ?? 0,
        durationSeconds: entry.durationSeconds ?? null,
      })),
    }));
  } catch (error) {
    logger.error('Failed to record game sessions batch', {
      count: inputs.length,
      gameIds: Array.from(new Set(inputs.map((i) => i.gameId))),
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
