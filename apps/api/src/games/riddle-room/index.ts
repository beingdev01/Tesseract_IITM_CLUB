import type { Express } from 'express';
import type { Game } from '../index.js';
import { riddleRoomAdminRouter } from './admin.js';
import { riddleRoomRouter } from './router.js';
import { registerRiddleRoomSocket } from './socket.js';
import { RIDDLE_ROOM_GAME_ID } from './state.js';

export const riddleRoomGame: Game = {
  id: RIDDLE_ROOM_GAME_ID,
  name: 'Riddle Room',
  mountRouter(app: Express) {
    app.use('/api/games/riddle-room', riddleRoomRouter);
    app.use('/api/admin/games/riddle-room', riddleRoomAdminRouter);
    registerRiddleRoomSocket();
  },
};
