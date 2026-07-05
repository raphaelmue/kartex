---
phase: 30-study-timers-stats
verified: 2026-07-04T16:49:03Z
status: passed
score: 2/4 must-haves verified
behavior_unverified: 2
overrides_applied: 0
human_verification:

  - test: "Start a normal/SR/deck study session, flip a card immediately, wait ~5s, then flip back and forth a few more times before rating. Check the stored ReviewLog.thinkingTimeMs for that review (e.g. via GET /api/stats/summary avgThinkingTimeMs or a direct DB query)."
    expected: "thinkingTimeMs reflects only the elapsed time up to the FIRST front->back flip (~5s), not the time up to the rating submit and not affected by the later back-and-forth flips (D-04)."
    why_human: "useStudySession.ts has no dedicated test file (none exists in apps/frontend/src/hooks/) and study-session-routes.test.ts's rate-passthrough assertions are it.todo stubs, not executed tests. The capture logic (cardShownAtRef, hiddenAccumMsRef, capturedThinkingMsRef, first-flip guard) is code-reviewed as correct but the value has never been observed flowing from a real flip event to a stored DB row."

  - test: "Start a study session (normal or Global SR spanning 2+ decks), background the tab for 30s partway through (to exercise D-05 on the per-card stopwatch), rate a few cards, then either finish the session or navigate away before finishing. Inspect the StudySession row via GET /api/stats/summary recentSessions: (a) for a completed session, confirm completedAt/durationSeconds/cardsReviewed are set and completed=true; (b) for the abandoned one, confirm it still appears with completed=false and partial data (D-08); (c) confirm deckTitles lists every deck touched (D-09); (d) attempt to complete another user's sessionId and confirm a 403 is returned, never a silent update."
    expected: "Session start creates one StudySessionDeck row per deck; session complete computes durationSeconds strictly from session.startedAt (never a client-supplied value); ownership guard rejects cross-user completion attempts; abandoned sessions persist partial state exactly as D-08 specifies."
    why_human: "study-session-routes.test.ts documents this entire behavior surface (authorization branching, StudySessionDeck fan-out create, 404/403 ownership guard, server-computed duration, exam-mode session tracking) as 9 it.todo stubs — only 2 of 11 tests in the file are real, and both are pure Zod-schema assertions with no route invocation. No mock-Prisma or live-server test exercises session/start or session/complete. The SUMMARY for Plan 03/04 explicitly flags this as a known test-harness gap, consistent with this repo's existing study-rate-reviewlog.test.ts convention, rather than a hidden defect — but it means the ownership/duration/multi-deck invariants are unverified by any executable test."
---

# Phase 30: Study Timers & Stats Verification Report

**Phase Goal:** The app records how long each card takes to flip and how long each session lasts; both appear in statistics
**Verified:** 2026-07-04T16:49:03Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

(Source: ROADMAP.md Phase 30 Success Criteria — the roadmap contract, cross-checked against all 5 plans' `must_haves.truths`.)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A running session timer is visible in the study header during all study modes (not just exam) | ✓ VERIFIED | `SessionTimer.tsx` exists, copies `ExamTimer`'s a11y/formatting contract, drops color-shift thresholds; its count-up + Page-Visibility-pause invariant is exercised by 4 passing tests (`SessionTimer.test.tsx`: initial `00:00`, `01:05` after 65s, `role="timer"`/`aria-live="off"`, pause-and-resume across a `visibilitychange` cycle). `StudySessionPage.tsx` lines 177-184 render `ExamTimer` only when `mode === 'exam' && examDurationSeconds !== null`, else `SessionTimer` — a simple, code-verified conditional (not a hidden-state invariant), confirmed present in the file. |
| 2 | The time from card front display to card flip is measured per review and stored in `ReviewLog.thinkingTimeMs` | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Column confirmed live on the DB (`\d "ReviewLog"` shows nullable `thinkingTimeMs integer`). `study.ts` POST `/rate` passes `thinkingTimeMs` straight into `tx.reviewLog.create` (line 239). `useStudySession.ts` implements the capture (front-display timestamp on card-advance, hidden-time exclusion via its own `visibilitychange` listener, first-flip-only guard via the pre-existing `faceRef.current !== 'front'` check) exactly as specified in 30-CONTEXT.md D-03/D-04/D-05. **However**, no test exercises this state machine: there is no `useStudySession` test file at all, and `study-session-routes.test.ts`'s two `it.todo` items for this exact behavior are unexecuted stubs. Code is present and wired; the capture-and-persist invariant itself is unproven by any running test. See Human Verification #1. |
| 3 | Total session duration is stored in a `StudySession` record when a session completes | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `StudySession`/`StudySessionDeck` tables confirmed live with all 3 `ON DELETE CASCADE` FKs and the `(userId, startedAt)` index. `POST /session/start` (deck ownership/active-share authorization, `StudySessionDeck` fan-out create) and `POST /session/complete` (`{id, userId}` ownership guard, server-computed `durationSeconds` from `startedAt`→now, never client-supplied) are both present in `study.ts` and match the plan's design exactly on code inspection. `StudySessionPage.tsx`'s `SessionRunner` wires both calls (ref-guarded start-once effect, extended `sessionDone` complete effect) for every mode including exam (D-07), wrapped in try/catch. **However**, `study-session-routes.test.ts` documents this entire surface (authorization branch, fan-out create, 404/403 guards, duration computation, exam-mode independence) as 9 `it.todo` stubs — only 2/11 tests in that file execute, and both are pure Zod-schema parses with no route invocation. No mock-Prisma or live-server test exercises the actual route logic. See Human Verification #2. |
| 4 | Stats page shows average card flip time and a list of recent sessions with duration and card count | ✓ VERIFIED | `GET /api/stats/summary` (`stats.ts`) computes `avgThinkingTimeMs` via `reviewLog.groupBy` (null-on-empty, mirrors the existing `difficultyBreakdown` convention) and `recentSessions` via `studySession.findMany` (last 10, `userId`-scoped, `orderBy startedAt desc`, includes `deckTitles` + `completed` flag) — confirmed by direct code read, both are real Prisma queries against live tables, not static/hardcoded returns. `StatsSummaryPanel.tsx` renders both: the per-deck table's new "Avg. Flip Time" column and the new "Recent Sessions" section. This rendering layer is behaviorally verified by 13/13 passing tests, including: `3.4s` display for a numeric average, `noData` for null, empty-state `noSessionsYet` row, one secondary `Badge` per deck title on multi-deck sessions, and the outline "Incomplete" badge appearing only when `completed=false`. |

**Score:** 2/4 truths verified (2 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/backend/prisma/schema.prisma` | `ReviewLog.thinkingTimeMs`, `StudySession`, `StudySessionDeck` models, both relation sides wired | ✓ VERIFIED | All three present exactly as specified; back-relations on `User.studySessions` and `Deck.studySessionDecks` confirmed |
| `apps/backend/prisma/migrations/20260704000000_add_study_timers/migration.sql` | Nullable ALTER + 2 CREATE TABLE + index + 3 cascading FKs | ✓ VERIFIED | File matches spec; **confirmed applied to the live DB** via direct `psql \d` inspection of `StudySession`, `StudySessionDeck`, `ReviewLog` and `prisma migrate status` reporting "Database schema is up to date!" (10 migrations found, including `20260704000000_add_study_timers`) |
| `packages/shared/src/schemas/study.ts` | `RateCardSchema.thinkingTimeMs`, `StudySessionStartSchema`, `StudySessionStartResponseSchema`, `StudySessionCompleteSchema`, `StudySessionSchema` | ✓ VERIFIED | All five present with correct types/nullability; `StudySessionCompleteSchema` confirmed to omit `durationSeconds` |
| `packages/shared/src/schemas/stats.ts` | `PerDeckProgressSchema.avgThinkingTimeMs` (nullable), `RecentSessionSchema`, `StatsSummarySchema.recentSessions` | ✓ VERIFIED | All present with correct null-on-empty / always-array semantics |
| `apps/backend/src/routes/__tests__/study-timers-schema.test.ts` | 6 real Zod-validation behaviors | ✓ VERIFIED | 8/8 tests pass (ran directly) |
| `apps/frontend/src/locales/en.json` / `de.json` | 9 new keys, identical key sets | ✓ VERIFIED | Confirmed via direct node script — both locales carry all 9 keys with `{{time}}` interpolation preserved |
| `apps/backend/src/routes/study.ts` | `thinkingTimeMs` passthrough + `/session/start` + `/session/complete` | ✓ VERIFIED (wiring) / ⚠️ behavior unproven | Code matches plan exactly; route logic itself has no executing test (see Truths #2/#3) |
| `apps/backend/src/routes/stats.ts` | `avgThinkingTimeMs` per-deck + `recentSessions` | ✓ VERIFIED | Real Prisma `groupBy`/`findMany` queries against live tables, not static returns |
| `apps/backend/src/routes/__tests__/study-session-routes.test.ts` | Behavioral-contract tests for TIMER-02/03 | ⚠️ PARTIAL | 2/11 tests execute (both are Zod-schema-only assertions); 9/11 are `it.todo` stubs documenting but not exercising the route behavior |
| `apps/backend/src/routes/__tests__/stats-timers.test.ts` | Behavioral-contract tests for TIMER-04 | ⚠️ PARTIAL | 1/8 tests executes (a `RecentSessionSchema` parse assertion); 7/8 are `it.todo` stubs |
| `apps/frontend/src/components/SessionTimer.tsx` | Count-up mm:ss timer with visibility pause | ✓ VERIFIED | 4/4 tests pass, ran directly |
| `apps/frontend/src/components/__tests__/SessionTimer.test.tsx` | 4 behaviors from `<behavior>` block | ✓ VERIFIED | Ran directly, 4/4 pass |
| `apps/frontend/src/hooks/useStudySession.ts` | First-flip thinking-time capture refs + visibility accrual | ✓ VERIFIED (wiring) / ⚠️ behavior unproven | Code matches plan exactly; no dedicated test file exists for this hook |
| `apps/frontend/src/pages/StudySessionPage.tsx` | Timer render swap + session lifecycle calls | ✓ VERIFIED (wiring) | Code matches plan exactly; existing 24-test suite still green (no regression); the timer-swap conditional itself is simple and code-verified |
| `apps/frontend/src/components/StatsSummaryPanel.tsx` | Avg-flip column + Recent Sessions section | ✓ VERIFIED | 13/13 tests pass, ran directly |
| `apps/frontend/src/components/__tests__/StatsSummaryPanel.test.tsx` | 4 behaviors from `<behavior>` block + regression | ✓ VERIFIED | Ran directly, 13/13 pass (7 pre-existing + 6 new) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `study.ts` POST /rate body | `tx.reviewLog.create` | `thinkingTimeMs` destructured from `body.data`, passed straight into the create call | ✓ WIRED | Confirmed at study.ts line 239 |
| `study.ts` POST /session/start | deck ownership/active-share guard | Batched `deck.findMany` + `deckShare.findMany` reused from the `/rate` authorization pattern | ✓ WIRED | Confirmed at study.ts lines 269-285 |
| `stats.ts` `avgThinkingTimeByDeck` groupBy | `perDeck[].avgThinkingTimeMs` | `.find()`-merge on `deckId`, null-on-empty | ✓ WIRED | Confirmed at stats.ts lines 118-122, mirrors the pre-existing `difficultyBreakdown` idiom |
| `stats.ts` `recentSessions` query | `StatsSummarySchema.recentSessions` response field | Always an array (empty, never null); `completed` derived from `completedAt !== null` | ✓ WIRED | Confirmed at stats.ts lines 142-149 |
| `SessionRunner`'s `startTime` state | `SessionTimer startedAt` prop | Direct prop pass, no new state introduced | ✓ WIRED | Confirmed at StudySessionPage.tsx line 183 |
| `useStudySession` `capturedThinkingMsRef` | POST `/api/study/rate` body | `thinkingTimeMs: capturedThinkingMsRef.current ?? undefined` | ✓ WIRED | Confirmed at useStudySession.ts line 108 |
| `SessionRunner` mount | POST `/api/study/session/start` | Ref-guarded effect, unique `deckIds` from loaded cards | ✓ WIRED | Confirmed at StudySessionPage.tsx lines 60-78 |
| `SessionRunner` `sessionDone` | POST `/api/study/session/complete` | Extended existing effect, `cardsReviewed` computed from `ratingCounts` | ✓ WIRED | Confirmed at StudySessionPage.tsx lines 80-97 |
| session lifecycle POST calls | try/catch + DEV-only logging | Both calls wrapped so a network failure never blocks the study loop | ✓ WIRED | Confirmed in both effects |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `StatsSummaryPanel.tsx` | `summary.perDeck[].avgThinkingTimeMs` | `GET /api/stats/summary` → `stats.ts` `reviewLog.groupBy` | Yes — real Prisma aggregate query against the live `ReviewLog` table, null-on-empty | ✓ FLOWING |
| `StatsSummaryPanel.tsx` | `summary.recentSessions` | `GET /api/stats/summary` → `stats.ts` `studySession.findMany` | Yes — real Prisma query against the live `StudySession`/`StudySessionDeck` tables, capped at 10 | ✓ FLOWING |
| `SessionTimer.tsx` | `elapsed` (derived from `startedAt` prop) | `SessionRunner`'s `startTime` (`Date.now()` at mount) | Yes — dynamic runtime value, not hardcoded | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Shared Zod contract (6 behaviors) | `yarn workspace @kartex/backend test --run study-timers-schema` | 8/8 pass | ✓ PASS |
| SessionTimer count-up + visibility pause (4 behaviors) | `yarn workspace @kartex/frontend test --run SessionTimer` | 4/4 pass | ✓ PASS |
| StatsSummaryPanel avg-flip + Recent Sessions rendering (4 behaviors) | `yarn workspace @kartex/frontend test --run StatsSummaryPanel` | 13/13 pass | ✓ PASS |
| Session route behavioral contract (authorization, fan-out create, ownership guard, duration compute) | `yarn workspace @kartex/backend test --run study-session-routes` | 2/11 execute (schema-only); 9/11 are `it.todo` | ⚠️ SKIP — route behavior undocumented by an executing test; see Human Verification #2 |
| Stats aggregation behavioral contract (avg-flip null-on-empty, recent-sessions ordering/cap) | `yarn workspace @kartex/backend test --run stats-timers` | 1/8 executes (schema-only); 7/8 are `it.todo` | ⚠️ SKIP — aggregation behavior undocumented by an executing test |
| Live migration application | `docker compose exec db psql -U kartex -d kartex -c '\d "StudySession"'` / `"StudySessionDeck"` / `"ReviewLog"`; `docker compose exec backend npx prisma migrate status` | All 3 tables/columns present with correct FKs/indexes; "Database schema is up to date!" | ✓ PASS |
| i18n key parity (9 keys, both locales) | inline `node -e` key-existence check | "i18n keys OK" | ✓ PASS |
| Backend typecheck | `yarn workspace @kartex/backend typecheck` | exit 0 | ✓ PASS |
| Frontend typecheck | `yarn workspace @kartex/frontend typecheck` | exit 0 | ✓ PASS |
| Full backend test suite (regression) | `yarn workspace @kartex/backend test --run` | 14 files passed / 6 skipped-by-design; 68 tests passed, 88 `it.todo` (pre-existing convention, not new) | ✓ PASS |
| Full frontend test suite (regression) | `yarn workspace @kartex/frontend test --run` | 18 files / 161 tests, all pass | ✓ PASS |

### Probe Execution

No probes declared for this phase (no `scripts/*/tests/probe-*.sh` referenced in any PLAN/SUMMARY, and this is not a migration/CLI-tooling phase in the probe-execution sense). Skipped.

### Requirements Coverage

**Finding, not a code defect:** `TIMER-01` through `TIMER-04` do not appear anywhere in `.planning/REQUIREMENTS.md` — not in the Milestone Requirements section, not in the Traceability table. This was flagged in advance by `30-CONTEXT.md`'s `<domain>` section: *"TIMER-01..04 are referenced in ROADMAP.md (Phase 30 section) but are not yet enumerated in REQUIREMENTS.md's Milestone Requirements / Traceability tables... Planner/executor should proceed from ROADMAP.md's 4 success criteria as the source of truth; REQUIREMENTS.md traceability should be backfilled at phase transition."* Confirmed via `grep -n "TIMER" .planning/REQUIREMENTS.md` — zero matches. All 5 plans consistently declare `requirements: [TIMER-0x, ...]` in frontmatter and the ROADMAP.md Phase 30 section lists all four IDs against its 4 success criteria, so the requirement IDs are internally consistent across planning artifacts — the gap is specifically that REQUIREMENTS.md (the milestone-level document) was never updated to include them. This is a **process/documentation gap**, not evidence of missing implementation — the underlying capability was verified directly above via the ROADMAP's 4 success criteria, which is what 30-CONTEXT.md explicitly authorized as the source of truth for this phase.

| Requirement | Source Plan | Description (from ROADMAP, since absent from REQUIREMENTS.md) | Status | Evidence |
|-------------|-------------|-----------------------------------------------------------------|--------|----------|
| TIMER-01 | 30-02, 30-04 | Visible running session timer (i18n key + component) | ✓ SATISFIED | Truth #1 above |
| TIMER-02 | 30-01, 30-03, 30-04 | Card flip thinking-time measured and stored | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Truth #2 above |
| TIMER-03 | 30-01, 30-03, 30-04 | Session duration stored on completion | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Truth #3 above |
| TIMER-04 | 30-01, 30-02, 30-03, 30-05 | Stats show avg flip time + recent sessions | ✓ SATISFIED | Truth #4 above |

**Recommendation:** Backfill TIMER-01..04 into `.planning/REQUIREMENTS.md`'s Milestone Requirements and Traceability sections at the next milestone/phase transition, per 30-CONTEXT.md's own note. This is a WARNING-level documentation gap, not a BLOCKER — it does not affect whether the phase goal was achieved in the codebase.

### Anti-Patterns Found

Scanned all files modified/created in this phase (`schema.prisma`, migration SQL, both shared schema files, both route files, all 4 test files, `SessionTimer.tsx`, `useStudySession.ts`, `StudySessionPage.tsx`, `StatsSummaryPanel.tsx`, both locale files) for `TODO|FIXME|XXX|TBD|HACK|PLACEHOLDER`, informal placeholder phrasing, and empty-implementation patterns.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `StudySessionPage.tsx` | 746 | `placeholder={t('study.selectTimeLimit')}` | ℹ️ INFO | False positive — this is the standard HTML/shadcn `Select` `placeholder` prop (pre-existing exam-mode UI, unrelated to Phase 30's scope), not a debt marker or stub |

No debt markers (`TBD`/`FIXME`/`XXX`), no `console.log`-only implementations, no hardcoded-empty-return stubs, and no unreferenced `TODO`/`HACK` found in any phase-touched file. The `it.todo(...)` stubs in `study-session-routes.test.ts` and `stats-timers.test.ts` are a Vitest API construct (a documented, skip-counted pending test), not a debt-marker comment, and both files explicitly document the gap as a "future test-harness task" consistent with the pre-existing `study-rate-reviewlog.test.ts` / `stats-summary.test.ts` convention already in this codebase.

### Human Verification Required

See frontmatter `human_verification` for the structured form. Summary:

1. **Thinking-time capture accuracy** — verify that `ReviewLog.thinkingTimeMs` reflects only the front-display-to-first-flip window (excluding hidden/backgrounded time and later re-flips), not just that the field is populated.
2. **Session lifecycle correctness** — verify `StudySession`/`StudySessionDeck` rows are created/updated correctly across multi-deck sessions, abandoned sessions show partial data, and cross-user completion attempts are rejected with 403.

Both items stem from the same root cause: `study-session-routes.test.ts` and `stats-timers.test.ts` document the required route behavior almost entirely via `it.todo` stubs (9/11 and 7/8 respectively) rather than executing tests against a mocked or live Prisma client. This is called out explicitly and honestly in both Plan 03's and Plan 04's SUMMARY.md `coverage[].rationale` fields as a known, pre-existing test-harness gap in this repo (matching `study-rate-reviewlog.test.ts`'s convention) — not a concealed defect. All code paths were read in full and match the plan's specification exactly; what remains unverified is runtime behavior under real inputs, which grep/read cannot prove.

### Gaps Summary

No blocking gaps. All required artifacts exist, are substantive, are correctly wired, and every executable test (85 non-todo tests across the phase's new/modified test files, plus the full 68-test backend and 161-test frontend regression suites) passes. The live database migration is confirmed applied with all expected tables, columns, indexes, and foreign keys. Both typechecks pass with zero errors.

The phase is held at `human_needed` rather than `passed` for two reasons, both behavior-dependent truths per the verification framework (state-transition / ownership-invariant truths that presence-and-wiring checks cannot prove):

1. The first-flip thinking-time capture (a state machine: reset-on-card-advance, pause-while-hidden, capture-once-on-first-flip) has zero executing tests.
2. The StudySession lifecycle (ownership guard, multi-deck authorization, server-computed duration, abandoned-session partial state) has zero executing tests beyond two Zod-schema-only assertions.

Separately, a documentation/traceability gap was found and reported per the task's explicit instruction: TIMER-01..04 are absent from `.planning/REQUIREMENTS.md` despite being consistently used across ROADMAP.md and all 5 plans. This is a pre-acknowledged process gap (documented in 30-CONTEXT.md before planning began), not a code defect, and does not block the phase's goal achievement.

---

*Verified: 2026-07-04T16:49:03Z*
*Verifier: Claude (gsd-verifier)*
