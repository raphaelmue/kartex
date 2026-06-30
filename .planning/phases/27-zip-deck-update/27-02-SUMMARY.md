---
phase: 27-zip-deck-update
plan: "02"
subsystem: frontend
tags: [file-picker, i18n, ux, zip]
status: complete

dependency_graph:
  requires: [27-01]
  provides: [DECKU-01-client]
  affects: [DeckDetailPage, en.json, de.json]

tech_stack:
  added: []
  patterns: [i18n-parity]

key_files:
  modified:
    - apps/frontend/src/pages/DeckDetailPage.tsx
    - apps/frontend/src/locales/en.json
    - apps/frontend/src/locales/de.json

decisions:
  - "accept attribute is advisory client-side only; server-side validation enforced in 27-01 (T-27-07)"
  - "de.json parseError updated to match en.json parity in same commit (i18n pitfall 5 prevention)"

metrics:
  duration: "~4 minutes"
  completed: "2026-06-30T13:38:51Z"
  tasks: 2
  files: 3
---

# Phase 27 Plan 02: Zip Deck Update — Frontend Summary

**One-liner:** File-picker `accept` extended to `.kartex,.kartex.zip` and parse-error copy updated in both EN/DE locales.

## What Was Built

Exposed the zip deck-update capability in the frontend:

1. **Task 1 — File picker `accept` attribute** (`fa90fd9`): Changed the hidden file input referenced by `updateFileInputRef` in `DeckDetailPage.tsx` from `accept=".kartex"` to `accept=".kartex,.kartex.zip"`. This lets the OS file dialog surface `.kartex.zip` bundles alongside plain `.kartex` files. No other attribute or handler was touched. This is advisory only — the backend (27-01) re-validates extension and magic bytes.

2. **Task 2 — i18n `parseError` copy** (`d7b60c8`): Updated `deckUpdate.parseError` in both `en.json` and `de.json` in a single atomic commit to satisfy i18n parity. English now reads "...a valid `.kartex` or `.kartex.zip` file." German reads "...eine gültige `.kartex`- oder `.kartex.zip`-Datei ist." No keys were added, removed, or renamed.

## Verification

- `yarn workspace @kartex/frontend build` passes after each task (2961 modules transformed, no TS errors)
- Manual grep: `accept=".kartex,.kartex.zip"` present in `DeckDetailPage.tsx` line 570; `.kartex.zip` present in `deckUpdate.parseError` of both locale files

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. The `accept` attribute change is advisory (T-27-07 accepted at plan level).

## Self-Check: PASSED

- [x] `apps/frontend/src/pages/DeckDetailPage.tsx` modified (accept attribute)
- [x] `apps/frontend/src/locales/en.json` modified (parseError)
- [x] `apps/frontend/src/locales/de.json` modified (parseError parity)
- [x] Commit `fa90fd9` exists (Task 1)
- [x] Commit `d7b60c8` exists (Task 2)
- [x] Build passes after both tasks
