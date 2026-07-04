# Phase 30: Study Timers & Stats - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-04
**Phase:** 30-Study Timers & Stats
**Areas discussed:** Running session timer, Flip-time capture rules, StudySession record semantics, Stats display placement

---

## Running session timer

| Option | Description | Selected |
|--------|-------------|----------|
| Extend ExamTimer to count-up mode | Add a mode prop for count-up/no-expiry, reuse header slot | |
| New separate ElapsedTimer component | Keep ExamTimer exam-only, new component for count-up | |
| You decide | Let researcher/planner pick after reading both components | ✓ |

**User's choice:** You decide
**Notes:** Deferred implementation detail to downstream agents.

| Option | Description | Selected |
|--------|-------------|----------|
| Exam keeps countdown only | Countdown already IS the running timer for exam mode | ✓ |
| Show both countdown AND elapsed in exam | Two timers shown simultaneously in exam mode | |

**User's choice:** Exam keeps countdown only
**Notes:** None.

---

## Flip-time capture rules

| Option | Description | Selected |
|--------|-------------|----------|
| Clock starts when the card is shown | Starts on front-content render / card mount | ✓ |
| Clock starts on previous rating submit | Starts on prior card's rate action | |

**User's choice:** Clock starts when the card is shown

| Option | Description | Selected |
|--------|-------------|----------|
| Only first flip counts | thinkingTimeMs = time to first front→back flip | ✓ |
| Time to most recent flip counts | Recalculated on every flip, last value before rating stored | |

**User's choice:** Only first flip counts

| Option | Description | Selected |
|--------|-------------|----------|
| Cap at a fixed ceiling (e.g., 5 min) | Clamp outlier values | |
| No cap — store raw value | Store true elapsed time always | |
| Pause on hidden, no cap needed | Page Visibility API pauses stopwatch when tab hidden | ✓ |
| Pause on hidden, keep cap as backstop | Same + server-side cap safety net | |

**User's choice:** Pause on hidden, no cap needed
**Notes:** User asked "can't you just check if the user has the tab open?" in response to the cap question — this led to proposing the Page Visibility API (`document.hidden` / `visibilitychange`) as a cleaner alternative to a hard cap, which the user then selected. This replaced the originally-proposed cap entirely.

---

## StudySession record semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Single insert on completion only | One row written when session finishes | |
| Create on start, update on completion | Row created in-progress at start, updated at finish | ✓ |

**User's choice:** Create on start, update on completion

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, exam sessions count too | StudySession independent of SM-2 persistence | ✓ |
| No, exam mode excluded | Only SM-2-persisting modes create StudySession rows | |

**User's choice:** Yes, exam sessions count too

| Option | Description | Selected |
|--------|-------------|----------|
| Hide incomplete sessions | Recent sessions list filters to completedAt set | |
| Show them with partial data | Incomplete sessions shown with elapsed time/cards so far | ✓ |

**User's choice:** Show them with partial data

| Option | Description | Selected |
|--------|-------------|----------|
| No deckId — session-level only | No deck link on StudySession | |
| Nullable deckId, set only for single-deck sessions | deckId populated for single-deck, null for multi-deck | |
| Join table StudySessionDeck (many-to-many) | Proper relational join table, DeckShare-style | ✓ |

**User's choice:** Join table StudySessionDeck (many-to-many)
**Notes:** User's free-text answer was "I'd also like to see which decks were in this session (also multiple decks)" — this ruled out the simple no-deckId and nullable-deckId options, since neither supports showing multiple decks per session cleanly. Follow-up question offered array-column vs. join-table; user chose join table.

---

## Stats display placement

| Option | Description | Selected |
|--------|-------------|----------|
| Appended to existing Dashboard StatsSummaryPanel | New section in StatsSummaryPanel.tsx, no new route | ✓ |
| New dedicated /stats page | Separate page/route with a fuller sessions table | |

**User's choice:** Appended to existing Dashboard StatsSummaryPanel

| Option | Description | Selected |
|--------|-------------|----------|
| Last 10 sessions, global avg flip time | Fixed-length list, one overall average | |
| Last 10 sessions, per-deck avg flip time breakdown | Same list, average broken out per deck | ✓ |

**User's choice:** Last 10 sessions, per-deck avg flip time breakdown

---

## Claude's Discretion

- Whether the count-up timer is an `ExamTimer` mode extension or a new sibling component
- Exact field/table naming for `StudySessionDeck` join table and supporting indices
- Which field distinguishes in-progress vs. completed `StudySession` rows

## Deferred Ideas

None — discussion stayed within phase scope.
