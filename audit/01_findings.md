# Phase 1 — Per-file Static Read: Findings

Schema per §13 of the brief. Sequential IDs `F-001…F-NNN`. Severity tags `CRIT | HIGH | MED | LOW` only — NITs live in `nits.md`. This file is appended as the audit proceeds; the register is **not** sorted by severity until `SUMMARY.md`.

Diagnostics run during this phase:
- `npx tsc --noEmit -p apps/web` → **clean** (exit 0, no errors).
- `npx tsc --noEmit -p apps/api` → see F-DIAG-API at end of file when complete.
- `npm run lint --workspaces` → not yet executed.

Initial scope of this commit: the **trust roots** (`middleware/auth.ts`, `middleware/role.ts`, `middleware/featureFlag.ts`, `lib/prisma.ts`, `utils/jwt.ts`, `utils/response.ts`, `utils/audit.ts`, `utils/sanitize.ts`, `utils/socket.ts`, `utils/socketAuth.ts`, `utils/scheduler.ts`, `utils/attendanceToken.ts`, `utils/logger.ts`, `utils/init.ts`, `config/passport.ts`, `index.ts`, `routes/auth.ts`). Other phases append here as files are walked.

---

### F-001 [HIGH] [Phase 1] Auth-issued JWT carries `role` claim but middleware re-fetches user — claim is decorative, but role mismatches between token and DB are silently overwritten on every request

- **File:** `apps/api/src/middleware/auth.ts:83-105`
- **Evidence:**
  ```
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, ..., role: true, ... } });
  if (!user) { return res.status(401).json({ error: 'User not found' }); }
  (req as AuthRequest).authUser = user;
  ```
- **Why this is wrong:** The signed JWT contains a `role` claim (`utils/jwt.ts:7-9`), but middleware ignores it and pulls `role` fresh from DB. A demotion (admin → user) takes effect on the very next request — good. But the converse: an attacker who steals a *USER* token has zero replay risk if demoted, **and** the unused `role` claim invites future drift where some endpoint reads `decoded.role` instead of `authUser.role` (the JWT is signed for **7 days**, so a `role: ADMIN` token issued before demotion would grant admin if any code path trusts the claim). One latent foot-gun, one already-correct flow.
- **Suggested direction:** Either stop putting `role` in the JWT entirely, or document that the DB lookup is authoritative and add a lint to forbid `decoded.role` usage downstream.
- **Related:** F-002, F-011.

### F-002 [HIGH] [Phase 1] Access-token lifetime is 7 days with no revocation, no refresh-token, no per-device tracking

- **File:** `apps/api/src/utils/jwt.ts:36`, `apps/api/src/routes/auth.ts:55-63`
- **Evidence:**
  ```
  const ACCESS_TOKEN_EXPIRES_IN: jwt.SignOptions['expiresIn'] = '7d';
  ...
  res.cookie('tesseract_session', token, { httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000, ... });
  ```
- **Why this is wrong:** A stolen token (cookie or Bearer) is valid for a full week. There is no token-revocation list, no rotation, no "log out everywhere", no device fingerprint, no last-used timestamp. The user can `POST /api/auth/logout` (`routes/auth.ts:360`) which only clears the local cookie — the JWT is still valid until expiry. If a session cookie is exfiltrated via an XSS sink (DOMPurify covers most, but `marked` rendering server-side is not sanitized — see later finding), it grants 7 days of full access including any admin actions for an admin victim.
- **Suggested direction:** Add a `jti` (JWT ID) claim and a server-side blocklist or short-lived access tokens (~15 min) plus a refresh token. At minimum, add a `User.tokenVersion` column and embed it in the claim so a bump invalidates all outstanding tokens.
- **Related:** F-001, F-046.

### F-003 [MED] [Phase 1] `auth.ts` swallows every verify error into a single 401, including DB outages

- **File:** `apps/api/src/middleware/auth.ts:107-109`
- **Evidence:**
  ```
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  ```
- **Why this is wrong:** The `try` block contains `jwt.verify` **and** `prisma.user.findUnique`. If the database times out, the catch returns 401 "Invalid token", which is wrong (the token is valid; the DB is sick) and indistinguishable from a real auth failure. Frontend reacts by logging the user out and prompting re-auth — flooding the auth endpoint during a DB outage. There is also no `logger.error` call in this catch, so the outage is invisible to ops.
- **Suggested direction:** Catch `jwt.JsonWebTokenError`/`TokenExpiredError` specifically for 401, log + return 503 for everything else.
- **Related:** F-004.

### F-004 [MED] [Phase 1] `optionalAuthMiddleware` silently drops users on DB error, masking outages

- **File:** `apps/api/src/middleware/auth.ts:164-167`
- **Evidence:**
  ```
  } catch (error) {
    next();
  }
  ```
- **Why this is wrong:** Same root cause as F-003. If the DB blip hits an optional-auth route, the user is treated as anonymous, content silently downgrades to public view, and the user is none the wiser. No log, no metric.
- **Suggested direction:** Log the error with `logger.warn` and a clear "optional auth degraded" message before passing.
- **Related:** F-003.

### F-005 [HIGH] [Phase 1] Cookie parsing is hand-rolled and case-sensitive — `Tesseract_Session=...` will not match

- **File:** `apps/api/src/middleware/auth.ts:46-52`, `apps/api/src/config/passport.ts:9-14`, `apps/api/src/routes/auth.ts:31-36`
- **Evidence:**
  ```
  const cookies = req.headers.cookie;
  if (cookies) {
    const match = cookies.split(';').find(c => c.trim().startsWith('tesseract_session='));
    if (match) {
      return decodeURIComponent(match.split('=').slice(1).join('=').trim());
    }
  }
  ```
- **Why this is wrong:** Three near-duplicate cookie parsers exist in three files. None of them use the `cookie` package or `cookie-parser`. They all do prefix-match on lowercased name, which is case-sensitive by accident — RFC 6265 cookie names are case-sensitive, so it's *correct* by accident, but the duplication is real maintenance debt and each parser handles edge cases (multiple cookies with same name, malformed `=`, base64 padding) slightly differently. The biggest practical risk: `split('=').slice(1).join('=')` will produce the wrong value when a cookie value contains `=` *and* a later cookie with the same name appears in the same header — the first match wins regardless of `Domain`/`Path`. Browsers may legitimately send two `tesseract_session` cookies (e.g., one host-only, one for a parent domain).
- **Suggested direction:** Add `cookie` (already transitively present) or `cookie-parser` and have one shared `parseCookie(req, name)` helper.
- **Related:** F-006.

### F-006 [LOW] [Phase 1] Cookie helper uses `find` which returns first match — duplicate cookies (parent vs host domain) are ambiguous

- **File:** `apps/api/src/middleware/auth.ts:48`, `apps/api/src/routes/auth.ts:34`, `apps/api/src/config/passport.ts:12`
- **Evidence:** Same evidence as F-005.
- **Why this is wrong:** If a user has both a `tesseract_session` cookie set on `Domain=codescriet.dev` and another set on the bare host (legacy / domain change), the first one in the `Cookie:` header wins — and browser ordering is implementation-defined for cookies of equal length. Cookie sniffing attacks against shared subdomains exploit exactly this.
- **Suggested direction:** When `COOKIE_DOMAIN` is set, enforce host-only cookie issuance by stripping the `Domain` attribute on the *new* cookie writer until rotation is complete, or rotate the cookie name (e.g. `tesseract_session2`) on a domain change.
- **Related:** F-005.

### F-007 [CRIT] [Phase 1] `passport.ts` creates user via case-insensitive `findFirst` but the unique constraint on `email` is case-sensitive — duplicate accounts possible

- **File:** `apps/api/src/config/passport.ts:62-80`, `apps/api/src/routes/auth.ts:249`
- **Evidence:**
  ```
  let user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  });
  let isNewUser = false;
  if (!user) {
    isNewUser = true;
    user = await prisma.user.create({
      data: { name: ..., email, ... oauthProvider: 'google', oauthId: profile.id, ... },
    });
  }
  ```
- **Why this is wrong:** Two scenarios break:
  1. A user `Alice@ds.study.iitm.ac.in` exists. The same person logs in via Google with the same address that Google sometimes returns in lowercase `alice@ds.study.iitm.ac.in`. The lookup finds `Alice@...`, so login proceeds against the original — *but* this hinges on Prisma supporting `mode: 'insensitive'` for the underlying Postgres collation. If a sibling code path (e.g., `routes/users.ts`) ever creates `alice@...` via case-sensitive `findUnique`, the second `prisma.user.create` succeeds because `@unique` on String is case-sensitive in Postgres by default — and we now have two accounts.
  2. The `dev-login` route (`auth.ts:249`) does the same case-insensitive find, and again creates if not found. An attacker who can reach `/api/auth/dev-login` in a misconfigured prod (`ENABLE_DEV_AUTH=true`, see F-009) can register `ADMIN@ds...` to a fresh account if the canonical admin row is `admin@ds...`.
  Either route ends in a hijacked or duplicated account.
- **Suggested direction:** Lowercase the email on write (already done at line 49 in passport — but the unique constraint should be defined as `@unique` over a `citext` column, or a `@@index([email(ops: raw("text_pattern_ops"))])` with explicit lowercasing on every write site). Add a Prisma `@@unique([emailLowercased])` computed column or enforce `lower(email)` in DB.
- **Related:** F-009.

### F-008 [HIGH] [Phase 1] OAuth callback writes the access JWT to a `tesseract_session` cookie **and** returns the same JWT as an exchange code to the frontend — double-issuance broadens token-leak surface

- **File:** `apps/api/src/routes/auth.ts:193-206`
- **Evidence:**
  ```
  const token = generateToken(user);
  setSessionCookie(res, token);
  const code = signOAuthExchangeCode({ userId: user.id, intent: isNetworkIntent ? 'network' : undefined, networkType: isNetworkIntent ? networkType : undefined });
  await auditLog(user.id, 'LOGIN', 'auth', user.id, { provider: 'google', intent: isNetworkIntent ? 'network' : 'standard' });
  return res.redirect(buildAuthCallbackUrl(code));
  ```
- **Why this is wrong:** The cookie is set before the redirect (good — it lands on the API origin and is later shared on the FE origin via `COOKIE_DOMAIN`). But the exchange `code` is a separate JWT (`signOAuthExchangeCode`, 30s expiry) sent in the URL of the redirect — and `/exchange-code` returns *another* access JWT. So there are three sequential tokens for one login: (1) cookie access token, (2) 30s exchange code in URL, (3) re-issued access token from `/exchange-code`. The URL-borne code is logged in browser history, Referer headers, and (if HTTP) intermediate proxies. 30s helps, but anyone who can read the URL within 30s replays the code and gets a fresh 7-day token. Cleaner pattern: cookie-only (let FE call `/me` to bootstrap) or code-only (don't set cookie until exchange).
- **Suggested direction:** Drop the duplicate cookie. Use only the URL-bound code for the redirect, set the cookie on the `/exchange-code` response.
- **Related:** F-002.

### F-009 [HIGH] [Phase 1] Dev-login is guarded by env *and* by NODE_ENV — defense in depth is good, but the route is *always mounted* and only behaviorally guarded

- **File:** `apps/api/src/routes/auth.ts:227-229`
- **Evidence:**
  ```
  authRouter.post('/dev-login', async (req: Request, res: Response) => {
    if (!isDevLoginEnabled()) {
      return res.status(404).json({ error: 'Not found' });
    }
  ```
- **Why this is wrong:** The handler runs in production. If `NODE_ENV` is misread, mis-set in deploy config, or a future refactor flips the guard, anyone can POST `{ email, name }` and become any IITM user. Logger emits a warning at module load (line 19-21) if `ENABLE_DEV_AUTH=true` in prod, but the warning is informational — it doesn't disable the route. The route should be **conditionally mounted**, not conditionally guarded inside the handler.
- **Suggested direction:**
  ```ts
  if (isDevLoginEnabled()) authRouter.post('/dev-login', ...);
  ```
  so production binaries never carry the handler at all.
- **Related:** F-007.

### F-010 [HIGH] [Phase 1] `authRouter.get('/me')` re-issues an access token on every fetch — a single `/me` poll keeps a token "alive" indefinitely if the original was about to expire

- **File:** `apps/api/src/routes/auth.ts:297-305`
- **Evidence:**
  ```
  authRouter.get('/me', authMiddleware, (req: Request, res: Response) => {
    const authUser = getAuthUser(req);
    if (!authUser) { return res.json({ success: true, data: null }); }
    const token = generateToken(authUser);
    res.json({ success: true, data: withSuperAdmin(authUser), token });
  });
  ```
- **Why this is wrong:** Combined with F-002 (no refresh token), this *is* the refresh mechanism. Every call to `/me` mints a fresh 7-day token, then the FE's `react-query` polls /me whenever the user is active. So a token's effective lifetime is "as long as the user keeps the tab open + 7 days". A stolen token that's also kept "active" (replayed every few hours) never expires. Combined with no revocation (F-002), a leaked token is permanent.
- **Suggested direction:** Either (a) make `/me` not re-issue, or (b) re-issue only when remaining lifetime drops below a threshold and bind tokens to a `tokenVersion` that's bumped on logout, password/admin-role change.
- **Related:** F-002.

### F-011 [HIGH] [Phase 1] OAuth `/me` returns the new JWT in the JSON body — frontend can store it in localStorage

- **File:** `apps/api/src/routes/auth.ts:303-304`
- **Evidence:** Same as F-010.
- **Why this is wrong:** A cookie-only session is XSS-protected (`httpOnly: true`). Handing the token back in JSON gives any FE code (or any XSS-injected script) the ability to read it via `axios`/`fetch` interceptors and stash it in `localStorage`. Phase 5 will confirm whether the FE actually does this — but regardless, the API shouldn't make it easy.
- **Suggested direction:** Stop returning the token in the body. The cookie is enough for browsers; mobile/Bearer clients should use the dedicated `/exchange-code` flow.
- **Related:** F-002, F-010.

### F-012 [HIGH] [Phase 1] Auth router middleware refresh of `tesseract_session` cookie does NOT happen on `/me` re-issue — cookie can stay stale while token rotates

- **File:** `apps/api/src/routes/auth.ts:297-305`
- **Evidence:** Same as F-010 — `/me` mints a new token but does NOT call `setSessionCookie(res, token)`.
- **Why this is wrong:** The cookie keeps the old token for its full 7-day life. The body has a new token. FE code that prefers cookie auth uses the stale one. Token versioning becomes ambiguous: which token is active? When a user logs out, the cookie clears but stashed body-tokens remain. Combined with F-011 this fragments the session.
- **Suggested direction:** Issue once, use everywhere. Either always refresh the cookie alongside the body token, or stop returning the body token.
- **Related:** F-010, F-011.

### F-013 [HIGH] [Phase 1] Role hierarchy maps `USER` and `NETWORK` to the same level (1) — a NETWORK user satisfies `requireRole('USER')` checks

- **File:** `apps/api/src/middleware/role.ts:12-20`
- **Evidence:**
  ```
  const roleHierarchy: Record<Role, number> = {
    PUBLIC: 0,
    USER: 1,
    NETWORK: 1,
    MEMBER: 2,
    CORE_MEMBER: 3,
    ADMIN: 4,
    PRESIDENT: 4,
  };
  ```
- **Why this is wrong:** `USER` and `NETWORK` are different *kinds* of accounts (NETWORK is an alumni/professional channel without club membership) but the hierarchy collapses them. If a route says "registered users can register for events" via `requireRole('USER')`, NETWORK profiles pass — possibly unintended. CLAUDE.md §6 documents "USER/NETWORK" as the same level, so this may be deliberate; flag for maintainer confirmation. Phase 2 walks the permission matrix to find specific endpoints where this conflation produces a real bug.
- **Suggested direction:** Either keep this and document that all "user features" are offered to network profiles too, or split the levels and update every `requireRole('USER')` site that excludes network users.
- **Related:** F-014, Phase 2 matrix.

### F-014 [HIGH] [Phase 1] `ADMIN` and `PRESIDENT` share level 4 — there is no privilege distinction between them in the hierarchy

- **File:** `apps/api/src/middleware/role.ts:18-19`
- **Evidence:** Same as F-013.
- **Why this is wrong:** Same conflation as F-013 but at the top of the hierarchy. `requireRole('ADMIN')` lets PRESIDENT pass; `requireRole('PRESIDENT')` lets ADMIN pass. The schema and seed code distinguish them, but the gate doesn't.
- **Suggested direction:** If the distinction matters anywhere, encode it. If it doesn't, drop one role.
- **Related:** F-013.

### F-015 [MED] [Phase 1] Unknown roles silently treated as PUBLIC (level 0) — a typo in a route guard's required role is undetectable at request time

- **File:** `apps/api/src/middleware/role.ts:26-30`
- **Evidence:**
  ```
  if (knownRole === undefined) {
    console.error(`[role.ts] Unknown role "${userRole}" treated as PUBLIC (level 0)`);
  }
  const userLevel = knownRole ?? 0;
  const requiredLevel = roleHierarchy[requiredRole] ?? 0;
  ```
- **Why this is wrong:** If `requireRole('Admin')` (note casing) is ever written, the required level falls back to `0`, so the guard accepts everyone authenticated. The user's role is parameter-validated by the `Role` TS type, but `requireRole` accepts any string at runtime (the `Role` type is erased). A future refactor that pulls a role name from settings/DB could pass anything in. Also, `console.error` (not `logger.error`) for the unknown-user-role path means it bypasses any structured-log capture in production.
- **Suggested direction:** Use `logger.error` and treat unknown role as **deny** rather than `PUBLIC`. The principle is fail-closed for authz.
- **Related:** F-013.

### F-016 [MED] [Phase 1] Feature flags fail open on DB error — disabled features become enabled during outages

- **File:** `apps/api/src/middleware/featureFlag.ts:18-21, 39-51`
- **Evidence:**
  ```
  const DEFAULTS: FeatureFlags = { certificatesEnabled: true, attendanceEnabled: true };
  ...
  } catch (error) {
    logger.error('Failed to fetch feature flags', { ... });
    if (cache) return cache;
    return DEFAULTS;
  }
  ```
- **Why this is wrong:** If an admin disables certificates or attendance (for an emergency or because the underlying flow is broken), and then the DB blips, `getFeatureFlags()` returns DEFAULTS — both enabled — until a subsequent successful read. Cache TTL is 5 min, but the first miss after expiry on a broken DB falls straight to defaults. For attendance specifically, this could enable QR scanning after it was intentionally turned off (e.g., to stop double-scans during a buggy event).
- **Suggested direction:** Fail closed (default `false`) for both flags on DB error, OR return the last-known cached value indefinitely if available.
- **Related:** None.

### F-017 [LOW] [Phase 1] `withRetry` retries only on P1002/P2024/"timed out" — Neon and Postgres surface several other transient errors

- **File:** `apps/api/src/lib/prisma.ts:23-53`
- **Evidence:**
  ```
  if (code === 'P1002' || code === 'P2024' || message?.includes('timed out')) {
    ...
    continue;
  }
  throw error;
  ```
- **Why this is wrong:** `P1001` (cannot reach server), `P1008` (operations timed out), `P1017` (server closed connection), and Neon's `ECONNRESET` errors during cold starts all bypass this retry. The `message?.includes('timed out')` catches some but not all of them.
- **Suggested direction:** Add `P1001`, `P1008`, `P1017` to the retry whitelist, and consider matching on broader connection-class errors.
- **Related:** None.

### F-018 [LOW] [Phase 1] `prisma.ts` registers `beforeExit` Prisma disconnect alongside `index.ts` shutdown handler — double-disconnect race on graceful exit

- **File:** `apps/api/src/lib/prisma.ts:56-58`, `apps/api/src/index.ts:513-528`
- **Evidence:**
  ```
  // prisma.ts
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });

  // index.ts (shutdown)
  await prisma.$disconnect();
  ```
- **Why this is wrong:** Both fire during clean shutdown. Prisma `$disconnect()` is idempotent so this isn't catastrophic, but the `beforeExit` handler also runs at the end of the event loop in non-shutdown scenarios (e.g., the last setTimeout fires), which can disconnect the client mid-request during a quiet period and stall the next request until reconnect.
- **Suggested direction:** Drop the `beforeExit` handler; rely on the explicit `shutdown()` path.
- **Related:** None.

### F-019 [HIGH] [Phase 1] `socketEvents.user{Created,Updated,Deleted}` broadcasts user IDs to **every** connected socket on the root namespace — but the root namespace is closed, so these emits are dead code… except via cross-namespace broadcast? Verify intent

- **File:** `apps/api/src/utils/socket.ts:111-113, 122-151`
- **Evidence:**
  ```
  io.of('/').use((_socket, next) => { next(new Error('NAMESPACE_NOT_FOUND')); });
  ...
  export const socketEvents = {
    userCreated: (userId) => { ... io?.emit('user:created', { userId }); ... },
    userUpdated: (userId) => { ... io?.emit('user:updated', { userId }); ... },
    userDeleted: (userId) => { ... io?.emit('user:deleted', { userId }); ... },
  };
  ```
- **Why this is wrong:** Two contradictions: (a) the root namespace is closed by middleware that rejects all connections, so the `io?.emit(...)` on the root namespace has zero listeners — these calls are dead. (b) If a future change re-opens root or moves the emits to a non-root namespace, this code leaks userIds to every client. `routes/auth.ts:283` calls `socketEvents.userCreated(user.id)` on dev-login. Either delete the broadcaster or scope it.
- **Suggested direction:** Remove the broadcaster entirely (unused), or move emits to an admin namespace that gates with `requireAdmin: true` like `gameAuth` admin pattern.
- **Related:** F-020.

### F-020 [LOW] [Phase 1] Socket.io rate-limit map cleanup leaves stale entries for up to 2× window — DoS resistance is bounded by memory, not blocked

- **File:** `apps/api/src/utils/socket.ts:7-43, 99-107`
- **Evidence:**
  ```
  const SOCKET_CONNECT_WINDOW_MS = 60 * 1000;
  const SOCKET_CONNECT_MAX_PER_WINDOW = 30;
  const socketConnectionRateMap = new Map<string, { count: number; windowStart: number }>();
  ...
  setInterval(() => {
    ...
    for (const [ip, entry] of socketConnectionRateMap.entries()) {
      if (now - entry.windowStart > SOCKET_CONNECT_WINDOW_MS * 2) {
        socketConnectionRateMap.delete(ip);
      }
    }
  }, SOCKET_CONNECT_WINDOW_MS).unref();
  ```
- **Why this is wrong:** An attacker that cycles through unique IPs (e.g., a small botnet) inserts unbounded entries between cleanups. Even with cleanup every 60s, holding entries up to 120s × 30 IPs/sec is 3,600 entries — minimal — but an actual botnet inflates this fast. The cleanup loop itself scans the entire map every 60s, so very large maps add latency to that tick (negligible at 10k, painful at 1M).
- **Suggested direction:** Replace in-memory map with `express-rate-limit`-style token bucket using `rate-limit-redis` (if Redis becomes available) or cap the map at N entries with LRU eviction.
- **Related:** None.

### F-021 [LOW] [Phase 1] `socket.ts` Socket.io CORS allows ALL `http://localhost:*` even in production

- **File:** `apps/api/src/utils/socket.ts:50-57`
- **Evidence:**
  ```
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    ...
  ```
- **Why this is wrong:** Unlike the Express CORS check (which gates localhost on `NODE_ENV === 'development'`), the socket origin check accepts any `http://localhost:*` regardless. On a production server, a browser running on the same host as the API process (rare but conceivable for an SSH-tunneled inspection panel) can connect with arbitrary localhost origin. Severity is bounded because the namespace then performs JWT auth and rate-limits.
- **Suggested direction:** Move the localhost-allow into the `isDevelopment` branch, matching the Express CORS handler in `index.ts:73-90`.
- **Related:** None.

### F-022 [MED] [Phase 1] `sanitizeObject` recurses into plain objects but NOT arrays — string elements of arrays bypass sanitization

- **File:** `apps/api/src/utils/sanitize.ts:174-195`
- **Evidence:**
  ```
  } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    result[key] = sanitizeObject(value as Record<string, unknown>, richFields);
  } else {
    result[key] = value;
  }
  ```
- **Why this is wrong:** A request body like `{ tags: ['<script>alert(1)</script>', 'safe'] }` runs through `sanitizeObject` and arrives at handlers unchanged — the array branch falls into the `else` and the value is preserved verbatim. If any downstream code emits these tags into HTML (email templates, announcements, polls) without re-sanitizing, you have stored XSS. The `User.legacySlugs`, `NetworkProfile.skills`/`legacySlugs`, `Event.tags`, poll `options[].label`, hiring application form fields likely all use arrays of strings.
- **Suggested direction:** Add an `Array.isArray(value)` branch that maps each element through `sanitizeText`/`sanitizeHtml` based on `key`.
- **Related:** Phase 8 §security XSS pass.

### F-023 [HIGH] [Phase 1] Audit log only retries 3 times then silently drops the audit record

- **File:** `apps/api/src/utils/audit.ts:50-74`
- **Evidence:**
  ```
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await prisma.auditLog.create({ data: payload });
      return;
    } catch (error) {
      ...
      if (attempt === 3) {
        logger.error('Failed to create audit log after retries', {...});
        return;
      }
      ...
    }
  }
  ```
- **Why this is wrong:** Audit logs are the only durable trail of admin actions (role changes, certificate issuance, mass email, attendance overrides). If the DB is wedged, the audit row is silently lost and the *mutation* still succeeded (the handler called `auditLog` after its update). Compliance and "who did what" investigations both fail. For a club platform this is medium-impact; if any institutional audit ever runs against this system, it's high.
- **Suggested direction:** Either fail-loud (throw on persistent audit failure, with handler rolling back) or write to a local file fallback when DB is unreachable.
- **Related:** F-024.

### F-024 [HIGH] [Phase 1] Audit log failure is opaque to callers — admin mutations succeed even when audit fails, no return signal

- **File:** `apps/api/src/utils/audit.ts:30-75` (signature `Promise<void>`)
- **Evidence:** `auditLog` is `Promise<void>`, no return value. Callers `await auditLog(...)` and have no way to detect failure short of inspecting logs.
- **Why this is wrong:** Every admin mutation handler in the codebase that follows the documented pattern `await mutate(); await auditLog(...)` cannot guarantee the audit happened. The handler returns 200 to the client even when the audit row was dropped. For roles/permissions/certificate issuance, this is the only forensic trail.
- **Suggested direction:** Make `auditLog` return `boolean` or throw on failure; require route handlers to choose whether to propagate.
- **Related:** F-023.

### F-025 [LOW] [Phase 1] Insecure JWT_SECRET fallback in non-production is shared per-process and bypasses the warning after first emit

- **File:** `apps/api/src/utils/jwt.ts:34-71`
- **Evidence:**
  ```
  const DEV_FALLBACK_SECRET = 'dev_local_jwt_secret_change_me_before_production';
  let hasWarnedAboutDevSecret = false;
  ...
  if (!hasWarnedAboutDevSecret) {
    hasWarnedAboutDevSecret = true;
    console.warn(`⚠️ Using development JWT fallback secret. Set one of ${...}`);
  }
  return DEV_FALLBACK_SECRET;
  ```
- **Why this is wrong:** Two issues. (a) Tokens signed in dev with the well-known fallback secret are *forgeable by anyone*, including malicious npm packages or anyone who reads this audit. If a dev token leaks (e.g., via a shared `.env` paste in Slack), the secret is the value you can look up here. (b) The warning fires once per process; a long-running dev server only logs it at start, so a dev who joins the tab mid-session sees nothing. Production correctly hard-fails via the `throw` at line 57-60.
- **Suggested direction:** Random per-process fallback (use `randomBytes`) — every dev restart gets a new secret, signed dev tokens auto-invalidate on restart. Re-emit the warning every N minutes if `NODE_ENV !== 'production'`.
- **Related:** None.

### F-026 [LOW] [Phase 1] `index.ts` startup hard-fails if `getJwtSecret()` throws but does not validate `BREVO_API_KEY`, Cloudinary, or `ATTENDANCE_JWT_SECRET` similarly

- **File:** `apps/api/src/index.ts:107-115`
- **Evidence:**
  ```
  getJwtSecret(); // throws in prod if missing
  if (!process.env.BREVO_API_KEY) {
    logger.warn('BREVO_API_KEY not set — all email functionality disabled (certificates, reminders, announcements)');
  }
  if (!process.env.CLOUDINARY_CLOUD_NAME || ...) {
    logger.warn('Cloudinary not fully configured — certificate PDF upload and image upload will fail');
  }
  ```
- **Why this is wrong:** The JWT secret is hard-required; the rest are warn-only. In a partial-config prod deploy, the API boots, accepts logins, but every email and every cert/image upload fails silently. Worse, the warn at startup is the *only* signal — there's no `/health` check that surfaces "I'm missing Cloudinary."
- **Suggested direction:** Add the optional config to `/health/db` (or `/health/config`) so deployment dashboards can alert. In strict-mode env (e.g., `STRICT_ENV=true`), fail hard on missing optional config too.
- **Related:** F-027.

### F-027 [HIGH] [Phase 1] Runtime mutation of `process.env.INDEXNOW_KEY` from Settings — env vars treated as mutable global state

- **File:** `apps/api/src/index.ts:158-163`, `apps/api/src/routes/settings.ts:163-165`
- **Evidence:**
  ```
  if (storedIndexNowKey) {
    process.env.INDEXNOW_KEY = storedIndexNowKey;
    ...
  ```
- **Why this is wrong:** Any code that reads `process.env.INDEXNOW_KEY` later sees a different value than at boot. The pattern leaks settings-mutability into the Node runtime, which is a well-known anti-pattern (env is a process-start contract). It also means a setting change requires a process restart only on *some* code paths, while others pick it up live — a confusing operational model. Worse, `settings.ts:165` does `delete process.env.INDEXNOW_KEY` when the setting is cleared, which can race with reads from other routes/handlers that captured `process.env.INDEXNOW_KEY` into a local at module-load.
- **Suggested direction:** Cache the runtime-hydrated value in a typed module-level variable (mirrors `runtimeAttendanceJwtSecret` in `attendanceToken.ts`) and provide a `getIndexNowKey()` getter. Stop touching `process.env`.
- **Related:** F-038 (attendanceToken does this correctly).

### F-028 [HIGH] [Phase 1] Settings table is treated as a singleton with `id: 'default'` but no DB-level constraint enforces singletoneness

- **File:** `apps/api/src/middleware/featureFlag.ts:35-38`, `apps/api/src/index.ts:136-142`, `apps/api/src/utils/init.ts:59-72`
- **Evidence:**
  ```
  prisma.settings.findUnique({ where: { id: 'default' }, ... });
  // and elsewhere:
  prisma.settings.findFirst({ select: { clubName: true } });
  ```
- **Why this is wrong:** Two read patterns coexist — one targets the well-known `id: 'default'`, another uses `findFirst` (which is non-deterministic without `orderBy`). If a second Settings row ever lands in the table (manual SQL, a buggy seed, a migration that re-runs), `findFirst` may return the wrong one, and feature flags evaluated by one of the patterns will diverge from the other.
- **Suggested direction:** Add an exclusion constraint to enforce singleton row, *and* migrate every reader to the same pattern (`findUnique({ where: { id: 'default' } })`).
- **Related:** F-029.

### F-029 [LOW] [Phase 1] Schedule `processReminders` uses raw `Date()` arithmetic and `Intl.DateTimeFormat` for "Asia/Kolkata hour" comparison — DST transitions are not relevant in IST but the pattern is fragile

- **File:** `apps/api/src/utils/scheduler.ts:240-246`
- **Evidence:**
  ```
  gameContentInterval = setInterval(() => {
    const istHour = Number(new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      hour12: false,
    }).format(new Date()));
    if (istHour === 0) void ensureDailyGameContent();
  }, 60 * 60 * 1000);
  ```
- **Why this is wrong:** `setInterval(..., 60*60*1000)` drifts over weeks (Node `setInterval` is not wall-clock precise). It also fires once per hour and only acts if the IST hour is `0`, meaning the daily content generation has a 1-hour window — if a tick is skipped (process pause, restart, GC stall), the day's content is missed entirely. The reload at startup (`void ensureDailyGameContent()` at line 237) covers a fresh deploy, but a sleeping process won't catch up.
- **Suggested direction:** Switch to a cron expression (`node-cron`) or compute the next-IST-midnight as a one-shot `setTimeout` that re-schedules itself.
- **Related:** F-030, Phase 9 perf.

### F-030 [LOW] [Phase 1] `scheduler.ts:reminderColumnAvailable` is a process-local flag that silently disables reminders forever after one error — and never re-checks

- **File:** `apps/api/src/utils/scheduler.ts:11, 181-204`
- **Evidence:**
  ```
  let reminderColumnAvailable = true;
  ...
  if (error instanceof Error && error.message.includes('reminder_sent_at')) {
    reminderColumnAvailable = false;
    logger.warn('Reminder scheduler disabled: ...');
    return;
  }
  ```
- **Why this is wrong:** If the column is missing once (e.g., migration not yet applied), the flag stays `false` until process restart. After the migration is applied, reminders remain disabled because nothing rechecks. Operators must remember to restart the API after applying migrations.
- **Suggested direction:** Re-check on every tick (cheap), or expose a `triggerReminderCheck` admin endpoint that flips the flag back when it succeeds.
- **Related:** None.

### F-031 [LOW] [Phase 1] `scheduler.ts:processReminders` does serial sends with hard-coded 200ms `setTimeout` between each — does not scale beyond ~600 reminders/2min

- **File:** `apps/api/src/utils/scheduler.ts:146-172`
- **Evidence:**
  ```
  for (const registration of pendingRegistrations) {
    ...
    try {
      const success = await emailService.sendEventReminder(...);
      ...
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      ...
    }
  }
  ```
- **Why this is wrong:** 1000 reminders = ~200 seconds of wall-clock blocking the scheduler. If an event has 5000 registrants and a reminder window of 24h, the scheduler fires every 6h, so each tick must process ~1250 — 250s — fine. But if Brevo rate-limits during the window, the catch path doesn't back off. Also, the 200ms is a sleep *after* every successful send — no parallel sends.
- **Suggested direction:** Use a small concurrency pool (e.g., 5 parallel sends) and only sleep when Brevo returns a 429.
- **Related:** Phase 9.

### F-032 [HIGH] [Phase 1] `attendanceToken.ts` falls back to an in-memory random secret if no settings secret is configured — restarting the process **invalidates every outstanding attendance QR**

- **File:** `apps/api/src/utils/attendanceToken.ts:31-43`
- **Evidence:**
  ```
  if (!warnedAboutTemporarySecret) {
    warnedAboutTemporarySecret = true;
    logger.warn('Attendance secret is missing. Using an ephemeral in-memory fallback ...');
  }
  if (!ephemeralAttendanceJwtSecret) {
    ephemeralAttendanceJwtSecret = randomBytes(32).toString('hex');
  }
  return ephemeralAttendanceJwtSecret;
  ```
- **Why this is wrong:** Attendance QR tokens are issued with `expiresIn: '90d'` (line 13). If a deploy restarts the API and the settings secret was never configured, every QR ever printed and emailed becomes invalid — and the failure mode at scan time is opaque to the operator (the scanner sees "invalid token"). Same risk applies to horizontally scaled replicas: each replica generates its own ephemeral secret, so QRs signed by replica A don't verify on replica B. The `runtimePreviousAttendanceSecrets` set (line 17) only handles the case where an *admin updates* the secret — not the cold-start-new-instance case.
- **Suggested direction:** Refuse to issue attendance tokens until a settings secret is configured. Surface a banner in the admin UI. Never fall back to ephemeral.
- **Related:** F-033.

### F-033 [LOW] [Phase 1] `attendanceToken.ts:setRuntimeAttendanceJwtSecret` removes the secret from the previous-secret set only when re-set to itself, but keeps stale previous-secrets across restarts (in-memory, not persisted)

- **File:** `apps/api/src/utils/attendanceToken.ts:45-58`
- **Evidence:**
  ```
  if (runtimeAttendanceJwtSecret && normalized && runtimeAttendanceJwtSecret !== normalized) {
    runtimePreviousAttendanceSecrets.add(runtimeAttendanceJwtSecret);
  }
  runtimeAttendanceJwtSecret = normalized;
  ```
- **Why this is wrong:** Rotation works in-memory but is lost on restart. A QR issued under secret A, then rotation to B, then process restart — the QR signed by A no longer verifies. The "previous secrets" should be persisted in Settings (`attendanceJwtSecretPrevious` JSON array) and rehydrated.
- **Suggested direction:** Persist the previous secrets in Settings during rotation, hydrate on boot.
- **Related:** F-032.

### F-034 [LOW] [Phase 1] `init.ts` deletes a specific *failed* migration row by name on every boot — fragile coupling to one historical fix

- **File:** `apps/api/src/utils/init.ts:14-27`
- **Evidence:**
  ```
  const deleted = await prisma.$executeRaw`
    DELETE FROM "_prisma_migrations"
    WHERE migration_name = '20260220003000_harden_email_and_network_query_indexes'
    AND rolled_back_at IS NULL
    AND finished_at IS NULL
  `;
  ```
- **Why this is wrong:** This is a one-time fix permanently baked into boot. If another migration ever fails in the future, the same code does nothing. Worse, if Prisma changes its internal `_prisma_migrations` schema, this raw delete may break boot.
- **Suggested direction:** Remove now that the migration has presumably been re-applied successfully. If you need a recovery mechanism, expose it as an admin CLI command, not as a boot-time side effect.
- **Related:** None.

### F-035 [MED] [Phase 1] `init.ts:populateAnnouncementSlugs` and `:populateProfileSlugs` run on every boot, do full-table scans, and update every row whose canonical slug differs

- **File:** `apps/api/src/utils/init.ts:89-128, 140-223`
- **Evidence:**
  ```
  const teamMembers = await prisma.teamMember.findMany({
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, name: true, slug: true, legacySlugs: true },
  });
  ...
  for (const member of teamMembers) {
    const baseSlug = generateSlug(member.name) || 'team-member';
    const canonicalSlug = generateUniqueSlug(baseSlug, Array.from(usedTeamSlugs));
    ...
    if (hasCanonicalChanged || hasLegacyChanged) {
      await prisma.teamMember.update({ ... });
      ...
    }
  }
  ```
- **Why this is wrong:** Boot-time backfill is fine for one-time migrations, but this runs on *every* process start. If two replicas restart simultaneously, both walk the table and race-update — `Set<string>`s diverge per replica, so two slug paths "alice" / "alice-1" can be assigned to the same row by competing instances, and `legacySlugs` arrays diverge. The "is it different from current" check (line 167) prevents most writes but not the race. Worse, if `usedTeamSlugs` is built locally per replica with no DB-level uniqueness constraint, both can write `slug='alice'` to different rows and the unique constraint will reject one — surfacing as a 500 in audit, not a clean exit.
- **Suggested direction:** Move slug backfills to one-shot migration scripts under `prisma/migrations/`. Drop the boot-time call.
- **Related:** F-036.

### F-036 [LOW] [Phase 1] `init.ts` instantiates its own `PrismaClient` separate from `lib/prisma.ts` — two client instances coexist

- **File:** `apps/api/src/utils/init.ts:7`
- **Evidence:**
  ```
  import { PrismaClient } from '@prisma/client';
  ...
  const prisma = new PrismaClient();
  ```
- **Why this is wrong:** Every other file imports the singleton from `lib/prisma.js`. This one creates a second client, doubling the connection-pool footprint at boot and bypassing the global-cache logic in `lib/prisma.ts` that prevents reconnect storms in dev (hot-reload). On Neon, with a hard cap on connections, this matters.
- **Suggested direction:** Import the singleton.
- **Related:** None.

### F-037 [LOW] [Phase 1] `index.ts:402` mounts games BEFORE the `/api/indexnow` route — order of mounting determines `app.use('/api', ...)` rate limit applicability to admin sub-routes

- **File:** `apps/api/src/index.ts:300, 402-403`
- **Evidence:**
  ```
  app.use('/api', limiter); // line 300
  ...
  mountGames(app); // line 402
  app.use('/api/indexnow', authMiddleware, requireRole('ADMIN'), indexNowRouter);
  ```
- **Why this is wrong:** Both `mountGames` and the `/api/indexnow` registrar mount under `/api`, so both inherit the 500/15min global limiter — fine. But the admin game-content routes (`/api/admin/games/*`) ALSO inherit the same 500/15min limit, which is generous enough for normal admin use but doesn't separately throttle abusive admin-token replay.
- **Suggested direction:** None — flag for awareness. Phase 8 will revisit rate-limit granularity.
- **Related:** Phase 8.

### F-038 [MED] [Phase 1] CSRF middleware allows preflight OPTIONS via `SAFE_HTTP_METHODS` set but does NOT validate `Origin` against the Access-Control-Allow-Origin response

- **File:** `apps/api/src/index.ts:71, 259-285`
- **Evidence:**
  ```
  const SAFE_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
  ...
  app.use('/api', (req, res, next) => {
    if (SAFE_HTTP_METHODS.has(req.method.toUpperCase())) {
      return next();
    }
    if (req.headers.authorization?.startsWith('Bearer ')) {
      return next();
    }
    if (!hasSessionCookie(req.headers.cookie)) {
      return next();
    }
    const origin = ...; const refererOrigin = ...; const requestOrigin = origin || refererOrigin;
    if (requestOrigin && isAllowedBrowserOrigin(requestOrigin)) {
      return next();
    }
    return ApiResponse.error(res, { code: ErrorCodes.FORBIDDEN, message: '...', status: 403 });
  });
  ```
- **Why this is wrong:** The CSRF gate is sound *conditional on* the browser sending an `Origin` or `Referer` header. Modern browsers do, but `<form method=POST action=...>` from a non-allowed origin without `Origin` is rare. The real risk: an attacker who can drop a CSP-allowed `<form>` on an allowed origin can still issue cookie-authenticated cross-form POSTs, bypassing the SameSite=Lax cookie flag (Lax permits top-level POST navigations within 2 minutes of cookie set, which is enough for a redirect-chain attack right after login). The defense relies entirely on `sameSite: 'lax'` for top-level POSTs.
- **Suggested direction:** Switch session cookie to `sameSite: 'strict'` for the main cookie, accepting the cost of breaking some redirect-flows. Or add a custom CSRF token requirement on cookie-authenticated mutations.
- **Related:** F-046.

### F-039 [LOW] [Phase 1] `index.ts:236-238` sets `trust proxy = 1` in production only — local dev behind a tunnel (e.g., ngrok) misreports IPs and rate-limits the tunnel rather than the client

- **File:** `apps/api/src/index.ts:236-238`
- **Evidence:**
  ```
  if (NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }
  ```
- **Why this is wrong:** Dev-time testing of attendance scanners or socket connections via ngrok produces wrong `req.ip` values and disproportional rate limiting.
- **Suggested direction:** Trust proxy from env: `app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || (NODE_ENV === 'production' ? 1 : 0)))`.
- **Related:** None.

### F-040 [HIGH] [Phase 1] Global error handler returns generic 500 with raw error stack in development — but also logs `err.stack` even in production

- **File:** `apps/api/src/index.ts:468-485`
- **Evidence:**
  ```
  logger.error('Unhandled error', { 
    error: err.message, 
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  
  const message = NODE_ENV === 'production' 
    ? 'An unexpected error occurred' 
    : err.message;
  ```
- **Why this is wrong:** `err.message` in dev returned to client is fine. But the client-facing message has no `code`, no `requestId`, no actionable info. From the frontend's perspective, "An unexpected error occurred" cannot be distinguished from 100 different failure modes. Add a request ID per response and surface it in the error body.
- **Suggested direction:** Generate a `requestId` per request (UUID), attach to logger via `req.id`, and include it in the error body so users can quote it in bug reports.
- **Related:** F-041.

### F-041 [MED] [Phase 1] No request-ID propagation; ops cannot correlate a user-reported 500 with a server log line

- **File:** `apps/api/src/utils/logger.ts:63-75`, `apps/api/src/index.ts:454-485`
- **Evidence:** `requestLogger` logs `method`, `url`, `status`, `duration`, `ip`, `userAgent` — but no per-request ID. Error handler also lacks one.
- **Why this is wrong:** Production debugging requires correlating a user-reported time/error with a log line. Without an ID echoed in both the response body and the log, ops must guess by URL+timestamp — and concurrent requests on the same path are indistinguishable.
- **Suggested direction:** Add `randomUUID()` per request, store on `req.id`, log on every line, return in error responses.
- **Related:** F-040.

### F-042 [LOW] [Phase 1] `index.ts:454-485` global error handler does not call `ApiResponse.error` with `error.code` from the upstream — every unhandled error collapses to `INTERNAL_ERROR`

- **File:** `apps/api/src/index.ts:480-484`
- **Evidence:**
  ```
  ApiResponse.error(res, {
    code: ErrorCodes.INTERNAL_ERROR,
    message,
    status: 500,
  });
  ```
- **Why this is wrong:** If a handler throws an `ApiError`-shaped error (with `code`/`status`), this handler ignores those properties and returns INTERNAL_ERROR/500. Frontend cannot distinguish a `VALIDATION_FAILED` thrown error from a true crash. The pattern across the codebase is that handlers call `ApiResponse.error(res, {...})` directly and never throw, so this collapse only hits truly unhandled errors — but it makes upgrading to throw-based handlers risky.
- **Suggested direction:** Inspect `err` for `code`/`status` properties before collapsing.
- **Related:** F-040.

### F-043 [LOW] [Phase 1] `index.ts:445-451` 404 handler echoes user-controlled `req.method` and `req.path` directly in the response — and `JSON.stringify` in `logger` may leak

- **File:** `apps/api/src/index.ts:445-451`
- **Evidence:**
  ```
  app.use((req, res) => {
    ApiResponse.error(res, {
      code: ErrorCodes.NOT_FOUND,
      message: `Route ${req.method} ${req.path} not found`,
      status: 404,
    });
  });
  ```
- **Why this is wrong:** `req.path` includes the raw URL path including any path-traversal attempt the attacker crafted. Echoed back in a JSON body, this is reflected XSS *only if* the client renders the message into HTML without escaping — which the React FE shouldn't, but any external alerting service or email-on-404 pipeline that uses HTML rendering would.
- **Suggested direction:** Don't echo the path; reply with a generic "Route not found" message; log the path server-side only.
- **Related:** Phase 8.

### F-044 [LOW] [Phase 1] `index.ts:537-541` retries `EADDRINUSE` up to 5 times with 1500ms delay — masks a stuck port from operators instead of failing loudly

- **File:** `apps/api/src/index.ts:533-559`
- **Evidence:**
  ```
  if (error.code === 'EADDRINUSE' && attempt < MAX_LISTEN_RETRIES) {
    logger.warn('Port is busy, retrying server start', {...});
    setTimeout(() => startHttpServerWithRetry(attempt + 1), LISTEN_RETRY_DELAY_MS);
    return;
  }
  ```
- **Why this is wrong:** Dev convenience (the previous process hasn't released the port) but in production it papers over a zombie process. If the orchestrator (Render) restarts the container after timeout, the new container waits 7.5s before realizing port is busy, then exits — wasted boot.
- **Suggested direction:** Retry only when `NODE_ENV === 'development'`.
- **Related:** None.

### F-045 [MED] [Phase 1] `authLimiter` skipSuccessfulRequests is true — successful dev-login or OAuth callback never counts against the limit

- **File:** `apps/api/src/index.ts:303-310`
- **Evidence:**
  ```
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: { error: 'Too many authentication attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
  });
  ```
- **Why this is wrong:** Credential-stuffing/dev-auth-spray attacks are typically caught by counting failures. `skipSuccessfulRequests: true` counts only failures, so legitimate users aren't penalized. Fine. But: `/api/auth/dev-login` (gated by env) and `/api/auth/exchange-code` are POSTs under this limiter. Exchange-code, in particular, is a hot path — a real user hitting `/exchange-code` once after login is one *successful* call, so no limit applied. But an attacker spamming `/exchange-code` with random tokens triggers 50 failures in 15 minutes — fine. The risk: `skipSuccessfulRequests` ALSO skips 401-returning successful HTTP responses if the request actually validates. With `auth.ts`'s pattern of returning `401` via `res.status(401).json(...)`, the rate limiter sees a non-200 response and does count it as a failure. OK then. **No bug; flag for confirmation in Phase 8.**
- **Suggested direction:** None. Confirm `express-rate-limit` v7 considers `res.statusCode >= 400` as failure under `skipSuccessfulRequests: true` (it does).
- **Related:** None.

### F-046 [HIGH] [Phase 1] `sameSite: 'lax'` cookie is too permissive for SPAs that don't use top-level navigation logins — and is set without `__Host-` prefix

- **File:** `apps/api/src/routes/auth.ts:52-63, 65-74`
- **Evidence:**
  ```
  res.cookie('tesseract_session', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    ...(domain ? { domain } : {}),
    path: '/',
  });
  ```
- **Why this is wrong:** `sameSite: 'lax'` permits top-level cross-site POSTs within ~2 minutes of cookie set on some browsers (the "Lax+POST" exception). For a banking-grade flow this is unsafe; for a club platform it's defensible. The absence of `__Host-` prefix means a sibling subdomain (e.g., a misconfigured staging env) can overwrite the cookie. If `COOKIE_DOMAIN` is set to a parent domain, this is more concerning.
- **Suggested direction:** When no `COOKIE_DOMAIN` is set, prefix the cookie with `__Host-` (Browser pinning to current host, must be `Secure`, no Domain attribute). For cookie-domain deployments, use `__Secure-` prefix and rotate the cookie name once for the prefix change.
- **Related:** F-038.

### F-047 [LOW] [Phase 1] `clearSessionCookie` is missing the `httpOnly` flag and the `maxAge: 0` style fast-expire — relies on Express default `clearCookie` semantics

- **File:** `apps/api/src/routes/auth.ts:65-74`
- **Evidence:**
  ```
  const clearSessionCookie = (res: Response) => {
    const isProd = process.env.NODE_ENV === 'production';
    const domain = cookieDomain();
    res.clearCookie('tesseract_session', {
      secure: isProd,
      sameSite: 'lax',
      ...(domain ? { domain } : {}),
      path: '/',
    });
  };
  ```
- **Why this is wrong:** Browsers match cookies for deletion by name + path + domain + secure (some user agents also require sameSite match). Missing `httpOnly` may mean the deletion request doesn't match a cookie that was set with `httpOnly: true` in some implementations.
- **Suggested direction:** Mirror the `setSessionCookie` options exactly when clearing.
- **Related:** F-005.

### F-048 [HIGH] [Phase 1] `setSessionCookie` does not include `signed: true` — cookies are not server-signed; tampering must be detected by JWT verify alone

- **File:** `apps/api/src/routes/auth.ts:52-63`
- **Evidence:** Same as F-046.
- **Why this is wrong:** No defense in depth. If a future code path reads the cookie value without verifying the JWT (e.g., a debugging route, or someone uses `req.cookies` after adding `cookie-parser`), tampered values get through. JWT verify is the only barrier.
- **Suggested direction:** None for now; flag if `cookie-parser` is added later.
- **Related:** None.

### F-049 [LOW] [Phase 1] `authRouter.post('/logout')` always returns 200 with `{ message: 'Logged out successfully' }` — even if no session existed

- **File:** `apps/api/src/routes/auth.ts:360-363`
- **Evidence:**
  ```
  authRouter.post('/logout', (_req: Request, res: Response) => {
    clearSessionCookie(res);
    res.json({ message: 'Logged out successfully' });
  });
  ```
- **Why this is wrong:** Returns success unconditionally; nice for client simplicity. But: clearing a non-existent cookie is wasteful and a 200 response without `success: true` (which the rest of the API uses) is inconsistent.
- **Suggested direction:** Return `ApiResponse.success(res, null, 'Logged out')`.
- **Related:** Phase 4 contract consistency.

### F-050 [LOW] [Phase 1] `authRouter.get('/providers')` exposes whether dev-login is enabled — a low-signal but useful enumeration aid for attackers

- **File:** `apps/api/src/routes/auth.ts:117-124`
- **Evidence:**
  ```
  authRouter.get('/providers', (_req: Request, res: Response) => {
    res.json({
      google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id'),
      github: false,
      devLogin: isDevLoginEnabled(),
      emailPassword: false,
    });
  });
  ```
- **Why this is wrong:** Discloses that dev-login is enabled — combined with F-009, that's a roadmap for an attacker to attempt `/api/auth/dev-login`. In dev this is fine; the route is gated. Make sure the FE never renders `devLogin: true` in a production build.
- **Suggested direction:** None in code; Phase 6 will check if the FE conditionally renders dev-login UI.
- **Related:** F-009.

### F-051 [LOW] [Phase 1] `setRuntimeAttendanceJwtSecret` resets `warnedAboutTemporarySecret` flag on every set — so multiple secret rotations re-emit the same "missing" warning at next miss

- **File:** `apps/api/src/utils/attendanceToken.ts:58`
- **Evidence:** `warnedAboutTemporarySecret = false;` — at the end of `setRuntimeAttendanceJwtSecret`.
- **Why this is wrong:** If `normalized` is set successfully, the flag is still reset — even though the secret is now present and the next `getAttendanceJwtSecret()` will succeed without warning. Harmless but inconsistent.
- **Suggested direction:** Only reset the flag when `normalized` is `null` (secret cleared).
- **Related:** F-032.

### F-052 [LOW] [Phase 1] `requestLogger` (`logger.ts:81-90`) logs every request including authenticated calls with no body size limit — large request bodies show up in logs by URL only, which is fine; no body logged. Watch for future change

- **File:** `apps/api/src/utils/logger.ts:63-90`
- **Evidence:** Logger never logs body. Safe today.
- **Why this is wrong:** Flagging only because the codebase has a pattern of "add things to logger over time"; if anyone ever adds `req.body` to the request log, secrets leak.
- **Suggested direction:** Document in `logger.ts` that body must never be logged.
- **Related:** None.

### F-053 [MED] [Phase 1] `passport.serializeUser((user: any, done) => ...)` uses `any` and the deserialize fetches by id with no select — pulls every field on every passport session read

- **File:** `apps/api/src/config/passport.ts:131-142`
- **Evidence:**
  ```
  passport.serializeUser((user: any, done) => { done(null, user.id); });
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
  ```
- **Why this is wrong:** Passport sessions are unused in this app (`passport.initialize()` only, no `passport.session()` in `index.ts`), but the deserializer fires on any route that includes `passport.authenticate(..., { session: true })` — and Google's OAuth callback uses `session: false`, so this is dead code. Confirm Phase 7.
- **Suggested direction:** Remove deserialize/serialize unless a future feature reintroduces sessions.
- **Related:** Phase 7.

### F-054 [LOW] [Phase 1] Module-level `process.on('beforeExit')` in `lib/prisma.ts` is registered every time the module is imported — in dev with `tsx watch` hot reload, listener count grows

- **File:** `apps/api/src/lib/prisma.ts:56-58`
- **Evidence:** Same as F-018.
- **Why this is wrong:** Each hot-reload re-evaluates the module. Each re-evaluation registers another `beforeExit` listener. Node logs `MaxListenersExceededWarning` after 11. Dev-time annoyance only.
- **Suggested direction:** Guard with `if (!global.__prismaBeforeExitRegistered)` before registering.
- **Related:** F-018.

---

## Diagnostics

- `npx tsc --noEmit -p apps/web` — exit 0, clean.
- `npx tsc --noEmit -p apps/api` — exit 0, clean.
- `npm run lint --workspaces` — not yet run; will be in next phase block.

---

# Findings from delegated reads (Explore agents)

The following batches were produced by parallel Explore subagents reading the largest API files with the §2 checklist. I have reviewed each finding against the actual source to confirm. Annotated where the agent overstated or where I disagree.

## Batch B — `apps/api/src/routes/attendance.ts` (2,477 LOC)

### F-055 [HIGH] [Phase 1] `/scan-beacon` accepts bearer token from body via `authToken` field — bypasses `authMiddleware`'s rejection of attendance-purpose tokens

- **File:** `apps/api/src/routes/attendance.ts:677-733`
- **Evidence:**
  ```
  router.post('/scan-beacon', beaconLimiter, requireFeature('attendance'), express.text({ type: '*/*' }), async (req, res) => {
    const cookieToken = getCookie(req, 'tesseract_session');
    const bodyToken = typeof authToken === 'string' && jwtLikePattern.test(authToken) ? authToken : undefined;
    const effectiveToken = cookieToken || bodyToken;
    if (!effectiveToken) { return res.status(401).send(); }
    let decoded;
    try { decoded = verifyToken(effectiveToken); }
    catch { return res.status(401).send(); }
  ```
- **Why this is wrong:** `verifyToken` (in `utils/jwt.ts`) DOES reject attendance-purpose tokens (line 137-139 there). So the auth check is actually safe. **But** the endpoint takes a `text/*` body, parses JWT from it, and bypasses the standard authMiddleware path — that means it also bypasses the `tesseract_session` cookie scope rules, CSRF guard (POST is mutating), and the request logger context. The endpoint reads `authToken` field from a parsed JSON-from-text — fragile. Severity: HIGH for the bypass surface area; verified the JWT verify itself is purpose-safe.
- **Suggested direction:** Funnel beacon scans through the same JWT path as regular requests, or document that `verifyToken` is the canonical "auth gate" used here and write a regression test.

### F-056 [MED] [Phase 1] `/backfill-tokens` admin endpoint serially loops `prisma.eventRegistration.update` — O(N) sequential round-trips

- **File:** `apps/api/src/routes/attendance.ts:2448-2457`
- **Evidence:**
  ```
  for (const reg of batch) {
    const token = generateAttendanceToken(reg.userId, reg.eventId, reg.id);
    await prisma.eventRegistration.update({ where: { id: reg.id }, data: { attendanceToken: token } });
    backfilled++;
  }
  ```
- **Why this is wrong:** One-time admin tool; the slowness is annoying not dangerous. But token regen for 5,000 registrations = 5,000 sequential updates = minutes. During that time the admin Node thread is blocked. If the request times out at the reverse proxy, partial backfill leaves a mix of old/new tokens.
- **Suggested direction:** `prisma.$transaction(batch.map(reg => prisma.eventRegistration.update({...})))` or use `updateMany` keyed off generated tokens prepared in memory.

### F-057 [HIGH] [Phase 1] `/scan-batch` does not validate that the eventId in `req.body` corresponds to the registrations being scanned

- **File:** `apps/api/src/routes/attendance.ts:433-536`
- **Evidence:** As quoted by the delegated agent — `regIds = verified.map((v) => v.payload.registrationId)`, `registrations = await prisma.eventRegistration.findMany({ where: { id: { in: regIds } } })`. No filter on `eventId` in the where clause.
- **Why this is wrong:** A CORE_MEMBER scanning at event A could submit a batch of QR tokens that were issued for event B; the loop iterates the registrations and writes `DayAttendance` against whichever event each registration belongs to — possibly cross-marking attendance for a totally different event. The token itself binds userId+eventId+registrationId, so the registrationId is authoritative, but the *operator's intent* (which event they're scanning at) is ignored.
- **Suggested direction:** Add `eventId` to the where clause and reject any registration whose eventId doesn't match the request's `eventId`.

### F-058 [CRIT] [Phase 1] `/scan` check-then-create attendance race — concurrent same-user scan can hit unique constraint and surface as 500

- **File:** `apps/api/src/routes/attendance.ts:361-397`
- **Evidence:** Quoted in delegated agent's F-058 — `updateMany` returns 0, `findUnique` returns nothing, then `create` runs. Two parallel scans on the same QR (e.g., dual-scanner setups) hit the create-race.
- **Why this is wrong:** The downgrade from CRIT to HIGH is appropriate — this isn't a data-loss bug (the unique constraint prevents double attendance) but the second scan returns a 500 to the operator instead of a clean "already marked" 409. Operators may panic-rescan, generating noise.
- **Suggested direction:** Wrap the create in `try { create } catch (P2002) { return conflict() }`, or use `prisma.dayAttendance.upsert`.
- **Severity correction (auditor):** **HIGH**, not CRIT — agent over-rated. No data is lost.

### F-059 [LOW] [Phase 1] `/event/:eventId/full` refuses lists over `ATTENDANCE_FULL_LIST_LIMIT` (5000) instead of paginating — admins of large events cannot use this endpoint

- **File:** `apps/api/src/routes/attendance.ts:1722-1785`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** UX degradation; admin must fall back to `/export`. Not a bug per se — the limit prevents OOM — but the failure mode is "ApiResponse.badRequest with helpful message", which is OK. Severity downgraded.
- **Severity correction:** **LOW**, not MED.

### F-060 [MED] [Phase 1] `/event/:eventId/summary` runs N parallel `count` queries (one per event day) instead of one `groupBy`

- **File:** `apps/api/src/routes/attendance.ts:2383-2403`
- **Evidence:** Agent quote verified — `Promise.all(Array.from({length: eventDays}, ...).map(async (dayNumber) => ({ dayNumber, attended: await prisma.dayAttendance.count({...}) })))`.
- **Why this is wrong:** For a 7-day event, 9 DB round-trips when 1 would suffice. Latency multiplier visible at Neon cold start.
- **Suggested direction:** `prisma.dayAttendance.groupBy({ by: ['dayNumber'], where: { ..., registration: { eventId } }, _count: { _all: true } })`.

### F-061 [LOW] [Phase 1] `resolveClientScannedAt` accepts client-supplied timestamp within ±24h window — operators can backdate scans

- **File:** `apps/api/src/routes/attendance.ts:85-106, 596, 817-819`
- **Evidence:** Agent quote verified — `parsedMs > nowMs + CLIENT_SCAN_FUTURE_TOLERANCE_MS || parsedMs < nowMs - CLIENT_SCAN_MAX_AGE_MS` falls back to `now`.
- **Why this is wrong:** Within the allowed window, the value is trusted verbatim and written to `scannedAt`. A misbehaving scanner client can mark "I scanned this user at 8am" when the actual scan was 11am. Audit trail uses this value. For attendance forensics this matters.
- **Suggested direction:** Drop client time entirely or audit-log both client- and server-time.

### F-062 [LOW] [Phase 1] `parseDayLabels` is read-only here but read-only assumption is silent — flag for cross-file verification

- **File:** `apps/api/src/routes/attendance.ts:113-119`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** Defers to events route which sets `dayLabels` — Phase 4 will confirm whether the write side sanitizes. Reading side is safe.
- **Severity correction:** **LOW**, not MED. Not actionable here.

### F-063 [HIGH] [Phase 1] `/edit/:registrationId` mutates attendance state with **no event-ownership check**

- **File:** `apps/api/src/routes/attendance.ts:1307-1434`
- **Evidence:** Agent quote verified — `findUnique({ where: { id: registrationId } })` then proceeds to edit days/scannedBy/notes.
- **Why this is wrong:** A CORE_MEMBER of Event A can pass a registrationId belonging to Event B and rewrite that event's attendance. The schema has no multi-club model — every CORE_MEMBER is a CORE_MEMBER of the whole club — but cross-event privilege is still a concern: the CORE_MEMBER scanning Event A shouldn't be editing Event B's records. *Severity assumes the platform is a single club; if it's multi-club one day, this is CRIT.*
- **Suggested direction:** Add an `eventId` body field and verify the registration belongs to it. For a stricter model, store "events I'm authorized to scan" per CORE_MEMBER.

### F-064 [HIGH] [Phase 1] `/regenerate-token/:registrationId` — same missing event-ownership pattern as F-063, but for ADMIN

- **File:** `apps/api/src/routes/attendance.ts:1439-1483`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** Identical issue scoped to ADMIN. Less alarming because ADMIN is small in number and the action is bounded (token regen affects only the holder of the regenerated QR).
- **Suggested direction:** Same as F-063.
- **Related:** F-063.

### F-065 [HIGH] [Phase 1] `/email-absentees/:eventId` — admin can send mass email for any event without ownership check

- **File:** `apps/api/src/routes/attendance.ts:1962-2110`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** Mass-email is a high-trust action. Without an event-creator check, any admin can dispatch absentee emails for any event. Phase 8 considers this a *function-level authorization* concern.
- **Suggested direction:** Verify `event.createdBy === admin.id` OR a designated co-organizer relation.
- **Related:** F-063, F-064.

### F-066 [LOW] [Phase 1] Beacon scan catch logs `error.message` — could log fragments of malformed tokens

- **File:** `apps/api/src/routes/attendance.ts:878-902`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** `jwt.JsonWebTokenError` messages include "invalid signature" / "jwt malformed" — not the token itself. The token only appears in logs if the catch logs `String(err)` (which includes any embedded token in stack); the current code logs `error.message` not stack. So tokens DO NOT leak. Agent over-stated.
- **Severity correction:** **LOW** — flag for awareness; not exploitable as-is.

### F-067 [MED] [Phase 1] Audit logs include `userName` (PII) — minimization concern under GDPR/IITM data policies

- **File:** `apps/api/src/routes/attendance.ts:411-416, 660-665, 990-995`
- **Evidence:** Agent quote verified — `metadata: { ..., userName: registration.user.name, ... }`.
- **Why this is wrong:** Names are joinable against User table by userId. Storing them duplicated in audit metadata expands deletion-of-user surface area (a deleted user's name persists in audit_log even after their User row is removed). Severity is institutional / policy.
- **Suggested direction:** Store `userId` only; resolve `name` at audit-log read time via join.

### F-068 [LOW] [Phase 1] `/bulk-update` transaction catches `AttendanceBulkUpdateConflictError` but unique-constraint races inside `tx.dayAttendance.create` are not caught — first 5xx may abort the batch

- **File:** `apps/api/src/routes/attendance.ts:1168-1244`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** Inside the transaction, parallel admin scans on the same target rows can hit P2002 mid-batch. The whole transaction rolls back, so no partial state. Acceptable.
- **Severity correction:** **LOW** — annoying not dangerous.

### F-069 [HIGH] [Phase 1] `/event/:eventId/certificate-recipients` — no event-ownership check (admin-broad)

- **File:** `apps/api/src/routes/attendance.ts:2115-2290`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** Like F-065. Any admin can pull the certificate-eligible list of any event.
- **Related:** F-063, F-065.

### F-070 [LOW] [Phase 1] `parseRequestedDayNumber` returns `NaN` for invalid input — every caller must `Number.isNaN`-check

- **File:** `apps/api/src/routes/attendance.ts:121-129`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** Easy to forget the NaN check; if forgotten, `NaN > 0` is false so the bug surfaces as "day not found" rather than as a crash. Defensible.
- **Severity correction:** **LOW**.

### F-071 [HIGH] [Phase 1] `/search` accepts arbitrary `eventId` query param without verifying core-member's authority over that event

- **File:** `apps/api/src/routes/attendance.ts:1571-1631`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** Same cross-event lookup concern as F-063.
- **Related:** F-063, F-065, F-069.

### F-072 [LOW] [Phase 1] `includeGuestNonAttendees` boolean coerced from `String(req.query.x || '').toLowerCase() === 'true'` — silent acceptance of any non-'true' string as `false`

- **File:** `apps/api/src/routes/attendance.ts:2134`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** A typo of `&includeGuestNonAttendees=Yes` silently behaves as `false`. The endpoint doesn't error on unknown values.
- **Suggested direction:** Zod schema for the query.

### F-073 [LOW] [Phase 1] `AttendanceTokenPayload` type at line 39-43 omits the `purpose: 'attendance'` discriminator from `attendanceToken.ts:9` — type-vs-runtime drift

- **File:** `apps/api/src/routes/attendance.ts:39-43`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** Adds a future foot-gun if a handler trusts the TS-only payload shape and skips a `purpose` check at runtime.
- **Suggested direction:** Re-export the type from `attendanceToken.ts` and import it.

---

## Batch C — `apps/api/src/routes/certificates.ts` + `invitations.ts` + `competition.ts`

### F-080 [HIGH] [Phase 1] Invitation `/claim` transaction not Serializable; concurrent claims can co-update the same invitation row

- **File:** `apps/api/src/routes/invitations.ts:909-987`
- **Evidence:** Agent quote verified — `prisma.$transaction(async (tx) => {...})` with no `isolationLevel`. Sibling endpoints `/accept` and `/decline` (L1209-L1480) DO pass Serializable.
- **Why this is wrong:** The same-user double-claim race is partially defended by `where: { id, inviteeUserId: null }`-style updates if used — but here it isn't. Two simultaneous claims from the same token result in two `update`s; the second overwrites the first's snapshot fields. With Serializable, one of them aborts cleanly.
- **Suggested direction:** Mirror the `/accept` and `/decline` isolation choice.

### F-081 [MED] [Phase 1] `GET /event/:eventId` invitation list is unpaginated

- **File:** `apps/api/src/routes/invitations.ts:845-873`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** Admin endpoint, capped only by event size. For an event with thousands of invitations, the response and Node memory grow linearly. Not exploitable; ergonomic.
- **Suggested direction:** Add `take`/`cursor`.

### F-082 [HIGH] [Phase 1] `/claim` window between `findUnique` and `update` admits same-user double claim — claim is not idempotent

- **File:** `apps/api/src/routes/invitations.ts:925-967`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** Combined with F-080, same-user concurrent claims overwrite the snapshot. Even with Serializable, idempotency is desirable: `where: { id, inviteeUserId: null }` on the update makes the second claim a no-op rather than an overwrite.
- **Suggested direction:** Add `inviteeUserId: null` to update where-clause; treat zero-row updates as "already claimed by you" success.

### F-083 [HIGH] [Phase 1] Public `/verify/:certId` returns `recipientName` and `eventName` for any valid `certId` — enumerable PII

- **File:** `apps/api/src/routes/certificates.ts:1460-1514`
- **Evidence:** Agent quote verified — public response includes `recipientName`, `eventName`, `type`, `position`, `domain`.
- **Why this is wrong:** A 10–20 char alphanumeric certId is enumerable. Rate-limited to 60/5min from one IP, but a distributed scraper bypasses that. The disclosure of `recipientName` + `eventName` allows building a directory of "who got which certificate" — sensitive at IITM scale.
- **Severity correction:** **HIGH**, not CRIT. The same data appears on the certificate PDF, which is also enumerable via Cloudinary — but the verify endpoint makes scraping mechanically simpler.
- **Suggested direction:** Make `verify` return `{ valid: true }` only, and require the certificate holder (auth + ownership) to fetch full details.

### F-084 [MED] [Phase 1] Verify rate-limit `60 requests / 5 min` is generous for an enumeration endpoint

- **File:** `apps/api/src/routes/certificates.ts:49-55, 1460-1514`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** Combined with F-083; partial defense.
- **Suggested direction:** Drop to ~5/min, add CAPTCHA after N failures.

### F-085 [HIGH] [Phase 1] Competition autosave upsert unique key is `(roundId, userId)` — no `teamId` component; user switching teams mid-round can overwrite team A's autosave from team B's editor

- **File:** `apps/api/src/routes/competition.ts:1049-1066`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** Edge case but real if a competition allows a user to be in multiple teams across rounds. Schema in Phase 3 will confirm whether such co-membership is possible.
- **Suggested direction:** Either enforce single-team-per-round at the membership layer or include `teamId` in the autosave unique key.

### F-086 [LOW] [Phase 1] Autosave `update` accepts payload `code` without size validation — large code blobs DoS the row

- **File:** `apps/api/src/routes/competition.ts:1049-1066`
- **Evidence:** Agent quote verified (line 1049-1066). Looking at the file (auditor verification): the `scoreSchema`/`autosaveSchema` may cap code length — confirm in Phase 4 surface map.
- **Why this is wrong:** Without explicit code-length cap, an autosaver storing 5MB of code chews row space.
- **Suggested direction:** Cap autosave `code` at 200KB.

### F-087 [MED] [Phase 1] `GET /:roundId/submissions` admin list is unpaginated

- **File:** `apps/api/src/routes/competition.ts:1295-1404`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** Same ergonomic concern as F-081.
- **Suggested direction:** Add pagination.

### F-088 [MED] [Phase 1] Public `/:roundId/results` endpoint returns full leaderboard once round is FINISHED — no rate limit, no pagination, includes team-member PII

- **File:** `apps/api/src/routes/competition.ts:1627-1702`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** Combined PII + bulk data + no auth = a scraping target. The leaderboard is intentionally public, but team members' names being public-by-default is a policy choice worth checking.
- **Suggested direction:** Paginate (≤100), apply a soft rate limit, gate `team.members[].name` behind opt-in.

### F-089 [HIGH] [Phase 1] Invitation claim token (JWT) contains plaintext invitee `email` — leaked token discloses invitee identity

- **File:** `apps/api/src/utils/jwt.ts:115-132`, claim flow `routes/invitations.ts:909-987`
- **Evidence:** `signInvitationClaimToken({invitationId, email})` and `verifyInvitationClaimToken` exposes `email` to anyone who possesses the token.
- **Why this is wrong:** Tokens are emailed; if an inbox is compromised, both invitation + email are leaked together. Also: the token doesn't include a `userId` because the user may not exist yet — so it can't bind to an account. Acceptable trade-off but worth knowing.
- **Suggested direction:** Hash the email inside the token (`emailHmac`) and look up the invitation server-side by invitationId; verify the user's authenticated email matches `inviteeEmail` from the DB row.

### F-090 [LOW] [Phase 1] Certificate template variable substitution uses simple regex replacement — safe as long as templates aren't a dynamic-expression language

- **File:** `apps/api/src/routes/certificates.ts:183-206`
- **Evidence:** Agent quote verified — simple `{key}` replacement, no template engine.
- **Why this is wrong:** Not wrong. The values are passed through `sanitizeText` before substitution. No SSTI risk.
- **Severity correction:** **LOW** — informational; agent over-flagged.

### F-091 [HIGH] [Phase 1] Certificate download owner-match accepts EITHER `recipientId === user.id` OR `recipientEmail === user.email` — email-only match weakens binding

- **File:** `apps/api/src/routes/certificates.ts:280-291, 751-779`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** A certificate issued to `lakshya@ds.study.iitm.ac.in` with `recipientId: null` (bulk import case) can be downloaded by *any* future account that registers with that email. If an outsider somehow gets the email registered to them (impossible for IITM-gated OAuth but possible for dev-login), they'd download. Severity is bounded by the IITM domain gate.
- **Suggested direction:** Once a certificate has a `recipientId`, lock to ID. For email-only certificates, force a `recipientId` backfill on first access.

### F-092 [HIGH] [Phase 1] `signatoryCustomImageUrl` passes through to PDF renderer with no Cloudinary-domain whitelist — SSRF surface if renderer fetches the URL

- **File:** `apps/api/src/routes/certificates.ts:1137-1148, 609-656`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** The PDF library is `@react-pdf/renderer`. If its Image component fetches arbitrary URLs (it does, server-side), an attacker-admin can supply an internal URL (`http://169.254.169.254/...` AWS metadata; `http://localhost:6379/...` Redis) and observe whether the cert PDF builds.
- **Severity correction:** **HIGH** — confirmed Phase 8 SSRF candidate.
- **Suggested direction:** Whitelist `signatoryCustomImageUrl` to `res.cloudinary.com/<account>/...` only.

### F-093 [LOW] [Phase 1] `certId` parameter validated only by length (≤20), not by character set

- **File:** `apps/api/src/routes/certificates.ts:1460-1514`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** Prisma sanitization prevents injection; pattern mismatch surfaces as not-found. Defensible.
- **Severity correction:** **LOW**.

### F-094 [LOW] [Phase 1] Bulk-cert generator reports duplicate-recipient errors without echoing the offending input row/index

- **File:** `apps/api/src/routes/certificates.ts:1236-1276`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** Admin-UX issue.
- **Suggested direction:** Return the recipient index in the failure object.

### F-095 [LOW] [Phase 1] Competition results export defaults to xlsx for any non-'csv' format value — silent acceptance of garbage

- **File:** `apps/api/src/routes/competition.ts:1478-1551`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** `format=hjsdfh` produces xlsx without complaint. Defensible but inconsistent with the rest of the API's strict validation.
- **Suggested direction:** Zod-enum the query param.

### F-096 [HIGH] [Phase 1] Invitation `/accept` and `/decline` use email-only matching when `inviteeUserId` is null — a future user with the matching email gains access

- **File:** `apps/api/src/routes/invitations.ts:1193-1480`
- **Evidence:** Agent quote verified — `matchesInvitationInvitee` returns true for email match when `inviteeUserId` is null.
- **Why this is wrong:** Mirror of F-091's email-only weakness in certificates. For IITM-domain logins this is bounded; for dev-auth or domain-relaxation, an opening.
- **Suggested direction:** Once an invitation is created, require the invitee to claim it (via claim token) before accept/decline becomes available. Block `matchesInvitationInvitee` from email-only matching.

### F-097 [HIGH] [Phase 1] `resolveSignatory` accepts caller-supplied `inlineImageUrl` and returns it verbatim — confirmed SSRF vector via PDF renderer

- **File:** `apps/api/src/routes/certificates.ts:609-656`
- **Evidence:** Agent quote verified.
- **Severity correction:** **HIGH** — same as F-092 (this is the underlying mechanism).
- **Suggested direction:** Validate inlineImageUrl against Cloudinary domain + account.
- **Related:** F-092.

### F-098 [MED] [Phase 1] Autosave upsert race — concurrent autosave from two browser tabs (e.g., reconnect after token rotation) overwrite each other

- **File:** `apps/api/src/routes/competition.ts:1049-1066`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** Edge case but real for any user with two tabs.
- **Suggested direction:** Compare `savedAt` in update where-clause to reject stale writes.

### F-099 [HIGH] [Phase 1] Bulk certificate generation does not verify event ownership before issuing certs for `eventId`

- **File:** `apps/api/src/routes/certificates.ts:1103-1134`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** Same pattern as F-065/F-069 — ADMIN role is sufficient to issue, no event-creator check.
- **Related:** F-063, F-065, F-069.

### F-100 [HIGH] [Phase 1] Competition `PATCH /:roundId/score/:submissionId` admin-only with no judge-assignment check

- **File:** `apps/api/src/routes/competition.ts:1406-1476`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** Any ADMIN can rescore any submission. For a public-facing competition with multiple events and multiple judges, judges should be event-scoped.
- **Related:** F-099.

---

## Batch D — `apps/api/src/routes/{events,network,teams,polls,users}.ts`

### F-115 [MED] [Phase 1] Network admin `PATCH /admin/:id` accepts `isFeatured` and `displayOrder` directly from body without a separate moderation endpoint

- **File:** `apps/api/src/routes/network.ts:1325-1375`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** Conflates routine profile edits with curation. An admin updating a typo can accidentally toggle `isFeatured`. Audit context is lost.
- **Severity correction:** **MED**, not CRIT. The schema is `.optional()` so unintentional `undefined` doesn't flip the flag. The risk is admin error, not auth bypass.
- **Suggested direction:** Split: routine edits keep the existing schema (minus `isFeatured`); a separate `PUT /admin/:id/feature` toggles. Audit both.

### F-116 [MED] [Phase 1] Events `PUT /:id` permits CORE_MEMBER to toggle `featured` flag without sponsor/admin gate

- **File:** `apps/api/src/routes/events.ts:850-856`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** Featured events are a finite-attention resource. CORE_MEMBER ≠ ADMIN; this is a possible privilege creep.
- **Suggested direction:** Move `featured` to admin-only via a separate route or schema-level admin guard.

### F-117 [HIGH] [Phase 1] Poll vote create/update is not an upsert — relies on try/catch on unique violation

- **File:** `apps/api/src/routes/polls.ts:1049-1082`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** Concurrent double-vote from a user produces a 500 caught only by the global error handler unless the route explicitly catches P2002.
- **Suggested direction:** `prisma.pollVote.upsert({ where: { pollId_userId }, ... })`.

### F-118 [LOW] [Phase 1] `updateProfileSchema` reuse pattern in `network.ts` is fragile to future drift — agent's note worth keeping

- **File:** `apps/api/src/routes/network.ts:120, 498, 1325`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** Current code is safe. Refactor risk.
- **Severity correction:** **LOW** — agent over-flagged HIGH.

### F-119 [HIGH] [Phase 1] Event registrations export includes user phone in Excel — no consent flag

- **File:** `apps/api/src/routes/events.ts:978-1318`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** CORE_MEMBER has a legitimate need to contact registrants, but `phone` is exported even for users who didn't opt in to share. Audit log captures the action but the export file leaves the platform.
- **Suggested direction:** Add an opt-in column `User.allowOrgContactExport`; filter export by it.

### F-120 [HIGH] [Phase 1] Poll export is split by `isAnonymous`, but the conditional is brittle — single line of business-logic between identity-sheet vs anonymous-sheet

- **File:** `apps/api/src/routes/polls.ts:765-914`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** If a refactor inverts a flag, anonymous polls suddenly export identity. Defensive checks should be many, not one.
- **Severity correction:** **MED**, not CRIT — current code is correct.
- **Suggested direction:** Build the anonymous-export at the *query* level — `select` only the columns appropriate for the mode, no per-cell conditionals.

### F-121 [HIGH] [Phase 1] Team join capacity check uses in-memory `team.members.length` fetched before the transaction begins

- **File:** `apps/api/src/routes/teams.ts:579-597`
- **Evidence:** Agent quote verified — `Serializable` isolation is used inside the transaction, but the capacity check value is from before.
- **Why this is wrong:** Serializable will retry on conflicting reads — so two concurrent joins past `maxMembers` should serialize cleanly. The race window is narrow but the agent's read is plausible.
- **Suggested direction:** Re-count inside the transaction before the create.

### F-122 [HIGH] [Phase 1] Public event detail leaks guest invitation list (names, designations, companies) to anonymous users

- **File:** `apps/api/src/routes/events.ts:306-470`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** Mitigated by `networkProfile.isPublic: true` filter — only opt-in guests are exposed. Defensible. Severity is policy-dependent.
- **Severity correction:** **MED** — informational, not unambiguously wrong.

### F-123 [LOW] [Phase 1] Network profile `connectedSince` allows year up to 2100 — practically meaningless validation

- **File:** `apps/api/src/routes/network.ts:106, 262`
- **Evidence:** Agent quote verified.
- **Suggested direction:** `.max(new Date().getFullYear())`.

### F-124 [LOW] [Phase 1] Poll slug regeneration on edit doesn't deduplicate against concurrent edits on different polls

- **File:** `apps/api/src/routes/polls.ts:631-736`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** P2002 surfaces as 500.
- **Suggested direction:** Retry slug generation on collision.

### F-125 [HIGH] [Phase 1] Team dissolution fetches `registrationIds` OUTSIDE the transaction; concurrent leave can desync

- **File:** `apps/api/src/routes/teams.ts:1054-1068`
- **Evidence:** Agent quote verified.
- **Suggested direction:** Move the `registrationIds` fetch inside the transaction.

### F-126 [HIGH] [Phase 1] `GET /events/:id/registrations` is unpaginated

- **File:** `apps/api/src/routes/events.ts:917-955`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** Combined with custom-field JSON columns this can hit megabytes for 1000+ registrations.
- **Suggested direction:** Paginate.

### F-127 [HIGH] [Phase 1] User `GET /export` has no `auditLog` call — bulk PII export untracked

- **File:** `apps/api/src/routes/users.ts:270-394`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** Anyone with admin access can pull the user CSV and there's no forensic trail.
- **Suggested direction:** Add `auditLog(authUser.id, 'USER_BULK_EXPORT', 'User', null, { count, role })`.

### F-128 [LOW] [Phase 1] Custom-field response JSON re-displayed in export without revalidation

- **File:** `apps/api/src/routes/teams.ts:145-167`, events export
- **Evidence:** Agent quote verified.
- **Why this is wrong:** If the response JSON shape drifts (admin edits the registration field schema mid-event), older rows have stale shapes. Export silently produces gaps.
- **Suggested direction:** Stash a snapshot of the field schema with each registration.

### F-129 [HIGH] [Phase 1] Network profile verify endpoint doesn't gate on current status — admin can re-verify a REJECTED profile silently

- **File:** `apps/api/src/routes/network.ts:1182-1258`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** Idempotency gap; audit trail loses context of prior state.
- **Severity correction:** **MED**, not CRIT.
- **Suggested direction:** Use `prisma.networkProfile.update({ where: { id, status: 'PENDING' } })` and surface no-op as a 409.

### F-130 [LOW] [Phase 1] Poll vote NETWORK-block is redundant with `requireRole('USER')` — but harmless

- **File:** `apps/api/src/routes/polls.ts:1001-1005`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** `requireRole('USER')` accepts USER+ but NETWORK shares level 1 with USER (see F-013). The explicit `ensurePollParticipant` is the real gate. If F-013 is "fixed" by separating levels, the redundancy becomes load-bearing — making this a comment-driven invariant.
- **Suggested direction:** Comment in role.ts that USER and NETWORK collide; the in-handler check is the canonical gate.

### F-131 [LOW] [Phase 1] Event export "summary" sheet labels are inconsistent ("filtered" vs "unfiltered" without explanation)

- **File:** `apps/api/src/routes/events.ts:1289-1301`
- **Suggested direction:** Label rows more explicitly.

### F-132 [MED] [Phase 1] Team-leader transfer fetches `oldLeaderMember` before transaction; subsequent transaction acts on potentially stale member ID

- **File:** `apps/api/src/routes/teams.ts:982-1008`
- **Evidence:** Agent quote verified.
- **Suggested direction:** Refetch inside the transaction.

### F-133 [LOW] [Phase 1] Poll feedback endpoint accepts post-deadline submissions — possibly intentional, undocumented

- **File:** `apps/api/src/routes/polls.ts:1102-1166`
- **Suggested direction:** Document the policy or block post-deadline.

### F-134 [HIGH] [Phase 1] Network admin update allows toggling `isPublic` on a PENDING profile

- **File:** `apps/api/src/routes/network.ts:1325-1375`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** A PENDING profile shouldn't be discoverable. Admin error makes a not-yet-verified profile public.
- **Severity correction:** **HIGH**, not CRIT.
- **Suggested direction:** Reject `isPublic: true` unless `status === 'VERIFIED'`.

### F-135 [MED] [Phase 1] `GET /admin/event/:eventId/teams` unpaginated

- **File:** `apps/api/src/routes/teams.ts:1090-1133`
- **Suggested direction:** Paginate.

### F-136 [MED] [Phase 1] Public guest list on event detail filters by current `isPublic` flag — accepted invitations remain visible even after the guest flips private

- **File:** `apps/api/src/routes/events.ts:306-470`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** The agent's reading is *inverted* — the query filters by `networkProfile.isPublic: true` at query time (line 306-470). So when a guest goes private, they stop appearing. Agent over-flagged.
- **Severity correction:** **LOW** — non-issue.

### F-137 [HIGH] [Phase 1] If `SUPER_ADMIN_EMAIL` env is unset, super-admin protection in `users.ts` no-ops

- **File:** `apps/api/src/routes/users.ts:603-614`
- **Evidence:** Agent quote verified.
- **Why this is wrong:** Boot warning exists (`init.ts:36`) but the route guard fails open. A misconfigured prod allows admin-on-admin edits.
- **Suggested direction:** Either hard-fail boot when `SUPER_ADMIN_EMAIL` is missing in production, or treat absence as "everyone is non-super-admin" (which is what F-014 says is the current behavior; agent's read is correct that without the env, *no* admin can edit other admins — which is fail-closed, not fail-open). Verify by running.
- **Severity correction:** **MED** — fail-closed not fail-open, but the asymmetric behavior is fragile.

### F-138 [LOW] [Phase 1] Slug collision check capped at 100 results — large naming clusters can collide on the 101st

- **File:** `apps/api/src/routes/network.ts:55-71`
- **Suggested direction:** Remove the cap or query `count` directly.

### F-139 [HIGH] [Phase 1] `GET /events/:id/registrations` permits any CORE_MEMBER to read registrations of any event

- **File:** `apps/api/src/routes/events.ts:917-955`
- **Evidence:** Agent quote verified.
- **Related:** F-063, F-065, F-069 — same pattern.

### F-140 [LOW] [Phase 1] Network export Excel column header doesn't flag sensitivity

- **File:** `apps/api/src/routes/network.ts:901-975`
- **Suggested direction:** Add a top-row warning.

---

(continues in next commit with WIP games files + remaining smaller routes)

---

## Diagnostics complete

- `npx tsc --noEmit -p apps/api` → **clean** (exit 0).
- `npx tsc --noEmit -p apps/web` → **clean** (exit 0).
- `npm run lint --workspaces` → deferred to Phase 7 (depcheck/lint walk).

Both type checks pass. Any future findings from lint runs append below.

---

## Findings F-055 — F-073: routes/attendance.ts (delegated audit)

### F-055 [HIGH] [Phase 1] /scan-beacon accepts JWT from body/cookie without `purpose` validation — auth-token / attendance-token confusion
- **File:** apps/api/src/routes/attendance.ts:L677-L733
- **Evidence:**
  ```
  router.post('/scan-beacon', beaconLimiter, requireFeature('attendance'), express.text({ type: '*/*' }), async (req, res) => {
    const cookieToken = getCookie(req, 'tesseract_session');
    const bodyToken = typeof authToken === 'string' && jwtLikePattern.test(authToken) ? authToken : undefined;
    const effectiveToken = cookieToken || bodyToken;
    if (!effectiveToken) return res.status(401).send();
    let decoded;
    try { decoded = verifyToken(effectiveToken); } catch { return res.status(401).send(); }
  ```
- **Why this is wrong:** Endpoint bypasses `authMiddleware` and verifies JWT inline. `verifyToken` in `utils/jwt.ts:137-138` rejects `purpose === 'attendance'`, so this is defended — but `beacon` payloads embedded in token body fields without checking purpose risk drift. Combined with the fact that this is a `text/*` body (not parsed JSON), an attacker can send `{authToken: "<attendance-jwt>"}` shape strings and exercise unusual code paths.
- **Suggested direction:** Refactor to use `authMiddleware` directly; if a non-cookie path is needed (sendBeacon), accept only a bearer token from a fixed header.

### F-056 [MED] [Phase 1] /backfill-tokens uses sequential prisma.update inside for-loop (N+1)
- **File:** apps/api/src/routes/attendance.ts:L2448-L2457
- **Evidence:**
  ```
  for (const reg of batch) {
    const token = generateAttendanceToken(reg.userId, reg.eventId, reg.id);
    await prisma.eventRegistration.update({ where: { id: reg.id }, data: { attendanceToken: token } });
    backfilled++;
  }
  ```
- **Why this is wrong:** One DB write per registration. A 10k-event backfill takes 10k round-trips. Acceptable for one-off admin operations but pattern duplicated may bloat.
- **Suggested direction:** Batch in transactions of 100 with `prisma.$transaction`; or generate tokens in memory and use `updateMany` per token (not possible since each token is unique — keep per-row update but in transactions).

### F-057 [HIGH] [Phase 1] /scan-batch does not validate event existence before processing — silent failures + audit-log pollution
- **File:** apps/api/src/routes/attendance.ts:L433-L536
- **Evidence:**
  ```
  if (verified.length === 0) {
    await auditLog(admin.id, 'ATTENDANCE_BATCH_SCAN', 'eventRegistration', eventId, {
      total: scans.length, ok: 0, duplicate: dupCount, error: errCount,
    });
    return ApiResponse.success(res, { results });
  }
  ```
- **Why this is wrong:** No `prisma.event.findUnique` for the `eventId` parameter. Audit log persists a row for a possibly-nonexistent event. Combined with no club-ownership check on the event, a CORE_MEMBER from one club could submit a batch targeting another club's event ID and pollute that event's audit history.
- **Suggested direction:** Validate event existence and ownership at handler entry. Reject with 404 / 403 before audit-logging.

### F-058 [CRIT] [Phase 1] Check-then-insert race on dayAttendance create — uniqueness violation surfaces as 500
- **File:** apps/api/src/routes/attendance.ts:L361-L397, L940-L977
- **Evidence:**
  ```
  const marked = await withRetry(() => prisma.dayAttendance.updateMany({
    where: { registrationId: registration.id, dayNumber: effectiveDayNumber, attended: false },
    data: { attended: true, scannedAt, scannedBy: admin.id },
  }));
  if (marked.count === 0) {
    const existingDay = await prisma.dayAttendance.findUnique({
      where: { registrationId_dayNumber: { registrationId: registration.id, dayNumber: effectiveDayNumber } },
    });
    if (existingDay?.attended) { return ApiResponse.conflict(res, ...); }
    await prisma.dayAttendance.create({ data: { registrationId: registration.id, dayNumber: effectiveDayNumber, attended: true, ... } });
  }
  ```
- **Why this is wrong:** Classic check-then-create race. Two concurrent scans for the same registration: updateMany returns 0, both findUnique return null, both create. Second create hits `P2002` unique violation and bubbles as 500.
- **Suggested direction:** `prisma.dayAttendance.upsert` keyed on `registrationId_dayNumber` with `update: { attended: true, scannedAt, scannedBy }` and `create: { ... }`. Eliminates the race.

### F-059 [MED] [Phase 1] /event/:eventId/full hard-caps at 5000 instead of paginating — large events have no UI path to attendance data
- **File:** apps/api/src/routes/attendance.ts:L1722-L1785
- **Evidence:**
  ```
  if (totalRegistrations > ATTENDANCE_FULL_LIST_LIMIT) {
    return ApiResponse.badRequest(res, `Full attendance list is limited to ${ATTENDANCE_FULL_LIST_LIMIT} registrations.`);
  }
  const registrations = await prisma.eventRegistration.findMany({ where: { eventId }, include: { ... } });
  ```
- **Why this is wrong:** Refuses rather than paginates. UI breaks for large events; admins must fall back to export.
- **Suggested direction:** Add `take`/`skip` with sensible default; return `meta: { total, page, limit }`.

### F-060 [HIGH] [Phase 1] /event/:eventId/summary issues one count query per event-day (N+1)
- **File:** apps/api/src/routes/attendance.ts:L2383-L2403
- **Evidence:**
  ```
  Promise.all(
    Array.from({ length: eventDays }, (_, index) => index + 1).map(async (dayNumber) => ({
      dayNumber,
      attended: await prisma.dayAttendance.count({
        where: { dayNumber, attended: true, registration: { eventId } },
      }),
    })),
  ),
  ```
- **Why this is wrong:** 10-day event → 10 separate count queries fan out. Each hits the DB.
- **Suggested direction:** Single `prisma.dayAttendance.groupBy({ by: ['dayNumber'], where: { registration: { eventId }, attended: true }, _count: { _all: true } })`.

### F-061 [MED] [Phase 1] `resolveClientScannedAt` permits client-supplied backdated timestamps within a 24h window
- **File:** apps/api/src/routes/attendance.ts:L85-L106
- **Evidence:**
  ```
  function resolveClientScannedAt(scannedAtLocal?: string): Date {
    ...
    if (parsedMs > nowMs + CLIENT_SCAN_FUTURE_TOLERANCE_MS || parsedMs < nowMs - CLIENT_SCAN_MAX_AGE_MS) {
      return now;
    }
    return parsed;
  }
  ```
- **Why this is wrong:** A scanner can submit `scannedAtLocal` up to 24h in the past. A CORE_MEMBER can mark attendance for events that already occurred, falsifying attendance history. There is no audit-log distinction between server-time vs client-time scans.
- **Suggested direction:** Either ignore client-time entirely and stamp server time, or restrict client backdating to <5 min and log the delta in audit.

### F-062 [LOW] [Phase 1] `parseDayLabels` accepts untrusted array shape from `event.dayLabels` JSON
- **File:** apps/api/src/routes/attendance.ts:L113-L119
- **Evidence:**
  ```
  function parseDayLabels(value: unknown, eventDays: number): string[] {
    if (!Array.isArray(value)) return [];
    return value.slice(0, eventDays).map((label) => (typeof label === 'string' ? label.trim() : '')).map((label, index) => label || `Day ${index + 1}`);
  }
  ```
- **Why this is wrong:** Field comes from a `Json` Prisma column. If the write side stored unsanitized HTML, it lands in attendance reports / certificate templates. Flag for confirmation that the write site in `events.ts` sanitizes.
- **Suggested direction:** Sanitize on read via `escapeHtml` before display, or sanitize on write only with a Zod schema.

### F-063 [HIGH] [Phase 1] /edit/:registrationId does not verify the editing CORE_MEMBER owns the underlying event's club
- **File:** apps/api/src/routes/attendance.ts:L1307-L1434
- **Evidence:**
  ```
  router.patch('/edit/:registrationId', authMiddleware, requireRole('CORE_MEMBER'), ...) {
    const { registrationId } = req.params;
    const registration = await prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      include: { event: { select: { eventDays: true } } },
    });
    if (!registration) { return ApiResponse.notFound(res, ...); }
    // No clubId / createdBy check against admin.
  ```
- **Why this is wrong:** A CORE_MEMBER associated with one event can edit attendance for any event's registration by guessing IDs.
- **Suggested direction:** Add an event-ownership filter (`event.createdBy === admin.id`, or club join check), or require ADMIN.

### F-064 [HIGH] [Phase 1] /regenerate-token/:registrationId regenerates tokens for any admin's events
- **File:** apps/api/src/routes/attendance.ts:L1439-L1483
- **Evidence:** See F-063 — same pattern of admin-only auth without event scoping.
- **Why this is wrong:** Admin A regenerates Admin B's event's attendance tokens, invalidating every printed QR for that event. Operational havoc.
- **Suggested direction:** Add event-ownership filter or require PRESIDENT.

### F-065 [HIGH] [Phase 1] /email-absentees/:eventId blasts emails on any event without ownership check
- **File:** apps/api/src/routes/attendance.ts:L1962-L2110
- **Evidence:**
  ```
  router.post('/email-absentees/:eventId', authMiddleware, requireRole('ADMIN'), async (req) {
    const { eventId } = req.params;
    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { eventDays: true } });
    const absentees = await prisma.eventRegistration.findMany({ where: { eventId, ... } });
  ```
- **Why this is wrong:** Any admin can send templated emails to absentees of any event. Combined with the Brevo rate limit, this is a vehicle for legitimate-looking spam from the club domain.
- **Suggested direction:** Restrict to event creator + super admin.

### F-066 [LOW] [Phase 1] Beacon-scan error path may log error.message containing partial token data
- **File:** apps/api/src/routes/attendance.ts:L878-L902
- **Evidence:**
  ```
  } catch (err) {
    failedCount++;
    logger.error('Beacon scan item failed', { error: err instanceof Error ? err.message : String(err) });
  }
  ```
- **Why this is wrong:** `jwt.verify` rejection messages include the bad token snippet in some library versions. Unlikely to log full tokens, but partial leakage is possible.
- **Suggested direction:** Use a static "scan_failed" code; log error type only.

### F-067 [LOW] [Phase 1] Audit log payloads store user names (PII) alongside IDs
- **File:** apps/api/src/routes/attendance.ts:L411-L416, L660-L665, L990-L995
- **Evidence:**
  ```
  await auditLog(admin.id, 'ATTENDANCE_SCAN', 'eventRegistration', registration.id, {
    eventId: registration.eventId,
    userId: payload.userId,
    userName: registration.user.name,
    dayNumber: effectiveDayNumber,
  });
  ```
- **Why this is wrong:** PII duplicated in audit logs. If audit retention is long, this becomes a secondary PII store.
- **Suggested direction:** Store userId only; join to user on display.

### F-068 [MED] [Phase 1] Bulk-update transaction catches `AttendanceBulkUpdateConflictError` but bare `prisma.dayAttendance.create` can still race within transaction
- **File:** apps/api/src/routes/attendance.ts:L1168-L1244
- **Evidence:** see referenced range — pattern: `updateMany → findUnique → create` within `$transaction`.
- **Why this is wrong:** Even inside a transaction, concurrent transactions can both pass the inner findUnique check and race on create. Postgres' default `READ COMMITTED` isolation doesn't prevent this.
- **Suggested direction:** Use `upsert`. Or escalate to `SERIALIZABLE` isolation level for the transaction.

### F-069 [HIGH] [Phase 1] /event/:eventId/certificate-recipients reads any event's recipients without ownership check
- **File:** apps/api/src/routes/attendance.ts:L2115-L2290
- **Evidence:**
  ```
  router.get('/event/:eventId/certificate-recipients', authMiddleware, requireRole('ADMIN'), ...) {
    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { eventDays: true, dayLabels: true } });
    if (!event) return ApiResponse.notFound(res, 'Event not found');
    // No ownership check.
  ```
- **Why this is wrong:** Cross-tenant data exposure of recipient lists between admins.
- **Suggested direction:** Add event ownership / club scoping.

### F-070 [LOW] [Phase 1] `parseRequestedDayNumber` returns `NaN` for invalid input — callers must check `isNaN` separately
- **File:** apps/api/src/routes/attendance.ts:L121-L129
- **Evidence:**
  ```
  function parseRequestedDayNumber(dayNumber: unknown): number | null {
    if (dayNumber === undefined || dayNumber === null || dayNumber === '') return null;
    if (typeof dayNumber === 'number' && Number.isInteger(dayNumber)) return dayNumber;
    if (typeof dayNumber === 'string') {
      const parsed = Number.parseInt(dayNumber, 10);
      if (Number.isInteger(parsed)) return parsed;
    }
    return Number.NaN;
  }
  ```
- **Why this is wrong:** Tristate `number | null | NaN`. Easy to forget `isNaN` check at call site → `NaN` flows into Prisma `where` and matches nothing silently.
- **Suggested direction:** Return `null` on parse failure.

### F-071 [HIGH] [Phase 1] /search filters by eventId from query but does not enforce that CORE_MEMBER scopes match the event's club
- **File:** apps/api/src/routes/attendance.ts:L1571-L1631
- **Evidence:**
  ```
  router.get('/search', authMiddleware, requireRole('CORE_MEMBER'), async (req) {
    const { q, eventId, page: pageParam } = req.query as { q?: string; eventId?: string; page?: string };
    const where = { eventId, user: { OR: [{ name: { contains: searchTerm, mode: 'insensitive' } }, { email: { contains: searchTerm, mode: 'insensitive' } }] } };
    const registrations = await prisma.eventRegistration.findMany({...});
  ```
- **Why this is wrong:** Cross-event registration search by any CORE_MEMBER. PII leak.
- **Suggested direction:** Validate `eventId` belongs to CORE_MEMBER's scope.

### F-072 [LOW] [Phase 1] `includeGuestNonAttendees` not Zod-validated; loose `String(...).toLowerCase() === 'true'`
- **File:** apps/api/src/routes/attendance.ts:L2134
- **Evidence:**
  ```
  const includeGuestNonAttendees = String(req.query.includeGuestNonAttendees || '').toLowerCase() === 'true';
  ```
- **Why this is wrong:** Inconsistent with the codebase's Zod pattern. Falls back to defaults silently on bad input.
- **Suggested direction:** Centralized `parseBooleanQuery` helper (already exists in `games/lib/http.ts:23`).

### F-073 [LOW] [Phase 1] Local `AttendanceTokenPayload` type lacks `purpose` field while runtime payload always has it
- **File:** apps/api/src/routes/attendance.ts:L39-L43
- **Evidence:**
  ```
  type AttendanceTokenPayload = { userId: string; eventId: string; registrationId: string; };
  ```
- **Why this is wrong:** Drift with `utils/attendanceToken.ts:5-10` which includes `purpose: 'attendance'`. Future refactor could read `decoded.purpose` and get `undefined` from this local type.
- **Suggested direction:** Import the canonical payload type.

---

## Findings F-080 — F-100: routes/certificates.ts + invitations.ts + competition.ts (delegated audit)

### F-080 [HIGH] [Phase 1] Invitation `/claim` transaction lacks Serializable isolation — concurrent claims race
- **File:** apps/api/src/routes/invitations.ts:L909-L987
- **Evidence:** TX block performs `findUnique` then conditional checks, then `update` — no `isolationLevel`. Sibling endpoints `/accept` and `/decline` use Serializable.
- **Why this is wrong:** Two concurrent claim requests for the same invitation ID pass the ownership check (because `existingInvitation.inviteeUserId === null` at both reads) and both reach `update`. Last write wins on `inviteeUserId`; the first claimer is silently replaced.
- **Suggested direction:** `prisma.$transaction(async tx => { ... }, { isolationLevel: 'Serializable' })`.

### F-081 [HIGH] [Phase 1] Invitation list endpoint per event has no pagination cap
- **File:** apps/api/src/routes/invitations.ts:L845-L873
- **Evidence:**
  ```
  invitationsRouter.get('/event/:eventId', authMiddleware, requireRole('ADMIN'), async (req, res) => {
    const invitations = await prisma.eventInvitation.findMany({
      where: { eventId },
      include: invitationDetailInclude,
      orderBy: [{ invitedAt: 'desc' }],
    });
  ```
- **Why this is wrong:** Pulls entire invitation set into memory regardless of size.
- **Suggested direction:** Add `take`/`skip` query params; default `take: 50`.

### F-082 [MED] [Phase 1] Claim update where-clause does not include `inviteeUserId: null` precondition — claim can replay
- **File:** apps/api/src/routes/invitations.ts:L925-L967
- **Evidence:** see F-080.
- **Why this is wrong:** Same root as F-080. The `tx.eventInvitation.update` does not gate on `inviteeUserId: null` — replaying the claim by the legitimate claimer overwrites the snapshot.
- **Suggested direction:** Add `where: { id, inviteeUserId: null }` to the update; on rowsAffected=0, return idempotent success or 409.

### F-083 [CRIT] [Phase 1] Public certificate-verify endpoint returns full PII (name, position, domain) without authentication
- **File:** apps/api/src/routes/certificates.ts:L1460-L1514
- **Evidence:**
  ```
  certificatesRouter.get('/verify/:certId', certificateVerifyLimiter, async (req, res) => {
    const cert = await prisma.certificate.findUnique({
      where: { certId: certId.toUpperCase() },
      select: { certId: true, recipientName: true, eventName: true, type: true, position: true, domain: true, ... },
    });
    return res.status(200).json({ valid: true, certId: cert.certId, recipientName: cert.recipientName, eventName: cert.eventName, ... });
  ```
- **Why this is wrong:** Certificate IDs are 10-20 char alphanumeric and rate-limited to 60/5min — a determined attacker can enumerate to harvest names. Public verification commonly omits names and exposes "valid certificate for event X" only.
- **Suggested direction:** Return only `{ valid: true, eventName, type }` for the public verify path; show recipient name only when verifying via a signed URL that proves possession of the original PDF.

### F-084 [HIGH] [Phase 1] Certificate verify limiter is 60 req / 5 min — sufficient for enumeration over weeks
- **File:** apps/api/src/routes/certificates.ts:L49-L55
- **Evidence:**
  ```
  const certificateVerifyLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 60, ... });
  ```
- **Why this is wrong:** 720/hour, 17,280/day per IP; 36,288,000 attempts/year. With 10-char alphanumeric IDs (36¹⁰ space) brute force is slow, but pattern-guessing common IDs (yearly prefixes, event-name prefixes) makes it tractable.
- **Suggested direction:** Lower to 10/min and add per-day cap; lengthen certIds.

### F-085 [HIGH] [Phase 1] CompetitionAutoSave upsert keyed only on `(roundId, userId)` — team-switching mid-round overwrites state
- **File:** apps/api/src/routes/competition.ts:L1049-L1066
- **Evidence:**
  ```
  const autoSave = await prisma.competitionAutoSave.upsert({
    where: { roundId_userId: { roundId: round.id, userId: user.id } },
    create: { roundId: round.id, userId: user.id, teamId: myTeam?.id || null, code: payloadCode },
    update: { code: payloadCode, savedAt: serverNow },
    select: { savedAt: true },
  });
  ```
- **Why this is wrong:** If a user is a member of two teams in the same round (shouldn't be possible, but enforced only by application logic), or if leadership transfer changes `myTeam`, the autosave switches without warning.
- **Suggested direction:** Either uniqueness on `(roundId, userId, teamId)` or guard `if (existingTeamId !== myTeam.id) throw`.

### F-086 [MED] [Phase 1] CompetitionAutoSave update path does not refresh `teamId` — stale teamId persists
- **File:** apps/api/src/routes/competition.ts:L1049-L1066
- **Evidence:** see F-085 — `update: { code, savedAt }` only.
- **Why this is wrong:** If a user joins a new team after their autosave was first created (when `teamId: null`), the autosave is never re-linked to the team.
- **Suggested direction:** Always set `teamId` in update.

### F-087 [HIGH] [Phase 1] Competition submissions endpoint has no pagination
- **File:** apps/api/src/routes/competition.ts:L1295-L1404
- **Evidence:**
  ```
  competitionRouter.get('/:roundId/submissions', authMiddleware, requireRole('ADMIN'), async (req, res) => {
    const submissions = await prisma.competitionSubmission.findMany({
      where: { roundId: round.id },
      include: { team: { ... }, user: { ... } },
      orderBy: { submittedAt: 'asc' },
    });
  ```
- **Why this is wrong:** Large competition: full payload per request. Memory pressure for the API and slow rendering for the admin UI.
- **Suggested direction:** Paginated.

### F-088 [MED] [Phase 1] Public /:roundId/results endpoint has no rate limit; exposes full team-member PII when FINISHED
- **File:** apps/api/src/routes/competition.ts:L1627-L1702
- **Evidence:**
  ```
  competitionRouter.get('/:roundId/results', async (req, res) => {
    // No authMiddleware
    const submissions = await prisma.competitionSubmission.findMany({
      where: { roundId: round.id },
      include: { ... }, // includes user.name, user.email-equivalent
    });
  ```
- **Why this is wrong:** Public scraping vector.
- **Suggested direction:** Rate limit + auth or strip email/PII from public payload.

### F-089 [HIGH] [Phase 1] Invitation claim token is JWT that embeds invitee email in plaintext
- **File:** apps/api/src/utils/jwt.ts:L88-L94, apps/api/src/routes/invitations.ts:L909-L987
- **Evidence:**
  ```
  export const signInvitationClaimToken = (payload: InvitationClaimTokenPayload): string => (
    jwt.sign({ ...payload, purpose: 'invitation_claim' }, getJwtSecret(), { algorithm: 'HS256', expiresIn: '30d' })
  );
  ```
- **Why this is wrong:** JWTs are not encrypted. A leaked claim URL exposes the invitee's email. Combined with 30-day expiry and email distribution (the token often lives in plaintext inbox), this is a long-lived PII payload.
- **Suggested direction:** Opaque random token stored server-side; embed only the token ID.

### F-090 [MED] [Phase 1] Certificate template variable resolver depends on sanitize-text per value but admin can ship templates with HTML
- **File:** apps/api/src/routes/certificates.ts:L183-L206
- **Evidence:** `resolveCertificateTemplate` sanitizes the **template** (admin-set) and each **value** independently. The values are escaped, but the template HTML is admin-trusted.
- **Why this is wrong:** Admins should be able to ship templates with `<b>` etc. but an admin-compromised account is now the only thing standing between attacker and rendered HTML in client browsers (cert PDFs are rendered via @react-pdf — different attack surface than browser HTML, but still relevant).
- **Suggested direction:** Restrict admin templates to a whitelist of inline formatters; reject `<script>`, event handlers, `<iframe>`.

### F-091 [CRIT] [Phase 1] Certificate download authorizes on `recipientId || recipientEmail` match — email-only certs can be fetched by anyone with that email
- **File:** apps/api/src/routes/certificates.ts:L280-L291, L751-L779
- **Evidence:**
  ```
  function isCertificateOwner(cert, authUser) {
    if (cert.recipientId && cert.recipientId === authUser.id) return true;
    const recipientEmail = normalizeEmail(cert.recipientEmail);
    const authEmail = normalizeEmail(authUser.email);
    return Boolean(recipientEmail && authEmail && recipientEmail === authEmail);
  }
  ```
- **Why this is wrong:** A user who registers an account with the same lowercased email as a legacy email-only certificate inherits that certificate. Combined with F-007 (case-insensitive email collision), this is exploitable.
- **Suggested direction:** When `recipientId` is set, ONLY honor it. When it's null, allow download only via a signed URL (mailed token) — not via authenticated email match.

### F-092 [HIGH] [Phase 1] Bulk certificate generation accepts arbitrary signatory image URLs — possible SSRF or unauthorized cross-org image embed
- **File:** apps/api/src/routes/certificates.ts:L1137-L1148, L609-L656
- **Evidence:**
  ```
  if (inlineImageUrl?.trim()) {
    return { ..., processedImageUrl: inlineImageUrl.trim(), rawImageUrl: inlineImageUrl.trim() };
  }
  ```
- **Why this is wrong:** Admin-supplied URL passed to PDF generator. If `@react-pdf/renderer` fetches it server-side, that's an SSRF vector (admin → internal network probe).
- **Suggested direction:** Whitelist Cloudinary cloud_name origin; reject otherwise.

### F-093 [MED] [Phase 1] Certificate verify accepts certId without strict format validation
- **File:** apps/api/src/routes/certificates.ts:L1460-L1514
- **Evidence:**
  ```
  if (!certId || certId.length > 20) { return res.status(400).json({ valid: false, reason: 'invalid_id' }); }
  ```
- **Why this is wrong:** Length-only validation; no regex. Permits unusual characters that may slip past `findUnique` normalization on certain databases.
- **Suggested direction:** Enforce `^[A-Z0-9-]{10,20}$`.

### F-094 [HIGH] [Phase 1] Bulk certificate dedup logs duplicates without telling admin which row was the duplicate
- **File:** apps/api/src/routes/certificates.ts:L1236-L1276
- **Evidence:** Failures pushed with `reason: 'Duplicate recipient email in this bulk upload'` but no row index/lookup.
- **Why this is wrong:** Admin uploading 200 recipients sees "5 duplicates" with no idea which to remove → reruns blindly → never resolves.
- **Suggested direction:** Return row index and conflicting recipient name/email.

### F-095 [MED] [Phase 1] /:roundId/results/export does not whitelist format parameter
- **File:** apps/api/src/routes/competition.ts:L1478-L1551
- **Evidence:**
  ```
  const { format = 'xlsx' } = req.query;
  ...
  if (format === 'csv') { /* csv path */ }
  // Falls through to xlsx for ANYTHING else.
  ```
- **Why this is wrong:** Unexpected format values silently route to xlsx; less concerning than a security bug but inconsistent.
- **Suggested direction:** `z.enum(['csv', 'xlsx']).default('xlsx')`.

### F-096 [HIGH] [Phase 1] Invitation accept/decline allow email-match for invites with `inviteeUserId === null`
- **File:** apps/api/src/routes/invitations.ts (matchesInvitationInvitee helper)
- **Evidence:**
  ```
  function matchesInvitationInvitee(invitation, authUser) {
    if (invitation.inviteeUserId) return invitation.inviteeUserId === authUser.id;
    const a = normalizeEmailAddress(invitation.inviteeEmail || '');
    const b = normalizeEmailAddress(authUser.email || '');
    return Boolean(a && b && a === b);
  }
  ```
- **Why this is wrong:** Once an invitation has been claimed (gets a user id), only that id can act on it. But un-claimed invitations have looser email matching — a user who registers later with the email gets the invitation. Combined with case-insensitive email registration (F-007), this is exploitable.
- **Suggested direction:** Require the invitation to be claimed first before any accept/decline; lock `inviteeUserId` at claim.

### F-097 [HIGH] [Phase 1] Signatory inline image URL bypasses signatory whitelist — same SSRF surface as F-092
- **File:** apps/api/src/routes/certificates.ts:L609-L656
- **Evidence:** see F-092.
- **Suggested direction:** Same.

### F-098 [MED] [Phase 1] CompetitionAutoSave race — same as F-085 from a different vantage; flagged again for explicit cross-reference
- **File:** apps/api/src/routes/competition.ts:L1049-L1066
- **Related:** F-085, F-086.

### F-099 [MED] [Phase 1] /api/certificates/bulk does not verify that the ADMIN is event creator before issuing
- **File:** apps/api/src/routes/certificates.ts:L1103-L1134
- **Evidence:**
  ```
  if (eventId) {
    const eventExists = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!eventExists) { return ApiResponse.badRequest(res, 'Event not found'); }
  }
  ```
- **Why this is wrong:** Existence only — any admin can issue certificates branded with any event.
- **Suggested direction:** Require event-creator OR super-admin.

### F-100 [HIGH] [Phase 1] /:roundId/score/:submissionId allows any ADMIN to overwrite any submission's score
- **File:** apps/api/src/routes/competition.ts:L1406-L1476
- **Evidence:** ADMIN role only, no judge/owner check.
- **Why this is wrong:** A rogue admin can rewrite competition outcomes.
- **Suggested direction:** Restrict scoring to round creator (or designated judges if such a list exists).

---

## Findings F-115 — F-140: routes/events.ts + network.ts + teams.ts + polls.ts + users.ts (delegated audit)

### F-115 [HIGH] [Phase 1] Network admin update accepts `isFeatured` and `displayOrder` without gating on profile verification status
- **File:** apps/api/src/routes/network.ts:L1325-L1375
- **Evidence:** schema extends `createProfileSchema.partial()` with `isFeatured`, `displayOrder`, `isPublic`. Update path sets these without checking `status === 'VERIFIED'`.
- **Why this is wrong:** A PENDING profile can be featured/highlighted, breaking the verification gate.
- **Suggested direction:** Refuse to feature unless `status === 'VERIFIED'`.

### F-116 [MED] [Phase 1] Event `featured` toggle accessible to CORE_MEMBER without secondary confirmation
- **File:** apps/api/src/routes/events.ts:L850-L856 (PUT /events/:id)
- **Evidence:** `data.featured` accepted as-is in the update payload.
- **Why this is wrong:** Lower-trust role can mark events featured.
- **Suggested direction:** Restrict to ADMIN or require a separate `/feature` endpoint.

### F-117 [HIGH] [Phase 1] Poll vote create-or-update is read-then-write; relies on P2002 catch for concurrency
- **File:** apps/api/src/routes/polls.ts:L1049-L1082
- **Evidence:** `const existingVote = poll.votes[0] ?? null; ... tx.pollVote.create(...) or update(...)`.
- **Why this is wrong:** Race with concurrent requests for the same `(pollId, userId)`.
- **Suggested direction:** `prisma.pollVote.upsert` on the unique key.

### F-118 [LOW] [Phase 1] `updateProfileSchema` derived from `createProfileSchema.partial()` is fragile — a future field added to createProfileSchema is silently accepted on user-initiated PATCH
- **File:** apps/api/src/routes/network.ts:L120
- **Evidence:** `const updateProfileSchema = createProfileSchema.partial();`
- **Why this is wrong:** Schema inheritance permits future mass-assignment bugs.
- **Suggested direction:** Define both schemas as siblings, not derived.

### F-119 [HIGH] [Phase 1] Event registrations Excel export always includes phone numbers regardless of user privacy preferences
- **File:** apps/api/src/routes/events.ts:L978-L1318
- **Evidence:** `{ header: 'Phone', key: 'phone', width: 15 }`, `registration.user.phone || ''`.
- **Why this is wrong:** Phone is PII; users may have set it private. CORE_MEMBER export downloads phones without consent gate.
- **Suggested direction:** Strip phone unless user has explicit `phonePublic: true` or admin requests with elevated privilege.

### F-120 [HIGH] [Phase 1] Poll export endpoint structurally allows identity columns into "anonymous" exports if conditional is misedited
- **File:** apps/api/src/routes/polls.ts:L765-L914
- **Evidence:** code-branch by `poll.isAnonymous` — same handler.
- **Why this is wrong:** Fragile; one bad if-statement and anonymous polls expose voters.
- **Suggested direction:** Build two separate handlers / serializers per poll mode.

### F-121 [HIGH] [Phase 1] Team join transaction validates capacity in memory, then inserts — capacity check can pass for both of two concurrent requests
- **File:** apps/api/src/routes/teams.ts:L579-L597
- **Evidence:** TX uses `team.members.length` (in-memory) for validation.
- **Why this is wrong:** Even with `Serializable` (which IS used elsewhere), the in-memory check is stale at the time of insert. Postgres will reject the duplicate via uniqueness only if one exists; the capacity constraint is application-level only.
- **Suggested direction:** Re-fetch member count inside transaction OR add a DB-level check constraint / unique index.

### F-122 [HIGH] [Phase 1] Public event detail leaks guest invitation list (names, designations, companies)
- **File:** apps/api/src/routes/events.ts:L306-L470
- **Evidence:**
  ```
  const guestInvitations = await prisma.eventInvitation.findMany({
    where: { eventId, status: 'ACCEPTED', inviteeUser: { networkProfile: { isPublic: true } } },
    select: { role: true, invitedAt: true, inviteeUser: { select: { ... } } },
  });
  ```
- **Why this is wrong:** Filters by `networkProfile.isPublic`, but the event-detail endpoint may not require registration. So guest speakers' identities leak before the event.
- **Suggested direction:** Require event registration to see guest list.

### F-123 [LOW] [Phase 1] `connectedSince` accepts years up to 2100
- **File:** apps/api/src/routes/network.ts:L106, L262
- **Evidence:** `.min(2000).max(2100)`.
- **Why this is wrong:** Future years are nonsensical.
- **Suggested direction:** `.max(new Date().getFullYear())`.

### F-124 [LOW] [Phase 1] Poll slug regeneration on question update has no retry on collision
- **File:** apps/api/src/routes/polls.ts:L631-L736
- **Suggested direction:** Wrap in retry / catch `P2002`.

### F-125 [MED] [Phase 1] Team dissolution fetches registrationIds OUTSIDE transaction
- **File:** apps/api/src/routes/teams.ts:L1054-L1068
- **Why this is wrong:** Stale list if members leave between read and TX.
- **Suggested direction:** Move fetch inside transaction after leadership check.

### F-126 [HIGH] [Phase 1] /api/events/:id/registrations returns ALL registrations with no pagination
- **File:** apps/api/src/routes/events.ts:L917-L955
- **Evidence:** `prisma.eventRegistration.findMany({ where: { eventId } })` — no take/skip.
- **Why this is wrong:** 10k registrants → 10k objects in memory + over the wire.
- **Suggested direction:** Paginate.

### F-127 [HIGH] [Phase 1] /api/users/export does not call auditLog — bulk PII export is invisible to audit trail
- **File:** apps/api/src/routes/users.ts:L270-L394
- **Evidence:** No `auditLog(...)` in handler.
- **Why this is wrong:** Sensitive admin action with no forensic trail.
- **Suggested direction:** `auditLog(authUser.id, 'USER_EXPORT', 'User', 'bulk', { count })`.

### F-128 [LOW] [Phase 1] `customFieldResponses` exported without re-validating against current event schema
- **File:** apps/api/src/routes/teams.ts:L145-L167; consumers in events.ts export path
- **Why this is wrong:** Schema drift in custom fields produces garbled rows in exports.
- **Suggested direction:** Validate on read or fix on write.

### F-129 [MED] [Phase 1] Network profile verify endpoint can re-verify an already-VERIFIED or REJECTED profile (no `status: 'PENDING'` guard)
- **File:** apps/api/src/routes/network.ts:L1182-L1258
- **Evidence:** `prisma.networkProfile.update({ where: { id }, data: { status: 'VERIFIED', verifiedAt, verifiedBy } })` — no status filter.
- **Suggested direction:** `where: { id, status: 'PENDING' }`, error if rows=0.

### F-130 [LOW] [Phase 1] Poll participant guard duplicates role check that `requireRole('USER')` already implies
- **File:** apps/api/src/routes/polls.ts:L1001-L1005
- **Why this is wrong:** Redundancy; both checks must stay in sync.
- **Suggested direction:** Single `requirePollParticipant` middleware.

### F-131 [LOW] [Phase 1] Event Excel summary reports capacity vs registrations as raw numbers without OVER/OK flag
- **File:** apps/api/src/routes/events.ts:L1289-L1301
- **Suggested direction:** Compute "over_capacity" flag.

### F-132 [MED] [Phase 1] Team leadership transfer uses in-memory `oldLeaderMember` reference inside transaction — stale if external mutation happened
- **File:** apps/api/src/routes/teams.ts:L982-L1008
- **Suggested direction:** Re-fetch inside the transaction.

### F-133 [LOW] [Phase 1] Polls feedback endpoint accepts feedback after poll close — unclear intent
- **File:** apps/api/src/routes/polls.ts:L1102-L1166
- **Suggested direction:** Document intent or gate.

### F-134 [HIGH] [Phase 1] Network admin can set `isPublic: true` on a PENDING profile — premature publication
- **File:** apps/api/src/routes/network.ts:L1325-L1375
- **Evidence:** see F-115.
- **Suggested direction:** Gate `isPublic = true` on `status === 'VERIFIED'`.

### F-135 [HIGH] [Phase 1] /api/teams/event/:eventId returns all teams with nested members; no pagination
- **File:** apps/api/src/routes/teams.ts:L1090-L1133
- **Suggested direction:** Paginate.

### F-136 [LOW] [Phase 1] Accepted invitations stay visible even if guest profile is later set private
- **File:** apps/api/src/routes/events.ts:L306-L470 (filter applied)
- **Why this is wrong:** Filter at fetch time mitigates this — verify by reading the SQL plan. Flag for confirmation.

### F-137 [MED] [Phase 1] Super-admin protection collapses to "any admin can edit any admin" when `SUPER_ADMIN_EMAIL` env is unset
- **File:** apps/api/src/routes/users.ts:L603-L614
- **Why this is wrong:** A misconfigured env var disables the protection silently.
- **Suggested direction:** Validate `SUPER_ADMIN_EMAIL` at boot; refuse to start if unset in production.

### F-138 [LOW] [Phase 1] Network profile slug-uniqueness scan is capped to 100 collisions — 101st collision creates duplicate
- **File:** apps/api/src/routes/network.ts:L55-L71
- **Suggested direction:** Use atomic counter or DB-side uniqueness on slug.

### F-139 [CRIT] [Phase 1] /api/events/:id/registrations is accessible to ANY CORE_MEMBER for ANY event — IDOR across clubs
- **File:** apps/api/src/routes/events.ts:L917-L955
- **Why this is wrong:** No event-creator / club-membership filter; any CORE_MEMBER can list any event's registrations.
- **Suggested direction:** Require event-creator OR ADMIN.

### F-140 [LOW] [Phase 1] Network profile export includes plain email addresses without a "confidential" marker
- **File:** apps/api/src/routes/network.ts:L901-L975
- **Suggested direction:** Add explicit header watermark; consider encrypting the file.

---

## Findings F-160 — F-185: settings + email + admin + smaller routes (delegated audit)

### F-160 [MED] [Phase 1] Settings GET endpoint gates on ADMIN role but secrets are filtered by an additional `enforceSuperAdminOrPresident` — inconsistent guard pattern
- **File:** apps/api/src/routes/settings.ts:L248-L253
- **Suggested direction:** Use `requireRole('PRESIDENT')` or a dedicated middleware to make the access boundary explicit at the routing layer.

### F-161 [LOW] [Phase 1] IndexNow key route returns identical 404 for missing/wrong key, but no rate limit
- **File:** apps/api/src/routes/sitemap.ts:L229-L241
- **Suggested direction:** Apply a dedicated low-budget rate limit (Bing's spec key is single-secret, brute force possible).

### F-162 [CRIT] [Phase 1] Email template renders Markdown announcement body via `markdownToEmailHtml` — verify the converter does not pass through raw `<script>`/event handlers
- **File:** apps/api/src/utils/email.ts:L1046-L1064
- **Why this is wrong:** Admin-authored Markdown is the input. If `markdownToEmailHtml` runs `marked.parse` without `DOMPurify`, raw HTML in the Markdown survives into the email. Phase 8 will dump `markdownToEmailHtml` and confirm; flagging now.
- **Suggested direction:** Pipe the result through `sanitizeHtml` after Markdown conversion.

### F-163 [HIGH] [Phase 1] `eventTitle` is interpolated directly into subject lines and HTML subtitles without `escapeHtml`
- **File:** apps/api/src/utils/email.ts:L994-L1002
- **Why this is wrong:** A malicious or simply punctuation-heavy event title (`"M&S"` becomes `M&S` in the subject, but `"<script>"` survives if not escaped) lands in email HTML body.
- **Suggested direction:** Apply `escapeHtml(eventTitle)` at every template entry point.

### F-164 [HIGH] [Phase 1] `shortDescription` interpolated unescaped in new-announcement subtitle
- **File:** apps/api/src/utils/email.ts:L1052-L1064
- **Suggested direction:** Same as F-163.

### F-165 [HIGH] [Phase 1] Custom `customFooter` (admin-set) used unescaped in new-event email
- **File:** apps/api/src/utils/email.ts:L1153-L1177
- **Suggested direction:** Same — escape or sanitize.

### F-166 [MED] [Phase 1] Audit log viewer has no implicit time bound — full history searchable
- **File:** apps/api/src/routes/audit.ts:L43-L74
- **Suggested direction:** Default `timestamp >= now - 90 days`; require explicit date range for older queries.

### F-167 [MED] [Phase 1] Bulk-mail BCC/CC handling: admin self-copy email exposes recipient list in audit log
- **File:** apps/api/src/routes/mail.ts:L239-L305
- **Suggested direction:** Strip CC/BCC from audit metadata; document why.

### F-168 [LOW] [Phase 1] Settings `emailTestRecipients` not enforced by mail.ts — UI promise diverges from runtime behavior
- **File:** apps/api/src/routes/settings.ts:L48, apps/api/src/routes/mail.ts
- **Suggested direction:** Read `emailTestingMode` setting in mail.ts and reroute audience to test recipients.

### F-169 [MED] [Phase 1] Hiring applications list returns phone+email unmasked
- **File:** apps/api/src/routes/hiring.ts:L189-L200
- **Why this is wrong:** Mass-fetch by any CORE_MEMBER/ADMIN — full applicant contact details. No mask in list view.
- **Suggested direction:** Mask in list view, full details only on detail view.

### F-170 [LOW] [Phase 1] Team-member /me endpoint returns merged user data — verify no private user fields are exposed
- **File:** apps/api/src/routes/team.ts:L226-L257
- **Suggested direction:** Whitelist the returned fields.

### F-171 [LOW] [Phase 1] Announcements have no draft/published state — accidental publish via email cannot be unpublished
- **File:** apps/api/src/routes/announcements.ts:L68-L140
- **Suggested direction:** Add `published: boolean` to Announcement; gate email send on publish.

### F-172 [HIGH] [Phase 1] Credits endpoint has no anti-self-award guard
- **File:** apps/api/src/routes/credits.ts:L99-L137
- **Why this is wrong:** ADMIN can award credits to themselves or allies; no PRESIDENT escalation, no audit-of-who-created-credit field.
- **Suggested direction:** Add `createdBy` field; restrict self-award via business rule.

### F-173 [HIGH] [Phase 1] /api/upload writes every image to a shared `tesseract-uploads/` Cloudinary folder; DELETE has no ownership check
- **File:** apps/api/src/routes/upload.ts:L107-L115, L165-L209
- **Why this is wrong:** Cross-user image deletion: any CORE_MEMBER can delete any image by public_id.
- **Suggested direction:** Scope upload folder per-user; verify ownership before delete.

### F-174 [HIGH] [Phase 1] `registrationOpens` template injects `shortDescription` unescaped into `<p>` body
- **File:** apps/api/src/utils/email.ts:L1246-L1271
- **Suggested direction:** `escapeHtml(shortDescription)`.

### F-175 [LOW] [Phase 1] Signatory image URL accepted as-is; no size/format check when URL is provided (only base64 size is enforced)
- **File:** apps/api/src/routes/signatories.ts:L112-L114
- **Suggested direction:** Fetch metadata via Cloudinary or restrict URL host.

### F-176 [MED] [Phase 1] Stats dashboard endpoints execute heavy raw-SQL aggregations with no caching and no rate limit
- **File:** apps/api/src/routes/stats.ts:L487-L525
- **Suggested direction:** Cache results for ~5 min via a singleton or Redis when available; add per-endpoint rate limit.

### F-177 [LOW] [Phase 1] Announcement update schema does not constrain `priority` to the enum (only create does)
- **File:** apps/api/src/routes/announcements.ts:L312-L367
- **Suggested direction:** Add `z.enum([...])` to the update schema.

### F-178 [LOW] [Phase 1] Team-member slug generator reads all matching slugs into memory — O(n) per create
- **File:** apps/api/src/routes/team.ts:L85-L100
- **Suggested direction:** Counter-suffix strategy.

### F-179 [LOW] [Phase 1] Settings PATCH /:key uses inline `Number(value)` then range-checks — `"1e10"` becomes `10_000_000_000` correctly rejected but pattern is fragile
- **File:** apps/api/src/routes/settings.ts:L584-L738
- **Suggested direction:** Per-key Zod schemas.

### F-180 [HIGH] [Phase 1] `customFieldResponses` on event registration stored unsanitized; renders in admin dashboards unescaped
- **File:** apps/api/src/routes/registrations.ts:L11, L41, L178
- **Suggested direction:** Sanitize every string value in `customFieldResponses` before storage.

### F-181 [LOW] [Phase 1] Achievements list returns `createdAt`/`updatedAt` to anonymous callers — minor fingerprinting
- **File:** apps/api/src/routes/achievements.ts:L86-L110

### F-182 [LOW] [Phase 1] Announcement `expiresAt` accepts past dates — creates immediately expired rows
- **File:** apps/api/src/routes/announcements.ts:L45
- **Suggested direction:** Zod refine: `expiresAt >= now`.

### F-183 [MED] [Phase 1] `audience: 'all_network'` bulk mail does not check per-user email-opt-in
- **File:** apps/api/src/routes/mail.ts:L194-L238
- **Suggested direction:** Read `networkProfile.emailOptIn` (or add the field) and filter.

### F-184 [LOW] [Phase 1] Team-member slug update path can produce duplicate slug if `resolveUniqueTeamSlug` cap is reached
- **File:** apps/api/src/routes/team.ts:L438-L458

### F-185 [LOW] [Phase 1] Audit log entityId can be set to PII string at write time — no format validation
- **File:** apps/api/src/routes/audit.ts:L43-L74
- **Suggested direction:** Require entityId to be UUID-like.

---

## Findings F-186 — F-205: games subsystem (mine, including WIP files)

### F-186 [MED] [Phase 1] `BASE_PLAYS_BY_GAME_ID` injects hardcoded "play counts" (scribbl=3890, puzzle-run=5620, etc.) into public catalog
- **File:** apps/api/src/games/router.ts:L11-L20, L177
- **Evidence:**
  ```
  const BASE_PLAYS_BY_GAME_ID: Record<string, number> = {
    'smash-kart': 0, scribbl: 3890, 'puzzle-run': 5620, 'brain-teasers': 2140,
    'cipher-lab': 1890, 'riddle-room': 1440, 'type-wars': 990, 'trivia-tower': 2310,
  };
  ...
  const dynamicPlays = (BASE_PLAYS_BY_GAME_ID[game.id] || 0) + (stats?.totalSessions || 0);
  ```
- **Why this is wrong:** These are static "vanity" plays added to real session counts. Marketing fakery is misleading for users and for an audit trail; also makes "live" / "plays" non-monotonic if a game is removed from the dictionary.
- **Suggested direction:** Remove. If a baseline is needed, store it in DB with a clear `baselineSessions` field per game.

### F-187 [LOW] [Phase 1] `generateRoomCode` uses `Math.random()` — predictable across runs/PRNG seeds
- **File:** apps/api/src/games/lib/gameSchemas.ts:L21-L28
- **Why this is wrong:** Not security-critical (room codes are 5-char public lookup keys), but a determined attacker could predict the next-generated code and pre-register in a competitor's lobby.
- **Suggested direction:** `crypto.randomInt(0, alphabet.length)`.

### F-188 [HIGH] [Phase 1] Type Wars `progress:finish` accepts self-reported `durationMs` and `correctChars` with no server clamp against `room.startedAt`
- **File:** apps/api/src/games/type-wars/socket.ts:L151-L187
- **Evidence:**
  ```
  const parsed = finishSchema.safeParse(payload);
  ...
  const stats = computeTypingStats({ charsTyped, correctChars, durationMs: parsed.data.durationMs });
  participant.wpm = stats.wpm;
  ```
  `finishSchema` (L22-26) allows `durationMs` in [1, 600000].
- **Why this is wrong:** A cheater can claim `durationMs: 1, correctChars: 10000, charsTyped: 10000` and post a WPM that wins the leaderboard. Server has `room.startedAt` and can clamp `durationMs >= now - startedAt - tolerance`, but doesn't.
- **Suggested direction:** Server-compute duration from `room.startedAt` and current time; reject any client `durationMs` outside ±2s tolerance.

### F-189 [MED] [Phase 1] Type Wars `progress:update` server-side throttle drops <200ms updates silently — fast typists feel laggy without explanation
- **File:** apps/api/src/games/type-wars/socket.ts:L142
- **Suggested direction:** Lower threshold to 80ms or queue and batch.

### F-190 [LOW] [Phase 1] Type Wars countdown setTimeouts (2s, 1s) are not tracked, not cleared on room evict
- **File:** apps/api/src/games/type-wars/socket.ts:L45-L78
- **Why this is wrong:** If a room is evicted between countdown:2 and race:start, the 1s timeout still fires and mutates `room.status` after eviction (the room reference is still alive in the closure). `RoomStore.onEvict` clears `finishTimer` but not the countdown chain.
- **Suggested direction:** Store countdown timeout handles on the room and clear on evict.

### F-191 [HIGH] [Phase 1] Trivia Tower `getTriviaRoom` resets `currentFloor` to 0 and **reshuffles questions** when reloading from DB — reconnects see different questions than originals
- **File:** apps/api/src/games/trivia-tower/state.ts:L256-L293
- **Evidence:**
  ```
  questions = shuffle(dbQuestions).slice(0, run.totalFloors).map((q, index) => { ... });
  const loaded: TriviaRoomState = { ..., currentFloor: 0, ..., questions, ... };
  ```
- **Why this is wrong:** A mid-game crash + restore re-randomizes the question set AND resets `currentFloor` to 0. Players replay from floor 1 with different questions; persisted answers under floor 1 now point at an entirely different question.
- **Suggested direction:** Persist question ordering on `TriviaTowerRun` (via a JSON `questionIds` column) and restore the same ordering, restoring `currentFloor` from `Math.max(answeredFloors)`.

### F-192 [MED] [Phase 1] Scribbl restored-from-DB scoring undercounts drawer's bonus (+50 per correct guess)
- **File:** apps/api/src/games/scribbl/state.ts:L178-L211
- **Evidence:** Reconstruction only sums `guess.pointsAwarded` into the guesser's score; drawer's `+50` bonus is awarded in `socket.ts:L242` but never persisted, so it's lost on reload.
- **Why this is wrong:** Live drawer scoreboard ≠ persisted scoreboard.
- **Suggested direction:** Persist drawer bonus into `ScribblGuess.pointsAwarded` for the drawer row OR add a dedicated drawer-bonus field on `ScribblRound`.

### F-193 [MED] [Phase 1] Riddle Room `clue:hint` is callable by any room member with no rate limit; spam-hint halves points for everyone
- **File:** apps/api/src/games/riddle-room/socket.ts:L82-L92
- **Evidence:** No check that caller is allowed; any active member triggers `hintsUsed.add(currentOrder)` which halves the per-solve award (`socket.ts:L137`).
- **Why this is wrong:** A troll halves the team's score by clicking hint.
- **Suggested direction:** Require host-only hint OR vote-based hint OR rate limit + audit.

### F-194 [LOW] [Phase 1] Riddle Room chat (`chat:message`) has no rate limit
- **File:** apps/api/src/games/riddle-room/socket.ts:L165-L178
- **Suggested direction:** Token-bucket per user (similar to scribbl strokes).

### F-195 [LOW] [Phase 1] Scribbl `strokeBudget` constants (`STROKE_BUCKET_MAX = 90`) are duplicated between `socket.ts:30-31` and `state.ts:135-136`
- **File:** apps/api/src/games/scribbl/socket.ts:L30-31, apps/api/src/games/scribbl/state.ts:L135-136
- **Suggested direction:** Single shared constant.

### F-196 [MED] [Phase 1] Type Wars participant `charsTyped` reset to 0 on reload even mid-race; finished participants jump to full length
- **File:** apps/api/src/games/type-wars/state.ts:L192-L211
- **Evidence:** `charsTyped: finishedAt ? race.passage.text.length : 0`.
- **Why this is wrong:** A mid-race crash + reconnect rewinds typing progress to 0 on the server; the client may have a higher local `charsTyped` and emit `progress:update` with higher numbers — but the throttle/state mismatch can cause UI flicker.
- **Suggested direction:** Persist `charsTyped` periodically or recover from client state.

### F-197 [LOW] [Phase 1] Trivia Tower `summarizeFloor → showNextQuestion` chain uses raw `setTimeout(..., 1800)` — not tracked, not unref'd
- **File:** apps/api/src/games/trivia-tower/socket.ts:L45-47
- **Suggested direction:** Track and clear; call `.unref()`.

### F-198 [LOW] [Phase 1] `riddleSubmitSchema` accepts arbitrary submission strings; `isRiddleCorrect` comparison normalization not visible from socket file
- **File:** apps/api/src/games/riddle-room/socket.ts:L108
- **Suggested direction:** Confirm `isRiddleCorrect` normalizes case/whitespace and resists trivial variant attacks.

### F-199 [LOW] [Phase 1] Scribbl `endRound → startRound` chained via plain `setTimeout(..., 5000)` (line 107-109) — not tracked, not unref'd
- **File:** apps/api/src/games/scribbl/socket.ts:L107-109
- **Suggested direction:** Track and clear on `onEvict`.

### F-200 [LOW] [Phase 1] Type Wars finalize transaction issues N updates + 1 update for N participants — uses `prisma.$transaction(array)` correctly but could exceed pg max query length with many fields
- **File:** apps/api/src/games/type-wars/state.ts:L285-L301
- **Why this is wrong:** Up to 6 players × ~5 fields per update — small. Flag only as awareness for future param expansion.

### F-201 [LOW] [Phase 1] `gameAuth` uses `requireRole('USER')` — NETWORK profiles satisfy the gate (refer F-013)
- **File:** apps/api/src/games/lib/gameAuth.ts:L6
- **Why this is wrong:** Cross-references F-013. If product wants NETWORK profiles excluded from games (since they're alumni/professional channels), gate is wrong.
- **Suggested direction:** Custom middleware `requireStudentRole`.

### F-202 [LOW] [Phase 1] `RoomStore.sweepIdle(aggressive=true)` halves the TTL but is invoked only when `create` hits the room cap — a single attacker creating then abandoning rooms forces sweep cycles
- **File:** apps/api/src/games/lib/roomStore.ts:L71-L77, L129-L138
- **Suggested direction:** Charge a creation cost (e.g., per-user concurrent-room limit).

### F-203 [LOW] [Phase 1] `RoomStore` ignores `maxPlayersPerRoom` — set on the store, but no game enforces it via the store; each game checks its own max separately
- **File:** apps/api/src/games/lib/roomStore.ts:L41
- **Why this is wrong:** Dead field. Confuses readers about where capacity is enforced.
- **Suggested direction:** Either enforce in `RoomStore.join`-style helper or remove the field.

### F-204 [LOW] [Phase 1] `recordGameSession` and batch helper swallow Prisma errors silently (logger only) — leaderboard divergence invisible
- **File:** apps/api/src/games/lib/sessionRecorder.ts:L25-L31, L45-L51
- **Why this is wrong:** A persistent DB failure quietly loses session records → leaderboard gaps the user notices but ops doesn't.
- **Suggested direction:** Add a per-game counter metric for dropped sessions; alert.

### F-205 [LOW] [Phase 1] Trivia Tower `triviaAnswer.upsert` on `(runId, userId, floor)` is correct, but the same userId can re-submit for the SAME floor and overwrite a previous correct answer with a wrong one
- **File:** apps/api/src/games/trivia-tower/socket.ts:L131-L171
- **Evidence:** Line 131 short-circuits via `participant.answeredFloors.has(floor)`, but `answeredFloors` is in-memory; after a reload, it's rebuilt from DB. Edge case but real.
- **Suggested direction:** Either check DB on submit (`upsert` create-only on first answer) OR set the upsert to update-only when `correct === true`.

