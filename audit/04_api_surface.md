# Phase 4 — API Surface Map

Complete enumeration of HTTP endpoints. Grouped by router/mount path. **270+ handlers** across 30+ router files. Per the brief's §5 schema, this is a compressed representation — full request/response shapes are recovered from the source path:line column for each route.

Legend:
- **Auth** — `none` (public) / `cookie+bearer` (`authMiddleware`) / `opt` (`optionalAuthMiddleware`) / `gameAuth` / `gameAdminAuth` / `socket-direct`
- **Role** — minimum role from `requireRole(...)`; `—` if none
- **Validation** — `Zod` if a `safeParse` schema is present; `manual` if hand-coded; `none` if absent
- **Risk flags** — short codes:
  - `IDOR`: cross-event/cross-user access without ownership filter
  - `MA`: mass-assignment risk (`data: req.body` style)
  - `RACE`: concurrent access produces inconsistent state
  - `PII`: returns PII (email/phone/name) to a broader audience than ideal
  - `NPAG`: list endpoint with no pagination
  - `N+1`: N+1 query pattern in handler
  - `NAUD`: admin mutation with no `auditLog`
  - `OPEN`: explicitly public; flagged if there's any sensitive data
  - `CSRF`: cookie-authenticated POST that bypasses standard CSRF middleware (e.g., `text/*` body)
  - `INV`: missing input validation
  - `LEAK`: response contains more data than caller needs

Finding ID column links to Phase 1/2/3 finding numbers.

---

## 4.1 Top-level routes (mounted directly on `app`)

Mount in [index.ts](apps/api/src/index.ts):

| METHOD | PATH | Auth | Role | Validation | Notes / Finding |
|---|---|---|---|---|---|
| GET | `/` | none | — | — | static landing JSON |
| GET | `/health` | none | — | — | liveness; no DB |
| GET | `/health/db` | none | — | — | DB ping w/ 2s timeout |
| GET | `/ping` | none | — | — | echo |
| USE | `/sitemap.xml` | none | — | — | sitemapRouter |
| USE | `/robots.txt` | none | — | — | robotsRouter |
| GET | `/:key.txt` (IndexNow) | none | — | — | echoes env var value |
| POST | `/api/test-email` | cookie+bearer | ADMIN | manual | echoes recipient; F-026; no Zod schema |

---

## 4.2 `/api/auth` (`routes/auth.ts`)

| METHOD | PATH | Auth | Role | Validation | Notes |
|---|---|---|---|---|---|
| GET | `/providers` | none | — | — | leaks `devLogin: bool` (F-050) |
| GET | `/google` | none | — | manual | sets `oauth_intent`/`network_type` cookies |
| GET | `/google/callback` | passport-internal | — | — | issues cookie + URL exchange code (F-008) |
| POST | `/dev-login` | none | — | Zod | env-gated; route always mounted (F-009) |
| GET | `/me` | cookie+bearer | — | — | re-issues JWT (F-010, F-011, F-012) |
| POST | `/exchange-code` | none | — | Zod | exchange-code not single-use (F-CC-040) |
| POST | `/logout` | none | — | — | cookie-only clear (F-049, F-220) |

Risk flags: `LEAK` on `/providers`, `LEAK` on `/me`, `RACE`/`LEAK` on `/exchange-code`.

---

## 4.3 `/api/events` (`routes/events.ts`)

| METHOD | PATH | Auth | Role | Validation | Risk | Finding |
|---|---|---|---|---|---|---|
| GET | `/` | opt | — | manual query | `LEAK` on guest list (F-122) | |
| GET | `/upcoming` | none | — | — | | |
| GET | `/:id` | opt | — | manual | `LEAK` guest list (F-122) | |
| POST | `/` | bearer | CORE_MEMBER | Zod | `MA` toggle of `featured` | F-116 |
| PUT | `/:id` | bearer | CORE_MEMBER | Zod | `MA`, `IDOR` (no ownership check) | F-116 |
| DELETE | `/:id` | bearer | CORE_MEMBER | — | `IDOR` (CORE_MEMBER can delete any event) | new F-401 |
| GET | `/:id/registrations` | bearer | CORE_MEMBER | — | `IDOR`, `NPAG` | F-126, F-139 |
| DELETE | `/:eventId/registrations/:registrationId` | bearer | CORE_MEMBER | — | `IDOR` (no event-ownership) | new F-402 |
| GET | `/:id/registrations/export` | bearer | CORE_MEMBER | — | `IDOR`, `PII` (phone export) | F-119, F-139 |

**New findings:**
- **F-401 [HIGH] [Phase 4]** `DELETE /api/events/:id` permits any CORE_MEMBER to delete any event. Combined with `Event.creator onDelete: Restrict`, the cascade deletes registrations/teams/competition rounds. Destructive without ownership scoping.
- **F-402 [HIGH] [Phase 4]** `DELETE /api/events/:eventId/registrations/:registrationId` — CORE_MEMBER deletes a participant's registration from any event without ownership.

---

## 4.4 `/api/registrations` (`routes/registrations.ts`)

| METHOD | PATH | Auth | Role | Validation | Risk | Finding |
|---|---|---|---|---|---|---|
| POST | `/events/:eventId` | bearer | — | Zod | `RACE` (unique constraint catch path) | |
| DELETE | `/events/:eventId` | bearer | — | — | self-only via implicit `userId` | |
| GET | `/my` | bearer | — | — | self-scoped | |
| GET | `/events/:eventId/status` | bearer | — | — | self-scoped | |

Lower-risk; user-scoped operations.

---

## 4.5 `/api/teams` (`routes/teams.ts`)

| METHOD | PATH | Auth | Role | Validation | Risk | Finding |
|---|---|---|---|---|---|---|
| POST | `/create` | bearer | — | Zod | | |
| POST | `/join` | bearer + `joinRateLimiter` | — | Zod | `RACE` (capacity, F-121) | F-121 |
| GET | `/my-team/:eventId` | bearer | — | — | self-scoped | |
| PATCH | `/:teamId/lock` | bearer | — | Zod | leader-scoped via membership check | |
| DELETE | `/:teamId/members/:userId` | bearer | — | — | leader-scoped | |
| POST | `/:teamId/leave` | bearer | — | — | self-scoped | |
| POST | `/:teamId/transfer-leadership` | bearer | — | Zod | `RACE` (F-132) | F-132 |
| DELETE | `/:teamId/dissolve` | bearer | — | — | leader-scoped, `RACE` (F-125) | F-125 |
| GET | `/event/:eventId` | bearer | ADMIN | — | `NPAG`, `IDOR` if event ownership matters | F-135 |
| PATCH | `/:teamId/admin-lock` | bearer | ADMIN | Zod | admin override | |
| DELETE | `/:teamId/admin-dissolve` | bearer | ADMIN | — | admin override | |

---

## 4.6 `/api/announcements` (`routes/announcements.ts`)

| METHOD | PATH | Auth | Role | Validation | Risk |
|---|---|---|---|---|---|
| GET | `/` | none | — | manual query | `NPAG` cap? — verify |
| GET | `/latest` | none | — | — | |
| GET | `/:id` | none | — | — | id-or-slug |
| POST | `/` | bearer | CORE_MEMBER | Zod | `MA` (featured/pinned) verify |
| PUT | `/:id` | bearer | CORE_MEMBER | Zod | `MA` |
| DELETE | `/:id` | bearer | ADMIN | — | |

---

## 4.7 `/api/polls` (`routes/polls.ts`)

| METHOD | PATH | Auth | Role | Validation | Risk | Finding |
|---|---|---|---|---|---|---|
| GET | `/` | opt | — | manual | | |
| GET | `/:idOrSlug` | opt | — | — | | |
| POST | `/:idOrSlug/vote` | bearer | USER | Zod | `RACE` (F-117) | F-117 |
| POST | `/:idOrSlug/feedback` | bearer | USER | Zod | post-deadline allowed (F-133) | F-133 |
| GET | `/admin/public-view` | bearer | ADMIN | manual | | |
| GET | `/admin/public-view/:id` | bearer | ADMIN | — | | |
| POST | `/` | bearer | ADMIN | Zod | | |
| PUT | `/:id` | bearer | ADMIN | Zod | `MA`, slug-collision (F-124) | F-124 |
| DELETE | `/:id` | bearer | ADMIN | — | | |
| GET | `/:id/admin/export.xlsx` | bearer | ADMIN | — | `PII`/anon split fragile (F-120) | F-120 |

---

## 4.8 `/api/team` (`routes/team.ts`) — Team Members (admin-curated club roster)

| METHOD | PATH | Auth | Role | Validation | Risk |
|---|---|---|---|---|---|
| GET | `/` | none | — | manual | public |
| GET | `/me` | bearer | — | — | |
| GET | `/meta/teams` | none | — | — | public |
| GET | `/:id` | none | — | — | public |
| GET | `/slug/:slug` | none | — | — | public |
| POST | `/` | bearer | ADMIN | Zod | |
| PUT | `/:id` | bearer | ADMIN | Zod | |
| PUT | `/:id/profile` | bearer | — | Zod | self-scoped via TeamMember.userId match |
| PATCH | `/:id/link-user` | bearer | ADMIN | Zod | |
| PATCH | `/reorder` | bearer | ADMIN | Zod | |
| DELETE | `/:id` | bearer | ADMIN | — | |

---

## 4.9 `/api/achievements` (`routes/achievements.ts`)

| METHOD | PATH | Auth | Role | Validation | Risk |
|---|---|---|---|---|---|
| GET | `/` | none | — | manual | |
| GET | `/latest` | none | — | — | |
| GET | `/featured` | none | — | — | |
| GET | `/:idOrSlug` | none | — | — | |
| POST | `/` | bearer | CORE_MEMBER | Zod | |
| PUT | `/:id` | bearer | CORE_MEMBER | Zod | |
| DELETE | `/:id` | bearer | ADMIN | — | |

---

## 4.10 `/api/users` (`routes/users.ts`)

| METHOD | PATH | Auth | Role | Validation | Risk | Finding |
|---|---|---|---|---|---|---|
| GET | `/me` | bearer | — | — | | |
| PUT | `/me` | bearer | — | Zod | `MA` (verify schema excludes role/email) | |
| GET | `/me/registrations` | bearer | — | — | | |
| GET | `/me/game-stats` | bearer | — | — | | |
| GET | `/search` | bearer | ADMIN | manual | | |
| GET | `/export` | bearer | ADMIN | — | `PII`, `NAUD` | F-127 |
| GET | `/` | bearer | ADMIN | manual | `NPAG` cap? | |
| GET | `/:id` | bearer | ADMIN | — | | |
| PUT | `/:id` | bearer | ADMIN | Zod | super-admin gate (F-137) | F-137 |
| PUT | `/:id/role` | bearer | CORE_MEMBER | Zod | **CORE_MEMBER can change roles?** Verify — likely a HIGH IDOR | new F-403 |
| DELETE | `/:id` | bearer | ADMIN | — | super-admin gate; cascade nukes user history (F-368) | F-368 |

- **F-403 [CRIT] [Phase 4]** `PUT /api/users/:id/role` requires only `CORE_MEMBER`. If validated, a CORE_MEMBER can promote themselves or others to `ADMIN`/`PRESIDENT`. **Must verify** — read the handler body to confirm whether the inline logic blocks promotion to a higher role. Phase 1 didn't pull this body. Severity assumes the worst.

---

## 4.11 `/api/stats` (`routes/stats.ts`)

| METHOD | PATH | Auth | Role | Validation | Risk |
|---|---|---|---|---|---|
| GET | `/` | none | — | — | public |
| GET | `/public` | none | — | — | public |
| GET | `/home` | none | — | — | public |
| GET | `/dashboard` | bearer | ADMIN | — | |
| GET | `/me` | bearer | — | — | self |
| GET | `/events/trends` | bearer | ADMIN | — | |
| GET | `/games/trends` | bearer | ADMIN | — | |

---

## 4.12 `/api/settings` (`routes/settings.ts`)

| METHOD | PATH | Auth | Role | Validation | Risk | Finding |
|---|---|---|---|---|---|---|
| GET | `/public` | none | — | — | | |
| GET | `/` | bearer | ADMIN | — | | |
| PUT | `/` | bearer | PRESIDENT | Zod | `MA` | |
| PATCH | `/email-templates` | bearer | ADMIN | Zod | | |
| GET | `/email-templates` | bearer | ADMIN | — | | |
| GET | `/security-env` | bearer | ADMIN | — | exposes legacy env presence | |
| PATCH | `/security-env` | bearer | ADMIN | Zod | writes `process.env.INDEXNOW_KEY` (F-027) | F-027 |
| PATCH | `/:key` | bearer | ADMIN | manual | dynamic key — `MA` candidate | new F-404 |
| POST | `/reset` | bearer | ADMIN | — | | |
| POST | `/event-status/sync-now` | bearer | ADMIN | — | | |

- **F-404 [HIGH] [Phase 4]** `PATCH /api/settings/:key` accepts a path-param key and applies a corresponding change to Settings. If the handler does `prisma.settings.update({ data: { [key]: value } })` without whitelisting allowed keys, an admin can write to any column — including the encrypted `attendanceJwtSecret`/`indexNowKey` directly, or set boolean flags they shouldn't (e.g., `emailTestingMode` to redirect emails). Verify in source.

---

## 4.13 `/api/hiring` (`routes/hiring.ts`)

| METHOD | PATH | Auth | Role | Validation | Risk |
|---|---|---|---|---|---|
| POST | `/apply` | opt | — | Zod | `MA` (unique-email) F-348 |
| GET | `/applications` | bearer | ADMIN | manual | `NPAG`? |
| GET | `/applications/:id` | bearer | ADMIN | — | |
| PATCH | `/applications/:id/status` | bearer | ADMIN | Zod | |
| DELETE | `/applications/:id` | bearer | ADMIN | — | |
| GET | `/my-application` | bearer | — | — | self via email match |
| GET | `/stats` | bearer | ADMIN | — | |
| GET | `/export` | bearer | ADMIN | — | `PII`, `NAUD` likely |

---

## 4.14 `/api/certificates` (`routes/certificates.ts`)

| METHOD | PATH | Auth | Role | Validation | Risk | Finding |
|---|---|---|---|---|---|---|
| GET | `/files/:filename` | none + rateLimit | — | — | direct Cloudinary redirect? | |
| GET | `/download/:certId` | bearer + rateLimit | — | — | owner-or-admin (F-091) | F-091 |
| GET | `/verify/:certId/download` | none + rateLimit | — | — | public download path — verify | new F-405 |
| GET | `/` | bearer | ADMIN | manual | `NPAG`? | |
| POST | `/generate` | bearer | ADMIN | Zod | `IDOR` (F-099); `SSRF` (F-092) | F-092, F-099 |
| POST | `/bulk` | bearer | ADMIN | Zod | `IDOR` (F-099); `SSRF` (F-092) | F-092, F-099 |
| GET | `/verify/:certId` | none + rateLimit | — | manual | `PII` enumeration (F-083) | F-083 |
| GET | `/mine` | bearer | — | — | self-scoped via email match (F-091) | F-091 |
| PATCH | `/:certId/revoke` | bearer | ADMIN | Zod | | |
| DELETE | `/:certId` | bearer | ADMIN | — | | |
| POST | `/:certId/resend` | bearer | ADMIN | — | | |
| GET | `/:certId` | bearer | ADMIN | — | | |

- **F-405 [HIGH] [Phase 4]** `GET /api/certificates/verify/:certId/download` — public download endpoint by certId. If this serves the PDF for ANY valid certId (which is the natural read), then any enumerated certId leaks the PDF — and the PDF contains the recipient's full name, event, and signatory image. Combined with F-083, this is the actual data-leak vector (verify endpoint is the existence-check; this is the payload).

---

## 4.15 `/api/signatories` (`routes/signatories.ts`)

| METHOD | PATH | Auth | Role | Validation |
|---|---|---|---|---|
| GET | `/` | bearer | ADMIN | — |
| GET | `/active` | bearer | ADMIN | — |
| POST | `/` | bearer | ADMIN | Zod |
| PATCH | `/:id` | bearer | ADMIN | Zod |
| DELETE | `/:id` | bearer | ADMIN | — |

---

## 4.16 `/api/upload` (`routes/upload.ts`)

| METHOD | PATH | Auth | Role | Validation | Risk |
|---|---|---|---|---|---|
| POST | `/` (multer) | bearer? | role? | manual | `NAUD` (F-228), MIME/size guard? Verify |
| DELETE | `/` | bearer | ADMIN | manual | |

- **F-406 [MED] [Phase 4]** Phase 1 did not read [upload.ts](apps/api/src/routes/upload.ts) — flag for follow-up: confirm MIME whitelist, max file size, filename sanitization (path traversal), and Cloudinary destination validation.

---

## 4.17 `/api/network` (`routes/network.ts`)

| METHOD | PATH | Auth | Role | Validation | Risk | Finding |
|---|---|---|---|---|---|---|
| POST | `/join` | bearer | — | Zod | upgrade to NETWORK role | |
| GET | `/` | none | — | manual | `PII` (F-122) | |
| GET | `/:idOrSlug` | none | — | — | `PII` if isPublic = false leak | |
| GET | `/profile/me` | bearer | — | — | self | |
| POST | `/profile` | bearer | — | Zod | `MA` | |
| PATCH | `/profile` | bearer | — | Zod | `MA` (F-118) | F-118 |
| GET | `/admin/pending` | bearer | ADMIN | — | `NPAG`? | |
| GET | `/admin/all` | bearer | ADMIN | manual | `NPAG`? | |
| GET | `/admin/pending-users` | bearer | ADMIN | — | | |
| GET | `/admin/export` | bearer | ADMIN | — | `PII` (F-140) | F-140 |
| PATCH | `/admin/pending-users/:userId/revert` | bearer | ADMIN | — | | |
| DELETE | `/admin/pending-users/:userId` | bearer | ADMIN | — | | |
| PATCH | `/admin/:id/verify` | bearer | ADMIN | Zod | idempotency gap (F-129) | F-129 |
| PATCH | `/admin/:id/reject` | bearer | ADMIN | Zod | | |
| PATCH | `/admin/:id` | bearer | ADMIN | Zod | `MA` `isPublic` on PENDING (F-134) | F-115, F-134 |
| DELETE | `/admin/:id` | bearer | ADMIN | — | | |
| GET | `/admin/stats` | bearer | ADMIN | — | | |

---

## 4.18 `/api/invitations` (`routes/invitations.ts`)

| METHOD | PATH | Auth | Role | Validation | Risk | Finding |
|---|---|---|---|---|---|---|
| GET | `/search-invitees` | bearer | ADMIN | manual | `PII` query results | |
| POST | `/` | bearer | ADMIN | Zod | bulk send; F-323/F-324 (null-null) | F-323 |
| GET | `/event/:eventId` | bearer | ADMIN | — | `NPAG` (F-081) | F-081 |
| GET | `/my` | bearer | — | — | | |
| POST | `/claim` | bearer + `claimRateLimiter` | — | Zod | `RACE` (F-080, F-082); token contains email (F-089) | F-080, F-082, F-089 |
| PATCH | `/:id` | bearer | ADMIN | Zod | | |
| DELETE | `/:id` | bearer | ADMIN | — | | |
| POST | `/:id/resend` | bearer | ADMIN | — | | |
| POST | `/:id/accept` | bearer | — | Zod | email-only match (F-096) | F-096 |
| POST | `/:id/decline` | bearer | — | Zod | email-only match (F-096) | F-096 |

---

## 4.19 `/api/audit-logs` (`routes/audit.ts`)

| METHOD | PATH | Auth | Role | Validation |
|---|---|---|---|---|
| GET | `/` | bearer | ADMIN | manual |
| DELETE | `/retention` | bearer | ADMIN | Zod |

---

## 4.20 `/api/mail` (`routes/mail.ts`)

| METHOD | PATH | Auth | Role | Validation | Risk |
|---|---|---|---|---|---|
| GET | `/recipients` | bearer | ADMIN | manual | `PII` directory |
| POST | `/send` | bearer | ADMIN | Zod | mass email — audit-logged |

---

## 4.21 `/api/credits` (`routes/credits.ts`)

| METHOD | PATH | Auth | Role | Validation | Risk |
|---|---|---|---|---|---|
| GET | `/` | none | — | manual | |
| GET | `/:id` | none | — | — | |
| POST | `/` | bearer | ADMIN | Zod | `NAUD` (F-172) |
| PUT | `/:id` | bearer | ADMIN | Zod | `NAUD` |
| DELETE | `/:id` | bearer | ADMIN | — | |
| PATCH | `/reorder` | bearer | ADMIN | Zod | |

---

## 4.22 `/api/attendance` (`routes/attendance.ts`)

19 endpoints. All Phase 1 findings apply.

| METHOD | PATH | Auth | Role | Validation | Risk | Finding |
|---|---|---|---|---|---|---|
| GET | `/my-qr/:eventId` | bearer + feature | — | manual | self | |
| POST | `/scan` | bearer + feature | CORE_MEMBER | manual | `RACE` (F-058) | F-058 |
| POST | `/scan-batch` | bearer + feature | CORE_MEMBER | manual | `IDOR` (F-057) | F-057 |
| POST | `/scan-beacon` | rateLimit + feature + text body | — | manual | `CSRF`, `IDOR` (F-055) | F-055 |
| POST | `/manual-checkin` | bearer + feature | CORE_MEMBER | manual | `RACE` (F-058) | |
| PATCH | `/unmark` | bearer + feature | CORE_MEMBER | manual | `IDOR` | |
| PATCH | `/bulk-update` | bearer + feature | CORE_MEMBER | manual | `IDOR`, `RACE` (F-068) | F-068 |
| PATCH | `/edit/:registrationId` | bearer + feature | CORE_MEMBER | manual | `IDOR` (F-063) | F-063 |
| POST | `/regenerate-token/:registrationId` | bearer + feature | ADMIN | manual | `IDOR` (F-064) | F-064 |
| POST | `/regenerate-tokens/event/:eventId` | bearer + feature | ADMIN | — | `IDOR` | F-064 |
| GET | `/search` | bearer | CORE_MEMBER | manual | `IDOR` (F-071) | F-071 |
| GET | `/live/:eventId` | bearer | CORE_MEMBER | — | `IDOR` (F-139) | |
| GET | `/event/:eventId/full` | bearer | CORE_MEMBER | — | `IDOR`, `NPAG` (F-059) | F-059 |
| GET | `/event/:eventId/export` | bearer | CORE_MEMBER | — | `IDOR`, `PII` | F-119 |
| POST | `/email-absentees/:eventId` | bearer | ADMIN | manual | `IDOR` (F-065) | F-065 |
| GET | `/event/:eventId/certificate-recipients` | bearer | ADMIN | — | `IDOR` (F-069) | F-069 |
| GET | `/my-history` | bearer | — | — | self-scoped | |
| GET | `/event/:eventId/summary` | none | — | — | `OPEN`, `N+1` (F-060) — public event-summary endpoint | F-060 |
| POST | `/backfill-tokens` | bearer + feature | ADMIN | — | `N+1` (F-056) | F-056 |

- **F-407 [HIGH] [Phase 4]** `GET /api/attendance/event/:eventId/summary` is **public (no auth)** while exposing attendance counts. An anonymous attacker can enumerate event IDs and learn how well-attended each event was. Not severe per se, but inconsistent with the rest of the attendance surface being CORE_MEMBER-only.

---

## 4.23 `/api/games` (mounted in `mountGames`)

Top-level (`games/router.ts`):

| METHOD | PATH | Auth | Role | Validation | Risk |
|---|---|---|---|---|---|
| GET | `/` | none | — | — | |
| GET | `/leaderboard` | none | — | Zod | `NPAG` cap 100 (OK), no cache |
| GET | `/:id` | none | — | — | |

Per-game routers:

### Smash Kart (`games/smash-kart/index.ts`)

| METHOD | PATH | Auth | Role | Validation | Risk |
|---|---|---|---|---|---|
| GET | `/health` | none | — | — | |
| POST | `/session` | bearer | — | Zod? | client-trusts session (F-CC-042) |
| GET | `/leaderboard` | none | — | Zod | |

### Type Wars (`games/type-wars/router.ts`)

| METHOD | PATH | Auth | Role | Validation | Risk |
|---|---|---|---|---|---|
| POST | `/rooms` | gameAuth | USER | Zod | |
| POST | `/rooms/:code/join` | gameAuth | USER | Zod | |
| GET | `/rooms/:code` | gameAuth | USER | Zod | passage text leak F-157 |
| GET | `/leaderboard` | none | — | Zod | |

### Trivia Tower / Riddle Room / Scribbl

3 routes each, mirroring TW (`rooms`, `rooms/:code/join`, `rooms/:code`). All `gameAuth`.

### Puzzle Run (`games/puzzle-run/router.ts`)

| METHOD | PATH | Auth | Validation |
|---|---|---|---|
| GET | `/today` | gameAuth | — |
| POST | `/puzzle/:puzzleId/attempt` | gameAuth | Zod |
| POST | `/complete` | gameAuth | Zod |

### Brain Teasers

| METHOD | PATH | Auth | Validation |
|---|---|---|---|
| GET | `/today` | gameAuth | — |
| POST | `/:teaserId/submit` | gameAuth | Zod |

### Cipher Lab

| METHOD | PATH | Auth | Validation |
|---|---|---|---|
| GET | `/active` | gameAuth | — |
| POST | `/start` | gameAuth | Zod |
| POST | `/hint` | gameAuth | Zod |
| POST | `/submit` | gameAuth | Zod |

### Competition (mounted at `/api/games/competition`)

17 endpoints — see §4.24.

---

## 4.24 `/api/games/competition` (`routes/competition.ts`, mounted via games)

| METHOD | PATH | Auth | Role | Validation | Risk | Finding |
|---|---|---|---|---|---|---|
| POST | `/` | bearer | ADMIN | Zod | | |
| GET | `/event/:eventId` | opt | — | — | | |
| GET | `/event/:eventId/results-summary` | bearer | ADMIN | — | | |
| GET | `/:roundId` | bearer | — | — | | |
| PATCH | `/:roundId/start` | bearer | ADMIN | — | | |
| PATCH | `/:roundId/lock` | bearer | ADMIN | — | | |
| PATCH | `/:roundId/judging` | bearer | ADMIN | — | | |
| PATCH | `/:roundId/finish` | bearer | ADMIN | — | | |
| POST | `/:roundId/save` | bearer + saveLimiter | — | Zod | autosave race (F-085, F-086, F-098) | F-085 |
| POST | `/:roundId/submit` | bearer + submitLimiter | — | Zod | RACE on `(roundId, teamId)` unique NULL-distinct (F-331) | F-331 |
| GET | `/:roundId/my-submission` | bearer | — | — | self | |
| GET | `/:roundId/submissions` | bearer | ADMIN | — | `NPAG` (F-087) | F-087 |
| PATCH | `/:roundId/score/:submissionId` | bearer | ADMIN | Zod | `IDOR` (F-100) | F-100 |
| GET | `/:roundId/results/export` | bearer | ADMIN | — | format-trust (F-095) | F-095 |
| GET | `/:roundId/results` | none | — | — | `OPEN`, `NPAG`, `PII` (F-088) | F-088 |
| PUT | `/:roundId` | bearer | ADMIN | Zod | | |
| DELETE | `/:roundId` | bearer | ADMIN | — | | |

---

## 4.25 `/api/admin/games/<id>` admin content routes

Each game has a separate `/admin/games/<id>` mount via its `admin.ts` file (`adminRouter.use(gameAdminAuth)` at top).

| Game | Endpoints |
|---|---|
| `puzzle-run` | GET `/puzzles`, GET `/days/today`, POST `/puzzles`, PATCH `/puzzles/:id`, DELETE `/puzzles/:id`, POST `/days/today/regenerate` |
| `brain-teasers` | GET `/teasers`, GET `/days/today`, POST `/teasers`, PATCH `/teasers/:id`, DELETE `/teasers/:id`, POST `/days/today/regenerate` |
| `cipher-lab` | GET `/challenges`, POST `/preview`, POST `/challenges`, PATCH `/challenges/:id`, DELETE `/challenges/:id` |
| `trivia-tower` | GET `/questions`, POST `/questions`, POST `/questions/bulk`, PATCH `/questions/:id`, DELETE `/questions/:id` |
| `type-wars` | GET `/passages`, POST `/passages`, POST `/passages/bulk`, PATCH `/passages/:id`, DELETE `/passages/:id` |
| `scribbl` | GET `/prompts`, POST `/prompts`, POST `/prompts/bulk`, PATCH `/prompts/:id`, DELETE `/prompts/:id` |
| `riddle-room` | GET `/clues`, GET `/bundles`, POST `/clues`, PATCH `/clues/:id`, DELETE `/clues/:id`, POST `/bundles`, PATCH `/bundles/:id`, DELETE `/bundles/:id` |

All gated by `gameAdminAuth` (`authMiddleware + requireRole('ADMIN')`). No event/team scoping (admin-wide).

---

## 4.26 IndexNow + Sitemap

| METHOD | PATH | Auth | Role | Notes |
|---|---|---|---|---|
| GET | `/sitemap.xml` | none | — | |
| GET | `/robots.txt` | none | — | |
| GET | `/:key.txt` | none | — | echoes IndexNow key (F-027) |
| POST | `/submit-all` | bearer | ADMIN | IndexNow re-submit |
| USE | `/api/indexnow` | bearer | ADMIN | admin protected |

---

## 4.27 Aggregate counts

| Bucket | Count |
|---|---|
| Public (no auth) | ~40 |
| `optionalAuthMiddleware` | ~10 |
| `authMiddleware` (any user) | ~80 |
| `requireRole('USER')` | ~10 |
| `requireRole('CORE_MEMBER')` | ~22 |
| `requireRole('ADMIN')` | ~80 |
| `requireRole('PRESIDENT')` | 1 (`/api/settings PUT`) |
| `gameAuth` | ~30 |
| `gameAdminAuth` | ~40 |
| Total | **~270+** |

---

## 4.28 Phase 4 new findings recap

| ID | Severity | Title |
|---|---|---|
| F-401 | HIGH | `DELETE /api/events/:id` permits any CORE_MEMBER to delete any event |
| F-402 | HIGH | `DELETE /api/events/:eventId/registrations/:registrationId` no event-ownership |
| F-403 | CRIT | `PUT /api/users/:id/role` requires only CORE_MEMBER — needs body verification |
| F-404 | HIGH | `PATCH /api/settings/:key` dynamic key write — verify whitelist |
| F-405 | HIGH | `GET /api/certificates/verify/:certId/download` public PDF download by certId |
| F-406 | MED | `routes/upload.ts` not reviewed in Phase 1 — verify MIME/size/path guards |
| F-407 | HIGH | `GET /api/attendance/event/:eventId/summary` public (no auth) attendance counts |

---

## 4.29 Patterns observed

1. **The `/api/auth/*` namespace alone uses non-canonical error shapes** (plain `{error: string}`). Every other namespace uses `ApiResponse`. Auth router migration is a one-day chore.
2. **`requireRole('ADMIN')` is overused.** Many endpoints would benefit from finer-grained roles (event organizer, judge, signatory) that the schema doesn't currently model.
3. **`requireFeature(...)` is applied only to attendance and certificates.** Games, network, mailing, and competition have their own boolean settings flags but no equivalent middleware.
4. **No `DELETE` handler exists on `Event.invitations` at the invitation level** — admins use `DELETE /api/invitations/:id` instead. Endpoint placement under `/api/invitations` is mostly per-resource; events-namespace endpoints are sparse for nested resources.
5. **Game admin routers all use `adminRouter.use(gameAdminAuth)` at the top** — clean pattern, contrasts with main routes that inline `authMiddleware, requireRole(...)` per handler.
6. **A handful of endpoints have their own rate limiters** (`saveLimiter`, `submitLimiter`, `joinRateLimiter`, `claimRateLimiter`, `certificateVerifyLimiter`, `certificateDownloadLimiter`, `beaconLimiter`). Phase 8 will inventory whether they cover all hot paths.
