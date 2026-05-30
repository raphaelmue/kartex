---
status: partial
phase: 06-sharing-explore-deploy
source: [06-VERIFICATION.md]
started: 2026-05-29T15:30:00Z
updated: 2026-05-30T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. SHAR-01 end-to-end share flow
expected: Log in as two users. Owner shares a deck with the second user. Second user sees the deck on /decks page with "Shared by [owner-username]" label. Owner can revoke access; deck disappears from second user's /decks.
result: pass

### 2. SHAR-03 public deck on /explore
expected: Set a deck to PUBLIC via the deck detail page. Navigate to /explore (as any logged-in user, including the owner). Deck appears in the grid with owner attribution "by [username]" and a Fork Deck button.
result: pass

### 3. SHAR-05 fork independence
expected: Fork a PUBLIC deck. Edit a card in the forked copy. Navigate back to the original deck — the original card is unchanged. The fork appears on /decks as a private deck named "Copy of [original]".
result: pass

### 4. SHAR-06 SM-2 progress isolation
expected: Study the original deck (rate some cards). Fork the deck. Study the fork. Confirm progress on the fork does not affect due dates on the original, and vice versa. (Structurally guaranteed by new Card IDs from fork — behavioral confirmation closes the loop.)
result: pass

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
