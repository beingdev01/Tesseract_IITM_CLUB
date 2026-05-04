import { AppError } from "./app-error";
import { z } from "zod";

export function parseBody<T>(schema: z.Schema<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new AppError("validation_error", "Invalid request body.", 422, {
      issues: parsed.error.issues
    });
  }
  return parsed.data;
}

export function parseQueryInt(value: unknown, fallback: number, min: number, max: number): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(raw ?? ""), 10);
  const next = Number.isFinite(parsed) ? parsed : fallback;
  return Math.max(min, Math.min(max, next));
}
