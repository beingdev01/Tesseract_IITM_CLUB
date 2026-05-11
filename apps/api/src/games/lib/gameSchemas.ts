import { z } from 'zod';

// Room codes: short uppercase, easy to read aloud, collision-resistant enough
// for the scale we run at (max 50 active rooms per game).
export const roomCodeSchema = z
  .string()
  .min(4)
  .max(8)
  .regex(/^[A-Z0-9]+$/, 'Room code must be uppercase letters and digits only');

export const scoreSchema = z.number().int().min(0).max(1_000_000);
export const durationSecondsSchema = z.number().int().min(0).max(86_400);

export const cuidIshIdSchema = z.string().min(8).max(64);

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});

export function generateRoomCode(length = 5): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I confusion
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return code;
}
