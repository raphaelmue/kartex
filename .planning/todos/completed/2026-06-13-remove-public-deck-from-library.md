---
created: 2026-06-13T08:52:26.976Z
title: Remove public deck from personal library
area: ui
resolves_phase: 19
files:
  - apps/frontend/src/pages/DecksPage.tsx
  - apps/frontend/src/pages/ExplorePage.tsx
---

## Problem

Once a user adds a public deck to their library, there is no way to remove it. The deck stays in their library permanently with no "Remove from library" action available — even if they no longer want to study it.

## Solution

Add a "Remove from library" button/action on library decks (visible in the deck list on DecksPage and/or on the deck card in ExplorePage). Requires a DELETE endpoint on the backend for the library/shared-deck entry (`DELETE /api/decks/library/:deckId` or similar), and the frontend should show this option only for non-owned (shared/library) decks. After removal, the deck should disappear from the user's deck list.
