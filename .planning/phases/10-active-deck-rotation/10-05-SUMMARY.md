---
phase: 10-active-deck-rotation
plan: "05"
subsystem: ui
tags: [react, i18n, react-i18next, localization, en, de]

# Dependency graph
requires:
  - phase: 10-02
    provides: isActive Zod schema field, Switch + Checkbox shadcn components installed
provides:
  - 5 new decks.* i18n keys in both en.json and de.json (activeLabel, toggleActive, activatedToast, deactivatedToast, failedToToggle)
  - 7 new study.* i18n keys in both en.json and de.json (globalTitle, globalSubtitle, chooseDecks, startSession, backToDashboard, noActiveDecks, noActiveDecksHint)
affects:
  - 10-03 (DecksPage toggle UI uses decks.activeLabel / decks.toggleActive / decks.activatedToast / decks.deactivatedToast / decks.failedToToggle)
  - 10-04 (StudySessionPage start screen uses all 7 study.* keys)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Both locale files updated in the same commit — Pitfall 5 prevention (missing de.json keys fall back to raw key string, not English value)"

key-files:
  created: []
  modified:
    - apps/frontend/src/locales/en.json
    - apps/frontend/src/locales/de.json

key-decisions:
  - "Both locale files updated atomically in one commit — de.json missing-key fallback is raw key string, not English value (Pitfall 5)"
  - "Existing reused keys (sessionSize, sizeAllDue, sizeCustom, nCardsDue) left unchanged — not duplicated"

patterns-established:
  - "i18n parity rule: new keys always land in both en.json and de.json in the same commit, verified by the node parse script"

requirements-completed: [DECK-01, DECK-03, DECK-04]

# Metrics
duration: 2min
completed: 2026-06-02
---

# Phase 10 Plan 05: i18n Keys for Active Deck Rotation Summary

**12 new locale keys added to both en.json and de.json covering the isActive toggle UI (5 keys under `decks`) and the /study start screen (7 keys under `study`).**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-06-02T15:50:36Z
- **Completed:** 2026-06-02T15:51:43Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Added 5 `decks.*` keys (activeLabel, toggleActive, activatedToast, deactivatedToast, failedToToggle) to both locale files with exact English and German copy
- Added 7 `study.*` keys (globalTitle, globalSubtitle, chooseDecks, startSession, backToDashboard, noActiveDecks, noActiveDecksHint) to both locale files
- Verified all 24 key slots (12 keys × 2 locales) are present via the plan's node parse script — exits 0 with "all 24 keys present"
- Existing reused keys (sessionSize, sizeAllDue, sizeCustom, nCardsDue) confirmed present and not duplicated

## Task Commits

Each task was committed atomically:

1. **Task 1: Add 12 new keys to en.json and de.json (decks + study namespaces)** - `e0bd636` (feat)

**Plan metadata:** see final docs commit below

## Files Created/Modified

- `apps/frontend/src/locales/en.json` — 12 new keys added (5 under `decks`, 7 under `study`)
- `apps/frontend/src/locales/de.json` — same 12 keys in German

## Decisions Made

- Both locale files committed atomically in one commit — this is the Pitfall 5 prevention rule: de.json missing keys fall back to the raw key string (e.g. "decks.activeLabel"), not the English value, so both files must always be in sync.
- Existing reused keys (sessionSize, sizeAllDue, sizeCustom, nCardsDue) were confirmed present and NOT duplicated.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Known Stubs

None — this plan adds only static locale strings. No data wiring or UI rendering involved.

## Threat Flags

No new security-relevant surface introduced. This plan modifies only static translation data (locale JSON files). Threat T-10-09 (Information Disclosure — static UI copy only, no secrets) accepted per plan threat model.

## Next Phase Readiness

- All 12 i18n keys required by Plans 03 and 04 are now present in both locale files.
- Plan 03 (DecksPage toggle + DeckDetailPage toggle) can proceed without i18n blockers.
- Plan 04 (StudySessionPage start screen) can proceed without i18n blockers.
- No blockers.

## Self-Check: PASSED

- `apps/frontend/src/locales/en.json` — present and modified
- `apps/frontend/src/locales/de.json` — present and modified
- Commit `e0bd636` — exists (verified via git log)
- Node parse script: exits 0, "all 24 keys present"

---
*Phase: 10-active-deck-rotation*
*Completed: 2026-06-02*
