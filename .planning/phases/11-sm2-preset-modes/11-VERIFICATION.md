---
phase: 11-sm2-preset-modes
verified: 2026-06-02T17:00:00Z
status: human_needed
score: 7/7 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Verify /settings page persists mode across logout and re-login"
    expected: "After selecting Intensive, logging out, and logging back in, the /settings page still shows Intensive pre-selected; the RadioGroup reflects the persisted value from the server"
    why_human: "Requires a live browser session with real auth cookies and a running DB — cannot verify cookie/session round-trip with grep"
  - test: "Verify rating a card in Intensive mode schedules it sooner than Normal mode"
    expected: "POST /api/study/rate response nextReview is earlier when studyMode=intensive than when studyMode=normal, all other inputs equal; SM2-02 functional correctness"
    why_human: "Requires a running backend with real DB and controlled test data — cannot verify multiplier arithmetic side-effects from static analysis alone"
  - test: "Verify the mode indicator Badge is visually adjacent to the session progress in the study session header"
    expected: "When Intensive mode is active, the 'Intensive' badge appears next to the 'Card X of Y' progress indicator in the session header area, not elsewhere in the UI"
    why_human: "CSS layout and visual positioning cannot be verified from code; requires rendering in a browser"
---

# Phase 11: SM-2 Preset Modes Verification Report

**Phase Goal:** Users can select a study mode (Normal / Intensive / Exam Prep) from Settings that adjusts how aggressively their review intervals are compressed. The raw CardProgress.interval is never modified.
**Verified:** 2026-06-02T17:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | /settings page shows a study mode selector with three options replacing the ComingSoon placeholder | VERIFIED | `App.tsx` line 83: `<Route path="/settings" element={<SettingsPage />} />`; `SettingsPage.tsx` renders a RadioGroup with STUDY_MODE_OPTIONS for normal/intensive/exam_prep |
| 2 | Selected study mode persists server-side (stored in User.studyMode, applied at POST /rate) | VERIFIED | `auth.ts` PATCH /me persists via `prisma.user.update`; `study.ts` fetches `ratingUser?.studyMode` from DB at POST /rate |
| 3 | Raw SM-2 interval in CardProgress is never modified by the multiplier | VERIFIED | `study.ts` upsert update+create both use `interval: sm2.interval` (raw); only `nextReview: adjustedNextReview` uses the multiplier |
| 4 | Non-Normal study session shows a visible mode indicator in the session header | VERIFIED | `StudySessionPage.tsx` line 155-158: conditional `{studyMode !== 'normal' && <Badge variant="secondary">...}` adjacent to SessionProgress |
| 5 | StudyModeSchema, UpdateStudyModeSchema, and extended UserSchema are exported from shared | VERIFIED | `packages/shared/src/schemas/user.ts`: exports `StudyModeSchema`, `StudyMode`, `UpdateStudyModeSchema`, `UpdateStudyModeInput`; `UserSchema` includes `studyMode: StudyModeSchema.default('normal')` |
| 6 | AuthContext User interface carries studyMode | VERIFIED | `AuthContext.tsx` line 12: `studyMode: string` in User interface; `setUser(data)` propagates full API response including studyMode |
| 7 | Both locale files have all settings.* keys including nested modeNames | VERIFIED | `en.json` lines 309-324 and `de.json` lines 309-324 both contain complete `settings` object with `modeNames.normal/intensive/exam_prep` and all description keys |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/shared/src/schemas/user.ts` | StudyModeSchema, extended UserSchema, UpdateStudyModeSchema | VERIFIED | All three exports present; `z.enum(['normal','intensive','exam_prep'])` defined; `studyMode: StudyModeSchema.default('normal')` after `isActive`; `UpdateStudyModeSchema = z.object({ studyMode: StudyModeSchema })` |
| `apps/frontend/src/context/AuthContext.tsx` | studyMode field in User interface | VERIFIED | `studyMode: string` at line 12 in User interface |
| `apps/frontend/src/locales/en.json` | settings.* keys including modeNames | VERIFIED | All 10 settings keys present including nested `modeNames.normal/intensive/exam_prep` |
| `apps/frontend/src/locales/de.json` | German settings.* keys | VERIFIED | Identical key structure with German values; JSON parses as valid |
| `apps/backend/src/routes/auth.ts` | GET /me with studyMode; PATCH /me with inline authMiddleware | VERIFIED | GET /me select at line 211: `studyMode: true`; PATCH /me at line 223 with `authMiddleware` as 2nd arg; `UpdateStudyModeSchema.safeParse` validates body |
| `apps/backend/src/routes/study.ts` | STUDY_MODE_MULTIPLIERS constant; multiplier applied to nextReview only | VERIFIED | Lines 8-12: `STUDY_MODE_MULTIPLIERS = { normal: 1.0, intensive: 0.5, exam_prep: 0.25 }`; `adjustedNextReview` at lines 187-191; upsert stores raw `interval: sm2.interval` |
| `apps/frontend/src/components/ui/radio-group.tsx` | shadcn RadioGroup + RadioGroupItem | VERIFIED | Exports `RadioGroup` and `RadioGroupItem` wrapping `@radix-ui/react-radio-group` with forwardRef + cn() pattern |
| `apps/frontend/src/pages/SettingsPage.tsx` | Settings page with study mode selector and auto-save | VERIFIED | 98 lines; named export `SettingsPage`; `handleModeChange` calls `api.patch('/api/auth/me', { studyMode: value })`; optimistic update + revert on failure; sonner toast feedback |
| `apps/frontend/src/App.tsx` | /settings route uses SettingsPage | VERIFIED | Line 18: `import { SettingsPage } from '@/pages/SettingsPage'`; line 83: `<Route path="/settings" element={<SettingsPage />} />` |
| `apps/frontend/src/pages/StudySessionPage.tsx` | Mode indicator Badge in session header | VERIFIED | Lines 8 and 18: Badge and useAuth imports; line 38/44: `studyMode: string` prop in SessionRunner; lines 155-158: conditional Badge render |
| `apps/frontend/src/pages/__tests__/SettingsPage.test.tsx` | SM2-01 test coverage (5 cases) | VERIFIED | 5 cases SM2-01a through SM2-01e covering render, pre-selection, PATCH call, optimistic update, and error revert |
| `apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx` | useAuth mock + SM2-04 indicator cases | VERIFIED | `vi.mock('@/context/AuthContext')` with mutable `mockStudyMode` holder; `describe('StudySessionPage mode indicator (SM2-04)')` with SM2-04a/b/c |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `packages/shared/src/schemas/user.ts` | `UserResponseSchema` | `UserResponseSchema = UserSchema` alias | VERIFIED | Line 21: `export const UserResponseSchema = UserSchema` — studyMode inherited automatically |
| `packages/shared/src/index.ts` | `StudyModeSchema` | `export * from './schemas/user'` | VERIFIED | Re-export pattern confirmed in shared package |
| `apps/backend/src/routes/auth.ts` PATCH /me | `UpdateStudyModeSchema` | import from @kartex/shared; safeParse | VERIFIED | Line 5: `UpdateStudyModeSchema` in import; line 224: `.safeParse(await c.req.json())` |
| `apps/backend/src/routes/study.ts` POST /rate | `CardProgress.nextReview` | `adjustedNextReview = today + ceil(interval * multiplier)` | VERIFIED | Lines 187-191: `adjustedNextReview.setDate(...)` with `Math.max(1, Math.ceil(sm2.interval * multiplier))`; used in upsert update+create |
| `apps/backend/src/routes/study.ts` POST /rate upsert | `CardProgress.interval` | `interval: sm2.interval` (raw, never multiplied) | VERIFIED | Lines 198 and 207: `interval: sm2.interval` in both update and create branches |
| `apps/frontend/src/pages/SettingsPage.tsx` | PATCH /api/auth/me | `api.patch('/api/auth/me', { studyMode: value })` | VERIFIED | Line 48: `const res = await api.patch('/api/auth/me', { studyMode: value })` |
| `apps/frontend/src/pages/SettingsPage.tsx` | `useAuth setUser` | optimistic update then revert on error | VERIFIED | Lines 46 and 53: `setUser({ ...user, studyMode: value })` and revert to `previous` |
| `apps/frontend/src/pages/StudySessionPage.tsx` | SessionRunner studyMode prop | `useAuth().user?.studyMode` passed from StudySessionPage | VERIFIED | Line 330: `const { user } = useAuth()`; line 716: `studyMode={user?.studyMode ?? 'normal'}` |
| `apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx` | useAuth mock | `vi.mock('@/context/AuthContext', ...)` with mutable `mockStudyMode` | VERIFIED | Lines 39-54: hoisted mockStudyMode holder; mock returns `studyMode: mockStudyMode.current` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `SettingsPage.tsx` | `user?.studyMode` | `useAuth()` → GET /api/auth/me → `prisma.user.findUnique` with `studyMode: true` | Yes — DB select on every login/refresh | FLOWING |
| `StudySessionPage.tsx` SessionRunner | `studyMode` prop | `useAuth().user?.studyMode` → same AuthContext pipeline | Yes — same DB select | FLOWING |
| `apps/backend/src/routes/study.ts` POST /rate | `ratingUser?.studyMode` | `prisma.user.findUnique({ select: { studyMode: true } })` in Promise.all | Yes — live DB query per rating | FLOWING |
| PATCH /me response | Updated user with studyMode | `prisma.user.update` → returns updated row | Yes — writes to DB and returns updated value | FLOWING |

### Behavioral Spot-Checks

Static-analysis only — no running server available for live API checks.

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| `STUDY_MODE_MULTIPLIERS` constant at module scope | `grep -n 'STUDY_MODE_MULTIPLIERS' apps/backend/src/routes/study.ts` | Lines 8-12: constant defined with normal=1.0, intensive=0.5, exam_prep=0.25 | PASS |
| `interval: sm2.interval` (raw) in upsert | `grep -n 'interval: sm2.interval' apps/backend/src/routes/study.ts` | Lines 198 and 207: raw interval in both update and create | PASS |
| `nextReview: adjustedNextReview` in upsert | `grep -n 'nextReview: adjustedNextReview' apps/backend/src/routes/study.ts` | Lines 200 and 210: adjusted nextReview in both update and create | PASS |
| `/settings route uses SettingsPage (not ComingSoon)` | `grep -n 'settings' apps/frontend/src/App.tsx` | Line 83: `<SettingsPage />` confirmed; no ComingSoon on /settings | PASS |
| PATCH /me has `authMiddleware` inline | `grep -n 'auth.patch' apps/backend/src/routes/auth.ts` | Line 223: `auth.patch('/me', authMiddleware, async (c) => {` | PASS |

### Probe Execution

No declared probes in PLAN files. No conventional `scripts/*/tests/probe-*.sh` files exist for this phase. Step 7c: SKIPPED (no probes declared or found).

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| SM2-01 | 11-01, 11-03, 11-04 | User can choose a study mode: Normal, Intensive, Exam Prep | SATISFIED | SettingsPage renders RadioGroup with three options; sourced from useAuth; auto-saves via PATCH /me; test coverage in SettingsPage.test.tsx (SM2-01a–SM2-01e) |
| SM2-02 | 11-02 | Study mode stored server-side and applied at POST /api/study/rate — not client-side | SATISFIED | `study.ts` fetches `ratingUser.studyMode` from DB (not from request body); `STUDY_MODE_MULTIPLIERS` applied post-calculateSM2 |
| SM2-03 | 11-03 | /settings page shows a study mode selector (replaces ComingSoon) | SATISFIED | App.tsx line 83: SettingsPage replaces ComingSoon on /settings route; RadioGroup with three options confirmed |
| SM2-04 | 11-02, 11-04 | SM-2 interval multiplier affects only nextReviewAt; CardProgress.interval never modified | SATISFIED | `study.ts` upsert: `interval: sm2.interval` (raw) in both update and create; `nextReview: adjustedNextReview` (multiplied) — invariant verified at code level; SM2-04 test cases in StudySessionPage.test.tsx cover the indicator, though the interval invariant is a backend concern verified by code inspection |

**Note on plan requirement labeling:** Plan 11-02 frontmatter declares `requirements: [SM2-01, SM2-02, SM2-03]`. The inclusion of SM2-03 in a backend-only plan is a labeling artifact — Plan 11-02 does not implement the settings UI (SM2-03). The actual SM2-03 implementation is in Plan 11-03. This is a planning metadata issue only; all four requirements are implemented and traceable.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/frontend/src/pages/StudySessionPage.tsx` | 659 | `placeholder={t('study.selectTimeLimit')}` | Info | SelectValue placeholder attribute — standard UI placeholder, not a stub; pre-existing from Phase 8 |

No blockers found. No TBD/FIXME/XXX markers in any Phase 11 modified files.

### Human Verification Required

#### 1. Settings Page Persistence Across Logout/Re-login

**Test:** Navigate to /settings, select "Intensive", log out, log back in, navigate to /settings again.
**Expected:** The RadioGroup shows "Intensive" pre-selected; the mode was persisted server-side and returned by GET /api/auth/me after re-login. This validates ROADMAP Success Criterion 1: "the selected mode persists after logout and re-login."
**Why human:** Requires a live browser session with real auth cookies, running Postgres, and JWT-based session round-trip — cannot be verified by static code analysis.

#### 2. Interval Compression Functional Correctness (ROADMAP Success Criterion 2)

**Test:** With a user in Normal mode, rate a card as "Good" and record the `nextReview` date in the API response. Switch to Intensive mode, rate the same card "Good" again (or a fresh card with same SM-2 state), and record the `nextReview` date.
**Expected:** The Intensive mode nextReview is earlier than the Normal mode nextReview. For a card with interval=1, Normal schedules tomorrow, Intensive schedules tomorrow (Math.max(1, ceil(1*0.5))=1). For interval=4, Normal schedules +4 days, Intensive schedules +2 days. The API response `nextReview` field shows the compressed schedule.
**Why human:** Requires a running backend with real DB and controlled card state; the multiplier arithmetic is verified by code review but end-to-end scheduling behavior needs functional testing.

#### 3. Mode Indicator Badge Visual Position

**Test:** With Intensive mode active, start a study session and reach the card review screen.
**Expected:** A "Intensive" badge appears visually adjacent to the "Card X of Y" session progress indicator in the session header area — not in a footer or elsewhere.
**Why human:** CSS layout and visual adjacency of the Badge relative to SessionProgress cannot be determined from code; requires browser rendering to confirm the `flex items-center gap-2` container positions them correctly.

### Gaps Summary

No gaps. All 7 observable truths are verified, all artifacts are substantive and wired, all key links are connected, and data flows from DB through to UI for all dynamic data points. The 3 human verification items address functional correctness and visual behavior that require a running application — they do not indicate incomplete implementation.

---

_Verified: 2026-06-02T17:00:00Z_
_Verifier: Claude (gsd-verifier)_
