---
phase: 25-password-reset
plan: "01"
subsystem: backend/shared
status: complete
tags:
  - prisma
  - schema
  - migration
  - zod
  - password-reset
dependency_graph:
  requires: []
  provides:
    - PasswordResetToken Prisma model
    - 20260629000000_add_password_reset_token SQL migration
    - PasswordResetRequestSchema (shared)
    - PasswordResetSchema (shared)
  affects:
    - apps/backend/prisma/schema.prisma
    - packages/shared/src/schemas/auth.ts
tech_stack:
  added: []
  patterns:
    - Hand-written SQL migration (consistent with 10-02/18-01/24-01 pattern)
    - SHA-256 hash-only token storage (OWASP D-07 pattern)
    - onDelete Cascade FK for user-bound tokens
    - Zod schemas in shared package (single source of truth)
key_files:
  created:
    - apps/backend/prisma/migrations/20260629000000_add_password_reset_token/migration.sql
  modified:
    - apps/backend/prisma/schema.prisma
    - packages/shared/src/schemas/auth.ts
decisions:
  - "25-01: PasswordResetToken stores tokenHash only — no raw token column (D-07 / OWASP)"
  - "25-01: onDelete Cascade FK to User — tokens auto-delete when user deleted, no manual cleanup"
  - "25-01: usedAt nullable (single-use gate, null = unused, non-null = consumed)"
  - "25-01: Neither PasswordResetRequestSchema nor PasswordResetSchema includes confirmPassword — frontend-only concern"
  - "25-01: newPassword min(8) matches password constraint in RegisterSchema for consistency"
metrics:
  duration: "~2 min"
  completed: "2026-06-29"
  tasks_completed: 3
  files_modified: 2
  files_created: 1
---

# Phase 25 Plan 01: Schema + Migration + Shared Zod Schemas Summary

## One-liner

PasswordResetToken Prisma model with cascade-delete FK, hand-written PostgreSQL migration, and two Zod schemas (PasswordResetRequestSchema + PasswordResetSchema) exported from the shared package.

## What Was Built

### Task 1.1 — PasswordResetToken Prisma model (commit: 36dab42)

Added to `apps/backend/prisma/schema.prisma`:

- `resetTokens PasswordResetToken[]` relation added to User model
- New `PasswordResetToken` model:
  - `id` — String @id @default(cuid())
  - `userId` — String (FK to User with onDelete: Cascade, onUpdate: Cascade)
  - `tokenHash` — String @unique (SHA-256 hash only — D-07)
  - `expiresAt` — DateTime (1-hour window enforced at query time)
  - `usedAt` — DateTime? (nullable single-use gate)
  - `createdAt` — DateTime @default(now())

### Task 1.2 — Hand-written SQL migration (commit: 39836f9)

Created `apps/backend/prisma/migrations/20260629000000_add_password_reset_token/migration.sql`:

- CREATE TABLE "PasswordResetToken" with all columns, TIMESTAMP(3) types, nullable usedAt
- CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key"
- ALTER TABLE ADD CONSTRAINT FK to "User" with ON DELETE CASCADE ON UPDATE CASCADE
- Additive-only migration — no DROP statements

### Task 1.3 — Shared Zod schemas (commit: 5860a01)

Appended to `packages/shared/src/schemas/auth.ts`:

- `PasswordResetRequestSchema` — z.object({ email: z.string().email(...) })
- `PasswordResetRequestInput` — inferred type
- `PasswordResetSchema` — z.object({ newPassword: z.string().min(8, ...) })
- `PasswordResetInput` — inferred type

`packages/shared/src/index.ts` already re-exports all of schemas/auth.ts — no change needed.

`yarn workspace @kartex/shared build` exits 0.

## Deviations from Plan

None — plan executed exactly as written.

## Must-haves Verification

- PasswordResetToken model in schema.prisma has onDelete: Cascade FK to User ✓
- tokenHash is the only token-related field — no raw token column exists ✓
- usedAt is nullable (single-use gate) ✓
- PasswordResetRequestSchema and PasswordResetSchema exported from packages/shared ✓
- Neither new schema contains a confirmation-password field ✓

## Threat Flags

No new security-relevant surface beyond what is in the plan's threat model. The PasswordResetToken model uses hash-only storage (no plaintext token persisted), consistent with D-07.

## Self-Check: PASSED

- `apps/backend/prisma/schema.prisma` — modified, exists ✓
- `apps/backend/prisma/migrations/20260629000000_add_password_reset_token/migration.sql` — created, exists ✓
- `packages/shared/src/schemas/auth.ts` — modified, exists ✓
- Commits 36dab42, 39836f9, 5860a01 — all present in git log ✓
- `yarn workspace @kartex/shared build` — exits 0 ✓
