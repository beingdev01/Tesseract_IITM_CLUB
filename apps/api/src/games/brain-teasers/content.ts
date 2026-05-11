import { z } from 'zod';
import { sanitizeText } from '../../utils/sanitize.js';
import { normalizeText } from '../lib/http.js';

export const brainDifficultySchema = z.enum(['EASY', 'NORMAL', 'HARD', 'DEVIOUS', 'BONUS']);

export const brainTeaserInputSchema = z.object({
  prompt: z.string().trim().min(8).max(2000),
  answer: z.string().trim().min(1).max(500),
  explanation: z.string().trim().max(2000).optional().nullable(),
  difficulty: brainDifficultySchema,
  active: z.boolean().optional(),
});

export const brainTeaserPatchSchema = brainTeaserInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required',
);

export const brainSubmitSchema = z.object({
  submission: z.string().trim().min(1).max(500),
});

export const BRAIN_POINTS: Record<z.infer<typeof brainDifficultySchema>, number> = {
  EASY: 20,
  NORMAL: 40,
  HARD: 80,
  DEVIOUS: 160,
  BONUS: 200,
};

export function cleanBrainTeaserInput(input: z.infer<typeof brainTeaserInputSchema>) {
  return {
    prompt: sanitizeText(input.prompt).trim(),
    answer: sanitizeText(input.answer).trim(),
    explanation: input.explanation ? sanitizeText(input.explanation).trim() : null,
    difficulty: input.difficulty,
    active: input.active ?? true,
  };
}

export function isBrainAnswerCorrect(answer: string, submission: string): boolean {
  const acceptable = answer.split('|').map(normalizeText).filter(Boolean);
  return acceptable.includes(normalizeText(submission));
}
