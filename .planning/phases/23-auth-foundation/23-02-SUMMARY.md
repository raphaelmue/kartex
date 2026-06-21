---
phase: 23-auth-foundation
plan: "02"
subsystem: backend-mailer
tags: [email, nodemailer, smtp, admin-api, docker-compose]
status: complete

dependency_graph:
  requires:
    - 23-01 (User.email column, UserSchema email field)
  provides:
    - nodemailer SMTP singleton (apps/backend/src/lib/mailer.ts)
    - POST /api/admin/mailer/test endpoint
    - email field on GET /api/admin/users response
    - SMTP_* + APP_URL env var passthrough in docker-compose
  affects:
    - apps/backend/src/lib/mailer.ts
    - apps/backend/src/routes/admin.ts
    - apps/backend/src/index.ts
    - docker-compose.yml

tech_stack:
  added:
    - nodemailer@9.0.1 (SMTP email transport)
    - "@types/nodemailer@8.0.1 (TypeScript types for nodemailer)"
  patterns:
    - Singleton module init from env vars with soft-fail (mirrors seedAdminIfNeeded pattern)
    - POST test endpoint using admin's own email — no arbitrary send (T-23-03)
    - Empty-string defaults in docker-compose for optional env vars

key_files:
  created:
    - apps/backend/src/lib/mailer.ts
  modified:
    - apps/backend/src/routes/admin.ts
    - apps/backend/src/index.ts
    - docker-compose.yml

decisions:
  - "nodemailer singleton soft-fails on missing SMTP env vars — server starts normally (D-10)"
  - "verifyConnection() not called at module init — only inside /mailer/test (prevents startup delay if SMTP server down)"
  - "POST /mailer/test hard-targets admin's own email via userId lookup — admin cannot send to arbitrary addresses (T-23-03)"
  - "NO_EMAIL error code returned (not message) so frontend can map to localised toast (D-12)"
  - "docker-compose uses ${VAR:-} empty-string defaults — unset vars flow through as empty strings, triggering mailer soft-fail"
  - "prisma generate run after Plan 01 migration — Prisma client did not include email field until regenerated"

metrics:
  duration: "~8 min"
  completed: 2026-06-21
  tasks_completed: 3
  files_changed: 4
---

# Phase 23 Plan 02: SMTP Mailer Foundation Summary

**One-liner:** nodemailer singleton with env-var-driven SMTP config and soft-fail startup, admin self-targeted test-send endpoint with no-email and not-configured guards, email field added to GET /users response, and full SMTP/APP_URL env passthrough in docker-compose.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 0 | Verify nodemailer package legitimacy | — (human-approved) | — |
| 1 | Install nodemailer + create mailer singleton | b38f98a | mailer.ts, package.json, yarn.lock |
| 2 | Add email to GET /users + POST /mailer/test endpoint | 20ef6fa | admin.ts |
| 3 | Wire mailer init at startup + add SMTP env vars to docker-compose | 59b6f37 | index.ts, docker-compose.yml |

## What Was Built

**Task 1 — Mailer Singleton (`apps/backend/src/lib/mailer.ts`):**
- Installed `nodemailer@9.0.1` and `@types/nodemailer@8.0.1` via `yarn workspace @kartex/backend add`
- Module-level singleton: reads `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` from `process.env`
- D-10 soft-fail: if any required var is missing, sets `transporter = null` and logs `[mailer] SMTP env vars missing — email disabled.`; server starts normally
- When all vars present, calls `nodemailer.createTransport()` and logs `[mailer] SMTP configured.`
- Exports: `sendMail(options)` — throws descriptive error listing required vars when unconfigured; `isConfigured()` — returns boolean; `verifyConnection()` — calls `transporter.verify()` (reserved for test endpoint only, NOT called at init)
- Uses CJS default import `import nodemailer from 'nodemailer'` (matches existing bcryptjs pattern per Pitfall 3)

**Task 2 — Admin Routes (`apps/backend/src/routes/admin.ts`):**
- ADMIN-05 backend: added `email: true` to the `select` object of `admin.get('/users', ...)` so email is included in the API response
- EMAIL-02: added `admin.post('/mailer/test', ...)` handler:
  - Reads `authenticatedUserId` via `c.get('userId')`
  - Looks up admin email from prisma; returns 400 `{ error: 'NO_EMAIL' }` if null (D-12)
  - Returns 400 `{ error: 'SMTP not configured.' }` if `isConfigured()` is false (D-10)
  - Calls `verifyConnection()` then `sendMail()` targeting the admin's own email only (T-23-03)
  - Returns 200 on success, 500 with error message on SMTP failure

**Task 3 — Startup Wiring + docker-compose:**
- `apps/backend/src/index.ts`: added `import { isConfigured } from './lib/mailer.js'` (import triggers singleton init at module load); after `seedAdminIfNeeded` try/catch, logs `[server] Mailer configured` or `[server] Mailer disabled (SMTP env vars missing)`
- `docker-compose.yml`: added 7 env var entries to backend service environment block with `${VAR:-}` empty-string defaults: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `APP_URL`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma client missing email field in generated types**
- **Found during:** Task 2 (typecheck after adding `email: true` to select)
- **Issue:** `yarn workspace @kartex/backend typecheck` reported `Property 'email' does not exist on type 'UserSelect<DefaultArgs>'` — the Prisma generated client was stale relative to the schema updated in Plan 01
- **Fix:** Ran `yarn workspace @kartex/backend exec prisma generate` to regenerate the client; all email-related type errors resolved
- **Files modified:** `node_modules/@prisma/client` (generated — not committed)
- **Commit:** Part of Task 2 work (no separate commit needed — runtime artifact)

### Pre-existing Typecheck Errors (Out of Scope)

6 TypeScript errors in `apps/backend/src/routes/decks.ts` and `apps/backend/src/routes/study.ts` related to `DeckShare.isActive` were present before this plan and are not caused by any changes in Plan 02. Per deviation rule scope boundary, these are logged to deferred-items but not fixed here. Files changed in this plan: `mailer.ts`, `admin.ts`, `index.ts`, `docker-compose.yml` — none overlap with the pre-existing error files.

## Verification Results

- `apps/backend/src/lib/mailer.ts` exports `sendMail` + `isConfigured` + `verifyConnection`: PASS
- `mailer.ts` reads SMTP env vars and soft-fails (no throw at module load): PASS
- `transporter.verify()` NOT called at module top-level: PASS
- `admin.get('/users')` select contains `email: true`: PASS
- `admin.ts` registers `admin.post('/mailer/test', ...)`: PASS
- Mailer test handler returns 400 `NO_EMAIL` when admin has no email (D-12): PASS (code inspection)
- Handler returns 400 when `isConfigured()` is false (D-10): PASS (code inspection)
- `apps/backend/src/index.ts` imports from `./lib/mailer.js` and logs configured/disabled: PASS
- `docker-compose.yml` backend environment contains SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM, APP_URL: PASS
- All SMTP vars use `${VAR:-}` empty-string defaults: PASS
- `yarn workspace @kartex/backend test --run`: 22 pass, 62 todo (Wave 0 stubs from Plan 01): PASS

## Known Stubs

None — the Wave 0 test todos for admin-mailer.test.ts remain from Plan 01 (intentional; they specify the behavior built in this plan). The todo stubs are test placeholders, not code stubs.

## Threat Flags

None — all threat scenarios from the plan's threat model are addressed:
- T-23-02: SMTP credentials read from env vars only; only `[mailer] SMTP configured.` boolean logged; credentials never returned in responses
- T-23-03: Test email hard-targeted at `c.get('userId')` lookup result — admin cannot send to arbitrary addresses
- T-23-DoS: `verifyConnection()` called only in test endpoint handler, never at module init
- T-23-SC: nodemailer legitimacy verified in Task 0 blocking checkpoint (18M wk downloads, 13yr old package)

## Self-Check: PASSED

- `apps/backend/src/lib/mailer.ts` — FOUND
- `apps/backend/src/routes/admin.ts` contains `/mailer/test` and `email: true` — FOUND
- `apps/backend/src/index.ts` imports from `./lib/mailer.js` — FOUND
- `docker-compose.yml` contains `SMTP_HOST` and `APP_URL` — FOUND
- Commits b38f98a, 20ef6fa, 59b6f37 — all present in git log
