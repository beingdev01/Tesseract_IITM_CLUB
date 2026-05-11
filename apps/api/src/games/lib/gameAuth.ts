import type { RequestHandler } from 'express';
import { authMiddleware, optionalAuthMiddleware } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/role.js';

// All gameplay endpoints require an authenticated USER (or higher).
export const gameAuth: RequestHandler[] = [authMiddleware, requireRole('USER')];

// Public-with-user-aware endpoints (e.g. detail/leaderboard that personalize when logged in).
export const gamePublicAuth: RequestHandler[] = [optionalAuthMiddleware];

// Admin-only mutations on game content (questions, ciphers, puzzles, prompts...).
export const gameAdminAuth: RequestHandler[] = [authMiddleware, requireRole('ADMIN')];
