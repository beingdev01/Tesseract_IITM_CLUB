# Migration Notes — code.scriet → Tesseract

## Overview

The `apps/web` frontend was rewritten from the CCSU/SCRIET coding club platform (code.scriet) into the **Tesseract** IITM BS student community platform. The Express backend (`apps/api`) is unchanged — only the frontend React/Vite app was migrated.

---

## 1. Auth: OTP Design → Google OAuth

**Design (auth.jsx):** Showed a 3-step OTP flow (email → OTP → join).  
**Implementation:** Google OAuth only (code.scriet already has Passport/Google configured).

The 3-step visual shell is preserved, but:
- Step 1 = Google sign-in button (redirects to `/api/auth/google`)
- Step 2 = backend validates domain (403 returned for non-@ds/@es accounts)
- Step 3 = `/onboarding` page for new users (yearLevel + branch)

**Why:** The build spec explicitly says Google OAuth. OTP was only in the design prototype.

---

## 2. Games API — All Calls are TODO(backend)

Games hub (`/games`, `/games/:id`) is fully built with UI but uses placeholder data. All API calls are stubbed:

```
// TODO(backend): GET /api/games
// TODO(backend): GET /api/games/:id
// TODO(backend): POST /api/games/:id/session
// TODO(backend): GET /api/leaderboard/game/:gameId
```

When the backend adds these endpoints, replace the `PLACEHOLDER_GAMES` array in `GamesPage.tsx` and `GameDetailPage.tsx` with `useQuery` calls.

---

## 3. Onboarding Fields Added

New fields expected by `OnboardingPage.tsx`:
- `yearLevel` (string: `Foundation | Diploma | BSc | BS`) — **not yet in User model**
- `branch` (string, derived from email subdomain) — **should be added to User model**

Current workaround: uses `PATCH /api/users/me` with `{ name, year }` (maps `yearLevel` to the existing `year` field). This is lossy — `year` was previously used for the academic year, not the program level.

```
// TODO(backend): POST /api/auth/onboarding — accepts { displayName, yearLevel };
// backend should set branch from email subdomain and add yearLevel to user model
```

---

## 4. Socket.io Stripped

The entire quiz socket system was removed:
- `SocketContext.tsx` — stubbed as a no-op provider
- `useQuizSocket.ts` — deleted
- Quiz pages (14 files in `src/pages/quiz/`) — deleted
- `quizStore.ts`, `quizScoring.ts`, `quizAccess.ts`, `quizErrors.ts` — deleted

**Why:** Quiz system is SCRIET-specific and not part of Tesseract's scope. If quiz functionality is ever added back, the backend quiz socket system (`apps/api/src/quiz/`) is still intact.

---

## 5. Leaderboard Remapping

Current leaderboard (`/leaderboard`) uses the QOTD leaderboard API (`GET /api/qotd/stats/leaderboard`). This is a placeholder.

Once games API is ready, the leaderboard should be remapped to game scores. The `DashboardLeaderboard.tsx` and public `LeaderboardPage.tsx` both use `api.getQOTDLeaderboard()` — replace these calls when `GET /api/leaderboard` exists.

---

## 6. Feature Flags

Settings fields used in stubs:
- `certificatesEnabled` — exists in `Settings` model ✓
- `attendanceEnabled` — **does NOT exist in `Settings` model** (TODO: add it)

`AttendancePage.tsx` currently hardcodes `enabled = true` with a TODO comment.

---

## 7. Pages Stripped

The following pages/routes were removed entirely:

| Page | Route | Reason |
|------|-------|--------|
| Quiz system | `/quiz/*` | SCRIET-specific |
| Network/alumni | `/network/*`, `/join-our-network` | No Tesseract equivalent |
| JoinUs/Hiring | `/join-us` | No hiring in Tesseract |
| Credits | `/credits`, `/admin/credits` | SCRIET-specific |
| Competition | `/admin/competition`, `/competition/*` | Out of scope |
| Polls | `/polls/*` | Out of scope |
| Playground | External app | Separate deployment |
| Contact | `/contact` | Out of scope |

---

## 8. Pages Stubbed (not wired to backend yet)

| Page | Status |
|------|--------|
| `/verify` | Shows "coming soon" (reads `certificatesEnabled`) |
| `/dashboard/certificates` | Reads `certificatesEnabled`, shows enabled/disabled state |
| `/dashboard/attendance` | Hardcodes enabled=true; reads `attendanceEnabled` (TODO: add to Settings model) |

---

## 9. Broken Stubs (no-ops)

Files that were deleted but still imported by kept pages — replaced with no-op stubs:

| Stub file | Was used by |
|-----------|-------------|
| `src/hooks/useMotionConfig.ts` | Home/team/event components (for reduced motion) |
| `src/hooks/useOfflineScanner.ts` | `AdminScanner.tsx` (full offline scan queue stripped) |
| `src/lib/playgroundUrl.ts` | `EventDetailPage`, playground cards |
| `src/lib/videoEmbed.ts` | `EventDetailPage` (normalizeTrustedVideoEmbedUrl) |
| `src/context/SocketContext.tsx` | `AdminUsersRealtime.tsx`, `AdminUsers.tsx` |

These stubs are type-compatible no-ops — the components compile and render but the functionality they powered is inactive.

---

## 10. Design System

Full Tesseract design system (Direction B — Geometric Arcade Terminal) applied:

- `index.css` — replaced all CSS tokens; added `.lb-*` classes (brackets, scanlines, grid bg, buttons, nav)
- `tailwind.config.js` — fonts: Audiowide/Inter/JetBrains Mono; colors: tesseract palette; borderRadius: 0rem
- New shared components: `src/components/tesseract/` — `Brackets`, `TesseractHero`, `GateBar`, `PageShell`

---

## 11. DashboardLayout

`DashboardLayout.tsx` still uses the old amber-style sidebar nav. It needs to be restyled to match the Tesseract design system — this is the primary remaining visual debt. The component is functional but visually inconsistent with the new design.
