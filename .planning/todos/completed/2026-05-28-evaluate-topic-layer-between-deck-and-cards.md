---
created: 2026-05-28T20:35:00Z
title: Add tag-based topic filter to study session and deck view
area: ui
decision: Option B chosen — tag-as-topic with filtered study, no schema change
resolves_phase: 8
files:
  - apps/frontend/src/pages/DecksPage.tsx
  - apps/frontend/src/hooks/useStudySession.ts
---

## Problem

The current hierarchy is flat: `Deck → Card[]`. Users want to study a focused subset
of a deck by topic (e.g. only "Cell Division" cards from a Biology deck). Tags already
carry topic data (`Card.tags String[]`) but the UI doesn't expose them as filters.

**Decision:** Option B — tag-as-topic, no schema change. (Option A with a full Topic
model deferred; revisit if users outgrow tag-based grouping.)

## Solution

No backend or schema changes needed. Two UI additions:

**1. Study session start — tag filter**
- On the "Start studying" / deck entry screen, show the deck's distinct tag set
- Let user pick one or more tags to filter the session (or study all)
- Pass selected tags to the study hook; `useStudySession` filters due cards to those
  with at least one matching tag before starting the SM-2 queue

**2. Deck detail page — tag grouping**
- In the card list on `/decks/:id`, group cards under tag header rows
- Cards with multiple tags appear under their first tag (or primary tag)
- Cards with no tags appear under an "Untagged" group at the bottom
- This gives the deck a topic-browse feel without any new data model
