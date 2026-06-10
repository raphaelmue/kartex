---
phase: 16-import-update-feature
plan: "04"
subsystem: frontend-page
tags: [wave-3, frontend, deck-detail, import-update, owner-guard, tests]
dependency_graph:
  requires:
    - apps/frontend/src/components/DeckUpdateModal.tsx (Plan 16-03 — two-phase modal)
    - apps/frontend/src/locales/en.json (Plan 16-02 — deckUpdate.updateFromFile key)
  provides:
    - apps/frontend/src/pages/DeckDetailPage.tsx (updated — owner-only Update from file button + modal mount)
    - T-16-FE-07 passing test (owner visibility)
    - T-16-FE-08 passing test (non-owner hidden)
  affects:
    - apps/frontend/src/pages/__tests__/DeckDetailPage.test.tsx
tech_stack:
  added: []
  patterns:
    - Hidden file input (sr-only, accept=.kartex) triggered via useRef.current?.click()
    - e.target.value = '' reset for same-file re-selection (RESEARCH.md Pitfall 4)
    - Owner-only conditional render (deck.ownerId === user?.id) for button visibility
    - DeckUpdateModal driven by updateFile state (null = closed, File = open)
    - onSuccess wired to fetchCards — same refresh function as CardEditorModal
key_files:
  created: []
  modified:
    - apps/frontend/src/pages/DeckDetailPage.tsx
    - apps/frontend/src/pages/__tests__/DeckDetailPage.test.tsx
decisions:
  - "Test assertions use real en.json translation 'Update from file' (not key string) — DeckDetailPage.test.tsx does not mock react-i18next; real i18next is used"
  - "DeckUpdateModal onSuccess = fetchCards (same as CardEditorModal) — refreshes card list after update completes"
metrics:
  duration: "~7m"
  completed: "2026-06-10"
  tasks_completed: 2
  files_changed: 2
---

# Phase 16 Plan 04: DeckDetailPage Update Flow Wiring Summary

Wired `DeckUpdateModal` into `DeckDetailPage` — owner-only "Update from file" button, hidden file input with `.kartex` filter, and modal mount driven by `updateFile` state. Added T-16-FE-07 and T-16-FE-08 tests asserting owner/non-owner button visibility. Completes IMP-01 and the full Phase 16 import-update feature.

## What Was Built

1. **`apps/frontend/src/pages/DeckDetailPage.tsx`** — 34 net new lines (558 → 591):
   - Added `useRef` to existing React import
   - Added `import { DeckUpdateModal } from '@/components/DeckUpdateModal'`
   - Added `updateFile: File | null` state and `updateFileInputRef: useRef<HTMLInputElement>`
   - Added "Update from file" button (`variant="outline"`, `size="sm"`) inside owner-only block after "Edit deck" button — triggers `updateFileInputRef.current?.click()`
   - Added hidden `<input type="file" accept=".kartex" className="sr-only">` with `e.target.value = ''` reset (Pitfall 4 — allows same-file re-selection)
   - Added `<DeckUpdateModal>` mount: `open={updateFile !== null}`, `onOpenChange={(open) => { if (!open) setUpdateFile(null) }}`, `deckId={deckId!}`, `file={updateFile}`, `onSuccess={fetchCards}`
   - File stays at 591 lines (under 600 limit)

2. **`apps/frontend/src/pages/__tests__/DeckDetailPage.test.tsx`** — 99 lines added:
   - Added `vi.mock('@/components/DeckUpdateModal', () => ({ DeckUpdateModal: () => null }))` to prevent modal api calls during page tests
   - Added new `describe` block "DeckDetailPage update from file button visibility" with T-16-FE-07 and T-16-FE-08
   - T-16-FE-07: renders deck with `ownerId: 'user-1'` (matches auth mock), asserts `"Update from file"` button is in document
   - T-16-FE-08: renders deck with `ownerId: 'other-user'` (non-owner), asserts `"Update from file"` button is NOT in document
   - Both use `mockApiGet.mockImplementation(url =>)` per decision 08-01

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Wire DeckUpdateModal into DeckDetailPage | 915ba80 | apps/frontend/src/pages/DeckDetailPage.tsx |
| 2 | Add T-16-FE-07 and T-16-FE-08 to DeckDetailPage.test.tsx | 214bd92 | apps/frontend/src/pages/__tests__/DeckDetailPage.test.tsx |

## Verification Results

1. `yarn workspace @kartex/frontend test --run`: **104 tests pass** (14 test files), T-16-FE-07 and T-16-FE-08 included — 0 failures
2. `yarn workspace @kartex/frontend build`: exits 0 (no TypeScript errors, PWA built successfully)
3. `yarn workspace @kartex/backend test --run`: 15 tests pass, 38 todos, 3 pre-existing failures in `kartex-parser-id.test.ts` (IMP-07 — pre-existing stubs, not caused by this plan)
4. `DeckDetailPage.tsx`: 591 lines (under 600 limit)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test assertions used i18n key string instead of real translation**
- **Found during:** Task 2
- **Issue:** The plan specified using `'deckUpdate.updateFromFile'` as the button text in assertions, assuming a mockT function that returns keys as strings. However, `DeckDetailPage.test.tsx` does not mock `react-i18next` — it uses the real i18next with actual `en.json` locale files. The button renders `"Update from file"` (the actual translation value), not the key.
- **Fix:** Changed test assertions to use `"Update from file"` (the real en.json value: `"updateFromFile": "Update from file"`) with a comment explaining why
- **Files modified:** `apps/frontend/src/pages/__tests__/DeckDetailPage.test.tsx`
- **Commit:** 214bd92

## Known Stubs

None. All implementation is complete with real logic. No hardcoded empty values or placeholder text.

## Threat Flags

None found beyond the plan's registered threats:
- T-16-FE-04 (mitigated): `{deck.ownerId === user?.id && ...}` hides button for non-owners — confirmed in T-16-FE-08
- T-16-FE-05 (mitigated): `accept=".kartex"` filters OS file picker
- T-16-FE-06 (mitigated): `e.target.value = ''` reset on hidden input onChange

## Phase 16 Completion

All 4 plans of Phase 16 are now complete:

| Plan | Description | Status |
|------|-------------|--------|
| 16-01 | Wave 0 stubs — parser id field, frontend stubs, i18n placeholders | Done |
| 16-02 | Backend — deckUpdateRouter, computeDiff, preview+apply endpoints, 16 i18n keys | Done |
| 16-03 | Frontend — DeckUpdateModal two-phase dialog (T-16-FE-01..06) | Done |
| 16-04 | Frontend — DeckDetailPage wiring + T-16-FE-07/08 | Done |

Requirements IMP-01 through IMP-05 are implemented and tested end-to-end.

## Self-Check: PASSED

- [x] `apps/frontend/src/pages/DeckDetailPage.tsx` — FOUND (915ba80), imports DeckUpdateModal, contains updateFileInputRef, accept=".kartex", e.target.value='', DeckUpdateModal mount
- [x] `apps/frontend/src/pages/__tests__/DeckDetailPage.test.tsx` — FOUND (214bd92), T-16-FE-07 and T-16-FE-08 passing
- [x] DeckDetailPage.tsx line count: 591 (under 600 limit)
- [x] `yarn workspace @kartex/frontend build` exits 0 — VERIFIED
- [x] `yarn workspace @kartex/frontend test --run`: 104 passed, 0 failed — VERIFIED
- [x] Both commits verified: 915ba80, 214bd92
