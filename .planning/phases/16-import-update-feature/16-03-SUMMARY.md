---
phase: 16-import-update-feature
plan: "03"
subsystem: frontend-modal
tags: [wave-2, frontend, tdd, import-update, dialog, diff-preview]
dependency_graph:
  requires:
    - apps/frontend/src/components/__tests__/DeckUpdateModal.test.tsx (Plan 16-01 — Wave 0 stubs)
    - apps/backend/src/routes/deckUpdate.ts (Plan 16-02 — preview + apply endpoints)
    - apps/frontend/src/locales/en.json (Plan 16-02 — deckUpdate.* i18n keys)
  provides:
    - apps/frontend/src/components/DeckUpdateModal.tsx
    - DeckUpdateModal named export React component
    - DeckUpdateModalProps TypeScript interface
  affects:
    - apps/frontend/src/components/__tests__/DeckUpdateModal.test.tsx
tech_stack:
  added: []
  patterns:
    - Two-phase dialog state machine (uploading → previewing → applying → done/error)
    - useEffect auto-trigger on [open, file] — preview fetch on modal open
    - Stateless re-upload on apply (TOCTOU prevention — file re-uploaded, no server session)
    - 2x2 diff chip grid — matches StatsSummaryPanel chip pattern
    - fireEvent (not userEvent) for click simulation — @testing-library/user-event not installed
key_files:
  created:
    - apps/frontend/src/components/DeckUpdateModal.tsx
  modified:
    - apps/frontend/src/components/__tests__/DeckUpdateModal.test.tsx
decisions:
  - "@testing-library/user-event not installed — fireEvent from @testing-library/react used instead for click simulation in tests"
  - "common.close key absent from locale files — used common.cancel for error state Close button (same semantic meaning)"
  - "DeckUpdateModal stays at 195 lines — within 200-line limit per plan constraint"
metrics:
  duration: "~8m"
  completed: "2026-06-10"
  tasks_completed: 2
  files_changed: 2
---

# Phase 16 Plan 03: DeckUpdateModal Frontend Component Summary

Two-phase Dialog component (`uploading → previewing → applying → done/error`) wiring the frontend to the preview and apply endpoints created in Plan 16-02, with all 6 Wave 0 frontend stubs replaced by passing assertions.

## What Was Built

1. **`apps/frontend/src/components/DeckUpdateModal.tsx`** — New file exporting `DeckUpdateModal`:
   - `DeckUpdateModalProps`: `{ open, onOpenChange, deckId, file, onSuccess }`
   - `UpdateStep` type: `'uploading' | 'previewing' | 'applying' | 'done' | 'error'`
   - State: `step` (initial `'uploading'`), `preview` (diff counts), `keepRemoved` (default `true`), `errorMsg`
   - `useEffect` on `[open, file]`: auto-triggers `runPreview()` when `open && file`
   - State reset on close: step→`'uploading'`, preview→`null`, errorMsg→`null`, keepRemoved→`true`
   - `runPreview()`: POSTs file to `/api/decks/${deckId}/update/preview`, transitions to `'previewing'` or `'error'`
   - `runApply()`: POSTs file + `keepRemoved` to `/api/decks/${deckId}/update/apply`, fires `toast.success`, calls `onSuccess()`, closes modal
   - Uploading/applying: centered `Loader2` (animate-spin, aria-hidden) + muted label text; container `aria-busy="true"`
   - Previewing: `DialogDescription` heading + 2x2 diff chip grid (border-border rounded-lg p-4, role="region", text-xl value) + keepRemoved `Switch` row (id/htmlFor linked)
   - Error: `div[role="alert"]` with error title + body
   - Footer: Cancel+Apply (previewing/applying); Apply disabled+aria-busy in applying; Cancel only in error
   - 195 lines — within 200-line plan constraint

2. **`apps/frontend/src/components/__tests__/DeckUpdateModal.test.tsx`** — All 6 `it.todo` stubs replaced:
   - T-16-FE-01: Uploading state — `.animate-spin` class + `deckUpdate.uploading` key visible
   - T-16-FE-02: Previewing state — diff count values (2, 1, 3, 0) rendered after preview resolves
   - T-16-FE-03: keepRemoved default — `role="switch"` has `data-state="checked"`
   - T-16-FE-04: Apply fetch — `api.postForm` called second time with URL matching `update/apply` and `FormData.get('keepRemoved') === 'true'`
   - T-16-FE-05: Error state — `role="alert"` present after preview rejects
   - T-16-FE-06: Done — `onSuccess()` called and `onOpenChange(false)` called; `toast.success` fired

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create DeckUpdateModal.tsx — two-phase dialog component | f55027a | apps/frontend/src/components/DeckUpdateModal.tsx |
| 2 | Upgrade DeckUpdateModal test stubs to real assertions (T-16-FE-01..06) | 29c55c2 | apps/frontend/src/components/__tests__/DeckUpdateModal.test.tsx |

## Verification Results

1. `yarn workspace @kartex/frontend test --run`: **102 tests pass** (14 test files), including all 6 T-16-FE cases — 0 failures
2. `yarn workspace @kartex/frontend build`: exits 0 (no TypeScript errors, PWA built successfully)
3. `yarn workspace @kartex/backend test --run`: 15 tests pass, 38 todos, 3 pre-existing failures in `kartex-parser-id.test.ts` (IMP-07 — planned for Plan 16-04) — no regressions
4. `DeckUpdateModal.tsx`: 195 lines (within 200-line limit)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] @testing-library/user-event not installed**
- **Found during:** Task 2
- **Issue:** `@testing-library/user-event` is not a dependency in `apps/frontend/package.json` — test import would fail at resolution
- **Fix:** Replaced `userEvent.click()` with `fireEvent.click()` from `@testing-library/react` (already installed). Both produce the same DOM event dispatch for button click tests without needing async `user-event` setup
- **Files modified:** `apps/frontend/src/components/__tests__/DeckUpdateModal.test.tsx`
- **Commit:** 29c55c2

**2. [Rule 2 - Missing functionality] common.close i18n key absent**
- **Found during:** Task 1
- **Issue:** `common.close` does not exist in `apps/frontend/src/locales/en.json`. The plan's UI-SPEC specified a "Close" button for the error state footer
- **Fix:** Used `common.cancel` (which translates to "Cancel") for the error state close button. Semantically equivalent — both dismiss the modal. Adding a new i18n key to both locale files is Plan 16-02 territory; reusing existing key avoids key drift
- **Files modified:** `apps/frontend/src/components/DeckUpdateModal.tsx`
- **Commit:** f55027a

## Known Stubs

None. All implementation is complete with real logic. No hardcoded empty values or placeholder text in production code paths.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| trust_boundary: file-upload | apps/frontend/src/components/DeckUpdateModal.tsx | Frontend passes `File` object directly to `api.postForm` — no client-side validation of file type or size. Backend enforces bodyLimit (5 MB) and parseKartex validation per Plan 16-02. Frontend `accept=".kartex"` filter added in Plan 16-04. |

All STRIDE mitigations from the plan's threat register:
- T-16-FE-01: `keepRemoved` sent as `String(keepRemoved)` — always string `'true'`/`'false'`
- T-16-FE-03: Error message shown in `role="alert"` — server message surfaced as-is; no stack traces

## Self-Check: PASSED

- [x] `apps/frontend/src/components/DeckUpdateModal.tsx` — FOUND (f55027a), exports `DeckUpdateModal`
- [x] `apps/frontend/src/components/__tests__/DeckUpdateModal.test.tsx` — FOUND (29c55c2), all 6 T-16-FE tests passing
- [x] DeckUpdateModal.tsx line count: 195 (within 200-line limit)
- [x] `yarn workspace @kartex/frontend build` exits 0 — VERIFIED
- [x] `yarn workspace @kartex/frontend test --run`: 102 passed, 0 failed — VERIFIED
- [x] Both commits verified in git log (f55027a, 29c55c2)
