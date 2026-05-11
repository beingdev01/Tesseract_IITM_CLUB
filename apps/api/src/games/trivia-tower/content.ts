import { z } from 'zod';
import { sanitizeText } from '../../utils/sanitize.js';

export const triviaDifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD', 'EXPERT']);

const triviaQuestionBaseSchema = z.object({
  prompt: z.string().trim().min(5).max(1000),
  options: z.array(z.string().trim().min(1).max(300)).min(2).max(6),
  correctIndex: z.number().int().min(0).max(5),
  difficulty: triviaDifficultySchema,
  category: z.string().trim().max(80).optional().nullable(),
  floor: z.number().int().min(1).max(100).optional(),
  active: z.boolean().optional(),
});

export const triviaQuestionInputSchema = triviaQuestionBaseSchema
  .refine((value) => value.correctIndex < value.options.length, 'Correct option must exist');

export const triviaQuestionPatchSchema = triviaQuestionBaseSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required',
);

export const createTriviaRoomSchema = z.object({
  totalFloors: z.number().int().min(1).max(20).optional(),
  difficulty: triviaDifficultySchema.optional(),
});

export const submitAnswerSchema = z.object({
  floor: z.number().int().min(1).max(100),
  selectedIndex: z.number().int().min(0).max(5),
});

export function cleanTriviaQuestionInput(input: z.infer<typeof triviaQuestionInputSchema>) {
  return {
    prompt: sanitizeText(input.prompt).trim(),
    options: input.options.map((option) => sanitizeText(option).trim()),
    correctIndex: input.correctIndex,
    difficulty: input.difficulty,
    category: input.category ? sanitizeText(input.category).trim() || null : null,
    floor: input.floor ?? 1,
    active: input.active ?? true,
  };
}

export function pointsForAnswer(correct: boolean, elapsedMs: number, streakBefore: number): number {
  if (!correct) return 0;
  const speedPoints = Math.max(50, Math.round(200 - elapsedMs / 50));
  return speedPoints + (streakBefore >= 2 ? 50 : 0);
}
