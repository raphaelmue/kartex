---
phase: 11-sm2-preset-modes
plan: "04"
subsystem: frontend-ui
tags: [react, badge, useauth, vitest, testing, sm2, study-mode]
dependency_graph:
  requires:
    - Badge component (04-03)
    - useAuth / AuthContext with studyMode field (11-01)
    - SettingsPage with STUDY_MODE_OPTIONS using settings.modeNames.* keys (11-03)
    - SessionRunner in StudySessionPage (prior phases)
  provides:
    - apps/frontend/src/pages/StudySessionPage.tsx (mode indicator Badge in SessionRunner)
    - apps/frontend/src/pages/__tests__/SettingsPage.test.tsx (SM2-01 coverage)
    - apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx (SM2-04 coverage + useAuth mock)
  affects:
    - apps/frontend/src/pages/StudySessionPage.tsx
    - apps/frontend/src/pages/__tests__/SettingsPage.test.tsx
    - apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx
tech_stack:
  added: []
  patterns:
    - Conditional Badge render adjacent to SessionProgress in session header
    - vi.hoisted mutable holder (mockStudyMode) for per-test studyMode override
    - i18next initialized from en.json in test/setup.ts — t() returns real translations (not keys)
key_files:
  created:
    - apps/frontend/src/pages/__tests__/SettingsPage.test.tsx
  modified:
    - apps/frontend/src/pages/StudySessionPage.tsx
    - apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx
decisions:
  - "i18n returns real translations in test env (not keys) — test/setup.ts loads en.json; assert 'Normal'/'Intensive'/'Exam Prep', not key strings"
  - "Badge text uses t(settings.modeNames.intensive) which resolves to 'Intensive' via en.json — SM2-04b/c asserts translated strings"
  - "mockStudyMode.current = 'normal' default means all 15 pre-existing StudySessionPage tests remain unaffected (Badge not rendered in Normal mode)"
metrics:
  duration: "~8 min"
  completed: "2026-06-02"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 3
---

# Phase 11 Plan 04: Mode Indicator + Test Coverage Summary

**One-liner:** StudySessionPage now imports useAuth and shows a secondary Badge in the session header when studyMode is non-Normal; SettingsPage.test.tsx adds 5 SM2-01 cases; StudySessionPage.test.tsx adds useAuth mock and 3 SM2-04 indicator cases.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add useAuth + studyMode prop to StudySessionPage + SessionRunner Badge | 7dee6d9 | apps/frontend/src/pages/StudySessionPage.tsx |
| 2 | Create SettingsPage.test.tsx with SM2-01a through SM2-01e | 2a83880 | apps/frontend/src/pages/__tests__/SettingsPage.test.tsx |
| 3 | Add useAuth mock + SM2-04 cases to StudySessionPage.test.tsx | c00d335 | apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx |

## What Was Built

### Task 1 — Mode indicator in StudySessionPage

- Added `import { Badge } from '@/components/ui/badge'` and `import { useAuth } from '@/context/AuthContext'`
- Added `studyMode: string` prop to `SessionRunner` interface and destructuring
- Added conditional Badge alongside `SessionProgress` in the session header:
  ```tsx
  <div className="flex items-center gap-2">
    <SessionProgress current={progress.current} total={progress.total} />
    {studyMode !== 'normal' && (
      <Badge variant="secondary" className="text-xs shrink-0">
        {t(`settings.modeNames.${studyMode}`)}
      </Badge>
    )}
  </div>
  ```
- `StudySessionPage` calls `const { user } = useAuth()` and passes `studyMode={user?.studyMode ?? 'normal'}` to `SessionRunner`
- `yarn workspace @kartex/frontend run build` exits 0

### Task 2 — SettingsPage.test.tsx

- Created with 5 test cases (SM2-01a through SM2-01e)
- Mocks: react-router-dom (useNavigate), @/lib/api (mockApiPatch via vi.hoisted), sonner (toast), @/context/AuthContext (mutable mockUser holder)
- SM2-01a: asserts `Normal`, `Intensive`, `Exam Prep` labels render (real translations from en.json)
- SM2-01b: asserts RadioGroupItem `data-state="checked"` for pre-selected mode
- SM2-01c: asserts `mockApiPatch` called with `{ studyMode: 'exam_prep' }`
- SM2-01d: asserts `mockSetUser` called with `studyMode: 'intensive'` + `toast.success` called
- SM2-01e: asserts `mockSetUser` called twice (optimistic + revert) and `toast.error` called
- All 5 pass

### Task 3 — StudySessionPage.test.tsx extension

- Added `vi.mock('@/context/AuthContext', ...)` with mutable `mockStudyMode` holder (default `'normal'`)
- Removed stale "No useAuth mock" comment
- Added `describe('StudySessionPage mode indicator (SM2-04)', ...)` block with 3 cases:
  - SM2-04a: no Badge rendered when studyMode='normal'
  - SM2-04b: 'Intensive' Badge shown when studyMode='intensive'
  - SM2-04c: 'Exam Prep' Badge shown when studyMode='exam_prep'
- All 18 tests pass (15 pre-existing + 3 new)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Badge text assertions use real translations, not i18n key strings**
- **Found during:** Task 2 (first test run)
- **Issue:** The plan's deviation note specified asserting key strings like `'settings.modeNames.normal'` because "Vitest react-i18next returns the key as-is". However, `apps/frontend/src/test/setup.ts` initializes i18next with `en.json` — `t()` returns real English translations (`'Normal'`, `'Intensive'`, `'Exam Prep'`), not keys.
- **Fix:** Updated SM2-01a assertions to use translated strings; updated SM2-04b/c in StudySessionPage.test.tsx to assert `'Intensive'` and `'Exam Prep'`
- **Files modified:** SettingsPage.test.tsx (SM2-01a), StudySessionPage.test.tsx (SM2-04b/c)
- **Commit:** 2a83880, c00d335

## Known Stubs

None. The Badge renders live studyMode from AuthContext; tests assert against real translated text.

## Threat Flags

No new security surface beyond the plan's threat model.

| Flag | File | Description |
|------|------|-------------|
| T-11-09 accepted | apps/frontend/src/pages/StudySessionPage.tsx | studyMode is non-sensitive user preference rendered via t() key lookup |
| T-11-10 accepted | apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx | Test mocks only set known enum values; production code gets studyMode from server |

## Self-Check: PASSED

- [x] apps/frontend/src/pages/StudySessionPage.tsx imports Badge and useAuth
- [x] SessionRunner props interface includes studyMode: string
- [x] SessionRunner body contains conditional Badge render when studyMode !== 'normal'
- [x] StudySessionPage calls useAuth() and passes studyMode={user?.studyMode ?? 'normal'} to SessionRunner
- [x] apps/frontend/src/pages/__tests__/SettingsPage.test.tsx exists with 5 SM2-01 cases
- [x] apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx has vi.mock('@/context/AuthContext') with mockStudyMode holder
- [x] StudySessionPage.test.tsx has describe('StudySessionPage mode indicator (SM2-04)') with 3 cases
- [x] All 23 tests pass (5 SettingsPage + 18 StudySessionPage)
- [x] yarn workspace @kartex/frontend run build exits 0
- [x] Commits: 7dee6d9, 2a83880, c00d335 — all exist in git log
