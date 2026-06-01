---
created: 2026-06-01T22:15:00Z
title: Active deck rotation and /study deck + session selection
area: ui
files:
  - apps/frontend/src/pages/StudySessionPage.tsx
  - apps/backend/prisma/schema.prisma
  - packages/shared/src/schemas/
---

## Problem

The global `/study` route pulls due cards from all decks at once, with no way to:
1. Mark which decks are part of the user's current routine (vs. archived/inactive decks)
2. Select specific decks for a session on the fly
3. Choose session size (already available in `/decks/:id/learn` but missing from `/study`)

Users naturally have "active" decks they're studying right now and others they've paused. Mixing all decks makes sessions unfocused. For example, a user studying French vocabulary + programming concepts might want to study only the French deck today.

## Solution

Three related improvements:

**1. Deck activation flag ("in routine")**
Add an `isActive` boolean to the `Deck` model (default `true`). Users can toggle decks in/out of their active routine from the deck detail or deck list page. The `/study` route only pulls due cards from active decks by default.

**2. Deck selection chips in /study**
On the `/study` selection/config screen (before entering SR), show deck chips (similar to the tag chips in `/decks/:id/learn`). All active decks are pre-selected; user can deselect any to narrow the session. Cards are sourced only from selected decks.

**3. Session size picker in /study**
Reuse the existing session size segmented button (All / 10 / 20 / Custom) from the `/decks/:id/learn` config section on the `/study` screen too. Caps the total across all selected decks.

Implementation notes:
- Deck activation flag: Prisma migration adds `isActive Boolean @default(true)` to Deck
- Deck chips: fetch user's active decks on the /study page; render as toggleable chips
- Session size: extract the size picker into a shared component reused in both places
- Backend: GET /api/study/due already exists — extend to accept optional deckIds filter param
