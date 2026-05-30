---
created: 2026-05-30T00:00:00Z
title: Add "Add to Library" option for public decks on /explore
area: ui
files:
  - apps/frontend/src/pages/ExplorePage.tsx
  - apps/backend/src/routes/decks.ts
---

## Problem

Currently, the only action on a public deck from /explore is "Fork Deck" — which creates a full copy that the user can edit. But many users just want to study a public deck without creating an editable copy. They need an "Add to Library" option that lets them access and study the deck as a shared read-only deck, distinct from forking.

Surfaced during Phase 6 UAT (SHAR-06 test).

## Solution

Two possible approaches:
1. **Add to Library = auto-share grant**: Backend creates a READ DeckShare record on behalf of the public deck owner → deck appears on user's /decks as a shared deck (already supported by the sharing model).
2. **Add to Library = fork with PRIVATE + read-only flag**: Fork the deck but mark it as non-editable.

Option 1 is simpler and reuses existing infrastructure. The /explore page would show two buttons: "Add to Library" (study without editing) and "Fork" (copy to edit independently). This also fixes the issue of users not being able to study public decks without forking them.
