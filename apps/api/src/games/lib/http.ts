import type { Request, Response } from 'express';
import type { ZodError } from 'zod';
import { ApiResponse, ErrorCodes } from '../../utils/response.js';
import { getAuthUser, type AuthUser } from '../../middleware/auth.js';

export function validationError(res: Response, parsedError: ZodError): Response {
  return ApiResponse.error(res, {
    code: ErrorCodes.VALIDATION_ERROR,
    message: parsedError.errors[0]?.message ?? 'Invalid request payload',
    status: 400,
  });
}

export function authUser(req: Request, res: Response): AuthUser | null {
  const user = getAuthUser(req);
  if (!user) {
    ApiResponse.unauthorized(res, 'Authentication required');
    return null;
  }
  return user;
}

export function parseBooleanQuery(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return undefined;
}

export function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function todayIstDate(): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [year, month, day] = formatter.format(new Date()).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toIsoDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function toNumber(value: unknown, fallback: number): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}
