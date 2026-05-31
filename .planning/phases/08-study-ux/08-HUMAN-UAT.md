---
status: partial
phase: 08-study-ux
source: [08-VERIFICATION.md]
started: 2026-05-31T20:55:00Z
updated: 2026-05-31T20:55:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Config section visible above mode cards
expected: On /decks/:id/learn, the "Filter by tag" chip row and "Session size" segmented button row appear above the 3 mode cards when the deck has at least one tagged card. Section is absent when deck has no tagged cards.
result: [pending]

### 2. Tag chip OR filter limits session
expected: Selecting a tag chip fills it (primary color); starting a session with one chip selected limits cards to those tagged with that tag; untagged cards are excluded. Selecting a second chip adds its cards too (OR logic).
result: [pending]

### 3. Custom size caps the session
expected: Clicking "Custom" button in the session size row reveals an inline number input; entering 5 and starting an SR session shows at most 5 cards regardless of how many are due.
result: [pending]

### 4. Shuffle differs between sessions
expected: Starting two SR sessions back-to-back on the same deck presents cards in a different order each time (non-deterministic shuffle).
result: [pending]

### 5. Global /study route shows no config section
expected: Navigating to /study (global SR route) skips mode selection and enters SR directly — the config section never appears.
result: [pending]

### 6. DeckDetailPage tag section visual layout
expected: On /decks/:id, cards are grouped under h3 section headers showing tag name and card count. Sections are sorted alphabetically. An "Untagged" section appears last if any cards have no tags. Edit/Delete actions work the same as before within each section.
result: [pending]

### 7. First-tag-wins deduplication
expected: A card with tags ["chem", "bio"] appears only under the "chem" section — not duplicated in "bio".
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
