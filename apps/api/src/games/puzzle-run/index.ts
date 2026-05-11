import type { Express } from 'express';
import type { Game } from '../index.js';
import { puzzleRunRouter, PUZZLE_RUN_GAME_ID } from './router.js';
import { puzzleRunAdminRouter } from './admin.js';

export const puzzleRunGame: Game = {
  id: PUZZLE_RUN_GAME_ID,
  name: 'Puzzle Run',
  mountRouter(app: Express) {
    app.use('/api/games/puzzle-run', puzzleRunRouter);
    app.use('/api/admin/games/puzzle-run', puzzleRunAdminRouter);
  },
};
