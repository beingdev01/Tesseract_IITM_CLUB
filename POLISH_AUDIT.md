# Tesseract — Polish Audit (Phase A)

> Generated 2026-05-04. Baseline: `npm run build` (root) succeeds for both `apps/web` and `apps/api`. Plan: `~/.claude/plans/tesseract-polish-rosy-quill.md`.
>
> **Method note:** This audit is a code walkthrough + dev-server build smoke + targeted file reads. I cannot drive a real browser session. Anything marked **`(needs live verification)`** is a code-level finding the user (or a later phase) must confirm by clicking through the running app. All other findings are direct code observations.

Severity legend: **🔴 high** = breaks usability or violates the spec exit criteria · **🟡 medium** = visible regression but app still works · **🟢 low** = polish item · **⚪ deferred** = out of scope for this pass with reason.

---

## 1 · Visual issues

### 1.1 The all-black theme has bad visibility

| # | Severity | Where | What's wrong |
|---|---|---|---|
| V1 | 🔴 | [apps/web/src/index.css:55](apps/web/src/index.css#L55) — `--line: rgba(255,255,255,0.08)` | Default border on cards/fields/dividers is so faint it disappears on `#0a0a0f` surfaces. Cards, inputs, and the page background blur into one another. This is the **core complaint** of §1.1 of the spec. |
| V2 | 🔴 | [apps/web/src/index.css:24,52](apps/web/src/index.css#L24-L52) — `--muted-foreground: 0 0% 42%` and `--fg-mute: rgba(255,255,255,0.42)` | White at 42% opacity on `#0a0a0f` measures ~3.0:1 — **fails WCAG AA for body text** (4.5:1). Used everywhere for labels, secondary text, footer text, helper copy. |
| V3 | 🔴 | [apps/web/src/index.css](apps/web/src/index.css) (no surface-elevation tokens) | `--bg / --bg-1 / --bg-2` exist but only differ by a few percent (`#000` → `#0a0a0f` → `#111118`). No clearly distinct levels for **page · card · elevated · field**. Adding a real elevation hierarchy is a Phase B deliverable. |
| V4 | 🟡 | [apps/web/src/index.css:175-187](apps/web/src/index.css#L175-L187) — `.lb-scanlines` overlay `rgba(0,0,0,0.03)` | Adds visual texture but compresses contrast further on already low-contrast UI. Worth re-tuning once tokens land. |

### 1.2 Form visibility — every form is partially broken

Two parallel form systems exist:

- **Tesseract-style** (`.t-input` / `.t-select` in [index.css:662-694](apps/web/src/index.css#L662-L694)) — used by [OnboardingPage](apps/web/src/pages/OnboardingPage.tsx#L142) and a few others. Reasonable dark-theme baseline but missing error state, ring on focus, and the disabled state is just `opacity: 0.5`.
- **shadcn-style** ([apps/web/src/components/ui/input.tsx](apps/web/src/components/ui/input.tsx)) — used by every dashboard/admin form. **This is the broken one.**

| # | Severity | Where | What's wrong |
|---|---|---|---|
| V5 | 🔴 | [apps/web/src/components/ui/input.tsx:12](apps/web/src/components/ui/input.tsx#L12) | `border-2 border-amber-200 bg-white px-4 py-2 text-sm text-gray-800` with a bolted-on `dark:` variant. Renders **white inputs with light-amber borders** in many places. Copy-paste artifact from a light-theme shadcn template. |
| V6 | 🔴 | every form using `<Input>` | Default shows no clear filled background, no required-field marker, no consistent error styling, no real focus ring. The spec's §1.2 list is **almost entirely failing** because of V5. |
| V7 | 🟡 | [apps/web/src/index.css:654](apps/web/src/index.css#L654) — `.t-label { font-size: 10px }` | 10px uppercase mono is hard to read at any distance on a HiDPI screen. Bump to ~11–12px in Phase B. |
| V8 | 🟡 | `.t-input:focus` only changes `border-color` (no ring) | Spec calls for visible focus ring. Phase C. |
| V9 | 🔴 | No shared error-rendering pattern | OnboardingPage uses an inline error box ([line 125](apps/web/src/pages/OnboardingPage.tsx#L125)); admin pages use Sonner toasts; some forms have nothing. Need a single `<FormError>` primitive. |
| V10 | 🟡 | No `<Textarea>` audit; raw `<select>` styled inline in some forms | Phase C should treat textarea + select as first-class. |
| V11 | 🔴 | [apps/web/src/pages/OnboardingPage.tsx:179](apps/web/src/pages/OnboardingPage.tsx#L179) | The "branch (read-only)" field uses inline `style={{ opacity: 0.5, cursor: 'not-allowed' }}` instead of the `:disabled` style. Inconsistent. |

### 1.3 Harsh yellow

`#ffd93b` is the brand color. Per kickoff Q1, we keep it as the brand accent but introduce `--c-yellow-soft` for backgrounds/large fills.

| # | Severity | Where | What's wrong |
|---|---|---|---|
| V12 | 🔴 | [apps/web/src/pages/AchievementDetailPage.tsx](apps/web/src/pages/AchievementDetailPage.tsx) | **Most broken page in the app.** Light-theme gradients (`from-gray-50 via-white to-amber-50/30`, `bg-amber-400 blur-xl`, `text-amber-500`, `from-amber-500 to-orange-500`, `bg-amber-100 text-amber-800`, `from-amber-900/40 to-orange-900/40`) — the loading state, the error state, and the hero are entirely light-theme designs that visually rip a hole in the dark app. **31 amber occurrences.** Full rebuild required in Phase D. |
| V13 | 🔴 | [apps/web/src/pages/AnnouncementsPage.tsx:85](apps/web/src/pages/AnnouncementsPage.tsx#L85) | Page background `bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100` for a public announcements feed. **15 amber occurrences.** Full rebuild required. |
| V14 | 🟡 | [apps/web/src/pages/AboutPage.tsx](apps/web/src/pages/AboutPage.tsx) | Uses `var(--c-yellow)` (`#ffd93b`) directly as accent fill for stats, manifesto headers, and principle blocks ([line 102](apps/web/src/pages/AboutPage.tsx#L102)). Not "broken" but reads as **harsh** because flat brand-yellow in large amounts strains the eye. Replace with `--c-yellow-soft` per Phase B token. |
| V15 | 🔴 | `apps/web/src/pages/admin/*` and `apps/web/src/pages/dashboard/*` | Heavy amber usage by file: EditEvent (49), CreateEvent (48), AdminCertificates (31), AdminMail (27), AdminUsers (20), AdminTeam (15), AdminPublicView (13), AdminEventRegistrations (12), AdminAuditLog (12), AdminAchievements (11). Each carries the old codescriet warm-amber aesthetic. Phase D walks each one. |
| V16 | 🟡 | [apps/web/src/components/home/Hero.tsx](apps/web/src/components/home/Hero.tsx), [AchievementsShowcase.tsx](apps/web/src/components/home/AchievementsShowcase.tsx), [NetworkHighlight.tsx](apps/web/src/components/home/NetworkHighlight.tsx), [UpcomingEvents.tsx](apps/web/src/components/home/UpcomingEvents.tsx), [CTASection.tsx](apps/web/src/components/home/CTASection.tsx) | The home **components** still have ~20 amber occurrences each despite the page-level HomePage looking clean. Audit per-component in Phase D. |
| V17 | 🟢 | [apps/web/src/pages/AnnouncementDetailPage.tsx](apps/web/src/pages/AnnouncementDetailPage.tsx), [AchievementsPage.tsx](apps/web/src/pages/AchievementsPage.tsx), [JoinUsPage.tsx](apps/web/src/pages/JoinUsPage.tsx), [PrivacyPolicyPage.tsx](apps/web/src/pages/PrivacyPolicyPage.tsx) | Mid-level amber usage (13–52 occurrences each); same treatment as V15 but lower priority. |
| V18 | 🟢 | [apps/web/src/components/ui/markdown.tsx](apps/web/src/components/ui/markdown.tsx) (12) | Markdown renderer styles use amber for headings/links. Will pull in tokens. |

### 1.4 The landing-page benchmark

The visual divide is real and clean:

- **Tesseract-style pages** (HomePage, AboutPage, SignInPage, OnboardingPage, EventsPage, GamesPage, LeaderboardPage, TeamPage) use `<Brackets>` / `<TesseractHero>` / `<GateBar>` / `<MetaChip>` and the `.lb-*` CSS classes. These look intentional.
- **Old codescriet-style pages** (every admin/* and dashboard/* page, EventDetailPage, AchievementDetailPage, AnnouncementsPage, AnnouncementDetailPage, AchievementsPage, JoinUsPage) still use raw Tailwind `amber-*`/`from-amber-*`/`to-amber-*` classes. These look out of place.

DashboardLayout sidebar nav specifically called out by `MIGRATION_NOTES.md` as primary visual debt — confirmed: [apps/web/src/components/dashboard/DashboardLayout.tsx](apps/web/src/components/dashboard/DashboardLayout.tsx) is on the wrong side of the divide.

---

## 2 · Functional issues

### 2.1 Auth · OAuth · onboarding

| # | Severity | Where | What's wrong |
|---|---|---|---|
| F1 | 🟡 (needs live verification) | [apps/api/src/config/passport.ts](apps/api/src/config/passport.ts) | Code path looks correct: Google OAuth → `iitmDomain.ts` → `InvalidDomainError` → 403/redirect for non-IITM. Branch derivation also correct. **Needs live test:** sign in with a personal Gmail (should bounce to `signin?error=invalid_domain`) and a fresh `@ds.study.iitm.ac.in` account (should land on onboarding, then dashboard). |
| F2 | 🟡 (needs live verification) | [apps/web/src/pages/OnboardingPage.tsx](apps/web/src/pages/OnboardingPage.tsx) | UserLevel dropdown enforces FOUNDATION/DIPLOMA/BSC/BS. Backend Prisma enum matches. Need to confirm that submitting an invalid level (curl) gets rejected. |
| F3 | 🟡 | Returning-user gate ([AuthCallbackPage.tsx](apps/web/src/pages/AuthCallbackPage.tsx) + AuthContext) | `profileCompleted` boolean determines onboarding redirect. Logic exists but should be verified end-to-end. |

### 2.2 Settings cascade

| # | Severity | Where | What's wrong |
|---|---|---|---|
| F4 | 🟢 | [apps/api/src/middleware/featureFlag.ts](apps/api/src/middleware/featureFlag.ts) | Middleware exists and is wired into the right routes. Phase E live-tests by toggling `attendanceEnabled` and `certificatesEnabled` and confirming both API gates and frontend nav hiding. |
| F5 | 🟡 (needs live verification) | [apps/web/src/components/dashboard/DashboardLayout.tsx](apps/web/src/components/dashboard/DashboardLayout.tsx) | Code reads `useSettings()` flags and conditionally renders nav items. Confirm in the running app that flipping a flag immediately updates the sidebar (settings cache TTL is 5 min — UI may need a refresh). |

### 2.3 RBAC

| # | Severity | Where | What's wrong |
|---|---|---|---|
| F6 | 🟡 (needs live verification) | [apps/api/src/middleware/role.ts](apps/api/src/middleware/role.ts) | Real role hierarchy is `PUBLIC | USER | NETWORK | MEMBER | CORE_MEMBER | ADMIN | PRESIDENT`. The spec called for MEMBER/CORE/ADMIN — adapt verification to the real model. Phase E walks each role tier with a real session. |
| F7 | 🟢 | [routes](apps/api/src/routes/) | Admin-only endpoints all use `requireRole('ADMIN')`. Single tier mismatch worth flagging: `PUT /api/settings` requires PRESIDENT-only ([settings.ts](apps/api/src/routes/settings.ts)) — confirm this is intentional. |

### 2.4 Mini-games

| # | Severity | Where | What's wrong |
|---|---|---|---|
| F8 | 🟢 | [apps/api/src/games/registry.ts](apps/api/src/games/registry.ts) | Only `competitionGame` is registered. Per `MIGRATION_NOTES.md` this is intentional for the Tesseract pivot. Verification: `GET /api/games/competition/health` returns `{ ok: true }`, scoring writes to `CompetitionSubmission`, leaderboard surfaces in event detail page. |
| F9 | ⚪ deferred | [apps/api/src/games/competition/index.ts:6](apps/api/src/games/competition/index.ts#L6) | Stale `TODO(frontend)` comment about updating `apps/web/src/lib/api.ts` to `/api/games/competition` — frontend already uses the new path ([api.ts:1980+](apps/web/src/lib/api.ts#L1980)). Comment is misleading; **delete in Phase E**. |
| F10 | ⚪ deferred | `/games` page in apps/web | `MIGRATION_NOTES.md` flags `TODO(backend)` markers for a leaderboard endpoint. Not in scope for this pass; flagged here for future. |

### 2.5 Stub pages — actually full implementations

| # | Severity | Where | Notes |
|---|---|---|---|
| F11 | 🟢 (needs live verification) | [apps/web/src/pages/dashboard/DashboardCertificates.tsx](apps/web/src/pages/dashboard/DashboardCertificates.tsx), [VerifyCertificatePage.tsx](apps/web/src/pages/VerifyCertificatePage.tsx), [admin/AdminCertificates.tsx](apps/web/src/pages/admin/AdminCertificates.tsx), [dashboard/AttendancePage.tsx](apps/web/src/pages/dashboard/AttendancePage.tsx), all `components/attendance/*` | These are full implementations, not stubs. Phase E verifies they cleanly hide when their flag is off (`certificatesEnabled` / `attendanceEnabled`) and surface no codescriet remnants. |

### 2.6 Console + network during a real session

| # | Severity | Where | Notes |
|---|---|---|---|
| F12 | 🟡 (needs live verification) | full app | Cannot test from code review alone. Phase E does the click-through. |

---

## 3 · Branding leaks

The spec's exit criterion: `grep -ri "code.?scriet\|ccsu\|scriet" code.scriet/` returns zero hits outside markdown audit/migration files. **Today it fails.** Confirmed leaks:

| # | Severity | Where | Action |
|---|---|---|---|
| B1 | 🔴 | [apps/web/public/sitemap.xml](apps/web/public/sitemap.xml) | Every URL is `https://codescriet.dev/...`. Rewrite all to `https://tesseract.iitm.ac.in/...` (the canonical domain already used by [SEO.tsx](apps/web/src/components/SEO.tsx#L12), [schema.tsx](apps/web/src/components/ui/schema.tsx#L31), etc.). |
| B2 | 🔴 | [apps/web/public/site.webmanifest](apps/web/public/site.webmanifest) | `name: "codescriet"`, description mentions SCRIET/CCSU. Rewrite. |
| B3 | 🔴 | [apps/web/public/robots.txt](apps/web/public/robots.txt) | References `codescriet.dev`. Rewrite. |
| B4 | 🔴 | [apps/web/public/logo.svg](apps/web/public/logo.svg) | Embeds the literal text `code.scriet` in the SVG. Replace with Tesseract wordmark or drop the text and rely on the bundled `Tesseract LOGO (1).png`. |
| B5 | 🟡 | [apps/web/.env.example](apps/web/.env.example) | Example URL `https://codescriet.dev`. Rewrite. |
| B6 | 🔴 | [apps/api/.env:43-44](apps/api/.env#L43-L44) | `EMAIL_FROM=code.scriet@codescriet.dev`, `EMAIL_FROM_NAME=code.scriet`. Per kickoff Q2: rewrite to a Tesseract placeholder, user replaces with verified Brevo sender. |
| B7 | 🟡 | [apps/api/public/logos/README.md](apps/api/public/logos/README.md) | Doc still references `codescriet.png` and `ccsu.png`. Rewrite. |
| B8 | 🟡 | [apps/api/src/routes/users.ts:391](apps/api/src/routes/users.ts#L391) | Excel export filename `code_scriet_users_*.xlsx`. Rename to `tesseract_users_*.xlsx`. |
| B9 | 🟡 | [apps/api/public/logos/ccsu.png](apps/api/public/logos/ccsu.png) (binary file) | Verify [generateCertificatePDF.ts](apps/api/src/utils/generateCertificatePDF.ts) no longer references it; if it does, drop the CCSU slot. |
| B10 | 🟢 | [code.scriet/CLAUDE.md](code.scriet/CLAUDE.md) | Entire 2,000-line doc still describes code.scriet (CCSU, codescriet.dev, `scriet_session` cookie, GitHub OAuth, quiz/playground systems that `MIGRATION_NOTES.md` says were stripped). Per plan: add a one-line stale banner pointing to MIGRATION_NOTES.md; do not rewrite in this pass. |
| B11 | 🟢 | grep config | Future grep should `--exclude *.md --exclude-dir migrations`. The branding-sweep verification command in the plan already does this. |

---

## 4 · Email gaps

Brevo infrastructure is **fully wired** ([apps/api/src/utils/email.ts](apps/api/src/utils/email.ts) — 16 send methods, per-category toggles, testing-mode redirect, 5-min settings cache). The work is template design + dev-mode short-circuit + sender identity.

| # | Severity | Where | What's wrong |
|---|---|---|---|
| E1 | 🔴 | [email.ts:393-403](apps/api/src/utils/email.ts#L393-L403) and similar | Templates use a **warm cream/brown** aesthetic (`#fff8ee`, `#5f3f2d`, `#c7a34d`). This is old codescriet styling, not dark-yellow Tesseract. Phase F rebuilds against design tokens. |
| E2 | 🔴 | [email.ts](apps/api/src/utils/email.ts) | All HTML hardcoded inline; no shared base layout, no template files. Phase F extracts `apps/api/src/utils/emailTemplates/baseLayout.ts` + per-template modules. |
| E3 | 🔴 | [email.ts](apps/api/src/utils/email.ts) | Plain-text fallback handling is via a generic `htmlToPlainText()` ([line 287](apps/api/src/utils/email.ts#L287)) — lossy on CTAs and links. Phase F adds explicit per-template `text` blocks. |
| E4 | 🔴 | [email.ts](apps/api/src/utils/email.ts) | No code-level dev-mode short-circuit. `emailTestingMode` is a Settings DB flag that requires DB + redirect setup. Phase F adds: if `BREVO_API_KEY` empty **or** `NODE_ENV !== 'production'` and no `EMAIL_FORCE_SEND=1`, log payload and skip Brevo. |
| E5 | 🔴 | [apps/api/.env:43-44](apps/api/.env#L43-L44) | `EMAIL_FROM` and `EMAIL_FROM_NAME` carry codescriet branding (also a B6 hit). Per kickoff: rewrite to Tesseract placeholders. |
| E6 | 🟡 | every template | No unsubscribe link, no "automated email" footer line, no preheader text. Phase F adds these to the base layout. |
| E7 | 🟢 | mobile compat | Templates not visibly mobile-tuned; no max-width 600px container or single-column collapse. Phase F base layout fixes this. |
| E8 | 🟢 | testing | No render-and-eyeball workflow exists. Phase F adds a tiny script (or just `node` REPL) that writes each template to a temp HTML file for visual review. |

### Email touchpoints — what currently sends

All of these methods exist in `EmailService` and are wired to call sites:

| Touchpoint | Method | Caller | Status |
|---|---|---|---|
| Welcome on first login | `sendWelcome` | [passport.ts](apps/api/src/config/passport.ts), [auth.ts](apps/api/src/routes/auth.ts) | ✅ Wired |
| Event registration confirmation | `sendEventRegistration` | [registrations.ts](apps/api/src/routes/registrations.ts), [teams.ts](apps/api/src/routes/teams.ts) | ✅ Wired |
| New event broadcast | `sendNewEventToAll` | [events.ts](apps/api/src/routes/events.ts) | ✅ Wired |
| Announcement broadcast | `sendAnnouncementToAll` | [announcements.ts](apps/api/src/routes/announcements.ts) | ✅ Wired |
| Poll broadcast | `sendPollToAll` | [polls.ts](apps/api/src/routes/polls.ts) | ✅ Wired |
| Event reminder | `sendEventReminder` | [scheduler.ts](apps/api/src/utils/scheduler.ts) | ✅ Wired (off by default — `ENABLE_BACKGROUND_SCHEDULERS`) |
| Event invitation | `sendEventInvitation` | [invitations.ts](apps/api/src/routes/invitations.ts) | ✅ Wired |
| Invitation withdrawn | `sendEventInvitationWithdrawn` | [invitations.ts](apps/api/src/routes/invitations.ts) | ✅ Wired |
| Certificate issued | `sendCertificateIssued` | [certificates.ts](apps/api/src/routes/certificates.ts) | ✅ Wired |
| Hiring application received | `sendHiringApplication` | [hiring.ts](apps/api/src/routes/hiring.ts) | ✅ Wired |
| Hiring selected | `sendHiringSelected` | [hiring.ts](apps/api/src/routes/hiring.ts) | ✅ Wired |
| Hiring rejected | `sendHiringRejected` | [hiring.ts](apps/api/src/routes/hiring.ts) | ✅ Wired |
| Network verified (alumni) | `sendAlumniWelcome` | [network.ts](apps/api/src/routes/network.ts) | ✅ Wired |
| Network verified (professional) | `sendNetworkVerified` | [network.ts](apps/api/src/routes/network.ts) | ✅ Wired |
| Network welcome | `sendNetworkWelcome` | [network.ts](apps/api/src/routes/network.ts) | ✅ Wired |
| Network rejected | `sendNetworkRejected` | [network.ts](apps/api/src/routes/network.ts) | ✅ Wired |

**No missing touchpoints** vs. the original spec — every one Phase F lists exists. Spec also called for an "admin notification (new user joined)" — that is **not currently wired** (no admin email on signup). Adding it is a small Phase F deliverable; flagging now.

---

## 5 · Items the spec assumed that are already done

For honesty / scope clarity:

- ✅ Brevo is wired with a real API key already in `apps/api/.env`.
- ✅ Branding sweep on **runtime text** is largely done (only the leaks in §3 remain).
- ✅ Certificate + attendance pages are **full implementations**, not stubs — feature-gated correctly.
- ✅ Auth flow with IITM domain check + branch derivation + UserLevel enum is implemented.
- ✅ `featureFlag.ts` middleware exists and is mounted on the right routes.
- ✅ Mini-games registry exists; `competitionGame` mounts cleanly under `/api/games/competition`.

---

## 6 · Prioritized action list (rolling into Phases B–F)

**Phase B (tokens):** V1, V2, V3, V4, V7
**Phase C (forms):** V5, V6, V8, V9, V10, V11
**Phase D (pages):** V12, V13, V14, V15, V16, V17, V18 + DashboardLayout sidebar
**Phase E (functional + branding):** F1, F2, F3, F4, F5, F6, F7, F8, F9, F12 + B1–B11
**Phase F (email):** E1, E2, E3, E4, E5, E6, E7, E8 + admin-on-signup notification

**Deferred with reasoning:**
- F10 (games leaderboard endpoint) — requires new backend work outside polish scope.
- B10 full CLAUDE.md rewrite — historical doc; banner only.
- B9 ccsu.png file deletion — keep file unless cert generator stops using it.
