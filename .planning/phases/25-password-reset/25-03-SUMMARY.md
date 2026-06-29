---
phase: 25-password-reset
plan: "03"
subsystem: backend-routes
status: complete
tags:
  - password-reset
  - auth
  - backend
  - hono
  - prisma
dependency_graph:
  requires:
    - 25-01  # PasswordResetToken schema + shared Zod schemas
    - 25-02  # mailer.ts + nodemailer
  provides:
    - POST /api/auth/forgot-password
    - GET /api/auth/reset-password/:token
    - POST /api/auth/reset-password/:token
    - POST /api/admin/users/:id/reset-password
  affects:
    - apps/backend/src/routes/auth.ts
    - apps/backend/src/routes/admin.ts
tech_stack:
  added:
    - randomBytes + createHash from node:crypto (auth.ts)
    - PasswordResetRequestSchema + PasswordResetSchema from @kartex/shared
    - sendMail + isConfigured from ../lib/mailer.js (auth.ts)
    - createHash from node:crypto (admin.ts — extended existing import)
  patterns:
    - TOCTOU-safe atomic updateMany WHERE usedAt IS NULL inside $transaction
    - SHA-256 hash-only token storage (raw token only in emailed link)
    - Email delivery rollback via passwordResetToken.delete on sendMail() failure
    - No-enumeration 200 response for all forgot-password outcomes
key_files:
  modified:
    - apps/backend/src/routes/auth.ts
    - apps/backend/src/routes/admin.ts
decisions:
  - "25-03: POST /forgot-password returns 200 for all outcomes including SMTP misconfiguration — prevents server state leakage to unauthenticated callers (RESET-03)"
  - "25-03: POST /reset-password/:token issues no JWT/cookies on success — frontend navigates to /login (D-01)"
  - "25-03: record.userId carried from pre-check into transaction — avoids nested query inside $transaction (Pitfall 3 from RESEARCH.md)"
  - "25-03: admin route returns SMTP_NOT_CONFIGURED visibly — admin-facing endpoint must surface config issues unlike user-facing forgot-password"
metrics:
  duration: "3 min"
  completed: "2026-06-29"
  tasks_completed: 2
  files_modified: 2
---

# Phase 25 Plan 03: Backend Routes Summary

**One-liner:** Four password reset routes (3 public in auth.ts + 1 admin in admin.ts) with TOCTOU-safe atomic token consumption, SHA-256 hash-only storage, and no-enumeration 200 responses.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 3.1 | Add three public reset routes to auth.ts | 60f3111 | apps/backend/src/routes/auth.ts |
| 3.2 | Add admin-triggered password reset route to admin.ts | 7903a81 | apps/backend/src/routes/admin.ts |

## What Was Built

### Task 3.1 — Three public routes in auth.ts

**POST /api/auth/forgot-password** (RESET-03 no-enumeration):
- Parses body with `PasswordResetRequestSchema`; returns 200 on validation failure (no enumeration)
- Looks up user by email; returns identical 200 success message if no user found
- Guards `APP_URL` and `isConfigured()` — returns 200 on misconfiguration (no state leak)
- Generates 32-byte CSPRNG raw token; stores only SHA-256 hash (D-07)
- Sends email with 1-hour reset link; rolls back `PasswordResetToken` row on send failure
- Always returns `{ message: 'If that email is registered, a reset link is on its way.' }` with 200

**GET /api/auth/reset-password/:token** (RESET-06 read-only validation):
- Hashes raw token; queries `PasswordResetToken.findUnique`
- Returns distinct error codes: `NOT_FOUND` / `ALREADY_USED` / `EXPIRED` (all 400)
- Returns `{ ok: true }` 200 on valid token — no user data exposed

**POST /api/auth/reset-password/:token** (TOCTOU-safe consumption, RESET-05):
- UX pre-check for informational error messages (carries `record.userId` for transaction use)
- Parses body with `PasswordResetSchema`; returns 400 with validation details on failure
- Inside `$transaction`: atomic `updateMany WHERE { tokenHash, usedAt: null, expiresAt: { gt: now } }` — throws `TOKEN_CONSUMED` if `count === 0`
- Hashes new password with bcrypt; updates `User.passwordHash`
- Deletes ALL `RefreshToken` rows for the user (RESET-05 — full session invalidation)
- Returns `{ message: 'Password reset successfully.' }` 200 — no JWT, no cookies (D-01)

### Task 3.2 — Admin route in admin.ts

**POST /api/admin/users/:id/reset-password** (RESET-08):
- Finds target user; returns 404 if not found
- Returns `{ error: 'NO_EMAIL' }` 400 when `user.email` is null (RESET-08 — frontend maps to localised toast)
- Returns `{ error: 'SMTP_NOT_CONFIGURED' }` 400 when SMTP not configured (admin-facing — must surface config issues)
- Returns `{ error: 'SERVER_MISCONFIGURED' }` 500 when `APP_URL` missing
- Same token generation + SHA-256 hash + email send + rollback pattern as POST /invites
- Automatically protected by `requireAdmin` middleware in index.ts (no in-handler auth guard needed)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Stale Prisma client missing PasswordResetToken, InviteToken, email field**
- **Found during:** Task 3.1 build verification
- **Issue:** `yarn workspace @kartex/backend build` produced TS2339 errors — `prisma.passwordResetToken`, `prisma.inviteToken`, and `user.email` did not exist in the generated Prisma client types. The Prisma schema had all models (from Plans 25-01, 24-01) but `prisma generate` had not been re-run.
- **Fix:** Ran `yarn workspace @kartex/backend prisma generate` to regenerate the Prisma client from the current schema. All new models now appear in the generated TypeScript types.
- **Files modified:** `node_modules/.prisma/client/` (generated — not committed)
- **Commit:** Regeneration was pre-requisite for 60f3111

**2. [Rule 3 - Blocking] Missing nodemailer / @types/nodemailer packages**
- **Found during:** Task 3.1 build verification
- **Issue:** `src/lib/mailer.ts` produced TS2307 errors — `nodemailer` was listed in `package.json` but not installed in `node_modules` (likely `yarn install` was not run after Plan 25-02 added the dependency).
- **Fix:** Ran `yarn workspace @kartex/backend add nodemailer@^9.0.1 @types/nodemailer@^8.0.1` to install the packages.
- **Files modified:** `apps/backend/package.json` (version pin updated), `yarn.lock`
- **Commit:** 7903a81

## Verification

All acceptance criteria met:

```
grep -c "auth.post('/forgot-password'"   auth.ts → 1 ✓
grep -c "auth.get('/reset-password/:token'"  auth.ts → 1 ✓
grep -c "auth.post('/reset-password/:token'" auth.ts → 1 ✓
grep -c 'randomBytes'                    auth.ts → 2 ✓
grep -c 'createHash'                     auth.ts → 4 ✓
grep -c 'updateMany'                     auth.ts → 4 ✓
grep -c 'refreshToken.deleteMany'        auth.ts → 3 ✓

grep -c "admin.post('/users/:id/reset-password'" admin.ts → 1 ✓
grep -c 'createHash'                     admin.ts → 2 ✓
grep -c 'NO_EMAIL'                       admin.ts → 6 ✓
grep -c 'SMTP_NOT_CONFIGURED'            admin.ts → 3 ✓
grep -c 'passwordResetToken.create'      admin.ts → 1 ✓
grep -c 'passwordResetToken.delete'      admin.ts → 1 ✓

yarn workspace @kartex/backend build → exit 0 ✓
```

## must_haves Compliance

| Truth | Status |
|-------|--------|
| POST /forgot-password always returns 200 regardless of email existence | ✓ |
| GET /reset-password/:token returns NOT_FOUND / ALREADY_USED / EXPIRED | ✓ |
| POST /reset-password/:token uses atomic updateMany WHERE usedAt IS NULL | ✓ |
| POST /reset-password/:token deletes ALL RefreshToken rows on success | ✓ |
| POST /admin/users/:id/reset-password returns NO_EMAIL (400) for null email | ✓ |
| All three auth routes are public (no index.ts changes needed) | ✓ |
| Token stored as SHA-256 hash; raw token only in emailed link | ✓ |
| PasswordResetToken rolled back if sendMail() throws (both routes) | ✓ |

## Self-Check: PASSED

- `apps/backend/src/routes/auth.ts` — exists and modified ✓
- `apps/backend/src/routes/admin.ts` — exists and modified ✓
- Commit 60f3111 exists in git log ✓
- Commit 7903a81 exists in git log ✓
- `yarn workspace @kartex/backend build` exits 0 ✓
