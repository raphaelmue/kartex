---
phase: 23-auth-foundation
plan: "01"
subsystem: database-schema
tags: [email, prisma, migration, shared-types, wave0-tests]
status: complete

dependency_graph:
  requires: []
  provides:
    - User.email nullable unique column (schema.prisma)
    - Migration 20260621000000_add_user_email
    - UserSchema email field (packages/shared)
    - Wave 0 test scaffolds for admin-delete and admin-mailer
  affects:
    - apps/backend/prisma/schema.prisma
    - packages/shared/src/schemas/user.ts
    - downstream plans 02, 03, 04 (compile against new User type)

tech_stack:
  added: []
  patterns:
    - Hand-written SQL migration (consistent with 10-02/18-01 decisions)
    - Wave 0 stub test style (library-toggle.test.ts pattern)
    - Structural assertion without runtime DB (sharing.test.ts pattern)

key_files:
  created:
    - apps/backend/prisma/migrations/20260621000000_add_user_email/migration.sql
    - apps/backend/src/routes/__tests__/admin-delete.test.ts
    - apps/backend/src/routes/__tests__/admin-mailer.test.ts
  modified:
    - apps/backend/prisma/schema.prisma
    - packages/shared/src/schemas/user.ts

decisions:
  - "email field is nullable (no NOT NULL) — existing users remain valid with email = NULL"
  - "UNIQUE constraint on email permits multiple NULLs in Postgres per SQL standard"
  - "email is display-only in Phase 23 (D-14) — no email-edit schema added"
  - "ReviewLog.userId already has onDelete: Cascade — no explicit delete step needed in cascade transaction"

metrics:
  duration: "~2 min"
  completed: 2026-06-21
  tasks_completed: 3
  files_changed: 5
---

# Phase 23 Plan 01: Data Model Foundation Summary

**One-liner:** Nullable unique email column on User via hand-written SQL migration, shared UserSchema extended with email field, and Wave 0 test scaffolds specifying delete-guard and mailer behaviors for Plans 02/03.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add nullable unique email column to User model + migration | 83b257a | schema.prisma, migration.sql |
| 2 | Add email field to shared UserSchema | 9df2242 | packages/shared/src/schemas/user.ts |
| 3 | Create Wave 0 test scaffolds for delete guards and mailer | da033af | admin-delete.test.ts, admin-mailer.test.ts |

## What Was Built

**Task 1 — Schema + Migration:**
- Added `email String? @unique` to the User model in `apps/backend/prisma/schema.prisma`, placed after `studyMode` matching existing alignment style
- Created `apps/backend/prisma/migrations/20260621000000_add_user_email/migration.sql` with `ALTER TABLE "User" ADD COLUMN "email" TEXT UNIQUE;`
- Column is nullable by default in Postgres (no `NOT NULL` constraint) — existing rows remain valid
- `UNIQUE` on a nullable column permits multiple NULLs per SQL standard
- Migration applied automatically via `npx prisma migrate deploy` in Docker Compose entrypoint (entrypoint.sh)

**Task 2 — Shared Type:**
- Added `email: z.string().email().nullable().optional()` to `UserSchema` in `packages/shared/src/schemas/user.ts`
- Propagates to `UserResponseSchema` (already aliased to `UserSchema`)
- `User` TypeScript type now includes `email?: string | null | undefined`
- No email-edit schema added — email is display-only per D-14
- `@kartex/shared` builds cleanly with the new field

**Task 3 — Wave 0 Test Scaffolds:**
- `admin-delete.test.ts`: covers ADMIN-01/ADMIN-04 — successful deletion, ordered cascade, media cleanup, self-delete guard, last-admin guard, 401/403/404
- Structural `it()` assertion confirms `ReviewLog.userId` has `onDelete: Cascade` — no explicit delete step needed in the cascade transaction
- `admin-mailer.test.ts`: covers EMAIL-02 — test send, no-email 400, SMTP-not-configured error, 401/403
- Both files use explicit vitest imports (`import { describe, it, expect } from 'vitest'`)
- All 22 backend tests pass; 62 todos pending; exit 0

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

- `apps/backend/prisma/schema.prisma` declares `email String? @unique` on User: PASS
- Migration file `20260621000000_add_user_email/migration.sql` adds nullable unique email column: PASS
- `packages/shared/src/schemas/user.ts` UserSchema includes email field: PASS
- `yarn workspace @kartex/backend test --run` passes (22 tests, 62 todos): PASS
- `yarn workspace @kartex/shared build` compiles cleanly with new email field: PASS

## Known Stubs

None — this plan creates Wave 0 test stubs intentionally. The test todos are the specified output per the plan objective. Plans 02 and 03 will implement and fill in these stubs.

## Threat Flags

None — all threat scenarios covered by the plan's threat model:
- T-23-MIG: Nullable column with no default, no NOT NULL — zero-downtime, no constraint violations for existing rows
- T-23-SC: No new packages installed in this plan

## Self-Check: PASSED

- `apps/backend/prisma/schema.prisma` — FOUND
- `apps/backend/prisma/migrations/20260621000000_add_user_email/migration.sql` — FOUND
- `packages/shared/src/schemas/user.ts` — FOUND (with email field)
- `apps/backend/src/routes/__tests__/admin-delete.test.ts` — FOUND (≥20 lines)
- `apps/backend/src/routes/__tests__/admin-mailer.test.ts` — FOUND (≥15 lines)
- Commits 83b257a, 9df2242, da033af — all present in git log
