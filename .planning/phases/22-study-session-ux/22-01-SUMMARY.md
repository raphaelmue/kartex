---
phase: 22-study-session-ux
plan: "01"
subsystem: frontend/study-session
tags: [study, ux, badge, i18n, tdd]
dependency_graph:
  requires: []
  provides: [STUDY-04-deck-badge]
  affects: [StudySessionPage, SessionRunner, en.json, de.json]
tech_stack:
  added: []
  patterns: [badge-in-progress-row, aria-label-interpolation, tdd-green]
key_files:
  created: []
  modified:
    - apps/frontend/src/pages/StudySessionPage.tsx
    - apps/frontend/src/locales/en.json
    - apps/frontend/src/locales/de.json
    - apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx
decisions:
  - "STUDY-04: Deck badge is unconditional in progress row — not gated on studyMode; both front and back faces see it because the badge is in SessionRunner's layout, not inside CardFlip"
  - "Locale keys added atomically to en.json and de.json in the same commit (Pitfall 5 prevention)"
  - "deckTitle rendered as JSX text child — never passed to t() as a key (D-07 compliance)"
metrics:
  duration: "2m 4s"
  completed: "2026-06-14"
  tasks_completed: 2
  files_modified: 4
---

# Phase 22 Plan 01: Deck Badge in Study Session Summary

**One-liner:** Unconditional deck-name Badge added to SessionRunner progress row using `currentCard.deckTitle`, matching the mode indicator badge design, with `study.deckBadgeAriaLabel` i18n key in both locales.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add deck badge to SessionRunner progress row | 1b77212 | StudySessionPage.tsx, en.json, de.json |
| 2 | Add STUDY-04 test assertion for deck badge visibility | 420a238 | StudySessionPage.test.tsx |

## Implementation Details

### Task 1: Deck badge in SessionRunner progress row

Added a `<Badge variant="secondary" className="text-xs shrink-0">` element to the progress row in `SessionRunner`, placed before the existing conditional mode indicator badge. The badge renders `currentCard.deckTitle` as JSX text content (D-07 compliance — user content, not an i18n key). The `aria-label` uses `t('study.deckBadgeAriaLabel', { deckTitle: currentCard.deckTitle })` for screen reader context.

The badge is unconditional — it renders whenever `currentCard` is non-null, which it always is in the active `SessionRunner` body (guarded by `if (!currentCard) return null` earlier in the component).

Both locale files were updated atomically in the same commit:
- `en.json`: `"deckBadgeAriaLabel": "Deck: {{deckTitle}}"`
- `de.json`: `"deckBadgeAriaLabel": "Deck: {{deckTitle}}"` (deckTitle is a proper noun — not translated)

### Task 2: STUDY-04 test assertions

Added `describe("StudySessionPage deck badge (STUDY-04)")` block after the existing SM2-04 block, following the exact SM2-04 pattern:
- **STUDY-04a**: asserts `screen.getByText('Test Deck')` is truthy when session is running (SR mode, 1 card)
- **STUDY-04b**: asserts `'Test Deck'` remains visible after flipping the card via `fireEvent.click(screen.getByRole('button', { name: /flashcard/i }))` — confirming the badge lives in the progress row (outside CardFlip), not inside the card face

All 20 tests pass (18 pre-existing + 2 new).

## Verification Results

```
grep -n "currentCard\.deckTitle" apps/frontend/src/pages/StudySessionPage.tsx
→ line 155: Badge aria-label and text content both use currentCard.deckTitle

grep -n "deckBadgeAriaLabel" apps/frontend/src/locales/en.json → 1 result (line 228)
grep -n "deckBadgeAriaLabel" apps/frontend/src/locales/de.json → 1 result (line 228)

npx vitest run src/pages/__tests__/StudySessionPage.test.tsx → 20 passed
```

Badge is NOT wrapped in `{studyMode !== 'normal' && ...}` — confirmed unconditional.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — `currentCard.deckTitle` is wired from actual DueCard data populated by the backend. No placeholders.

## Threat Flags

None — `currentCard.deckTitle` is rendered as a React text child; React automatically escapes all string values (T-22-01 accepted disposition per plan threat model).

## Self-Check: PASSED

- [x] `apps/frontend/src/pages/StudySessionPage.tsx` modified with deck badge at line 155
- [x] `apps/frontend/src/locales/en.json` contains `deckBadgeAriaLabel` at line 228
- [x] `apps/frontend/src/locales/de.json` contains `deckBadgeAriaLabel` at line 228
- [x] `apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx` has STUDY-04 describe block
- [x] Commit `1b77212` exists (feat: deck badge implementation)
- [x] Commit `420a238` exists (test: STUDY-04 assertions)
- [x] 20/20 tests pass
