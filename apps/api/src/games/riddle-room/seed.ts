import type { PrismaClient } from '@prisma/client';

const clueData = [
  ['Signal Lamp', 'I guide ships without moving, and I blink when fog makes maps useless.', 'lighthouse', 'Look toward the coast.', 'EASY', 10, 100],
  ['Silent Key', 'I open no metal lock, but without me no account opens.', 'password', 'It should not be reused.', 'EASY', 10, 100],
  ['Glass River', 'I flow across your screen but freeze when the network goes quiet.', 'stream', 'Video can be one.', 'MEDIUM', 15, 140],
  ['Borrowed Shadow', 'I look like you online, but I vanish when the token expires.', 'session', 'Auth systems know me well.', 'MEDIUM', 15, 140],
  ['Last Door', 'I am the answer hidden in every careful question.', 'context', 'Agents ask for it first.', 'HARD', 20, 180],
  ['Red Thread', 'I connects clues, bugs, and commits, but I am not always visible.', 'trace', 'Logs can reveal me.', 'EASY', 10, 100],
  ['Cold Start', 'I sleep to save money, then make the first visitor wait.', 'server', 'Free tiers know this pain.', 'MEDIUM', 15, 140],
  ['Mirror Room', 'You see the message twice, once true and once transformed.', 'cipher', 'Decode before moving on.', 'MEDIUM', 15, 140],
  ['Heavy Door', 'I stop the same action from happening twice when impatient hands click again.', 'idempotency', 'Retries are safer with me.', 'HARD', 20, 180],
  ['Final Bell', 'I ends the run and writes the score where rankings can find it.', 'session', 'Leaderboards read me.', 'HARD', 20, 180],
] as const;

export async function seedRiddleRoomContent(prisma: PrismaClient): Promise<void> {
  const clueIds: string[] = [];
  for (const [title, prompt, answer, hint, difficulty, lockSeconds, basePoints] of clueData) {
    const existing = await prisma.riddleClue.findFirst({ where: { title }, select: { id: true } });
    const data = { title, prompt, answer, hint, difficulty, lockSeconds, basePoints, active: true };
    const clue = existing
      ? await prisma.riddleClue.update({ where: { id: existing.id }, data })
      : await prisma.riddleClue.create({ data });
    clueIds.push(clue.id);
  }

  const bundles = [
    ['Escape the Stack', 'A starter room about software clues.', clueIds.slice(0, 5)],
    ['Night Build', 'A second chain for teams that like systems riddles.', clueIds.slice(5, 10)],
  ] as const;

  for (const [name, description, ids] of bundles) {
    const existing = await prisma.riddleBundle.findFirst({ where: { name }, select: { id: true } });
    const bundle = existing
      ? await prisma.riddleBundle.update({ where: { id: existing.id }, data: { name, description, active: true } })
      : await prisma.riddleBundle.create({ data: { name, description, active: true } });
    await prisma.riddleBundleClue.deleteMany({ where: { bundleId: bundle.id } });
    await prisma.riddleBundleClue.createMany({
      data: ids.map((clueId, index) => ({ bundleId: bundle.id, clueId, order: index })),
    });
  }
}
