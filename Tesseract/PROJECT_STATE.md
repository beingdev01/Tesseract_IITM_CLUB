# Tesseract — Project State Document

> **Purpose**: Single source of truth for any AI assistant continuing work on this project.
> Generated: 2026-04-30. Update this file whenever a significant milestone is completed.

---

## What is Tesseract?

A closed-community platform for **IITM BS (IIT Madras Bachelor of Science)** students. Access is restricted to `@ds.study.iitm.ac.in` and `@es.study.iitm.ac.in` email domains only. Features: mini-games, multiplayer lobbies, event RSVPs (movie nights, tournaments, play nights), an XP/leaderboard system, badges, and a members directory.

Tagline: **"Play. Pause. Belong."**

---

## Repository Layout

```
Tesseract/
├── src/                        ← Next.js 14 App Router frontend
│   ├── app/                    ← Pages (all "use client")
│   │   ├── page.tsx            ← Landing page (public)
│   │   ├── auth/page.tsx       ← 3-step OTP auth flow
│   │   ├── dashboard/page.tsx  ← Member home
│   │   ├── games/
│   │   │   ├── page.tsx        ← Game catalog with category filter
│   │   │   └── [id]/page.tsx   ← Game detail (rules, leaderboard, CTA)
│   │   ├── events/
│   │   │   ├── page.tsx        ← Event list + featured event
│   │   │   └── [id]/page.tsx   ← Event detail (RSVP, rules, similar)
│   │   ├── leaderboard/page.tsx
│   │   ├── members/page.tsx    ← Member directory (batch + role filter)
│   │   ├── profile/page.tsx
│   │   ├── admin/page.tsx
│   │   ├── layout.tsx          ← Root layout + font injection
│   │   └── globals.css         ← ENTIRE design system (~1944 lines)
│   ├── components/
│   │   ├── tesseract/          ← THE active design system components
│   │   │   ├── TesseractNav.tsx    ← Shared nav (logo, 6 links, CTA slot)
│   │   │   ├── TesseractFooter.tsx ← Shared footer (per-page telemetry strip)
│   │   │   ├── TesseractHero.tsx   ← 4D hypercube canvas animation
│   │   │   └── Brackets.tsx        ← Corner-ornament panel wrapper
│   │   ├── providers/
│   │   │   └── AppProviders.tsx    ← Zustand + toast providers
│   │   ├── layout/             ← OLD layout components (unused in new design)
│   │   ├── landing/            ← OLD landing components (unused)
│   │   ├── ui/                 ← Generic UI primitives (Button, Card, etc.)
│   │   ├── admin/, auth/, dashboard/, events/, games/,
│   │   │   leaderboard/, profile/  ← OLD view components (unused/legacy)
│   ├── data/
│   │   ├── games.ts            ← Shared static game data (8 games, full detail)
│   │   └── events.ts           ← Shared static event data (5 events, full detail)
│   ├── store/
│   │   ├── authStore.ts        ← Zustand auth store (OTP flow, token, user)
│   │   └── uiStore.ts
│   ├── lib/
│   │   ├── types.ts            ← Shared TypeScript types for API models
│   │   ├── api/
│   │   │   ├── client.ts       ← Axios instance (JWT interceptor, auto-refresh)
│   │   │   └── services.ts     ← All API call functions (auth, games, events…)
│   │   ├── auth-storage.ts     ← localStorage token helpers
│   │   └── utils.ts
│   └── hooks/
│       ├── useApi.ts
│       └── useRole.ts
├── backend/                    ← TypeScript/NestJS backend (separate process)
│   ├── src/
│   │   ├── main.ts             ← Nest bootstrap, CORS, `/api/v1`, cookies
│   │   ├── app.module.ts       ← Controllers, services, global guards/filters
│   │   ├── common/             ← Envelope, errors, guards, cache, decorators
│   │   ├── auth/               ← OTP, JWT access, refresh rotation
│   │   ├── users/              ← Me/profile updates and public profiles
│   │   ├── members/            ← Membership request flow and directory
│   │   ├── events/             ← Events CRUD, RSVP, participants
│   │   ├── games/              ← Game catalog plus Phase 2 score hooks
│   │   ├── leaderboard/        ← Phase 1 gated leaderboard stubs
│   │   ├── activity/           ← Activity feed and notifications
│   │   ├── features/           ← Feature flags and user overrides
│   │   ├── dashboard/          ← Naive dashboard/public stats
│   │   └── admin/              ← Admin users, memberships, events, flags, audit
│   ├── prisma/                 ← Prisma schema, migration, seed
│   ├── test/                   ← Jest tests
│   ├── package.json
│   └── Dockerfile
└── public/
    └── logo.png                ← Tesseract logo (used in nav + footer)
```

---

## Design System — Direction B: Geometric Arcade Terminal

This is the **only active** design. The old Direction A components in `src/components/layout/`, `src/components/landing/`, etc., are **legacy/unused** — all new work uses Direction B exclusively.

### Visual identity
- **Background**: `#050505` (near-black)
- **Foreground**: `#ebebe8` (warm white)
- **Gold accent**: `#ffd93b` — primary CTA color, bracket ornaments, telemetry values
- **Logo gradient**: red→orange→yellow→green→blue→purple (`--grad-logo`)
- **Per-color theming**: `.lb-c-red`, `.lb-c-yellow`, `.lb-c-green`, `.lb-c-blue`, `.lb-c-purple`, `.lb-c-orange` — each sets `--acc` and `--acc-glow` CSS vars
- **Scanlines + grid**: always-present ambient overlays (`.lb-scanlines`, `.lb-grid-bg`)
- **Clip-paths**: `polygon(0 0, calc(100% - 8px) 0, 100% 8px, ...)` chamfered corners on buttons and chips
- **Bracket ornaments**: `.lb-bracket` with gold `lb-c-tl/tr/bl/br` corner divs and a floating tag label

### Fonts (loaded via `next/font/google`, injected as CSS vars)
| Variable | Font | Used for |
|---|---|---|
| `--font-audiowide` | Audiowide 400 | Headlines, wordmark, module titles |
| `--font-jetbrains` | JetBrains Mono | Body mono, `.lb-root` default |
| `--font-inter` | Inter | Descriptions, sub-copy |
| `--font-orbitron` | Orbitron | Fallback display font |

### Core CSS classes (all in `globals.css`)
| Class | Purpose |
|---|---|
| `.lb-root` | Page root — dark bg, JetBrains Mono, `overflow-x: hidden` |
| `.lb-nav` | Top nav bar |
| `.lb-btn-primary` | Gold chamfered button with shimmer on hover |
| `.lb-btn-ghost` | Transparent border button |
| `.lb-bracket` | Corner-ornament panel wrapper |
| `.lb-bracket-tag` | Floating label on bracket top-left |
| `.lb-headline` | 84px Audiowide headline |
| `.lb-h-accent` | Gradient text (uses `--grad-logo`) |
| `.lb-kicker` | 11px gold monospace label |
| `.lb-section-head` | Section header strip (kicker + title + right label) |
| `.lb-telemetry` | 2-col data grid |
| `.lb-board-row` | Leaderboard row with left color accent |
| `.dash-act-row` | Activity feed row (3 columns: time/game/text) |
| `.dash-badge` | Badge chip with diamond glyph |
| `.dash-mini-row` | Mini leaderboard row |
| `.gd-*` | Game detail page classes |
| `.evd-*` | Event detail page classes |
| `.member-*` | Members directory classes |
| `.tf-*` | TesseractFooter classes |

### Animations
| Keyframe | Used for |
|---|---|
| `pulse` | Status dots, blinking pulses |
| `spin` | Hero conic gradient ring (20s) |
| `spinReverse` | Inner ring counter-rotation (30s) |
| `blink` | Hero boot label |
| `slideUp` | Hero headline lines (staggered 0.1/0.25/0.4s) |
| `fadeIn` | Hero right panel, sub-copy, telemetry |
| `shimmer` | `.lb-btn-primary` hover sheen |

---

## Pages — Current Status

All pages are static (no backend calls yet). All use `"use client"`.

| Route | Status | Notes |
|---|---|---|
| `/` | ✅ Done | Landing: 4D hero (size=520), dual rings, entrance anims, modules, leaderboard preview, OTP join form |
| `/auth` | ✅ Done | 3-step state machine: email → OTP cells → profile form. Left panel has `TesseractHero` size=360 |
| `/dashboard` | ✅ Done | Continue playing cards, recs, activity feed, event card, mini-leaderboard, badges |
| `/games` | ✅ Done | Category filter (`useState`), 8 game cards. PLAY links to `/games/[slug]` |
| `/games/[id]` | ✅ Done | Hero band, how-to-play rules, top plays, per-game leaderboard, CTA card |
| `/events` | ✅ Done | Featured event bracket, upcoming list. Row RSVP links to `/events/[slug]` |
| `/events/[id]` | ✅ Done | Feature panel, full desc + optional rules, RSVP stack, similar events, calendar buttons |
| `/leaderboard` | ✅ Done | Game filter buttons, top-3 podium, ranks 4–12 table, "your position" strip |
| `/members` | ✅ Done | Batch + role filters, 15 member cards in 3-col grid |
| `/profile` | ✅ Done | Avatar, 6 stat tiles, activity timeline, badges grid, favorite games |
| `/admin` | ✅ Done | 6 stat tiles, users table, events table, live activity log, quick actions |

---

## Shared Components

### `TesseractNav`
```tsx
<TesseractNav
  subline="// games.hub"    // shown under TESSERACT wordmark
  active="games"            // highlights nav link ("home"|"games"|"events"|"ranks"|"members"|"core")
  cta={<>...</>}            // right slot: buttons, MeChip, StatusOnline
/>
```
Nav links (in order): `[01] home → /dashboard`, `[02] games → /games`, `[03] events → /events`, `[04] ranks → /leaderboard`, `[05] members → /members`, `[06] core → /admin`

Sub-exports: `MeChip` (user avatar chip), `StatusOnline` (pulsing dot + count)

### `TesseractFooter`
```tsx
<TesseractFooter context="games" />
// contexts: "platform"|"dashboard"|"games"|"events"|"ranks"|"admin"|"auth"|"profile"
```
Each context shows different telemetry metadata in the bottom strip.

### `TesseractHero`
```tsx
<TesseractHero size={520} speed={1} glow />
```
Canvas 4D hypercube: 16 vertices, 32 edges, 6 simultaneous rotation planes (XW/YW/ZW/XY/YZ/XZ). Depth-sorted, glow-lit, rainbow-colored edges. Scale factor: `size * 0.33`. Vertex glow: `shadowBlur = 18 * depth`.

### `Brackets`
```tsx
<Brackets tag="telemetry" accent="yellow">
  {children}
</Brackets>
```
Wrapper with gold corner ornaments + floating tag label. `accent` applies per-color theming (`--acc`, `--acc-glow`).

---

## Shared Data Files

### `src/data/games.ts`
Exports `GAMES: Game[]` (8 games) and `getGameBySlug(slug)`, `slugify(title)`.

Each `Game` has: `t` (title), `slug`, `c` (color), `cat`, `players`, `plays`, `live`, `hot`, `d` (short desc), `rules[]`, `topPlays[]`, `leaderboard[]`.

Games: smash-kart, scribbl, puzzle-run, brain-teasers, cipher-lab, riddle-room, type-wars, trivia-tower.

### `src/data/events.ts`
Exports `EVENTS: Event[]` (5 events) and `getEventBySlug(slug)`.

Each `Event` has: `slug`, `date`, `time`, `t`, `tag`, `c`, `going`, `d`, `host`, `glyph`, `where`, `fullDesc`, `rules?[]`, `rsvps[]`.

Events: movie-night-03, sunday-cup, riddle-night, play-night-07, cipher-cup.

---

## Frontend Tech Stack

| Item | Version | Notes |
|---|---|---|
| Next.js | 14.2.15 | App Router, all pages static |
| React | 18.3.1 | |
| TypeScript | 5.6.3 | |
| Tailwind CSS | 3.4.14 | Present but barely used — design is mostly custom CSS |
| Framer Motion | 11.11.9 | Installed, **not yet used** — animations are CSS-only |
| Zustand | 5.0.0 | Auth store wired, not connected to real API yet |
| Axios | 1.7.7 | API client with JWT interceptor + auto-refresh |
| lucide-react | 0.453.0 | Available, not used in new pages |
| react-hot-toast | 2.4.1 | Available, not wired in new pages |

---

## Backend Tech Stack

| Item | Notes |
|---|---|
| NestJS | TypeScript backend on the Express adapter |
| Prisma | PostgreSQL schema, client, and migrations |
| PostgreSQL | Primary and development database |
| Redis / memory fallback | OTP rate limiting, feature cache, idempotency hooks |
| JWT + Argon2 | JWT access tokens (15 min), refresh tokens (14 days), peppered OTP hashes |
| Zod | Request validation at controller boundaries |
| Jest + Supertest-ready structure | Backend test suite |

### API base URL
`http://localhost:8000/api/v1` (dev) — set via `NEXT_PUBLIC_API_URL` env var.

### API routes (all under `/api/v1`)
| Prefix | Endpoints |
|---|---|
| `/auth` | `POST /otp/request`, `POST /otp/verify`, `POST /refresh`, `POST /logout` |
| `/users` | `GET /me`, `GET /:id` |
| `/members` | `GET /me`, `POST /requests`, `GET /` |
| `/events` | `GET /`, `GET /:id`, `POST /:id/join`, `POST /`, `PATCH /:id`, `DELETE /:id` |
| `/games` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`, `POST /:id/scores` |
| `/leaderboard` | `GET /global`, `GET /games/:gameId` |
| `/activity` | `GET /`, `GET /notifications`, `POST /notifications/:id/read` |
| `/dashboard` | `GET /stats`, `GET /public` |
| `/features` | `GET /me`, `PATCH /me` |
| `/admin` | Full Phase 1 admin users/members/events/features/notifications/stats/audit surface |
| `/health` | `GET /health` |

### Auth flow
1. User submits institute email → `POST /auth/otp/request` → backend validates domain, sends OTP email, returns `challengeId`
2. User submits 6-digit OTP → `POST /auth/otp/verify` → returns `{ token, user }` — access token stored in localStorage, refresh token in httpOnly cookie
3. Axios interceptor attaches `Authorization: Bearer <token>` to every request
4. On 401: interceptor calls `POST /auth/refresh` once (singleton promise), retries original request
5. Logout: `POST /auth/logout` → clears both tokens

### Roles
`guest` → `member` → `core` → `admin` (Prisma enum in `backend/prisma/schema.prisma`)

Membership requires approval: `POST /members/requests` → admin reviews → role upgraded to `member`.

---

## DB Models (Prisma)

| Model | Key fields |
|---|---|
| `User` | id, email, name, role, xp, level, streak, rollNumber, avatarUrl, bio, deletedAt, lastLoginAt |
| `Game` | catalog metadata, future mini-game hooks, highScore, bestPlayer, howToPlay/rules JSON |
| `GameScore` | Phase 2 gated score records with idempotency key |
| `Event` | event details, capacity, registeredCount, organizers/tags JSON |
| `EventParticipant` | event/user RSVP state |
| `MembershipRequest` | guest → member approval workflow |
| `OtpChallenge` | email, OTP hash, expiry, attempts |
| `RefreshSession` | refresh rotation and revocation |
| `ActivityLog` | user-facing feed |
| `Notification` | in-app notification rows |
| `FeatureFlag` / `UserFeatureOverride` | global defaults and per-user overrides |
| `AdminAuditLog` | before/after JSON for admin writes |
| `UserSuspension` | active/lifted suspension history |

---

## Current State: What's Done vs What's Pending

### ✅ Completed
- Full Direction B design system in `globals.css` (tokens, animations, all page styles)
- All 11 routes implemented with static placeholder data
- 4D tesseract hero canvas (size=520, enhanced glow)
- Dual rotating glow rings behind hero
- CSS entrance animations on landing hero (staggered slideUp)
- Button shimmer on `.lb-btn-primary`
- Shared game and event data files with full per-item detail
- Games/events pages link through to detail pages
- Members directory with batch + role filtering
- Backend rewritten from Python/FastAPI to TypeScript/NestJS with Prisma/PostgreSQL/Redis
- Backend preserves the existing frontend `ApiEnvelope<T>` and `/api/v1/*` contract
- Phase 1 models, feature flags, admin audit logs, suspensions, and Prisma migration are in place
- OTP/JWT auth, users, membership, events, games catalog, activity, dashboard, feature flags, and broad admin routes are scaffolded in NestJS

### ⏳ Next steps (most impactful first)

1. **Connect auth flow to real backend**
   - Wire `src/app/auth/page.tsx` steps 0→1→2 to `authStore.requestOtp()` and `authStore.verifyOtp()`
   - Show error toasts on failure
   - On success redirect to `/dashboard`
   - `AppProviders.tsx` should call `authStore.refresh()` on mount to rehydrate session

2. **Connect dashboard to real API**
   - Replace static ACTIVITY/MINI/RECS data with `dashboardApi.stats()` and `activityApi.feed()`
   - Add loading skeletons (`.dash-act-row` placeholder divs while fetching)

3. **Connect games catalog to real backend**
   - `gamesApi.list()` → replace GAMES static array on `/games` page
   - `gamesApi.get(id)` → replace static lookup on `/games/[id]`
   - Wire "LAUNCH GAME ▶" button to actual game URLs or modals

4. **Connect events to real backend**
   - `eventsApi.list()` → replace EVENTS static array
   - `eventsApi.join(id)` → RSVP button handler
   - Show going count from `event.registered`

5. **Connect leaderboard**
   - `leaderboardApi.global()` → replace static BOARD data
   - `leaderboardApi.forGame(gameId)` → game detail leaderboard

6. **Add Framer Motion** (framer-motion 11.11.9 is installed, unused)
   - Scroll-triggered `whileInView` reveals on module cards, leaderboard rows
   - Staggered grid entries for games/members pages
   - Page transition wrapper in layout

7. **Members directory backend**
   - `usersApi.profile(id)` → real member cards (currently 15 static placeholders)
   - Search + pagination

8. **Score submission UI**
   - `gamesApi.submitScore(gameId, score)` uses idempotency key — add to game detail page

9. **Admin panel wiring**
   - `adminApi.analytics()`, `adminApi.users()`, `adminApi.setRole()`
   - Role guard: only allow `admin` role to reach `/admin`

10. **Membership approval flow**
    - After OTP verify: if `user.role === "guest"`, show membership request prompt
    - `membersApi.request(note)` → pending state → wait for admin approval

---

## Environment Variables (Frontend)
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## Environment Variables (Backend `.env`)
```
APP_ENV=development
PORT=8000
API_PREFIX=/api/v1
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tesseract?schema=public
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=<strong-secret>
OTP_PEPPER=<strong-secret>
EMAIL_PROVIDER=console
FRONTEND_ORIGINS=http://localhost:3000
```

## Running locally
```bash
# Frontend
npm run dev                  # http://localhost:3000

# Backend
npm run dev:backend           # http://localhost:8000

# Build check
npm run build && npm run typecheck
```

---

## Key Design Decisions & Constraints

- **Domain restriction enforced client-side** (in `authApi.requestOtp`) AND server-side (backend validates email domain). Both layers check `@ds.study.iitm.ac.in` and `@es.study.iitm.ac.in`.
- **No passwords** — OTP-only auth via institute email.
- **All pages are `"use client"`** — server components are not used. This was a deliberate choice to keep the design consistent with the canvas animation and client state.
- **CSS-first animations** — framer-motion is installed but not yet used. Entrance animations are pure CSS keyframes to keep the landing page bundle light.
- **Static data in `src/data/`** — `GAMES` and `EVENTS` arrays are the source of truth for detail pages until the backend is connected. The shape matches the API `Game` and `TesseractEvent` types in `src/lib/types.ts`.
- **Old components in `src/components/layout/`, `src/components/landing/`** — these are from a previous design iteration. Do NOT use them. The active design system is entirely in `src/components/tesseract/` + `globals.css`.
- **`overflow-x: hidden`** on `.lb-root` (not `overflow: hidden`) — allows the 4D hero canvas to overflow vertically at rotation extremes without clipping.
- **Score submission uses idempotency keys** — `gamesApi.submitScore` generates a UUID client-side and sends it in `Idempotency-Key` header to prevent duplicate score records.
