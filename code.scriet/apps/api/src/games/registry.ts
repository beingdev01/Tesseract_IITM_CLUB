import type { Game } from './index.js';
import { competitionGame } from './competition/index.js';

// Register games in the order you want them to appear. Each entry is mounted
// under /api/games/<id> by mountGames() during server bootstrap.
export const registry: Game[] = [competitionGame];
