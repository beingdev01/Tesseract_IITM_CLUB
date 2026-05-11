import type { Express } from 'express';
import type { Game } from '../index.js';
import { scribblAdminRouter } from './admin.js';
import { scribblRouter } from './router.js';
import { registerScribblSocket } from './socket.js';
import { SCRIBBL_GAME_ID } from './state.js';

export const scribblGame: Game = {
  id: SCRIBBL_GAME_ID,
  name: 'Scribbl',
  mountRouter(app: Express) {
    app.use('/api/games/scribbl', scribblRouter);
    app.use('/api/admin/games/scribbl', scribblAdminRouter);
    registerScribblSocket();
  },
};
