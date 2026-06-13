---
created: 2026-05-30T00:00:00Z
title: Add card limit option to study sessions
area: ui
resolves_phase: 8
files:
  - apps/frontend/src/pages/LearnPage.tsx
---

## Problem

When studying a deck, the user has to work through all due cards in one go. For large decks or quick sessions, this is too much. A user should be able to say "I only want to do 10 random cards today" and stop there, without marking the rest as skipped.

## Solution

Add a session-size picker on the study start screen (e.g. "All due", "10", "20", or a custom number). The card queue is always shuffled regardless of session size — even when studying "All due", cards appear in random order rather than insertion or due-date order. When a limit is set, randomly sample N cards from the shuffled due queue. The SM-2 outcomes still apply normally — only the queue is trimmed and reordered. Backend can stay unchanged; shuffling and sampling are applied client-side when building the session card list.
