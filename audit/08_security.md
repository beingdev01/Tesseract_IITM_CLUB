# Phase 8 — Security Review (OWASP API Top 10)

Diagnostics:
- `npm audit` on both workspaces — outputs captured in §8.1
- Secret-scan grep across source tree — `BEGIN PRIVATE KEY`, `sk_live_`, `AKIA[A-Z0-9]{16}`, `password\s*[:=]\s*['"]` — no secrets in source.

Findings start at `F-800`.

---

## 8.1 npm audit results

### `apps/api` — 2 vulnerabilities

| Package | Severity | Range | CVE link | Status |
|---|---|---|---|---|
| `sanitize-html` | **CRITICAL** | `<=2.17.3` | GHSA-rpr9-rxv7-x643 — XSS via `<xmp>` raw-text passthrough | **Used in `routes/mail.ts:37-50` to sanitize admin-composed email bodies** |
| `postcss` | moderate | `<8.5.10` | GHSA-qx2v-qp2m-jg93 — XSS via unescaped `</style>` | Transitive (not directly used) |

### `apps/web` — 6 vulnerabilities

| Package | Severity | Range | CVE link |
|---|---|---|---|
| `vite` | high | `7.0.0 - 7.3.1` | GHSA-4w7w-66w2-5vf9 (path traversal), GHSA-v2wj-q39q-566r (`server.fs.deny` bypass), GHSA-p9ff-h696-f583 (WS arbitrary file read) — **dev-server vulns; not production-exploitable** |
| `yaml` | moderate | `2.0.0 - 2.8.2` | GHSA-48c2-rrv3-qjmp — stack overflow on deeply nested YAML |
| (3 others under `vite`/`postcss`/`yaml` — same root causes) | — | — | — |

### Findings

- **F-800 [CRIT] [Phase 8]** **`sanitize-html` in `apps/api/src/routes/mail.ts` is on a CRITICAL CVE version.** The `<xmp>` raw-text passthrough bypass means HTML inside `<xmp>...</xmp>` is rendered verbatim — including `<script>` tags. The admin mail endpoint sanitizes `body` via `sanitizeEmailHtml` (line 37-50). If an admin pastes content containing `<xmp><script>...</script></xmp>`, the email is sent unsanitized to every recipient's inbox (where the script may or may not execute depending on email client; Gmail strips most). Critical for *any* HTML-rendering email client.
  - **Exploit path:** Admin account compromise → mass-XSS-email; or admin pastes from untrusted source → unintentional malicious email.
  - **Suggested:** `npm audit fix` (sanitize-html → 2.17.4+), and add `disallowedTagsMode: 'discard'` plus an explicit `<xmp>` block.
- **F-801 [HIGH] [Phase 8]** Vite dev-server CVEs are not production-exploitable (production uses static `vite build` output served by `vite preview` — see F-CC-803 below). But any developer running `vite` (npm run dev) is exposed on `localhost` to the path-traversal / WS file-read CVE if they bind to non-loopback. Upgrade vite.
- **F-802 [LOW] [Phase 8]** `yaml` and `postcss` are build-time deps with minimal blast radius. `npm audit fix` resolves all six web vulns.

---

## 8.2 OWASP API Top 10 walk

### 1. **BOLA (Broken Object Level Authorization)**

Most critical class of finding in this audit. Phase 1 + Phase 2 + Phase 4 captured the full IDOR roster:

- **Attendance edits without event-ownership** — F-063, F-064, F-065, F-069, F-071, F-139
- **Certificate downloads with email-only match** — F-091
- **Competition admin score on any round** — F-100
- **Bulk cert issuance for any event** — F-099
- **Event deletion without ownership** — F-401, F-402
- **Invitation accept/decline email-only match** — F-096
- **Network admin updates can flip isPublic on PENDING** — F-134

Severity-tagged in Phase 1; not duplicated here. This is the #1 theme.

### 2. **Broken Authentication**

- 7-day access tokens, no revocation, no refresh, `/me` auto-renews — F-002, F-010, F-011, F-012, F-220.
- Cookie not `__Host-`-prefixed — F-046.
- Multiple cookie parsers — F-005.
- Logout cookie-only, JWT remains valid — F-220.
- OAuth exchange-code reusable within 30s — F-CC-040.
- Dev-login always mounted — F-009.
- Email case-insensitivity drift — F-007, F-300.

### 3. **Broken Object Property Level Authorization (Mass Assignment)**

- Network admin `PATCH /admin/:id` accepts `isFeatured`, `displayOrder` — F-115.
- Event `PUT /:id` accepts `featured` from CORE_MEMBER — F-116.
- Network user `PATCH /profile` schema reuse — F-118.
- Network admin can flip `isPublic` on PENDING — F-134.
- Settings `PATCH /:key` dynamic key — F-404.

Defense: validate with explicit Zod `pick`/`omit` schemas rather than `Partial<>`.

### 4. **Unrestricted Resource Consumption**

- Multiple unpaginated list endpoints: F-059, F-081, F-087, F-126, F-135, plus per-table-scan reads in `routes/events.ts:917` and `routes/competition.ts:1295`.
- Socket rate-limit map grows unbounded under attack — F-020.
- Audit log retries silently drop after 3 attempts — F-023.
- Reminder scheduler sequential 200ms — F-031 (only affects ops latency, not API).
- 400MB Node heap cap with PDF generation and image processing — Phase 0 `apps/api/package.json:start` script.
- Cert verify rate limit 60/5min is enumerable — F-084.

### 5. **Broken Function-Level Authorization**

- ADMIN role acts platform-wide; no event-organizer or judge-assignment model — F-CC-012.
- `requireRole('CORE_MEMBER')` for `PUT /api/users/:id/role` is mitigated by inline check (verified — body restricts to USER↔MEMBER for CORE_MEMBER), but the middleware label is misleading. Acceptable.
- `requireRole('ADMIN')` overused; `requireRole('PRESIDENT')` used exactly once (`PUT /api/settings`).
- No "event organizer" or "co-organizer" model in schema — F-CC-020.

### 6. **Server-Side Request Forgery (SSRF)**

- **F-097, F-092** — `signatoryCustomImageUrl` passed to `@react-pdf/renderer` Image component. If the renderer fetches arbitrary URLs server-side, an attacker-admin can make the API fetch internal hosts (cloud metadata `169.254.169.254`, internal Redis `127.0.0.1:6379`, etc.) and observe outcomes.
- `routes/upload.ts` not audited in depth — Phase 1 deferred. Phase 11 follow-up.

### 7. **Misconfiguration**

- **CORS allowlist construction** in `index.ts:60-90` and **separately** in `utils/socket.ts:50-87` — drift risk (F-226).
- **Helmet** is used at default settings (`index.ts:240`) — no `contentSecurityPolicy` customized.
- **No CSP** beyond Helmet defaults — phase 8 follow-up.
- **`vite preview` used in `npm run start:prod`** — F-CC-803 (this finding new in this phase).
- **`process.env.INDEXNOW_KEY` mutated at runtime** — F-027.
- **`Settings.attendanceJwtSecret` plaintext in DB** — F-308.
- **`apps/api/.env` exists in repo** (Phase 0 noted size 2010 bytes; gitignored? Verify).

### Findings (new in Phase 8)

- **F-803 [HIGH] [Phase 8]** `npm run start:prod` uses `vite preview` to serve the SPA. **Vite preview is documented as not for production.** It has minimal hardening, no compression beyond static, and lacks request-rate guards. For a deployed Tesseract instance, the FE is served from the same Node process as the API via concurrently. This is a production hosting concern.
  - **Verify:** Whether `start:prod` is actually invoked on Render. The deploy config may use a separate static-host or build-and-serve pattern.
- **F-804 [LOW] [Phase 8]** `helmet()` is called with defaults. Modern Helmet defaults include CSP, but Tesseract's SPA likely needs script-src/style-src tuning. Without a custom policy, default may block legitimate inline JS or be over-permissive.
- **F-805 [HIGH] [Phase 8]** `apps/api/.env` is present in the repo (Phase 0: size 2,010 bytes). **Verify `.gitignore` excludes `.env` and that no real secrets were ever committed.** `git log --all -p -- apps/api/.env` would surface historic secret leaks.
- **F-806 [LOW] [Phase 8]** No Content-Security-Policy meta or response header customization visible in `index.ts`. Helmet defaults apply (CSP `default-src 'self'`); admin pages may rely on inline `<style>` or `dangerouslySetInnerHTML` for rich text. Phase 11 verify.

### 8. **Lack of Inventory**

- 270+ endpoints; no OpenAPI / Swagger spec generated. Phase 4 surface map IS the inventory (manually produced).
- No deprecated-version markers; the whole API is "v1" implicit.
- Game admin endpoints under `/api/admin/games/*` are duplicated structurally per game — no shared OpenAPI generator.

### 9. **Unsafe Consumption of Third-Party APIs**

- **Brevo email** — credentials in env; presumably HTTPS calls with no response-validation.
- **Cloudinary** — credentials in env; uploaded URLs trusted by handlers (F-092 SSRF surface).
- **Google OAuth** — `passport-google-oauth20` handles verification; trusted.
- **IndexNow** — credentials in env; outbound notifications only.

### 10. **Improper Inventory Management of Secrets**

- `Settings.attendanceJwtSecret` plaintext in DB (F-308, CRIT).
- `Settings.indexNowKey` plaintext in DB (F-308, MED).
- No KMS, no Vault, no encryption at app layer.

---

## 8.3 Secret-scan results

`grep -rE "BEGIN .* PRIVATE KEY|sk_live_|AKIA[A-Z0-9]{16}|password\s*[:=]\s*['\"]"`:

- **Source tree:** no real secrets.
- **`apps/web/src/pages/admin/AdminUsers.tsx:75, 241, 264, 271, 808`** contains a `password` field in the admin user-edit form. **Verified BE has NO password handling** (grep `password` in `routes/users.ts` returns nothing).

### Finding

- **F-807 [HIGH] [Phase 8]** **`AdminUsers.tsx` exposes a password-edit field in the admin user UI that the backend does not consume.**
  - **Evidence:** `apps/web/src/pages/admin/AdminUsers.tsx:75, 264-271, 808` (`<Label htmlFor="edit-password">New Password (Optional)</Label>` and form state). Backend `routes/users.ts:561` (`PUT /api/users/:id`) does not destructure `password`.
  - **Why this is wrong:** Admins editing a user can type a "new password" and click save; the value is sent and silently discarded by the backend. The User schema has NO password column (Phase 3 F-300 confirms). Misleading UX, **and** a leftover from pre-OAuth-pivot code.
  - **Suggested direction:** Remove the password input + state from `AdminUsers.tsx`.

---

## 8.4 Rate-limiting coverage

| Endpoint | Limiter | Notes |
|---|---|---|
| `/api/*` (global) | 500/15min/IP | F-032 |
| `/api/auth/*` | 50/15min/IP, `skipSuccessfulRequests` | F-045 |
| `/api/attendance/scan-beacon` | `beaconLimiter` | Phase 4 |
| `/api/teams/join` | `joinRateLimiter` | Phase 4 |
| `/api/invitations/claim` | `claimRateLimiter` | Phase 4 |
| `/api/certificates/verify/:certId` | `certificateVerifyLimiter` | F-084 |
| `/api/certificates/download/:certId`, `/files/:filename`, `/verify/:certId/download` | `certificateDownloadLimiter` | |
| `/api/games/competition/.../save` | `saveLimiter` | |
| `/api/games/competition/.../submit` | `submitLimiter` | |
| **Socket connections** | 30/min/IP via custom map | F-020 |

### Findings

- **F-808 [MED] [Phase 8]** Some hot paths have NO custom rate limiter beyond the 500/15min/IP global: `/api/registrations/events/:eventId` (POST), `/api/polls/:idOrSlug/vote`, `/api/network/profile` (POST/PATCH), `/api/games/<id>/rooms` (POST). 500/15min/IP equates to ~33 requests/min — enough for one user, easy to abuse for distributed registration spam.
- **F-809 [LOW] [Phase 8]** No CAPTCHA at any threshold — even the public `/api/hiring/apply` endpoint accepts submissions with only rate limiting. Bot submissions of hiring applications are easy.

---

## 8.5 Session / Token hardening summary

| Aspect | Status |
|---|---|
| `httpOnly` cookie | ✅ |
| `secure` (prod-only) | ✅ |
| `sameSite: lax` | ⚠ (F-046) |
| `__Host-` prefix | ❌ |
| Signed cookies | ❌ (F-048) |
| Token rotation | ❌ (`/me` re-issues, F-010) |
| Token revocation | ❌ (F-002, F-220) |
| Refresh tokens | ❌ |
| Token versioning | ❌ |
| MFA | ❌ |
| Device fingerprinting | ❌ |
| Suspended-user flag | ❌ (F-304) |

---

## 8.6 CORS / CSP / Header coverage

- **CORS allowlist** built from `ALLOWED_ORIGINS` env (`index.ts:60-90`). Default: empty in prod (F-CC-startup warning).
- **Socket.io CORS** built separately (`utils/socket.ts:50-87`). Drift risk — F-226.
- **Helmet defaults** active. No customization.
- **CSP** default-src 'self' from Helmet. Inline scripts and styles may break.
- **HSTS** via Helmet default. Verified `secure: isProd` for cookies.
- **X-Frame-Options** via Helmet default (`DENY`).

---

## 8.7 Email / message security

- Brevo API key in env. No transport encryption visible beyond defaults.
- `routes/mail.ts:37-50` sanitizes HTML via the vulnerable `sanitize-html` package — F-800.
- Subject lines (`sendMailSchema.subject`) sanitized via Zod string only — Phase 1 didn't audit subject escaping in the actual outbound email.

### Findings

- **F-810 [MED] [Phase 8]** Outbound email subjects are not separately HTML-escaped before being sent — most ESPs (Brevo included) accept plain text subjects, so this is mostly moot. But if subject is rendered in transactional templates as HTML, the path exists.
- **F-811 [HIGH] [Phase 8]** Email body sanitization uses the vulnerable `sanitize-html`. → F-800.

---

## 8.8 Phase 8 findings recap

| ID | Severity | Title |
|---|---|---|
| F-800 | CRIT | `sanitize-html` <=2.17.3 in api: XSS via `<xmp>` (mail.ts uses it) |
| F-801 | HIGH | Vite dev-server CVEs — upgrade |
| F-802 | LOW | postcss/yaml moderate vulns — `npm audit fix` |
| F-803 | HIGH | `npm run start:prod` uses `vite preview` (not production-grade) |
| F-804 | LOW | No CSP customization beyond Helmet defaults |
| F-805 | HIGH | `apps/api/.env` present in repo — verify gitignore + git history clean |
| F-806 | LOW | No custom CSP header customization |
| F-807 | HIGH | `AdminUsers.tsx` has dead password-edit field; misleading UX |
| F-808 | MED | Hot mutating endpoints lack per-route rate limiters |
| F-809 | LOW | No CAPTCHA on public submission endpoints |
| F-810 | MED | Email subject not separately HTML-escaped |
| F-811 | HIGH | Mail body sanitization uses the vulnerable package — duplicates F-800 |
| Plus references to F-002, F-005, F-007, F-008, F-009, F-010, F-011, F-012, F-019, F-020, F-022, F-027, F-046, F-048, F-055, F-063–F-072, F-080–F-100, F-115–F-140, F-220, F-300, F-308, F-322–F-358, F-401–F-407 from earlier phases | various | OWASP top-10 cross-references |

---

## 8.9 Backups & disaster recovery

Out of scope for static audit; flag for follow-up:
- Are Postgres backups taken? Tested?
- Restoration drill?
- RPO / RTO?
