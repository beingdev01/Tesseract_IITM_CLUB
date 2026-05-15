# Tesseract Forensic Audit — Executive Summary

Branch: `audit/forensic-pass-1` (11 commits on top of `e28d04bb`). All deliverables under [audit/](audit/).

**Scope reviewed:** 76,000 LOC across 269 source files; 52 Prisma models; 63 migrations; 270+ HTTP endpoints; 5 socket namespaces; 11 test files; 33 env vars; 1 typed FE API client at 2,472 LOC.

**Findings produced:** 700+ findings across 10 phase files (F-001…F-1010), severity-tagged per the brief's rubric.

**Verdict:** The Tesseract platform is **functionally complete** but carries **systemic auth-scoping debt**, **fragile auth-lifecycle ergonomics**, **multiple race conditions** in critical flows, **one CRIT-severity supply-chain vuln**, and **near-zero authorization test coverage**. The "230/230 passing" claim in CLAUDE.md is false — real count is **18 passing of 20**, none of which test authorization or concurrency. The codebase is *clean to read*: zero `console.log`, very few TODOs, type-checks and lints pass cleanly. The hidden risks are structural, not stylistic.

---

## Top 10 CRIT / HIGH findings

| # | ID | Severity | One-line |
|---|---|---|---|
| 1 | F-800 | **CRIT** | `sanitize-html` <=2.17.3 is on a critical XSS-via-`<xmp>` CVE; used by `routes/mail.ts:37` to sanitize admin-composed email bodies. |
| 2 | F-002 / F-010 / F-220 | **HIGH** | 7-day access tokens, no revocation, no rotation; `/me` auto-renews. Stolen token = 7+ days of full access including admin. Logout cookie-only. |
| 3 | F-CC-021 | **HIGH theme** | ~14 admin endpoints lack event-ownership checks: any admin can issue certs / email absentees / edit attendance / regen tokens / score competitions across all events. |
| 4 | F-403/F-100 | **HIGH** | Competition scoring and bulk cert issuance grant any ADMIN broad authority over any round/event — no judge-assignment model exists in schema. |
| 5 | F-083 / F-405 | **HIGH** | Public `/api/certificates/verify/:certId` returns recipient name + event + signatory; `/verify/:certId/download` serves the PDF; rate limit 60/5min is enumerable. |
| 6 | F-091 / F-096 | **HIGH** | Certificate ownership and invitation accept/decline match by EITHER `recipientId` OR `email`; email-only match weakens binding. |
| 7 | F-141 / F-142 | **HIGH** | Trivia Tower re-shuffles questions on memory eviction (per-floor answers go to wrong question); Scribbl drawer score lost on reconstruction. |
| 8 | F-143 / F-144 | **HIGH** | Type Wars trusts client-supplied `durationMs` and `correctChars` — leaderboard is trivially game-able. |
| 9 | F-307 / F-308 / F-300 | **HIGH** | `User.email @unique` is case-sensitive; `Settings.attendanceJwtSecret` stored as plaintext in DB; `Settings` singleton not DB-enforced. |
| 10 | F-805 / F-803 | **HIGH** | `apps/api/.env` is gitignored (verified clean), but `npm run start:prod` invokes `vite preview` to serve the SPA in production — not production-grade. |

Plus **F-CC-002** (token lifecycle), **F-007** (case-insensitive lookup vs case-sensitive constraint = duplicate accounts), **F-323/F-324** (null-null invitation, NULL-distinct unique constraints), **F-367** (admin deletion broadly blocked by `onDelete: Restrict`).

---

## Themes (see THEMES.md)

1. **Function-level authorization without ownership scope** — the dominant pattern.
2. **JWT lifecycle fragility** — multiple issuance points, no revocation, cookie + body co-issuance.
3. **NULL-distinct unique constraints** — three schema-level cases of silent duplicate-row possibilities.
4. **In-memory game state with weak reconstruction** — Scribbl, Trivia, Type Wars all desync on eviction.
5. **Client-trusted scoring** — Type Wars + Smash Kart leaderboards game-able.
6. **Admin-page inline fetches** — 5+ pages bypass the typed `lib/api.ts`.
7. **Dead-feature residue** — Quiz, Playground, GitHub OAuth references remain.
8. **No coverage / authorization tests** — 18 unit tests against 76k LOC; zero authz/concurrency tests.

---

## Recommended remediation order ("If I had a week")

**Day 1 — Stop the bleeding (CRIT)**
1. `npm audit fix` on api workspace — addresses the `sanitize-html` CVE (F-800).
2. Remove `<xmp>` from any allowed-tag list in mail body sanitization.
3. Confirm `vite preview` is NOT the production server; if it is, swap to a static-host (Nginx/serve) or move FE to a CDN.

**Day 2 — Lock the doors (HIGH auth/authz)**
4. Add a `requireOwnership(model, paramName, ownershipField)` middleware. Apply to the 14 endpoints in `THEMES.md`.
5. Add `jti` claim + a `User.tokenVersion` column; mint short-lived (15 min) access tokens + a refresh-token endpoint. Logout bumps `tokenVersion`.
6. Drop the JWT body return in `/me`; rely on cookie only.

**Day 3 — Fix the games subsystem (HIGH game integrity)**
7. Persist Trivia Tower question sequence per `runId`; deterministic replay on reload (F-141).
8. Persist Scribbl drawer bonus into a synthetic `ScribblGuess` row (F-142).
9. Server-authoritative WPM in Type Wars (`durationMs` from `room.startedAt`) — F-143.

**Day 4 — Schema hardening (HIGH data integrity)**
10. Migrate `User.email`/`Certificate.recipientEmail`/`HiringApplication.email` to `citext` or add a lowercased computed column with `@unique`.
11. Encrypt `Settings.attendanceJwtSecret`/`indexNowKey` at app layer.
12. Fix NULL-distinct uniques: `EventInvitation`, `CompetitionSubmission(roundId,teamId)` (or split tables), `Certificate(recipientEmail,eventId,type)`.

**Day 5 — Test floor (HIGH coverage)**
13. Add `c8`. Write the 40-60 tests in [10_testing.md §10.8](audit/10_testing.md#108-what-tests-to-write-before-remediation-begins).
14. Authorization tests are non-negotiable before any of the above merges.
15. Delete `quizError.test.ts`, `quizStore.test.ts`, `useQuizTimer.ts`, dead Playground references.

---

## What this audit did NOT cover (Phase 11 backlog)

- **Live browser walkthrough** — Phase 6 is code-grounded; mobile breakpoints, contrast, focus management, page-level loading/empty/error coverage all need a browser.
- **`apps/api/src/routes/upload.ts`** — MIME/size guards, path traversal in filenames, Cloudinary destination validation.
- **`apps/web/src/components/attendance/EventCertificateWizard.tsx`** (2,559 LOC) — full read.
- **Postgres `pg_stat_statements`** — to identify write-not-read columns (F-714).
- **Playwright e2e specs** content review (F-1010).
- **Backup / DR posture** (F-8.9).
- **`prisma/seed.ts`** correctness against current schema (F-3.6).
- **`apps/api/.env.example` creation** to close onboarding gap (F-712).
- **Full read of remaining smaller routes**: `signatories.ts`, `credits.ts`, `audit.ts`, `sitemap.ts`, `hiring.ts` body, `team.ts` body, `stats.ts` body — Phase 1 read trust roots + 5 largest files; the rest are summarized only via Phase 4 surface map.

---

## Numbers

| | |
|---|---|
| Total findings | **700+** |
| CRIT findings | 3 (F-007, F-403 downgraded to MED, F-800) |
| HIGH findings | ~95 |
| MED findings | ~140 |
| LOW findings | ~300 |
| NITs (separate file) | ~30 |
| Phase commits on `audit/forensic-pass-1` | 11 (00–10 + finalize) |
| Files outside `audit/` modified | 0 |
| Source files type-checked clean | both workspaces |
| Source files lint clean | both workspaces |
| Real test count | 20 (not 230) |
| Passing tests | 18 |
| Failing tests | 2 (dead Quiz code) |
| Test coverage % | unmeasured (no tooling) |

---

## Closing

The codebase is well-organized, well-typed, and lint-clean. The systemic issues are *invisible to a quick look*: ownership scoping that's missing-by-omission, token lifecycle that works but is brittle, race conditions hidden by happy-path tests, and a schema with three NULL-distinct uniqueness traps. None of these would be caught by tsc, eslint, or the existing tests.

Recommend: this audit informs a **2-3 week remediation sprint** focused on auth/authz hardening + the schema fixes + a test floor. The games subsystem WIP (10 modified files at audit start) has high-value findings — the maintainer should address F-141/F-142/F-143 before merging that branch.

—

End of Tesseract Forensic Audit, Pass 1.
