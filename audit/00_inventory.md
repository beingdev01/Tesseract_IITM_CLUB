# Phase 0 — Inventory

Read-only mapping of the Tesseract IITM Club monorepo. No findings here — just the shape.

Generated against branch `audit/forensic-pass-1` cut from `main` @ `e28d04bb` ("Wire Smash Kart gameplay routes and pages") with 10 in-flight modifications in the games subsystem (in scope per maintainer).

---

## 1. Top-level layout (depth 3, pruned)

```
./
├── apps/
│   ├── api/
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── attendance/
│   │   │   ├── config/
│   │   │   ├── games/      (9 game folders + lib/)
│   │   │   ├── lib/
│   │   │   ├── middleware/
│   │   │   ├── routes/     (23 route modules)
│   │   │   ├── scripts/
│   │   │   └── utils/
│   │   └── .env, eslint.config.js, package.json, tsconfig.json
│   └── web/
│       ├── public/
│       ├── src/
│       │   ├── components/
│       │   │   (attendance, auth, dashboard, events, home, layout, media, polls, teams, tesseract, theme, ui)
│       │   ├── context/    (AuthContext, SettingsContext, SocketContext)
│       │   ├── hooks/      (useHomePageData, useMotionConfig, useOfflineScanner, useQuizTimer)
│       │   ├── lib/
│       │   ├── pages/
│       │   │   (admin/, dashboard/, games/, + ~20 top-level pages)
│       │   └── theme/, ui/
│       ├── tests/
│       ├── .env, .env.example, eslint.config.js, vite.config.ts, postcss.config.js, tailwind.config.js
├── audit/                  (this directory — write-only target)
├── e2e/                    (api-smoke.spec.ts, web-smoke.spec.ts)
├── prisma/
│   ├── migrations/         (63 timestamped folders + migration_lock.toml)
│   ├── schema.prisma
│   └── seed.ts
├── scripts/                (free-dev-ports.sh, migrate-deploy.sh)
└── package.json, CLAUDE.md, .env, README.md, playwright.config.ts
```

Root `.env` exists (248 bytes — likely shared values). `apps/api/.env` exists (2,010 bytes). `apps/web/.env` exists (187 bytes). `apps/web/.env.example` is the **only** committed example file; **no `.env.example` at the root or in `apps/api/`** — every new dev has to guess the API env shape.

---

## 2. Source line counts

Workspace totals across `apps/`:

| Workspace | TS | TSX | LOC |
|---|---|---|---|
| apps/api/src | 126 | 0 | 33,283 |
| apps/web/src | 17 | 126 | 42,573 |
| **Total source** | — | — | **75,856** |

Combined (incl. configs/tests/scripts at repo root) per file-extension grep:
- `.ts`: 152
- `.tsx`: 126
- `.js`: 5
- `.json`: 9 (excluding node_modules)
- `.prisma`: 1
- `.sql`: 63 (one per migration folder)
- test files (`*.test.ts` / `*.spec.ts` / `.tsx`): 11

### Top 30 largest source files

| LOC | Path |
|---:|---|
| 2,559 | `apps/web/src/components/attendance/EventCertificateWizard.tsx` |
| 2,477 | `apps/api/src/routes/attendance.ts` |
| 2,472 | `apps/web/src/lib/api.ts` |
| 2,208 | `apps/api/src/utils/email.ts` |
| 1,861 | `apps/api/src/routes/competition.ts` |
| 1,828 | `apps/api/src/routes/certificates.ts` |
| 1,656 | `apps/web/src/pages/EventDetailPage.tsx` |
| 1,569 | `apps/web/src/pages/admin/AdminCertificates.tsx` |
| 1,480 | `apps/api/src/routes/invitations.ts` |
| 1,430 | `apps/api/src/routes/network.ts` |
| 1,426 | `apps/web/src/pages/admin/AdminPublicView.tsx` |
| 1,407 | `apps/api/src/routes/events.ts` |
| 1,379 | `apps/web/src/pages/admin/EditEvent.tsx` |
| 1,308 | `apps/web/src/pages/dashboard/CreateEvent.tsx` |
| 1,209 | `apps/api/src/routes/teams.ts` |
| 1,166 | `apps/api/src/routes/polls.ts` |
| 1,096 | `apps/api/src/utils/generateCertificatePDF.ts` |
| 1,023 | `apps/web/src/pages/admin/AdminUsers.tsx` |
| 1,002 | `apps/web/src/components/attendance/AdminScanner.tsx` |
| 964 | `apps/web/src/pages/admin/AdminEventRegistrations.tsx` |
| 953 | `apps/web/src/components/attendance/AttendanceManager.tsx` |
| 836 | `apps/api/src/routes/users.ts` |
| 834 | `apps/web/src/pages/admin/AdminTeam.tsx` |
| 817 | `apps/web/src/components/events/AdminEventInvitations.tsx` |
| 817 | `apps/api/src/routes/settings.ts` |
| 806 | `apps/web/src/pages/games/SmashKartPlay.tsx` |
| 744 | `apps/web/src/pages/admin/AdminMail.tsx` |
| 717 | `apps/web/src/pages/AchievementsPage.tsx` |
| 692 | `apps/web/src/pages/JoinUsPage.tsx` |
| 669 | `apps/api/src/routes/team.ts` |

LOC concentration: top 30 files (39 of 285 source files) contain **~38,000 LOC** — exactly half of the project sits in these monoliths. Big-file risk is real.

### File count per top-level src subdir

API (`apps/api/src/`):
| Files | Subdir |
|---:|---|
| 58 | games/ |
| 33 | utils/ |
| 23 | routes/ |
| 3 | scripts/ |
| 3 | middleware/ |
| 3 | config/ |
| 1 | lib/ |
| 1 | attendance/ |
| 1 | (root: index.ts) |

Web (`apps/web/src/`):
| Files | Subdir |
|---:|---|
| 64 | pages/ |
| 60 | components/ |
| 9 | lib/ |
| 4 | hooks/ |
| 3 | context/ |
| 3 | (root: App.tsx, main.tsx, vite-env.d.ts) |

---

## 3. Express route surface

### Top-level mounts in `apps/api/src/index.ts`

```
GET   /                      → static landing
GET   /health                → liveness
GET   /health/db             → DB ping
GET   /ping                  → echo
USE   /sitemap.xml           → sitemapRouter
USE   /robots.txt            → robotsRouter
USE   /                      → indexNowRouter (key file)
USE   /api/auth              → authLimiter + authRouter
USE   /api/events            → eventsRouter
USE   /api/registrations     → registrationsRouter
USE   /api/teams             → teamsRouter
USE   /api/announcements     → announcementsRouter
USE   /api/polls             → pollsRouter
USE   /api/team              → teamRouter
USE   /api/achievements      → achievementsRouter
USE   /api/users             → usersRouter
USE   /api/stats             → statsRouter
USE   /api/settings          → settingsRouter
USE   /api/hiring            → hiringRouter
USE   /api/certificates      → certificatesRouter
USE   /api/signatories       → signatoriesRouter
USE   /api/upload            → uploadRouter
USE   /api/network           → networkRouter
USE   /api/invitations       → invitationsRouter
USE   /api/audit-logs        → auditRouter
USE   /api/mail              → mailRouter
USE   /api/credits           → creditsRouter
USE   /api/attendance        → attendanceRouter
USE   /api/indexnow          → authMiddleware + requireRole('ADMIN') + indexNowRouter
POST  /api/test-email        → authMiddleware + requireRole('ADMIN') + inline handler
USE   /api/games             → gamesRouter (via mountGames)
```

Plus per-game mount under `mountGames(app)` in `apps/api/src/games/index.ts`:

```
USE   /api/games/puzzle-run         → puzzleRunRouter
USE   /api/admin/games/puzzle-run   → puzzleRunAdminRouter
USE   /api/games/scribbl            → scribblRouter
USE   /api/admin/games/scribbl      → scribblAdminRouter
USE   /api/games/type-wars          → typeWarsRouter
USE   /api/admin/games/type-wars    → typeWarsAdminRouter
USE   /api/games/cipher-lab         → cipherLabRouter
USE   /api/admin/games/cipher-lab   → cipherLabAdminRouter
USE   /api/games/trivia-tower       → triviaTowerRouter
USE   /api/admin/games/trivia-tower → triviaTowerAdminRouter
USE   /api/games/brain-teasers      → brainTeasersRouter
USE   /api/admin/games/brain-teasers→ brainTeasersAdminRouter
USE   /api/games/riddle-room        → riddleRoomRouter
USE   /api/admin/games/riddle-room  → riddleRoomAdminRouter
USE   /api/games/competition        → router (mounts competitionRouter)
USE   /api/games/smash-kart         → router
```

### Verb distribution (handler declarations)

50 route handler declarations across 11 router files:

| Verb | Count |
|---:|---|
| POST | 24 |
| GET | 23 |
| PATCH | 3 |
| PUT | 0 |
| DELETE | 0 |

**Zero DELETE handlers in the entire API.** All "delete" actions (events, registrations, certificates, achievements, hiring applications, etc.) are layered on top of POST/PATCH — verify in Phase 4 whether they exist at all or are missing features.

### Handlers per file (router-level)

| Routes | File |
|---:|---|
| 19 | `apps/api/src/routes/attendance.ts` |
| 5  | `apps/api/src/index.ts` (top-level + test-email) |
| 4  | `apps/api/src/games/type-wars/router.ts` |
| 4  | `apps/api/src/games/cipher-lab/router.ts` |
| 3  | `apps/api/src/games/trivia-tower/router.ts` |
| 3  | `apps/api/src/games/smash-kart/index.ts` |
| 3  | `apps/api/src/games/scribbl/router.ts` |
| 3  | `apps/api/src/games/riddle-room/router.ts` |
| 3  | `apps/api/src/games/puzzle-run/router.ts` |
| 2  | `apps/api/src/games/brain-teasers/router.ts` |
| 1  | `apps/api/src/games/competition/index.ts` |

The above grep pattern `^(router|app)\.METHOD\(` undercounts: it doesn't match handlers preceded by middleware on the same logical line, handlers with leading whitespace, or `.route('/x').get(...)` chains. Phase 4 will produce the authoritative enumeration by reading each router file. Conservatively, the true route count is likely **>120** when sub-routers (events, certificates, competition, network, polls, invitations, settings, users, teams, etc. — all 1000+ LOC) are walked.

---

## 4. Socket.io event surface

5 source files contain socket handlers:

| File | `socket.on` | `.emit`/`.to().emit` | Namespace |
|---|---:|---:|---|
| `apps/api/src/attendance/attendanceSocket.ts` | 3 (`join:event`, `leave:event`, `disconnect`) | 1 (`error`) | `/attendance` |
| `apps/api/src/games/scribbl/socket.ts` | 7 (`room:join`, `room:start`, `canvas:stroke`, `canvas:clear`, `guess:submit`, `disconnect`, …) | multiple (`canvas:stroke`, `canvas:clear` broadcast) | `/games/scribbl` (via registerGameNamespace) |
| `apps/api/src/games/type-wars/socket.ts` | 6 (`room:join`, `room:ready`, `room:start`, `progress:update`, `progress:finish`, `disconnect`) | many (`race:*`, `progress:*`) | `/games/type-wars` |
| `apps/api/src/games/trivia-tower/socket.ts` | 5 (`room:join`, `room:start`, `answer:submit`, `disconnect`, …) | `answer:result`, `floor:summary`, `question:show` | `/games/trivia-tower` |
| `apps/api/src/games/riddle-room/socket.ts` | 6 (`room:join`, `room:start`, `clue:hint`, `clue:submit`, `chat:message`, `disconnect`) | `clue:show`, `clue:wrong`, `clue:hint`, `clue:solved`, `room:complete`, `chat:message` | `/games/riddle-room` |
| `apps/api/src/utils/socket.ts` | — | helper: `createIo`, `registerGameNamespace`-style wiring | `/` root + namespaces |

**Smash Kart and Puzzle Run / Brain Teasers / Cipher Lab have no socket layer** — they are HTTP-only games. CLAUDE.md documents them that way; confirms expectation.

The `socket.emit` count from the earlier grep (only 2) was misleading because emits are usually via `ns.to(room).emit` / `socket.to(channel).emit` rather than `socket.emit`. Real emit pattern uses room-broadcast through namespace helpers.

---

## 5. Prisma models (52)

From `prisma/schema.prisma`:

| Line | Model | Domain |
|---:|---|---|
| 15 | User | identity |
| 83 | Settings | config |
| 146 | Event | events |
| 200 | EventRegistration | events |
| 232 | EventInvitation | events |
| 274 | DayAttendance | events |
| 291 | EventTeam | events |
| 312 | EventTeamMember | events |
| 328 | CompetitionRound | competition |
| 353 | CompetitionSubmission | competition |
| 380 | CompetitionAutoSave | competition |
| 398 | GameSession | games (shared) |
| 414 | Announcement | content |
| 443 | Poll | content |
| 467 | PollOption | content |
| 481 | PollVote | content |
| 497 | PollVoteSelection | content |
| 508 | PollFeedback | content |
| 524 | TeamMember | people |
| 559 | Achievement | people |
| 583 | AuditLog | system |
| 597 | HiringApplication | people |
| 688 | NetworkProfile | people |
| 783 | Signatory | certificates |
| 807 | Certificate | certificates |
| 871 | Credit | people |
| 906 | ScribblPrompt | games/scribbl |
| 922 | ScribblRoom | games/scribbl |
| 940 | ScribblRound | games/scribbl |
| 957 | ScribblGuess | games/scribbl |
| 989 | TypeWarsPassage | games/type-wars |
| 1008 | TypeWarsRace | games/type-wars |
| 1026 | TypeWarsParticipant | games/type-wars |
| 1059 | TriviaQuestion | games/trivia-tower |
| 1079 | TriviaTowerRun | games/trivia-tower |
| 1096 | TriviaAnswer | games/trivia-tower |
| 1126 | PuzzleRunPuzzle | games/puzzle-run |
| 1147 | PuzzleRunDay | games/puzzle-run |
| 1158 | PuzzleRunDayPuzzle | games/puzzle-run |
| 1172 | PuzzleRunAttempt | games/puzzle-run |
| 1202 | BrainTeaser | games/brain-teasers |
| 1221 | BrainTeaserDay | games/brain-teasers |
| 1231 | BrainTeaserDayEntry | games/brain-teasers |
| 1244 | BrainTeaserAttempt | games/brain-teasers |
| 1282 | CipherChallenge | games/cipher-lab |
| 1307 | CipherAttempt | games/cipher-lab |
| 1343 | RiddleClue | games/riddle-room |
| 1365 | RiddleBundle | games/riddle-room |
| 1379 | RiddleBundleClue | games/riddle-room |
| 1393 | RiddleRoom | games/riddle-room |
| 1413 | RiddleRoomMember | games/riddle-room |
| 1427 | RiddleAttempt | games/riddle-room |

Schema file is **~1450 LOC** for 52 models — average 28 LOC per model, but skewed: `User`, `NetworkProfile`, `Event`, `Certificate`, `Settings` are 60–100 LOC each.

### Migrations

63 timestamped migration folders + `migration_lock.toml`. Timestamps span `20251229160610_` (first, empty name) → `20260511120000_games_platform_v2_integrity`. The earliest migration has a trailing-underscore empty name (raw "0" or initial empty squash — flag for Phase 3). At least one migration appears to be **out-of-band** named `20260303_add_quiz_join_code` (no full timestamp prefix) — non-canonical and risks ordering ambiguity.

Several migration names indicate **dropped or pivoted features** (`tesseract_pivot`, `games_platform_v2_and_qotd_drop`, `fix_certificate_schema_drift`, `add_quiz_system` followed eventually by a drop, `add_playground_models` / `add_playground_usage_models` / `add_playground_daily_limit_setting`). The Playground and Quiz / QOTD subsystems were added then removed — search for dead references in Phase 7.

---

## 6. Environment variables

### API (`apps/api/src`) — 33 unique vars, 84 read sites

```
ALLOWED_ORIGINS
API_BASE_URL
ATTENDANCE_JWT_SECRET           ← legacy only (settings.ts:104 comment)
ATTENDANCE_TOKEN_EXPIRES_IN
BACKEND_URL
BREVO_API_KEY
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
CLOUDINARY_CLOUD_NAME
COOKIE_DOMAIN
DB_KEEPALIVE_INTERVAL_MS
EMAIL_FROM
EMAIL_FROM_NAME
EMAIL_REPLY_TO
ENABLE_BACKGROUND_SCHEDULERS
ENABLE_DB_KEEPALIVE
ENABLE_DEV_AUTH
ENABLE_REQUEST_LOGGING
EVENT_STATUS_INTERVAL_MS
FRONTEND_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
INDEXNOW_KEY                    ← also mutated at runtime in settings.ts:163
INVITE_LINK_WH                  ← documented in CLAUDE.md? No. Only used in email.ts:2092.
NODE_ENV
PORT
PUBLIC_API_BASE_URL
RENDER_EXTERNAL_URL
SEED_ADMIN_EMAIL
SOCKET_PING_INTERVAL_MS
SOCKET_PING_TIMEOUT_MS
SUPER_ADMIN_EMAIL
SUPER_ADMIN_NAME
```

**Notably absent yet referenced by Prisma:** `DATABASE_URL`, `DIRECT_URL`. Both are documented in `CLAUDE.md` §10 but are consumed only by Prisma generation, not by application code — so they don't appear in `process.env.*` greps. They are nonetheless required at boot.

**Notably absent yet documented in CLAUDE.md but never read in code:** `JWT_SECRET` is documented in CLAUDE.md §10 but no `process.env.JWT_SECRET` reference appears in `apps/api/src`. Phase 1 must confirm whether `apps/api/src/utils/jwt.ts` reads it indirectly or whether **the JWT secret has been removed/replaced** (e.g., stored in DB Settings). This is a CRIT-tier candidate finding.

### Web (`apps/web/src`) — `import.meta.env`

```
VITE_API_URL          (defaulted to http://localhost:5001/api in 4 places — see §6.2)
VITE_PUBLIC_WEB_ORIGIN
VITE_PLAYGROUND_URL   ← Playground subsystem was dropped (per migrations); FE still references it
```

### .env.example coverage

| File | Documented | Reality |
|---|---|---|
| `apps/web/.env.example` | `VITE_API_URL`, `VITE_PUBLIC_WEB_ORIGIN`, `VITE_PLAYGROUND_URL` | matches |
| `apps/api/.env.example` | **MISSING** | 33+ vars undocumented |
| `.env.example` (root) | **MISSING** | — |

Onboarding gap is significant — confirmed in Phase 7 dead-code/dead-env walk.

---

## 7. Dependencies

### Root (`package.json`) — 1 prod + 10 dev

Prod:
- `@prisma/client@^5.8.0` — Prisma runtime, used by api workspace.

Dev:
- `@fontsource/cinzel`, `@fontsource/playfair-display` — fonts; **at root, devDependency, packaged in web?** Inspect Phase 7.
- `@playwright/test@^1.59.1` — e2e runner.
- `@types/node@^20.19.27` — types.
- `concurrently@^9.2.1` — root dev script.
- `dotenv@^17.2.3` — root load (also separately in api).
- `prisma@^5.8.0` — CLI.
- `ts-node@^10.9.2` — possibly unused (api uses `tsx`).
- `tsx@^4.21.0` — seed + dev runner.
- `typescript@^5.3.3` — TS compiler (note: web declares `~5.9.3`, **version skew**).
- `overrides.qs: 6.15.0` — explicit pin to patch a transitive vuln.

### `apps/api` — 29 prod + 19 dev

Prod (and inferred role):
- `@prisma/client` — DB.
- `@react-pdf/renderer` — PDF generation (used by `generateCertificatePDF.ts`).
- `bcryptjs` — password hash (verify usage — auth flow is mostly OAuth).
- `bufferutil`, `utf-8-validate` — optional ws speed-ups (engines.io picks them up).
- `cloudinary` — image upload.
- `compression`, `cors`, `helmet`, `express-rate-limit`, `express` — HTTP stack.
- `dotenv@^16.3.1` — env (root has 17.2.3 — version skew).
- `exceljs` — likely used in attendance export.
- `isomorphic-dompurify`, `sanitize-html` — sanitization (two libs, possible redundancy).
- `jsonwebtoken` — JWT.
- `marked` — Markdown rendering server-side (used in PDF? newsletter? verify).
- `multer` — file uploads.
- `nanoid@^3.3.11` — ID generator (pinned to v3 — v4/v5 are ESM-only; v3 keeps CJS interop).
- `passport`, `passport-github2`, `passport-google-oauth20` — OAuth.
- `qrcode` — QR ticket generation.
- `react@^19.2.4`, `react-dom@^19.2.4` — **on a Node backend** — required only by `@react-pdf/renderer`. Confirm Phase 7 they're not imported elsewhere.
- `sharp` — image processing.
- `socket.io@^4.8.3` — real-time.
- `zod@^3.22.4` — validation (web uses `^4.2.1` — version skew).

Dev: types packages + `prisma`, `tsx`, `typescript`. Notable: `@types/sharp@^0.31.1` is **incompatible** with `sharp@^0.34.5` (sharp ships its own types since 0.32+; legacy types may shadow). Flag for Phase 1.

### `apps/web` — 27 prod + 18 dev

Prod (and inferred role):
- `@hookform/resolvers`, `react-hook-form` — forms.
- `@radix-ui/react-{alert-dialog,dialog,dropdown-menu}` — accessible primitives.
- `@tanstack/react-query@^5.90.14` — server state.
- `class-variance-authority`, `clsx`, `tailwind-merge` — Tailwind class building.
- `dompurify@^3.3.1` — sanitization on FE.
- `framer-motion@^12.x` — animation.
- `html2canvas`, `html5-qrcode`, `jsqr` — QR + screenshot pipeline.
- `lucide-react@^0.562.0` — icons.
- `qrcode.react@^4.2.0` — QR display.
- `react@19.2.4`, `react-dom@19.2.4` — pinned exact (no ^) — version-pin style differs from API which uses `^`.
- `react-router-dom@^7.13.0` — routing.
- `recharts@^3.7.0` — charts.
- `rehype-highlight`, `rehype-raw`, `remark-gfm`, `react-markdown` — markdown render.
- `socket.io-client@^4.8.3` — realtime.
- `sonner@^2.0.7` — toasts.
- `zod@^4.2.1` — **major-version mismatch** with API's `zod@^3.22.4`. If FE/BE share schemas, this breaks. Flag CRIT-candidate for Phase 1.
- `zustand@^5.0.11` — local state.

### Suspect / justify-or-remove (candidates for Phase 7 dead-code pass)

- `ts-node` in root: api uses `tsx`, root scripts use `tsx`. Probably unused.
- `@fontsource/cinzel`, `@fontsource/playfair-display` in root devDeps: should be in `apps/web/package.json` if they're a web font.
- `react` / `react-dom` in `apps/api`: only justified by `@react-pdf/renderer`. Verify no other imports.
- `isomorphic-dompurify` + `sanitize-html` together: pick one.
- `marked` in api: used? Only if server-side markdown rendering exists.
- `bcryptjs` in api: if auth is OAuth-only, this is dead (check `routes/auth.ts`).
- `bufferutil` + `utf-8-validate`: optional ws perf; harmless but flag.
- `@types/sharp` while `sharp` ships its own types: harmless but redundant.

### Version-skew flags (already CRIT/HIGH-class)

| Package | API version | Web version | Severity |
|---|---|---|---|
| `zod` | 3.22.4 | 4.2.1 | **HIGH** (shared schemas break) |
| `typescript` | 5.3.3 | 5.9.3 | MED |
| `dotenv` | 16.3.1 (api) | 17.2.3 (root) | LOW |
| `@types/react` | 19.2.14 | 19.2.5 | LOW |
| `@types/node` | 20.10.6 (api), 20.19.27 (root) | 24.10.1 (web) | LOW (web sees newer Node types than runtime) |

---

## 8. Scripts

### Root (`package.json`)

| Script | Command | Verdict |
|---|---|---|
| `dev` | `bash ./scripts/free-dev-ports.sh && concurrently ...` | runs both workspaces; not executed here |
| `start` | `npm run build && npm run start:prod` | not executed |
| `start:prod` | `NODE_ENV=production concurrently ...` | uses `preview` on web in prod — **suspect** (vite preview is dev-only) |
| `build` | `npm run build --workspace=apps/web && npm run build --workspace=apps/api` | not executed |
| `web` / `api` | shorthand for workspace dev | n/a |
| `db:migrate` / `db:migrate:deploy` / `db:seed` / `db:studio` / `db:reset` | prisma CLI passthroughs | n/a |
| `test:e2e[:headed/:ui]` | `playwright test` | not executed in this phase |
| `test:stability` | `node --import tsx --test apps/api/src/utils/*.test.ts apps/web/tests/*.test.ts` | only 9 of 11 test files (excludes e2e specs and `*.smoke.test.ts` are included by glob, but `*.init.test.ts` is too — should match all). Verified in Phase 10. |
| `setup` | `npm install && npm run db:migrate && npm run db:seed` | sequential bootstrap |

`start:prod` running `vite preview` is **not a real production server** (intended only for previewing the build output; no SSR, no compression beyond static, no security headers). If this is the deployed prod script, it's a HIGH-severity hosting issue. Confirm in Phase 8.

### `apps/api`

| Script | Command | Verdict |
|---|---|---|
| `dev` | `NODE_ENV=development tsx watch src/index.ts` | runs |
| `build` | `tsc` | runs |
| `start` | `node --max-old-space-size=400 dist/index.js` | **400 MB hard heap cap** for an app doing PDF generation, image processing (sharp), and Socket.io — may OOM under load. |
| `lint` | `eslint .` | runs |

### `apps/web`

| Script | Command | Verdict |
|---|---|---|
| `dev` | `vite` | runs |
| `build` | `tsc -b && vite build` | runs |
| `lint` | `eslint .` | runs |
| `preview` | `vite preview` | dev-time only |

---

## 9. Test surface

11 files total:

```
apps/api/src/utils/email.test.ts
apps/api/src/utils/generateCertificatePDF.init.test.ts
apps/api/src/utils/generateCertificatePDF.smoke.test.ts
apps/api/src/utils/jwt.test.ts
apps/api/src/utils/scheduler.test.ts
apps/web/tests/authToken.test.ts
apps/web/tests/competitionCertificateUtils.test.ts
apps/web/tests/quizError.test.ts
apps/web/tests/quizStore.test.ts
e2e/api-smoke.spec.ts
e2e/web-smoke.spec.ts
```

Runners:
- `node --test` (built-in) via `test:stability` script — covers 9 unit files.
- `@playwright/test` via `test:e2e` — covers 2 spec files.

**No coverage tooling.** `c8` / `nyc` / `vitest --coverage` not in deps. CLAUDE.md "230/230 passing" doesn't reconcile: 9 unit files + 2 specs cannot reach 230 tests unless each contains an extraordinary number of `it()` blocks. Phase 10 must count actual asserts.

**`quizStore.test.ts` / `quizError.test.ts`** test a feature (Quiz / QOTD) that was dropped per migration `20260511000000_games_platform_v2_and_qotd_drop`. Dead tests covering removed code → Phase 7.

---

## 10. Git state

- Current branch: `audit/forensic-pass-1` (cut from `main`)
- `main` parent: `e28d04bb Wire Smash Kart gameplay routes and pages`
- 10 modified files (in-flight games subsystem, in scope):
  - `apps/api/src/games/lib/roomStore.ts`
  - `apps/api/src/games/riddle-room/{socket,state}.ts`
  - `apps/api/src/games/scribbl/{socket,state}.ts`
  - `apps/api/src/games/trivia-tower/{socket,state}.ts`
  - `apps/api/src/games/type-wars/{router,socket,state}.ts`
- Recent commit cadence (last 10): `Wire Smash Kart…`, `Implement games platform…`, `prod bug solved`, `few bugs`, `render paiud plan issue`, `render.yml`, `everything`, `all changes`, `Rename branding and add gitignore`. Commit messages are **mostly non-descriptive** ("everything", "all changes", "few bugs") — git blame will be low-value evidence for many findings.

---

## 11. Required-question answers (from prompt §17 exit gate)

> **How many routes does this app expose?**

50 explicit handler declarations across 11 router files plus `index.ts` top-level mounts. Sub-routers in 1000+ LOC files (events, certificates, network, polls, invitations, settings, users, teams, competition, etc.) collectively add many more — true total is **likely in the 120–180 range**. Phase 4 produces the exhaustive table.

> **How many Prisma models?**

52, spanning 1,450 LOC of `schema.prisma`.

> **What's the biggest file by LOC, and what does it do in one sentence?**

`apps/web/src/components/attendance/EventCertificateWizard.tsx` (2,559 LOC) — multi-step admin UI for issuing event certificates: choosing template, picking recipients, mapping signatories, previewing, sending bulk.

> **Which three env vars are the most critical?**

1. `DATABASE_URL` — Postgres connection (no DB, no app). Consumed by Prisma directly.
2. `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` — without them, the primary login flow (`routes/auth.ts:127`) refuses; only dev-auth would work.
3. `BREVO_API_KEY` — all transactional email (`utils/email.ts:210`); without it, every email-driven flow (invitations, certificates, registrations, password reset, hiring) silently fails or is downgraded.

A noteworthy fourth: **the missing `JWT_SECRET`**. CLAUDE.md documents it but no `process.env.JWT_SECRET` reference exists in api source. Phase 1 must resolve.

> **Which dependency would you remove first if forced to remove one?**

`ts-node` from root devDependencies. Both `apps/api` dev (`tsx watch`) and the root `tsx` already cover TypeScript runtime needs. `ts-node` appears unused. Second choice: `@fontsource/cinzel` and `@fontsource/playfair-display` at root — fonts belong in `apps/web` if used at all (Phase 7 will verify they're imported).
