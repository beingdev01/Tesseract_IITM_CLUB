# Phase 9 — Performance Smells (static)

Static-only — no live profiling. Findings inform where future profiling pays off.

Findings start at `F-900`.

---

## 9.1 N+1 patterns

Phase 1 spotted three confirmed N+1 patterns:
- **F-056** `attendance.ts:2448-2457` — `/backfill-tokens` serial update loop (N+1 write).
- **F-060** `attendance.ts:2383-2403` — `/event/:eventId/summary` runs N parallel `count` queries (one per event day).
- **F-031** `scheduler.ts:processReminders` — serial sends with 200ms sleep (not strictly N+1 but O(N) DB writes).

Grep for `await prisma.*` inside `for` / `.map` / `.forEach`: only 2 raw matches (most "loop+prisma" patterns use `Promise.all([...].map(...))` which is concurrent, not serial N+1).

### Additional candidates

- **F-900 [MED] [Phase 9]** `init.ts:populateAnnouncementSlugs` (line 89-128) and `:populateProfileSlugs` (line 140-223) — sequential `update` calls per row. Backfill scripts running on every boot. Add a `take` cap or move to migration.
- **F-901 [LOW] [Phase 9]** `routes/competition.ts:recoverActiveRounds` (called from `index.ts:557`) — likely walks active rounds at boot and emits per-round events. Not audited deeply; verify N is small.

---

## 9.2 Missing pagination

Endpoints with no pagination (taking-all or unbounded by user input):

| Endpoint | Finding |
|---|---|
| `GET /api/invitations/event/:eventId` | F-081 |
| `GET /api/competition/:roundId/submissions` | F-087 |
| `GET /api/competition/:roundId/results` | F-088 |
| `GET /api/events/:id/registrations` | F-126 |
| `GET /api/teams/event/:eventId` | F-135 |
| `GET /api/attendance/event/:eventId/full` | F-059 (refuses >5000 rather than paginating) |
| `GET /api/network/admin/all` | (Phase 4) cap unverified |
| `GET /api/audit-logs` | implicit pagination via `page`/`limit` query — verify cap |

No additional findings; Phase 1 captured these.

---

## 9.3 Missing indexes

Phase 3 reviewed the schema. Specific concerns:

- **F-902 [LOW] [Phase 9]** `GameSession.gameId` queries (leaderboard) hit composite index `(gameId, score, createdAt)` — good. But `groupBy.userId` in `gamesRouter.ts:71-167` is an unindexed grouping on `userId` filtered by gameId — verify the composite index covers (gameId, userId).
- **F-903 [LOW] [Phase 9]** `EventRegistration` queries by `(eventId, attended, dayNumber)` for attendance summaries — composite index covers `(eventId, attended)` only (Phase 3 §3.3). The dayNumber filter falls back to the registration relation, requiring a join.
- **F-904 [LOW] [Phase 9]** `Certificate.recipientEmail` is indexed — supports `/mine` lookup. `Certificate.certId` is unique + indexed — supports `/verify`. Good.
- **F-905 [LOW] [Phase 9]** `Settings.findUnique({where:{id:'default'}})` is by PK — single row. No index concern.
- **F-906 [LOW] [Phase 9]** Boolean-column indexes (`featured`, `pinned`, `isFeatured`) — F-365. Postgres typically ignores low-selectivity boolean indexes. Consider partial indexes.

---

## 9.4 Response over-fetching

- **F-907 [MED] [Phase 9]** Many list endpoints return full Prisma rows with all columns (e.g., `findMany` without explicit `select`). FE may use 2-3 fields per row. With JSON columns (`Event.faqs`, `Event.imageGallery`), this can mean kilobytes per row × hundreds of rows.
- **F-908 [LOW] [Phase 9]** `User` row includes all 30+ relation IDs (only when explicitly included). `getProfile` returns `_count` — bounded.

---

## 9.5 Synchronous CPU work in request path

- **F-909 [HIGH] [Phase 9]** **`generateCertificatePDF.ts` (1,096 LOC) runs `@react-pdf/renderer` synchronously inside the cert-generate request handler.** PDF generation for one cert takes 200-800ms; bulk generation in `POST /api/certificates/bulk` serializes N PDFs — a 100-recipient bulk job blocks the Node event loop for ~minutes.
  - **Suggested:** Move to a background worker (BullMQ / standalone process). Combined with the 400MB heap cap in `npm run start --max-old-space-size=400`, large bulks can OOM.
- **F-910 [MED] [Phase 9]** `sharp` image processing in `routes/upload.ts` (presumed; Phase 1 deferred this file). Image resize blocks the event loop for large images.
- **F-911 [MED] [Phase 9]** `exceljs` workbook construction in event/competition/network exports — Phase 4 noted multiple `.xlsx` export endpoints. Each builds the workbook in memory synchronously and streams to response.

---

## 9.6 Caching

- **F-912 [MED] [Phase 9]** **`/api/games/leaderboard` is unauthenticated, hot, and uncached** (Phase 1 F-156). Every anonymous fetch issues a `groupBy` on `GameSession`.
- **F-913 [LOW] [Phase 9]** `/api/games` (catalog) is recomputed per request — `groupBy` over `GameSession` to get play counts. Could be cached for 60s.
- **F-914 [LOW] [Phase 9]** `/api/settings/public` similarly uncached.
- **F-915 [LOW] [Phase 9]** Feature-flag cache (`getFeatureFlags`) has 5-minute TTL — good.

---

## 9.7 Socket.io broadcast scaling

- **F-916 [MED] [Phase 9]** **Scribbl `canvas:stroke` broadcasts to all sockets in a room.** At 30 strokes/sec × 16 players room cap × 50 max rooms = 24,000 emits/sec at worst case. Token bucket (90/sec/socket) caps client input; broadcast fan-out is O(strokes × players). Bound by `STROKE_BUCKET_MAX = 90`.
- **F-917 [LOW] [Phase 9]** Trivia Tower `room:state` re-emitted on every event — fan-out O(participants) per state change. 20 max players × frequent updates = noticeable.
- **F-918 [LOW] [Phase 9]** No socket-level adapter (e.g., Redis adapter) — single-process only. Scaling horizontally would require a Redis adapter.

---

## 9.8 Scheduler / cron load

- **F-919 [LOW] [Phase 9]** `scheduler.ts:gameContentInterval` runs every 60 minutes, conditionally fires on IST midnight — light.
- **F-920 [LOW] [Phase 9]** `scheduler.ts:cipherRotationInterval` runs every 60 minutes — light.
- **F-921 [LOW] [Phase 9]** `scheduler.ts:reminderInterval` runs every 6 hours, processes pending registrations — bounded by reminder window.
- **F-922 [LOW] [Phase 9]** `EVENT_STATUS_INTERVAL_MS` runs every 30 minutes (`updateEventStatuses`) — likely full-table update of `Event.status`. Verify it scans only changed rows.

---

## 9.9 Heap / memory

- **F-923 [HIGH] [Phase 9]** `npm run start --max-old-space-size=400` (Phase 0 inventory §8) caps Node at **400 MB**. For an API that:
  - Builds PDF certificates in-memory
  - Processes images via sharp
  - Generates xlsx workbooks for thousands of registrations
  - Holds 50 active game rooms with member state in memory
  - Has 7+ minute idle TTL on rooms
  ...this is **too low**. A single bulk-cert run could OOM mid-job. Render's free tier may force this; check whether the cap is artificial or required.

---

## 9.10 Cold-start sensitivity

- Neon serverless DB; `withRetry` covers P1002/P2024 (F-017 — narrow). Cold-start to first response can be seconds.
- `Database keep-alive` is opt-in via `ENABLE_DB_KEEPALIVE`, but the default OFF means typical deploys hit cold starts.

---

## 9.11 Phase 9 findings recap

| ID | Severity | Title |
|---|---|---|
| F-900 | MED | `init.ts` slug-backfill runs on every boot |
| F-901 | LOW | `recoverActiveRounds` boot-time work — verify N |
| F-902–F-906 | LOW | Index hygiene |
| F-907 | MED | Many list endpoints return full Prisma rows (over-fetch) |
| F-908 | LOW | User row size |
| F-909 | HIGH | Cert PDF generation is synchronous in request path |
| F-910 | MED | sharp image resize in request path |
| F-911 | MED | exceljs workbook building synchronous |
| F-912 | MED | Public games leaderboard uncached |
| F-913–F-915 | LOW | Catalog / settings / feature flags caching opportunities |
| F-916 | MED | Scribbl canvas broadcast fan-out |
| F-917, F-918 | LOW | Trivia/Socket adapter scaling |
| F-919–F-922 | LOW | Schedulers bounded |
| F-923 | HIGH | 400MB Node heap cap insufficient for PDF/image/xlsx workloads |
