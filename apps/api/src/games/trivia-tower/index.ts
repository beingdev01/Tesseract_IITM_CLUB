import type { Express } from 'express';
import type { Game } from '../index.js';
import { triviaTowerAdminRouter } from './admin.js';
import { triviaTowerRouter } from './router.js';
import { registerTriviaTowerSocket } from './socket.js';
import { TRIVIA_TOWER_GAME_ID } from './state.js';

export const triviaTowerGame: Game = {
  id: TRIVIA_TOWER_GAME_ID,
  name: 'Trivia Tower',
  mountRouter(app: Express) {
    app.use('/api/games/trivia-tower', triviaTowerRouter);
    app.use('/api/admin/games/trivia-tower', triviaTowerAdminRouter);
    registerTriviaTowerSocket();
  },
};
