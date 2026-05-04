# Backend Audit — Tesseract Pivot

Pre-implementation audit. Every file under `apps/api/src/{routes,middleware,utils,lib,attendance,quiz,config,scripts}` and every Prisma model marked `keep` / `modify` / `strip`.

## Routes (`apps/api/src/routes/`)

| File | Action | Reason |
|---|---|---|
| achievements.ts | keep | Generic achievements CRUD, no branding-coupled logic. |
| announcements.ts | keep | No changes needed. |
| attendance.ts | modify | Wire `requireFeature('attendance')` on QR/scan/manual-checkin endpoints. |
| audit.ts | keep | References `SUPER_ADMIN_EMAIL` — that env stays. |
| auth.ts | modify | Drop `/register`, `/login`, `/admin-login`, `/github*`. Gate `/dev-login` with IITM. Rename cookie. Move `IITM_DOMAINS` to shared util. |
| certificates.ts | modify | Wire `requireFeature('certificates')` on generate/bulk/regenerate. Public verify stays open. |
| competition.ts | keep (relocate via games registry) | REST-only router. Gets re-mounted under `/api/games/competition`. |
| credits.ts | keep | Tesseract-agnostic. |
| events.ts | modify (branding only) | Drop `codescriet` strings if any. |
| hiring.ts | modify (branding only) | Drop `CCSU` mentions if any. |
| invitations.ts | keep | Generic. |
| mail.ts | modify (branding only) | Email defaults reference codescriet. |
| network.ts | modify (branding only) | |
| playground.ts | modify (branding only) | |
| polls.ts | modify (branding only) | |
| qotd.ts | keep | |
| registrations.ts | modify | Skip attendance token gen when `attendanceEnabled=false`. |
| settings.ts | modify | Add `attendanceEnabled` to schema/select; invalidate feature-flag cache on PUT. |
| signatories.ts | keep | |
| sitemap.ts | modify | Branding URL refs. |
| stats.ts | keep | |
| team.ts | keep | |
| teams.ts | keep | |
| upload.ts | keep | |
| users.ts | modify | Drop `password` from update schema + bcrypt + `level` enum support. |

## Middleware (`apps/api/src/middleware/`)

| File | Action | Reason |
|---|---|---|
| auth.ts | modify | Rename `scriet_session` cookie to `tesseract_session`. |
| role.ts | keep | Hierarchy unchanged. |
| featureFlag.ts | **create** | New: `requireFeature('certificates' \| 'attendance')` with 5-min TTL cache. |

## Utils (`apps/api/src/utils/`)

| File | Action | Reason |
|---|---|---|
| attendanceToken.ts | keep | |
| audit.ts | keep | |
| dateStreak.ts | keep | |
| email.ts | modify (branding only) | Cache pattern is the reference for featureFlag. Defaults reference codescriet. |
| eventRegistrationFields.ts | keep | |
| eventStatus.ts | keep | |
| generateCertId.ts | keep | |
| generateCertificatePDF.ts | modify (branding only) | "code.scriet" appears in PDF defaults. |
| index.ts | keep | |
| indexnow.ts | modify (branding only) | Hardcoded codescriet.dev hostname. |
| init.ts | modify | Branding defaults; admin seed flow stays via `SUPER_ADMIN_EMAIL`. |
| invitationStatus.ts | keep | |
| jwt.ts | keep | |
| logger.ts | keep | |
| pagination.ts | keep | |
| processSignatureImage.ts | keep | |
| profileSync.ts | keep | |
| publicUrl.ts | keep | |
| registrationStatus.ts | keep | |
| response.ts | keep | |
| sanitize.ts | keep | |
| scheduler.ts | keep | |
| slug.ts | keep | |
| socket.ts | modify (branding only) | CORS allowlist. |
| socketAuth.ts | keep | |
| uploadCertificate.ts | keep | |
| videoEmbed.ts | keep | |
| iitmDomain.ts | **create** | Narrow 2-domain helper + `getBranchFromEmail`. |

## Lib / Attendance / Config / Scripts

| File | Action | Reason |
|---|---|---|
| lib/prisma.ts | keep | Frozen pool config (Hard Constraint #3). |
| attendance/attendanceSocket.ts | keep | Hard Constraint #5. |
| config/passport.ts | modify | Drop GitHub strategy; add IITM gate, branch derivation, SEED_ADMIN promotion. |
| scripts/create_test_network.ts | modify (branding only) | |
| scripts/create_test_users.ts | modify (branding only) | |
| scripts/update_outreach_dsa.ts | keep | |

## Quiz (`apps/api/src/quiz/`)

| File | Action | Reason |
|---|---|---|
| quizRouter.ts | **strip** | Quiz removed per pivot. |
| quizSocket.ts | **strip** | Quiz removed per pivot. |
| quizStore.ts | **strip** | Quiz removed per pivot. |
| quizSocket.test.ts | **strip** | Quiz removed per pivot. |
| migrations/ | **strip** | Quiz-internal migration files. |

## New: Games (`apps/api/src/games/`)

| File | Action | Reason |
|---|---|---|
| index.ts | **create** | `Game` interface + `mountGames(app)`. |
| registry.ts | **create** | `[competitionGame]` array. |
| competition/index.ts | **create** | Wraps existing `routes/competition.ts` under `/api/games/competition` with `/health`. |
| README.md | **create** | 30-line "how to add a game" guide. |

## Prisma models (`prisma/schema.prisma`)

| Model | Action | Reason |
|---|---|---|
| User | modify | Drop `password`. Add `level UserLevel?`. Drop Quiz relations. |
| Settings | modify | Add `attendanceEnabled`. Update `clubName`/`clubEmail` defaults to Tesseract. |
| Event | keep | |
| EventRegistration | keep | Capacity filter constraint preserved. |
| EventInvitation | keep | |
| DayAttendance | keep | |
| EventTeam, EventTeamMember | keep | |
| CompetitionRound, CompetitionSubmission, CompetitionAutoSave | keep | Surfaced via games registry. |
| Announcement | keep | |
| Poll, PollOption, PollVote, PollVoteSelection, PollFeedback | keep | |
| TeamMember | keep | |
| Achievement | keep | |
| QOTD, QOTDSubmission | keep | |
| AuditLog | keep | |
| HiringApplication | keep | |
| NetworkProfile | keep | |
| **Quiz, QuizQuestion, QuizParticipant, QuizAnswer** | **strip** | Quiz removed. |
| Execution, UserPlaygroundPrefs, Snippet, PlaygroundDailyUsage, PlaygroundLimitReset | keep | |
| Signatory, Certificate | keep | |
| Credit | keep | |

## Enums

| Enum | Action |
|---|---|
| Role | keep |
| EventStatus, RegistrationType, InvitationStatus, AnnouncementPriority, ApplyingRole, ApplicationStatus, CompetitionStatus, CompetitionParticipantScope, CertType, NetworkConnectionType, NetworkStatus, ExecutionStatus | keep |
| **QuizStatus, QuizQuestionType** | **strip** |
| **UserLevel** | **create** (FOUNDATION, DIPLOMA, BSC, BS) |

## Env vars

| Var | Action |
|---|---|
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | keep |
| `BACKEND_URL`, `FRONTEND_URL` | keep |
| `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` | keep — drives `isSuperAdmin` flag + initializeDatabase seed |
| `SEED_ADMIN_EMAIL` | **add** — auto-promotes user to ADMIN on first OAuth login |
| `ALLOWED_ORIGINS` | **add** — CSV browser-origin allowlist (replaces hardcoded `ALLOWED_CODESCRIET_ORIGINS`) |
| `COOKIE_DOMAIN` | **add** — `.tesseract.example` in prod; empty for dev |
| `ENABLE_DEV_AUTH` | keep |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | **remove** |
