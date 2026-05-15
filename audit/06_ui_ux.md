# Phase 6 — UI / UX Audit (code-grounded)

No live browser available in this audit pass. Findings are derived from reading [apps/web/src/App.tsx](apps/web/src/App.tsx), the shared UI components, and component-level patterns via grep. UX claims that need visual verification are tagged **`needs browser`**.

Findings start at `F-600`.

---

## 6.1 Global infrastructure (App.tsx)

`App.tsx` is 220 LOC. It provides:

- `QueryClientProvider` with sensible defaults (`staleTime: 5m`, `gcTime: 30m`, `retry: 1`, `refetchOnWindowFocus: false`).
- `AuthProvider`, `SettingsProvider`, `ErrorBoundary` (top-level + per-route).
- `Suspense` with `PageLoader` (lazy-loaded routes).
- `Toaster` from `sonner`, top-right, dark themed with mono font.
- `ScrollToTop` on every navigation.
- `ProtectedRoute minRole="..."` for `/dashboard`, `/admin`.
- `SuperAdminOrPresidentRoute` for `/admin/settings`.
- `NotFound` 404 page with link home.

### Findings

- **F-600 [HIGH] [Phase 6]** **No `/polls` or `/polls/:slug` route is registered**, but CLAUDE.md §12 notes that poll cards link to those paths. Verified by grep — App.tsx has no `path="/polls"`. Clicking a poll link in the FE lands on the 404 page.
- **F-601 [HIGH] [Phase 6]** **No `/games/:id/competition/...` routes** registered for the competition gameplay/result flow that CLAUDE.md §12 also flags. The event-detail page renders links to these paths that don't resolve.
- **F-602 [LOW] [Phase 6]** `/admin/settings` is gated by `SuperAdminOrPresidentRoute`, but `/admin/*` requires `minRole="ADMIN"`. Normal admins see the admin shell but the Settings link redirects them. Verify the side-nav hides the Settings entry for non-Presidents (`needs browser`).
- **F-603 [LOW] [Phase 6]** `/dashboard` requires `minRole="USER"`. NETWORK users (who collapse to USER level per F-013) can access the dashboard — but the dashboard is club-member-focused (events, certificates). UX mismatch for network users.
- **F-604 [LOW] [Phase 6]** The 404 page (lines 201-218) is custom and informative. Good. But it doesn't include a "search" or "browse" affordance — just `← GO HOME`.
- **F-605 [LOW] [Phase 6]** `PageLoader` is a single blinking "> loading…" — minimal but distinctive. No skeleton variants per route. **`needs browser`** to assess perceived perf.

---

## 6.2 Per-page coverage signal (from grep)

| Pattern grep | Count of files |
|---|---|
| `Loading\|Spinner\|Skeleton` | 84+ files (out of 143) |
| `ErrorBoundary\|error\.message\|toast\.error\|sonner` | 60+ files |
| `aria-live\|role="alert"` | **only 5 files** |

### Findings

- **F-606 [MED] [Phase 6]** **Accessibility: only 5 files use `aria-live` or `role="alert"`** to surface async state changes to screen readers. Toast notifications from `sonner` are accessible by default (verify their ARIA implementation), but inline form-validation errors, async-action results, and live-update banners likely do not announce. WCAG 2.1 compliance gap.
- **F-607 [MED] [Phase 6]** ~59 of 143 files lack any loading/error indicator from a quick grep. Some are utility components that don't fetch — but pages like `OnboardingPage`, `PrivacyPolicyPage`, certain admin sub-pages may have unguarded fetches. **`needs browser`** to confirm.

---

## 6.3 Toast usage

- Toaster mounted at top-right with mono-font dark style.
- 10+ files use `toast.error(...)` / `toast.success(...)` (Phase 0 grep). Concentration: forms (TeamCreateModal, TeamJoinModal, AdminEventInvitations), attendance flows (AttendanceManager, EventCertificateWizard), event pages.

### Findings

- **F-608 [LOW] [Phase 6]** Toast position is top-right and dark-themed. **`needs browser`** to assess overlap with the header/nav. The dark+mono style is on-brand but may reduce contrast for color-blind users.
- **F-609 [LOW] [Phase 6]** No explicit auto-dismiss timing override in `Toaster` props (line 120-123). Sonner default is ~4s. Long error messages may exceed read time. **`needs browser`**.

---

## 6.4 Form validation

`react-hook-form` + `@hookform/resolvers` + `zod` (per `package.json`). Form validation should be schema-driven. Grep `useForm\|resolver` count: not separately captured, but Phase 0 noted these deps in `apps/web`.

### Findings

- **F-610 [LOW] [Phase 6]** Form validation strategy not consistently documented. Some pages use `react-hook-form` (presumably with Zod resolver); others may use raw `useState` and validate on submit. Audit Phase 7 dead-code pass will identify which pages have `react-hook-form`. **`needs browser`** to check inline-on-blur vs on-submit consistency.
- **F-611 [LOW] [Phase 6]** `<form-error.tsx>` exists under `components/ui/` — suggests a shared component for inline errors. Whether every form uses it is unverified. **`needs browser`**.

---

## 6.5 Empty / loading / error / partial / stale states (structural)

Without a live browser walk, an exhaustive page-by-page state audit isn't possible in this pass. Structural observations:

- React Query is configured globally with `refetchOnWindowFocus: false`. This is good for performance but means stale data lingers when the user returns to a tab. No `staleTime` overrides per page are apparent (would need to verify in each `useQuery` call site).
- `retry: 1` is global — one retry. Reasonable.
- No global "loading" skeleton mode visible in `App.tsx`; relies on `Suspense fallback` for route changes and per-component state for in-page fetches.

### Findings

- **F-612 [MED] [Phase 6]** No global `Sentry`/`PostHog`/`LogRocket` integration apparent in `App.tsx` or root. **The frontend has no error-reporting telemetry.** A user encountering an error must explicitly tell the maintainer. → Phase 9 perf.
- **F-613 [MED] [Phase 6]** `Suspense` is per-route; if a page's nested component lazily imports (it shouldn't but might), the fallback might be missing for that nested boundary. **`needs browser`**.
- **F-614 [LOW] [Phase 6]** `gcTime: 30m` is generous — cached responses live in memory for 30 minutes after they go stale, growing memory on long-lived tabs. For an admin browsing many events this can add up.
- **F-615 [LOW] [Phase 6]** No `WindowFocus` refetch means the user must explicitly refresh to see new data after returning to the tab. Tradeoff intentional but worth documenting.

---

## 6.6 Mobile / responsive

- Tailwind + tailwind-merge + Radix UI (per `package.json`) — modern responsive stack.
- No explicit `@media` queries hand-written (presumed all Tailwind utilities).
- `viewport`-related meta tags would be in `apps/web/index.html` — not audited in this pass.

### Findings

- **F-616 [MED] [Phase 6]** **`needs browser`** at 360px / 414px / 768px / 1024px / 1440px breakpoints. Without a live render, mobile flow cannot be verified.
- **F-617 [LOW] [Phase 6]** Tailwind class set has `responsive` plugin (default). Class drift between mobile-first and desktop-first is possible — flag for `needs browser` review.

---

## 6.7 Color / contrast / theme

- A "bracketed" terminal-style theme is in use (`lb-bracket`, `lb-mono`, `ts-blink` classes). Custom CSS at the app level (not Tailwind).
- Mono font: JetBrains Mono.
- Dark background `#000`, green accent (`var(--c-green)`), `--c-yellow`, `--c-red`, etc.

### Findings

- **F-618 [MED] [Phase 6]** **`needs browser`** for WCAG AA contrast on `--c-green` over `#000`, `--c-yellow` over `#000`. Custom themes routinely fail contrast checks.
- **F-619 [LOW] [Phase 6]** No `prefers-color-scheme` switch — the app is dark-mode only. Acceptable for the design intent; users with light-mode preference get no accommodation.

---

## 6.8 Keyboard / focus management

- Radix UI primitives (alert-dialog, dialog, dropdown-menu) handle focus automatically.
- Custom modals (`TeamCreateModal`, `TeamJoinModal`, `EventCertificateWizard`) build on top of Radix or custom code — focus management unverified.

### Findings

- **F-620 [MED] [Phase 6]** **`needs browser`** for tab-order through complex forms (EventCertificateWizard at 2,559 LOC has 5+ steps), focus return on modal close, escape-to-close behavior on custom dialogs.
- **F-621 [LOW] [Phase 6]** No `<SkipToContent>` link in the public layout — every page tab starts at the header. Accessibility nice-to-have.

---

## 6.9 Page-by-page risk scan (structural)

| Page | LOC | Risk |
|---|---:|---|
| `EventCertificateWizard.tsx` | 2,559 | Largest single component; 5+ wizard steps; high cognitive complexity; high finding probability |
| `EventDetailPage.tsx` | 1,656 | Public event detail + registration + team flows + competition link target (F-601 dead link) |
| `AdminCertificates.tsx` | 1,569 | Cert issuance UI |
| `AdminPublicView.tsx` | 1,426 | Poll public view admin; uses inline fetch (F-500) |
| `EditEvent.tsx` | 1,379 | Edit event; trusts `featured` toggle (F-116) |
| `CreateEvent.tsx` | 1,308 | Event creation flow |
| `AdminUsers.tsx` | 1,023 | Inline fetch (line 288, F-500); user export trigger |
| `AdminScanner.tsx` | 1,002 | QR-scan UX (camera permissions, offline scan via `useOfflineScanner`) |
| `AdminEventRegistrations.tsx` | 964 | Inline fetch (line 350, F-500); registration filtering |
| `AttendanceManager.tsx` | 953 | Attendance grid; bulk update UX |
| `AdminTeam.tsx` | 834 | Team member CRUD |
| `AdminEventInvitations.tsx` | 817 | Bulk invite UX |
| `SmashKartPlay.tsx` | 806 | In-browser game; client-trusted session (F-CC-042) |
| `AdminMail.tsx` | 744 | Bulk email composer; inline fetch |
| `AchievementsPage.tsx` | 717 | Public list w/ year filter |
| `JoinUsPage.tsx` | 692 | Hiring application form; inline fetch (line 32, F-500) |

### Findings

- **F-622 [MED] [Phase 6]** `EventCertificateWizard.tsx` at 2,559 LOC is **2.5× the next-largest component** and almost certainly has internal copy-paste / state-management complexity. Without reading the body, flag for follow-up Phase 11 (post-audit refactor backlog).
- **F-623 [HIGH] [Phase 6]** Three admin pages (`AdminUsers.tsx`, `AdminEventRegistrations.tsx`, `AdminMail.tsx`, `AdminSettings.tsx`) use inline `fetch(${import.meta.env.VITE_API_URL}/...)` instead of `api.ts`. These also won't go through `executeJsonRequest`'s 401 retry — admin sessions that expire mid-page show silent failures. → F-500, F-511.

---

## 6.10 Code.Scriet–specific UX heuristics

### Event registration flow

- `EventsPage` → `EventDetailPage` → "Register" button → registration form.
- Steps unknown without browser walk. Phase 4 confirmed `POST /api/registrations/events/:eventId` accepts custom fields.

### Member onboarding

- `OnboardingPage` exists (route `/onboarding`). Triggered for new users (`User.profileCompleted: false`).
- Detailed UX flow `needs browser`.

### Admin panel discoverability

- `DashboardLayout` is shared between `/dashboard` and `/admin`. The same shell with role-conditional nav items. `needs browser` to assess discoverability of sub-pages.

### Notification controls

- `Settings.email*Enabled` flags (per Phase 3 schema) control which categories of email fire.
- User-level opt-out for individual notifications: **NOT** in the schema. Only club-wide toggles.
- **F-624 [MED] [Phase 6]** No per-user notification preferences. A user cannot opt out of event reminders or hiring updates without club-wide changes. GDPR-adjacent.

### Search

- No global search box visible in `App.tsx`. Page-level filters exist (`AdminUsers` search, attendance `/search`).
- **F-625 [LOW] [Phase 6]** No site-wide search; user must navigate to specific filter UIs.

---

## 6.11 Specific issues from CLAUDE.md §12 (known gaps)

CLAUDE.md acknowledges:
1. **Competition frontend route mismatch** — Event detail links to competition play/result routes that are not currently registered in App.tsx. → F-601.
2. **Poll detail route mismatch** — Some poll cards link to `/polls/:slug`, but App.tsx does not currently define that public detail route. → F-600.
3. **Local manual QA still depends on seeded users** — out of scope for UX audit.

---

## 6.12 Phase 6 findings recap

| ID | Severity | Title |
|---|---|---|
| F-600 | HIGH | `/polls/:slug` route missing in `App.tsx`; poll links 404 |
| F-601 | HIGH | Competition play/result routes missing; event-detail links 404 |
| F-602 | LOW | `/admin/settings` gated tighter than rest of `/admin`; verify nav hides for non-Presidents |
| F-603 | LOW | NETWORK users can access `/dashboard` but it's club-focused |
| F-604 | LOW | 404 page has no search/browse affordance |
| F-605 | LOW | Single `PageLoader` for all routes; no per-route skeleton |
| F-606 | MED | Only 5 files use `aria-live`/`role="alert"` |
| F-607 | MED | ~59 of 143 files lack loading/error indicators (grep-based) |
| F-608, F-609 | LOW | Toast position/timing `needs browser` |
| F-610, F-611 | LOW | Form validation strategy varies |
| F-612 | MED | No FE error-reporting telemetry |
| F-613, F-614, F-615 | LOW | Suspense / cache / focus refetch quirks |
| F-616, F-617 | MED/LOW | Mobile breakpoints `needs browser` |
| F-618 | MED | Color contrast `needs browser` |
| F-619, F-620, F-621 | LOW | Theme / focus / a11y nice-to-haves |
| F-622 | MED | `EventCertificateWizard.tsx` complexity 2,559 LOC |
| F-623 | HIGH | Admin pages use inline fetch — duplicates F-500, F-511 |
| F-624 | MED | No per-user notification preferences |
| F-625 | LOW | No site-wide search |

---

## 6.13 What's blocked without a browser

These need a live render:
- Mobile responsive breakpoints
- Color contrast values
- Toast overlap with header
- Focus management on custom modals
- Tab order through long forms
- Page-by-page empty/loading/error state coverage
- Form validation strategy (on-blur vs on-submit)
- Side-nav visibility for role-gated pages

Recommend a 1-day browser walkthrough as Phase 11 follow-up.
