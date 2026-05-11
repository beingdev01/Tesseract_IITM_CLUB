import { prisma, withRetry } from '../../lib/prisma.js';
import { todayIstDate, toIsoDateString } from '../lib/http.js';

const DIFFICULTIES = ['EASY', 'NORMAL', 'HARD', 'DEVIOUS', 'BONUS'] as const;

function pick<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)];
}

export async function ensureBrainTeaserDay(date = todayIstDate()): Promise<string> {
  return withRetry(async () => {
    const existing = await prisma.brainTeaserDay.findUnique({
      where: { date },
      include: { entries: true },
    });
    if (existing && existing.entries.length >= DIFFICULTIES.length) return existing.id;

    const day = await prisma.brainTeaserDay.upsert({
      where: { date },
      update: {},
      create: { date },
      select: { id: true },
    });

    for (const difficulty of DIFFICULTIES) {
      const already = existing?.entries.some((entry) => entry.difficulty === difficulty);
      if (already) continue;
      const candidates = await prisma.brainTeaser.findMany({
        where: { active: true, difficulty },
        select: { id: true },
        take: 50,
      });
      const teaser = pick(candidates);
      if (!teaser) throw new Error('NO_TEASERS');
      await prisma.brainTeaserDayEntry.upsert({
        where: { dayId_difficulty: { dayId: day.id, difficulty } },
        update: { teaserId: teaser.id },
        create: { dayId: day.id, teaserId: teaser.id, difficulty },
      });
    }

    return day.id;
  });
}

export async function regenerateBrainTeaserDay(date = todayIstDate()): Promise<string> {
  return withRetry(async () => {
    const day = await prisma.brainTeaserDay.upsert({
      where: { date },
      update: {},
      create: { date },
      select: { id: true },
    });
    await prisma.brainTeaserDayEntry.deleteMany({ where: { dayId: day.id } });
    for (const difficulty of DIFFICULTIES) {
      const candidates = await prisma.brainTeaser.findMany({
        where: { active: true, difficulty },
        select: { id: true },
        take: 50,
      });
      const teaser = pick(candidates);
      if (!teaser) throw new Error('NO_TEASERS');
      await prisma.brainTeaserDayEntry.create({
        data: { dayId: day.id, teaserId: teaser.id, difficulty },
      });
    }
    return day.id;
  });
}

export function brainTeaserDateLabel(date = todayIstDate()): string {
  return toIsoDateString(date);
}
