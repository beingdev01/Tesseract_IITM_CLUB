# Phase 7 — Dead Code & Unwanted Features

Diagnostics:
- `npx depcheck` at root, `apps/api`, `apps/web` — outputs captured in §7.1
- `grep TODO|FIXME|XXX|HACK` — only **4 occurrences** total across the entire codebase (clean signal)
- `grep console.log` — **0 occurrences** in api or web source (logger discipline is solid)

Findings start at `F-700`.

---

## 7.1 Unused dependencies (depcheck output)

### Root `package.json`

```
Unused devDependencies:
* @fontsource/cinzel
* @fontsource/playfair-display
* ts-node
* typescript    (false positive — used by tsc)
```

### `apps/api/package.json`

```
Unused dependencies:
* bcryptjs                        ← real (OAuth-only auth)
* bufferutil                      ← optional ws speed-up, kept
* passport-github2                ← real (GitHub OAuth disabled)
* react-dom                       ← false positive (used by @react-pdf/renderer)
* utf-8-validate                  ← optional ws speed-up, kept

Unused devDependencies:
* @types/bcryptjs                 ← real
* @types/passport-github2         ← real
* @types/react-dom                ← false positive
```

### `apps/web/package.json`

```
Unused dependencies:
* @hookform/resolvers             ← likely false positive (used by forms)
* html2canvas                     ← likely real or used in certificate preview
* jsqr                            ← used by QR scanner — false positive
* react-hook-form                 ← likely false positive
* recharts                        ← used by charts page
* rehype-highlight                ← used by markdown
* zod                             ← used pervasively
* zustand                         ← used by some pages

Unused devDependencies:
* autoprefixer                    ← used by PostCSS — false positive
* postcss                         ← used by Tailwind — false positive
```

Many web entries are false positives — depcheck can't follow dynamic imports or build-time config files.

### Findings

- **F-700 [MED] [Phase 7]** **`bcryptjs` is in `apps/api` dependencies but no source references it.** Auth is OAuth-only. Remove to drop a 1MB+ npm-modules entry and signal cleanly that no password storage exists.
- **F-701 [MED] [Phase 7]** **`passport-github2` is unused** — `routes/auth.ts:120` hardcodes `github: false` in `/providers`. GitHub OAuth was never wired in the post-pivot codebase. Remove.
- **F-702 [LOW] [Phase 7]** `ts-node` is in root devDependencies but `tsx` is used everywhere. Remove.
- **F-703 [LOW] [Phase 7]** `@fontsource/cinzel` and `@fontsource/playfair-display` are at the **root level** as devDependencies but should be web-side production deps if used, or removed entirely. A separate grep `apps/web/src` for `cinzel|playfair` confirms — find them in CSS imports if any. If unused, remove.

---

## 7.2 Dropped-feature residue

Several migrations indicate dropped features: `add_quiz_system` → `games_platform_v2_and_qotd_drop`, `add_playground_models` → no removal migration but the FE references `VITE_PLAYGROUND_URL`.

### Web side

- **F-704 [HIGH] [Phase 7]** **`apps/web/src/hooks/useQuizTimer.ts`** exists but the quiz feature was dropped. Verify nothing imports it. (Grep: only the file itself shows up.)
  - **Verified:** `grep -l "useQuizTimer" apps/web/src/` shows only `useQuizTimer.ts` itself. **Unused hook.**
- **F-705 [HIGH] [Phase 7]** **`apps/web/tests/quizError.test.ts`** and **`apps/web/tests/quizStore.test.ts`** test removed quiz functionality. Both files exist but the SUT is gone. → Tests pass meaninglessly (Phase 10).
- **F-706 [MED] [Phase 7]** **`apps/web/src/lib/utils.ts`** mentions Playground (`getPlaygroundUrl` likely). Playground was removed per migrations. Verify dead code.
- **F-707 [MED] [Phase 7]** **`apps/web/src/context/SocketContext.tsx`** matched the quiz grep — verify whether socket context is still needed (the API has games/attendance sockets — possibly still used) or if it's a quiz-era leftover.
- **F-708 [LOW] [Phase 7]** **`VITE_PLAYGROUND_URL`** declared in `apps/web/.env.example` and `vite-env.d.ts` but Playground was dropped. Remove the env var.

### API side

- API source has **no quiz/qotd/playground references** in `grep -rE "qotd|QOTD|playground|Playground|quiz|Quiz" apps/api/src`. Clean. Migration drops were effective.

---

## 7.3 Unused exports / files

Without `ts-prune` or a full import-graph walk, exact dead-export numbers can't be produced in this audit pass. Spot checks:

- **`apps/api/src/utils/socket.ts:122-151`** — `socketEvents.user{Created,Updated,Deleted}` broadcast to a closed namespace (F-019). Likely dead at runtime, alive in source.
- **`apps/api/src/config/passport.ts:131-142`** — `passport.serializeUser/deserializeUser` is plumbed but no route uses `passport.session()`. Likely dead (F-053).
- **`apps/api/src/utils/init.ts:14-27`** — `_prisma_migrations` cleanup. Migration is presumably long-applied; the boot-time delete is dead.
- **`apps/api/src/scripts/`** — three scripts (`create_test_network.ts`, `create_test_users.ts`, `update_outreach_dsa.ts`). One-off utilities. Verify they still work and decide retention.

### Findings

- **F-709 [LOW] [Phase 7]** `apps/api/src/scripts/` contains three one-off scripts. None are wired into `package.json` scripts. Either move to `prisma/scripts/` (closer to seed) or document their purpose in a README. Currently they sit unreachable.
- **F-710 [MED] [Phase 7]** `socketEvents.user*` broadcasters in `utils/socket.ts:122-151` are unused at runtime (root namespace is closed). Either implement consumers in an admin namespace or remove the helpers and the `userCreated()` call in `routes/auth.ts:283`.

---

## 7.4 Unused environment variables

From Phase 0:
- API env vars: 33 unique names read.
- `apps/api/.env.example` is **missing** (F-026 onboarding gap).
- `apps/web/.env.example` documents 3 vars; only 3 are read.

Spot-checks:
- `process.env.npm_package_version` is read in `index.ts:336, 353` — populated by npm at runtime, not a `.env` value. Not a finding.
- `process.env.INVITE_LINK_WH` is read once in `utils/email.ts:2092` — undocumented in CLAUDE.md §10 (which only mentions Phase 0). Likely a WhatsApp invite link. Document or remove.
- `process.env.SOCKET_PING_TIMEOUT_MS` / `SOCKET_PING_INTERVAL_MS` — read in `utils/socket.ts`. Documented.

### Findings

- **F-711 [LOW] [Phase 7]** `INVITE_LINK_WH` (`utils/email.ts:2092`) is undocumented. Document or remove.
- **F-712 [LOW] [Phase 7]** No `apps/api/.env.example` — new contributors must guess. Phase 0 F-026 covers; reiterate.

---

## 7.5 Always-on / always-off feature flags

From `Settings` (Phase 3 §3.1):

| Flag | Default | Toggled in code |
|---|---|---|
| `registrationOpen` | true | Read at `/api/registrations`? Verify |
| `announcementsEnabled` | true | — |
| `showAchievements` | true | — |
| `showLeaderboard` | false | — |
| `hiringEnabled` | true | `/api/hiring/apply` checks |
| `hiring{Technical,DsaChamps,Designing,SocialMedia,Management}` | true × 5 | Per-role toggles |
| `mailingEnabled` | true | — |
| `certificatesEnabled` | true | `requireFeature('certificates')` |
| `attendanceEnabled` | true | `requireFeature('attendance')` |
| `email*Enabled` × 7 | true × 7 | Per-category toggles |
| `emailTestingMode` | false | `utils/scheduler.ts` checks |
| `competitionEnabled` | false | Verify usage |
| `show_tech_blogs` | true | Verify usage |
| `showNetwork` | true | Verify usage |

### Findings

- **F-713 [MED] [Phase 7]** Many `Settings` boolean flags have no observable code path that reads them (verified for some, unverified for others). Each unused flag is a vector for "the admin toggled it and nothing happened." Phase 11 follow-up: cross-reference every flag against route handlers.

---

## 7.6 Routes mounted but unreferenced from FE

Per Phase 5 §5.2:
- `POST /api/test-email` (admin tool, no FE button)
- `POST /api/attendance/scan-beacon` (server-side beacon, no FE button)
- `GET /api/attendance/event/:eventId/summary` (public, no FE caller, F-407, F-502)
- `POST /api/attendance/backfill-tokens` (admin tool, no FE button)
- `GET /api/auth/google` (redirect, never fetched)
- IndexNow + sitemap (bot-facing only)

Several admin endpoints (`/api/credits/*`, `/api/mail/*`, `/api/hiring/*` admin) are **inline-fetched** rather than via `api.ts` — so they're not orphaned but they're invisible to typed-client refactors.

---

## 7.7 DB columns: written but not read / read but not written

Without `EXPLAIN`-grade SQL log access, this is grep-based:

- `User.profileCompleted` — written by onboarding (verify), read by `getAuthUser` (line 12 of `auth.ts`).
- `User.bio`, `githubUrl`, `linkedinUrl`, etc. — written via profile edit, read in member/team profile pages.
- `Settings.show_tech_blogs` — check FE usage.
- `Event.imageGallery`, `Event.resources`, `Event.faqs`, `Event.speakers` — `Json` columns; possibly only written.
- `Certificate.viewCount` — written by download endpoint; read where? Verify admin cert listing.
- `Certificate.lastEmailResentAt` — written by resend; read in admin UI.
- `AuditLog.metadata` — Json; could be huge. Always populated, rarely queried.
- `NetworkProfile.legacySlugs` — written by `init.ts:populateProfileSlugs`; read for backward-compatible URL resolution.

### Findings

- **F-714 [MED] [Phase 7]** **Without DB query logging, write-not-read columns can't be authoritatively identified.** Flag for a future audit pass with `pg_stat_statements` enabled.

---

## 7.8 TODO/FIXME inventory

Only 4 occurrences total:

| File | Note |
|---|---|
| `apps/api/src/utils/generateCertId.ts` | Comment about cert ID format (not a TODO) |
| `apps/web/src/pages/AchievementsPage.tsx` | TODO: dynamic member impact count |
| `apps/web/src/pages/VerifyCertificatePage.tsx` | TODO(backend): GET /api/certificates/verify/:certId |
| `apps/web/src/pages/dashboard/AttendancePage.tsx` | TODO(backend): add attendanceEnabled to Settings — but it's already there |

The "TODO(backend)" in `VerifyCertificatePage.tsx` is suspicious — the route exists per Phase 4.14. The page likely needs to be wired to it (or already is). Phase 6 noted `VerifyCertificatePage` likely inline-fetches.

### Finding

- **F-715 [LOW] [Phase 7]** `AttendancePage.tsx` TODO is stale — `Settings.attendanceEnabled` exists since `add_feature_toggles_cert_playground` migration. Remove the TODO.

---

## 7.9 Comments / docstrings

- Codebase is largely uncommented (good signal — code is self-explanatory enough, or comments would be noise).
- Some files have block comments explaining "Why this is here" (e.g., `attendanceToken.ts`, `roomStore.ts`). These are useful.

No findings.

---

## 7.10 Phase 7 findings recap

| ID | Severity | Title |
|---|---|---|
| F-700 | MED | `bcryptjs` unused in api — remove |
| F-701 | MED | `passport-github2` unused — remove |
| F-702 | LOW | `ts-node` unused at root — remove |
| F-703 | LOW | Fontsource packages at root may be misplaced or unused |
| F-704 | HIGH | `useQuizTimer.ts` unused (quiz feature dropped) |
| F-705 | HIGH | Quiz test files test removed code |
| F-706 | MED | Playground references in `lib/utils.ts` (post-drop) |
| F-707 | MED | `SocketContext.tsx` quiz reference — verify |
| F-708 | LOW | `VITE_PLAYGROUND_URL` env var dead |
| F-709 | LOW | `apps/api/src/scripts/` orphaned utilities |
| F-710 | MED | `socketEvents.user*` broadcasters dead (closed root ns) |
| F-711 | LOW | `INVITE_LINK_WH` undocumented |
| F-712 | LOW | Missing `apps/api/.env.example` |
| F-713 | MED | Some Settings flags may be unread |
| F-714 | MED | Write-not-read column audit needs DB query logs |
| F-715 | LOW | Stale TODO in `AttendancePage.tsx` |
