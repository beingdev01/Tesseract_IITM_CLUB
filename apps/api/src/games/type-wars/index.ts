import type { Express } from 'express';
import type { Game } from '../index.js';
import { typeWarsRouter } from './router.js';
import { typeWarsAdminRouter } from './admin.js';
import { registerTypeWarsSocket } from './socket.js';
import { TYPE_WARS_GAME_ID } from './state.js';

export const typeWarsGame: Game = {
  id: TYPE_WARS_GAME_ID,
  name: 'Type Wars',
  mountRouter(app: Express) {
    app.use('/api/games/type-wars', typeWarsRouter);
    app.use('/api/admin/games/type-wars', typeWarsAdminRouter);
    registerTypeWarsSocket();
  },
};
