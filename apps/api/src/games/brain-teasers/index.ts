import type { Express } from 'express';
import type { Game } from '../index.js';
import { brainTeasersAdminRouter } from './admin.js';
import { brainTeasersRouter, BRAIN_TEASERS_GAME_ID } from './router.js';

export const brainTeasersGame: Game = {
  id: BRAIN_TEASERS_GAME_ID,
  name: 'Brain Teasers',
  mountRouter(app: Express) {
    app.use('/api/games/brain-teasers', brainTeasersRouter);
    app.use('/api/admin/games/brain-teasers', brainTeasersAdminRouter);
  },
};
