---
phase: 30-study-timers-stats
plan: 03
subsystem: api
tags: [hono, prisma, zod, study-sessions, stats]

requires:
  - phase: 30-study-timers-stats
    provides: "Plan 01 — ReviewLog.thinkingTimeMs column, StudySession/StudySessionDeck models, shared Zod contract (RateCardSchema.thinkingTimeMs, StudySessionStartSchema, StudySessionCompleteSchema, PerDeckProgressSchema.avgThinkingTimeMs, RecentSessionSchema, StatsSummarySchema.recentSessions)"

provides:
  - "POST /api/study/rate persists thinkingTimeMs on the ReviewLog row"
  - "POST /api/study/session/start — authorized StudySession + StudySessionDeck creation"
  - "POST /api/study/session/complete — server-computed durationSeconds, ownership-guarded"
  - "GET /api/stats/summary extended with perDeck.avgThinkingTimeMs and recentSessions (last 10)"

affects: [30-04, 30-05]

tech-stack:
  added: []
  patterns:
    - "Session-deck authorization reuses the deck ownership/active-DeckShare guard pattern from POST /rate — batched via prisma.deck.findMany + prisma.deckShare.findMany rather than per-deckId round trips"
    - "Server-authoritative durationSeconds computed from session.startedAt at complete-time — request schema has no duration field, making client tampering structurally impossible"

key-files:
  created:
    - apps/backend/src/routes/__tests__/study-session-routes.test.ts
    - apps/backend/src/routes/__tests__/stats-timers.test.ts
  modified:
    - apps/backend/src/routes/study.ts
    - apps/backend/src/routes/stats.ts

key-decisions:
  - "session/start batches deck authorization into two queries (findMany decks, findMany shares for unowned decks) instead of looping /rate's single-deck guard per deckId — avoids N+1 queries for multi-deck Global SR sessions"

patterns-established:
  - "avgThinkingTimeMs merged into perDeck via reviewLog.groupBy + .find() merge, mirroring the existing difficultyBreakdown groupBy idiom in stats.ts"

requirements-completed: [TIMER-02, TIMER-03, TIMER-04]

coverage:
  - id: D1
    description: "POST /api/study/rate stores the optional thinkingTimeMs on the ReviewLog row inside the existing transaction"
    requirement: "TIMER-02"
    verification:
      - kind: unit
        ref: "apps/backend/src/routes/__tests__/study-session-routes.test.ts (Shared schema contract tests, pass); yarn workspace @kartex/backend typecheck"
        status: pass
    human_judgment: false
  - id: D2
    description: "POST /api/study/session/start creates a StudySession + StudySessionDeck row per deckId, authorizing every deckId against ownership or active DeckShare, rejecting with 403 if any fails"
    requirement: "TIMER-03"
    verification:
      - kind: unit
        ref: "apps/backend/src/routes/__tests__/study-session-routes.test.ts (StudySessionStartSchema assertion, pass)"
        status: pass
    human_judgment: true
    rationale: "Route logic (deck authorization branching, StudySessionDeck fan-out create) is documented via it.todo behavioral-contract tests, not executed against a live/mocked Prisma client in this plan — full route-level mock coverage is a future test-harness task, matching the existing study-rate-reviewlog.test.ts convention. Manual/phase-level verification with the applied migration is listed in the plan's <verification> block."
  - id: D3
    description: "POST /api/study/session/complete sets completedAt + cardsReviewed and computes durationSeconds server-side from startedAt->now, guarded by { id, userId } ownership"
    requirement: "TIMER-03"
    verification:
      - kind: unit
        ref: "apps/backend/src/routes/__tests__/study-session-routes.test.ts (StudySessionCompleteSchema assertion — no durationSeconds field required, pass)"
        status: pass
    human_judgment: true
    rationale: "Ownership-guard branching and server-computed duration math are documented via it.todo behavioral-contract tests, not executed against a live/mocked Prisma client — same future test-harness gap as D2."
  - id: D4
    description: "GET /api/stats/summary returns per-deck avgThinkingTimeMs (null when no captured values) and the last 10 recent sessions with linked deck titles + completed flag"
    requirement: "TIMER-04"
    verification:
      - kind: unit
        ref: "apps/backend/src/routes/__tests__/stats-timers.test.ts (RecentSessionSchema assertion, pass); yarn workspace @kartex/backend typecheck"
        status: pass
    human_judgment: true
    rationale: "groupBy aggregation and null-on-empty merge logic are documented via it.todo behavioral-contract tests, not executed against a live/mocked Prisma client — same future test-harness gap as D2/D3."

duration: 12min
completed: 2026-07-04
status: complete
---

# Phase 30 Plan 03: Study Timer Backend Routes Summary

**Backend routes: thinkingTimeMs persisted on rating, StudySession start/complete lifecycle with authorization and server-computed duration, and stats.ts extended with per-deck avg flip time + last-10 recent sessions**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-04T09:20:35Z
- **Completed:** 2026-07-04T09:26:30Z
- **Tasks:** 2 completed
- **Files modified:** 4

## Accomplishments
- `POST /api/study/rate` now passes `thinkingTimeMs` through to `tx.reviewLog.create` (undefined stores NULL); no other behavior in the existing transaction changed
- `POST /api/study/session/start` validates `StudySessionStartSchema`, batch-authorizes every requested `deckId` (owned OR actively shared — 403 on any failure), then creates a `StudySession` with one `StudySessionDeck` row per deckId; returns `{ id }` with 201
- `POST /api/study/session/complete` validates `StudySessionCompleteSchema`, loads the session and enforces `{ id, userId }` ownership (404 missing, 403 mismatched owner), computes `durationSeconds` server-side from `session.startedAt` (never from the request body), and updates `completedAt`/`durationSeconds`/`cardsReviewed`
- `GET /api/stats/summary` gains `perDeck[].avgThinkingTimeMs` (via `reviewLog.groupBy` on `deckId`, merged with the existing `.find()` idiom, null-on-empty) and `recentSessions` (last 10 `StudySession` rows for the user, ordered `startedAt desc`, each with `deckTitles` and a `completed` flag derived from `completedAt !== null`)
- Both route files gained behavioral-contract test files following the repo's `it.todo` convention (`study-rate-reviewlog.test.ts` / `stats-summary.test.ts`), each with at least one real, passing Zod-schema assertion

## Task Commits

Each task was committed atomically:

1. **Task 1: Persist thinkingTimeMs + add session start/complete routes** - `e1fe5c8` (feat)
2. **Task 2: Extend GET /api/stats/summary with avg flip time + recent sessions** - `e403077` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `apps/backend/src/routes/study.ts` - `thinkingTimeMs` passthrough in `POST /rate`; new `POST /session/start` (deck authorization + StudySessionDeck fan-out create) and `POST /session/complete` (ownership guard + server-computed durationSeconds)
- `apps/backend/src/routes/stats.ts` - `avgThinkingTimeMs` per-deck aggregation via `reviewLog.groupBy`; `recentSessions` query (last 10, userId-scoped) with deck titles + completed flag
- `apps/backend/src/routes/__tests__/study-session-routes.test.ts` - New behavioral-contract test file (TIMER-02/03) with real `StudySessionStartSchema`/`StudySessionCompleteSchema` assertions
- `apps/backend/src/routes/__tests__/stats-timers.test.ts` - New behavioral-contract test file (TIMER-04) with a real `RecentSessionSchema` assertion

## Decisions Made
- `session/start` authorization is batched into two queries (`prisma.deck.findMany` for all requested deckIds, then `prisma.deckShare.findMany` only for the subset not owned by the user) rather than looping the single-deck guard pattern from `/rate` per deckId — avoids N+1 queries when a Global SR session spans many decks, while preserving the exact same ownership/active-share semantics

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. The Prisma migration and schema were already applied to the live database in Plan 01.

## Next Phase Readiness
- Backend routes are fully implemented and typecheck/test clean (`yarn workspace @kartex/backend typecheck` exit 0; full backend test suite passes: 14 files / 68 tests passed, 6 files todo-only-skipped by design)
- Plans 04/05 (frontend `SessionTimer` wiring, `StudySessionPage` session-start/complete calls, `StatsSummaryPanel` display) can now call these three endpoints directly — no blockers
- Full mock-based route-level test coverage (verifying the authorization branches and Prisma call shapes against a live/mocked client, not just documenting them as `it.todo`) remains a future test-harness task, consistent with the existing `study-rate-reviewlog.test.ts` / `stats-summary.test.ts` convention in this repo

---
*Phase: 30-study-timers-stats*
*Completed: 2026-07-04*
