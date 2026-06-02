---
phase: 11-sm2-preset-modes
fixed_at: 2026-06-03T00:00:00Z
review_path: .planning/phases/11-sm2-preset-modes/11-REVIEW.md
iteration: 1
fix_scope: critical_warning
findings_in_scope: 7
fixed: 6
skipped: 1
status: partial
---

# Phase 11: Code Review Fix Report

**Fixed at:** 2026-06-03T00:00:00Z
**Source review:** .planning/phases/11-sm2-preset-modes/11-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7
- Fixed: 6
- Skipped: 1

## Fixed Issues

### CR-01: Stale-closure revert in SettingsPage.handleModeChange

**Files modified:** `apps/frontend/src/pages/SettingsPage.tsx`
**Commit:** 2e9a13c
**Applied fix:** Captured `currentUser = user` at invocation time (not closure time), guards null case early, and on revert uses `{ ...currentUser, studyMode: previous }` to spread the captured snapshot. Uses the direct `setUser(User | null)` API signature (no functional updater — AuthContext does not support that form).

### CR-02: POST /api/study/rate has no isActive guard

**Files modified:** `apps/backend/src/routes/study.ts`
**Commit:** 2571f5e
**Applied fix:** Added `isActive: true` to the Prisma select for the deck in the rate endpoint, and inserted an early-return 403 check `if (!card.deck.isActive)` before the ownership/share check, so inactive-deck cards cannot be rated by any user path.

### WR-02: Mutable Set shared reference in setCommittedConfig

**Files modified:** `apps/frontend/src/pages/StudySessionPage.tsx`
**Commit:** d850ec9
**Applied fix:** Replaced `tags: selectedTags` with `tags: new Set(selectedTags)` at all five `setCommittedConfig` call sites (SR click, SR keydown, Deck Mode click, Deck Mode keydown, Exam Mode button). The `handleStartSession` path already used `new Set()` (empty set) and was left unchanged.

### WR-03: studyMode typed as string instead of StudyMode in AuthContext

**Files modified:** `apps/frontend/src/context/AuthContext.tsx`
**Commit:** b26aadd
**Applied fix:** Added `import type { StudyMode } from '@kartex/shared'` and changed the `studyMode` field type from `string` to `StudyMode` in the `User` interface, matching the shared schema.

### WR-04: Shared decks not filtered by isActive in GET /api/study/due

**Files modified:** `apps/backend/src/routes/study.ts`
**Commit:** fdc4313
**Applied fix:** Added `isActive: true` to the shared-deck OR arm of the `deckFilter` object, so inactive decks shared with a user no longer surface cards in the due list.

### WR-05: console.error in production code in StudySessionPage

**Files modified:** `apps/frontend/src/pages/StudySessionPage.tsx`
**Commit:** 0ae6e58
**Applied fix:** Wrapped both `console.error` calls (lines 408 and 435 in original, now 409 and 438) inside `if (import.meta.env.DEV) { ... }` blocks so they are only emitted in development builds.

## Skipped Issues

### WR-01: O(n) bcrypt scan on logout/refresh (brute-force token lookup)

**File:** `apps/backend/src/routes/auth.ts:133-141`
**Reason:** Fix requires a Prisma schema migration — adding a `tokenPrefix` column to the `RefreshToken` model. This is a database schema change that requires `prisma migrate dev` and a migration file. Applying this as an atomic source-only fix is not safe without coordinating the migration, so it is deferred for a dedicated schema migration task.
**Original issue:** Every logout and token refresh scans all non-expired refresh tokens in the database and runs a bcrypt comparison for each, making the operation O(n × 100ms) CPU. Fix would store a fast-lookup prefix alongside the bcrypt hash.

---

_Fixed: 2026-06-03T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
