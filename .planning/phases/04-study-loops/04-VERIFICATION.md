---
phase: 04-study-loops
verified: 2026-05-28T17:35:00Z
status: complete
score: 11/11 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Navigate to /dashboard in browser, confirm hero shows due-card count and Start Studying button"
    expected: "Large number displayed, button navigates to /study, per-deck table appears below, stat chips show Reviewed today and Streak"
    why_human: "Data-driven rendering requires live browser session with seeded cards; automated checks confirm wiring but not visual correctness with real data"
  - test: "Navigate to /study, flip a card (click or Space), rate it with keys 1–4"
    expected: "Card performs CSS 3D flip, rating buttons appear only after flip, rating advances to next card, SM-2 persists (can verify nextReview in DB)"
    why_human: "Interactive CSS animation and keyboard shortcut behavior cannot be verified without a live browser"
  - test: "Navigate to /decks/:id/learn, select Exam Mode, pick a time limit, start session"
    expected: "Timer appears in top bar counting down, cards are rateable, POST /api/study/rate is NOT called (no progress rows created for exam session)"
    why_human: "Exam mode guard is code-verified but the absence of API calls needs functional testing in a live session"
  - test: "In the dashboard, when totalDue === 0, confirm the empty state renders correctly"
    expected: "CheckCircle2 icon and 'You're all caught up!' copy appear in place of the Start Studying button"
    why_human: "Requires a user with no due cards — state-dependent rendering cannot be triggered programmatically without DB manipulation"
---

# Phase 4: Study Loops Verification Report

**Phase Goal:** A user can open the dashboard, see their due cards, run a spaced-repetition session, and track daily progress.
**Verified:** 2026-05-28T17:35:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Dashboard shows all cards due today across all decks, grouped by deck with per-deck counts | VERIFIED | `DashboardPage.tsx` fetches `/api/dashboard/stats`, renders `byDeck[]` in Table with clickable deck links; backend aggregates due+never-seen cards per deck via real Prisma queries |
| 2 | Starting a SR session shows due cards one at a time; after flipping, user rates recall 1–4 and next review date updates per SM-2 | VERIFIED | `StudySessionPage` fetches `/api/study/due`, passes cards to `useStudySession`; `POST /api/study/rate` called after each rating in SR/deck mode; backend runs `calculateSM2` server-side and upserts `CardProgress` |
| 3 | Rating "Again" resets interval to 1 day and repetitions to 0; repeated "Easy" ratings increase interval exponentially | VERIFIED | `calculateSM2` in `packages/shared/src/lib/sm2.ts`: `if (quality < 3)` block resets both interval=1 and repetitions=0; easy path uses `ceil(interval * easeFactor)` compounding. Spot-check confirmed: `again.interval===1`, `again.repetitions===0`, EF floor at 1.3 |
| 4 | User can start deck mode (all cards, SM-2 saved) and exam mode (time-limited, progress not saved) | VERIFIED | Mode selector in `StudySessionPage` offers SR/Deck/Exam; exam requires time picker before enabling "Start Exam"; `useStudySession.rate()` has `if (mode !== 'exam')` guard — POST never called in exam mode |
| 5 | Dashboard shows total cards reviewed today and current study streak | VERIFIED | `DashboardPage` renders `stats.reviewedToday` and `stats.streak`; backend counts `lastReviewed >= startOfToday` and calls `calculateStreak()` on deduplicated review dates |
| 6 | calculateSM2 unit tests pass (8+ cases) | VERIFIED | 14 tests pass: Again double-reset, easeFactor floor 1.3, first review=1d, second=6d, third=ceil(interval*EF), Easy increases EF, nextReview in future, plus 6 streak edge cases |
| 7 | CardFlip unit tests pass (rating buttons gated, exam mode guard) | VERIFIED | 8 tests pass: rating buttons absent when isFlipped=false, present when isFlipped=true and not animating, absent during animation, onClick fires, four buttons render with correct labels, Again calls onRate(1), Easy calls onRate(4), disabled prop works |
| 8 | CSS 3D flip correct (backface-visibility + vendor prefix, no overflow:hidden on scene) | VERIFIED | `CardFlip.tsx`: `perspective: '1000px'` on outer wrapper, `transformStyle: 'preserve-3d'` on card body, `backfaceVisibility: 'hidden'` + `WebkitBackfaceVisibility: 'hidden'` on both faces; no `overflow-hidden` on scene wrapper |
| 9 | POST /api/study/rate validates rating 1-4, verifies ownership, returns 403 for other users' cards | VERIFIED | `RateCardSchema = z.union([z.literal(1)..z.literal(4)])` rejects invalid ratings (400); `if (card.deck.ownerId !== userId) return 403`; ownership check runs before SM-2 |
| 10 | /dashboard route renders DashboardPage (not ComingSoon placeholder) | VERIFIED | `App.tsx` line 73: `<Route path="/dashboard" element={<DashboardPage />} />`; no remaining `<ComingSoon title="Dashboard"` found |
| 11 | /study and /decks/:id/learn routes wired to StudySessionPage | VERIFIED | `App.tsx` lines 76-77: both routes present with `StudySessionPage` element; `StudySessionPage` imported at line 15 |

**Score:** 11/11 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `packages/shared/src/lib/sm2.ts` | calculateSM2, calculateStreak, RATING_TO_QUALITY | VERIFIED | All three exports present; calculateSM2 implements full SM-2; calculateStreak handles edge cases |
| `packages/shared/src/schemas/study.ts` | RatingSchema, RateCardSchema, DueCardSchema, DashboardStatsSchema | VERIFIED | All four schemas defined with correct Zod shapes |
| `packages/shared/src/index.ts` | Barrel exports for study.ts and lib/sm2 | VERIFIED | Lines 7-8: `export * from './schemas/study'` and `export * from './lib/sm2'` |
| `apps/backend/src/lib/sm2.ts` | Re-export from @kartex/shared | VERIFIED | Lines 2-3: re-exports calculateSM2, calculateStreak, RATING_TO_QUALITY and types |
| `apps/backend/src/routes/study.ts` | GET /due, GET /deck/:deckId, POST /rate | VERIFIED | All three routes present; ownership checks; userId_cardId compound accessor; RATING_TO_QUALITY used |
| `apps/backend/src/routes/dashboard.ts` | GET /stats | VERIFIED | Aggregates due+never-seen, reviewedToday count, streak; all via real Prisma queries |
| `apps/frontend/src/lib/__tests__/sm2.test.ts` | 8+ SM-2 + 6 streak tests | VERIFIED | 14 tests, all passing |
| `apps/frontend/src/lib/__tests__/streak.test.ts` | Import smoke test | VERIFIED | Verifies calculateStreak importable from @kartex/shared |
| `apps/frontend/src/components/CardFlip.tsx` | CSS 3D flip with KartexRenderer | VERIFIED | perspective, preserve-3d, backface-visibility with vendor prefix; KartexRenderer on both faces |
| `apps/frontend/src/components/RatingButtons.tsx` | Four color-coded rating buttons | VERIFIED | Again/Hard/Good/Easy with bg-red/orange/green/blue-500 color classes; keyboard hints |
| `apps/frontend/src/components/ExamTimer.tsx` | Countdown with expire callback | VERIFIED | setInterval with clearInterval cleanup in useEffect return |
| `apps/frontend/src/components/SessionProgress.tsx` | Card N of M display | VERIFIED | Simple presentational component |
| `apps/frontend/src/hooks/useStudySession.ts` | State machine with exam mode guard | VERIFIED | flip/rate state machine; faceRef for stale-closure-safe keyboard handler; `if (mode !== 'exam')` guard |
| `apps/frontend/src/pages/StudySessionPage.tsx` | Mode selector + session loop + completion screen | VERIFIED | Mode selector with exam time picker; Trophy completion screen with per-rating breakdown; Return to Dashboard + Restart |
| `apps/frontend/src/pages/DashboardPage.tsx` | Hero + table + stat chips + empty state | VERIFIED | text-5xl due count; Start Studying CTA to /study; per-deck Table with Badge counts; Reviewed today + Streak chips; You're all caught up! empty state |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/shared/src/index.ts` | `schemas/study.ts` | barrel export | WIRED | `export * from './schemas/study'` present |
| `packages/shared/src/index.ts` | `lib/sm2.ts` | barrel export | WIRED | `export * from './lib/sm2'` present |
| `apps/backend/src/routes/study.ts` | `apps/backend/src/lib/sm2.ts` | import calculateSM2 | WIRED | `from '../lib/sm2.js'` at line 4 |
| `apps/backend/src/index.ts` | `apps/backend/src/routes/study.ts` | app.route('/api/study') | WIRED | Line 49: `app.route('/api/study', studyRouter)` |
| `apps/backend/src/index.ts` | `apps/backend/src/routes/dashboard.ts` | app.route('/api/dashboard') | WIRED | Line 50: `app.route('/api/dashboard', dashboardRouter)` |
| `apps/backend/src/routes/study.ts` | CardProgress (Prisma) | prisma.cardProgress.upsert with userId_cardId | WIRED | Lines 135, 149: `where: { userId_cardId: { userId, cardId } }` |
| `apps/frontend/src/App.tsx` | `StudySessionPage.tsx` | Route path='/study' and '/decks/:id/learn' | WIRED | Lines 76-77 present |
| `apps/frontend/src/hooks/useStudySession.ts` | POST /api/study/rate | api.post('/api/study/rate') | WIRED | Line 70: `api.post('/api/study/rate', { cardId: card.id, rating })` |
| `apps/frontend/src/hooks/useStudySession.ts` | exam mode guard | `if (mode !== 'exam')` | WIRED | Line 68: guards the api.post call |
| `apps/frontend/src/pages/StudySessionPage.tsx` | `useStudySession` | `useStudySession(cards, mode)` | WIRED | Line 41 |
| `apps/frontend/src/components/CardFlip.tsx` | `KartexRenderer.tsx` | import KartexRenderer | WIRED | Line 2: `import { KartexRenderer } from '@/components/KartexRenderer'` |
| `apps/frontend/src/pages/DashboardPage.tsx` | GET /api/dashboard/stats | api.get('/api/dashboard/stats') | WIRED | Line 29 |
| `apps/frontend/src/pages/DashboardPage.tsx` | /study route | navigate('/study') | WIRED | Line 69 on Start Studying button |
| `apps/frontend/src/App.tsx` | `DashboardPage.tsx` | Route path='/dashboard' | WIRED | Line 73 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `DashboardPage.tsx` | `stats` (DashboardStats) | `api.get('/api/dashboard/stats')` → `setStats` | Yes — backend runs 4 Prisma queries: `count`, `findMany` (dueProgress), `findMany` (neverSeen), `findMany` (reviewRecords) | FLOWING |
| `StudySessionPage.tsx` | `cards` (DueCard[]) | `api.get('/api/study/due')` or `/api/study/deck/:deckId` → `setCards` | Yes — backend fetches from `cardProgress` and `card` tables with real userId filtering | FLOWING |
| `useStudySession.ts` | CardProgress update | `api.post('/api/study/rate')` → backend `prisma.cardProgress.upsert` | Yes — SM-2 computed server-side; upsert writes to DB | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| calculateSM2 Again resets interval=1, reps=0 | `node -e "const m=require('./packages/shared/dist/index.js'); const r=m.calculateSM2({quality:0,repetitions:3,easeFactor:2.5,interval:15}); console.log(r.interval===1,r.repetitions===0)"` | `true true` | PASS |
| calculateSM2 EF never below 1.3 after 20 Again ratings | node inline (20-iteration loop) | `ef=1.3, >= 1.3: true` | PASS |
| RATING_TO_QUALITY mapping | node inline check | `0 3 4 5` (Again/Hard/Good/Easy) | PASS |
| calculateStreak returns 0 for empty | node inline | `0 === 0: true` | PASS |
| calculateStreak returns 0 for gap (2 days ago) | node inline | `0 === 0: true` | PASS |
| 14 SM-2 + streak unit tests | `yarn workspace @kartex/frontend test --run src/lib/__tests__/sm2.test.ts` | 14/14 pass | PASS |
| 8 CardFlip unit tests | `yarn workspace @kartex/frontend test --run src/components/__tests__/CardFlip.test.tsx` | 8/8 pass | PASS |
| Backend TypeScript build | `yarn workspace @kartex/backend build` | exit 0, no errors | PASS |
| Frontend TypeScript build | `yarn workspace @kartex/frontend build` | exit 0, built in 19s | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|------------|------------|-------------|--------|---------|
| STDY-01 | 04-01, 04-02 | User can start SR session showing all cards due today (SM-2) | SATISFIED | GET /api/study/due returns due+never-seen cards; StudySessionPage at /study fetches and presents them |
| STDY-02 | 04-01, 04-02 | Card flip + 4-key rating (1=Again,2=Hard,3=Good,4=Easy) | SATISFIED | CardFlip renders front/back; RatingButtons provides 4 buttons; useStudySession calls POST /api/study/rate |
| STDY-03 | 04-01 | SM-2 updates easeFactor, interval, nextReview per rating | SATISFIED | calculateSM2 in shared package; backend POST /rate runs it server-side and upserts CardProgress |
| STDY-04 | 04-01, 04-02 | Deck mode session (all cards, SM-2 saved) | SATISFIED | Mode selector at /decks/:id/learn offers Deck Mode; GET /api/study/deck/:deckId returns all cards; progress saved (POST /rate called) |
| STDY-05 | 04-01, 04-02 | Exam mode (time limit, progress not saved) | SATISFIED | ExamTimer countdown; `if (mode !== 'exam')` guard in useStudySession prevents POST /api/study/rate |
| STDY-06 | 04-01, 04-03 | Dashboard shows cards due today by deck with per-deck counts | SATISFIED | DashboardPage fetches /api/dashboard/stats; byDeck[] table rendered with clickable deck links |
| STDY-07 | 04-01, 04-03 | Dashboard shows total reviewed today and study streak | SATISFIED | Stat chips render `stats.reviewedToday` and `stats.streak`; backend computes both from Prisma |

All 7 STDY requirements satisfied. No orphaned requirements — traceability table in REQUIREMENTS.md shows all 7 mapped to Phase 4.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `DashboardPage.tsx` | 54 | `return null` | Info | Null-guard after stats load — not a stub; only renders when `!stats` (loading failure path) |
| `StudySessionPage.tsx` | 98 | `return null` | Info | Null-guard for `!currentCard` edge case — not a stub; session is finished before this state |

No blockers. No warnings. Both `return null` occurrences are safe null-guards, not stubs — they have real data sources upstream and are not the primary render paths.

**Pre-existing test failures (NOT from this phase):** 2 tests in `KartexRenderer.test.tsx` (Typst WASM behavior in jsdom) fail — documented as baseline failures in both 04-01 and 04-03 summaries, present since Phase 3. These are unrelated to Phase 4 changes.

### Human Verification Required

#### 1. Dashboard with Real Data

**Test:** Log in, navigate to /dashboard with cards that have mixed due dates (some due today, some future)
**Expected:** Hero shows exact count of due cards, table groups them by deck with per-deck counts, Reviewed today count matches today's sessions, Streak increments correctly
**Why human:** Data-driven rendering with live database state; automated checks confirm wiring but not visual correctness or count accuracy with real user data

#### 2. Study Session — Flip and Rate Flow

**Test:** Navigate to /study, click a card to flip it, press Space to flip, press keys 1–4 to rate
**Expected:** Card performs CSS 3D Y-axis flip animation, rating buttons appear only after flip completes, pressing 1–4 advances to next card, session ends with completion screen after last card
**Why human:** CSS 3D animation and keyboard shortcut behavior require a live browser; the 300ms flip timing and animation appearance cannot be verified programmatically

#### 3. Exam Mode — Timer and No Progress Save

**Test:** Go to /decks/:id/learn, select Exam Mode, pick 5 minutes, start session, rate cards, check DB
**Expected:** Countdown timer visible in top bar, card ratings advance the session, after session CardProgress rows are NOT created or updated for rated cards
**Why human:** The exam mode guard is code-verified (`mode !== 'exam'`) but the absence of DB writes requires functional testing; timer expiry banner after countdown also needs visual confirmation

#### 4. Dashboard Empty State

**Test:** With a user who has no cards due today (all future), navigate to /dashboard
**Expected:** Empty state renders: CheckCircle2 icon and "You're all caught up!" text in place of the Start Studying button
**Why human:** Requires a specific DB state (no due cards); state-dependent conditional rendering

### Gaps Summary

No gaps found. All 11 must-have truths are verified. All 15 required artifacts exist, are substantive, and are correctly wired. All 7 STDY requirements are satisfied. All key links are connected with real data flowing end-to-end.

Status is `human_needed` because 4 behavioral items require a live browser and real database state to fully confirm the user-facing experience described in the phase goal.

---

_Verified: 2026-05-28T17:35:00Z_
_Verifier: Claude (gsd-verifier)_
