---
phase: 24-email-invitations
plan: "03"
subsystem: backend-auth
tags: [invite-tokens, toctou, atomic-transactions, email-invitations, admin-routes, security]
dependency_graph:
  requires: [24-01]
  provides: [24-04, 24-05]
  affects: [auth-registration, admin-panel, invite-flow]
tech_stack:
  added: [node:crypto randomBytes]
  patterns: [interactive-prisma-transaction, toctou-safe-updateMany, sendMail-rollback]
key_files:
  created:
    - apps/backend/src/routes/invites.ts
  modified:
    - apps/backend/src/index.ts
    - apps/backend/src/lib/seed.ts
    - apps/backend/src/routes/auth.ts
    - apps/backend/src/routes/admin.ts
decisions:
  - "TOCTOU-safe consumption via prisma.$transaction + updateMany WHERE usedAt IS NULL; count===0 aborts (EMAIL-06)"
  - "256-bit CSPRNG token via randomBytes(32).toString('hex'); never cuid or truncated UUID (T-24-05)"
  - "email taken from consumed invite row, never request body — spoofing guard (T-24-12)"
  - "role hard-coded 'USER' on user.create — privilege-escalation guard (T-24-09)"
  - "POST /invites rolls back created token row if sendMail throws"
  - "GET /admin/invites: active-only filter (usedAt null AND expiresAt > now); token field excluded from select (T-24-13)"
metrics:
  duration: "~3 minutes"
  completed: "2026-06-27"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 5
status: complete
requirements: [EMAIL-03, EMAIL-04, EMAIL-05, EMAIL-06, EMAIL-07, EMAIL-08]
---

# Phase 24 Plan 03: Backend Invite-Token Routes Summary

**One-liner:** TOCTOU-safe invite-token registration, 256-bit admin invite creation with email, and active-only admin list/revoke — invite-code surface fully removed.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create public invites router and mount before authMiddleware | ff02bc9 | invites.ts (NEW), index.ts, seed.ts |
| 2 | Rework POST /api/auth/register for TOCTOU-safe token consumption | 2c10307 | auth.ts |
| 3 | Replace invite-code admin routes with invite-token routes | 1f8681c | admin.ts |

## What Was Built

### Task 1: Public Invites Router (ff02bc9)

Created `apps/backend/src/routes/invites.ts` exporting `invitesPublicRouter` with a single `GET /:token` handler:
- Returns `200 { email }` for valid, unused, non-expired tokens
- Returns `400 { error: 'NOT_FOUND' }` when no matching row
- Returns `400 { error: 'ALREADY_USED' }` when `usedAt` is non-null
- Returns `400 { error: 'EXPIRED' }` when `expiresAt < now`
- Token value and `usedAt` are never returned — only `email` (T-24-13)

Mounted in `index.ts` at `/api/invites` strictly between `mediaPublicRouter` and `app.use('/api/*', authMiddleware)` — unauthenticated invitees can validate tokens without a 401 (Pitfall 1 avoided).

`seed.ts` updated: old inviteCode creation logic removed; admin now creates invites via `POST /api/admin/invites` (D-02).

### Task 2: TOCTOU-Safe Registration (2c10307)

Reworked `POST /api/auth/register` in `auth.ts`:
- Destructures `token` (not `inviteCode`) from `RegisterSchema`-parsed body
- Pre-check via `findUnique` returns `NOT_FOUND`/`ALREADY_USED`/`EXPIRED` for user-facing clarity
- Atomic consumption inside `prisma.$transaction(async (tx) => {...})`:
  - `tx.inviteToken.updateMany({ where: { token, usedAt: null }, data: { usedAt: new Date() } })`
  - `result.count === 0` → `throw new Error('TOKEN_CONSUMED')` — concurrent second caller cannot win (EMAIL-06, T-24-07)
  - `tx.user.findUnique` for username uniqueness — `throw new Error('USERNAME_TAKEN')` if taken
  - `tx.user.create` with `role: 'USER'` hard-coded and `email: invite.email` from the pre-fetched invite row
- Catch block maps: `TOKEN_CONSUMED` → `400 ALREADY_USED`, `USERNAME_TAKEN` → `409 USERNAME_TAKEN`; all other errors re-thrown
- `throw` (not `return`) inside transaction callback to abort (Pitfall 7 complied)

### Task 3: Admin Invite-Token Routes (1f8681c)

Replaced all invite-code surface in `admin.ts`:

**Removed:**
- `prisma.inviteCode.deleteMany({ where: { usedById: id } })` from user-cascade `$transaction` (type error after InviteCode dropped — Pitfall 3 avoided)
- `GET /invite-codes`, `POST /invite-codes`, `DELETE /invite-codes/:id` handlers

**Added imports:** `import { randomBytes } from 'node:crypto'` and `import { z } from 'zod'`

**New handlers (all under existing `requireAdmin` middleware — T-24-10):**
- `GET /invites`: `prisma.inviteToken.findMany({ where: { usedAt: null, expiresAt: { gt: new Date() } }, select: { id, email, expiresAt, createdAt } })` — active-only, token excluded (T-24-13)
- `POST /invites`: Zod `.email()` validates recipient (T-24-11); `isConfigured()` guard; `randomBytes(32).toString('hex')` = 256-bit token (T-24-05); `prisma.inviteToken.create`; `sendMail` with `APP_URL`-based link; if `sendMail` throws → delete created row and return 500
- `DELETE /invites/:id`: 404 if not found; 400 if `usedAt !== null` ("Cannot revoke a used invite."); otherwise delete + 200

## Verification

```
yarn workspace @kartex/backend typecheck  → exit 0
yarn workspace @kartex/backend build      → exit 0
```

## Deviations from Plan

None — plan executed exactly as written. All acceptance criteria for each task met.

## Threat Model Coverage

All mitigations assigned to Plan 03 in the STRIDE register are implemented:

| Threat ID | Mitigation | Implemented In |
|-----------|-----------|----------------|
| T-24-05 | `randomBytes(32).toString('hex')` 256-bit CSPRNG | Task 3: POST /invites |
| T-24-06 | `updateMany WHERE usedAt IS NULL` + count check | Task 2: $transaction |
| T-24-07 | Interactive $transaction makes mark-used + create atomic | Task 2 |
| T-24-08 | `expiresAt < now` rejected in pre-check and validate route | Tasks 1 + 2 |
| T-24-09 | `role: 'USER'` hard-coded in `user.create` | Task 2 |
| T-24-10 | `/api/admin/*` behind `requireAdmin`; new routes inherit | Task 3 (index.ts line 86) |
| T-24-11 | Zod `.email()` on recipient; subject is a fixed constant | Task 3: POST /invites |
| T-24-12 | `email` from invite row, not request body | Task 2 |
| T-24-13 | `select` omits `token` in GET /invites and POST /invites | Task 3 |
| T-24-14 | Register requires valid unused non-expired token | Task 2 |

## Known Stubs

None.

## Self-Check: PASSED

- [x] `apps/backend/src/routes/invites.ts` exists and exports `invitesPublicRouter`
- [x] `apps/backend/src/index.ts` mounts `/api/invites` before `authMiddleware`
- [x] `apps/backend/src/routes/auth.ts` uses `prisma.$transaction` with `updateMany WHERE usedAt IS NULL`
- [x] `apps/backend/src/routes/admin.ts` contains no reference to `inviteCode`
- [x] Commits ff02bc9, 2c10307, 1f8681c exist in git log
- [x] `yarn workspace @kartex/backend typecheck` exits 0
- [x] `yarn workspace @kartex/backend build` exits 0
