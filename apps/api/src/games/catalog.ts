export type GameCategory = 'multiplayer' | 'party' | 'solo' | 'esports';
export type GameAccent = 'red' | 'yellow' | 'green' | 'blue' | 'purple' | 'orange';

export interface GameCatalogEntry {
  id: string;
  title: string;
  description: string;
  category: GameCategory;
  accent: GameAccent;
  players: string;
  hot: boolean;
  rules: string[];
  backendReady: boolean;
}

// Source of truth for public game catalog metadata.
export const GAME_CATALOG: GameCatalogEntry[] = [
  {
    id: 'smash-kart',
    title: 'SMASH KART',
    description: 'Top-down karting chaos. Banana peels still legal.',
    category: 'multiplayer',
    accent: 'red',
    players: '2-12',
    hot: true,
    backendReady: true,
    rules: [
      '3 laps per race',
      'Items spawn every 15 seconds',
      'Last place gets a speed boost',
      'Final lap triggers siren',
    ],
  },
  {
    id: 'scribbl',
    title: 'SCRIBBL',
    description: "Draw it. Guess it. Argue about whether 'thingy' counts.",
    category: 'party',
    accent: 'yellow',
    players: '4-16',
    hot: true,
    backendReady: true,
    rules: [
      '80 seconds per round',
      'Faster guess = more points',
      'Artist earns points per correct guess',
      '3 rounds by default',
    ],
  },
  {
    id: 'puzzle-run',
    title: 'PUZZLE RUN',
    description: 'Daily logic chain. New set drops at 00:00 IST.',
    category: 'solo',
    accent: 'green',
    players: '1',
    hot: false,
    backendReady: true,
    rules: [
      '5 puzzles per day',
      'Points decrease with hints',
      'Streak bonus: +10% per day',
      'Resets at midnight IST',
    ],
  },
  {
    id: 'brain-teasers',
    title: 'BRAIN TEASERS',
    description: 'Five teasers a day. Easy, hard, devious, plus a bonus.',
    category: 'solo',
    accent: 'blue',
    players: '1',
    hot: false,
    backendReady: true,
    rules: [
      'Daily refresh at 00:00 IST',
      'Difficulty: easy→normal→hard→devious→bonus',
      'No time limit',
      'Submit once — no revisions',
    ],
  },
  {
    id: 'cipher-lab',
    title: 'CIPHER LAB',
    description: 'Crack the cipher before the timer runs out. Hints cost points.',
    category: 'solo',
    accent: 'purple',
    players: '1',
    hot: false,
    backendReady: true,
    rules: [
      '10-minute timer',
      'Hints reduce score by 100',
      'Leaderboard resets weekly',
      'New cipher every 48 hours',
    ],
  },
  {
    id: 'riddle-room',
    title: 'RIDDLE ROOM',
    description: 'Cooperative escape room. One riddle locks the next.',
    category: 'party',
    accent: 'red',
    players: '2-8',
    hot: false,
    backendReady: true,
    rules: [
      'Solve chained clues in sequence',
      'Wrong clues lock the next room briefly',
      'Team coordination is required',
      'One run per room per day',
    ],
  },
  {
    id: 'type-wars',
    title: 'TYPE WARS',
    description: 'Speed-typing duels. WPM is a personality trait.',
    category: 'multiplayer',
    accent: 'yellow',
    players: '2-6',
    hot: false,
    backendReady: true,
    rules: [
      'Short duel rounds',
      'Accuracy and speed both matter',
      'Best of three determines winner',
      'Lag compensation is server-side',
    ],
  },
  {
    id: 'trivia-tower',
    title: 'TRIVIA TOWER',
    description: 'Climb the tower one question at a time. Wrong = fall.',
    category: 'party',
    accent: 'green',
    players: '4-20',
    hot: true,
    backendReady: true,
    rules: [
      'Answer questions in increasing difficulty',
      'Wrong answer drops your level',
      'Fast streaks unlock bonus steps',
      'Round ends at top floor or timeout',
    ],
  },
];

export const GAME_BY_ID = new Map(GAME_CATALOG.map((game) => [game.id, game]));
