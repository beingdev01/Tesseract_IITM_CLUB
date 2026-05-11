import { z } from 'zod';
import { sanitizeText } from '../../utils/sanitize.js';
import { normalizeText } from '../lib/http.js';

export const scribblDifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);

export const scribblPromptInputSchema = z.object({
  word: z.string().trim().min(2).max(48),
  category: z.string().trim().max(80).optional().nullable(),
  difficulty: scribblDifficultySchema,
  active: z.boolean().optional(),
});

export const scribblPromptPatchSchema = scribblPromptInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required',
);

export const createScribblRoomSchema = z.object({
  roundCount: z.number().int().min(1).max(8).optional(),
  roundDurationSeconds: z.number().int().min(20).max(180).optional(),
});

export const guessSchema = z.object({
  guess: z.string().trim().min(1).max(80),
});

export function cleanScribblPromptInput(input: z.infer<typeof scribblPromptInputSchema>) {
  return {
    word: sanitizeText(input.word).trim().toLowerCase(),
    category: input.category ? sanitizeText(input.category).trim() || null : null,
    difficulty: input.difficulty,
    active: input.active ?? true,
  };
}

export function levenshtein(a: string, b: string): number {
  const first = normalizeText(a);
  const second = normalizeText(b);
  const dp = Array.from({ length: first.length + 1 }, () => Array<number>(second.length + 1).fill(0));
  for (let i = 0; i <= first.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= second.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= first.length; i += 1) {
    for (let j = 1; j <= second.length; j += 1) {
      const cost = first[i - 1] === second[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[first.length][second.length];
}

export function isExactGuess(word: string, guess: string): boolean {
  return normalizeText(word) === normalizeText(guess);
}

export function isCloseGuess(word: string, guess: string): boolean {
  return word.trim().length >= 4 && levenshtein(word, guess) <= 1;
}
