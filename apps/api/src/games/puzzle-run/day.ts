import type { PrismaClient } from '@prisma/client';
import { prisma, withRetry } from '../../lib/prisma.js';
import { todayIstDate, toIsoDateString } from '../lib/http.js';

const DECK_PATTERN = ['EASY', 'EASY', 'MEDIUM', 'MEDIUM', 'HARD'] as const;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

async function selectPuzzleIds(client: PrismaClient): Promise<string[]> {
  const selected: string[] = [];
  for (const difficulty of DECK_PATTERN) {
    const candidates = await client.puzzleRunPuzzle.findMany({
      where: {
        active: true,
        difficulty,
        id: { notIn: selected },
      },
      select: { id: true },
      take: 50,
    });
    const fallback = candidates.length > 0
      ? candidates
      : await client.puzzleRunPuzzle.findMany({
        where: { active: true, id: { notIn: selected } },
        select: { id: true },
        take: 50,
      });
    if (fallback.length === 0) break;
    selected.push(shuffle(fallback)[0].id);
  }
  return selected;
}

export async function ensurePuzzleRunDay(date = todayIstDate()): Promise<string> {
  return withRetry(async () => {
    const existing = await prisma.puzzleRunDay.findUnique({
      where: { date },
      include: { puzzles: true },
    });
    if (existing && existing.puzzles.length >= 5) return existing.id;

    const puzzleIds = await selectPuzzleIds(prisma);
    if (puzzleIds.length === 0) throw new Error('NO_PUZZLES');

    const day = await prisma.puzzleRunDay.upsert({
      where: { date },
      update: {},
      create: { date },
      select: { id: true },
    });

    if (!existing || existing.puzzles.length === 0) {
      await prisma.puzzleRunDayPuzzle.createMany({
        data: puzzleIds.map((puzzleId, index) => ({
          dayId: day.id,
          puzzleId,
          order: index + 1,
        })),
        skipDuplicates: true,
      });
    }

    return day.id;
  });
}

export async function regeneratePuzzleRunDay(date = todayIstDate()): Promise<string> {
  return withRetry(async () => {
    const day = await prisma.puzzleRunDay.upsert({
      where: { date },
      update: {},
      create: { date },
      select: { id: true },
    });
    const puzzleIds = await selectPuzzleIds(prisma);
    if (puzzleIds.length === 0) throw new Error('NO_PUZZLES');
    await prisma.$transaction([
      prisma.puzzleRunDayPuzzle.deleteMany({ where: { dayId: day.id } }),
      prisma.puzzleRunDayPuzzle.createMany({
        data: puzzleIds.map((puzzleId, index) => ({
          dayId: day.id,
          puzzleId,
          order: index + 1,
        })),
      }),
    ]);
    return day.id;
  });
}

export function puzzleRunDateLabel(date = todayIstDate()): string {
  return toIsoDateString(date);
}
