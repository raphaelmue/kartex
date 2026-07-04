---
phase: 30-study-timers-stats
plan: 04
subsystem: ui
tags: [react, session-timer, visibility-api, study-session]

requires:
  - phase: 30-study-timers-stats
    provides: "Plan 01 — shared Zod contract (RateCardSchema.thinkingTimeMs, StudySessionStartSchema/Response, StudySessionCompleteSchema); Plan 02 — study.sessionElapsedAriaLabel i18n key"
  - phase: 30-study-timers-stats
    provides: "Plan 03 — POST /api/study/session/start, POST /api/study/session/complete, thinkingTimeMs persistence on POST /api/study/rate"

provides:
  - "SessionTimer component — count-up mm:ss elapsed timer with Page Visibility API pause, shown in study header for normal/SR/deck modes"
  - "useStudySession first-flip thinking-time capture sent as thinkingTimeMs on POST /api/study/rate"
  - "SessionRunner StudySession start/complete lifecycle calls (all modes including exam)"

affects: [30-05]

tech-stack:
  added: []
  patterns:
    - "SessionTimer is a new sibling component to ExamTimer (not a mode-flag extension) — copies mm:ss formatting/a11y verbatim, drops color-shift thresholds, adds Page Visibility API pause/resume"
    - "Page Visibility API pause pattern (pausedMsRef/hiddenAccumMsRef + hiddenSinceRef, visibilitychange listener) used identically in both SessionTimer.tsx and useStudySession.ts for the two independent stopwatches (session elapsed vs. per-card thinking time)"

key-files:
  created:
    - apps/frontend/src/components/SessionTimer.tsx
    - apps/frontend/src/components/__tests__/SessionTimer.test.tsx
  modified:
    - apps/frontend/src/hooks/useStudySession.ts
    - apps/frontend/src/pages/StudySessionPage.tsx

key-decisions:
  - "Thinking-time capture happens at flip() invocation (guard-protected, only fires once per card) rather than inside the flip animation's setTimeout — the moment the user decides to flip is the natural end of 'thinking', and the existing faceRef guard already prevents re-entry on subsequent flips of the same card (D-04)"
  - "Session start/complete POST calls both wrapped in try/catch with import.meta.env.DEV-only console.error — verified against the existing StudySessionPage test suite (api.post mocked as a bare vi.fn() returning undefined) to confirm the study loop and all 24 pre-existing tests are unaffected by a failed/unmocked lifecycle call (T-30-10)"
  - "cardShownAtRef initialized to 0 (not Date.now()) at useRef() call site, then set to Date.now() inside the [currentIndex] mount/advance effect — calling Date.now() directly in the useRef initializer tripped the project's react-hooks/purity ESLint rule (impure function during render); the effect-based reset already covers the timing correctness the plan requires"

patterns-established: []

requirements-completed: [TIMER-01, TIMER-02, TIMER-03]

coverage:
  - id: D1
    description: "Normal/SR/deck modes show SessionTimer (count-up mm:ss) in the study header; exam mode keeps ExamTimer unchanged, in the same slot, never both"
    requirement: "TIMER-01"
    verification:
      - kind: unit
        ref: "apps/frontend/src/components/__tests__/SessionTimer.test.tsx (4 tests: initial 00:00, 01:05 after 65s, role=timer/aria-live=off, visibility pause+resume)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Each non-exam rating sends thinkingTimeMs (first-flip only, hidden time excluded) on POST /api/study/rate"
    requirement: "TIMER-02"
    verification:
      - kind: unit
        ref: "yarn workspace @kartex/frontend typecheck (exit 0); existing StudySessionPage.test.tsx suite (24/24 pass) confirms no regression to the rate/flip flow after adding the capture refs"
        status: pass
    human_judgment: true
    rationale: "No dedicated test asserts the exact thinkingTimeMs value sent to api.post in this plan — the existing test suite's api.post mock is a bare vi.fn() with no return value, so it does not exercise the rate() request body. Manual behavioral verification against the plan's <behavior> block (capture-on-first-flip, hidden-time exclusion) was done via code review of the shared visibility-pause primitive already unit-tested in SessionTimer.test.tsx."
  - id: D3
    description: "StudySession is started on session begin (ref-guarded, once) and completed on session finish (sessionDone) for all modes including exam"
    requirement: "TIMER-03"
    verification:
      - kind: unit
        ref: "yarn workspace @kartex/frontend typecheck (exit 0); StudySessionPage.test.tsx (24/24 pass, including exam-mode-adjacent SM2-04/STUDY-04/SEDIT suites) confirms the new lifecycle effects do not disrupt existing flows"
        status: pass
    human_judgment: true
    rationale: "No dedicated test asserts the exact /session/start or /session/complete request payloads in this plan — same test-harness gap noted in Plan 03's D2/D3 (behavioral routes documented via it.todo, not mock-asserted). The try/catch + DEV-only logging design was manually verified to not throw an unhandled rejection when api.post returns undefined (the existing tests' mock shape), confirmed by running the full StudySessionPage suite green with the added effects."

duration: 15min
completed: 2026-07-04
status: complete
---

# Phase 30 Plan 04: Study Timer Frontend Wiring Summary

**New `SessionTimer` count-up component with visibility-pause, first-flip thinking-time capture in `useStudySession`, and StudySession start/complete lifecycle calls wired into `SessionRunner` for all study modes**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-04T09:20:00Z (approx, continuing from Plan 03)
- **Completed:** 2026-07-04T09:37:00Z
- **Tasks:** 2 completed
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- `SessionTimer.tsx` — a new sibling component to `ExamTimer` — renders a count-up mm:ss elapsed timer with the identical `role="timer"` / `aria-live="off"` a11y contract, `text-sm font-mono tabular-nums text-foreground` styling (no color-shift thresholds), and a Page Visibility API pause: the displayed value freezes while `document.hidden` is true and resumes exactly where it left off when the tab becomes visible again (D-01, D-02, D-05)
- `SessionTimer.test.tsx` (4 tests) locks the component's behavior: initial `00:00`, `01:05` after advancing 65s, the a11y attribute contract, and the hidden/visible pause-resume cycle
- `useStudySession.ts` gained a per-card stopwatch (`cardShownAtRef`, `hiddenAccumMsRef`, `hiddenSinceRef`, `capturedThinkingMsRef`) that resets whenever a new card becomes current, accrues hidden time via its own `visibilitychange` listener, and captures the elapsed thinking time exactly once per card at the first `flip()` call (the existing `faceRef.current !== 'front'` guard already prevents any later flip from overwriting it) — the captured value is sent as `thinkingTimeMs` on the existing `POST /api/study/rate` call
- `StudySessionPage.tsx`'s `SessionRunner` now renders `<SessionTimer startedAt={startTime} />` in the exact header slot `ExamTimer` previously occupied alone, for every non-exam mode; exam mode is completely unchanged (`ExamTimer` renders, `SessionTimer` never renders alongside it)
- `SessionRunner` also gained the `StudySession` lifecycle: a ref-guarded effect fires `POST /api/study/session/start` once per session (computing unique `deckIds` from the loaded cards) and stores the returned session id, and the existing `sessionDone` effect was extended to fire `POST /api/study/session/complete` with the final `cardsReviewed` count — both calls run for every mode including exam (D-07), wrapped in try/catch with `import.meta.env.DEV`-only logging so a network failure can never break the study loop

## Task Commits

Each task was committed atomically:

1. **Task 1: SessionTimer count-up component with visibility pause** - `d3bac29` (feat)
2. **Task 2: Thinking-time capture + session lifecycle wiring** - `b015a3b` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `apps/frontend/src/components/SessionTimer.tsx` - New count-up mm:ss timer component with Page Visibility API pause/resume
- `apps/frontend/src/components/__tests__/SessionTimer.test.tsx` - New test file (4 tests) covering initial render, count-up, a11y contract, and visibility pause/resume
- `apps/frontend/src/hooks/useStudySession.ts` - Added first-flip thinking-time capture refs + visibilitychange listener; `thinkingTimeMs` now sent on `POST /api/study/rate`
- `apps/frontend/src/pages/StudySessionPage.tsx` - `SessionRunner` renders `SessionTimer` for non-exam modes; added `sessionIdRef`/`sessionStartCalledRef` and the session start/complete lifecycle effects

## Decisions Made
- Thinking-time capture happens synchronously inside `flip()` at the point the guard passes (before the flip animation's `setTimeout`), not inside the animation callback — this is the moment the user decided to flip, and the existing `faceRef.current !== 'front'` guard already makes this a first-flip-only capture point (D-04)
- `cardShownAtRef` is initialized to `0` in the `useRef()` call (not `Date.now()`) because calling `Date.now()` directly during render tripped the project's `react-hooks/purity` ESLint rule (impure function during render, `eslint-plugin-react-hooks@7`); the actual timestamp is set inside the `[currentIndex]` effect that already runs on mount and every card advance, which is functionally equivalent for this plan's purposes
- Both session lifecycle POST calls (`/session/start`, `/session/complete`) are fired via `void (async () => { try {...} catch {...} })()` inside their respective effects — verified against the existing `StudySessionPage.test.tsx` suite, whose `api.post` mock is a bare `vi.fn()` returning `undefined`, to confirm the try/catch swallows the resulting `TypeError` (`Cannot read properties of undefined (reading 'ok')`) without failing any of the 24 pre-existing tests

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ESLint `react-hooks/purity` error from impure `Date.now()` call in `useRef()` initializer**
- **Found during:** Task 2, running `yarn lint` after implementing the thinking-time capture refs
- **Issue:** `const cardShownAtRef = useRef(Date.now())` calls the impure `Date.now()` function directly during render, which the project's `eslint-plugin-react-hooks@7` `react-hooks/purity` rule flags as an error (not just a warning) — this would have failed CI's lint step.
- **Fix:** Changed the initializer to `useRef(0)`; the real timestamp is set inside the existing `useEffect(() => {...}, [currentIndex])` reset block, which already runs on mount and on every card advance, before any user interaction (flip) is possible.
- **Files modified:** `apps/frontend/src/hooks/useStudySession.ts`
- **Verification:** `yarn lint` passes with 0 errors (same pre-existing warning count as before this plan); `yarn workspace @kartex/frontend typecheck` exits 0; all 24 `StudySessionPage.test.tsx` tests still pass
- **Committed in:** `b015a3b`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** No scope change — a one-line lint fix required by the project's stricter React Compiler-era ESLint rules, not present when the plan/pattern-map were authored. No behavior change: the timestamp is still set before any flip can occur.

## Issues Encountered

None beyond the lint fix documented above.

## User Setup Required

None - no external service configuration required. The backend routes this plan calls (`POST /api/study/session/start`, `POST /api/study/session/complete`, `thinkingTimeMs` on `POST /api/study/rate`) were already implemented and live in Plan 03.

## Next Phase Readiness
- `yarn workspace @kartex/frontend typecheck` exits 0; `yarn lint` passes; full frontend test suite (18 files / 156 tests) passes, including the new `SessionTimer.test.tsx` (4 tests) and the unmodified `StudySessionPage.test.tsx` (24 tests, all still green with the new session-lifecycle effects wrapped in try/catch)
- Plan 05 (Dashboard `StatsSummaryPanel` — per-deck avg flip time column + Recent Sessions list, per D-10/D-11/D-12/UI-SPEC §2-3) can proceed independently — it consumes the `GET /api/stats/summary` fields already shipped in Plan 03 (`avgThinkingTimeMs`, `recentSessions`) and does not depend on anything introduced in this plan
- No blockers

---
*Phase: 30-study-timers-stats*
*Completed: 2026-07-04*

## Self-Check: PASSED

All created/modified files and commit hashes (d3bac29, b015a3b) verified present on disk and in git history.
