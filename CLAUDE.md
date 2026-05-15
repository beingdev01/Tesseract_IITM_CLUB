# CLAUDE.md - Tesseract IITM Club Platform

This document is a code map for agents and developers working in this repository. It describes the current implementation and the important extension points.

---

## 1. Project Purpose

Tesseract is a full-stack IITM BS club platform for:
- event publishing, registrations, teams, and attendance
- certificates, signatories, achievements, credits, and member profiles
- announcements, polls, hiring, network, and invitation workflows
- a shared games platform with catalog, per-game play loops, admin content tools, and leaderboard aggregation

---

## 2. Monorepo Layout

```text
Tesseract_IITM_CLUB/
├── apps/
│   ├── api/                 # Express + TypeScript API (ESM)
│   │   └── src/
│   │       ├── index.ts     # API bootstrap, route mounting, sockets, schedulers
│   │       ├── attendance/  # attendance socket namespace logic
│   │       ├── games/       # modular games platform
│   │       ├── lib/         # Prisma client + retry helper
│   │       ├── middleware/  # auth, role, feature flags
│   │       ├── routes/      # non-game domain routes
│   │       └── utils/       # response, audit, sanitize, scheduler, socket helpers
│   └── web/                 # React + Vite + TypeScript frontend
│       └── src/
│           ├── App.tsx      # providers and routes
│           ├── components/
│           ├── context/
│           ├── lib/api.ts   # typed API client
│           └── pages/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── scripts/
└── package.json
```

---

## 3. Backend Architecture

## 3.1 Entry + Middleware

`apps/api/src/index.ts`:
- configures Express, CORS, Helmet, compression, JSON limits, CSRF protection, rate limits, request logging, Passport, and Socket.io
- initializes attendance sockets and game sockets
- mounts normal route modules plus `mountGames(app)`
- starts optional schedulers when `ENABLE_BACKGROUND_SCHEDULERS=true`
- exposes `/health`, `/health/db`, and `/ping`
- handles global 404, global errors, and graceful shutdown

## 3.2 Route Modules

Core route modules are mounted under `/api/*` from `apps/api/src/routes/`. Newer code should use `ApiResponse`, Zod validation, `withRetry`, and audit logging for admin mutations.

## 3.3 Games Subsystem

Path: `apps/api/src/games/`
- `index.ts`: `Game` interface and `mountGames(app)`
- `registry.ts`: registered game modules
- `router.ts`: shared catalog, detail, and `/api/games/leaderboard`
- `catalog.ts`: public catalog metadata
- `lib/`: shared auth, schemas, in-memory room store, session recorder, socket namespace helper, and HTTP helpers
- one folder per game:
  - `type-wars`
  - `trivia-tower`
  - `puzzle-run`
  - `brain-teasers`
  - `cipher-lab`
  - `riddle-room`
  - `scribbl`
  - `smash-kart`
  - `competition`

Every completed game run records through `recordGameSession()` or `recordGameSessionsBatch()` so `game_sessions` powers the shared leaderboard.

---

## 4. Frontend Architecture

`apps/web/src/App.tsx` wraps the app with:
1. `QueryClientProvider`
2. `AuthProvider`
3. `SettingsProvider`
4. `ErrorBoundary`
5. React Router

Routes are lazy-loaded with a suspense boundary. React Query defaults are `staleTime=5m` and `gcTime=30m`.

Important routes:
- public: `/`, `/events`, `/team`, `/achievements`, `/games`, `/games/:id`, `/leaderboard`, `/signin`, `/auth/callback`
- protected user: `/dashboard/*`, `/games/:id/play`
- protected admin: `/admin/*`, including `/admin/game-content`

---

## 5. Database Schema (Prisma)

Core identity/config:
- `User`
- `Settings`

Events and attendance:
- `Event`
- `EventRegistration`
- `DayAttendance`
- `EventInvitation`
- `EventTeam`
- `EventTeamMember`

Competition:
- `CompetitionRound`
- `CompetitionSubmission`
- `CompetitionAutoSave`

Shared games:
- `GameSession`

Type Wars:
- `TypeWarsPassage`
- `TypeWarsRace`
- `TypeWarsParticipant`

Trivia Tower:
- `TriviaQuestion`
- `TriviaTowerRun`
- `TriviaAnswer`

Puzzle Run:
- `PuzzleRunPuzzle`
- `PuzzleRunDay`
- `PuzzleRunDayPuzzle`
- `PuzzleRunAttempt`

Brain Teasers:
- `BrainTeaser`
- `BrainTeaserDay`
- `BrainTeaserDayEntry`
- `BrainTeaserAttempt`

Cipher Lab:
- `CipherChallenge`
- `CipherAttempt`

Riddle Room:
- `RiddleClue`
- `RiddleBundle`
- `RiddleBundleClue`
- `RiddleRoom`
- `RiddleRoomMember`
- `RiddleAttempt`

Scribbl:
- `ScribblPrompt`
- `ScribblRoom`
- `ScribblRound`
- `ScribblGuess`

Content and engagement:
- `Announcement`
- `Poll`
- `PollOption`
- `PollVote`
- `PollVoteSelection`
- `PollFeedback`

People and recognition:
- `TeamMember`
- `Achievement`
- `Credit`
- `NetworkProfile`
- `HiringApplication`
- `AuditLog`

Certificates:
- `Signatory`
- `Certificate`

---

## 6. Authentication + Authorization

Auth middleware: `apps/api/src/middleware/auth.ts`
- reads bearer tokens and `tesseract_session` cookies
- validates JWTs with `HS256`
- enriches requests as `authUser`

Role middleware: `apps/api/src/middleware/role.ts`
- role hierarchy: PUBLIC, USER/NETWORK, MEMBER, CORE_MEMBER, ADMIN/PRESIDENT
- `requireRole(minRole)` protects privileged routes

Games use:
- REST gameplay: `gameAuth`
- public optional game reads: `gamePublicAuth`
- admin content: `gameAdminAuth`
- sockets: `registerGameNamespace()` sets `socket.data.authUser`

---

## 7. Feature and Screen Flows

## 7.1 Games Catalog and Leaderboard

- `/games` fetches `GET /api/games`
- `/games/:id` fetches `GET /api/games/:id`
- backend-ready game Play buttons route to `/games/:id/play`, except Smash Kart keeps its direct session behavior
- `/leaderboard` and dashboard leaderboard use `GET /api/games/leaderboard?game=<id>&range=all|week|month&limit=<n>`

## 7.2 Type Wars

REST:
- `POST /api/games/type-wars/rooms`
- `POST /api/games/type-wars/rooms/:code/join`
- `GET /api/games/type-wars/rooms/:code`
- `GET /api/games/type-wars/leaderboard`

Socket namespace: `/games/type-wars`
- `room:join`
- `room:ready`
- `room:start`
- `race:countdown`
- `race:start`
- `progress:update`
- `progress:tick`
- `progress:finish`
- `race:results`

Admin:
- `/api/admin/games/type-wars/passages`

## 7.3 Trivia Tower

REST:
- `POST /api/games/trivia-tower/rooms`
- `POST /api/games/trivia-tower/rooms/:code/join`
- `GET /api/games/trivia-tower/rooms/:code`

Socket namespace: `/games/trivia-tower`
- `room:join`
- `room:start`
- `question:show`
- `answer:submit`
- `answer:result`
- `floor:summary`
- `tower:results`

Admin:
- `/api/admin/games/trivia-tower/questions`

## 7.4 Puzzle Run

REST:
- `GET /api/games/puzzle-run/today`
- `POST /api/games/puzzle-run/puzzle/:puzzleId/attempt`
- `POST /api/games/puzzle-run/complete`

Scheduler:
- daily deck ensure at 00:00 Asia/Kolkata via the background scheduler

Admin:
- `/api/admin/games/puzzle-run/puzzles`
- `/api/admin/games/puzzle-run/days/today/regenerate`

## 7.5 Brain Teasers

REST:
- `GET /api/games/brain-teasers/today`
- `POST /api/games/brain-teasers/:teaserId/submit`

Scheduler:
- daily set ensure at 00:00 Asia/Kolkata via the background scheduler

Admin:
- `/api/admin/games/brain-teasers/teasers`
- `/api/admin/games/brain-teasers/days/today`
- `/api/admin/games/brain-teasers/days/today/regenerate`

## 7.6 Cipher Lab

REST:
- `GET /api/games/cipher-lab/active`
- `POST /api/games/cipher-lab/start`
- `POST /api/games/cipher-lab/hint`
- `POST /api/games/cipher-lab/submit`

Scheduler:
- 48-hour rotation via the background scheduler

Admin:
- `/api/admin/games/cipher-lab/challenges`
- `/api/admin/games/cipher-lab/preview`

## 7.7 Riddle Room

REST:
- `POST /api/games/riddle-room/rooms`
- `POST /api/games/riddle-room/rooms/:code/join`
- `GET /api/games/riddle-room/rooms/:code`

Socket namespace: `/games/riddle-room`
- `room:join`
- `room:start`
- `clue:show`
- `clue:submit`
- `clue:wrong`
- `clue:hint`
- `clue:solved`
- `room:complete`
- `chat:message`

Admin:
- `/api/admin/games/riddle-room/clues`
- `/api/admin/games/riddle-room/bundles`

## 7.8 Scribbl

REST:
- `POST /api/games/scribbl/rooms`
- `POST /api/games/scribbl/rooms/:code/join`
- `GET /api/games/scribbl/rooms/:code`

Socket namespace: `/games/scribbl`
- `room:join`
- `room:start`
- `round:prompt`
- `round:start`
- `canvas:stroke`
- `canvas:clear`
- `guess:submit`
- `guess:close`
- `guess:correct`
- `guess:message`
- `round:end`
- `game:end`

Admin:
- `/api/admin/games/scribbl/prompts`

## 7.9 Competition and Smash Kart

- competition remains event-integrated under `/api/games/competition/*`
- Smash Kart remains under `/api/games/smash-kart` and records sessions for leaderboard visibility

---

## 8. Data Flow Patterns

Events, registrations, teams, and competition use Prisma transactions for race-sensitive writes.

Games follow this pattern:
1. validate request with Zod
2. authenticate with game middleware
3. use `withRetry` for Prisma route queries
4. keep multiplayer room state in `RoomStore`
5. avoid sending answer/prompt secrets to unauthorized clients
6. record `GameSession` rows when runs finish
7. expose ranking through the shared games leaderboard route

---

## 9. Important Files

Backend:
- `apps/api/src/index.ts`
- `apps/api/src/games/index.ts`
- `apps/api/src/games/registry.ts`
- `apps/api/src/games/catalog.ts`
- `apps/api/src/games/router.ts`
- `apps/api/src/games/lib/gameAuth.ts`
- `apps/api/src/games/lib/gameSchemas.ts`
- `apps/api/src/games/lib/roomStore.ts`
- `apps/api/src/games/lib/sessionRecorder.ts`
- `apps/api/src/games/lib/socketNamespace.ts`
- `apps/api/src/games/type-wars/*`
- `apps/api/src/games/trivia-tower/*`
- `apps/api/src/games/puzzle-run/*`
- `apps/api/src/games/brain-teasers/*`
- `apps/api/src/games/cipher-lab/*`
- `apps/api/src/games/riddle-room/*`
- `apps/api/src/games/scribbl/*`
- `apps/api/src/games/smash-kart/index.ts`
- `apps/api/src/games/competition/index.ts`
- `apps/api/src/utils/scheduler.ts`
- `apps/api/src/utils/socket.ts`
- `apps/api/src/attendance/attendanceSocket.ts`

Frontend:
- `apps/web/src/App.tsx`
- `apps/web/src/lib/api.ts`
- `apps/web/src/pages/GamesPage.tsx`
- `apps/web/src/pages/GameDetailPage.tsx`
- `apps/web/src/pages/LeaderboardPage.tsx`
- `apps/web/src/pages/dashboard/DashboardLeaderboard.tsx`
- `apps/web/src/pages/games/GamePlayRouter.tsx`
- `apps/web/src/pages/games/*Play.tsx`
- `apps/web/src/pages/admin/AdminGameContent.tsx`
- `apps/web/src/pages/admin/gameContent/ContentTable.tsx`
- `apps/web/src/pages/admin/gameContent/ContentEditor.tsx`
- `apps/web/src/pages/admin/gameContent/*Admin.tsx`

Database:
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `prisma/migrations/20260510191153_add_game_sessions/migration.sql`
- `prisma/migrations/20260511000000_games_platform_v2_and_legacy_cleanup/migration.sql`
- `prisma/migrations/20260511120000_games_platform_v2_integrity/migration.sql`

---

## 10. Environment Variables

Common variables referenced by API code:
- `DATABASE_URL`, `DIRECT_URL`
- `JWT_SECRET`
- `PORT`, `NODE_ENV`
- `FRONTEND_URL`, `BACKEND_URL`, `ALLOWED_ORIGINS`, `COOKIE_DOMAIN`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_NAME`, `SEED_ADMIN_EMAIL`
- `ENABLE_DEV_AUTH`
- `BREVO_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `EMAIL_REPLY_TO`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `INDEXNOW_KEY`, `ATTENDANCE_JWT_SECRET`, `ATTENDANCE_TOKEN_EXPIRES_IN`
- `ENABLE_DB_KEEPALIVE`, `DB_KEEPALIVE_INTERVAL_MS`
- `ENABLE_BACKGROUND_SCHEDULERS`, `EVENT_STATUS_INTERVAL_MS`
- `ENABLE_REQUEST_LOGGING`
- `SOCKET_PING_TIMEOUT_MS`, `SOCKET_PING_INTERVAL_MS`
- `API_BASE_URL`, `PUBLIC_API_BASE_URL`, `RENDER_EXTERNAL_URL`
- `INVITE_LINK_WH` — optional WhatsApp invite URL appended to the verified-user welcome email.

A template lives at [apps/api/.env.example](apps/api/.env.example).

---

## 11. Build, Run, and Deployment

Workspace scripts:
- `npm run dev`
- `npm run build`
- `npm run test:e2e`
- `npm run test:stability`

API workspace:
- `npm run dev --workspace=apps/api`
- `npm run build --workspace=apps/api`
- `npm run start --workspace=apps/api`

Web workspace:
- `npm run dev --workspace=apps/web`
- `npm run build --workspace=apps/web`

Database:
- `npx prisma generate`
- `npx prisma validate`
- `npx prisma migrate status`
- `npx prisma db seed`

---

## 12. Known Gaps / Broken or Unfinished Flows

1. Competition frontend route mismatch:
   - Event detail links to competition play/result routes that are not currently registered in `App.tsx`.

2. Poll detail route mismatch:
   - Some poll cards link to `/polls/:slug`, but `App.tsx` does not currently define that public detail route.

3. Local manual QA still depends on seeded users:
   - Multiplayer game validation needs at least two authenticated browser sessions.

---

## 13. Conventions and Hidden Assumptions

- API source uses ESM with `.js` import suffixes in TypeScript files.
- New API routes should use `ApiResponse` helpers rather than direct `res.status(...).json(...)`.
- Route input validation uses Zod.
- Prisma queries in route handlers should run through `withRetry`.
- Admin mutations should call `auditLog(...)`.
- Game admin audit entries use entity `game_content`.
- Sockets must read user identity from `socket.data.authUser`, never from event payloads.
- In-memory multiplayer state uses `RoomStore`; no Redis or queue is required.
- Public game pages use the Tesseract bracketed visual system.
- Admin game content pages use Tailwind and shadcn-style components.

---

## 14. Safe Extension Guide

When adding or modifying features:

1. Check API mount, frontend route, and API client method together.
2. Match existing auth and role middleware patterns.
3. Use Prisma transactions or guarded updates for race-sensitive writes.
4. Keep game-specific behavior isolated under `apps/api/src/games/<id>/`.
5. Keep frontend play pages lazy-loaded.
6. Keep secrets out of list responses and socket broadcasts.
7. Record leaderboard sessions once per completed user run.
8. Run type-check, build, Prisma validation, and the literal removed-feature grep before declaring done.

---

## 15. Next Work Queue for Games

No queued games-platform implementation items remain in this document. Future work should be filed as specific polish, balance, tests, or product requests.
