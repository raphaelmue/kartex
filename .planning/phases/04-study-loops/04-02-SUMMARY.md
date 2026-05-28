---
phase: 04-study-loops
plan: 02
subsystem: ui
tags: [react, css-3d, vitest, react-testing-library, shadcn-ui, state-machine]

requires:
  - phase: 04-01
    provides: DueCard type, /api/study/due, /api/study/deck/:deckId, /api/study/rate endpoints

provides:
  - CSS 3D flip card component with backface-visibility vendor prefix (Safari-safe)
  - Four color-coded rating buttons (Again/Hard/Good/Easy) with keyboard hints
  - ExamTimer countdown component with useEffect cleanup on unmount
  - SessionProgress display (Card N of M)
  - useStudySession hook: flip/rate state machine, exam mode guard, keyboard shortcuts
  - StudySessionPage: mode selector (SR/Deck/Exam with time picker), session loop, completion screen
  - /study and /decks/:id/learn routes wired in App.tsx

affects: [04-03-dashboard, phase-5-import]

tech-stack:
  added: []
  patterns: [CSS-3D-flip, state-machine-hook, exam-mode-guard, keyboard-shortcut-with-faceRef]

key-files:
  created:
    - apps/frontend/src/components/CardFlip.tsx
    - apps/frontend/src/components/RatingButtons.tsx
    - apps/frontend/src/components/ExamTimer.tsx
    - apps/frontend/src/components/SessionProgress.tsx
    - apps/frontend/src/hooks/useStudySession.ts
    - apps/frontend/src/pages/StudySessionPage.tsx
    - apps/frontend/src/components/__tests__/CardFlip.test.tsx
  modified:
    - apps/frontend/src/App.tsx
    - apps/frontend/src/lib/__tests__/streak.test.ts

key-decisions:
  - "CSS 3D flip: perspective on outer wrapper (no overflow:hidden), transformStyle:preserve-3d on card body, WebkitBackfaceVisibility for Safari"
  - "RatingButtons uses native <button> elements (not shadcn Button) to avoid variant overrides on Tailwind color classes"
  - "useStudySession uses faceRef (mutable ref) for keyboard handlers to avoid stale closure on face state (Pitfall 8)"
  - "Exam mode guard: if (mode !== 'exam') before api.post — POST /api/study/rate never called in exam sessions (T-4-04)"
  - "ExamTimer useEffect cleanup: clearInterval on unmount prevents setState on unmounted component (Pitfall 4)"
  - "streak.test.ts: added explicit vitest imports (describe/it/expect) required for TypeScript build compatibility"

patterns-established:
  - "CSS-3D-flip: perspective wrapper → transformStyle:preserve-3d card body → rotateY(180deg) flip → both faces backfaceVisibility:hidden"
  - "State machine hook: faceRef + isFlippingRef as mutable refs for keyboard handlers (stale closure prevention)"
  - "Mode guard pattern: check mode before API call in hook layer, not component layer"

requirements-completed: [STDY-01, STDY-02, STDY-03, STDY-04, STDY-05]

duration: 20min
completed: 2026-05-28
---

# Plan 04-02: Study Session UI Summary

**CSS 3D flip card (backface-visibility Safari-safe), rating buttons with keyboard shortcuts, useStudySession state machine with exam mode guard, and StudySessionPage at /study and /decks/:id/learn**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-05-28
- **Tasks:** 2
- **Files modified:** 8 (6 created + 2 modified)

## Accomplishments
- CardFlip component with CSS 3D Y-axis rotation, backface-visibility (incl. WebkitBackfaceVisibility), no overflow:hidden on flip context
- RatingButtons (Again/Hard/Good/Easy) with color coding and keyboard shortcut hints
- ExamTimer countdown with proper useEffect cleanup (Pitfall 4 mitigated)
- useStudySession hook: flip/rate state machine, faceRef for keyboard handlers (Pitfall 8 mitigated), exam mode guard (T-4-04)
- StudySessionPage: mode selector with time picker for exam, session loop, completion screen with per-rating breakdown
- /study and /decks/:id/learn routes wired in App.tsx
- 8 unit tests for CardFlip/RatingButtons (rating visibility gating, button behavior)

## Task Commits

1. **Task 1: CardFlip, RatingButtons, ExamTimer, SessionProgress + unit tests** - `b67645d` (feat)
2. **Task 2: useStudySession hook + StudySessionPage + App.tsx routes** - `f62b682` (feat)
3. **Fix: streak.test.ts vitest imports** - `906dbfe` (fix)

## Files Created/Modified
- `apps/frontend/src/components/CardFlip.tsx` — CSS 3D flip card with KartexRenderer on both faces
- `apps/frontend/src/components/RatingButtons.tsx` — Four color-coded buttons with keyboard hints
- `apps/frontend/src/components/ExamTimer.tsx` — Countdown timer with expire callback and cleanup
- `apps/frontend/src/components/SessionProgress.tsx` — Card N of M progress display
- `apps/frontend/src/hooks/useStudySession.ts` — State machine: flip, rate, keyboard shortcuts, mode guard
- `apps/frontend/src/pages/StudySessionPage.tsx` — Mode selector + session loop + completion screen
- `apps/frontend/src/components/__tests__/CardFlip.test.tsx` — 8 unit tests
- `apps/frontend/src/App.tsx` — Added StudySessionPage import + /study and /decks/:id/learn routes
- `apps/frontend/src/lib/__tests__/streak.test.ts` — Added explicit vitest imports (build fix)

## Decisions Made
- Used `faceRef` mutable ref in useStudySession keyboard handler to avoid stale closure on `face` state — prevents keyboard shortcuts from firing when card shows wrong face (RESEARCH Pitfall 8)
- Exam mode guard lives in the hook layer (`if (mode !== 'exam') await api.post(...)`) not in the component, ensuring T-4-04 is enforced at the data access layer

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing vitest imports in streak.test.ts**
- **Found during:** Task 2 verification (yarn build)
- **Issue:** streak.test.ts used `describe`/`it`/`expect` as globals without explicit import from 'vitest', causing TypeScript build error (TS2582)
- **Fix:** Added `import { describe, it, expect } from 'vitest'` to streak.test.ts
- **Files modified:** apps/frontend/src/lib/__tests__/streak.test.ts
- **Verification:** `yarn workspace @kartex/frontend build` exits 0
- **Committed in:** `906dbfe`

---

**Total deviations:** 1 auto-fixed (1 blocking build error)
**Impact on plan:** Build fix necessary for TypeScript compatibility. No scope creep.

## Issues Encountered
- Session limit hit during agent execution after Task 1 committed — Task 2 files were created but uncommitted. Orchestrator completed Task 2 commit inline and created this SUMMARY.

## Self-Check: PASSED

## Next Phase Readiness
- Study session UI complete at /study (global SR) and /decks/:id/learn (mode selector)
- Dashboard page (04-03) can proceed — no dependencies on 04-02 files except App.tsx route coordination

---
*Phase: 04-study-loops*
*Completed: 2026-05-28*
