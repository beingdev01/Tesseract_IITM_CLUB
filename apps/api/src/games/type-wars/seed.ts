import type { PrismaClient } from '@prisma/client';
import { countWords } from './content.js';

const passages = [
  ['EASY', 'tech', 'Clean code favors small functions, clear names, and careful boundaries between ideas.'],
  ['EASY', 'campus', 'The study group met after dinner, shared notes, solved bugs, and left with a calmer plan.'],
  ['EASY', 'literature', 'A quiet library can turn a difficult evening into a steady hour of useful work.'],
  ['EASY', 'science', 'Light bends through glass, sound travels through air, and curiosity keeps asking why.'],
  ['EASY', 'daily', 'Every good project begins with one working version and improves through patient review.'],
  ['MEDIUM', 'tech', 'A resilient web service validates every request, records useful errors, and keeps user data out of logs.'],
  ['MEDIUM', 'literature', 'Stories travel farther when their sentences leave enough room for the reader to breathe.'],
  ['MEDIUM', 'music', 'The rhythm of practice is simple: listen closely, repeat slowly, then raise the tempo with care.'],
  ['MEDIUM', 'logic', 'A proof becomes easier to follow when each claim names the assumption it depends on.'],
  ['MEDIUM', 'systems', 'When the network gets noisy, protocols rely on retries, timeouts, and measured backoff.'],
  ['HARD', 'tech', 'Distributed systems reward boring choices: explicit ownership, bounded queues, monotonic clocks, and observability before optimism.'],
  ['HARD', 'literature', 'The essay argued that memory is not an archive but an active workshop where meaning is rebuilt.'],
  ['HARD', 'science', 'A simulation is only persuasive when its assumptions, boundary conditions, and failure modes are visible.'],
  ['HARD', 'systems', 'Latency hides in serialization, database round trips, cold caches, and every abstraction that forgets the wire.'],
  ['HARD', 'practice', 'Mastery arrives through deliberate discomfort: narrow goals, immediate feedback, and enough rest to notice patterns.'],
] as const;

export async function seedTypeWarsContent(prisma: PrismaClient): Promise<void> {
  for (const [difficulty, category, text] of passages) {
    const existing = await prisma.typeWarsPassage.findFirst({
      where: { text },
      select: { id: true },
    });
    if (existing) {
      await prisma.typeWarsPassage.update({
        where: { id: existing.id },
        data: {
          category,
          difficulty,
          wordCount: countWords(text),
          active: true,
        },
      });
    } else {
      await prisma.typeWarsPassage.create({
        data: {
          text,
          category,
          difficulty,
          wordCount: countWords(text),
          active: true,
        },
      });
    }
  }
}
