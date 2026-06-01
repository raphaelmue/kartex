---
status: resolved
phase: 08-study-ux
source: [08-VERIFICATION.md]
started: 2026-05-31T20:55:00Z
updated: 2026-06-01T22:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Config section visible above mode cards
expected: On /decks/:id/learn, the "Filter by tag" chip row and "Session size" segmented button row appear above the 3 mode cards when the deck has at least one tagged card. Section is absent when deck has no tagged cards.
result: pass

### 2. Tag chip OR filter limits session
expected: Selecting a tag chip fills it (primary color); starting a session with one chip selected limits cards to those tagged with that tag; untagged cards are excluded. Selecting a second chip adds its cards too (OR logic).
result: pass

### 3. Custom size caps the session
expected: Clicking "Custom" button in the session size row reveals an inline number input; entering 5 and starting an SR session shows at most 5 cards regardless of how many are due.
result: pass

### 4. Shuffle differs between sessions
expected: Starting two SR sessions back-to-back on the same deck presents cards in a different order each time (non-deterministic shuffle).
result: pass

### 5. Global /study route shows no config section
expected: Navigating to /study (global SR route) skips mode selection and enters SR directly — the config section never appears.
result: pass

### 6. DeckDetailPage tag section visual layout
expected: On /decks/:id, cards are grouped under h3 section headers showing tag name and card count. Sections are sorted alphabetically. An "Untagged" section appears last if any cards have no tags. Edit/Delete actions work the same as before within each section.
result: issue
reported: "yes however, when having one card with tag1, tag2 and another with tag2, tag1 they appear in different sections. maybe also sort tags to improve that behavior. I was also thinking to remove the sections and just sort them in a table and add a filter bar on top. I think that is better."
severity: minor

### 7. First-tag-wins deduplication
expected: A card with tags ["chem", "bio"] appears only under the "chem" section — not duplicated in "bio".
result: issue
reported: "Cards with the same tag set in different stored order (e.g. [tag1,tag2] vs [tag2,tag1]) land in different sections — same root cause as Test 6."
severity: minor

## Summary

total: 7
passed: 5
issues: 2
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Cards with the same tags always land in the same section regardless of stored tag order"
  status: resolved
  reason: "User reported: cards with [tag1,tag2] and [tag2,tag1] appear in different sections. Fix: sort each card's tags before applying first-tag-wins."
  severity: minor
  test: 6
  root_cause: "Section grouping replaced by flat table + filter bar — deduplication issue is moot with per-tag filter approach"
  artifacts:
    - path: "apps/frontend/src/pages/DeckDetailPage.tsx"
      issue: "section grouping removed; replaced with flat table + filter bar"
  missing: []
  debug_session: ""

- truth: "Deck card list uses a flat table with filter bar rather than section grouping"
  status: resolved
  reason: "User expressed design preference: remove h3 section grouping, replace with flat sortable table and filter bar on top — considers it better UX."
  severity: minor
  test: 6
  root_cause: "DeckDetailPage card list redesigned in 08-04 gap closure plan"
  artifacts:
    - path: "apps/frontend/src/pages/DeckDetailPage.tsx"
      issue: "implemented flat table + tag filter bar; chips per unique tag, toggle-filter, no h3 sections"
  missing: []
  debug_session: ""
