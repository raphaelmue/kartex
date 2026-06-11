---
status: diagnosed
phase: 17-mobile-ui-polish
source: [17-01-SUMMARY.md, 17-02-SUMMARY.md]
started: 2026-06-11T00:00:00Z
updated: 2026-06-11T00:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Stats Table Mobile Overflow
expected: On a 375px-wide viewport, the per-deck stats table in the Dashboard scrolls horizontally within its container. No horizontal scrollbar appears on the page itself.
result: pass

### 2. Mobile Drawer No Horizontal Overflow
expected: On a 375px-wide viewport, open the mobile sidebar/drawer (hamburger menu). The page itself shows no horizontal scrollbar while the drawer is open or after it closes.
result: pass

### 3. Deck Card ⋮ Menu (Owned Decks)
expected: On the Decks page, owned deck cards show a ⋮ (vertical dots) button in the card footer. Clicking it opens a dropdown with Edit and Delete items. The old inline Edit/Delete buttons are gone.
result: pass

### 4. Delete Deck via AlertDialog
expected: Click ⋮ on an owned deck → select Delete. An AlertDialog appears with title "Delete deck?" and body "This cannot be undone." Cancel closes the dialog without deleting. Confirming deletes the deck.
result: pass

### 5. Shared Deck Footer (No ⋮ Menu)
expected: For a deck shared by another user, the card footer shows Study + Open buttons only — no ⋮ DropdownMenu trigger.
result: issue
reported: "this does not work for publically shared decks."
severity: major

## Summary

total: 5
passed: 4
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Publicly shared deck card footer shows Study + Open buttons only — no ⋮ DropdownMenu trigger"
  status: failed
  reason: "User reported: this does not work for publically shared decks."
  severity: major
  test: 5
  root_cause: "DecksPage footer branch guards on deck.sharedByUsername (set only for DeckShare-record entries), but PUBLIC decks from other users may arrive without sharedByUsername, causing them to fall into the owned-deck branch and show the DropdownMenu."
  artifacts:
    - path: "apps/frontend/src/pages/DecksPage.tsx"
      issue: "line 165 — `deck.sharedByUsername ? <shared footer> : <owned footer>` misses PUBLIC decks"
  missing:
    - "Guard on deck.ownerId !== user.id using useAuth() instead of deck.sharedByUsername"
  debug_session: ""
