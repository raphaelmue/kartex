---
status: complete
phase: 22-study-session-ux
source: [22-01-SUMMARY.md, 22-02-SUMMARY.md]
started: 2026-06-15T00:00:00Z
updated: 2026-06-15T00:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Deck badge visible during study session
expected: Open a study session (go to a deck → start studying). In the progress row at the top of the session, you should see a small secondary badge showing the name of the deck the current card belongs to. The badge must be visible both when you're looking at the front of the card (question) AND after you flip it to see the answer. It should not disappear when the card is flipped.
result: pass

### 2. Cross-deck shuffle interleaves cards
expected: If you have cards from multiple decks included in a single study session (e.g., studying "all due cards" across decks, or a session that spans multiple decks), the cards should appear interleaved — not grouped by deck (i.e., not all deck-A cards first, then all deck-B cards). Skip this test if you only have one deck with cards due.
result: skipped
reason: only one deck with cards due

## Summary

total: 2
passed: 1
issues: 0
pending: 0
skipped: 1
blocked: 0

## Gaps

[none yet]
