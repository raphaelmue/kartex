---
created: 2026-06-13T10:07:24.144Z
title: Verify and fix study session cross-deck shuffle
area: ui
files:
  - apps/frontend/src/pages/StudySessionPage.tsx:487-490
  - apps/backend/src/routes/study.ts:37-94
resolves_phase: 22
---

## Problem

User reports the study session "only randomizes within one deck" — not randomly mixing cards across all active decks.

**Code review finding:** The global SR path (`/study`, no deckId) fetches from `/api/study/due` which returns cards from all active decks, then passes them through a Fisher-Yates `shuffle()` on line 488. This should produce cross-deck randomization.

**Likely root cause (not a code bug):** No deck indicator is shown on study cards, so users cannot see which deck each card is from. When all visible cards happen to be from the same deck (e.g. only one deck has due cards), the user assumes shuffling is broken.

**Verification steps needed:**
1. Confirm `/api/study/due` returns cards from multiple active decks in a multi-deck setup
2. Confirm frontend `shuffle()` actually runs on the combined array (not per-deck)
3. If shuffling IS per-deck somewhere (e.g. a future regression), fix it

If the code is correct but the UX is misleading → resolved by STUDY-04 deck badge (companion todo).
If a real shuffle bug is found → fix the ordering.

## Solution

1. Debug with 2+ active decks and cards due in each; log the card array before and after shuffle
2. If code is correct: close as non-bug, resolved by deck badge feature
3. If bug found: fix shuffle to operate on the complete cross-deck array after all filtering
