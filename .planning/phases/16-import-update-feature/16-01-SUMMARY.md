---
phase: 16-import-update-feature
plan: "01"
subsystem: test-infrastructure
tags: [wave-0, test-stubs, tdd, import-update]
dependency_graph:
  requires: []
  provides:
    - apps/backend/src/routes/__tests__/deck-update.test.ts
    - apps/frontend/src/components/__tests__/DeckUpdateModal.test.tsx
  affects: []
tech_stack:
  added: []
  patterns:
    - Wave 0 RED stub pattern — it.todo stubs lock behavioral contract before implementation
key_files:
  created:
    - apps/backend/src/routes/__tests__/deck-update.test.ts
    - apps/frontend/src/components/__tests__/DeckUpdateModal.test.tsx
  modified: []
decisions:
  - Wave 0 stubs use pure it.todo entries with no imports beyond describe/it — matches stats-summary.test.ts pattern; Wave 1 replaces stubs with real assertions
metrics:
  duration: "3m 53s"
  completed: "2026-06-10"
  tasks_completed: 2
  files_changed: 2
---

# Phase 16 Plan 01: Wave 0 Test Stub Scaffold Summary

Wave 0 RED scaffold — 18 named it.todo stubs (12 backend + 6 frontend) locking the behavioral contract for the import-update feature before any implementation exists.

## What Was Built

Two new test stub files establishing the Nyquist compliance baseline for Phase 16:

1. **`apps/backend/src/routes/__tests__/deck-update.test.ts`** — 12 named `it.todo` stubs split across two `describe` blocks covering all backend route behaviors (T-16-01..T-16-12): preview 403/404/422 guards, diff count correctness, apply transaction semantics, keepRemoved flag, atomicity, and JWT-only userId extraction.

2. **`apps/frontend/src/components/__tests__/DeckUpdateModal.test.tsx`** — 6 named `it.todo` stubs covering the modal state machine (T-16-FE-01..T-16-FE-06): uploading spinner, previewing diff counts, keepRemoved toggle default, apply fetch trigger, error state display, and onSuccess callback.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create backend deck-update test stub file (T-16-01..T-16-12) | ec6041d | apps/backend/src/routes/__tests__/deck-update.test.ts |
| 2 | Create frontend DeckUpdateModal test stub file (T-16-FE-01..T-16-FE-06) | afa6e77 | apps/frontend/src/components/__tests__/DeckUpdateModal.test.tsx |

## Verification Results

**Backend:** `yarn workspace @kartex/backend test --run`
- `deck-update.test.ts`: 12 tests, 12 skipped (todos) — PASS
- Pre-existing 3 failures in `kartex-parser-id.test.ts` confirmed pre-existing (same count before and after)
- No new failures introduced

**Frontend:** `yarn workspace @kartex/frontend test --run`
- `DeckUpdateModal.test.tsx`: 6 tests, 6 skipped (todos) — PASS
- 13 other test files: all passed (96 tests)
- No new failures introduced

## Deviations from Plan

None — plan executed exactly as written.

The plan instructed `it.todo` stubs only with no additional imports beyond `{ describe, it }` from `'vitest'`. Both files follow this exactly, matching the `stats-summary.test.ts` analog.

## Stub Tracking

Both files are intentional stubs — all entries are `it.todo` placeholders by design. This is the Wave 0 scaffold; Wave 1 (Plan 16-02) and Wave 3 (Plan 16-03) will replace these stubs with real assertions. No unintentional stubs exist.

## Threat Flags

None — no production code touched in this plan. Test stub files introduce no trust boundary surface.

## Self-Check: PASSED

- [x] `apps/backend/src/routes/__tests__/deck-update.test.ts` — FOUND (ec6041d)
- [x] `apps/frontend/src/components/__tests__/DeckUpdateModal.test.tsx` — FOUND (afa6e77)
- [x] Both commits verified in git log
