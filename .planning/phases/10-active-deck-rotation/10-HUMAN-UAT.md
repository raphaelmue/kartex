---
status: complete
phase: 10-active-deck-rotation
source: [10-VERIFICATION.md]
started: 2026-06-02T15:12:00Z
updated: 2026-06-04T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. DB Migration Applied
expected: `Deck.isActive` and `User.studyMode` columns exist in the live PostgreSQL database. Run `docker compose up` or `npx prisma migrate deploy` with DATABASE_URL set to apply `20260602000000_add_isactive_studymode`.
result: pass

### 2. Toggle Persistence After Refresh (DECK-01)
expected: Toggle a deck inactive on `/decks`, refresh browser, confirm the switch is still off (isActive persisted to DB via PATCH).
result: pass

### 3. Study Queue Excludes Inactive Decks (DECK-02)
expected: Mark a deck inactive, navigate to `/study` → start screen → start session, confirm no cards from that deck appear in the session.
result: pass

### 4. Session-Only Uncheck Does Not Persist isActive (DECK-03)
expected: Uncheck a deck on the `/study` start screen, complete the session, navigate to `/decks`, confirm the deck's toggle is still ON (isActive unchanged — the uncheck was session-only).
result: pass

### 5. German UI Shows Translated Strings
expected: Switch UI language to German, navigate to `/decks` and `/study`. Verify no raw key strings like "decks.activeLabel", "study.globalTitle", etc. appear — all show proper German text.
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
