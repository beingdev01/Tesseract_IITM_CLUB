# Games

Lightweight registry that mounts each game's REST router under `/api/games/<id>`. A shared catalog router also serves `GET /api/games` and `GET /api/games/:id`.
There is intentionally no DI container, no plugin loader, and no per-game schema abstraction — three games of churn before reaching for one of those.

## Adding a new game

1. Create `apps/api/src/games/<name>/`. The directory holds whatever the game needs — at minimum an `index.ts` that exports a `Game` (see `competition/index.ts` for the shape).

   ```ts
   import { Router } from 'express';
   import type { Express } from 'express';
   import type { Game } from '../index.js';

   const router = Router();
   router.get('/health', (_req, res) => res.json({ ok: true, game: '<name>' }));
   // ... your routes here

   export const <name>Game: Game = {
     id: '<name>',
     name: 'Display Name',
     mountRouter(app: Express) {
       app.use('/api/games/<name>', router);
     },
   };
   ```

2. Add it to `registry.ts`:

   ```ts
   import { <name>Game } from './<name>/index.js';
   export const registry: Game[] = [competitionGame, <name>Game];
   ```

3. Put scoring or heavy logic in `<name>/scoring.ts` so the entry file stays a thin mount point. Reuse Prisma models and existing utils — don't fork them.

That's it. The server picks up new games at the next restart.

## What goes in a game vs. the core

- **Game-specific:** scoring rules, round timers, submission endpoints, leaderboards scoped to that game.
- **Core (shared):** auth, settings, registrations, attendance, certificates, audit log. Games depend on these but don't re-implement them.
