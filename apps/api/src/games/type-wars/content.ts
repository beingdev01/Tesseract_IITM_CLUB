import { z } from 'zod';
import { sanitizeText } from '../../utils/sanitize.js';

export const typeWarsDifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);

export const passageInputSchema = z.object({
  text: z.string().trim().min(40).max(3000),
  category: z.string().trim().max(80).optional().nullable(),
  source: z.string().trim().max(120).optional().nullable(),
  difficulty: typeWarsDifficultySchema,
  active: z.boolean().optional(),
});

export const passagePatchSchema = passageInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required',
);

export const createRoomSchema = z.object({
  passageDifficulty: typeWarsDifficultySchema.optional(),
});

export const joinRoomSchema = z.object({
  code: z.string().trim().min(4).max(8),
});

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function cleanPassageInput(input: z.infer<typeof passageInputSchema>) {
  const text = sanitizeText(input.text).trim();
  return {
    text,
    category: input.category ? sanitizeText(input.category).trim() || null : null,
    source: input.source ? sanitizeText(input.source).trim() || null : null,
    difficulty: input.difficulty,
    active: input.active ?? true,
    wordCount: countWords(text),
  };
}

export function computeTypingStats(input: {
  charsTyped: number;
  correctChars: number;
  durationMs: number;
}): { wpm: number; accuracy: number; durationSeconds: number } {
  const durationMinutes = Math.max(input.durationMs / 60000, 1 / 60);
  const wpm = Math.max(0, Math.round((input.correctChars / 5) / durationMinutes));
  const accuracy = input.charsTyped > 0
    ? Math.max(0, Math.min(100, Math.round((input.correctChars / input.charsTyped) * 100)))
    : 0;
  return {
    wpm,
    accuracy,
    durationSeconds: Math.max(0, Math.round(input.durationMs / 1000)),
  };
}

export function scoreForRank(wpm: number, rank: number): number {
  const podiumBonus = rank === 1 ? 200 : rank === 2 ? 100 : rank === 3 ? 50 : 0;
  return Math.max(0, wpm * 10 + podiumBonus);
}
