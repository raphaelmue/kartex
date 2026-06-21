---
phase: 23-auth-foundation
plan: "03"
subsystem: backend-admin-delete
tags: [admin, user-delete, prisma, cascade, transaction, media-cleanup, guards]
status: complete

dependency_graph:
  requires:
    - 23-01 (User.email column, schema.prisma, Wave 0 test scaffolds)
    - 23-02 (admin.ts mailer routes, prisma generate run)
  provides:
    - DELETE /api/admin/users/:id handler with SELF_DELETE + LAST_ADMIN guards
    - Ordered prisma.$transaction cascade delete (FK-safe)
    - Best-effort media file cleanup (unlink via node:fs/promises)
    - Upgraded admin-delete Wave 0 test specs (5 structural tests passing)
    - Validated migration apply path (prisma validate + entrypoint.sh confirm)
  affects:
    - apps/backend/src/routes/admin.ts

tech_stack:
  added:
    - "node:fs/promises unlink (Node built-in — no new package)"
  patterns:
    - Ordered prisma.$transaction array form for FK-safe cascade delete (D-05)
    - Best-effort file unlink with try/catch (D-06/D-07)
    - Guard queries BEFORE transaction (Anti-Pattern avoidance)
    - deckIds pre-computed before $transaction array (Pitfall 2)
    - Structural test assertions following sharing.test.ts pattern

key_files:
  created: []
  modified:
    - apps/backend/src/routes/admin.ts
    - apps/backend/src/routes/__tests__/admin-delete.test.ts

decisions:
  - "Self-delete guard uses id === authenticatedUserId check → SELF_DELETE error code (D-08)"
  - "Last-admin guard counts users WHERE role=ADMIN AND isActive=true; target.role=ADMIN AND adminCount<=1 → LAST_ADMIN (D-08)"
  - "Media unlink uses m.storagePath (full path stored in DB) — do not re-join STORAGE_PATH (storagePath already contains full path)"
  - "deckIds pre-computed via await BEFORE prisma.$transaction array literal (Pitfall 2 — array form is eager)"
  - "InviteCode.deleteMany required: usedById FK has no onDelete in schema, so Postgres will not auto-clear reference"
  - "DATABASE_URL absent in dev shell — migration confirmed valid via prisma validate; apply path is entrypoint.sh prisma migrate deploy (10-02/18-01 pattern)"
  - "No new packages installed — node:fs/promises is a Node 20 built-in"

metrics:
  duration: "~2 min"
  completed: 2026-06-21
  tasks_completed: 3
  files_changed: 2
---

# Phase 23 Plan 03: DELETE User Endpoint Summary

**One-liner:** Guarded hard-delete endpoint with SELF_DELETE/LAST_ADMIN guards, best-effort media file cleanup, and FK-safe ordered prisma.$transaction cascade; upgraded Wave 0 specs (5 structural tests passing); prisma validate confirms migration schema validity.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Implement DELETE /users/:id with guards, media cleanup, and ordered cascade | ef9f8fd | admin.ts |
| 2 | Upgrade admin-delete Wave 0 test specs with structural assertions | 3765f2f | admin-delete.test.ts |
| 3 | Verify add_user_email migration is valid and apply path confirmed | — (no code change) | — |

## What Was Built

**Task 1 — DELETE /users/:id handler (`apps/backend/src/routes/admin.ts`):**
- Added `import { unlink } from 'node:fs/promises'` at the top of the file
- Added `admin.delete('/users/:id', async (c) => { ... })` with full implementation:
  - **SELF_DELETE guard:** `if (id === authenticatedUserId) return c.json({ error: 'SELF_DELETE' }, 400)` — runs before any DB query
  - **Target existence check:** `prisma.user.findUnique({ where: { id } })` → 404 if not found
  - **LAST_ADMIN guard:** `prisma.user.count({ where: { role: 'ADMIN', isActive: true } })` → if `adminCount <= 1 && target.role === 'ADMIN'` return 400 with `LAST_ADMIN`
  - **Media cleanup (D-06/D-07):** `prisma.media.findMany({ where: { ownerId: id } })` then `unlink(m.storagePath)` per record in a try/catch — logs warning on failure, never aborts (best-effort)
  - **deckIds pre-computation (Pitfall 2):** `prisma.deck.findMany({ where: { ownerId: id }, select: { id: true } })` BEFORE the $transaction array
  - **Ordered `prisma.$transaction([...])` (D-05):** RefreshToken.deleteMany(userId), DeckShare.deleteMany(sharedWithUserId), CardProgress.deleteMany(userId), Card.deleteMany(deckId∈deckIds), Deck.deleteMany(ownerId), InviteCode.deleteMany(usedById), Media.deleteMany(ownerId), User.delete(id)
  - Code comment documents that ReviewLog auto-deletes via existing `onDelete: Cascade` on userId FK (no explicit step), and owner-side DeckShare auto-deletes via existing `onDelete: Cascade` on deckId FK when Decks are deleted
  - Returns `c.json({ message: 'User deleted.' }, 200)` on success

**Task 2 — admin-delete test specs (`apps/backend/src/routes/__tests__/admin-delete.test.ts`):**
- Kept all 10 `it.todo` stubs for integration paths (require Prisma mock or test DB — consistent with repo convention)
- Added 5 executing `it()` assertions covering structural guarantees and guard semantics:
  - `ReviewLog schema has onDelete: Cascade on userId` — no explicit delete step needed
  - `DeckShare schema has onDelete: Cascade on deckId` — owner-side shares auto-delete with Deck
  - `InviteCode.usedById has no onDelete` — must be explicitly deleted to prevent FK violation
  - `DELETE handler uses SELF_DELETE error code` — frontend can map to localised message
  - `DELETE handler uses LAST_ADMIN error code` — frontend can map to localised message
- All 5 tests pass; suite: 26 passing | 62 todo

**Task 3 — Migration validation:**
- `npx prisma validate` (from `apps/backend`) exits 0 — schema.prisma is valid against the full migration set
- `DATABASE_URL` absent in dev shell (expected per decisions 10-02/18-01) — no live DB apply attempted
- Migration SQL (`20260621000000_add_user_email/migration.sql`) is syntactically valid: `ALTER TABLE "User" ADD COLUMN "email" TEXT UNIQUE;`
- Apply path confirmed: `entrypoint.sh` runs `npx prisma migrate deploy` automatically at container start → the `add_user_email` migration will be applied before any backend route handles requests
- **NOTE:** The column apply must be confirmed against a running DB before phase verification (no false-positive green claimed here)

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

- `apps/backend/src/routes/admin.ts` registers `admin.delete('/users/:id', ...)`: PASS
- SELF_DELETE guard (`id === authenticatedUserId`) → 400: PASS (code inspection)
- LAST_ADMIN guard (`adminCount <= 1 && target.role === 'ADMIN'`) → 400: PASS (code inspection)
- Non-existent target returns 404: PASS (code inspection)
- deckIds computed via separate await BEFORE `prisma.$transaction([...])` array: PASS
- Transaction order matches D-05 (RefreshToken→DeckShare→CardProgress→Card→Deck→InviteCode→Media→User): PASS
- Media files unlinked via `node:fs/promises` in try/catch before transaction (D-07): PASS
- No explicit ReviewLog delete added (existing Cascade handles it): PASS
- `yarn workspace @kartex/backend typecheck` exits 0: PASS
- `admin-delete.test.ts` runs green (5 pass, 10 todo): PASS
- `npx prisma validate` exits 0 from `apps/backend`: PASS
- `yarn workspace @kartex/backend test --run` 26 passing, 62 todo: PASS

## Known Stubs

None — no code stubs. The 10 remaining `it.todo` entries are Wave 0 test placeholders requiring a test DB or Prisma mock harness (consistent with existing repo convention).

## Threat Flags

None beyond the plan's threat model:
- T-23-01 (IDOR): requireAdmin gates the route; target existence checked before any deletion action
- T-23-04 (self-delete EoP): SELF_DELETE guard returns 400 before any DB mutation
- T-23-05 (last-admin DoS): LAST_ADMIN guard returns 400 before any DB mutation
- T-23-06 (partial delete): All row deletes in single `prisma.$transaction` — atomic; media unlink is intentionally outside (D-07)
- T-23-07 (FK violation): Explicit InviteCode.deleteMany step prevents FK violation on user.delete

## Self-Check: PASSED

- `apps/backend/src/routes/admin.ts` — FOUND (contains `admin.delete('/users/:id'`, `SELF_DELETE`, `LAST_ADMIN`)
- `apps/backend/src/routes/__tests__/admin-delete.test.ts` — FOUND (5 passing tests)
- Commits ef9f8fd, 3765f2f — both present in git log
