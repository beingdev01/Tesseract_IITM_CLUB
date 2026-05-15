# nits.md — style / taste / preference bucket

Kept separate from the main register per the brief's §12 — these are not bugs. Each is a one-line judgment call.

Per the brief's instruction "no untagged findings, NITs separate" — this file is the deliberate dumping ground. Anything that survives a "is this actually wrong, or do I just dislike the style?" check stays in the main phase files. Anything that fails it lands here.

---

## API style

- **N-01** `lib/prisma.ts:14` uses `global.prisma || createPrismaClient()` — fine for dev hot reload but the global type is loosely typed (`var prisma: PrismaClient | undefined`). Could be `globalThis` with stricter typing.
- **N-02** `utils/jwt.ts:34` `DEV_FALLBACK_SECRET = 'dev_local_jwt_secret_change_me_before_production'` is a string-typed magic value — could be `Symbol`-named or behind a function call to express "this is not data."
- **N-03** `utils/response.ts:241-247` exports a legacy `apiResponse(res)` helper that returns an object with `success`/`created`/etc. methods. The newer `ApiResponse` static is used everywhere. Two patterns coexist; pick one.
- **N-04** `utils/audit.ts:7` `MAX_METADATA_BYTES = 50_000` — uses underscore separator, idiomatic; sibling `MAX_ACTION_LENGTH = 120` doesn't. Inconsistent.
- **N-05** `utils/scheduler.ts:233` emoji in log strings (`🔔`, `📬`, `✅`, `❌`, `⏭️`). Personal preference; some logging stacks strip emoji and the strings become odd.
- **N-06** `routes/auth.ts:131` `const intent = req.query.intent as string;` — TS assertion of `string` on a query value that might be `string[]` or `undefined`. Defensible because `passport.authenticate` is the next step, but tight types would help.
- **N-07** `routes/auth.ts:80-83` `withSuperAdmin<T extends { email: string }>(user: T)` — short generic name; readable, but `<TUser ...>` would be clearer per common TS conventions.
- **N-08** `routes/auth.ts:289` `withSuperAdmin({ id, name, email, role, branch })` — manually destructures; could be `withSuperAdmin(user)` if `user` already has those fields.
- **N-09** `routes/auth.ts:65-74` `clearSessionCookie` doesn't include `httpOnly` (Phase 1 F-047 flagged) — taste call, downgrade if Express's defaults are documented to match.
- **N-10** `routes/auth.ts:227-294` `dev-login` route at the bottom of the file — would be cleaner grouped with the OAuth handlers, with a clear "DEV ONLY" comment block above.
- **N-11** `config/passport.ts:131` `passport.serializeUser((user: any, done) => {...})` — `any` rather than `Express.User`. Lint or `@ts-ignore` would be preferable to the loose type.
- **N-12** `index.ts:288` `if (NODE_ENV === 'development' || process.env.ENABLE_REQUEST_LOGGING === 'true')` — duplicates a check that could live behind a single named boolean.
- **N-13** `index.ts:444-451` 404 handler echoes path back; mild taste call (Phase 1 F-043 noted reflected-XSS but it's bounded).
- **N-14** `games/router.ts:11-20` `BASE_PLAYS_BY_GAME_ID` — hardcoded marketing numbers. Phase 1 F-155 captured the bug; here as a style note, it should at minimum be in a `constants/` file or named more loudly (`MARKETING_VANITY_PLAY_COUNTS`).
- **N-15** Several routers use `try { ... } catch (error) { logger.error('...', { error: error instanceof Error ? error.message : String(error) }); return ApiResponse.internal(res, '...'); }` — boilerplate-y. A `withErrorHandler(fn)` wrapper would tidy this.
- **N-16** `routes/competition.ts:1049-1066` autosave upsert spans 17 lines of nested options — extract a `buildAutosaveUpsert(input)` helper.
- **N-17** `utils/email.ts` is 2,208 LOC — at the largest size where readability suffers. Split into `email/templates.ts`, `email/transport.ts`, `email/reminders.ts`, etc.
- **N-18** `routes/attendance.ts` and `routes/certificates.ts` at 2,477 and 1,828 LOC respectively — same complaint; consider folder-per-domain structure.
- **N-19** `attendance.ts:121-129` `parseRequestedDayNumber` returns `Number.NaN` for invalid — taste call to return `null` instead.
- **N-20** Many `prisma.X.findUnique({where:{id}, select:{...}})` blocks repeat a 5-15 line `select` clause. Define shared `userSelect`, `eventSelect` constants.

---

## Web style

- **N-21** `App.tsx:120-123` `<Toaster toastOptions={{...}}>` — inline style object. Could move to a `tailwind` class or named CSS.
- **N-22** `App.tsx:9-21` `PageLoader` component is inline in `App.tsx`. Could move to `components/PageLoader.tsx` for reuse.
- **N-23** `App.tsx:201-218` `NotFound` is inline. Same — extract.
- **N-24** `lib/api.ts:2` and `lib/api.ts:2013` both define `API_BASE_URL` / `BASE_URL` (F-507). Two definitions in one file.
- **N-25** `lib/api.ts` is 2,472 LOC — split by domain (auth, events, polls, games, etc.) into `lib/api/*.ts`.
- **N-26** `EventCertificateWizard.tsx` at 2,559 LOC — needs to be 5+ smaller components (one per wizard step).
- **N-27** Lint count of unused-import warnings: not measured here, but several `useState` imports without uses are likely (lint is clean per Phase 1 — disregard if explicit).
- **N-28** `pages/admin/AdminUsers.tsx:264-271` form `password` field that the BE silently discards (F-807). Style nit: even if it's removed, the field needs to go from the *form schema* not just the input.
- **N-29** `apps/web/src/hooks/useQuizTimer.ts` — file naming convention `useQuiz*` mixes with `useHomePageData`, `useMotionConfig`, `useOfflineScanner`. Either all-camelCase or kebab; `Quiz` capitalized but `HomePage` non-kebab — mild inconsistency.
- **N-30** No leading comment block on `apps/web/src/lib/utils.ts` explaining the file's purpose (compared to `apps/web/src/lib/dateUtils.ts` which presumably has one). Minor docs gap.

---

## Schema style

- **N-31** `Prisma.NetworkProfile.id` uses `cuid()`; everywhere else `uuid()`. Choose one.
- **N-32** `Settings.show_tech_blogs` — snake_case field name; everywhere else camelCase. Inconsistent.
- **N-33** `User.role` enum has 7 values including `PUBLIC` (which a logged-in user never has) — `PUBLIC` could be modeled as "no user" rather than an enum value. Schema-level.
- **N-34** Many `@db.Text` columns; many `String` columns without it. Postgres-side both are `text`; the annotation only affects the generated Prisma type. Inconsistent.

---

## Tests / build / scripts style

- **N-35** `package.json` script `start:prod` uses `concurrently` to run API + `vite preview` (F-803). Misleading name — this is not production.
- **N-36** Many `node --test apps/api/src/utils/*.test.ts` patterns in `test:stability`. The pattern doesn't include `*.smoke.test.ts` files explicitly but `node --test` globs find them. Fragile.
- **N-37** No `prepare` / `prepush` git hooks (e.g., husky). Type/lint clean depends on developer discipline.

---

## Documentation style

- **N-38** CLAUDE.md §11 lists test counts ("230/230 passing") that don't match reality (F-1000). Could be a documentation rot issue across other sections too.
- **N-39** README presumably exists but wasn't audited. CLAUDE.md is the de facto onboarding doc.
- **N-40** `apps/api/.env.example` missing (F-712). Style nit: every workspace should have an `.env.example`.

---

## Naming / consistency

- **N-41** `requireRole` vs `requireFeature` middleware — consistent. `gameAuth` vs `gamePublicAuth` vs `gameAdminAuth` — also consistent. But the games subsystem uses lower-case prefixed names, mainline uses verb-prefix (`require...`). Minor.
- **N-42** Endpoints `/api/team` vs `/api/teams` — one is org team members, one is event teams. Confusing; rename the singular one to `/api/team-members` or `/api/roster`.
- **N-43** `EventTeamMember.role` is a string default `'MEMBER'` (vs `'LEADER'`). Single role per team, but the column is plural-ish. Could be `EventTeamMember.isLeader: Boolean` instead.
- **N-44** `RegistrationType` enum has only `PARTICIPANT | GUEST`. Likely will grow (`VOLUNTEER`, `JUDGE`). Document the expected enum lifecycle.
- **N-45** `auth.ts:80-83` `withSuperAdmin` — could be a Zod transform on the User response rather than a manual wrapper.

---

## End

This file caps at 45 nits. Anything stylistic that didn't make it here is genuinely below the noise floor.
