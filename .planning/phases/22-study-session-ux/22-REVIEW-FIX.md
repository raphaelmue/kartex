---
phase: 22-study-session-ux
fixed_at: 2026-06-15T00:00:00Z
review_path: .planning/phases/22-study-session-ux/22-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 22: Code Review Fix Report

**Fixed at:** 2026-06-15T00:00:00Z
**Source review:** .planning/phases/22-study-session-ux/22-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (2 Critical, 4 Warning)
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: Global SR `loadCards` builds `/api/study/deck/undefined` instead of `/api/study/due`

**Files modified:** `apps/frontend/src/pages/StudySessionPage.tsx`
**Commit:** b1c7414
**Applied fix:** Added an early-return guard before the endpoint construction: when `mode !== 'sr'` and `deckId` is `undefined`, the function calls `toast.error` and returns immediately, preventing the `/api/study/deck/undefined` fetch. Also added non-null assertion (`deckId!`) on the else-branch to make the structural invariant explicit.

---

### CR-02: Missing `t` in `loadCards` `useEffect` dependency array causes stale translations on language change

**Files modified:** `apps/frontend/src/pages/StudySessionPage.tsx`
**Commit:** b1c7414
**Applied fix:** Added `t` to the `loadCards` effect dependency array, changing `[committedConfig, deckId]` to `[committedConfig, deckId, t]`. This ensures the effect re-runs when the interface language changes, so error toasts always use the current translation function.

---

### WR-01: `mockStudyMode.current` mutation does not affect the mock factory — stale capture in tests

**Files modified:** `apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx`
**Commit:** fc8337f
**Applied fix:** Replaced the shared `mockStudyMode` object pattern with a `vi.fn()` factory: `const mockUseAuth = vi.hoisted(() => vi.fn())` with `vi.mock('@/context/AuthContext', () => ({ useAuth: mockUseAuth }))`. Added a `makeAuthValue(studyMode)` helper factory. Added a top-level `beforeEach` that calls `mockUseAuth.mockReturnValue(makeAuthValue())` to set the default. Updated all SM2-04 test usages (`beforeEach`, `afterEach`, and per-test assignments) to use `mockUseAuth.mockReturnValue(makeAuthValue('intensive'))` etc.

---

### WR-02: `study.nCardsDue` and `study.nCardsTotal` lack plural suffixes — broken singular form

**Files modified:** `apps/frontend/src/locales/en.json`, `apps/frontend/src/locales/de.json`
**Commit:** 6b342aa
**Applied fix:** Split the flat `nCardsDue` and `nCardsTotal` keys into `_one`/`_other` variants in both locale files. English: `nCardsDue_one: "{{count}} card due"` / `nCardsDue_other: "{{count}} cards due"` and `nCardsTotal_one: "{{count}} card total"` / `nCardsTotal_other: "{{count}} cards total"`. German: `nCardsDue_one: "{{count}} Karte fällig"` / `nCardsDue_other: "{{count}} Karten fällig"` and `nCardsTotal_one: "{{count}} Karte gesamt"` / `nCardsTotal_other: "{{count}} Karten gesamt"`.

---

### WR-03: `parseInt` in exam duration `onValueChange` receives no fallback — `NaN` silently stored

**Files modified:** `apps/frontend/src/pages/StudySessionPage.tsx`
**Commit:** b1c7414
**Applied fix:** Replaced the inline `onValueChange={(val) => setExamDurationSeconds(parseInt(val, 10))}` with a guarded version that only calls `setExamDurationSeconds(n)` if `!isNaN(n)`, preventing `NaN` from being stored in state.

---

### WR-04: `handleRestart` calls `window.location.reload()` — breaks in test environments and loses SPA state silently

**Files modified:** `apps/frontend/src/pages/StudySessionPage.tsx`
**Commit:** b1c7414
**Applied fix:** The fix required lifting the restart logic out of `SessionRunner` (which has no access to the parent's state setters) into `StudySessionPage`. Added an `onRestart: () => void` prop to `SessionRunner`. In `StudySessionPage`, added a `handlePageRestart` function that resets `committedConfig`, `cards`, `selectedTags`, `sessionSize`, and (for deck-specific paths) `selectedMode` back to `null`. `handleRestart` in `SessionRunner` now simply calls `onRestart()`. The `SessionRunner` JSX call site in `StudySessionPage` passes `onRestart={handlePageRestart}`.

---

_Fixed: 2026-06-15T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
