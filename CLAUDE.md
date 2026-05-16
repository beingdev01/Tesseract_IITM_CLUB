# CLAUDE.md — Tesseract IITM Club Platform

A code map for agents and developers working in this repository. It describes
the current implementation, the boundaries between subsystems, and the
non-obvious assumptions you need to respect when extending the codebase.

---

## 1. Project Purpose

Tesseract is a full-stack club platform for the IITM BS program. It covers:

- **Events** — publishing, individual + team registrations, invitations,
  multi-day attendance, scanner + beacon flows, exports.
- **Recognition** — certificates with signatories + PDF generation +
  Cloudinary upload + public verification, achievements, credits ledger.
- **Engagement** — announcements, polls (single/multi/open-ended +
  feedback), hiring applications, network profiles (professional + alumni),
  team profiles and member pages.
- **Games platform** — modular per-game subsystems (REST + Socket.io + admin
  content tools) sharing a catalog and a cross-game leaderboard backed by
  `GameSession` rows.
- **Admin** — users, team, achievements, registrations, certificates, audit
  log, mail composer, hiring panel, public-view, game content, settings
  (gated behind super-admin / president).

The deployment target is Render: API as a Node web service, web as a static
site.

---

## 2. Monorepo Layout

```text
Tesseract_IITM_CLUB/
├── apps/
│   ├── api/                       # Express + TypeScript API (ESM, NodeNext)
│   │   ├── .env.example
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts           # bootstrap, middleware, routes, sockets, shutdown
│   │       ├── attendance/        # attendance socket namespace
│   │       ├── config/            # passport, cloudinary, email templates
│   │       ├── games/             # modular games platform (see §3.3)
│   │       ├── lib/prisma.ts      # Prisma client + withRetry helper
│   │       ├── middleware/        # auth, role, feature flags
│   │       ├── routes/            # non-game domain routes (23 modules)
│   │       └── utils/             # response, audit, sanitize, scheduler, sockets, …
│   └── web/                       # React 19 + Vite + TypeScript SPA
│       └── src/
│           ├── App.tsx            # providers, lazy routes, ScrollToTop, NotFound
│           ├── main.tsx
│           ├── index.css
│           ├── components/        # ErrorBoundary, SEO, feature-scoped folders
│           ├── context/           # Auth, Settings, Socket
│           ├── hooks/             # useHomePageData, useMotionConfig, useOfflineScanner
│           ├── lib/api.ts         # typed API client (~2.5k LOC, the boundary)
│           └── pages/             # public, dashboard, admin, games/
├── prisma/
│   ├── schema.prisma              # 52 models, 25 enums, ~1.4k LOC
│   ├── migrations/                # 63 migrations under timestamped folders
│   └── seed.ts
├── audit/                         # forensic audit deliverables (read-only history)
├── scripts/                       # free-dev-ports.sh, migrate-deploy.sh, fix-dark-mode.sh
├── e2e/                           # Playwright smoke tests (api + web)
├── render.yaml                    # Render Blueprint (api web service + static web)
├── start-production.sh            # prod entrypoint (API only; SPA served statically)
├── playwright.config.ts
└── package.json                   # npm workspaces root
```

---

## 3. Backend Architecture

### 3.1 Bootstrap (`apps/api/src/index.ts`)

The entry file is the single source of truth for wiring:

1. **dotenv** loads `../../.env` (monorepo root) then `apps/api/.env`; locals
   override. In production neither file exists — env vars come from Render.
2. **Fail-fast checks**: `getJwtSecret()` throws if `JWT_SECRET` is missing or
   insecure; warns on missing `BREVO_API_KEY` / Cloudinary credentials.
3. **Express + middleware** in this order:
   - `trust proxy` in production (rate-limit IPs through Render's proxy)
   - `helmet`, `compression`
   - `cors` with an allowlist constructed from `ALLOWED_ORIGINS`,
     `FRONTEND_URL`, and dev-loopback regex
   - `express.json({ limit: '2mb' })`
   - **CSRF guard** on `/api` cookie-authed writes: unsafe methods with a
     `tesseract_session` cookie are rejected unless `Origin`/`Referer` is in
     the allowlist or a Bearer token is present
   - request logging in dev or when `ENABLE_REQUEST_LOGGING=true`
   - general API rate limit (500 req / 15 min / IP), stricter auth limit
     (50 / 15 min, skip successful)
   - Passport (`setupPassport`)
4. **Socket.io**: `initializeSocket(httpServer)` returns the `io` instance.
   `initializeAttendanceSocket(io)` registers the `/attendance` namespace.
   Game namespaces register themselves lazily via
   `registerGameNamespace()` when their modules are imported.
5. **Routes** mounted under `/api/<feature>` (see §3.2). Games are mounted by
   `mountGames(app)`.
6. **Health**: `/` info, `/health` (no DB ping), `/health/db` (2-second DB
   ping race), `/ping` (uptime bots).
7. **SEO root routes**: `/sitemap.xml`, `/robots.txt`, and the IndexNow key
   file at `/<INDEXNOW_KEY>.txt` are mounted at the root, not under `/api`.
8. **Init pipeline** (`initializeDatabase → hydrateRuntimeSecurityEnvFromSettings
   → populateAnnouncementSlugs → populateProfileSlugs`) then optional
   schedulers (when `ENABLE_BACKGROUND_SCHEDULERS=true`):
   - event-status sweep (`EVENT_STATUS_INTERVAL_MS`, default 30 min)
   - reminder scheduler (event reminders)
   - game-content scheduler (Puzzle Run / Brain Teasers daily,
     Cipher Lab 48 h rotation)
9. **Listen with retry**: up to 5 attempts on `EADDRINUSE` then exits.
10. **Graceful shutdown** on `SIGTERM`/`SIGINT`: stop schedulers, close `io`,
    close HTTP server, disconnect Prisma; hard exit after 28 s.

The `hydrateRuntimeSecurityEnvFromSettings` step pulls
`Settings.attendanceJwtSecret` and `Settings.indexNowKey` from the DB at
boot if those columns exist, so admins can rotate them through the admin
panel without a redeploy. Defensive `information_schema` and `P2022`
handling lets fresh installs boot before the migrations land.

### 3.2 Route Modules

`apps/api/src/routes/*` — 23 modules, all mounted under `/api/*` from
`index.ts`. The convention for new code:

- Validate input with **Zod**.
- Return through **`ApiResponse.success` / `ApiResponse.error`** (see
  `utils/response.ts`); avoid raw `res.json(...)`. Older routes still use
  raw responses — match the file's style when extending it.
- Wrap Prisma calls with **`withRetry`** from `lib/prisma.ts` for transient
  retry semantics.
- Call **`auditLog(...)`** for admin mutations; use the entity name that
  matches the resource (events use `event`, game admin uses `game_content`).
- Apply **`authMiddleware`** + **`requireRole('CORE_MEMBER' | 'ADMIN' | …)`**
  per endpoint; use `optionalAuthMiddleware` for endpoints that vary public
  vs authenticated.

Mounted modules and their dominant role gate:

| Mount                       | File                       | Notes                                                                                  |
|-----------------------------|----------------------------|----------------------------------------------------------------------------------------|
| `/api/auth`                 | `auth.ts`                  | `/providers`, `/google` + `/google/callback`, `/dev-login` (gated by `ENABLE_DEV_AUTH`), `/me`, `/exchange-code`, `/logout`. Authed by `authLimiter` |
| `/api/events`               | `events.ts`                | Public list + detail; `CORE_MEMBER` create/update/delete and per-event reg admin/export |
| `/api/registrations`        | `registrations.ts`         | User-scoped event registration                                                         |
| `/api/teams`                | `teams.ts`                 | Team registration (leader/invite-code based)                                           |
| `/api/announcements`        | `announcements.ts`         | Public list + detail, slug auto-populate on init                                       |
| `/api/polls`                | `polls.ts`                 | Public list + detail by `:idOrSlug`, USER vote + feedback, ADMIN CRUD + xlsx export    |
| `/api/team`                 | `team.ts`                  | Public team page + member profile by slug                                              |
| `/api/achievements`         | `achievements.ts`          | Public list + detail; admin CRUD                                                       |
| `/api/users`                | `users.ts`                 | Admin user mgmt, search, export                                                        |
| `/api/stats`                | `stats.ts`                 | Public site stats counters                                                              |
| `/api/settings`             | `settings.ts`              | Public read; admin update; super-admin/president for security env                      |
| `/api/hiring`               | `hiring.ts`                | Public `POST /apply`; admin list/detail/status/delete/export                           |
| `/api/certificates`         | `certificates.ts`          | Public verify + PDF download; admin issue/bulk/PDF/storage                             |
| `/api/signatories`          | `signatories.ts`           | Admin CRUD + signature image processing                                                |
| `/api/upload`               | `upload.ts`                | Cloudinary image upload (Multer + Sharp)                                               |
| `/api/network`              | `network.ts`               | Public + NETWORK-role + admin endpoints for network profiles                           |
| `/api/invitations`          | `invitations.ts`           | Event invitations accept/decline (matched by `recipientId` or `email`)                 |
| `/api/audit-logs`           | `audit.ts`                 | Admin-only audit log reader                                                            |
| `/api/mail`                 | `mail.ts`                  | Admin mail composer (sanitized via `sanitize-html`)                                    |
| `/api/credits`              | `credits.ts`               | Admin-managed user credits ledger                                                      |
| `/api/attendance`           | `attendance.ts`            | Largest route module — see §7.3                                                        |
| `/api/games/*`              | `games/*` (see §3.3)       | Mounted by `mountGames(app)`                                                           |
| `/api/indexnow`             | `routes/sitemap.ts`        | Admin-gated IndexNow submission helper                                                 |
| `/api/test-email`           | inline in `index.ts`       | Admin-only Brevo connectivity check                                                    |

`/sitemap.xml`, `/robots.txt`, and `/<key>.txt` (IndexNow verification file)
are mounted at the **root** for crawlers.

### 3.3 Games Subsystem

Path: `apps/api/src/games/`.

```
games/
├── index.ts           # Game interface + mountGames(app)
├── registry.ts        # ordered list of registered Games
├── catalog.ts         # public-facing GAME_CATALOG metadata (single source of truth)
├── router.ts          # /api/games, /api/games/:id, /api/games/leaderboard
├── README.md          # how to add a new game
├── lib/
│   ├── gameAuth.ts        # gameAuth, gamePublicAuth, gameAdminAuth
│   ├── gameSchemas.ts     # shared Zod schemas (room codes, etc.)
│   ├── roomStore.ts       # in-memory multiplayer state (no Redis)
│   ├── sessionRecorder.ts # recordGameSession / recordGameSessionsBatch
│   ├── socketNamespace.ts # registerGameNamespace() under /games/<id>
│   └── http.ts            # small response helpers
└── <game-id>/         # one folder per game (see below)
```

Each game implements the `Game` interface (`{ id, name, mountRouter(app) }`)
and adds itself to `registry.ts`. `mountGames(app)` wires
`/api/games` (catalog + leaderboard) and calls every game's
`mountRouter(app)`.

Per-game folders typically contain:

- `index.ts` — exports the `Game` and mounts player + admin routers at
  `/api/games/<id>` and `/api/admin/games/<id>`.
- `router.ts` — player-facing REST.
- `admin.ts` — admin content CRUD (uses `gameAdminAuth`).
- `socket.ts` — Socket.io handlers registered via `registerGameNamespace`.
- `state.ts` — in-memory state (`RoomStore` entries, types).
- `content.ts` / `seed.ts` — DB query helpers + seed data.
- `day.ts` (Puzzle Run, Brain Teasers) — daily-deck deterministic builder.
- `rotation.ts` (Cipher Lab) — 48-hour rotation logic.

Registered games (in `registry.ts` order):

`competition`, `smash-kart`, `type-wars`, `trivia-tower`, `puzzle-run`,
`brain-teasers`, `cipher-lab`, `riddle-room`, `scribbl`.

**Catalog metadata** lives in `apps/api/src/games/catalog.ts`. The
`GAME_CATALOG` array defines `id`, `title`, `description`, `category`,
`accent` color, `players`, `hot` flag, `backendReady`, and `rules[]`.
`GAME_BY_ID` exposes a `Map` lookup. The frontend `GamesPage`/`GameDetail`
fetch this through `/api/games` and `/api/games/:id`.

**Recording sessions**: every completed user run records a `GameSession`
row through `recordGameSession()` (or `…Batch()` for multi-user finishes).
`/api/games/leaderboard` aggregates this table:

- `?game=<id>` — per-game ranking by `MAX(score)`
- (omitted) — overall ranking by `SUM(score)` with per-user per-game
  `breakdown` map
- `?range=all|week|month`, `?limit=1..100` (default 25)

`catalog.ts` also seeds historical baseline counts via
`BASE_PLAYS_BY_GAME_ID` so a fresh DB still shows reasonable plays.

### 3.4 Attendance Socket

`apps/api/src/attendance/attendanceSocket.ts` registers the `/attendance`
namespace at boot. It serves the live event admin hub, scanner stream, and
real-time tile updates while scans happen. Scanner clients authenticate via
the standard JWT helper; clients per event are joined into a room and
broadcast scan/un-scan/edit/bulk events.

### 3.5 Logger, Response, Audit, Sanitize

- `utils/logger.ts` — structured logger with `requestLogger` middleware.
- `utils/response.ts` — `ApiResponse.success / error / badRequest /
  notFound / forbidden / internal` and a fixed `ErrorCodes` enum.
- `utils/audit.ts` — `auditLog({ actorId, entity, entityId, action,
  meta? })` writes `AuditLog` rows.
- `utils/sanitize.ts` — `sanitizeHtml` wrapper around `sanitize-html`. The
  allowed-tag list is the central place to widen/narrow HTML acceptance.

### 3.6 Schedulers

`apps/api/src/utils/scheduler.ts` exports:

- `startEventStatusScheduler` / `stopEventStatusScheduler` — updates
  `EventStatus` based on `startDate`/`endDate`.
- `startReminderScheduler` / `stopReminderScheduler` — event-day reminder
  emails (uses `reminderSentAt`).
- `startGameContentScheduler` / `stopGameContentScheduler` — ensures the
  Puzzle Run + Brain Teasers daily decks for today (00:00 Asia/Kolkata) and
  rotates Cipher Lab every 48 h.

All three are **opt-in** via `ENABLE_BACKGROUND_SCHEDULERS=true`. They are
off by default so a sleeping DB stays asleep.

---

## 4. Frontend Architecture

### 4.1 Providers + Routing

`apps/web/src/App.tsx` composes the app top-down:

```
QueryClientProvider
└── AuthProvider
    └── SettingsProvider
        └── ErrorBoundary
            └── Router (BrowserRouter)
                ├── ScrollToTop
                ├── Toaster (sonner)
                └── Routes
```

- **React Query** defaults: `staleTime = 5 min`, `gcTime = 30 min`,
  `retry: 1`, `refetchOnWindowFocus: false`.
- **All pages are lazy-imported** with a shared `<PageLoader />` fallback.
  Each route is wrapped via `wrap(<Component />)` which adds a per-route
  `ErrorBoundary + Suspense`.
- **Route guarding** is in `components/auth/`:
  `ProtectedRoute` (with `minRole`) and `SuperAdminOrPresidentRoute`.

### 4.2 Routes

Public:

- `/`, `/about`, `/events`, `/events/:id`
- `/announcements`, `/announcements/:id`
- `/team`, `/team/:slug`, `/members`, `/members/:slug`
- `/achievements`, `/achievements/:id`
- `/games`, `/games/:id`, `/leaderboard`
- `/signin`, `/signup` (alias), `/auth/callback`, `/onboarding`
- `/verify`, `/verify/:certId`
- `/privacy-policy`, `/join-us`
- `/polls/:slug`

Protected (USER):

- `/games/:id/play` — `GamePlayRouter` dispatches to per-game `*Play.tsx`
- `/dashboard` (DashboardLayout) with children:
  - `index`, `events`, `events/new`, `announcements`,
    `announcements/new`, `leaderboard`, `upload`, `profile`,
    `team/:id/edit`, `certificates`
  - **CORE_MEMBER** children: `attendance`, `events/:eventId/attendance`

Protected (ADMIN, also under DashboardLayout, mounted at `/admin`):

- `users`, `team`, `achievements`, `event-registrations`,
  `events/:id/edit`, `certificates`, `audit-log`, `mail`, `public-view`,
  `game-content`, `hiring`, `events/:eventId/attendance`
- **Super-admin / President** child: `settings`

A catch-all renders a Tesseract-styled 404.

### 4.3 Typed API Client

`apps/web/src/lib/api.ts` is the single boundary the UI uses to talk to the
backend (~2.5k LOC). Key elements:

- `API_BASE_URL` comes from `VITE_API_URL` and defaults to
  `http://localhost:5001/api`. `SOCKET_URL` is the same host with `/api`
  stripped.
- `UnauthorizedError` is thrown on any 401 so the auth context can
  auto-logout.
- `request<T>` / `requestEnvelope<T>` / `requestBlob` handle JSON-content
  headers, cookie + bearer auth, envelope unwrapping (`{ success, data }`),
  retry on 401 with cookie-only, and blob exports.
- The exported `api` object groups methods by feature (Auth, Events,
  Registrations, Announcements, Polls, Team, Achievements, Credits, Games
  leaderboard, Stats, Users (Admin), Settings, Mail, Hiring, Profile,
  Network public/authed/admin, Audit Logs, Signatories, Upload,
  Certificates, …). When adding endpoints, **extend this client** rather
  than inlining `fetch`.

### 4.4 Components, Context, Hooks

- `context/AuthContext.tsx` — current user, token, login/logout, exchange,
  pinned to the `requestEnvelope` retry-cookie flow.
- `context/SettingsContext.tsx` — site settings, feature toggles.
- `context/SocketContext.tsx` — Socket.io client lifecycle.
- `hooks/useHomePageData.ts`, `useMotionConfig.ts`, `useOfflineScanner.ts`.
- `components/ErrorBoundary.tsx`, `SEO.tsx`, plus feature-scoped folders:
  `attendance/`, `auth/`, `dashboard/`, `events/`, `home/`, `layout/`,
  `media/`, `polls/`, `teams/`, `tesseract/` (bracketed visual primitives),
  `theme/`, `ui/` (shadcn-style primitives).

### 4.5 Visual Systems

Two parallel styling layers coexist:

- **Tesseract bracketed system** — `lb-*` classes, scanlines, mono accents,
  used on public pages and game shells. CSS lives in `index.css`.
- **Tailwind + shadcn-style** — used in admin pages and most modern
  forms / dialogs (`tailwind-merge`, `class-variance-authority`, Radix
  primitives, `lucide-react`).

When adding light-mode styles, **always** pair with `dark:` variants (see
the most recent remediation commits — light-mode-only colors were a recent
defect class).

### 4.6 Per-game Play Pages

`apps/web/src/pages/games/`:

- `GamePlayRouter.tsx` dispatches `/games/:id/play` to the right component.
- `PlayShell.tsx` is the shared scaffolding (auth gate, layout).
- Per-game: `TypeWarsPlay`, `TriviaTowerPlay`, `PuzzleRunPlay`,
  `BrainTeasersPlay`, `CipherLabPlay`, `RiddleRoomPlay`, `ScribblPlay`,
  `SmashKartPlay`.

Each play page connects to its game's REST endpoints (always through
`api.*`) and, where applicable, to its `/games/<id>` socket namespace using
the `SocketContext`.

### 4.7 Admin Game Content

`pages/admin/AdminGameContent.tsx` is the umbrella tabbed UI hosting:

- `gameContent/ContentTable.tsx` — shared list/search/sort/paginate.
- `gameContent/ContentEditor.tsx` — shared modal editor.
- Per-game admin panels: `TypeWarsAdmin`, `TriviaTowerAdmin`,
  `PuzzleRunAdmin`, `BrainTeasersAdmin`, `CipherLabAdmin`,
  `RiddleRoomAdmin`, `ScribblAdmin`.

All admin reads/writes go through `api.*` methods backed by
`/api/admin/games/<id>/*`.

---

## 5. Database Schema

Schema lives at `prisma/schema.prisma` (1.4k LOC). **52 models, 25 enums,
63 migrations** at the time of writing. Migrations are timestamped under
`prisma/migrations/`. The most recent migrations relevant to current work:

- `20260510191153_add_game_sessions` — shared leaderboard table.
- `20260511000000_games_platform_v2_and_qotd_drop` — modular games schema,
  legacy QOTD removal.
- `20260511120000_games_platform_v2_integrity` — uniqueness + FK hardening.

Model groupings:

**Identity / config**
- `User`, `Settings`, `AuditLog`

**Events + attendance**
- `Event`, `EventRegistration`, `EventInvitation`, `DayAttendance`,
  `EventTeam`, `EventTeamMember`

**Competition (event-integrated game)**
- `CompetitionRound`, `CompetitionSubmission`, `CompetitionAutoSave`

**Shared games**
- `GameSession`

**Type Wars**
- `TypeWarsPassage`, `TypeWarsRace`, `TypeWarsParticipant`

**Trivia Tower**
- `TriviaQuestion`, `TriviaTowerRun`, `TriviaAnswer`

**Puzzle Run**
- `PuzzleRunPuzzle`, `PuzzleRunDay`, `PuzzleRunDayPuzzle`, `PuzzleRunAttempt`

**Brain Teasers**
- `BrainTeaser`, `BrainTeaserDay`, `BrainTeaserDayEntry`, `BrainTeaserAttempt`

**Cipher Lab**
- `CipherChallenge`, `CipherAttempt`

**Riddle Room**
- `RiddleClue`, `RiddleBundle`, `RiddleBundleClue`, `RiddleRoom`,
  `RiddleRoomMember`, `RiddleAttempt`

**Scribbl**
- `ScribblPrompt`, `ScribblRoom`, `ScribblRound`, `ScribblGuess`

**Content + engagement**
- `Announcement`, `Poll`, `PollOption`, `PollVote`, `PollVoteSelection`,
  `PollFeedback`, `HiringApplication`

**People + recognition**
- `TeamMember`, `Achievement`, `Credit`, `NetworkProfile`

**Certificates**
- `Signatory`, `Certificate`

Key conventions:

- Enums for `Role`, `UserLevel`, `EventStatus`, `RegistrationType`,
  `InvitationStatus`, `AnnouncementPriority`, `ApplyingRole`,
  `ApplicationStatus`, `CompetitionStatus`, `CompetitionParticipantScope`,
  `NetworkConnectionType`, `NetworkStatus`, `CertType`, and one
  difficulty + status enum per game.
- The Prisma client is generated to the default location; **import from
  `'@prisma/client'`** (never from a custom output path).
- `prisma.$queryRaw` is used for `information_schema` introspection at boot
  (security env hydration) — keep this defensive (P2022 fallback).

---

## 6. Authentication + Authorization

### 6.1 JWT + Cookies

- **Algorithm**: `HS256`; secret comes from `JWT_SECRET` via
  `getJwtSecret()`.
- **Lifetime**: long-lived access tokens (7 d) — see the security note in
  §13. There is no refresh-token flow today; `/me` re-issues opportunistically.
- **Transport**: either `Authorization: Bearer <token>` or the
  `tesseract_session` HttpOnly cookie. Both are accepted on every authed
  endpoint.
- **Attendance tokens**: `purpose: 'attendance'` JWTs (signed with
  `ATTENDANCE_JWT_SECRET` or fallback to the main secret via runtime hydrate)
  are *explicitly rejected* by `authMiddleware`. They only authorize scan
  endpoints, not regular API auth.

### 6.2 Middleware

- `authMiddleware` (required) and `optionalAuthMiddleware` (best-effort)
  in `middleware/auth.ts`.
- `requireRole(minRole)` in `middleware/role.ts`.
- `requireFeature('attendance' | …)` in `middleware/featureFlag.ts` reads
  toggles from `Settings`.

Role hierarchy (numeric levels):

```
PUBLIC = 0
USER, NETWORK = 1
MEMBER = 2
CORE_MEMBER = 3
ADMIN, PRESIDENT = 4
```

Unknown role strings are treated as `PUBLIC` and logged. PRESIDENT shares
the admin level but the settings panel is additionally gated by
`SuperAdminOrPresidentRoute` on the frontend and by env-derived super-admin
identity checks on the backend.

### 6.3 Games Auth Helpers

Imports from `apps/api/src/games/lib/gameAuth.ts`:

- `gameAuth` — required user, used on player REST endpoints.
- `gamePublicAuth` — optional user, used on read-only public game data.
- `gameAdminAuth` — `requireRole('ADMIN')` + audit-friendly request shape.

Sockets that join a game namespace authenticate via
`registerGameNamespace()` → reads the same JWT and sets
`socket.data.authUser`. **Always** read identity from `socket.data.authUser`;
never trust user data on event payloads.

### 6.4 CSRF Guard

`/api` mutating requests with a `tesseract_session` cookie but no Bearer
token must come from an allowed origin (Origin or Referer fallback).
Otherwise the request is rejected with `FORBIDDEN`. This is in
`apps/api/src/index.ts` before route mounting.

---

## 7. Feature + Screen Flows

### 7.1 Auth + Onboarding

- `/api/auth/providers` → which IdPs are enabled.
- `/api/auth/google` → starts Google OAuth (Passport). `/google/callback`
  finishes and redirects with a short-lived auth code.
- `/api/auth/dev-login` (only when `ENABLE_DEV_AUTH=true`) — passwordless
  login for local QA.
- `/api/auth/exchange-code` swaps the auth code for `{ token, intent,
  network_type? }`. The frontend `/auth/callback` handles the redirect.
- `/api/auth/me` returns the current user, opportunistically rotating the
  token; the SPA falls back to cookie auth on a stale Bearer.
- `/api/auth/logout` clears the cookie.

`/onboarding` finishes the profile completion for `profileCompleted=false`
users.

### 7.2 Events + Registrations + Teams

- Public: `GET /api/events`, `GET /api/events/upcoming`,
  `GET /api/events/:id`. Detail page wires registration, teams, attendance,
  and competition.
- CORE_MEMBER: `POST /api/events`, `PUT /api/events/:id`,
  `DELETE /api/events/:id`, `GET /api/events/:id/registrations`,
  `DELETE …/registrations/:registrationId`, `GET …/registrations/export`.
- User registration goes through `/api/registrations/events/:eventId`.
- Team registration is in `/api/teams/*` (16 endpoints) — invite codes
  visible only to leaders.

### 7.3 Attendance

`apps/api/src/routes/attendance.ts` is the largest module (~29 endpoints):

- **User**: `GET /my-qr/:eventId`, `GET /my-history`.
- **CORE_MEMBER**: `POST /scan`, `POST /scan-batch`, `POST /manual-checkin`,
  `PATCH /unmark`, `PATCH /bulk-update`, `PATCH /edit/:registrationId`,
  `GET /search`, `GET /live/:eventId`, `GET /event/:eventId/full`,
  `GET /event/:eventId/export`.
- **ADMIN**: `POST /regenerate-token/:registrationId`,
  `POST /regenerate-tokens/event/:eventId`,
  `POST /email-absentees/:eventId`,
  `GET /event/:eventId/certificate-recipients`,
  `POST /backfill-tokens`.
- **Public**: `POST /scan-beacon` (rate-limited beacon endpoint),
  `GET /event/:eventId/summary`.

The `/attendance` socket namespace pairs with these for live updates on
`/admin/events/:eventId/attendance` (and the CORE_MEMBER equivalent under
`/dashboard`).

### 7.4 Polls

- Public list/detail: `GET /api/polls`, `GET /api/polls/:idOrSlug`.
- User: `POST /api/polls/:idOrSlug/vote`, `POST …/feedback`.
- Admin: CRUD + `GET /api/polls/admin/public-view` and per-poll xlsx
  export at `/api/polls/:id/admin/export.xlsx`.
- Frontend public detail at `/polls/:slug` (lazy `PollDetailPage`).

### 7.5 Hiring

- Public: `POST /api/hiring/apply`.
- Admin: list, detail, status patch, delete, stats, export, plus the SPA
  panel at `/admin/hiring`.
- User self-view: `GET /api/hiring/my-application`.

### 7.6 Certificates

- Public verify: `GET /api/certificates/verify/:certId` returns recipient
  name + event + signatory; `GET /verify/:certId/download` returns the PDF
  (rate-limited).
- Admin: issue / bulk-issue / preview / regenerate; PDF rendered via
  `@react-pdf/renderer`, uploaded to Cloudinary, signature images pre-processed
  through `sharp`.

### 7.7 Games

All game player REST endpoints are mounted under `/api/games/<id>` and
all admin content endpoints under `/api/admin/games/<id>`.

**Catalog + leaderboard** (`apps/api/src/games/router.ts`):
- `GET /api/games`
- `GET /api/games/:id`
- `GET /api/games/leaderboard?game=&range=&limit=`

**Type Wars** — `apps/api/src/games/type-wars/`
- REST: `POST /rooms`, `POST /rooms/:code/join`, `GET /rooms/:code`,
  `GET /leaderboard`
- Socket `/games/type-wars`: `room:join`, `room:ready`, `room:start`,
  `race:countdown`, `race:start`, `progress:update`, `progress:tick`,
  `progress:finish`, `race:results`
- Admin: `/api/admin/games/type-wars/passages` (+ `/bulk`, `/:id`)

**Trivia Tower** — `apps/api/src/games/trivia-tower/`
- REST: `POST /rooms`, `POST /rooms/:code/join`, `GET /rooms/:code`
- Socket `/games/trivia-tower`: `room:join`, `room:start`,
  `question:show`, `answer:submit`, `answer:result`, `floor:summary`,
  `tower:results`
- Admin: `/api/admin/games/trivia-tower/questions` (+ `/bulk`, `/:id`)

**Puzzle Run** — `apps/api/src/games/puzzle-run/`
- REST: `GET /today`, `POST /puzzle/:puzzleId/attempt`, `POST /complete`
- Scheduler: daily deck at 00:00 Asia/Kolkata (game-content scheduler)
- Admin: `/puzzles` CRUD, `/days/today`, `/days/today/regenerate`

**Brain Teasers** — `apps/api/src/games/brain-teasers/`
- REST: `GET /today`, `POST /:teaserId/submit`
- Scheduler: daily set at 00:00 Asia/Kolkata
- Admin: `/teasers` CRUD, `/days/today`, `/days/today/regenerate`

**Cipher Lab** — `apps/api/src/games/cipher-lab/`
- REST: `GET /active`, `POST /start`, `POST /hint`, `POST /submit`
- Scheduler: 48-hour rotation
- Admin: `/challenges` CRUD, `/preview`

**Riddle Room** — `apps/api/src/games/riddle-room/`
- REST: `POST /rooms`, `POST /rooms/:code/join`, `GET /rooms/:code`
- Socket `/games/riddle-room`: `room:join`, `room:start`, `clue:show`,
  `clue:submit`, `clue:wrong`, `clue:hint`, `clue:solved`,
  `room:complete`, `chat:message`
- Admin: `/clues` + `/bundles` CRUD

**Scribbl** — `apps/api/src/games/scribbl/`
- REST: `POST /rooms`, `POST /rooms/:code/join`, `GET /rooms/:code`
- Socket `/games/scribbl`: `room:join`, `room:start`, `round:prompt`,
  `round:start`, `canvas:stroke`, `canvas:clear`, `guess:submit`,
  `guess:close`, `guess:correct`, `guess:message`, `round:end`, `game:end`
- Admin: `/prompts` CRUD + `/bulk`

**Competition** — `apps/api/src/games/competition/index.ts` (delegates to
`routes/competition.ts` for the 27 round/submission/judging endpoints).
Event-integrated; `recoverActiveRounds()` runs on boot to re-arm
in-flight rounds.

**Smash Kart** — `apps/api/src/games/smash-kart/index.ts`
- `GET /health`, `POST /session` (records GameSession), `GET /leaderboard`.
- No socket namespace; gameplay is local + results posted at the end.

---

## 8. Data Flow Patterns

- **Events / registrations / teams / competition** use `prisma.$transaction`
  for race-sensitive writes (registration capacity, team-member joins,
  competition state machine).
- **Games REST handlers** follow:
  1. Validate request with **Zod** (`gameSchemas.ts` for shared shapes).
  2. Authenticate with the right `gameAuth*` middleware.
  3. Wrap Prisma calls with **`withRetry`** for transient retry.
  4. Keep multiplayer room state in **`RoomStore`** (no Redis / queue).
  5. Never broadcast answers, prompts, or other secrets to unauthorized
     sockets.
  6. Record a `GameSession` row on completion (once per user per run).
  7. Surface ranking through the shared `/api/games/leaderboard`.
- **Admin mutations** call `auditLog({ entity, action, … })`. Game admin
  audit entries use `entity: 'game_content'`.

---

## 9. Important Files

**Backend**
- `apps/api/src/index.ts` — bootstrap, middleware, mounting.
- `apps/api/src/middleware/auth.ts`, `middleware/role.ts`,
  `middleware/featureFlag.ts`.
- `apps/api/src/lib/prisma.ts` — Prisma client + `withRetry`.
- `apps/api/src/utils/response.ts`, `audit.ts`, `sanitize.ts`,
  `logger.ts`, `scheduler.ts`, `socket.ts`, `socketAuth.ts`, `jwt.ts`,
  `attendanceToken.ts`, `email.ts`, `init.ts`.
- `apps/api/src/games/index.ts`, `registry.ts`, `catalog.ts`, `router.ts`,
  `README.md`.
- `apps/api/src/games/lib/{gameAuth,gameSchemas,roomStore,sessionRecorder,
  socketNamespace,http}.ts`.
- Per-game folders under `apps/api/src/games/<id>/`.
- `apps/api/src/attendance/attendanceSocket.ts`.

**Frontend**
- `apps/web/src/App.tsx` — routes, providers, lazy + boundary wrapping.
- `apps/web/src/lib/api.ts` — typed API client.
- `apps/web/src/context/{Auth,Settings,Socket}Context.tsx`.
- `apps/web/src/pages/GamesPage.tsx`, `GameDetailPage.tsx`,
  `LeaderboardPage.tsx`, `PollDetailPage.tsx`.
- `apps/web/src/pages/games/GamePlayRouter.tsx`, `PlayShell.tsx`,
  `*Play.tsx`.
- `apps/web/src/pages/dashboard/DashboardLeaderboard.tsx` and the
  dashboard suite.
- `apps/web/src/pages/admin/AdminGameContent.tsx` and
  `pages/admin/gameContent/*`.

**Database**
- `prisma/schema.prisma`, `prisma/seed.ts`.
- `prisma/migrations/20260510191153_add_game_sessions/`,
  `prisma/migrations/20260511000000_games_platform_v2_and_qotd_drop/`,
  `prisma/migrations/20260511120000_games_platform_v2_integrity/`.

**Infrastructure**
- `render.yaml`, `start-production.sh`, `playwright.config.ts`,
  `e2e/api-smoke.spec.ts`, `e2e/web-smoke.spec.ts`,
  `scripts/free-dev-ports.sh`, `scripts/migrate-deploy.sh`,
  `scripts/fix-dark-mode.sh`.

**Historical / audit context** (read-only)
- `audit/SUMMARY.md`, `audit/THEMES.md`, `audit/00_inventory.md`
  through `audit/10_testing.md`, `audit/nits.md`.
- `BACKEND_AUDIT.md`, `DESIGN_SYSTEM.md`, `MIGRATION_NOTES.md`,
  `POLISH_AUDIT.md`.

---

## 10. Environment Variables

Template: [apps/api/.env.example](apps/api/.env.example).

**Database**
- `DATABASE_URL`, `DIRECT_URL`

**Server**
- `PORT` (default 5001), `NODE_ENV`

**Auth**
- `JWT_SECRET` (required, fail-fast if missing/insecure)
- `ATTENDANCE_JWT_SECRET`, `ATTENDANCE_TOKEN_EXPIRES_IN` (default 8h)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `ENABLE_DEV_AUTH` (gates `/auth/dev-login`)

**Origins**
- `FRONTEND_URL`, `BACKEND_URL`, `ALLOWED_ORIGINS` (comma-separated),
  `COOKIE_DOMAIN`

**Admin bootstrap**
- `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_NAME`, `SEED_ADMIN_EMAIL`

**Email (Brevo)**
- `BREVO_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `EMAIL_REPLY_TO`
- `INVITE_LINK_WH` — optional WhatsApp invite URL appended to verified-user
  welcome email.

**Cloudinary**
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

**SEO**
- `INDEXNOW_KEY`

**Schedulers + DB**
- `ENABLE_BACKGROUND_SCHEDULERS` (default off)
- `EVENT_STATUS_INTERVAL_MS` (default 30 min)
- `ENABLE_DB_KEEPALIVE`, `DB_KEEPALIVE_INTERVAL_MS` (default 4 min)

**Sockets + logging**
- `SOCKET_PING_TIMEOUT_MS`, `SOCKET_PING_INTERVAL_MS`
- `ENABLE_REQUEST_LOGGING`

**Public URL helpers**
- `API_BASE_URL`, `PUBLIC_API_BASE_URL`, `RENDER_EXTERNAL_URL`

**Frontend (`apps/web`)**
- `VITE_API_URL` — must include `/api`.

`render.yaml` documents which of these the production deployment expects.

---

## 11. Build, Run, and Deployment

### 11.1 Local development

```bash
npm install            # install root + workspaces
npm run db:migrate     # apply migrations
npm run db:seed        # idempotent seed
npm run dev            # runs api + web concurrently (port 5001 + 5173)
```

`scripts/free-dev-ports.sh` is run before `npm run dev` to kill stale
listeners on the dev ports.

### 11.2 Workspace scripts

- API: `npm run dev|build|start --workspace=apps/api`
- Web: `npm run dev|build|preview --workspace=apps/web`
  - Web `preview` is **dev-mode only**; do **not** use as a prod server.
- Database: `npx prisma generate|validate|migrate status|db seed`.
- E2E: `npm run test:e2e[:headed|:ui]` (Playwright; see
  `playwright.config.ts`).
- Stability tests: `npm run test:stability` runs the small node:test suite
  against `apps/api/src/utils/*.test.ts` and `apps/web/tests/*.test.ts`.

### 11.3 Production

- **API**: Render web service. Build:
  `npm install --include=dev && npx prisma generate && npm run build
  --workspace=apps/api`. Start:
  `npx prisma migrate deploy && npm run start --workspace=apps/api`.
  Health: `/ping`. Memory cap: `--max-old-space-size=400`.
- **Web**: Render static site. Build:
  `npm install && npm run build --workspace=apps/web`, publish
  `apps/web/dist`. SPA rewrite + immutable `/assets/*` cache headers.
- **`start-production.sh`** is the legacy local-prod entrypoint: it
  validates env, builds, and execs the API workspace start command. It
  intentionally does **not** run `vite preview` — the SPA must be served
  by a static host (Render's static site, Nginx, or a CDN).

---

## 12. Conventions and Hidden Assumptions

- **ESM with `.js` import suffixes** in TypeScript sources (e.g.
  `import { foo } from './foo.js'`). The TS config is NodeNext; the build
  emits to `apps/api/dist/`.
- **`ApiResponse` over raw `res.json`** for new code. Match the file you
  edit when extending older routes.
- **Zod everywhere** for request validation.
- **`withRetry` for Prisma** route queries to survive transient connection
  failures (Neon cold starts).
- **`auditLog(...)` for admin mutations** with stable entity names; game
  admin uses `entity: 'game_content'`.
- **Sockets**: identity comes from `socket.data.authUser`. Never trust
  user data in event payloads.
- **Multiplayer state** is in-memory via `RoomStore`. No Redis / queue.
  Survives a single process; not horizontally scalable yet.
- **Dark mode**: every Tailwind color class must pair with `dark:` — recent
  remediation specifically addressed light-only colors.
- **Light + dark visual systems** coexist; pick the matching system for the
  page you're touching (bracketed for public pages, Tailwind/shadcn for
  admin).
- **Secrets**: never include answers/prompts/clue solutions in list
  responses or socket broadcasts to unauthorized members.
- **Leaderboard**: record one `GameSession` per completed user run; the
  catalog applies a `BASE_PLAYS_BY_GAME_ID` baseline for display.
- **Slugs**: `Announcement` and `NetworkProfile` slugs are auto-populated
  at boot by `populateAnnouncementSlugs` / `populateProfileSlugs`.
- **CSRF**: cookie-authed writes from disallowed origins are blocked at
  `/api`; Bearer-token writes bypass this check.

---

## 13. Known Risks + Audit Context

The current branch (`audit/forensic-pass-1`) carries deliverables from a
forensic audit (`audit/` directory) and ongoing remediation commits. Read
`audit/SUMMARY.md` and `audit/THEMES.md` before working on auth-sensitive
or game-integrity code. Active concerns to keep in mind:

1. **JWT lifecycle** — 7-day access tokens, no revocation, no rotation.
   Logout clears the cookie only.
2. **Function-level authorization without ownership scope** — several
   admin endpoints (~14 documented) lack per-event ownership checks; any
   admin can act across all events. Avoid widening this surface without
   adding ownership middleware.
3. **Game integrity** — in-memory state in Scribbl / Trivia Tower /
   Type Wars has weak reconstruction semantics; Type Wars trusts
   client-supplied `durationMs` / `correctChars`. The
   remediation commits `a6a8b29b` and `173cfec1` address several of
   these; check them before extending game scoring.
4. **NULL-distinct uniques** — `EventInvitation`, `Certificate`, and
   `CompetitionSubmission` have NULL-distinct uniqueness traps.
5. **Case-sensitive `User.email @unique`** vs case-insensitive lookups —
   can let duplicate accounts in.
6. **Public certificate verification** returns recipient name + event +
   signatory; rate limit is enumerable.
7. **Settings.attendanceJwtSecret / indexNowKey** are plaintext in the DB.
   Hydration is defensive but admin write-access to those columns is
   sensitive.

The `audit/` folder is the source of truth for the full list (700+
findings, severity-tagged F-001 … F-1010). Do not delete or rewrite it; it
is reference history for remediation work.

---

## 14. Safe Extension Guide

Before declaring a change done:

1. **Mount + route + client**: when adding an endpoint, update all three
   together — mount in `index.ts`, register in the route module, expose a
   method on `apps/web/src/lib/api.ts`. Add a frontend route in `App.tsx`
   if the endpoint backs a new page.
2. **Auth match**: pick `authMiddleware` + `requireRole` (or
   `gameAuth*` for games) consistent with neighbors.
3. **Race-safe writes**: wrap multi-row updates in `prisma.$transaction`;
   guard registration/team/competition state transitions.
4. **Games isolation**: per-game logic stays in
   `apps/api/src/games/<id>/`. Don't reach across games. If you need
   shared behavior, lift it into `games/lib/`.
5. **Lazy frontend**: play pages and admin pages remain `lazy(...)`.
6. **No secret leakage**: never broadcast answers / prompts / signatures /
   tokens to unauthorized clients.
7. **One session per finish**: record exactly one `GameSession` row per
   completed user run, even in multi-finish flows.
8. **Sanity check pre-commit**:
   - `npm run build` (both workspaces)
   - `npx prisma validate`
   - `npx prisma migrate status`
   - `npm run test:stability`
   - `npm run lint --workspace=apps/api` and `--workspace=apps/web`

---

## 15. Open Work Queue

This is a living section — add items here when you start them, remove when
shipped. As of this writing:

- **Auth ownership scoping** (audit theme): add a
  `requireOwnership(model, paramName, ownershipField)` middleware and apply
  to the documented endpoints in `audit/THEMES.md`.
- **Token lifecycle hardening**: short-lived access + refresh-token flow,
  `User.tokenVersion`, `jti` revocation.
- **Game scoring server-authority**: continue what `a6a8b29b` started for
  Type Wars and extend to Smash Kart / Trivia Tower reconstruction.
- **Schema hardening**: case-insensitive email, plaintext settings columns,
  NULL-distinct uniqueness traps.
- **Authorization + concurrency tests**: there are very few authz tests
  today; the test floor is the gate for the above changes.

No queued games-platform feature requests live in this file; new features
should arrive as specific product or polish requests with their own
acceptance criteria.
