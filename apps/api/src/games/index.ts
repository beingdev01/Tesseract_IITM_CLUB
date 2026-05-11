import type { Express } from 'express';
import { registry } from './registry.js';
import { logger } from '../utils/logger.js';
import { gamesRouter } from './router.js';

export interface Game {
  /** URL-safe identifier — becomes the path segment under /api/games. */
  id: string;
  /** Human-readable label for admin UI / audit logs. */
  name: string;
  /** Mount the router under /api/games/<id>. */
  mountRouter(app: Express): void;
}

export function mountGames(app: Express): void {
  app.use('/api/games', gamesRouter);
  for (const game of registry) {
    game.mountRouter(app);
    logger.info('Mounted game', { id: game.id, name: game.name, path: `/api/games/${game.id}` });
  }
}

export { registry };
