---
status: resolved
trigger: "when loading the page, the /auth/me takes very long to process"
created: 2026-07-05T10:00:16Z
updated: 2026-07-05T12:20:00Z
---

## Current Focus
<!-- OVERWRITE on each update - always reflects NOW -->

hypothesis: CONFIRMED — POST /api/auth/refresh (triggered by AuthContext's silent-refresh flow when GET /me returns 401 due to expired 15-min access token, i.e. exactly after an idle period) does an O(n) unscoped table scan of ALL non-expired RefreshToken rows system-wide, then calls bcrypt.compare() sequentially against each row's tokenHash until a match is found. Because POST /login never invalidates/deletes a user's previous refresh tokens, and there is no cleanup job, valid RefreshToken rows accumulate unbounded across all users over the 30-day token lifetime. Each bcrypt.compare() costs ~95-100ms (cost factor 10), so refresh latency scales linearly with total accumulated token count. This is functionally identical to the exact symptom (slow only when the frontend auto-refresh path fires, i.e. after idle > 15 min access-token expiry; no error; eventually succeeds).
test: DONE — seeded 300 valid bcrypt-hashed decoy RefreshToken rows (system-wide, not scoped to test user) in the live dev DB, then logged in fresh and called POST /api/auth/refresh
expecting: refresh call takes seconds instead of ms, proportional to number of decoy rows, because the real (matching) token was inserted last and the unscoped loop must exhaust all decoys via bcrypt.compare first
next_action: DONE — fix implemented, migrated, deployed to dev containers, and verified (28.6s to ~20ms with identical 300-decoy-row setup). User confirmed "/auth/me" is fast after reload. Session resolved and archived.
reasoning_checkpoint:
  hypothesis: "POST /api/auth/refresh (and /logout) perform prisma.refreshToken.findMany({ where: { expiresAt: { gt: new Date() } } }) with NO userId scoping, then loop calling bcrypt.compare(rawToken, row.tokenHash) sequentially until a match — O(n) in the total count of valid refresh tokens across ALL users. Because POST /login creates a new RefreshToken row without ever deleting the user's prior rows, and no cleanup job exists, this table grows unbounded over weeks of normal multi-session usage, making every refresh (which only fires after the 15-min access token expires, i.e. after an idle period) progressively slower."
  confirming_evidence:
    - "Read apps/backend/src/routes/auth.ts lines 184-195 (POST /refresh) and 157-165 (POST /logout): both do findMany with no userId filter, then `for (const token of tokens) { if (await bcrypt.compare(...)) { matchedToken = token; break } }`"
    - "Read POST /login (lines 133-139): prisma.refreshToken.create() with no prior deleteMany/cleanup for the same userId — confirms unbounded accumulation"
    - "Direct repro: seeded 300 valid bcrypt-hash decoy RefreshToken rows in the live dev DB (docker exec, real bcryptjs cost-10 hashes), then measured POST /api/auth/refresh at 28.665s and 29.532s (vs 10-50ms baseline for GET /auth/me with a valid token, and vs 55ms even after a 20s DB-connection idle period which ruled out the pg-pool-reconnect hypothesis)"
    - "Contrast: PasswordResetToken and InviteToken models in the SAME codebase use createHash('sha256') + findUnique({ where: { tokenHash } }) — O(1) indexed lookup. RefreshToken is the only token type using bcrypt (non-deterministic, unindexable) — a design inconsistency that is the actual root cause"
  falsification_test: "If the delay were instead caused by pg connection-pool/idle-TCP reconnect (the hint's alternate theory), a 20s+ idle period before a warm, valid /auth/me call would show multi-second latency. It did not (55ms). This rules out the DB-connection-idle hypothesis and isolates the cause to the refresh-token comparison loop specifically."
  fix_rationale: "Switching RefreshToken hashing from bcrypt to SHA-256 (matching the already-established pattern for PasswordResetToken/InviteToken in this codebase) allows an indexed findUnique({ where: { tokenHash } }) lookup — O(1) regardless of table size — eliminating the linear scan entirely. SHA-256 is the correct choice here because the refresh token is a high-entropy random value (crypto.randomUUID(), ~122 bits), not a low-entropy user secret like a password; bcrypt's deliberate slowness defends against brute-forcing low-entropy secrets and provides no security benefit here, only cost. This fixes the root cause (unbounded O(n) comparison) rather than a symptom (e.g. capping table size or lowering bcrypt cost would only delay the same failure mode)."
  blind_spots: "Have not added a cleanup mechanism to delete a user's OTHER refresh tokens on new login (accumulation itself is still technically unbounded, just each lookup is now O(1) so it no longer matters for latency). Have not tested concurrent refresh-rotation races beyond what existing $transaction/deleteMany+create logic already handles. Existing RefreshToken rows in the DB use the old bcrypt format and cannot be migrated in-place (no raw token available) — they become permanently unmatched after the fix, meaning any currently-idle real session will need to fully re-login rather than silently refresh; acceptable for a 2-5 user internal app but noting it as a side effect."
tdd_checkpoint: null

## Symptoms
<!-- Written during gathering, then immutable -->

expected: GET /auth/me should return quickly, comparable to other GET endpoints (tens of ms)
actual: Takes very long to process when the page loads
errors: None — request eventually succeeds, no error thrown or shown
reproduction: Intermittent — happens after the app/page hasn't been opened in a while (idle period), not on every load
started: Just noticed; not tied to a specific recent change by the user

## Eliminated
<!-- APPEND only - prevents re-investigating after /clear -->

- hypothesis: "pg connection pool / Prisma driver-adapter TCP reconnect is slow after DB idle period (pool's default 10s idleTimeoutMillis closes connections, next request must establish a fresh TCP connection with no connectionTimeoutMillis configured)"
  evidence: "Live repro on running dev containers (kartex-backend-1/kartex-db-1): 5 consecutive authenticated GET /auth/me calls all <35ms (warm). Waited 20s (exceeds pg pool's 10s idleTimeoutMillis, forcing a brand-new TCP connection) then called GET /auth/me again: 55ms — no meaningful slowdown. Ruled out DB-connection-idle as the cause."
  timestamp: 2026-07-05T12:05:00Z

## Evidence
<!-- APPEND only - facts discovered during investigation -->

- timestamp: 2026-07-05T11:40:00Z
  checked: apps/backend/src/routes/auth.ts GET /me handler (line 235), authMiddleware (apps/backend/src/middleware/auth.ts), verifyToken (apps/backend/src/lib/jwt.ts), prisma.ts, mailer.ts
  found: GET /me itself is a single prisma.user.findUnique() by primary key after JWT verification (jose, pure CPU, no I/O). No mailer/SMTP calls in this path. No obvious blocking call in the direct /me handler.
  implication: The slowness is not in GET /me's own handler body — must be triggered indirectly, either via connection setup or via a related auth flow (refresh) invoked around it.

- timestamp: 2026-07-05T11:50:00Z
  checked: apps/backend/src/lib/prisma.ts and node_modules/@prisma/adapter-pg/dist/index.js and node_modules/pg-pool/index.js
  found: "new PrismaPg(url) passes only a connection string, so pg.Pool is created with library defaults: idleTimeoutMillis=10000 (closes idle clients after 10s), min=0, connectionTimeoutMillis=0 (no timeout establishing a new connection). This means every request separated by >10s of DB inactivity must open a brand-new TCP connection with no app-level timeout guard."
  implication: "Plausible theory: fresh reconnect after idle could hang uncapped. Needed empirical verification (see Eliminated above) — did not reproduce on this network."

- timestamp: 2026-07-05T12:00:00Z
  checked: apps/frontend/src/context/AuthContext.tsx hydrateSession()
  found: "On mount, calls GET /api/auth/me. If 401, silently calls POST /api/auth/refresh, then retries GET /api/auth/me. This refresh-then-retry only fires when the access_token (15 min expiry) has actually expired — i.e. exactly when the page/tab has been idle/closed longer than 15 minutes. This matches the user's 'idle period' correlation precisely."
  implication: "The actual slow call the user perceives during page load is very likely POST /api/auth/refresh, surfaced through the same page-load auth flow the user described as '/auth/me'."

- timestamp: 2026-07-05T12:05:00Z
  checked: apps/backend/src/routes/auth.ts POST /refresh (line 178) and POST /logout (line 151) and POST /login (line 107)
  found: "POST /refresh and POST /logout both run prisma.refreshToken.findMany({ where: { expiresAt: { gt: new Date() } } }) — NOT scoped by userId, i.e. system-wide across all users — then loop `for (const token of tokens) { if (await bcrypt.compare(rawRefreshToken, token.tokenHash)) { matchedToken = token; break } }`. POST /login creates a new RefreshToken row via prisma.refreshToken.create() but never deletes/invalidates the same user's prior tokens. No scheduled cleanup job exists anywhere in the codebase for expired tokens."
  implication: "This is an O(n) linear bcrypt-comparison scan whose 'n' (valid refresh tokens across all users) grows unbounded over time with normal multi-session usage. Directly testable."

- timestamp: 2026-07-05T12:10:00Z
  checked: "Live repro — docker exec into kartex-backend-1 generated 300 real bcryptjs cost-10 hashes and inserted them as decoy RefreshToken rows (system-wide, referencing an existing userId) via kartex-db-1 psql. Logged in fresh (creating one real token, inserted after the 300 decoys) and timed POST /api/auth/refresh three times."
  found: "Login: 0.49s (bcrypt.hash at cost 12, expected/unrelated). Refresh attempt 1: 28.665s. Refresh attempt 2: 29.532s. (Both http 200 — eventually succeeds, no error, matching reported symptom exactly.) Baseline authenticated GET /auth/me with a warm connection: 8-31ms. Cleaned up: deleted all 300 seeded decoy rows afterward."
  implication: "CONFIRMED root cause. ~28-29s for 300 sequential bcrypt.compare() calls (~95-100ms each, consistent with bcrypt cost factor 10) exactly matches an O(n) unscoped linear scan. In a real 2-5 user deployment running for weeks/months with repeated logins across devices/sessions and no token cleanup, this table grows large enough to reproduce exactly the reported multi-second-to-longer delay, occurring only when the access token has expired (idle period) — matching every reported symptom."

- timestamp: 2026-07-05T12:12:00Z
  checked: apps/backend/prisma/schema.prisma — PasswordResetToken and InviteToken models vs RefreshToken model
  found: "PasswordResetToken.tokenHash and InviteToken.token are both @unique and are populated via createHash('sha256')... .digest('hex') in auth.ts / admin.ts, enabling O(1) findUnique({ where: { tokenHash } }) lookups. RefreshToken.tokenHash has no @unique constraint and is populated via bcrypt.hash(...), which is non-deterministic (random salt) and therefore cannot be looked up by index — hence the O(n) scan-and-compare pattern."
  implication: "The codebase already has an established, correct pattern for exactly this kind of opaque-token lookup (SHA-256 + unique index). RefreshToken is the outlier. Fix: bring RefreshToken in line with that pattern."

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: "POST /api/auth/refresh and POST /api/auth/logout hash-compare refresh tokens using bcrypt against an UNSCOPED (system-wide, not per-user) linear scan of every non-expired RefreshToken row (prisma.refreshToken.findMany + sequential bcrypt.compare loop). Because POST /api/auth/login never invalidates a user's previous refresh tokens and no cleanup job exists, this table grows unbounded across normal multi-session usage over the 30-day token lifetime. Each bcrypt.compare() costs ~95-100ms, so refresh latency scales linearly with total accumulated token count — reproduced empirically at ~29s with 300 decoy rows. This refresh flow is silently triggered by the frontend (AuthContext.tsx) whenever GET /api/auth/me returns 401 due to the 15-minute access token having expired, which is precisely why the slowdown only appears after an idle period: that's the only time the expensive refresh path executes at all."
fix: "Replace bcrypt-based refresh-token hashing with SHA-256 (matching the existing PasswordResetToken/InviteToken pattern in this codebase). Add a @unique constraint on RefreshToken.tokenHash via a new Prisma migration. Change POST /login, POST /refresh, and POST /logout in apps/backend/src/routes/auth.ts to hash the raw token with createHash('sha256') and look it up via prisma.refreshToken.findUnique({ where: { tokenHash } }) — O(1) regardless of table size — instead of findMany + bcrypt.compare loop."
verification: "Rebuilt kartex-backend Docker image with the fix, ran `prisma migrate deploy` to apply the new unique-index migration against the live dev DB, restarted the container. Re-ran the EXACT same repro (300 decoy RefreshToken rows, now SHA-256-hashed, real token inserted last): POST /api/auth/refresh dropped from 28.665s/29.532s (pre-fix) to 0.035s/0.018s/0.015s (post-fix) — a ~1500-2000x improvement, now comparable to GET /auth/me's own baseline (~10ms). Ran full backend test suite (yarn workspace @kartex/backend test run): 68 passed, 0 failed (updated auth-login.test.ts to mock findUnique instead of findMany, matching the new implementation). Ran typecheck (yarn workspace @kartex/backend typecheck) after `npx prisma generate`: 0 errors. Ran an isolated functional check confirming POST /login creates exactly one RefreshToken row and POST /logout deletes exactly that row (before=4, after login=5, after logout=4). Full login -> GET /me -> POST /refresh (rotation) -> POST /logout cycle exercised end-to-end against the live container, all returning correct status codes and payloads. Decoy/test rows cleaned up from the dev DB afterward. USER CONFIRMED (2026-07-05): reloaded the page after the fix and the /auth/me slowness is resolved — 'confirmed fixed'."
files_changed:
  - apps/backend/prisma/schema.prisma (RefreshToken.tokenHash: added @unique)
  - apps/backend/prisma/migrations/20260705000000_add_refreshtoken_tokenhash_unique/migration.sql (new migration)
  - apps/backend/src/routes/auth.ts (POST /login, POST /refresh, POST /logout: replaced bcrypt.hash/bcrypt.compare + findMany-loop with createHash('sha256') + findUnique)
  - apps/backend/src/routes/__tests__/auth-login.test.ts (updated mock: refreshToken.findMany -> refreshToken.findUnique, matching the new lookup)
