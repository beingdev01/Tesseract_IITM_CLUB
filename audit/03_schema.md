# Phase 3 — Schema Review

Source: [prisma/schema.prisma](prisma/schema.prisma) (~1,450 LOC, 52 models, 63 migrations).

Diagnostics:
- `npx prisma validate` → exit 0, clean.
- `npx prisma migrate status` — not run (no dev DB connection in this audit pass).

Findings use IDs `F-300+` to avoid colliding with Phase 1.

---

## 3.1 Per-model review

### `User` (line 15)

- **F-300 [CRIT] [Phase 3]** `email String @unique` is case-sensitive at the Postgres column level. Auth code uses `findFirst({ where: { email: { equals: x, mode: 'insensitive' } } })` to *read*, but writes use the literal email. If a future code path lowercases-on-write but legacy rows are mixed-case, duplicate accounts can be created with the same logical email. → F-007.
  - **Suggested:** Migrate `email` to `citext` (case-insensitive text) or add a `@@unique([emailLowercased])` computed column + trigger.
- **F-301 [HIGH] [Phase 3]** `Role` enum (line 617-625) lists 7 values: `PUBLIC, USER, CORE_MEMBER, ADMIN, PRESIDENT, MEMBER, NETWORK`. The middleware collapses `USER == NETWORK` and `ADMIN == PRESIDENT` (F-013, F-014). The enum has all 7 distinct values but the authz layer treats them as 5 levels. Either remove redundant enum values or split the authz layer.
- **F-302 [LOW] [Phase 3]** `User` has 30+ relation fields (line 36-77). Many are for the games subsystem (10 relations). Performance impact is mostly notional, but `findUnique({ include: { ... } })` calls that pull all relations would be brutally expensive — verify Phase 4 nothing does that.
- **F-303 [LOW] [Phase 3]** `User.phone` is `String?` with no format constraint. International numbers, spaces, plus-prefixes all accepted. Phase 1 found `phone` in attendance/event exports (F-119) — leakage matters more when format is variable.
- **F-304 [MED] [Phase 3]** **No `suspended`/`disabled` flag.** A compromised user can only be deleted, not paused. Deleting cascades through registrations, polls, certificates (`SetNull`), etc. — destructive. → F-221.
- **F-305 [LOW] [Phase 3]** `User.profileCompleted` is a derived flag stored as a column — risks drift with the actual field-completeness. Better as a computed view.
- **F-306 [LOW] [Phase 3]** No `lastLoginAt`/`lastSeenAt` — operationally useful for "stale account" cleanup; not present.

### `Settings` (line 83)

- **F-307 [HIGH] [Phase 3]** `id String @id @default("default")` — string PK with a literal default — is the singleton pattern, but there's no `@@check`-style constraint to prevent a second row. → F-028.
- **F-308 [HIGH] [Phase 3]** `Settings.attendanceJwtSecret` and `Settings.indexNowKey` are **plaintext secrets in a DB row**. Anyone with read access to the `settings` table (DBA, support engineers, leaked pg_dump) has the live HMAC key for QR tokens and IndexNow key for SEO.
  - **Suggested:** Encrypt at rest with an application-level KEK derived from `JWT_SECRET` or a dedicated `SECRETS_ENCRYPTION_KEY`. Or move attendance secret out of DB entirely.
- **F-309 [MED] [Phase 3]** 22 boolean feature flags scattered across the Settings row. Hard to reason about combinatorially; some combinations (e.g., `mailingEnabled: false` + `emailWelcomeEnabled: true`) produce inconsistent UX. Phase 8 surface this.
- **F-310 [LOW] [Phase 3]** `show_tech_blogs` (line 104) uses snake_case at the Prisma level — every other field uses camelCase with `@map` to snake_case. Stylistic drift.
- **F-311 [LOW] [Phase 3]** `emailTestRecipients String?` (line 134) — likely a comma-separated list. No structure. Validated in code, not schema.

### `Event` (line 146)

- **F-312 [HIGH] [Phase 3]** `Event.startDate DateTime` (and `endDate`) — Postgres `timestamp` without `@db.Timestamptz`. Time zone is implied by the client serializing the value. → F-CC-053.
  - **Suggested:** Migrate to `@db.Timestamptz` so the column carries TZ info.
- **F-313 [LOW] [Phase 3]** `Event.registrationFields`, `faqs`, `imageGallery`, `resources`, `speakers`, `dayLabels` are all `Json?` with no JSON Schema validation at the DB or Prisma level. Validation lives only in route handlers, which can drift.
- **F-314 [MED] [Phase 3]** `Event.createdBy` → `User` with `onDelete: Restrict` (line 192). Cannot delete an admin/CORE_MEMBER who has ever created an event without first reassigning ownership. No tooling to do so. Operator pain point.
- **F-315 [LOW] [Phase 3]** No `Event.deletedAt` / soft-delete. Deletions cascade — `EventRegistration`, `EventInvitation`, `Certificate`, `EventTeam`, `CompetitionRound` all `Cascade`. Aggressive cascade with no archive path.
- **F-316 [LOW] [Phase 3]** `Event.tags String[]` is a Postgres array of `text`. Inserts allow any free-form tag; no `Tag` table or controlled vocabulary. Tag rot likely.
- **F-317 [LOW] [Phase 3]** `Event.featured Boolean @default(false)` with `@@index([featured])` — full-table boolean indexes are low-selectivity in Postgres; the planner usually ignores them. Confirm via `EXPLAIN`.
- **F-318 [LOW] [Phase 3]** `Event.eventDays Int @default(1)` — no `@@check(eventDays >= 1)` constraint. Application code presumably enforces.
- **F-319 [LOW] [Phase 3]** `Event.teamMinSize` / `teamMaxSize` — no check that `min <= max`. Misconfig possible.

### `EventRegistration` (line 200)

- **F-320 [LOW] [Phase 3]** `attendanceToken String? @unique` — globally unique across all events. A token regen on event A frees that string; on event B a regen could theoretically clash. The token format includes `registrationId` so collisions are practically impossible — but the DB constraint is per-row, not per-event. Fine.
- **F-321 [LOW] [Phase 3]** `manualOverride Boolean @default(false)` — meant to mark CORE_MEMBER-edited attendance. Not surfaced in audit logs as the cause-of-change. Reconstruction of "who edited what" relies on AuditLog joins.
- **F-322 [HIGH] [Phase 3]** `@@unique([userId, eventId])` enforces one registration per (user, event) — good — but `EventTeam` registrations also create per-user `EventRegistration` rows. A user who tries to register independently AND join a team for the same event hits this constraint and the team-join transaction aborts at line 215-217 — Phase 1 didn't confirm this is handled with a friendly error.

### `EventInvitation` (line 232)

- **F-323 [HIGH] [Phase 3]** `inviteeUserId String?` and `inviteeEmail String?` — both nullable. **No DB-level check that at least one is set.** A null-null invitation is creatable.
- **F-324 [HIGH] [Phase 3]** `@@unique([eventId, inviteeUserId])` — does **not** prevent duplicate invitations to the same email when `inviteeUserId` is null (Postgres treats NULL as distinct). Two invitations to the same email for the same event are creatable.
- **F-325 [MED] [Phase 3]** Snapshot fields (`inviteeNameSnapshot`, `inviteeDesignationSnapshot`, `inviteeCompanySnapshot`) are denormalized at invite time. If the invitee updates their NetworkProfile after the invitation, the snapshot is stale — possibly intentional (preserving the invited identity) but not documented.
- **F-326 [LOW] [Phase 3]** `role String @default("Guest")` is a free-form 50-char string but used like an enum. Drift risk.

### `DayAttendance` (line 274)

- **F-327 [LOW] [Phase 3]** `@@unique([registrationId, dayNumber])` correct. No FK on `scannedBy` (it's a plain `String?`), so a deleted CORE_MEMBER leaves orphan scanner IDs. Acceptable.

### `EventTeam` / `EventTeamMember` (line 291, 312)

- **F-328 [MED] [Phase 3]** `inviteCode String @unique` (line 295, 8 chars) — only `@@index([inviteCode])` redundantly indexed (unique is already indexed). Cosmetic.
- **F-329 [HIGH] [Phase 3]** No `EventTeam.@@check(teamMaxSize >= members.count)` — DB does not enforce the team-size cap. Application code (F-121) is the only line of defense. Concurrent joins past max are possible.
- **F-330 [LOW] [Phase 3]** `EventTeamMember.role String @default("MEMBER") @db.VarChar(10)` — free-form 10-char role string. "LEADER" vs "MEMBER" enforced only in code.

### `CompetitionRound` / `Submission` / `AutoSave` (line 328, 353, 380)

- **F-331 [HIGH] [Phase 3]** `CompetitionSubmission.@@unique([roundId, teamId])` — the comment on line 371 acknowledges that Postgres treats NULL as distinct, so individual (`teamId IS NULL`) submissions are NOT deduplicated by this constraint. The sibling `@@unique([roundId, userId])` is the actual single-submitter guard.
- **F-332 [HIGH] [Phase 3]** `CompetitionAutoSave.@@unique([roundId, userId])` — missing `teamId` component. → F-085.
- **F-333 [MED] [Phase 3]** `CompetitionRound.allowedTeamIds String[]` — denormalized list. If a team is deleted, the ID remains in the array (Postgres array updates aren't triggered by FK constraints). Stale references possible.
- **F-334 [LOW] [Phase 3]** `CompetitionRound.duration Int` — unit unclear (seconds? minutes?). Comment-only convention.

### `GameSession` (line 398)

- **F-335 [LOW] [Phase 3]** `gameId String` is free-form text. Should be an enum (`GameCatalogId`) matching `GAME_CATALOG`. A malformed `gameId` from a misbehaving game module sticks in the table forever.
- **F-336 [LOW] [Phase 3]** No `roomCode` or `runId` reference — sessions are orphaned from the room/run they came from. Can't audit "show me all sessions from Trivia Tower run X."

### `Announcement` (line 414)

- **F-337 [LOW] [Phase 3]** `creator User @relation(onDelete: Restrict)` — same admin-deletion pain as Event (F-314).
- **F-338 [LOW] [Phase 3]** `slug @unique @default("")` — empty-string default could be inserted accidentally if `init.ts:populateAnnouncementSlugs` hasn't run yet; only one row can hold the empty slug before the unique constraint fires.

### `Poll` family (line 443-522)

- **F-339 [HIGH] [Phase 3]** `PollVote.@@unique([pollId, userId])` — good. But `PollVoteSelection` does NOT have `@@unique([voteId, optionId])` even though it's the PK (line 503) — actually it IS the PK; ok. Just confirmed.
- **F-340 [LOW] [Phase 3]** `Poll.deadline DateTime?` — nullable. Polls with no deadline never close. Application logic must handle.
- **F-341 [LOW] [Phase 3]** `PollFeedback.@@unique([pollId, userId])` — one feedback per user per poll. Re-submit allowed? `routes/polls.ts:1102-1166` likely upserts; verify.

### `TeamMember` (line 524)

- **F-342 [LOW] [Phase 3]** `imageUrl String` — non-nullable. A team member without an image cannot be inserted. Mandatory image is an editorial decision — verify it matches admin UI.
- **F-343 [LOW] [Phase 3]** `userId String? @unique` — many team members are unlinked. Linking to a User account exposes them to credit/audit pipelines; unlinked members are display-only.

### `Achievement` (line 559)

- **F-344 [LOW] [Phase 3]** `achievedBy String` — free-form attribution string (line 568 comment confirms). Acceptable; intentional flexibility.

### `AuditLog` (line 583)

- **F-345 [HIGH] [Phase 3]** `userId String?` nullable — system-actor audit rows are possible. The audit `utils/audit.ts:37-40` short-circuits on empty userId, so system events are silently dropped. There's no way to record a system-initiated action with a coherent actor. Critical for forensics around scheduler-driven changes (`updateEventStatuses`).
- **F-346 [LOW] [Phase 3]** `metadata Json?` — no schema. Phase 1 F-067 noted that `userName` PII leaks into this column.
- **F-347 [LOW] [Phase 3]** No `ipAddress`/`userAgent` capture — forensics for "where did this admin action come from" is impossible.

### `HiringApplication` (line 597)

- **F-348 [HIGH] [Phase 3]** `email String @unique` — applicants can apply only once across all roles. If someone is interested in two roles, the second submission fails. Likely intentional but confirm.
- **F-349 [LOW] [Phase 3]** `phone String?` no format constraint.

### `NetworkProfile` (line 688)

- **F-350 [LOW] [Phase 3]** `id String @id @default(cuid())` — only model that uses `cuid()` instead of `uuid()`. Inconsistency.
- **F-351 [HIGH] [Phase 3]** `phone String?` with comment "Private — only for admin contact" (line 705). The code admin export endpoint (F-140) writes this to Excel without sensitivity warning. Schema comment is not enforcement.
- **F-352 [LOW] [Phase 3]** `legacySlugs String[]` — append-only; can grow unbounded if a profile is renamed many times. No retention policy.
- **F-353 [LOW] [Phase 3]** `events Json? @default("[]")` — JSON array of past events (line 736). Shape not validated. Phase 1 didn't audit how this is rendered.
- **F-354 [LOW] [Phase 3]** `verifiedBy String?` is a plain string (admin user ID), not a foreign key. Deleted admins leave dangling references.

### `Signatory` (line 783)

- **F-355 [LOW] [Phase 3]** `id String @id @default(cuid())` — cuid like `NetworkProfile`.

### `Certificate` (line 807)

- **F-356 [HIGH] [Phase 3]** `recipientEmail String` is the authoritative join key for ownership checks (`isCertificateOwner` matches recipientEmail OR recipientId, F-091). The schema treats it as a plain `String` (not `@db.VarChar(...)`) and the email comparison happens case-sensitively in F-091.
- **F-357 [LOW] [Phase 3]** `@@unique([recipientEmail, eventId, type])` — prevents duplicate certs per email+event+type. But `eventId` is nullable, so non-event certificates can be issued any number of times to the same email + type. PG NULL-distinct strikes again.
- **F-358 [LOW] [Phase 3]** Denormalized signatory fields (`signatoryName`, `signatoryTitle`, `signatoryImageUrl`) preserve historical accuracy but are never re-synced if the Signatory record is updated post-issuance. Intentional but worth documenting.
- **F-359 [LOW] [Phase 3]** `viewCount Int @default(0)` — increment per fetch, race condition between read/increment. Probably uses `update({ viewCount: { increment: 1 } })` — atomic.

### `Credit` (line 871)

- **F-360 [LOW] [Phase 3]** `category String` — free-form. Could be an enum.

### Games models (line 906+)

- **F-361 [LOW] [Phase 3]** Each game has its own room/run/attempt tables. Schema design is consistent across games — easy to extend. No cross-game shared "score" model beyond `GameSession`.
- **F-362 [LOW] [Phase 3]** `ScribblPrompt.word` no `@db.VarChar(N)` — unbounded text for a single-word prompt.
- **F-363 [LOW] [Phase 3]** `TriviaQuestion.options Json` — schema unknown. Should be `String[]` of options.
- **F-364 [LOW] [Phase 3]** `RiddleClue.answer String` — plain text answer is stored unhashed. A DB read leaks all riddle answers. Acceptable for the threat model (admin-managed content) but worth noting.

---

## 3.2 Enum review

All enums are reasonable. `Role` (F-301) is the standout issue.

## 3.3 Index review

Indexes look thoughtful — many composite indexes for known sort orders. Notes:

- `User.@@index([role, createdAt(sort: Desc)])` — supports `/api/users` admin list. Good.
- `Event.@@index([status, startDate])`, `Event.@@index([startDate])`, `Event.@@index([featured])` — multiple indexes on Event. `featured` index is questionable (boolean, low selectivity).
- `EventRegistration` has 6 indexes — possibly overlapping. Phase 9 will examine.
- `NetworkProfile` has 7 indexes including a wide composite. Reasonable for the public feed query.
- `Announcement` has 6 indexes including overlapping `pinned`/`createdAt` compositions.

### Findings

- **F-365 [LOW] [Phase 3]** Multiple boolean column indexes (`Event.featured`, `Announcement.featured`, `Announcement.pinned`, `NetworkProfile.isFeatured`) — Postgres usually ignores these. Replace with partial indexes (`WHERE featured = true`).
- **F-366 [LOW] [Phase 3]** `EventRegistration` has 6 declared `@@index` — `eventId`, `(eventId, attended)`, `(eventId, registrationType, attended)`, `(eventId, timestamp DESC)`, `(userId, timestamp)`, `timestamp`. Some are subsumed. Cleanup candidate.

---

## 3.4 Relation / cascade review

`onDelete` audit (representative — full grep below):

| Relation | onDelete | Risk |
|---|---|---|
| `Event.creator` | Restrict | Admin deletion blocked |
| `EventRegistration.event` | Cascade | Drops registrations on event delete (audit lost) |
| `EventRegistration.user` | Cascade | User delete wipes their registrations |
| `EventInvitation.event` | Cascade | OK |
| `EventInvitation.inviteeUser` | Cascade | User delete wipes their invitations |
| `EventInvitation.invitedBy` | Restrict | Admin who sent invitations cannot be deleted |
| `EventInvitation.registration` | SetNull | Registration delete preserves invitation |
| `DayAttendance.registration` | Cascade | OK |
| `EventTeam.event` | Cascade | OK |
| `EventTeam.leader` | Restrict | Leader cannot be deleted while leading |
| `EventTeamMember.team` | Cascade | OK |
| `EventTeamMember.user` | Cascade | OK |
| `EventTeamMember.registration` | Cascade | OK |
| `CompetitionRound.event` | Cascade | OK |
| `CompetitionSubmission.round` | Cascade | OK |
| `CompetitionSubmission.team` | SetNull | OK |
| `CompetitionSubmission.user` | Cascade | User delete wipes submissions |
| `CompetitionAutoSave.*` | Cascade/SetNull | OK |
| `GameSession.user` | Cascade | User delete loses their leaderboard history |
| `Announcement.creator` | Restrict | Admin deletion blocked |
| `Poll.creator` | Restrict | Admin deletion blocked |
| `PollVote.poll` | Cascade | OK |
| `PollVote.user` | Cascade | User delete wipes their votes |
| `Certificate.recipient` | SetNull | Preserves cert when user deletes |
| `Certificate.event` | SetNull | Preserves cert when event deletes |
| `Certificate.*Signatory` | SetNull | Preserves snapshot |
| `AuditLog.user` | SetNull | Preserves trail when user deletes |
| `HiringApplication.user` | SetNull | OK |
| `NetworkProfile.user` | Cascade | OK |
| `TeamMember.user` | SetNull | OK |
| `Credit.teamMember` | SetNull | OK |

### Findings

- **F-367 [HIGH] [Phase 3]** **Admin deletion is broadly blocked** by `Restrict` cascades on `Event.creator`, `Announcement.creator`, `Poll.creator`, `EventTeam.leader`, `EventInvitation.invitedBy`. To delete an admin who has been active, every one of these relations must be reassigned. No tooling exists. Combined with the lack of a `suspended` flag (F-304), there is no graceful way to remove an admin from the platform.
- **F-368 [HIGH] [Phase 3]** User-delete cascades through `EventRegistration`, `EventTeamMember`, `CompetitionSubmission`, `PollVote`, `NetworkProfile`, `GameSession`. A deletion silently nukes the user's entire history. No archival path. GDPR right-to-erasure compatible by accident; "I want to leave gracefully" is destructive.

---

## 3.5 Migration hygiene

63 migration folders (from inventory). Observations:

- **F-369 [LOW] [Phase 3]** `20251229160610_` (line 1 of `ls`) has **an empty name suffix**. The migration label is just the timestamp. Pre-`prisma migrate dev --name` discipline. Cosmetic.
- **F-370 [LOW] [Phase 3]** `20260303_add_quiz_join_code` is **out-of-format** — only 8 digits instead of 14 (`YYYYMMDDhhmmss`). Likely hand-edited. Risks ordering ambiguity when concatenated with neighbors:
  - `20260303092106_add_quiz_system` (with 14-digit timestamp)
  - `20260303_add_quiz_join_code` (only 8-digit)
  - `20260304120000_add_quiz_pin_rating_analytics`
  - Lexical order between the two day-3 entries depends on whether `20260303_...` sorts before `20260303092106_...`. ASCII `_` (0x5F) sorts AFTER `0`-`9`, so `20260303_` > `203030309...` — the malformed migration runs AFTER `092106` and BEFORE the day-4 one. Effectively day-3 latest. Verify with `prisma migrate status` against a real DB.
- **F-371 [LOW] [Phase 3]** Several migration names indicate dropped/pivoted features (`tesseract_pivot`, `games_platform_v2_and_qotd_drop`, `fix_certificate_schema_drift`). Migrations are correctly forward-only (no edits to applied migrations spotted) but the history shows several pivots — Phase 7 will check for orphaned tables/columns.
- **F-372 [LOW] [Phase 3]** `init.ts:14-27` does a runtime DELETE on `_prisma_migrations` for a specific historical failure. → F-034. Migration cleanup belongs in migrations, not in app boot.
- **F-373 [LOW] [Phase 3]** No `prisma migrate resolve` shadow database commitment — relies on dev/prod equivalence.

---

## 3.6 Seed script

`prisma/seed.ts` — not read in this audit pass. Flag for Phase 7 to verify:
- Does it match the current schema (52 models)?
- Does it create the `Settings.id = 'default'` row?
- Does it create `Signatory` records before any cert can be issued?
- Does it handle the `Role` enum's full set of values?

---

## 3.7 Schema-level themes for THEMES.md

1. **Postgres NULL-distinct subtlety** affects three unique constraints (`CompetitionSubmission.@@unique([roundId, teamId])`, `EventInvitation.@@unique([eventId, inviteeUserId])`, `Certificate.@@unique([recipientEmail, eventId, type])`). Each allows quiet duplicates when the nullable component is null. → Theme.
2. **Plain `String` columns where enums would help**: `EventTeamMember.role`, `Credit.category`, `Event.eventType`, `GameSession.gameId`, `Poll.allowMultipleChoices` decision keys.
3. **Free-form `Json?` columns** carrying business-critical shape (`Event.registrationFields`, `Event.speakers`, `NetworkProfile.events`). No schema validation at write time outside route handlers.
4. **Admin deletion impossibility** through `Restrict` cascades. Pair with missing `suspended` flag (F-304).
5. **Secrets in DB** (`Settings.attendanceJwtSecret`, `Settings.indexNowKey`) — F-308.
6. **Mixed ID generators** — most use `uuid()`, `NetworkProfile`/`Signatory`/`Certificate` use `cuid()`. Cosmetic but real.
7. **Index hygiene** — boolean column indexes that the planner ignores; overlapping multi-column indexes on EventRegistration and Announcement.

---

## 3.8 Schema findings summary

| ID | Severity | Title |
|---|---|---|
| F-300 | CRIT | `User.email @unique` is case-sensitive in Postgres |
| F-301 | HIGH | `Role` enum has 7 values; authz collapses to 5 levels |
| F-304 | MED | No `User.suspended`/`disabled` flag |
| F-307 | HIGH | `Settings` singleton not DB-enforced |
| F-308 | HIGH | `Settings.attendanceJwtSecret` stores plaintext HMAC key |
| F-312 | HIGH | `Event` timestamps lack `@db.Timestamptz` |
| F-322 | HIGH | `(userId,eventId)` unique conflicts with team-join flow |
| F-323 | HIGH | `EventInvitation` allows null-null invitee |
| F-324 | HIGH | `(eventId, inviteeUserId)` unique allows duplicate email-only invites (NULL-distinct) |
| F-329 | HIGH | No DB-level team size cap |
| F-331 | HIGH | `(roundId, teamId)` unique doesn't dedupe individual submissions (NULL-distinct) |
| F-332 | HIGH | `CompetitionAutoSave` unique missing teamId |
| F-345 | HIGH | `AuditLog.userId` nullable but audit utility skips null users |
| F-348 | HIGH | `HiringApplication.email @unique` blocks re-application |
| F-351 | HIGH | `NetworkProfile.phone` "private" by comment, not enforcement |
| F-356 | HIGH | `Certificate.recipientEmail` case-sensitive |
| F-357 | LOW | `(recipientEmail, eventId, type)` unique doesn't dedupe non-event certs (NULL-distinct) |
| F-367 | HIGH | Admin deletion broadly blocked by Restrict cascades |
| F-368 | HIGH | User deletion silently nukes history |
| F-302, F-303, F-305, F-306, F-309, F-310, F-311, F-313–F-321, F-325–F-330, F-333–F-344, F-346, F-347, F-349, F-350, F-352–F-355, F-358–F-366, F-369–F-373 | LOW/MED | See bodies |
