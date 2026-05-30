---
created: 2026-05-30T00:00:00Z
title: Add card limit option to study sessions
area: ui
files:
  - apps/frontend/src/pages/LearnPage.tsx
---

## Problem

When studying a deck, the user has to work through all due cards in one go. For large decks or quick sessions, this is too much. A user should be able to say "I only want to do 10 random cards today" and stop there, without marking the rest as skipped.

## Solution

Add a session-size picker on the study start screen (e.g. "All due", "10 random", "20 random", or a custom number). Randomly sample N cards from the due queue before the session begins. The SM-2 outcomes still apply normally — only the queue is trimmed. Backend can stay unchanged; the limit is applied client-side when building the session card list.
