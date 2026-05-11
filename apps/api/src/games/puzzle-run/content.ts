import { z } from 'zod';
import { sanitizeText } from '../../utils/sanitize.js';
import { normalizeText } from '../lib/http.js';

export const puzzleDifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);

export const puzzleInputSchema = z.object({
  prompt: z.string().trim().min(8).max(2000),
  answer: z.string().trim().min(1).max(300),
  hints: z.array(z.string().trim().min(1).max(300)).max(5).optional(),
  basePoints: z.number().int().min(0).max(10000).optional(),
  hintPenalty: z.number().int().min(0).max(1000).optional(),
  difficulty: puzzleDifficultySchema,
  active: z.boolean().optional(),
});

export const puzzlePatchSchema = puzzleInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required',
);

export const puzzleAttemptSchema = z.object({
  submission: z.string().trim().min(1).max(500),
  hintsUsed: z.number().int().min(0).max(5).optional(),
});

export function cleanPuzzleInput(input: z.infer<typeof puzzleInputSchema>) {
  return {
    prompt: sanitizeText(input.prompt).trim(),
    answer: sanitizeText(input.answer).trim(),
    hintsJson: input.hints?.map((hint) => sanitizeText(hint).trim()).filter(Boolean) ?? [],
    basePoints: input.basePoints ?? 100,
    hintPenalty: input.hintPenalty ?? 20,
    difficulty: input.difficulty,
    active: input.active ?? true,
  };
}

export function isPuzzleAnswerCorrect(answer: string, submission: string): boolean {
  return normalizeText(answer) === normalizeText(submission);
}

export function puzzlePoints(input: {
  solved: boolean;
  basePoints: number;
  hintsUsed: number;
  hintPenalty: number;
}): number {
  if (!input.solved) return 0;
  return Math.max(0, input.basePoints - input.hintsUsed * input.hintPenalty);
}
