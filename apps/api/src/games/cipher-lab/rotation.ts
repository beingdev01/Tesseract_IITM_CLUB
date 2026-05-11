import { prisma, withRetry } from '../../lib/prisma.js';

const WINDOW_MS = 48 * 60 * 60 * 1000;

export async function getActiveCipherChallenge() {
  const now = new Date();
  const active = await withRetry(() => prisma.cipherChallenge.findFirst({
    where: {
      active: true,
      OR: [
        { activeFrom: null },
        { activeFrom: { lte: now } },
      ],
      AND: [
        {
          OR: [
            { activeUntil: null },
            { activeUntil: { gt: now } },
          ],
        },
      ],
    },
    orderBy: [{ activeFrom: 'desc' }, { createdAt: 'asc' }],
  }));
  if (active) return active;

  const scheduled = await withRetry(() => prisma.cipherChallenge.findFirst({
    where: {
      active: true,
      activeFrom: { lte: now },
    },
    orderBy: { activeFrom: 'desc' },
  }));
  if (scheduled) {
    return withRetry(() => prisma.cipherChallenge.update({
      where: { id: scheduled.id },
      data: { activeUntil: new Date(now.getTime() + WINDOW_MS) },
    }));
  }

  const fallback = await withRetry(() => prisma.cipherChallenge.findFirst({
    where: { active: true },
    orderBy: { updatedAt: 'asc' },
  }));
  if (!fallback) return null;

  return withRetry(() => prisma.cipherChallenge.update({
    where: { id: fallback.id },
    data: {
      activeFrom: now,
      activeUntil: new Date(now.getTime() + WINDOW_MS),
    },
  }));
}

export async function rotateCipherChallenge(): Promise<void> {
  const now = new Date();
  await withRetry(() => prisma.cipherChallenge.updateMany({
    where: {
      active: true,
      activeUntil: { lte: now },
    },
    data: { active: false },
  }));
  await getActiveCipherChallenge();
}
