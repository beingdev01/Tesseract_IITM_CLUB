# Phase 2 — Cross-cutting Audit

Synthesizes patterns discovered in Phase 1 across the codebase. References finding IDs from `01_findings.md` where applicable. New cross-cutting issues are numbered F-220 onward to avoid colliding with Phase 1.

---

## 2.1 Authentication lifecycle (end-to-end trace)

### Token issuance — the chain of trust

```
Browser                          API (Express)                  DB
  │                                  │                            │
  │ GET /api/auth/google             │                            │
  ├─────────────────────────────────►│                            │
  │                                  │ Passport: GoogleStrategy   │
  │  302 → Google OAuth              │                            │
  │◄─────────────────────────────────┤                            │
  │                                  │                            │
  │ Google → /api/auth/google/callback                            │
  ├─────────────────────────────────►│                            │
  │                                  │ passport.authenticate      │
  │                                  │ → strategy callback        │
  │                                  │   findFirst(email,         │
  │                                  │     mode: 'insensitive')   │
  │                                  ├──────────────────────────►│
  │                                  │   create or update         │
  │                                  │◄──────────────────────────┤
  │                                  │ handleGoogleCallback:      │
  │                                  │   demoteOrphanNetworkUser  │
  │                                  │   isNetworkUpgrade?        │
  │                                  │   generateToken (7d JWT)   │
  │                                  │   setSessionCookie(token)  │  ← cookie issued
  │                                  │   signOAuthExchangeCode    │  ← 30s code in URL
  │                                  │   auditLog('LOGIN')        │
  │  302 → FE /auth/callback?code=…  │                            │
  │◄─────────────────────────────────┤                            │
  │                                  │                            │
  │ POST /api/auth/exchange-code     │                            │
  │ { code }                         │                            │
  ├─────────────────────────────────►│                            │
  │                                  │ verifyOAuthExchangeCode    │
  │                                  │ findUnique(user)           │
  │                                  ├──────────────────────────►│
  │                                  │ generateToken (NEW 7d JWT) │
  │                                  │ setSessionCookie (refresh) │
  │  200 { token, intent, networkType }                          │
  │◄─────────────────────────────────┤                            │
  │                                  │                            │
  │ GET /api/auth/me (cookie)        │                            │
  ├─────────────────────────────────►│ authMiddleware             │
  │                                  │   jwt.verify(token)        │
  │                                  │   findUnique(user)         │
  │                                  ├──────────────────────────►│
  │                                  │ generateToken (NEW 7d JWT) │  ← re-issued every poll!
  │  200 { user, token }             │                            │
  │◄─────────────────────────────────┤                            │
```

**Findings already logged covering the chain:** F-001 (role-claim duality), F-002 (7d JWT, no revocation), F-007 (case-insensitive email duplication), F-008 (triple-issuance: cookie + code-in-URL + new token from exchange), F-010 (`/me` refresh-on-poll), F-011 (token returned in body), F-012 (cookie not refreshed alongside re-issue), F-046 (sameSite: lax), F-053 (passport serialize/deserialize is dead).

### Logout

`POST /api/auth/logout`:
```
clearSessionCookie(res);   // only clears the local cookie
res.json({ message: 'Logged out successfully' });
```

**The token remains valid for its full 7-day lifetime.** Any cached copy of the token (in another tab, in localStorage if the FE saved it from `/me`, in a service worker, in a screenshot) keeps working until expiry. There is no server-side revocation list.

**F-220 [HIGH] [Phase 2] Logout is cookie-clear-only; no server-side invalidation**
- **File:** apps/api/src/routes/auth.ts:L360-L363
- **Why this is wrong:** "Log out" in user mental model means "this session ends". Reality: "this browser forgets the cookie". For shared devices, kiosk situations, or any "I think my account is compromised" scenario, this is a security gap.
- **Suggested direction:** Add `User.tokenVersion: Int @default(0)` and bump it on logout/role change. Embed `tokenVersion` in JWT; `authMiddleware` verifies the embedded version equals the DB version.

### Token verification

All three middlewares (`authMiddleware`, `optionalAuthMiddleware`, socket auth) call `jwt.verify` then `prisma.user.findUnique`. The DB user is authoritative for `role`, `name`, etc. — the JWT only provides the `userId`. (F-001 documents the drift risk.)

### Refresh token — does not exist

There is no separate refresh-token. The access token lasts 7d and `/me` re-issues. **F-010 + F-002** combine to "tokens are effectively immortal as long as the user is active."

### Suspended / banned users

No `User.suspended` or `User.disabled` field in the schema. There is no way to lock an account short of deleting the user row (which destroys their audit trail). For role-based suspension you'd downgrade to `USER` or `PUBLIC` — but `PUBLIC` is not a stored role.

**F-221 [MED] [Phase 2] Schema has no User suspension flag; cannot temporarily disable an account without losing audit history**
- **File:** prisma/schema.prisma:15-82 (User model)
- **Suggested direction:** Add `suspendedAt: DateTime?` and check in `authMiddleware`.

---

## 2.2 Permission matrix

Derived from the 123 `requireRole(...)` call sites and the `role.ts` hierarchy. Each cell is one route × verb. Truth value is "what role can do this action **per the current code**, not per intent."

The hierarchy collapses:
- `USER` = `NETWORK` (level 1)
- `ADMIN` = `PRESIDENT` (level 4)

So columns merge accordingly. **CRIT issue F-013/F-014** noted that this conflation may not match product intent.

### Selected high-stakes endpoints

| Endpoint | Min Role | NETWORK allowed? | Ownership check? | Findings |
|---|---|---|---|---|
| `POST /api/events` (create) | CORE_MEMBER | — | — | F-126 (no pagination on read) |
| `PUT /api/events/:id` | CORE_MEMBER | — | **none on featured toggle** | F-116, F-119 |
| `GET /api/events/:id/registrations` | CORE_MEMBER | — | **none** — any CM reads any event's regs | **F-139 (CRIT)** |
| `POST /api/attendance/scan` | CORE_MEMBER | — | partial — event-day check, no club scope | F-058, F-061 |
| `POST /api/attendance/email-absentees/:eventId` | ADMIN | — | **none on event** | F-065 |
| `POST /api/attendance/regenerate-tokens/event/:eventId` | ADMIN | — | **none on event** | F-064 |
| `GET /api/attendance/event/:eventId/certificate-recipients` | ADMIN | — | **none on event** | F-069 |
| `GET /api/attendance/search` | CORE_MEMBER | — | **none on event** | F-071 |
| `PATCH /api/attendance/edit/:registrationId` | CORE_MEMBER | — | **none on event** | F-063 |
| `POST /api/certificates/bulk` | ADMIN | — | **none on event** | F-099 |
| `PATCH /api/competition/:roundId/score/:submissionId` | ADMIN | — | **none on event/round** | F-100 |
| `GET /api/competition/:roundId/submissions` | ADMIN | — | **none on event/round** | F-087 |
| `GET /api/competition/:roundId/results` | PUBLIC | yes | n/a | F-088 (no rate limit on full leaderboard) |
| `POST /api/credits` | ADMIN | — | **no self-award guard** | F-172 |
| `DELETE /api/upload/:public_id` | CORE_MEMBER | — | **none** — any CM can delete any image | F-173 |
| `GET /api/users/export` | ADMIN | — | n/a | F-127 (no audit log) |
| `PATCH /api/users/:id` (role change) | ADMIN | — | partial — super admin protected only if SUPER_ADMIN_EMAIL is set | F-137 |
| `POST /api/network/:id/verify` | ADMIN | — | partial — no status check | F-129 |
| `PATCH /api/network/admin/:id` | ADMIN | — | partial — can publish PENDING profile | F-115, F-134 |
| `POST /api/teams/:id/dissolve` | USER | yes (probable bug) | leader-only via deleteMany | F-125 |
| `POST /api/games/<game>/rooms/:code/join` | USER | yes (probable bug) | n/a | F-201 |
| `POST /api/auth/dev-login` | PUBLIC (env-gated) | yes | n/a | F-009 |
| `GET /api/certificates/verify/:certId` | PUBLIC | yes | n/a | F-083 (PII leak) |

### Pattern observed

**Ownership checks are absent for ~14 admin-only endpoints across attendance, certificates, competition, events, network, and credits.** The implicit security model is "admins are trusted globally" — fine for a single club, but the data model contemplates multi-event ownership (Event.createdBy exists). Whichever way this resolves, the inconsistency is the bug: some endpoints DO scope by `createdBy`/owner, others don't.

**F-222 [HIGH] [Phase 2] Ownership-check coverage is inconsistent — 14+ admin endpoints accept any admin against any object**
- **Why this is wrong:** Cross-organization data exposure for any multi-org future, and immediate "admin from event A can edit event B" within the current single-club model.
- **Suggested direction:** Add a shared middleware `requireEventOwnership(paramName)` that loads the event, checks `event.createdBy === authUser.id || authUser.role === 'PRESIDENT'`, and rejects otherwise. Apply to all event-scoped admin routes.
- **Related:** F-063, F-064, F-065, F-069, F-071, F-087, F-099, F-100, F-115, F-127, F-129, F-134, F-139, F-173.

---

## 2.3 Multi-tenancy / data isolation

The model is currently **single-tenant per deploy** (one club, one event organizer cohort). But the schema has soft-tenancy via `Event.createdBy`, `Certificate.recipientId`, `EventRegistration.userId`, `EventTeam.leaderId`, etc.

**Models with implicit scoping fields that should always be enforced on read/write:**

| Model | Scoping field | Most queries enforce? |
|---|---|---|
| `EventRegistration` | `userId` for self-views; `eventId` for owner views | partial — F-126, F-139 are the gaps |
| `Certificate` | `recipientId` OR `recipientEmail` | partial — F-091 |
| `NetworkProfile` | `userId` | yes for self-views |
| `EventTeam` | `eventId`, `leaderId`, `members.userId` | mostly — F-125, F-132 |
| `CompetitionSubmission` | `roundId`, `teamId`, `userId` | partial — F-100 |
| `CompetitionAutoSave` | `roundId`, `userId`, ideally `teamId` | F-085, F-086 |
| `EventInvitation` | `inviteeUserId` OR `inviteeEmail` | partial — F-080, F-096 |
| `HiringApplication` | `userId` (applicant) | admin-listing exposes phone+email | F-169 |
| `Credit` | `teamMemberId` | weak — F-172 |
| `GameSession` | `userId`, `gameId` | leaderboard reads are user-aggregated, OK |
| `AuditLog` | `userId` | admin-only read, OK |

**Pattern:** every "list across the system" endpoint should be by definition not user-scoped (because it's admin), but those endpoints frequently lack pagination AND ownership filters. Phase 8 will summarize as the IDOR table.

---

## 2.4 Error contract

`ApiResponse` (utils/response.ts) defines the success/error envelopes:

```
SuccessResponse<T> = { success: true, data: T, message?, meta? }
ErrorResponse     = { success: false, error: { code, message, details? } }
```

### Inconsistencies

1. **`authRouter` predates `ApiResponse`** — `auth.ts` returns raw `{ error: '...' }` and `{ message: 'Logged out successfully' }` (line 362), not `ApiResponse.success`. F-049 documented.
2. **`/api/auth/me` returns `{ success: true, data: ..., token }`** — the `token` is a sibling field outside `data`, breaking the schema. (F-011/F-012.)
3. **`/api/auth/google/callback` is a 302 redirect**, not JSON — so no envelope. Errors signaled via query string `?error=invalid_domain` etc. Fine in pattern but the query-string error codes are documented nowhere.
4. **404 handler** uses `ApiResponse.error` with code `NOT_FOUND` and status 404 — consistent.
5. **Global error handler** collapses everything not body-too-large/JSON to `INTERNAL_ERROR` / 500 (F-042).
6. **Beacon-scan endpoint** (`/api/attendance/scan-beacon`) returns bare `res.status(401).send()` / `res.status(500).send()` — empty body, no envelope. F-055 context.
7. **`/api/auth/dev-login` validation error** returns `{ error: validation.error.errors[0].message }` (`auth.ts:L234`) — flat shape, not envelope.
8. **Exchange code error path** at `auth.ts:L310-L317, L356` returns `{ error: '...' }` — flat shape.

**F-223 [LOW] [Phase 2] Error response shapes are inconsistent — at least 4 distinct shapes coexist (`ApiResponse.error`, `{ error: '...' }`, `res.status(...).send()`, 302 redirect with `?error=`)**
- **Why this is wrong:** Frontend error-handling has to branch on shape, increasing surface for "this endpoint's error wasn't anticipated" bugs.
- **Suggested direction:** Migrate `auth.ts` and beacon paths to `ApiResponse.error`.

### Error codes catalog (from `response.ts:79-112`)

```
UNAUTHORIZED, INVALID_TOKEN, TOKEN_EXPIRED, FORBIDDEN, AUTH_INVALID_CREDENTIALS,
VALIDATION_ERROR, VALIDATION_FAILED, INVALID_INPUT, MISSING_FIELD, BAD_REQUEST,
NOT_FOUND, ALREADY_EXISTS, CONFLICT, RATE_LIMITED,
INTERNAL_ERROR, DATABASE_ERROR, SERVICE_UNAVAILABLE,
REGISTRATION_CLOSED, EVENT_FULL, ALREADY_REGISTERED, REGISTRATION_NOT_STARTED
```

**`VALIDATION_ERROR` and `VALIDATION_FAILED` are duplicated** — different routes use different ones. Frontend cannot reliably switch on this code.

**F-224 [LOW] [Phase 2] `VALIDATION_ERROR` and `VALIDATION_FAILED` both exist in ErrorCodes — pick one**
- **File:** apps/api/src/utils/response.ts:L87-L89
- **Suggested direction:** Standardize on `VALIDATION_ERROR`; remove `VALIDATION_FAILED` or treat as alias.

---

## 2.5 Idempotency, retries, replays

### POST endpoints that create resources

| Endpoint | Idempotent? | Mechanism | Bug |
|---|---|---|---|
| `POST /api/events` | no | none | double-click creates duplicate |
| `POST /api/events/:id/register` | yes | unique `(userId, eventId)` constraint | retry safe |
| `POST /api/teams` | no | none | double-click creates duplicate team |
| `POST /api/teams/:id/join` | partial | TX + capacity check | F-121 race |
| `POST /api/competition/.../submissions` | partial | unique `(roundId, teamId)` | retry safe |
| `POST /api/competition/.../autosave` | yes | upsert | F-085 race on teamId |
| `POST /api/certificates/bulk` | no | none | a double-fired bulk issue duplicates emails |
| `POST /api/attendance/scan` | yes | `dayAttendance` unique key + check | F-058 race surfaces as 500 |
| `POST /api/attendance/scan-beacon` | partial | same as scan | same race |
| `POST /api/auth/exchange-code` | partial | 30s window; code is single-shot but reusable | F-008 |
| `POST /api/invitations/:id/claim` | partial | F-080/F-082 race |
| `POST /api/invitations/:id/accept` | yes | Serializable TX |
| `POST /api/invitations/:id/decline` | yes | Serializable TX |
| `POST /api/polls/:id/vote` | partial | F-117 race |
| `POST /api/upload` | no | Cloudinary creates new public_id every time |
| `POST /api/mail/send` | no | will resend on retry — costly |

**F-225 [MED] [Phase 2] No endpoint accepts an `Idempotency-Key` header — a network retry that succeeded but returned no response causes duplicate side-effects across the API**
- **Why this is wrong:** Standard pattern for any side-effecting POST. Most acute for `/api/mail/send`, `/api/certificates/bulk`, `/api/events` (create), `/api/credits` (admin awards) — any user-visible duplicate is awkward; any email duplicate is reputation damage.
- **Suggested direction:** Add an `idempotency_keys` table (`key`, `userId`, `requestHash`, `responseSnapshot`, `expiresAt`) and a small middleware that returns the cached response when a key is replayed within 24h.

---

## 2.6 Time, dates, timezones

**150 `new Date(...)` call sites in `apps/api/src`** (`grep -rcE "new Date\("` total). **37 references to `Asia/Kolkata`** for IST-anchored daily content. No `dayjs` or `date-fns` imports — pure JS Date.

### Hot spots

| Area | TZ handling | Risk |
|---|---|---|
| `scheduler.ts:78-79` reminder window | logs IST locale-string for humans; compares UTC ms | OK |
| `scheduler.ts:240-246` daily game content | checks IST hour via `Intl.DateTimeFormat` | F-029 — drift / missed-tick risk |
| Event start/end comparisons (`utils/eventStatus.ts`, `routes/events.ts`) | raw UTC ms | event "starts in IST" stored as UTC — confirm UI ↔ API contract |
| Attendance scan timestamp | raw UTC | F-061 client backdating |
| Certificate issuance time | raw UTC | OK |
| Reminder reservation marker | exact `Date` equality | F-027 in scheduler |

### Daylight Saving Time

India does not observe DST. So `Asia/Kolkata` is a fixed +05:30 offset; no DST transitions to handle. **However** the codebase mixes "convert to IST locale for human display" with "compute the IST day boundary for scheduling" — same code path, different intent. F-029 flags the scheduler-tick fragility.

### `todayIstDate()` helper

`games/lib/http.ts:34-43`:
```ts
export function todayIstDate(): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', ... });
  const [year, month, day] = formatter.format(new Date()).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
```

This converts current IST date to a UTC-midnight Date. Used for daily puzzle / brain-teaser key. **Pattern is correct.** All `Puzzle Run`, `Brain Teasers` daily readers use the same helper, so the key is consistent.

**No new findings in this section beyond F-029 and F-061.**

---

## 2.7 CORS lifecycle

Two CORS surfaces:
1. **Express CORS** in `index.ts:242-254` — `isAllowedBrowserOrigin` accepts dev localhost / FRONTEND_URL / ALLOWED_ORIGINS CSV.
2. **Socket.io CORS** in `utils/socket.ts:50-87` — accepts dev localhost, then private LAN dev, then FRONTEND_URL, then ALLOWED_ORIGINS — **but also accepts ALL `http://localhost:*` in production** (F-021).

**F-226 [LOW] [Phase 2] Two CORS origin allowlists exist in parallel — `index.ts` Express config and `socket.ts` config drift independently**
- **Suggested direction:** Extract a single `isAllowedBrowserOrigin(origin: string, opts: { isDevelopment: boolean }): boolean` from `index.ts:73-90` and call from both. Currently `socket.ts:71-82` re-implements the parse inline.

---

## 2.8 Schedulers / cron-like background work

Three intervals (`apps/api/src/index.ts`, `apps/api/src/utils/scheduler.ts`):

1. **DB keep-alive** (`index.ts:213-230`) — every 4 min, `SELECT 1`. Gated by `ENABLE_DB_KEEPALIVE=true`. After 3 failures, logs warning (no alert escalation). **OK.**
2. **Event status sync** (`index.ts:187-200`) — every 30 min, `updateEventStatuses()`. Gated by `ENABLE_BACKGROUND_SCHEDULERS=true`. **OK.**
3. **Reminder scheduler** (`scheduler.ts:startReminderScheduler`) — every 6 hours, sends reminders 24h before events. **F-030, F-031** documented.
4. **Game content scheduler** (`scheduler.ts:startGameContentScheduler`) — every 60 min, fires `ensureDailyGameContent()` only at IST hour 0. **F-029** documented.
5. **Cipher rotation** (`scheduler.ts:cipherRotationInterval`) — every 60 min, calls `rotateCipherChallenge()`. No window guard — runs every hour even when not needed.

**F-227 [MED] [Phase 2] No leader election / lock for scheduler runs — when scaled to 2+ instances, reminders/rotations race and multiplied**
- **Why this is wrong:** All schedulers use module-local intervals. The Render free tier prevents this today (single instance), but future scale-out duplicates emails.
- **Suggested direction:** Use a DB-row advisory lock (`pg_try_advisory_lock`) per scheduler tick; only the lock holder runs.

---

## 2.9 Logging hygiene

`logger.ts` is a thin wrapper around `console.{debug,info,warn,error}` with JSON-serialized context. Pattern is:
```
logger.error('something failed', { error: error.message, ... });
```

Issues:
- No request-ID propagation (F-041).
- Some routes use raw `console.error` (F-015 in `role.ts`).
- `requestLogger` is dev-only by default — production has no per-request log unless `ENABLE_REQUEST_LOGGING=true`.
- User names PII in audit metadata (F-067) and possibly in logs (need to verify per-route).

**No new top-level cross-cutting finding here beyond Phase 1; flagged for Phase 8.**

---

## 2.10 Audit log coverage

123 `auditLog(...)` call sites would be ideal. Let me spot-check.

```
grep -rcE "auditLog\(" apps/api/src --include='*.ts'
```

Spot-check of admin mutation endpoints with NO `auditLog` call:
- `/api/users/export` → F-127.
- `/api/upload/*` → no `auditLog`.
- `/api/mail/send` → has audit log (line 307-314 referenced in F-167).
- `/api/credits` POST → no audit log (F-172).
- `/api/settings/*` PATCH → confirm in dedicated route file.

**F-228 [HIGH] [Phase 2] Audit log coverage on admin mutations is incomplete — `/api/upload`, `/api/users/export`, `/api/credits`, and likely more lack auditLog calls**
- **Suggested direction:** Lint rule: every router handler that includes `authMiddleware + requireRole('ADMIN' or higher)` must call `auditLog`. Or move audit-logging into a wrapper middleware.

---

## 2.11 New cross-cutting findings summary

| ID | Severity | Title |
|---|---|---|
| F-220 | HIGH | Logout is cookie-clear-only; no server-side invalidation |
| F-221 | MED | Schema has no User suspension flag |
| F-222 | HIGH | Ownership-check coverage inconsistent (14+ admin endpoints) |
| F-223 | LOW | Error response shapes inconsistent (4+ shapes) |
| F-224 | LOW | `VALIDATION_ERROR` vs `VALIDATION_FAILED` duplicated |
| F-225 | MED | No idempotency-key support — retries duplicate side-effects |
| F-226 | LOW | Two CORS origin allowlists drift |
| F-227 | MED | No leader election for schedulers — duplicates on scale-out |
| F-228 | HIGH | Audit log coverage incomplete on admin mutations |
