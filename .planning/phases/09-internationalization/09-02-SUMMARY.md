---
phase: 09-internationalization
plan: 02
subsystem: frontend/components
tags: [i18n, react-i18next, language-toggle, components, tdd]
dependency_graph:
  requires: [09-01]
  provides: [language-toggle-ui, translated-appshell, translated-shared-components, translated-modals]
  affects: [apps/frontend/src/components]
tech_stack:
  added: []
  patterns: [useTranslation-hook, labelKey-pattern, i18n-changeLanguage-toggle]
key_files:
  created: []
  modified:
    - apps/frontend/src/components/AppShell.tsx
    - apps/frontend/src/components/CardFlip.tsx
    - apps/frontend/src/components/RatingButtons.tsx
    - apps/frontend/src/components/SessionProgress.tsx
    - apps/frontend/src/components/ExamTimer.tsx
    - apps/frontend/src/components/MediaUploadToolbar.tsx
    - apps/frontend/src/components/DeckFormModal.tsx
    - apps/frontend/src/components/CardEditorModal.tsx
    - apps/frontend/src/locales/en.json
    - apps/frontend/src/locales/de.json
decisions:
  - "labelKey pattern: navItems stores 'nav.dashboard' etc. as const keys; t(item.labelKey) called at render time (avoids module-scope hook call)"
  - "RATINGS array stores labelKey strings (rating.again etc.); translated label computed inside render via t(labelKey)"
  - "a11y.revealHint added to both en.json and de.json — key was absent from Plan 01 locale files"
  - "toggleLanguage uses void i18n.changeLanguage(en->de->en) — no LanguageContext created (i18next self-manages)"
metrics:
  duration_seconds: 540
  completed: "2026-06-01"
  tasks_completed: 3
  tasks_total: 3
  files_created: 0
  files_modified: 10
---

# Phase 9 Plan 2: Translate AppShell + Shared Components + Modals Summary

**One-liner:** Language toggle button (EN/DE) added to AppShell sidebar and drawer; AppShell, 5 shared components, and 2 modals fully wrapped in t() using useTranslation hook; LanguageToggle.test.tsx turned GREEN.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Translate AppShell and add the language toggle button | d53dab0 | AppShell.tsx |
| 2 | Translate shared study/media components | c4ab2fc | CardFlip.tsx, RatingButtons.tsx, SessionProgress.tsx, ExamTimer.tsx, MediaUploadToolbar.tsx, en.json, de.json |
| 3 | Translate DeckFormModal and CardEditorModal | 4670945 | DeckFormModal.tsx, CardEditorModal.tsx |

## Verification Results

- Full test suite: **67 tests pass** (up from 65 in Plan 01 — LanguageToggle 2 tests now GREEN)
- TypeScript: clean (`yarn typecheck` exits 0)
- LanguageToggle.test.tsx: **GREEN** (was RED after Plan 01)
- AppShell.test.tsx: all 9 shell tests still pass
- CardFlip.test.tsx: all 8 tests still pass

## Architecture Decisions

### labelKey Pattern for navItems (Pitfall 4 Fix)
The `navItems` module-scope array previously stored `label: 'Dashboard'` strings. Since `t()` is a React hook that cannot be called at module scope, the array was refactored to store `labelKey: 'nav.dashboard' as const` keys. The render loop calls `t(item.labelKey)` inside the component body. This also required updating `currentLabel` to use `t()` for the matched nav item's label.

### RATINGS Array labelKey Pattern
Same approach for `RatingButtons`: the `RATINGS` array stores `labelKey` strings (`'rating.again'` etc.). The translated label is computed inside the render function via `const label = t(labelKey)`, then used both for visible text and interpolated into `t('rating.ariaLabel', { label, shortcut })`.

### New Locale Key: a11y.revealHint
The "Click or press Space to reveal" hint text in `CardFlip.tsx` had no matching key in the Plan 01 locale files. Added `a11y.revealHint` to both `en.json` and `de.json` per the plan's instruction ("if no key exists add it to BOTH locale files under the appropriate existing group"). Key parity is maintained: 253 keys in both files.

### No LanguageContext
The language toggle calls `void i18n.changeLanguage(...)` directly from the AppShell component using `const { i18n } = useTranslation()`. No separate LanguageContext was created — i18next self-manages language state and triggers React re-renders automatically via the `useTranslation` subscription.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Key] a11y.revealHint absent from locale files**
- **Found during:** Task 2 (CardFlip string wrapping)
- **Issue:** The "Click or press Space to reveal" hint string in CardFlip.tsx had no corresponding key in `en.json` or `de.json` from Plan 01
- **Fix:** Added `"revealHint": "Click or press Space to reveal"` to `en.json` under `a11y`, and `"revealHint": "Klicken oder Leertaste drücken, um anzuzeigen"` to `de.json`
- **Files modified:** `apps/frontend/src/locales/en.json`, `apps/frontend/src/locales/de.json`
- **Commit:** c4ab2fc

## Known Stubs

None — all translated strings use real English and German values. No placeholder text.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes. All `t()` calls use compile-time string literal keys (T-09-03 mitigated). Language toggle only calls `changeLanguage` in an event handler (T-09-04 accepted).

## Self-Check: PASSED

- apps/frontend/src/components/AppShell.tsx: FOUND
- apps/frontend/src/components/CardFlip.tsx: FOUND
- apps/frontend/src/components/RatingButtons.tsx: FOUND
- apps/frontend/src/components/SessionProgress.tsx: FOUND
- apps/frontend/src/components/ExamTimer.tsx: FOUND
- apps/frontend/src/components/MediaUploadToolbar.tsx: FOUND
- apps/frontend/src/components/DeckFormModal.tsx: FOUND
- apps/frontend/src/components/CardEditorModal.tsx: FOUND
- Commit d53dab0: FOUND
- Commit c4ab2fc: FOUND
- Commit 4670945: FOUND
