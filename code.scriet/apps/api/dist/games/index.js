import { registry } from './registry.js';
import { logger } from '../utils/logger.js';
export function mountGames(app) {
    for (const game of registry) {
        game.mountRouter(app);
        logger.info('Mounted game', { id: game.id, name: game.name, path: `/api/games/${game.id}` });
    }
}
export { registry };
