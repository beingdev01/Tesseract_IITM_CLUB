import { z } from 'zod';
import { sanitizeText } from '../../utils/sanitize.js';
import { normalizeText } from '../lib/http.js';

export const riddleDifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);

export const riddleClueInputSchema = z.object({
  title: z.string().trim().min(2).max(160),
  prompt: z.string().trim().min(5).max(2000),
  answer: z.string().trim().min(1).max(300),
  hint: z.string().trim().max(500).optional().nullable(),
  difficulty: riddleDifficultySchema,
  lockSeconds: z.number().int().min(1).max(120).optional(),
  basePoints: z.number().int().min(0).max(10000).optional(),
  active: z.boolean().optional(),
});

export const riddleCluePatchSchema = riddleClueInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required',
);

export const riddleBundleInputSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional().nullable(),
  active: z.boolean().optional(),
  clueIds: z.array(z.string().min(8).max(64)).min(1).max(20).optional(),
});

export const riddleSubmitSchema = z.object({
  submission: z.string().trim().min(1).max(500),
});

export const createRiddleRoomSchema = z.object({
  bundleId: z.string().min(8).max(64).optional(),
});

export function cleanRiddleClueInput(input: z.infer<typeof riddleClueInputSchema>) {
  return {
    title: sanitizeText(input.title).trim(),
    prompt: sanitizeText(input.prompt).trim(),
    answer: sanitizeText(input.answer).trim(),
    hint: input.hint ? sanitizeText(input.hint).trim() : null,
    difficulty: input.difficulty,
    lockSeconds: input.lockSeconds ?? 15,
    basePoints: input.basePoints ?? 100,
    active: input.active ?? true,
  };
}

export function cleanRiddleBundleInput(input: z.infer<typeof riddleBundleInputSchema>) {
  return {
    name: sanitizeText(input.name).trim(),
    description: input.description ? sanitizeText(input.description).trim() : null,
    active: input.active ?? true,
  };
}

export function isRiddleCorrect(answer: string, submission: string): boolean {
  return normalizeText(answer) === normalizeText(submission);
}
