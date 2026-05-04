import type { Express } from 'express';
import { Router } from 'express';
import competitionRouter from '../../routes/competition.js';
import type { Game } from '../index.js';

// TODO(frontend): /api/competition is now /api/games/competition — update apps/web/src/lib/api.ts.
const router = Router();
router.get('/health', (_req, res) => res.json({ ok: true, game: 'competition' }));
router.use('/', competitionRouter);

export const competitionGame: Game = {
  id: 'competition',
  name: 'Code Competition',
  mountRouter(app: Express) {
    app.use('/api/games/competition', router);
  },
};
