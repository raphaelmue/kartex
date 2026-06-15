---
phase: 22-study-session-ux
reviewed: 2026-06-15T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - apps/frontend/src/pages/StudySessionPage.tsx
  - apps/frontend/src/locales/en.json
  - apps/frontend/src/locales/de.json
  - apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx
  - apps/frontend/src/lib/shuffle.ts
  - apps/frontend/src/lib/__tests__/shuffle.test.ts
findings:
  critical: 2
  warning: 4
  info: 2
  total: 8
status: issues_found
---

# Phase 22: Code Review Report

**Reviewed:** 2026-06-15T00:00:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

The phase 22 implementation covers the study session UX: a `StudySessionPage` component with
mode selection, tag/size filtering, global SR start screen, deck badge, and SM-2 mode indicator,
backed by a `shuffle` utility and two test suites. The `shuffle` function itself is correct.
The locale files are structurally complete and consistent between EN and DE.

Two critical bugs exist: an endpoint construction crash for the global SR path when `deckId` is
`undefined`, and a `useEffect` missing `t` in its dependency array, producing a stale-translation
race. Four warnings surface around stale mock capture in the auth test, missing i18next plural
suffixes on two count-only keys, an unguarded `parseInt` in the exam timer input, and a missing
`t` dependency in the title effect that duplicates an already-present issue. Two info items note
minor matters.

---

## Critical Issues

### CR-01: Global SR `loadCards` builds `/api/study/deck/undefined` instead of `/api/study/due`

**File:** `apps/frontend/src/pages/StudySessionPage.tsx:448-450`

**Issue:** The endpoint selection logic reads:

```ts
const endpoint =
  mode === 'sr' && !deckId
    ? '/api/study/due'
    : `/api/study/deck/${deckId}`
```

For the global SR path (`isGlobalSR = true`, `deckId = undefined`) the committed config always
has `mode: 'sr'`, so the true-branch `/api/study/due` is correctly selected. However for `deck`
and `exam` modes the else-branch unconditionally interpolates `deckId`, which is `undefined` on
the global path. If a future caller ever sets `mode: 'deck'` or `mode: 'exam'` without a
`deckId`, the fetch becomes `/api/study/deck/undefined` — a silent 404 or server error that the
catch converts to a generic toast, losing all diagnostic information.

More critically today: when `isGlobalSR` is `true` and `mode === 'sr'`, the branch is correct.
But the condition depends on the closure-captured `deckId` route param, which is the same
`deckId` used to construct the else-branch URL. If `deckId` is `undefined` (global path) and
any non-sr mode were ever committed, the URL becomes a string literal `"/api/study/deck/undefined"`.
The current UI prevents this at runtime (global path forces `mode: 'sr'`), but the code has no
structural guard, making it a latent crash.

**Fix:** Guard the else-branch and assert `deckId` is defined there:

```ts
if (mode !== 'sr' && !deckId) {
  toast.error(t('study.couldNotLoad'))
  return
}
const endpoint =
  mode === 'sr' && !deckId
    ? '/api/study/due'
    : `/api/study/deck/${deckId!}`
```

---

### CR-02: Missing `t` in `loadCards` `useEffect` dependency array causes stale translations on language change

**File:** `apps/frontend/src/pages/StudySessionPage.tsx:492`

**Issue:** The `loadCards` effect uses `t('study.couldNotLoad')` in two branches (lines 484 and
487) but declares only `[committedConfig, deckId]` as its deps. If the user changes their
interface language mid-session, the effect does not re-run and the `t` function inside the
closure is stale, meaning any subsequent error toasts will show the old language. This is a
correctness bug for a multi-language app where language switching is an explicit feature.

The `title` effect on line 373 correctly lists `[t, i18n.language]`, establishing the project
convention that `t` must be in deps when used inside an effect.

**Fix:** Add `t` to the dependency array:

```ts
}, [committedConfig, deckId, t])
```

---

## Warnings

### WR-01: `mockStudyMode.current` mutation does not affect the mock factory — stale capture in tests

**File:** `apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx:39-53`

**Issue:** The `useAuth` mock factory closes over `mockStudyMode.current` at the time `vi.mock`
is evaluated (module-level, hoisted), not at call time:

```ts
const mockStudyMode = vi.hoisted(() => ({ current: 'normal' }))
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    ...
    studyMode: mockStudyMode.current,   // <-- evaluated once when factory is called
  }),
}))
```

The factory function `() => ({ useAuth: () => ({ ... studyMode: mockStudyMode.current }) })`
reads `mockStudyMode.current` each time `useAuth()` is invoked by a component, so the pattern
actually works at runtime. **However**, because `mockStudyMode` is declared as a plain object
wrapper, tests that set `mockStudyMode.current = 'intensive'` *after* `renderPage()` is called
but *before* the component reads from `useAuth` face a race: if `useAuth` has already been
called during the initial render before the test mutates `mockStudyMode.current`, the component
will see `'normal'`. The SM2-04b and SM2-04c tests set `mockStudyMode.current` only in
`beforeEach`, which runs before `renderPage()`, so they happen to be safe today. But because
`afterEach` resets via direct assignment (`mockStudyMode.current = 'normal'`) and the same
object reference is shared across all tests, any test that renders before the assignment
completes will see the wrong value. This is a test reliability hazard.

**Fix:** Use `mockReturnValue` / `mockImplementation` on a `vi.fn()` so each test controls the
return value explicitly and the module mock does not depend on object-property timing:

```ts
const mockUseAuth = vi.fn()
vi.mock('@/context/AuthContext', () => ({ useAuth: mockUseAuth }))

beforeEach(() => {
  mockUseAuth.mockReturnValue({ user: { ..., studyMode: 'normal' }, ... })
})
// In individual tests:
mockUseAuth.mockReturnValue({ user: { ..., studyMode: 'intensive' }, ... })
```

---

### WR-02: `study.nCardsDue` and `study.nCardsTotal` lack plural suffixes — broken singular form

**File:** `apps/frontend/src/locales/en.json:202,205`

**Issue:** i18next pluralization requires keys suffixed `_one` / `_other` (for English) when
`count` is passed. The keys `study.nCardsDue` and `study.nCardsTotal` are defined as flat
strings without plural variants:

```json
"nCardsDue": "{{count}} cards due",
"nCardsTotal": "{{count}} cards total"
```

When `count === 1`, i18next looks up `study.nCardsDue_one` (and `study.nCardsDue_other` for
plurals), finds neither, and falls back to the bare key — which produces "1 cards due" instead
of "1 card due". Compare with `common.nCards_one` / `common.nCards_other` and
`study.nMinutes_one` / `study.nMinutes_other`, both of which are correctly pluralized.

The German locale has the same defect: `"nCardsDue": "{{count}} Karten fällig"` — German uses
`_one` / `_other` as well, so "1 Karten fällig" is grammatically wrong.

**Fix:** Split into plural-aware keys (both `en.json` and `de.json`):

```json
"nCardsDue_one": "{{count}} card due",
"nCardsDue_other": "{{count}} cards due",
"nCardsTotal_one": "{{count}} card total",
"nCardsTotal_other": "{{count}} cards total"
```

```json
"nCardsDue_one": "{{count}} Karte fällig",
"nCardsDue_other": "{{count}} Karten fällig",
"nCardsTotal_one": "{{count}} Karte gesamt",
"nCardsTotal_other": "{{count}} Karten gesamt"
```

---

### WR-03: `parseInt` in exam duration `onValueChange` receives no fallback — `NaN` silently stored

**File:** `apps/frontend/src/pages/StudySessionPage.tsx:654`

**Issue:** The `Select` for exam duration calls:

```ts
onValueChange={(val) => setExamDurationSeconds(parseInt(val, 10))}
```

The `EXAM_DURATIONS` options are string literals `'300'`, `'600'` etc. so under normal operation
this is safe. But `Select` from shadcn/ui does not validate that `val` matches one of the option
values before calling `onValueChange` — it forwards whatever is set programmatically (e.g. via
form autofill, testing, or if `SelectValue` receives an externally injected string). A non-numeric
`val` produces `NaN`, which is stored in state and passes the `examDurationSeconds !== null`
guard (since `NaN !== null` is `true`). The exam then starts with `NaN` seconds, causing
`ExamTimer` to receive `NaN` for `durationSeconds` — likely producing an immediate or broken
countdown.

**Fix:** Add a guard:

```ts
onValueChange={(val) => {
  const n = parseInt(val, 10)
  if (!isNaN(n)) setExamDurationSeconds(n)
}}
```

---

### WR-04: `handleRestart` calls `window.location.reload()` — breaks in test environments and loses SPA state silently

**File:** `apps/frontend/src/pages/StudySessionPage.tsx:55-58`

**Issue:** The restart handler uses `window.location.reload()` rather than navigating to the
same route or resetting component state. This has two problems:

1. In vitest/jsdom test environments `window.location.reload` is a no-op stub, so any test that
   clicks "Restart Session" will not reset the session — the test suite may miss a regression
   here.
2. In production, a full page reload discards the committed config, forcing the user back to the
   mode selector rather than restarting with the same deck/tag/size configuration. The comment
   says "restart session with fresh card list" but the actual UX effect is "go back to start
   screen".

**Fix:** Reset state explicitly instead of reloading:

```ts
const handleRestart = () => {
  setCommittedConfig(null)
  setCards(null)
  setSelectedTags(new Set())
  setSessionSize('all')
  // For deck-specific path, also reset selectedMode to show the mode selector again
  if (!isGlobalSR) setSelectedMode(null)
}
```

This keeps the SPA routing intact, allows tests to verify the behavior, and lets the user adjust
config before restarting.

---

## Info

### IN-01: `DeckPickerItem` has double click handler (both `div onClick` and `Checkbox onCheckedChange`) — redundant and can fire twice

**File:** `apps/frontend/src/pages/StudySessionPage.tsx:203-220`

**Issue:** The row `div` has `onClick={onToggle}` and the `Checkbox` also has
`onCheckedChange={onToggle}`. When a user clicks the checkbox element directly, the `Checkbox`
fires `onCheckedChange`, then the click event bubbles to the parent `div` which also fires
`onToggle` — toggling twice and returning to the original state, appearing to do nothing. Modern
Radix `Checkbox` implementations may stop propagation internally, making this safe today, but it
is a fragile pattern. The test at line 499 clicks the parent `div`, so it never exercises the
checkbox-direct path.

**Fix:** Remove `onClick` from the `div` and rely solely on the `Checkbox`'s `onCheckedChange`,
or use a `<label>` wrapping pattern with `htmlFor`.

---

### IN-02: `studyMode` prop typed as `string` but only `settings.modeNames.*` keys are valid

**File:** `apps/frontend/src/pages/StudySessionPage.tsx:35`

**Issue:** The `SessionRunner` prop is typed `studyMode: string` but the component accesses it
as a translation key via `t(\`settings.modeNames.${studyMode}\`)`. If an unknown value is
passed, i18next will return the key path as a fallback string, silently rendering
`settings.modeNames.unknown_value` in the UI badge. The correct type is `StudyMode` from
`@kartex/shared` (`'normal' | 'intensive' | 'exam_prep'`), which is already imported at line 6
via the shared schema.

**Fix:**

```ts
studyMode: StudyMode  // import from '@kartex/shared' or '@/hooks/useStudySession'
```

---

_Reviewed: 2026-06-15T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
