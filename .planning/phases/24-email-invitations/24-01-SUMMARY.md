---
phase: 24-email-invitations
plan: "01"
subsystem: data-model
tags: [prisma, schema, migration, shared-types, invite-tokens]
dependency_graph:
  requires: []
  provides: [InviteToken-model, prisma.inviteToken-client, RegisterSchema.token-field]
  affects: [24-02, 24-03, 24-04, 24-05]
tech_stack:
  added: []
  patterns: [hand-written-sql-migration, prisma-generate, zod-schema-replacement]
key_files:
  created:
    - apps/backend/prisma/migrations/20260625000000_replace_invite_code_with_invite_token/migration.sql
  modified:
    - apps/backend/prisma/schema.prisma
    - packages/shared/src/schemas/auth.ts
decisions:
  - "Migration staged for Docker Compose entrypoint — prisma migrate deploy fails without DATABASE_URL in dev shell (10-02/18-01 pattern)"
  - "InviteToken has no FK to User — email-only link keeps cascade deletes simple (D-01/D-02)"
  - "confirmPassword excluded from RegisterSchema — frontend-only concern (RESEARCH Pitfall 5)"
metrics:
  duration: "4 minutes"
  completed: "2026-06-25"
  tasks_completed: 3
  files_modified: 3
status: complete
---

# Phase 24 Plan 01: Replace InviteCode with InviteToken — Data Foundation Summary

**One-liner:** InviteToken Prisma model (email-linked, one-time, 7-day expiry) replaces InviteCode via hand-written SQL migration; RegisterSchema.token replaces inviteCode.

## What Was Built

The data and type foundation for email invitations:

1. **schema.prisma** — `InviteCode` model removed (including the `User.inviteCodeUsed` virtual relation); new `InviteToken` model added after `RefreshToken` with fields: `id (cuid)`, `email`, `token (unique)`, `expiresAt`, `usedAt (nullable)`, `createdAt`. No FK to `User` — email-only link.

2. **Migration SQL** — `20260625000000_replace_invite_code_with_invite_token/migration.sql`: drops `InviteCode_usedById_fkey` FK constraint first (Postgres requirement), then `DROP TABLE IF EXISTS "InviteCode"`, then `CREATE TABLE "InviteToken"` with primary key + `CREATE UNIQUE INDEX "InviteToken_token_key"`. Matches bare-SQL comment-header format of prior migrations.

3. **Prisma client regenerated** — `npx prisma generate` succeeded. `prisma.inviteToken` is now available; `prisma.inviteCode` is removed from the generated client.

4. **RegisterSchema** — `inviteCode` field replaced by `token: z.string().min(1, 'Invite token is required.')`. `RegisterInput` type now: `{ username, password, token }`. No `confirmPassword` field (frontend-only concern).

## Verification

| Check | Result |
|-------|--------|
| `npx prisma validate` | PASS |
| `npx prisma generate` | PASS |
| `yarn workspace @kartex/shared typecheck` | PASS |
| `npx prisma migrate deploy` | Staged — fails without DATABASE_URL (expected per 10-02/18-01) |

## Migration Status

`prisma migrate deploy` was attempted and failed with `The datasource.url property is required`. This is the expected behavior per decisions 10-02 and 18-01 — DATABASE_URL is not set in the dev shell. The migration file is staged and will be applied by the Docker Compose entrypoint (`entrypoint.sh`) on the next container start.

## Commits

| Hash | Task | Description |
|------|------|-------------|
| 4633cb5 | Task 1 | Replace InviteCode model with InviteToken in schema.prisma |
| 3a8f6fd | Task 2 | Author InviteToken migration SQL and regenerate Prisma client |
| 01ba4a4 | Task 3 | Swap inviteCode for token on RegisterSchema |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this plan delivers schema/type contracts only; no UI or runtime data paths.

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced in this plan. The `InviteToken` table and `token` column are pure schema additions; the security controls (non-enumerable 256-bit random token, atomic single-use consumption via `updateMany WHERE usedAt IS NULL`) are enforcement concerns for Plan 03.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| apps/backend/prisma/schema.prisma | FOUND |
| apps/backend/prisma/migrations/20260625000000_replace_invite_code_with_invite_token/migration.sql | FOUND |
| packages/shared/src/schemas/auth.ts | FOUND |
| Commit 4633cb5 | FOUND |
| Commit 3a8f6fd | FOUND |
| Commit 01ba4a4 | FOUND |
