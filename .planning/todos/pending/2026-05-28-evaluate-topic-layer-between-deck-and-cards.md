---
created: 2026-05-28T20:35:00Z
title: Evaluate topic/sub-deck layer between decks and cards
area: planning
files:
  - apps/backend/prisma/schema.prisma
  - packages/shared/src/schemas/import.ts
---

## Problem

The current hierarchy is flat: `Deck → Card[]`. For a subject like "Biology", a user
might want to organise cards into topics ("Cell Division", "Genetics", "Ecology") within
a single deck — both for navigation and for focused study sessions (study only this topic
today).

**Do tags already cover this?** Partially. `Card.tags String[]` can proxy topic grouping
(tag all cell-division cards with "cell-division"), but:
1. Tags are flat per-card strings — no first-class topic concept in the UI
2. The study session starts from a full deck; there's no "study by tag" filter
3. No topic browse/navigation in the deck detail page
4. No way to express ordering within a topic vs. across topics
5. Tags are user-free-form; a topic layer would be structured

So tags cover the *data* aspect loosely but don't cover the *UX* aspect at all.

## Solution

Two approaches to decide between before tackling:

**Option A — Topic/Section model (schema change)**
- New `Topic` model: `id, deckId, title, order`
- `Card.topicId String?` (nullable — existing cards belong to no topic)
- Deck detail shows cards grouped under topic headers
- Study session: option to study by topic
- `.kartex` format: `:: section Title ::` block between card blocks
- Tradeoff: schema migration, backwards-compat work, larger scope

**Option B — Tag-as-topic with filtered study (no schema change)**
- Add "study by tag" filter to the study session start screen
- Add tag grouping/headers to the deck detail card list
- Tags stay flat but the UI gives them structural meaning
- `.kartex` format: unchanged (tags already in card blocks)
- Tradeoff: no explicit ordering, tags remain free-form, power users may outgrow it

Option B is lower-lift and could ship as part of Phase 6 or a quick task. Option A is
the right long-term answer if the user base needs structured syllabi (a whole course in
one deck). Recommend prototyping Option B first to validate the use case before committing
to a schema change.
