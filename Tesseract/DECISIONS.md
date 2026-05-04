# Backend Decisions

Generated: 2026-04-30

## TypeScript Pivot

7. The backend stack is now TypeScript/NestJS on Express, Prisma, PostgreSQL, and Redis. The prior FastAPI/Python implementation was removed from `backend/`.
8. Prisma migrations replace Alembic; Jest replaces pytest; Node/Nest scripts replace uvicorn/ruff commands.
9. The game domain is kept as a stable catalog/module with `GameAdapter` interfaces for future mini-games. Phase 1 keeps gameplay/scoring gated or stubbed.

1. Preserve the existing frontend `ApiEnvelope<T>` response shape for every backend response. The Phase 1 prompt's bare JSON examples are treated as logical payloads inside `data`.
2. Preserve current frontend OTP verification with `{ email, code }` and add compatible support for `{ challengeId, otp, profile? }` for the long-run backend contract.
3. Do not modify files under `src/`; compatibility work belongs in the backend.
4. Use the pasted Phase 1 prompt plus `PROJECT_STATE.md` as the source of truth. No team-lead PDF was present in the repository.
5. Seed all 17 explicitly listed feature flags. The exit criterion saying “16” is treated as a typo because the list contains 17 keys.
6. Keep current frontend delete/join response bodies such as `{ ok: true }` inside the envelope instead of switching those endpoints to empty 204 responses.
