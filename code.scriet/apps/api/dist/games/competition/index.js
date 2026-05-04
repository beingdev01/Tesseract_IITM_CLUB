import { Router } from 'express';
import competitionRouter from '../../routes/competition.js';
// TODO(frontend): /api/competition is now /api/games/competition — update apps/web/src/lib/api.ts.
const router = Router();
router.get('/health', (_req, res) => res.json({ ok: true, game: 'competition' }));
router.use('/', competitionRouter);
export const competitionGame = {
    id: 'competition',
    name: 'Code Competition',
    mountRouter(app) {
        app.use('/api/games/competition', router);
    },
};
