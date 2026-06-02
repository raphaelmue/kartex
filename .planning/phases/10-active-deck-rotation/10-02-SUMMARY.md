---
phase: 10-active-deck-rotation
plan: "02"
subsystem: schema-foundation
tags: [prisma, migration, zod, shadcn, switch, checkbox, isActive, studyMode]
dependency_graph:
  requires: ["10-01"]
  provides: ["isActive-column", "studyMode-column", "isActive-zod-schema", "Switch-component", "Checkbox-component"]
  affects: ["10-03", "10-04", "10-05", "11-01"]
tech_stack:
  added: ["@radix-ui/react-switch@^1.2.6", "@radix-ui/react-checkbox@^1.3.3"]
  patterns: ["Prisma additive migration (NOT NULL DEFAULT)", "shadcn CLI component install", "Zod schema inheritance via .partial()/.extend()"]
key_files:
  created:
    - apps/backend/prisma/migrations/20260602000000_add_isactive_studymode/migration.sql
    - apps/frontend/src/components/ui/switch.tsx
    - apps/frontend/src/components/ui/checkbox.tsx
  modified:
    - apps/backend/prisma/schema.prisma
    - packages/shared/src/schemas/deck.ts
    - apps/frontend/package.json
decisions:
  - "10-02: prisma migrate dev unavailable in driver adapter mode without DATABASE_URL in environment — migration SQL hand-written to match Prisma output; prisma generate succeeded with new client types"
  - "10-02: Deck.isActive placed after visibility line (before createdAt) matching column ordering style"
  - "10-02: User.studyMode placed after isActive line per STATE.md v1.2-research decision"
  - "10-02: isActive added to CreateDeckSchema (not directly to UpdateDeckSchema) so .partial() inheritance propagates it to UpdateDeckSchema"
  - "10-02: isActive added to DeckSchema (not DeckListItemSchema) so .extend() inheritance propagates it to DeckListItemSchema"
metrics:
  duration: "~12 min"
  completed: "2026-06-02"
  tasks_completed: 3
  tasks_total: 3
  files_created: 3
  files_modified: 3
---

# Phase 10 Plan 02: Schema Foundation for Active Deck Rotation Summary

**One-liner:** Prisma schema extended with `Deck.isActive` (boolean default true) and `User.studyMode` (string default 'normal'), shared Zod deck schemas updated to expose `isActive`, and shadcn Switch and Checkbox components installed via official CLI.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add isActive + studyMode to Prisma schema; extend Zod deck schemas | aa8edf5 |
| 2 | Create migration SQL and regenerate Prisma Client | 4716a68 |
| 3 | Install shadcn Switch and Checkbox components | 374ac32 |

## What Was Built

### Task 1: Prisma Schema + Zod Schema Changes

`apps/backend/prisma/schema.prisma`:
- Added `isActive   Boolean  @default(true)` to the `Deck` model (after `visibility` line)
- Added `studyMode  String   @default("normal")` to the `User` model (after `isActive` line)
- `datasource db` block remains unchanged — no `url` field (Prisma 7 driver adapter mode intentional)

`packages/shared/src/schemas/deck.ts`:
- Added `isActive: z.boolean().optional()` to `CreateDeckSchema` — propagates automatically to `UpdateDeckSchema = CreateDeckSchema.partial()` (DECK-01 PATCH validation)
- Added `isActive: z.boolean().default(true)` to `DeckSchema` — propagates automatically to `DeckListItemSchema = DeckSchema.extend(...)` (frontend `deck.isActive` is typed `boolean`, not `undefined`)

### Task 2: Migration SQL + Prisma Generate

Migration file `apps/backend/prisma/migrations/20260602000000_add_isactive_studymode/migration.sql`:
```sql
ALTER TABLE "Deck" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "studyMode" TEXT NOT NULL DEFAULT 'normal';
```

`npx prisma generate` regenerated the Prisma Client. Verified in `.prisma/client/index.d.ts`:
- `DeckMinAggregateOutputType.isActive: boolean | null` — Deck model has isActive
- `UserMinAggregateOutputType.studyMode: string | null` — User model has studyMode

### Task 3: shadcn Switch and Checkbox

Installed via `npx shadcn@latest add switch` and `npx shadcn@latest add checkbox` from the `apps/frontend` workspace directory. Both generate standard Radix UI wrappers:
- `switch.tsx`: `React.forwardRef` + `@radix-ui/react-switch` + `cn()` + named `Switch` export
- `checkbox.tsx`: `React.forwardRef` + `@radix-ui/react-checkbox` + `cn()` + named `Checkbox` export

## Verification Results

| Check | Result |
|-------|--------|
| `prisma validate` | PASS — schema valid |
| `@kartex/shared` build | PASS — exit 0 |
| `npx prisma generate` | PASS — client regenerated with isActive (Deck) and studyMode (User) |
| Frontend build | PASS — exit 0, 2575 modules transformed |
| switch.tsx exists with Switch export | PASS |
| checkbox.tsx exists with Checkbox export | PASS |
| @radix-ui/react-switch in frontend package.json | PASS (^1.2.6) |
| @radix-ui/react-checkbox in frontend package.json | PASS (^1.3.3) |

## Deviations from Plan

### Auto-fixed Issues

None.

### Architecture Notes

**1. [Rule 3 - Blocking] Migration created as hand-written SQL (db push / migrate dev fallback)**

- **Found during:** Task 2
- **Issue:** `prisma migrate dev` and `prisma db push` both fail with "The datasource.url property is required in your Prisma config file" — even when `prisma.config.ts` contains `datasource.url: process.env.DATABASE_URL`. The Prisma 7 CLI does not pick up `process.env.DATABASE_URL` from `prisma.config.ts` for migration commands when DATABASE_URL is not set in the shell environment. The bash environment does not have DATABASE_URL set (it is a PowerShell environment variable).
- **Fix:** Created the migration SQL file manually at `apps/backend/prisma/migrations/20260602000000_add_isactive_studymode/migration.sql`. The SQL matches exactly what Prisma would generate for additive NOT NULL DEFAULT columns. `npx prisma generate` succeeded and the Prisma Client types include the new fields.
- **Action needed:** Run `npx prisma migrate deploy` (or `prisma db push`) with DATABASE_URL set in the environment to apply the migration to the live database. This is required before any backend route that reads/writes `isActive` will work correctly. The migration SQL is checked in and will be applied automatically via the Docker Compose entrypoint if that is the deployment path.
- **Files modified:** `apps/backend/prisma/migrations/20260602000000_add_isactive_studymode/migration.sql` (created)

## Known Stubs

None. This plan only adds schema/type/component foundations — no UI stubs or placeholder data.

## Threat Flags

None. All changes are additive schema DDL (T-10-02: mitigated by NOT NULL DEFAULT pattern) and official shadcn component installs (T-10-03/T-10-SC: accepted per threat model).

## Self-Check: PASSED

- [x] `apps/backend/prisma/schema.prisma` contains `isActive  Boolean  @default(true)` in Deck model
- [x] `apps/backend/prisma/schema.prisma` contains `studyMode  String  @default("normal")` in User model
- [x] `datasource db` block still has NO `url =` line
- [x] `packages/shared/src/schemas/deck.ts` CreateDeckSchema contains `isActive: z.boolean().optional()`
- [x] `packages/shared/src/schemas/deck.ts` DeckSchema contains `isActive: z.boolean().default(true)`
- [x] Migration SQL file exists at `apps/backend/prisma/migrations/20260602000000_add_isactive_studymode/migration.sql`
- [x] Prisma Client regenerated — isActive on Deck and studyMode on User confirmed in index.d.ts
- [x] `apps/frontend/src/components/ui/switch.tsx` exists with named `Switch` export
- [x] `apps/frontend/src/components/ui/checkbox.tsx` exists with named `Checkbox` export
- [x] Commits aa8edf5, 4716a68, 374ac32 all exist in git log
