# THEMES — meta-patterns and unified remediation directions

For each recurring pattern, a single meta-fix beats fixing the individual instances. Themes are ordered by remediation leverage (high → low).

---

## T-01 — Function-level authorization without ownership scope

**Findings:** F-063, F-064, F-065, F-069, F-071, F-091, F-096, F-099, F-100, F-115, F-116, F-119, F-122, F-126, F-127, F-129, F-134, F-135, F-139, F-401, F-402, F-405, F-407, F-CC-012, F-CC-020, F-CC-021.

**Pattern:** ~14+ endpoints use `requireRole('CORE_MEMBER'|'ADMIN')` as the only gate and accept any resource ID from the request. There's no notion of "event organizer" or "judge" or "co-admin" in the schema.

**Meta-fix:**
1. Add an `EventOrganizer` join table (`eventId`, `userId`, `role: 'OWNER'|'CO_ORGANIZER'|'JUDGE'|'SCANNER'`) — replaces the current "all admins are global admins" model.
2. Introduce a middleware factory:
   ```ts
   requireResourceAccess<T>(model: PrismaModel, paramName: string, action: 'read'|'write'|'admin')
   ```
   that resolves the resource → its parent event → checks `EventOrganizer` for the caller. Falls open to ADMIN/PRESIDENT for break-glass.
3. Migrate the 14+ flagged endpoints to use it.
4. Add the corresponding authorization tests (Phase 10 §10.8 #1).

**Effort:** Schema migration + middleware + ~20 route patches + 25 tests. ~2 weeks.

---

## T-02 — JWT lifecycle fragility

**Findings:** F-001, F-002, F-008, F-010, F-011, F-012, F-220, F-CC-040, F-046, F-048, F-005, F-053.

**Pattern:** Tokens are 7 days, no revocation, no rotation, no `jti`, `/me` auto-renews, OAuth issues three tokens per login (cookie + URL code + exchange-code response), exchange code is reusable within 30s, three cookie parsers, deserialized but never used.

**Meta-fix:**
1. New `signSession({userId, tokenVersion, jti})` helper. 15-minute expiry.
2. New `User.tokenVersion Int @default(0)` column.
3. Refresh-token endpoint `POST /api/auth/refresh` that mints a new access token if `(jti, tokenVersion)` matches.
4. Logout bumps `tokenVersion` — all outstanding sessions invalidate.
5. Mark exchange-code single-use via a `(jti, used: bool)` ephemeral cache (5-minute Redis or in-memory Map).
6. Drop body-side token return in `/me`; cookie-only.
7. Consolidate cookie parsing into one helper.

**Effort:** 1 week, mostly contained to auth router + middleware + utils/jwt.ts.

---

## T-03 — NULL-distinct unique constraints

**Findings:** F-323, F-324, F-331, F-332, F-357.

**Pattern:** Postgres treats `NULL` as distinct in unique constraints. The schema relies on `@@unique` over `(a, b)` where `b` is nullable — silently allowing duplicates when `b` is null.

**Cases:**
- `EventInvitation.@@unique([eventId, inviteeUserId])` — null `inviteeUserId` ⇒ duplicate email-only invites.
- `CompetitionSubmission.@@unique([roundId, teamId])` — null `teamId` ⇒ duplicate individual submissions.
- `Certificate.@@unique([recipientEmail, eventId, type])` — null `eventId` ⇒ duplicate non-event certs.

**Meta-fix:** Three migration approaches:
1. Add partial unique indexes: `CREATE UNIQUE INDEX ... WHERE inviteeUserId IS NOT NULL` paired with `CREATE UNIQUE INDEX ... WHERE inviteeEmail IS NOT NULL`. (Doesn't require schema change but doesn't carry into Prisma queries.)
2. Replace nullable columns with non-null defaults + a sentinel (`'_'` for emails).
3. Split into two tables (`EventInvitationByUser`, `EventInvitationByEmail`) with separate uniques. Cleanest but high migration cost.

**Effort:** Schema migration + small handler updates. 2-3 days.

---

## T-04 — In-memory game state with weak reconstruction

**Findings:** F-141, F-142, F-143, F-144, F-145, F-147, F-148, F-152, F-157, F-196, F-205.

**Pattern:** `RoomStore` evicts after 10-min idle. Games reconstruct from persisted state — but Trivia Tower re-shuffles questions, Scribbl drops drawer score, Type Wars resets charsTyped, riddle hint state is in-memory.

**Meta-fix:**
1. For Trivia Tower: persist the question sequence (`runId`-keyed JSON array of `(questionId, shuffleSeed)`) at room creation; reconstruct deterministically.
2. For Scribbl: persist drawer bonus into `ScribblGuess` as a synthetic row (`guesserId === drawerId`, `correct: false, pointsAwarded: 50`); reconstruction sums correctly.
3. For Type Wars: persist `participant.charsTyped` periodically; server-authoritative `durationMs`.
4. For Riddle Room: persist `hintsUsed`, `currentOrder` on every state change (currently only `currentOrder` is via updateMany CAS).

**Effort:** ~1 week across 3 game subsystems.

---

## T-05 — Client-trusted scoring

**Findings:** F-143, F-144, F-CC-042 (Smash Kart), F-153 (Type Wars rate).

**Pattern:** Type Wars accepts `durationMs`, `correctChars` from client. Smash Kart accepts entire session result blob.

**Meta-fix:**
1. Type Wars: derive `durationMs` from `Date.now() - room.startedAt`; reject client value.
2. Type Wars: server keystroke buffer with periodic `progress:update`; compute `correctChars` server-side at finish.
3. Smash Kart: server-side game state (or accept that it's a "trust the player" leaderboard and flag entries as "self-reported" in the UI).
4. Add WPM/score sanity caps in `gameSchemas.ts`; entries above the cap don't make the leaderboard.

**Effort:** 2-3 days for Type Wars; Smash Kart is a product decision.

---

## T-06 — Admin pages bypass the typed API client

**Findings:** F-500, F-511, F-623, F-507.

**Pattern:** `AdminSettings.tsx`, `AdminMail.tsx`, `AdminUsers.tsx`, `AdminEventRegistrations.tsx`, `JoinUsPage.tsx`, `SignInPage.tsx`, `VerifyCertificatePage.tsx` use inline `fetch()` with `import.meta.env.VITE_API_URL` instead of `lib/api.ts`.

**Meta-fix:**
1. Export `API_BASE_URL` from `lib/api.ts`; remove inline definitions.
2. Add missing functions to `lib/api.ts`:
   - Mail: `getMailRecipients`, `sendMail`
   - Credits: `getCredits` (public), `createCredit`, `updateCredit`, `deleteCredit`, `reorderCredits`
   - Hiring: `getHiringApplications`, `getHiringApplication`, `updateHiringStatus`, `deleteHiringApplication`, `getHiringStats`, `exportHiringApplications`
   - Settings: `resetSettings`, `syncEventStatus`
   - Auth: `getAuthProviders` (used by sign-in inline)
   - Stats: `getStats`, `getStatsTrends`
   - Audit: `purgeAuditLogs`
3. Migrate each admin page to use the typed functions.

**Effort:** 3-4 days. Mostly tedious replacement.

---

## T-07 — Dead-feature residue

**Findings:** F-704, F-705, F-706, F-707, F-708, F-700, F-701, F-807.

**Pattern:** Migrations dropped Quiz, Playground, GitHub OAuth, password auth. Source still references all of them.

**Meta-fix:** A single PR labeled `chore/dead-feature-cleanup`:
- Delete `apps/web/src/hooks/useQuizTimer.ts`
- Delete `apps/web/tests/quizError.test.ts`, `quizStore.test.ts`
- Remove Playground refs in `lib/utils.ts`, `vite-env.d.ts`, `.env.example`
- Remove `passport-github2`, `@types/passport-github2`, `bcryptjs`, `@types/bcryptjs` from `apps/api/package.json`
- Remove the `github: false` line from `routes/auth.ts:120` (or replace with explicit "OAuth providers: ['google']" array)
- Remove the dead password edit field in `AdminUsers.tsx`
- Remove `@fontsource/cinzel`, `@fontsource/playfair-display`, `ts-node` from root `package.json`
- Remove `useQuizTimer`-related code from `SocketContext.tsx` (verify socket context is still needed for live games)

**Effort:** 1 day.

---

## T-08 — Audit-log silent failures

**Findings:** F-023, F-024, F-127, F-228.

**Pattern:** `auditLog()` is `Promise<void>` that catches errors and logs them. Admin mutations succeed even when audit fails. Several admin endpoints lack `auditLog` entirely.

**Meta-fix:**
1. Change `auditLog` to return `Promise<boolean>` (`true` if persisted, `false` otherwise).
2. Optional `strictAudit` setting: throw on failure to force handler-level rollback.
3. Wrap audit-required handlers with an `auditedHandler(action, entity, fn)` HOF that calls fn, then audits, and rejects on audit failure (in strict mode).
4. Add coverage: every admin route handler must have a `auditLog` call. Enforce via ESLint plugin or runtime middleware tracking.

**Effort:** 2 days + a global pass over admin handlers.

---

## T-09 — Error contract drift

**Findings:** F-CC-030, F-CC-031, F-CC-032, F-503, F-504.

**Pattern:** Coexisting shapes: `ApiResponse.success/error` (canonical), plain `{ error: string }` (auth router), unwrapped business objects (`/exchange-code`, `/verify`). FE has `searchUsers` branching on two shapes.

**Meta-fix:**
1. Migrate `routes/auth.ts` to use `ApiResponse` end to end.
2. Migrate `/exchange-code` to wrap response in `{success, data: {...}}`.
3. Update FE `getMe` and `getMeWithToken` to use one canonical unwrap; remove the dual `searchUsers` branch.
4. Generate an OpenAPI spec from `ApiResponse` schemas to lock the contract going forward.

**Effort:** 1 week for migration + spec generation.

---

## T-10 — No test floor for authorization or concurrency

**Findings:** F-1002, F-1005, F-1006, F-1007, F-1008, F-1009, F-1010.

**Pattern:** 18 unit tests, zero authz tests, zero race tests, zero socket tests. CLAUDE.md claims "230/230" — false.

**Meta-fix:**
1. Add `c8` for coverage.
2. Write 40-60 tests per Phase 10 §10.8.
3. Authorization tests are non-negotiable before any of T-01 lands.
4. Update CLAUDE.md test count to reality; add a CI badge that prevents regression.

**Effort:** 1-2 weeks (tests are real implementation work).

---

## T-11 — Schema rough edges

**Findings:** F-300 (case-sensitive email), F-301 (Role enum 7 values), F-304 (no suspended flag), F-307 (Settings singleton not DB-enforced), F-308 (plaintext secrets in DB), F-312 (no Timestamptz), F-329 (no team size cap), F-345 (audit null userId), F-348 (single hiring application), F-356 (cert email case-sensitive), F-367/F-368 (cascade ergonomics), F-369-373 (migration hygiene).

**Pattern:** Schema choices that work at small scale but compound under volume.

**Meta-fix:** Migration batch (in priority order):
1. `User.email`, `Certificate.recipientEmail`, `HiringApplication.email` → `citext` (or computed lower-cased column).
2. Add `User.suspended Boolean @default(false)`.
3. Encrypt `Settings.attendanceJwtSecret`/`indexNowKey` at app layer.
4. Migrate event/competition/registration timestamps to `@db.Timestamptz`.
5. Allow `AuditLog.userId IS NULL` for system actors; drop the `audit.ts` short-circuit.
6. Soften `onDelete: Restrict` chains on `User` to a documented "you must reassign first" UI workflow OR add an admin-deletion utility that walks the relations.

**Effort:** 2 weeks, mostly migrations.

---

## T-12 — Side-channel mutations and singletons

**Findings:** F-027, F-307, F-028, F-036.

**Pattern:** `process.env.INDEXNOW_KEY` mutated at runtime from Settings; Settings table accessed via mixed `findUnique({id:'default'})` and `findFirst()`; two PrismaClient instances coexist (`utils/init.ts:7` vs `lib/prisma.ts`).

**Meta-fix:**
1. Introduce a typed `getConfig()` accessor that reads from Settings; cache 5 min; never write to `process.env` from app code.
2. Standardize all Settings reads on `findUnique({id:'default'})`.
3. Consolidate PrismaClient — remove `new PrismaClient()` in `utils/init.ts`.

**Effort:** 2-3 days.

---

## Summary of remediation order

| Priority | Theme | Effort | Severity blocked |
|---|---|---|---|
| 1 | T-01 (ownership scope) | 2 weeks | many HIGH IDORs |
| 2 | T-02 (JWT lifecycle) | 1 week | HIGH auth |
| 3 | T-10 (test floor) | 2 weeks (parallel with above) | enables all subsequent merges |
| 4 | T-04, T-05 (game integrity) | 1-2 weeks | HIGH game findings |
| 5 | T-08 (audit logs) | 2 days | HIGH compliance |
| 6 | T-03 (NULL-distinct uniques) | 2-3 days | HIGH data integrity |
| 7 | T-11 (schema rough edges) | 2 weeks | mixed HIGH |
| 8 | T-06 (FE API client unification) | 3-4 days | MED maintainability |
| 9 | T-07 (dead-feature cleanup) | 1 day | LOW hygiene |
| 10 | T-09 (error contract drift) | 1 week | MED maintainability |
| 11 | T-12 (side-channel mutations) | 2-3 days | MED hygiene |

**Total ballpark:** 6-8 person-weeks of focused work.
