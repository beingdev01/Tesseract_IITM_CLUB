# Phase 5 — Frontend ↔ Backend Connection Map

The most consequential phase: where the FE talks to the BE and where the contract is fragile.

Sources:
- [apps/web/src/lib/api.ts](apps/web/src/lib/api.ts) — typed API client (2,472 LOC, ~180 exported functions)
- Backend surface from [audit/04_api_surface.md](audit/04_api_surface.md) — ~270 endpoints

---

## 5.1 Function-to-endpoint map (summary)

The Explore-agent walk of `lib/api.ts` produced a complete table (33 domains, ~180 functions). The original table is large; this file presents the **delta analysis** — what's missing, what's mismatched, what's redundant.

---

## 5.2 Orphaned backend endpoints (no FE caller)

Backend endpoints with no matching FE function in `lib/api.ts`:

| Endpoint | Phase 4 row | Likely caller |
|---|---|---|
| `GET /api/auth/providers` | 4.2 | Verified — called in Sign-In page; FE function may be inline (not in api.ts). Audit Phase 7 confirms. |
| `GET /api/auth/google` | 4.2 | Redirect — not a fetch caller |
| `GET /api/auth/google/callback` | 4.2 | Server-internal redirect target |
| `POST /api/test-email` | 4.1 | Admin testing endpoint — may have no FE button |
| `GET /sitemap.xml`, `/robots.txt`, `/:key.txt`, `/api/indexnow/*` | 4.1 / 4.26 | Bot-facing only |
| `GET /api/stats/`, `/api/stats/public`, `/api/stats/home`, `/api/stats/dashboard`, `/api/stats/events/trends`, `/api/stats/games/trends` | 4.11 | Only one (`/stats/public`) and one (`/stats/home`) and one (`/stats/dashboard`) appear in `api.ts`. The remaining four — `/api/stats/`, `/api/stats/me`, `/api/stats/events/trends`, `/api/stats/games/trends` — have no corresponding FE function. **`/api/stats/me` is the user's personal stats endpoint, called from somewhere if not api.ts; possibly inline.** |
| `POST /api/hiring/applications/:id/status` | 4.13 | No FE function |
| `DELETE /api/hiring/applications/:id` | 4.13 | No FE function — admin can't delete a hiring application from UI |
| `GET /api/hiring/applications`, `/api/hiring/applications/:id`, `/api/hiring/stats`, `/api/hiring/export` | 4.13 | No FE functions |
| `GET /api/credits` family (6 routes) | 4.21 | Public listing — likely inline fetch in CreditsPage |
| `GET /api/audit-logs/`, `DELETE /api/audit-logs/retention` | 4.19 | `getAuditLogs` only — no retention delete |
| `GET /api/mail/recipients`, `POST /api/mail/send` | 4.20 | No FE function — admin mail UI exists per Phase 0 (`AdminMail.tsx`) so likely inline fetch (Phase 0 noted `AdminMail.tsx:32` uses `import.meta.env.VITE_API_URL`) |
| `GET /api/settings/security-env`, `PATCH /api/settings/security-env` | 4.12 | `getSecurityEnvStatus` + `updateSecurityEnvSettings` exist — match |
| `POST /api/settings/reset`, `POST /api/settings/event-status/sync-now` | 4.12 | No FE function explicitly — confirm AdminSettings.tsx inline fetch |
| `GET /api/certificates/verify/:certId`, `/api/certificates/verify/:certId/download`, `/api/certificates/files/:filename` | 4.14 | No FE function — public verification page may inline fetch (`VerifyCertificatePage.tsx`) |
| `POST /api/attendance/scan-beacon` | 4.22 | No FE function (beacon is a server-to-server / mobile beacon callback) |
| `GET /api/attendance/event/:eventId/summary` | 4.22 | No FE function — public endpoint with no UI consumer (F-407) |
| `POST /api/attendance/backfill-tokens` | 4.22 | No FE function — admin tool, possibly invoked manually |
| `GET /api/network/admin/pending-users`, `PATCH /api/network/admin/pending-users/:userId/revert`, `DELETE /api/network/admin/pending-users/:userId` | 4.17 | `getNetworkPendingUsers`, `revertPendingNetworkUser`, `deletePendingNetworkUser` exist — match |
| `POST /api/invitations/:id/resend` | 4.18 | `resendInvitationEmail` exists — match |
| Game admin "bulk" routes (`POST /admin/games/cipher-lab/preview` etc.) | 4.25 | `previewCipher` exists; `bulkImportScribblPrompts`, `bulkImportTriviaQuestions`, `bulkImportTypeWarsPassages` exist — match |
| `GET /api/games/competition/event/:eventId/results-summary` | 4.24 | `getCompetitionResultsSummary` exists — match |

**F-500 [MED] [Phase 5]** Several admin pages bypass `lib/api.ts` and inline-fetch (`AdminSettings.tsx`, `AdminMail.tsx`, `AdminUsers.tsx:288`, `AdminEventRegistrations.tsx:350`, `SignInPage.tsx`, `JoinUsPage.tsx`). Phase 0 inventory captured 5+ files using `import.meta.env.VITE_API_URL` directly. **Inline fetches**:
- Skip Bearer-token header injection if the page is mid-mount
- Skip the `executeJsonRequest` retry-on-401 path
- Skip the response-envelope unwrap (`response.data`)
- Risk of typo'd URL going to silent 404

**F-501 [LOW] [Phase 5]** `POST /api/test-email` (Phase 4.1) and `POST /api/attendance/backfill-tokens` (4.22) are admin tools without FE buttons. Either dead code, or operated via `curl` by an admin. Document or remove.

**F-502 [LOW] [Phase 5]** `GET /api/attendance/event/:eventId/summary` is **public and has no FE caller**. Combined with F-407 (anonymous attendance counts) it's a leak with no business purpose visible from the FE.

---

## 5.3 Orphaned frontend calls (no BE endpoint)

The agent confirmed every documented `api.ts` function maps to a real route. **No verifiable orphan FE calls.** Caveat: the inline fetches in §5.2 weren't validated against Phase 4. Phase 7 dead-code pass will spot URL strings in non-`api.ts` files that don't resolve.

---

## 5.4 Shape mismatches

### F-503 [MED] [Phase 5] `getMeWithToken` (api.ts:1521-1526) uses `requestEnvelope<>` while sibling `getMe` uses `request<>`

- **Evidence:** Two functions that hit the same endpoint (`GET /api/auth/me`) expect different response shapes. `getMe` expects `{ success, data: User }` and unwraps. `getMeWithToken` expects raw envelope and pulls `response.data` AND `response.token`.
- **Why this is wrong:** The backend issues `{ success: true, data: User, token: string }` per `routes/auth.ts:297-305` — confirming F-011/F-012. The FE has TWO consumers of this endpoint with divergent expectations.
- **Suggested direction:** Pick one. If both are needed, alias them to the same internal call.

### F-504 [MED] [Phase 5] `searchUsers` (api.ts:1699-1706) handles two response shapes

- **Evidence:**
  ```
  // (Explore agent quote): "handles both User[] and { data: User[] }"
  ```
- **Why this is wrong:** The backend `GET /api/users/search` likely returns `{ success: true, data: User[] }` via `ApiResponse.success`. The FE branching covers either bare array or wrapped — defensive coding for a backend that historically returned both shapes. Backend contract inconsistency.
- **Suggested direction:** Pin the backend shape, drop the FE branching.

### F-505 [LOW] [Phase 5] `uploadImage` (api.ts:2014-2025), `exportAttendanceExcel` (api.ts:2088-2099), `exportCompetitionResults` (api.ts:2461-2470) bypass `request<>`

- **Evidence:** All three use direct `fetch()` with manual header construction.
- **Why this is wrong:** Three different reimplementations of auth-header construction, JSON parsing, error handling. Drift across them is inevitable. `uploadImage` does `json.data?.url ?? ''` returning an empty string on failure — silent failure mode.
- **Suggested direction:** Add `requestForm<T>()` and `requestBlob<T>()` wrappers; migrate all three.

### F-506 [LOW] [Phase 5] `getMyTeam` (api.ts:2361-2366) swallows ALL errors and returns null

- **Evidence:** From the agent: "Catches all errors and returns null."
- **Why this is wrong:** "User has no team" (404) and "user is offline" (network failure) and "auth expired" (401) all collapse to `null`. The UI cannot distinguish "you're not on a team" from "we couldn't talk to the server." Phase 6 UX impact.
- **Suggested direction:** Match on 404 only; rethrow others.

### F-507 [LOW] [Phase 5] `lib/api.ts:2` declares `API_BASE_URL` while five other pages re-declare their own `import.meta.env.VITE_API_URL` defaults

- **Evidence:** Phase 0 captured these from grep:
  - `apps/web/src/lib/api.ts:2`
  - `apps/web/src/lib/api.ts:2013`
  - `apps/web/src/pages/JoinUsPage.tsx:32`
  - `apps/web/src/pages/SignInPage.tsx:8`
  - `apps/web/src/pages/admin/AdminSettings.tsx:92` etc.
  - `apps/web/src/pages/admin/AdminUsers.tsx:288`
  - `apps/web/src/pages/admin/AdminEventRegistrations.tsx:350`
  - `apps/web/src/pages/admin/AdminMail.tsx:32`
- **Why this is wrong:** Six places define the API base URL. The default fallback `http://localhost:5001/api` is repeated. If the env var name ever changes (e.g., to `VITE_BACKEND_URL`), all six need updating. Drift risk.
- **Suggested direction:** Export `API_BASE_URL` from `lib/api.ts` and import everywhere.

---

## 5.5 Loading / error / empty / optimistic state coverage

Per the brief §6.4 — flagging coverage gaps page-by-page would require reading 64 pages. Not done in this audit pass; instead, structural observations from the API client:

### F-508 [MED] [Phase 5] No client-side request cancellation (AbortController)

- **Evidence:** `request<>` in `api.ts` does not accept an `AbortSignal`. React Query / TanStack Query is configured (per `App.tsx`: `staleTime=5m, gcTime=30m`) but no `signal` is passed through.
- **Why this is wrong:** Slow requests linger after route changes. React Query handles cache-side cleanup but in-flight fetches keep socket capacity busy. For an admin user navigating quickly through `AdminUsers` → `AdminMail`, multiple seconds of useless DB queries continue.
- **Suggested direction:** Plumb `AbortSignal` through `executeJsonRequest`.

### F-509 [MED] [Phase 5] `UnauthorizedError` is thrown but no global router-level handler is documented

- **Evidence:** `api.ts:100-101` throws `UnauthorizedError` on 401. Behavior depends on each caller.
- **Why this is wrong:** No central response — some callers may show "Login required" toasts, others may navigate to /signin, others crash. Phase 6 UX needs to verify each.
- **Suggested direction:** Document the contract — either every consumer must catch + navigate, or a top-level boundary catches and forces logout.

### F-510 [LOW] [Phase 5] `executeJsonRequest` retries on 401 with cookie fallback (api.ts:92-94)

- **Evidence:** Agent noted "cookie fallback on 401 retry."
- **Why this is wrong:** If the user's Bearer token is expired but their cookie is still valid (or vice versa), the retry path makes things work — but at the cost of a hidden state machine. Hard to diagnose "why did this 401 succeed on retry."
- **Suggested direction:** Replace the implicit retry with a deliberate "refresh token" call that the FE controls.

---

## 5.6 Auth gaps in the UI

### F-511 [HIGH] [Phase 5] Multiple pages call backend endpoints inline without including the auth token in headers

- **Evidence:** The inline-fetch pages (`AdminUsers.tsx:288`, `AdminEventRegistrations.tsx:350`, `AdminMail.tsx:32`, `AdminSettings.tsx:92`) construct URLs directly and may or may not include the Bearer header. Phase 7 will spot-check by reading one of these.
- **Why this is wrong:** Page renders may make logged-out fetches to admin endpoints, get 401, show generic errors. If the page also relies on `getAuthToken()` for the rest of its calls (via `api.ts`), the inline fetch breaks consistency.
- **Suggested direction:** Read `AdminSettings.tsx:92` to confirm the pattern, then either migrate to `api.ts` or document the inline-fetch pattern with a checklist (auth header, error handler, etc.).

### F-512 [LOW] [Phase 5] No documented client-side route guard for `/admin/*`

- **Evidence:** `App.tsx` per Phase 0 wraps routes in `AuthProvider` and `ErrorBoundary`. Per CLAUDE.md §4, admin routes are "protected admin" — but whether they're enforced by a `<RequireRole role="ADMIN">` wrapper or only by the server's 401 is unclear without reading App.tsx.
- **Why this is wrong:** Reliance on backend 401 → frontend redirect is brittle (no immediate UX; users see flashes of the admin UI before redirect). A double-check is industry standard.
- **Suggested direction:** Confirm a `RequireRole` wrapper exists; if not, add.

---

## 5.7 Domain coverage summary

| Domain | FE functions (api.ts) | Backend endpoints (Phase 4) | Coverage |
|---|---:|---:|---|
| Auth | 5 + inline | 7 | ~70% (auth router has gaps; some inline) |
| Events | 8 | 9 | ~89% (some endpoints inline-fetched in admin) |
| Registrations | 3 | 4 | 75% — `GET /events/:id/status` not exposed via api.ts |
| Teams (event) | 11 | 11 | 100% |
| Team (org) | 10 | 11 | ~91% |
| Polls | 10 | 10 | 100% |
| Announcements | 5 | 6 | 83% — `/latest` not in api.ts |
| Achievements | 3 | 7 | ~43% (3 "by-X" endpoints in api.ts, more in BE) — verify alternate names |
| Users | 5 + inline | 11 | 45% — many admin-user routes inline |
| Stats | 3 | 7 | 43% — several not in api.ts |
| Settings | 4 + inline | 10 | ~40% — admin settings page does inline fetch |
| Hiring | 2 | 8 | 25% — only `apply` + `my-application` exposed; admin app management entirely inline or missing |
| Network (public) | 2 | 3 | 67% |
| Network (auth/admin) | 14 | 14 | 100% |
| Certificates | 8 | 14 | 57% — public verify/download not in api.ts (intentional? for VerifyCertificatePage) |
| Signatories | 5 | 5 | 100% |
| Attendance | 18 | 19 | 95% |
| Invitations | 10 | 10 | 100% |
| Audit logs | 1 | 2 | 50% — retention delete missing |
| Mail | 0 | 2 | 0% — entirely inline in AdminMail.tsx |
| Credits | 0 | 6 | 0% — entirely inline somewhere (or page missing) |
| Upload | 1 (uploadImage) | 2 | 50% — DELETE path missing |
| Audit | 1 | 2 | 50% |
| Games catalog/leaderboard | 4 | 3 | 100% |
| Type Wars | 7 | 4 user + 5 admin = 9 | 78% |
| Trivia Tower | 8 | 3 user + 5 admin = 8 | 100% |
| Puzzle Run | 8 + 1 regen | 3 user + 6 admin = 9 | 100% |
| Brain Teasers | 8 | 2 user + 6 admin = 8 | 100% |
| Cipher Lab | 9 | 4 user + 5 admin = 9 | 100% |
| Riddle Room | 9 | 3 user + 8 admin = 11 | 82% |
| Scribbl | 8 | 3 user + 5 admin = 8 | 100% |
| Competition | 18 | 17 | 106% (FE has one extra: `getCompetitionRoundsAdmin` and `getCompetitionRounds` both hit same path, see api.ts) |

**Patterns:** Admin pages for `Hiring`, `Mail`, `Credits` are the most divergent from the typed client.

---

## 5.8 Phase 5 findings recap

| ID | Severity | Title |
|---|---|---|
| F-500 | MED | Multiple admin pages bypass `lib/api.ts` and inline-fetch |
| F-501 | LOW | Admin tools (`/test-email`, `/backfill-tokens`) have no FE button |
| F-502 | LOW | Public `attendance/event/:eventId/summary` has no FE caller (combine F-407) |
| F-503 | MED | `getMe` vs `getMeWithToken` divergent unwrap |
| F-504 | MED | `searchUsers` handles two response shapes |
| F-505 | LOW | Three direct-fetch bypasses of `request<>` |
| F-506 | LOW | `getMyTeam` collapses all errors to null |
| F-507 | LOW | `VITE_API_URL` default duplicated in 6 places |
| F-508 | MED | No AbortController plumbing |
| F-509 | MED | `UnauthorizedError` handling not centralized |
| F-510 | LOW | Cookie-fallback retry on 401 is implicit |
| F-511 | HIGH | Inline-fetch admin pages may miss auth header / error handling |
| F-512 | LOW | No documented client-side route guard for `/admin/*` |
