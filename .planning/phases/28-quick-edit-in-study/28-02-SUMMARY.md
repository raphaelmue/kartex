---
phase: 28-quick-edit-in-study
plan: 02
subsystem: frontend/study-session
tags: [study-session, quick-edit, dropdown-menu, dialog, radix-ui, jsdom-crash-fix]
dependency_graph:
  requires:
    - "28-01: DueCard.canEdit field computed server-side in study.ts"
  provides:
    - "StudyCardMenu component (3-dot overflow menu, gated on canEdit)"
    - "CardEditorModal.onCardUpdated callback + skipOpenAutoFocus prop"
    - "SessionRunner quick-edit integration (SEDIT-01/02/03/04)"
  affects:
    - "apps/frontend/src/pages/StudySessionPage.tsx"
tech_stack:
  added: []
  patterns:
    - "Radix DropdownMenuContent onCloseAutoFocus + Dialog onOpenAutoFocus preventDefault pair required when a Dialog is opened directly from a DropdownMenuItem selection (JSDOM-only crash, radix-ui/primitives#1836)"
key_files:
  created:
    - apps/frontend/src/components/StudyCardMenu.tsx
  modified:
    - apps/frontend/src/components/CardEditorModal.tsx
    - apps/frontend/src/pages/StudySessionPage.tsx
    - apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx
    - apps/frontend/src/locales/en.json
    - apps/frontend/src/locales/de.json
decisions:
  - "28-02: DropdownMenuItem 'Edit this card' keeps plain onClick={onEdit} (matches plan) — the JSDOM crash fix lives entirely in onCloseAutoFocus (DropdownMenuContent) + a new optional skipOpenAutoFocus prop (CardEditorModal's DialogContent), not in the click handler's timing"
  - "28-02: skipOpenAutoFocus defaults to false on CardEditorModal — only the StudySessionPage quick-edit call site passes skipOpenAutoFocus, so DeckDetailPage's add/edit-via-button flows keep standard accessible focus-on-open behavior"
  - "28-02: no e.stopPropagation() added anywhere in StudyCardMenu (D-01 prohibition honored)"
metrics:
  duration: "~55 min (this session; continuation from a prior stalled session)"
  completed: "2026-07-02"
status: complete
---

# Phase 28 Plan 02: Quick-edit menu in study session Summary

Wired a 3-dot `StudyCardMenu` into the study session's progress row, gated on the server-computed `currentCard.canEdit`, letting an editor fix a card inline via `CardEditorModal` (spread-merged back into the in-progress `DueCard` list) or jump straight to its deck — without ever leaving the session.

## What Was Built

- **`StudyCardMenu.tsx`** (new) — a two-item ghost `DropdownMenu` (`MoreVertical` trigger) with `onEdit` / `onJumpToDeck` props. No `e.stopPropagation()` anywhere (D-01).
- **`CardEditorModal.tsx`** — `card` prop widened to `Pick<Card, 'id' | 'deckId' | 'frontContent' | 'backContent' | 'tags'>` so a `DueCard` can be passed without fabricating `createdAt`/`updatedAt`; new optional `onCardUpdated` callback invoked with the parsed PATCH response on successful edit; new optional `skipOpenAutoFocus` prop (see Deviations).
- **`StudySessionPage.tsx`** — `SessionRunner` renders `{currentCard.canEdit && <StudyCardMenu .../>}` as the last child of the progress row; local `editorOpen` state; `handleJumpToDeck` navigates to `currentCard.deckId` (not the `deckId` prop, which is undefined in global SR mode); `CardEditorModal` is always mounted (open/closed by `editorOpen`) with `onCardUpdated={(updated) => onCardUpdated({ ...currentCard, ...updated })}`; the parent `StudySessionPage` owns the actual `setCards` replace-by-id spread-merge.
- **i18n** — `study.cardMenuAriaLabel`, `study.editThisCard`, `study.jumpToDeck` added to both `en.json` and `de.json` in the same commit as the component.
- **Tests** — `StudySessionPage.test.tsx` gained a `StudyCardMenu quick-edit (SEDIT-01/02/03/04)` describe block: menu presence/absence by `canEdit`, jump-to-deck navigation target, and the inline-edit spread-merge (updated content shown, session stays at the same index, `deckTitle` badge survives).

## Requirements Covered

- SEDIT-01: menu trigger present only when `currentCard.canEdit === true`.
- SEDIT-04: trigger absent from the DOM entirely (not disabled) when `canEdit === false`.
- SEDIT-02: "Edit this card" opens `CardEditorModal` for the current card; on save the spread-merge (`{ ...currentCard, ...updated }`) updates displayed content in place while preserving `DueCard`-only fields (`deckTitle`, SM-2 state); session stays at the same index.
- SEDIT-03: "Jump to deck" navigates to `/decks/${currentCard.deckId}` with no confirmation dialog.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Radix DropdownMenu + Dialog composition crashed the JSDOM test worker**

- **Found during:** Task 3 verification (`SEDIT-02` test) — this was a continuation of a prior stalled session that had already diagnosed the crash's location but not its root cause.
- **Symptom:** `fireEvent.click(editItem)` on the "Edit this card" `DropdownMenuItem` (which synchronously opens `CardEditorModal`'s Radix `Dialog`) reliably crashed the vitest worker process (`Error: Worker exited unexpectedly` from tinypool, no catchable JS exception, no stack trace) — every time, with zero flakiness.
- **Investigation:** The prior session's hypothesis (defer `setEditorOpen(true)` via `onSelect` + `setTimeout`) was tested and did **not** resolve the crash — confirming the issue was not about callback timing. Reproduced the crash with a from-scratch minimal harness (`DropdownMenu` → `DropdownMenuItem onClick={() => setOpen(true)}` → plain `Dialog`, no `CardEditorModal` involved at all), proving the bug lives entirely in the Radix `DropdownMenu`+`Dialog` composition under JSDOM, not in `CardEditorModal`'s internals (confirmed separately: `CardEditorModal` alone, opened directly with `open=true`, renders fine). Root cause: opening a Dialog as the direct result of a DropdownMenuItem selection creates two Radix `FocusScope`s racing to claim `document.activeElement` in the same tick — the closing `DropdownMenu`'s own focus-return and the opening `Dialog`'s auto-focus-into-content. This is a known JSDOM-only Radix composition issue (`radix-ui/primitives#1836`); it does not occur in real browsers.
- **Fix:** Two `preventDefault()` calls, one per side of the composition — no timing/deferral needed:
  - `StudyCardMenu.tsx`: `DropdownMenuContent onCloseAutoFocus={(e) => e.preventDefault()}` — stops the closing dropdown from returning focus to its trigger button.
  - `CardEditorModal.tsx`: new optional prop `skipOpenAutoFocus?: boolean` (default `false`) wired to `DialogContent onOpenAutoFocus={skipOpenAutoFocus ? (e) => e.preventDefault() : undefined}` — stops the opening dialog from auto-focusing its first field. Scoped as an opt-in prop (rather than changing `CardEditorModal`'s default behavior) so the existing `DeckDetailPage` add/edit-via-plain-button call sites keep standard accessible focus-on-open; only `StudySessionPage`'s quick-edit call site passes `skipOpenAutoFocus`.
  - Verified with the minimal isolated harness first (confirmed the fix works there), then applied to the real components and re-ran the full `SEDIT-02` test — passes cleanly, no crash.
- **Files modified:** `apps/frontend/src/components/StudyCardMenu.tsx`, `apps/frontend/src/components/CardEditorModal.tsx`, `apps/frontend/src/pages/StudySessionPage.tsx` (wires `skipOpenAutoFocus` on its `CardEditorModal` usage).
- **Commit:** `9437943`

**2. [Rule 3 - Blocking] Removed leftover debug `console.error` instrumentation**

- **Found during:** Task 3 — the prior stalled session had added numbered `console.error('DEBUG ...')` / `console.error('SEDIT02 ...')` tracer statements throughout `startSessionWithCard` and the `SEDIT-02` test while diagnosing the crash.
- **Fix:** Removed all tracer statements once the crash was root-caused and fixed; the test logic itself was otherwise correct and needed no other changes. This left `StudySessionPage.test.tsx` byte-identical to what was already committed in `d49727b`, so no new commit was needed for that file.
- **Files modified:** `apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx` (working-tree cleanup only, no diff against HEAD after cleanup).

No other deviations — the rest of the plan (component shape, prop names, i18n keys, spread-merge logic, navigation target) was executed exactly as written.

## Verification

- `yarn workspace @kartex/frontend build` — exits 0.
- `yarn workspace @kartex/frontend test -- StudySessionPage` — 24/24 tests pass (including all four SEDIT-01/02/03/04 cases).
- Full frontend suite (`npx vitest run`, no filter) — 143/143 tests pass across 17 files, no regressions in `DeckDetailPage`/`DecksPage`/`DeckUpdateModal` (other `CardEditorModal`/`DropdownMenu` consumers).
- Backend suite (`yarn workspace @kartex/backend test`) — 42/42 non-skipped tests pass, unaffected (no backend files touched in this plan).

## Self-Check: PASSED

- FOUND: apps/frontend/src/components/StudyCardMenu.tsx
- FOUND: apps/frontend/src/components/CardEditorModal.tsx
- FOUND: apps/frontend/src/pages/StudySessionPage.tsx
- FOUND commit: 7dee729 (feat(28-02): create StudyCardMenu component and i18n keys)
- FOUND commit: 46d9ae0 (feat(28-02): add onCardUpdated callback and widen card prop in CardEditorModal)
- FOUND commit: d49727b (test(28-02): add failing tests for StudyCardMenu quick-edit integration)
- FOUND commit: 9437943 (feat(28-02): integrate StudyCardMenu into SessionRunner with spread-merge)
