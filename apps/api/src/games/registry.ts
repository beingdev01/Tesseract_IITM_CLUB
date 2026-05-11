import type { Game } from './index.js';
import { competitionGame } from './competition/index.js';
import { smashKartGame } from './smash-kart/index.js';
import { typeWarsGame } from './type-wars/index.js';
import { triviaTowerGame } from './trivia-tower/index.js';
import { puzzleRunGame } from './puzzle-run/index.js';
import { brainTeasersGame } from './brain-teasers/index.js';
import { cipherLabGame } from './cipher-lab/index.js';
import { riddleRoomGame } from './riddle-room/index.js';
import { scribblGame } from './scribbl/index.js';

// Register games in the order you want them to appear. Each entry is mounted
// under /api/games/<id> by mountGames() during server bootstrap.
export const registry: Game[] = [
  competitionGame,
  smashKartGame,
  typeWarsGame,
  triviaTowerGame,
  puzzleRunGame,
  brainTeasersGame,
  cipherLabGame,
  riddleRoomGame,
  scribblGame,
];
