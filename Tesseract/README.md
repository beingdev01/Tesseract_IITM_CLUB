# Tesseract

> Play. Compete. Belong.
> A gamified community platform for **IIT Madras BS** students.

Tesseract is a closed ecosystem built for the IITM BS cohort — one hub for
events, games, leaderboards, and the people you've only ever met on Discord.

This repo now contains the full Tesseract app:
- `src/` for the Next.js 14 frontend
- `backend/` for the TypeScript/NestJS + Prisma/PostgreSQL/Redis backend

---

## Quick start

```bash
npm install
cp .env.local.example .env.local
npm run dev                          # http://localhost:3000
```

Backend quick start:

```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npm run seed
npm run dev
```

Or run the backend with Docker:

```bash
docker compose up --build
```

---

## Routes

| Route            | Role gate | What it is                                           |
| ---------------- | --------- | ---------------------------------------------------- |
| `/`              | public    | Animated landing page + CTA                          |
| `/auth`          | public    | Email + OTP flow (domain-scoped to IITM BS)          |
| `/dashboard`     | member    | Personalized hub: stats, chart, upcoming, activity   |
| `/events`        | guest     | Events list, filters, glassmorphism modal, RSVP      |
| `/games`         | member    | Game catalogue + score submit modal                   |
| `/leaderboard`   | guest     | Podium + live-refresh global & per-game boards       |
| `/profile`       | member    | Stats, activity timeline, badge collection           |
| `/admin`         | core      | Analytics, events CRUD, user role management         |

Role order: `guest < member < core < admin`. Guards are enforced client-side
via `RoleGuard`, and the backend enforces the same permissions on protected APIs.

---

## Architecture

```
src/
├── app/                      # Next.js App Router pages
│   ├── (landing)/            # public home
│   ├── auth/                 # email + OTP
│   ├── dashboard/            # main hub
│   ├── events/
│   ├── games/
│   ├── leaderboard/
│   ├── profile/
│   └── admin/                # core+ only
├── components/
│   ├── ui/                   # Button, Card, Modal, Input, Pill, Avatar, …
│   ├── layout/               # Topbar, Sidebar, AppShell, RoleGuard, Aura
│   ├── landing/              # Hero, FeatureGrid, GamesPreview, CommunityVibe
│   ├── auth/                 # AuthPanel (email → OTP → verify)
│   ├── dashboard/            # DashboardView
│   ├── events/               # EventsView + EventModal
│   ├── games/                # GamesView + GameModal (score submission)
│   ├── leaderboard/
│   ├── profile/
│   └── admin/
├── lib/
│   ├── api/
│   │   ├── client.ts         # axios instance + interceptors + retry
│   │   └── services.ts       # auth / users / events / games / …
│   ├── types.ts              # shared domain types
│   └── utils.ts              # cn, formatters, countUp, etc.
├── hooks/
│   ├── useApi.ts             # loading/error/refetch + useAsyncAction
│   └── useRole.ts            # role checks (`can(min)`, isMember, isCore, …)
└── store/
    ├── authStore.ts          # zustand + persist, OTP flow, refresh
    └── uiStore.ts            # sidebar, command-k, etc.
```

### API layer
- Single `apiClient` (axios) with bearer-token injection, 2x exponential retry
  for safe methods on network / 5xx errors, and refresh-cookie recovery on 401.
- `services.ts` exposes typed service objects (`authApi`, `eventsApi`, …) that
  unwrap the shared `{ success, data, error, meta }` backend envelope.
- `useApi(fetcher, deps)` and `useAsyncAction(fn)` give you loading / error /
  refetch for free on any call site.

### State
- **Auth** state is persisted (`zustand/persist`) — token, user, role — and
  rehydrates on client boot via `AppProviders`.
- **UI** state (sidebar open, etc.) is ephemeral.
- No Redux — Zustand gave us what we needed in ~80 LoC.

### Design system
- Dark only. Deep black (`ink-950`) base.
- Neon gradient palette (red → yellow → green → cyan → purple) from the logo.
- Glassmorphism (`.glass`, `.glass-strong`), gradient rings (`.ring-gradient`),
  animated aurora background, shimmer skeletons, and a full set of shared UI
  primitives.
- Fonts: Orbitron (display), Inter (body), JetBrains Mono (numbers & code).
- Motion everywhere via Framer Motion — hero float, shared-layout active tabs,
  stat count-ups, sidebar transitions, podium intros, bar chart reveals.

---

## Building & scripts

```bash
npm run dev       # dev server
npm run dev:backend
npm run build     # production build
npm run start     # run built app
npm run lint      # next lint
npm run test:backend
```

Current build: 9 routes, ~180 kB first-load JS shared baseline.

---

## Design principles we held to

1. **Not a portal — an experience.** Every page has motion, glow, and hierarchy.
2. **Real data first.** Every user-facing workflow now talks to the backend.
3. **Role-first UI.** Guest, member, core, admin each see a different app.
4. **Types from the boundary.** Domain types in `lib/types.ts` flow through.
5. **Composable UI.** One `<Button>`, one `<Card>`, one `<Modal>`, everywhere.

---

Built for IITM BS — by students, for students.
