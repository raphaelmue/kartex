---
created: 2026-06-03T00:00:00.000Z
title: Support deck update via .kartex import
area: api
resolves_phase: 16
files:
  - apps/backend/src/routes/import.ts
  - apps/frontend/src/pages/ImportPage.tsx
---

## Problem

The current import flow only creates new decks from a `.kartex` file. If an AI tool generates additional cards for an existing deck and exports a new `.kartex` file, there is no way to merge those cards into the existing deck — the user would end up with a duplicate deck instead of an updated one.

This is a natural use case: a user builds a deck, asks an AI to generate more cards on the same topic, and wants to add them back without manually recreating the deck.

## Solution

Add an "update existing deck" mode to the import flow:
- On the ImportPage, after parsing the `.kartex` file, offer a choice: "Create new deck" (current behavior) vs "Add to existing deck" (new).
- If "Add to existing deck": show a dropdown of the user's existing decks to target.
- Backend: extend `POST /api/import` (or add `POST /api/import/merge`) to accept a `targetDeckId` — insert new cards into that deck, skipping any exact duplicates (match on front+back content hash).
- Cards already in the deck should not be duplicated; new cards should be appended.
