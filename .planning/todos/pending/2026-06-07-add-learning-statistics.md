---
created: 2026-06-07T00:00:00Z
title: Add learning statistics to dashboard and study sessions
area: ui
files:
  - apps/frontend/src/pages/DashboardPage.tsx
  - apps/backend/src/routes/stats.ts
---

## Problem

The dashboard currently shows only a streak counter and basic due-card count. There is no overview of how a user is actually progressing over time: which cards they find easy vs. hard, how their retention is trending, and how much they have reviewed in total. This makes it hard to identify weak spots and stay motivated.

## Solution

Add a statistics section to the dashboard (and possibly a dedicated `/stats` page) covering at minimum:

- **Overall study progress** — total cards reviewed (all time), cards reviewed this week/month, study sessions completed
- **Card difficulty breakdown** — counts (and %) for each rating bucket: Easy / Good / Hard / Again (map from SM-2 quality values)
- **Retention rate** — % of reviews rated Good or Easy across a rolling window (e.g. last 30 days)
- **Per-deck stats** — cards due, cards mastered (interval ≥ threshold), cards in learning vs. review phase
- **Ease factor distribution** — histogram or simple low/medium/high buckets to surface chronically-hard cards

Backend: a new `GET /api/stats/summary` endpoint that aggregates `CardProgress` rows for the current user (grouped by `rating` and `deckId`). All data is already present in the `CardProgress` table (`easeFactor`, `interval`, `repetitions`).

Frontend: stat chips / cards on the dashboard using the existing design tokens; consider a separate Stats page linked from the sidebar if content grows large.
