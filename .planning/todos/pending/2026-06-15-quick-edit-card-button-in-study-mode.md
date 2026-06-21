---
created: 2026-06-15T07:24:31.750Z
title: Add quick-edit / jump-to-card button in study mode
area: ui
files:
  - apps/frontend/src/pages/StudySessionPage.tsx
resolves_phase: 28
---

## Problem

During a study session, deck owners and shared users with EDIT-level access have no way to quickly edit the current card or jump to its deck detail view. If a user spots a typo or error on a card, they must abandon the session, navigate back to the deck, find the card, and edit it — breaking the study flow entirely.

## Solution

Add a 3-dot overflow menu (DropdownMenu) to the study session card area, visible only to users who have edit permissions on the current card's deck (owner OR shared with EDIT auth). Menu options could include:

- **Edit this card** — opens the card edit dialog/page (or navigates to `/decks/:id` with the card pre-selected)
- **Jump to deck** — navigates to `/decks/:id` to inspect the full deck

The trigger should be subtle (small icon button, e.g. `MoreHorizontal` from lucide-react) placed in the progress row or card header so it does not distract from the study flow. The permission check can reuse `currentCard.deckId` + the user's `sharedDecks` context already available in `StudySessionPage`.

Consider: only show during active sessions (not on the start screen), and only when `studyMode` reveals deck ownership info.
