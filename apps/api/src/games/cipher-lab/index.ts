import type { Express } from 'express';
import type { Game } from '../index.js';
import { cipherLabAdminRouter } from './admin.js';
import { cipherLabRouter, CIPHER_LAB_GAME_ID } from './router.js';

export const cipherLabGame: Game = {
  id: CIPHER_LAB_GAME_ID,
  name: 'Cipher Lab',
  mountRouter(app: Express) {
    app.use('/api/games/cipher-lab', cipherLabRouter);
    app.use('/api/admin/games/cipher-lab', cipherLabAdminRouter);
  },
};
