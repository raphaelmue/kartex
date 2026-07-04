# Phase 30: Study Timers & Stats - Context

**Gathered:** 2026-07-04
**Status:** Ready for planning

<domain>
## Phase Boundary

The app measures how long a card takes to be answered ("thinking time", front-display to first flip) and how long a full study session lasts, persists both, and surfaces them in statistics: a running elapsed timer during study (all modes) and, on the Dashboard, average flip time (per deck) plus a list of recent sessions with duration and card count.

**Note:** TIMER-01..04 are referenced in ROADMAP.md (Phase 30 section) but are not yet enumerated in REQUIREMENTS.md's Milestone Requirements / Traceability tables (unlike EMAIL/RESET/ADMIN/ABC/DECKU/SEDIT). Planner/executor should proceed from ROADMAP.md's 4 success criteria as the source of truth; REQUIREMENTS.md traceability should be backfilled at phase transition.

</domain>

<decisions>
## Implementation Decisions

### Running session timer
- **D-01:** Exam mode keeps its existing countdown only (`ExamTimer.tsx`) — that countdown already satisfies "a running timer" for exam mode. No second timer is shown alongside it.
- **D-02:** Normal/SR/deck study modes get a new count-up elapsed timer in the same study-header slot exam currently uses. Whether this is implemented as a mode extension to `ExamTimer` or a new sibling component is Claude's discretion (see below) — both were offered, user deferred to implementation judgment.

### Flip-time capture rules
- **D-03:** The clock for `thinkingTimeMs` starts the moment the card's front content is displayed (card becomes current / mounts), not on the previous card's rating submit.
- **D-04:** Only the FIRST front→back flip counts. If the user flips back and forth to re-check the answer before rating, later flips do not change the stored `thinkingTimeMs`.
- **D-05:** No hard time cap. Instead, use the Page Visibility API (`document.visibilitychange` / `document.hidden`) to pause the per-card stopwatch while the tab is hidden/backgrounded, and resume it when visible again. This means idle/away time is never counted at all — no arbitrary ceiling is needed as a result.

### StudySession record semantics
- **D-06:** A `StudySession` row is created when the session **starts** (in-progress state) and **updated** when it completes — not a single insert only on finish. This deliberately allows abandoned sessions to persist a partial record (see D-08).
- **D-07:** Exam mode sessions DO produce a `StudySession` row and ARE included in "recent sessions," even though exam mode does not persist SM-2/`CardProgress` — `StudySession` tracking is independent of SM-2 progress persistence.
- **D-08:** Abandoned/incomplete sessions (tab closed before completion) show up in the recent sessions list with partial data — elapsed time so far and cards reviewed before abandonment, not hidden.
- **D-09:** A session can span multiple decks (Global SR). Deck membership is modeled via a new many-to-many join table (`StudySessionDeck`-style, following the existing `DeckShare` join-table pattern), not a single nullable `deckId` column and not a `String[]` array. This lets the recent-sessions list show which deck(s) were studied, including multi-deck sessions.

### Stats display placement
- **D-10:** Average flip time and the recent sessions list are appended to the existing `StatsSummaryPanel.tsx` on the Dashboard (`GET /api/stats/summary`) — no new page or route.
- **D-11:** The recent sessions list shows the last 10 sessions (not paginated/full history).
- **D-12:** Average flip time is broken out **per deck** (like the existing `perDeck` stats block in `stats.ts`), not a single global number.

### Claude's Discretion
- Whether the count-up timer for normal/SR modes is implemented as an `ExamTimer` mode extension or a new sibling component — user explicitly deferred this to the researcher/planner after they've read both options in code.
- Exact field/table naming for the `StudySessionDeck` join table and any indices needed for the per-deck average flip-time query.
- Whether `StudySession.completedAt` (or similar) is the field used to distinguish in-progress vs. completed rows in the recent-sessions query — mechanical detail, not a user-facing decision.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & Requirements
- `.planning/ROADMAP.md` (Phase 30 section, lines 287-300) — goal, 4 success criteria, TIMER-01..04
- `.planning/REQUIREMENTS.md` — does NOT currently list TIMER-01..04; traceability gap noted in `<domain>` above

### Schema & Data Model
- `apps/backend/prisma/schema.prisma` — `ReviewLog` model (line 140, needs `thinkingTimeMs` field added), `CardProgress`/`Card`/`Deck`/`DeckShare` models for join-table pattern reference

### Existing Timer/Session UI (reuse/extend)
- `apps/frontend/src/components/ExamTimer.tsx` — existing countdown timer component (mm:ss format, color-shift thresholds, `role="timer"`, `aria-live="off"`); pattern to extend or mirror for the new count-up timer
- `apps/frontend/src/pages/StudySessionPage.tsx` (lines 45-54) — `SessionRunner` sub-component already tracks local `startTime`/`endTime` via `Date.now()` for exam-mode duration display; this is the natural hook point for session-duration capture across all modes
- `apps/frontend/src/components/SessionProgress.tsx` — existing header progress display, same header area the new timer will live in

### Existing Stats (extend)
- `apps/backend/src/routes/stats.ts` — `GET /api/stats/summary`, all current stats (retention, difficulty breakdown, per-deck) are **global** except `perDeck`, which is the pattern to follow for per-deck avg flip time
- `apps/frontend/src/components/StatsSummaryPanel.tsx` — Dashboard stats display component, where the new sections get appended
- `apps/frontend/src/pages/DashboardPage.tsx` — hosts `StatsSummaryPanel`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ExamTimer.tsx`: mm:ss formatting, color-shift-at-thresholds pattern, and a11y attributes (`role="timer"`, `aria-live="off"`) are directly reusable for the new count-up timer.
- `SessionRunner`'s existing `startTime`/`endTime` local state (`StudySessionPage.tsx` ~line 46) is prior art for session-duration tracking — currently client-only/ephemeral, needs to be persisted via a new endpoint.
- `stats.ts`'s `perDeck` block (lines 88-118) is the direct pattern to copy for per-deck average flip time aggregation.
- `DeckShare` model in schema.prisma is the direct pattern to copy for the new `StudySessionDeck` many-to-many join table.

### Established Patterns
- Server is always the source of truth for computed values (SM-2 fields, T-4-03) — the visibility-pause stopwatch logic can run client-side, but the final `thinkingTimeMs` is written via the existing `POST /api/study/rate` transaction pattern (upsert `CardProgress` + create `ReviewLog` in one `$transaction`).
- Empty-state contract: `retentionRate`/`difficultyBreakdown` return `null` (not 0/empty array) when there's no data yet (T-15-02) — new avg-flip-time and recent-sessions fields should follow the same null-on-empty convention.
- Hand-written SQL migrations are the established pattern in this repo (no `prisma migrate dev` without `DATABASE_URL` in dev shell) — the new `StudySession`/`StudySessionDeck` tables and `ReviewLog.thinkingTimeMs` column need a hand-written migration applied via the Docker Compose entrypoint.

### Integration Points
- `POST /api/study/rate` (`apps/backend/src/routes/study.ts` line 155) — needs to accept and store `thinkingTimeMs` alongside the existing rating.
- A new endpoint is needed to create/update `StudySession` rows (start-of-session create, completion update) — likely `apps/backend/src/routes/study.ts` or a new session-scoped route.
- `GET /api/stats/summary` (`stats.ts`) needs new fields: per-deck avg flip time, last-10 recent sessions (with linked decks via the join table).

</code_context>

<specifics>
## Specific Ideas

- User specifically wants to see which deck(s) were part of each session in the recent-sessions list, including sessions that span multiple decks (Global SR) — this drove the join-table decision (D-09) over a simpler single/nullable deckId.
- User's Page Visibility API suggestion (in response to the idle-cap question) replaced the originally-proposed hard time cap entirely (D-05) — this is a better fit than clamping after the fact.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 30-Study Timers & Stats*
*Context gathered: 2026-07-04*
