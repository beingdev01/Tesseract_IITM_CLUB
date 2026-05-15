# Phase 10 — Testing Gaps

Diagnostics:
- `npm run test:stability` exit 1 (2 failures); `node --test` runs unit tests.
- 11 test files total (per Phase 0 §9).
- No coverage script.

Findings start at `F-1000`.

---

## 10.1 Actual vs claimed test count

CLAUDE.md states "230/230 passing." The reality, verified by running:

- `npm run test:stability` reports **20 tests, 18 pass, 2 fail** (`apps/web/tests/quizError.test.ts` and `apps/web/tests/quizStore.test.ts`).
- Of the 18 passing, the breakdown:
  - `apps/api/src/utils/email.test.ts` — covers markdown→HTML sanitization
  - `apps/api/src/utils/generateCertificatePDF.{init,smoke}.test.ts` — cert PDF rendering smoke tests
  - `apps/api/src/utils/jwt.test.ts` — token signing
  - `apps/api/src/utils/scheduler.test.ts` — scheduler start/stop idempotency
  - `apps/web/tests/authToken.test.ts` — auth token utility
  - `apps/web/tests/competitionCertificateUtils.test.ts` — score aggregation (11 subtests)

### Findings

- **F-1000 [HIGH] [Phase 10]** **CLAUDE.md's "230/230" claim is false.** Real count is 20 tests, 18 passing, 2 broken. Updating CLAUDE.md is a documentation hygiene issue, but the bigger problem: a "230" anchor was used to dismiss the rest of this audit ("trust the tests, not the audit"). The audit has 600+ findings against 18 actual tests.
- **F-1001 [HIGH] [Phase 10]** **`quizError.test.ts` and `quizStore.test.ts` fail.** The Quiz feature was dropped per migration `games_platform_v2_and_qotd_drop`. These tests are dead and broken. → F-705. Remove.

---

## 10.2 Coverage report

**No coverage tooling configured.** Per Phase 0 §8, neither `c8`, `nyc`, nor `vitest --coverage` is installed. The 18 passing tests cover specific utilities — they do not measure how much of the 76k LOC source is exercised.

### Findings

- **F-1002 [HIGH] [Phase 10]** No code coverage measurement. Cannot answer "what % of routes have any test?" Strictly: ~0% of routes have route-level integration tests. Most of the 18 unit tests don't even import an Express app.
- **F-1003 [MED] [Phase 10]** Add `c8` and a `test:coverage` script. Baseline first, then enforce a per-file floor in CI.

---

## 10.3 Test quality sample

Per the brief §11, sample-audit at least 10 tests for tautology / does-it-meaningfully-test.

| Test | What it checks | Useful? | Notes |
|---|---|---|---|
| `email.test.ts: markdownToEmailHtml sanitizes raw HTML` | Calls markdown→html, asserts script tags stripped | ✓ Yes | Genuinely covers an XSS-relevant path |
| `email.test.ts: markdownToEmailHtml preserves safe tags` | Asserts `<a>` survives | ✓ Yes | Pairs with above |
| `generateCertificatePDF.init.test.ts: initFonts retries cleanly` | Mocks font loader, asserts retry on transient failure | ✓ Yes | Real behavior test |
| `generateCertificatePDF.smoke.test.ts: returns a non-empty PDF` | Calls generator, asserts `buffer.length > 0` | ⚠ Smoke only | Doesn't validate PDF content |
| `generateCertificatePDF.smoke.test.ts: accepts team-specific metadata` | Same as above with team data | ⚠ Smoke only | |
| `jwt.test.ts: signAccessToken always issues 7-day tokens` | Decodes token, asserts `exp - iat ≈ 604800` | ✓ Yes | Tests the constant |
| `scheduler.test.ts: startReminderScheduler is idempotent` | Calls twice, asserts no double-interval | ✓ Yes | Real behavior |
| `authToken.test.ts` | Verifies LS read/write/clear pattern | ✓ Yes | FE-side unit |
| `competitionCertificateUtils.test.ts: best_selected_rounds ranks by each competitor best score` | Asserts ranking on synthetic data | ✓ Yes | Pure function test |
| `competitionCertificateUtils.test.ts: aggregation supports individual competitions` | Asserts payload shape | ✓ Yes | |

Of 10 sampled, 7 are genuinely useful, 3 are smoke-only.

### Finding

- **F-1004 [MED] [Phase 10]** Cert PDF tests verify "produces a buffer of size > 0" — they don't check whether the PDF actually contains the right recipient name, signatory, or layout. A regression that produced blank PDFs would still pass. Add an assertion on extracted text.

---

## 10.4 Integration / E2E tests

`e2e/api-smoke.spec.ts` and `e2e/web-smoke.spec.ts` (Playwright). Not run in this audit pass.

### Findings

- **F-1005 [HIGH] [Phase 10]** No `npm run test:e2e` was executed in this audit (would require a running server + Playwright setup). Per CLAUDE.md §11, the script exists. Verify it runs in CI; if not, the e2e tests are decoration.
- **F-1006 [HIGH] [Phase 10]** Two e2e specs for ~270 endpoints is **<1%** coverage of the API surface. Unhappy paths (401, 403, 409, validation failures), authorization (cross-event IDOR), concurrency, and Socket.io flows are entirely uncovered.

---

## 10.5 Unhappy-path coverage

Per the brief §11:
- 400 / 401 / 403 / 404 / 409 / 422 / 500 — none of the 18 unit tests assert on these. They're unit tests of pure functions / utilities.
- Authorization tests — none. There is no test that user A cannot read user B's certificate.
- Concurrency tests — none. No race-condition tests for the patterns flagged in Phase 1 (F-058, F-080, F-117, F-121, F-132).
- Idempotency tests — none.
- Cron / background worker tests — `scheduler.test.ts` covers start/stop idempotency only; no test for `processReminders` behavior under DB failure or duplicate-firing across replicas.
- Socket.io tests — none.

### Findings

- **F-1007 [HIGH] [Phase 10]** **Zero authorization tests.** The IDOR pattern (F-CC-021, ~14 specific endpoints) is the highest-severity theme in this audit. No test would catch a regression where an admin-only check is removed.
- **F-1008 [HIGH] [Phase 10]** **Zero concurrency / race-condition tests.** Phase 1 F-058 (attendance scan race), F-080 (invitation claim race), F-117 (poll vote race), F-121 (team-join race), F-132 (leader transfer race) — all happy-path-only.
- **F-1009 [MED] [Phase 10]** **Zero socket tests.** The games subsystem has 4 socket files with complex state machines (Phase 1 F-141-F-160). None are tested.

---

## 10.6 Untested files > 200 LOC

Of files >200 LOC (~80 files between api and web), only **5 have a sibling `.test.ts`**:
- `apps/api/src/utils/email.ts`
- `apps/api/src/utils/generateCertificatePDF.ts`
- `apps/api/src/utils/jwt.ts`
- `apps/api/src/utils/scheduler.ts`
- `apps/web/src/lib/authToken.ts` (`competitionCertificateUtils.ts` is also tested)

That leaves **~75 files >200 LOC with no companion test**, including:
- `attendance.ts` (2,477 LOC) — security-critical scan flows
- `competition.ts` (1,861 LOC) — race-prone autosave + submission
- `certificates.ts` (1,828 LOC) — bulk generation, owner-match
- `invitations.ts` (1,480 LOC) — claim race
- `events.ts` (1,407 LOC) — registration flows
- `network.ts` (1,430 LOC) — verification idempotency
- `polls.ts` (1,166 LOC) — vote race
- `users.ts` (836 LOC) — role-change guards
- Every game socket file (riddle-room, scribbl, trivia-tower, type-wars, both routers and state)

---

## 10.7 Playwright spec coverage (per Phase 0)

`e2e/api-smoke.spec.ts` and `e2e/web-smoke.spec.ts`. Without running them, the file names indicate "smoke" — likely a health check (`GET /health`) and a homepage-loads test. Insufficient as e2e coverage.

### Finding

- **F-1010 [HIGH] [Phase 10]** Playwright `e2e/` directory has two smoke specs — these likely only verify "the server boots and the homepage renders." None of the actual user flows (event registration, attendance scan, certificate issuance, competition autosave) are tested e2e. Reading the specs (not done in this audit) would confirm.

---

## 10.8 What tests to write *before* remediation begins

Brief §14 asks for a recommended pre-remediation test list. Suggested floor:

1. **Authorization regression tests** — one test per ownership boundary identified in Phase 2 §2.3. Each test: user A creates resource; user B attempts unauthorized read/write; assert 403. Estimated 25 tests covering events, registrations, certificates, competition, network, invitations.
2. **Race-condition tests** — using `Promise.all` to fire concurrent identical requests. Eight tests for the eight race-prone endpoints (scan, claim, vote, join, transfer, dissolve, autosave, submission).
3. **Socket flow tests** — one happy-path test per game socket namespace, plus reconnect/eviction state-rebuild assertions (catches F-141, F-142).
4. **Mass-assignment tests** — for each "user-mutates-own" endpoint, send `{ role: 'ADMIN', isFeatured: true, ... }` and assert these fields are not persisted.
5. **Pagination tests** — for each list endpoint, ensure `take` cap is enforced even when client passes a high limit.
6. **Email sanitization** — XSS payload assertions for `mail.ts` including `<xmp>` bypass (F-800).
7. **Backfill / migration safety** — `init.ts` slug backfill should run idempotently; assert two consecutive runs produce identical slug sets.

Estimated 40-60 new tests. Acquire `c8` for coverage tracking before/after.

---

## 10.9 Phase 10 findings recap

| ID | Severity | Title |
|---|---|---|
| F-1000 | HIGH | CLAUDE.md "230/230" claim is false; real count is 20 |
| F-1001 | HIGH | Two failing quiz tests against removed code |
| F-1002 | HIGH | No coverage tooling configured |
| F-1003 | MED | Add `c8` + baseline |
| F-1004 | MED | Cert PDF tests are smoke-only |
| F-1005 | HIGH | Playwright e2e suite not exercised in CI; verify |
| F-1006 | HIGH | 2 e2e specs for ~270 endpoints |
| F-1007 | HIGH | Zero authorization tests despite IDOR being top theme |
| F-1008 | HIGH | Zero concurrency tests despite multiple race-condition findings |
| F-1009 | MED | Zero socket tests for 4 socket-heavy games |
| F-1010 | HIGH | Playwright specs likely only "homepage loads" smoke |
