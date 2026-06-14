---
status: complete
phase: 19-library-remove-action
source: [19-01-SUMMARY.md]
started: 2026-06-14T00:00:00Z
updated: 2026-06-14T00:05:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Library Deck Shows ⋮ Menu With "Remove from library"
expected: On the /decks page, find a library deck (one you added from Explore — not owned by you). Its card footer has a ⋮ button. Clicking it opens a dropdown with a single item: "Remove from library". There is no Edit or Delete option on this menu.
result: pass

### 2. Remove Confirmation Dialog
expected: Clicking "Remove from library" opens a dialog with title "Remove from library?" and body "Your study progress for this deck will be preserved. You can re-add it from Explore at any time." A Cancel button and a destructive "Remove Deck" button are visible.
result: pass

### 3. Confirming Removal — Deck Disappears + Toast
expected: Click "Remove Deck" in the dialog. The dialog closes, the library deck card disappears from the list immediately (optimistic removal), and a toast appears saying "Deck removed from your library".
result: pass

### 4. Owned Deck Unchanged
expected: Find one of your own decks (created by you). Its card shows Edit/Delete options as before. No "Remove from library" item appears anywhere in its menu.
result: pass

### 5. German Locale — i18n Parity
expected: Go to Settings and switch the language to German. Navigate back to /decks. The ⋮ menu on a library deck shows "Aus der Bibliothek entfernen". Opening the dialog shows the title "Aus der Bibliothek entfernen?". The confirmation button reads "Deck entfernen".
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
