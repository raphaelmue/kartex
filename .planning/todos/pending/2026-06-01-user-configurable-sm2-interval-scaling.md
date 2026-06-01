---
created: 2026-06-01T22:30:00Z
title: User-configurable SM-2 interval scaling for exam/goal-based learning
area: ui
files:
  - packages/shared/src/lib/sm2.ts
  - apps/backend/src/routes/study.ts
  - apps/backend/prisma/schema.prisma
  - apps/frontend/src/pages/SettingsPage.tsx
---

## Problem

SM-2's default schedule (1 → 6 → 15 → 38+ days) targets long-term lifelong retention. For
short-horizon goals — an exam in 2 weeks, travel vocabulary for a trip, a presentation —
these intervals are too long. Cards get scheduled past the user's actual deadline and the
algorithm provides no value.

There is also no way for a user to say "I study intensively every day this week" vs.
"I study casually twice a week" — the day-based intervals don't adapt to study frequency.

## Solution

Add a per-user **interval multiplier** (stored in user settings/preferences) that scales all
computed SM-2 intervals before writing `nextReview`. A multiplier of 0.25 compresses the
schedule to ~25% of normal (6-day second interval becomes ~1.5 days), useful for exam cramming.
A multiplier of 2.0 relaxes it for casual long-term review.

Optionally, expose this as a named "study mode" in settings:
- **Exam / intensive** (0.2–0.3×) — review daily or every other day
- **Normal** (1.0×) — default SM-2 schedule
- **Relaxed** (1.5–2.0×) — less frequent, long-term maintenance

Implementation:
1. Add `intervalMultiplier Float @default(1.0)` to `User` model (Prisma migration)
2. Pass multiplier through to `calculateSM2()` or apply it as a post-step:
   `nextReview.setDate(today + newInterval * multiplier)`
3. Expose multiplier or named presets in `/settings` page
4. The multiplier only affects scheduling — EF and repetition counting stay unchanged,
   so switching back to normal mode after an exam doesn't corrupt card history

Note: discussed in context of SM-2 alternatives (FSRS, Leitner) — interval scaling is the
lowest-complexity option that covers the exam use case without algorithm replacement.
