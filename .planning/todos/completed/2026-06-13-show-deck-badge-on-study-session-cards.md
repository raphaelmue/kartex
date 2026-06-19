---
created: 2026-06-13T10:07:24.144Z
title: Show deck badge on study session cards
area: ui
files:
  - apps/frontend/src/pages/StudySessionPage.tsx
  - apps/backend/src/routes/study.ts:64-90
resolves_phase: 22
---

## Problem

During a study session (global SR or deck-specific), there is no visible indicator showing which deck a card belongs to. This makes cross-deck randomization invisible to the user — they cannot tell if they're seeing cards from multiple decks or just one.

The user wants a badge on each study card showing the source deck name, similar to how the study mode badge (e.g. "Intensive") is shown in training mode.

**Good news:** The backend already returns `deckTitle` on every `DueCard` (from both `/api/study/due` and `/api/study/deck/:deckId`). The data is available in the frontend — it just isn't displayed.

## Solution

On the study card (CardFlip component or StudySessionPage card wrapper):
- Show a small badge/chip with `card.deckTitle`
- Visual reference: similar placement/style to the study mode badge (intensive/exam_prep indicator)
- Only show in global SR mode (multi-deck context) — or always show for clarity
- New i18n key not strictly needed (deck title is user content, interpolated as value — D-07 pattern)
