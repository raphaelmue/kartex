---
created: 2026-06-11T15:00:00Z
title: Cannot activate / deactivate public decks added to library
area: ui
files:
  - apps/frontend/src/pages/ExplorePage.tsx
  - apps/frontend/src/pages/DecksPage.tsx
---

## Problem

Public decks that a user has added to their library cannot be activated or deactivated. The toggle/switch for `isActive` appears to be missing or non-functional for library (shared) decks, even though it works for owned decks.

## Solution

Find where the `isActive` toggle is rendered for decks and check whether library decks are excluded. If the toggle is gated on deck ownership, extend it to cover shared/library decks (the user still needs to control whether they study a borrowed deck). May require a separate API call or a PATCH on the user's library entry rather than the deck itself.
</content>
</invoke>