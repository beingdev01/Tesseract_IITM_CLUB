# Backend Inventory

> Superseded on 2026-04-30: the backend was pivoted from the original FastAPI inventory to a TypeScript/NestJS rewrite in `backend/`. This file remains as historical context for why the Python backend was replaced.

Generated: 2026-04-30

Legend: `working` = usable and aligned with current frontend contract, `stub` = usable but incomplete for Phase 1, `missing` = required by Phase 1 but absent, `wrong` = conflicts with Phase 1 or locked frontend expectations.

## App Entrypoints

| File | State | Notes |
|---|---|---|
| `backend/app/__init__.py` | working | Package marker. |
| `backend/app/main.py` | stub | FastAPI app, CORS, envelope error handler, request logs exist; needs suspension/rate-limit integration. |
| `backend/app/api/router.py` | stub | Mounts existing routes; needs `/features` and expanded admin surface. |
| `backend/app/api/deps.py` | stub | Auth and role deps exist; needs `require_flag`, suspension checks, and general rate limiting. |

## Routes

| File | State | Notes |
|---|---|---|
| `backend/app/api/routes/auth.py` | stub | OTP/JWT routes exist; verify only supports `{ email, code }`, cookie path differs from spec. |
| `backend/app/api/routes/users.py` | stub | `GET /me` and public profile exist; needs `PATCH /me` and visibility enforcement. |
| `backend/app/api/routes/members.py` | stub | Request flow and legacy core moderation exist; needs directory and admin-only canonical approval. |
| `backend/app/api/routes/events.py` | stub | CRUD/join/participants exist; needs flags, leave, permission hardening, audit, event-ended/capacity semantics. |
| `backend/app/api/routes/activity.py` | stub | Feed and notifications exist; needs query aliases, visibility rules, and notification gate. |
| `backend/app/api/routes/games.py` | stub | Current score implementation is Phase 2-like; needs feature gate/stub behavior. |
| `backend/app/api/routes/leaderboard.py` | stub | Ranking exists; Phase 1 should return gated/stubbed results. |
| `backend/app/api/routes/dashboard.py` | working | Naive stats exist and match frontend envelope. |
| `backend/app/api/routes/admin.py` | wrong | Minimal mixed core/admin surface; Phase 1 requires admin-only exhaustive surface. |
| `backend/app/api/routes/health.py` | working | Health route exists. |

## Core

| File | State | Notes |
|---|---|---|
| `backend/app/core/config.py` | stub | Settings exist; needs Phase 1 admin seed names/rate-limit defaults and cookie path support. |
| `backend/app/core/security.py` | stub | JWT/OTP helpers exist; domain error/status and refresh hashing need Phase 1 alignment. |
| `backend/app/core/cache.py` | stub | Redis with memory fallback exists; needs plain get/set/delete helpers for idempotency/cache invalidation. |
| `backend/app/core/enums.py` | stub | Core enums exist; needs flag category/value enums and cancelled event status. |
| `backend/app/core/exceptions.py` | working | App exception shape is compatible with envelope errors. |
| `backend/app/core/responses.py` | working | Frontend-compatible `ApiEnvelope<T>` implementation. |
| `backend/app/core/pagination.py` | working | Pagination meta helper. |
| `backend/app/core/logging.py` | working | Basic logging setup. |

## Database

| File | State | Notes |
|---|---|---|
| `backend/app/db/base.py` | stub | Base and model import hook exist; needs new models imported. |
| `backend/app/db/session.py` | working | Async SQLAlchemy session. |

## Models

| File | State | Notes |
|---|---|---|
| `backend/app/models/user.py` | stub | Main fields exist; needs `deleted_at`, `last_login_at`, relationships/indexes. |
| `backend/app/models/game.py` | working | Game and score tables exist; gameplay/scoring treated as Phase 2 via gates. |
| `backend/app/models/event.py` | stub | Event and participant exist; needs cancelled status handling and participant status response alignment. |
| `backend/app/models/membership_request.py` | working | Request model exists. |
| `backend/app/models/otp_challenge.py` | working | OTP challenge model exists. |
| `backend/app/models/refresh_session.py` | working | Refresh rotation model exists. |
| `backend/app/models/activity_log.py` | working | User-facing logs exist. |
| `backend/app/models/notification.py` | working | In-app notifications exist. |
| `backend/app/models/mixins.py` | working | UUID/timestamp mixins. |
| `backend/app/models/__init__.py` | stub | Package marker only. |
| `backend/app/models/feature_flag.py` | missing | Required for Phase 1 feature system. |
| `backend/app/models/user_feature_override.py` | missing | Required for per-user flag overrides. |
| `backend/app/models/admin_audit_log.py` | missing | Required for admin audit trail. |
| `backend/app/models/user_suspension.py` | missing | Required for suspension enforcement. |

## Repositories

| File | State | Notes |
|---|---|---|
| `backend/app/repositories/users.py` | stub | Basic lookup/list exists; needs soft-delete, admin filters, directory search. |
| `backend/app/repositories/events.py` | stub | Basic event queries exist; needs delete/leave/participant helpers. |
| `backend/app/repositories/memberships.py` | working | Request lookup/list helpers exist. |
| `backend/app/repositories/activity.py` | stub | Basic list exists; needs filters. |
| `backend/app/repositories/notifications.py` | stub | Basic list/get exists; needs admin inserts/list by role. |
| `backend/app/repositories/games.py` | working | Game/score helpers exist. |
| `backend/app/repositories/features.py` | missing | Required for feature flags. |
| `backend/app/repositories/audit.py` | missing | Required for audit logs. |
| `backend/app/repositories/suspensions.py` | missing | Required for suspension checks. |
| `backend/app/repositories/__init__.py` | working | Package marker. |

## Schemas

| File | State | Notes |
|---|---|---|
| `backend/app/schemas/common.py` | working | API model/envelope schemas. |
| `backend/app/schemas/auth.py` | stub | Needs dual OTP verify payload support and `expiresInSeconds`. |
| `backend/app/schemas/user.py` | stub | Public user exists; needs update inputs and admin views. |
| `backend/app/schemas/membership.py` | stub | Request schemas exist; reject note should be required for admin rejection. |
| `backend/app/schemas/event.py` | stub | Event schemas exist; needs joined/count fields and cancelled status compatibility. |
| `backend/app/schemas/activity.py` | working | Activity/notification public schemas exist. |
| `backend/app/schemas/game.py` | working | Current frontend-compatible game schemas. |
| `backend/app/schemas/leaderboard.py` | working | Frontend-compatible leaderboard entries. |
| `backend/app/schemas/dashboard.py` | working | Frontend-compatible dashboard schemas. |
| `backend/app/schemas/admin.py` | stub | Minimal admin schemas; needs full Phase 1 admin inputs/views. |
| `backend/app/schemas/feature.py` | missing | Required for flags/overrides. |
| `backend/app/schemas/audit.py` | missing | Required for audit log reads. |
| `backend/app/schemas/suspension.py` | missing | Required for suspension responses. |
| `backend/app/schemas/__init__.py` | working | Package marker. |

## Services

| File | State | Notes |
|---|---|---|
| `backend/app/services/auth.py` | stub | OTP/JWT flow exists; needs signup gate, dual verify, rate/status hardening, `last_login_at`. |
| `backend/app/services/users.py` | stub | Public user/rank helpers exist; needs profile update and visibility. |
| `backend/app/services/membership.py` | stub | Request/review exists; needs admin audit integration and status semantics. |
| `backend/app/services/events.py` | stub | Basic CRUD/join exists; needs gates, leave, permissions, audit integration. |
| `backend/app/services/activity.py` | stub | Logging/notifications exist; needs filtered feed and visibility checks. |
| `backend/app/services/games.py` | stub | Full score logic exists but Phase 1 should be gated/stubbed by default. |
| `backend/app/services/leaderboard.py` | stub | Ranking exists but Phase 1 public leaderboard should be gated/stubbed by default. |
| `backend/app/services/dashboard.py` | working | Naive dashboard stats exist. |
| `backend/app/services/admin.py` | wrong | Minimal service; Phase 1 needs exhaustive admin operations and audit. |
| `backend/app/services/email.py` | working | Console provider logs OTP; SMTP remains Phase 2. |
| `backend/app/services/feature_service.py` | missing | Required Phase 1 centerpiece. |
| `backend/app/services/audit_service.py` | missing | Required for every admin write. |
| `backend/app/services/otp_service.py` | missing | Desired extraction; existing auth service can remain owner if kept cohesive. |
| `backend/app/services/notification_service.py` | missing | Required for admin notification insertion. |
| `backend/app/services/__init__.py` | working | Package marker. |
