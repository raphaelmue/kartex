---
phase: 09-internationalization
plan: 03
subsystem: frontend/pages
tags: [i18n, react-i18next, string-wrapping, pages, tdd]
dependency_graph:
  requires: [09-01, 09-02]
  provides: [all-pages-translated, phase-verification-gate-passed]
  affects: [apps/frontend/src/pages]
tech_stack:
  added: []
  patterns: [useTranslation-hook, interpolation-not-key-for-user-content, document-title-i18n-language-dep, EXAM_DURATIONS-inside-component]
key_files:
  created: []
  modified:
    - apps/frontend/src/pages/LoginPage.tsx
    - apps/frontend/src/pages/RegisterPage.tsx
    - apps/frontend/src/pages/DashboardPage.tsx
    - apps/frontend/src/pages/ExplorePage.tsx
    - apps/frontend/src/pages/ImportPage.tsx
    - apps/frontend/src/pages/AdminPage.tsx
    - apps/frontend/src/pages/DecksPage.tsx
    - apps/frontend/src/pages/DeckDetailPage.tsx
    - apps/frontend/src/pages/StudySessionPage.tsx
    - apps/frontend/src/locales/en.json
    - apps/frontend/src/locales/de.json
decisions:
  - "study.studyDeckLabel key added: 'Study: {{deckTitle}}' / 'Lernen: {{deckTitle}}' — deckTitle interpolated as value (D-07); previously was a hardcoded JSX prefix"
  - "EXAM_DURATIONS and SIZE_OPTIONS moved inside StudySessionPage component — needed t() access; previously module-scope const arrays"
  - "LazyCard subcomponent in ImportPage gets useTranslation for Front/Back preview labels"
  - "DeckDetailPage document.title Edge Case 1: deck.title raw when loaded, t('deckDetail.title') fallback — [deck, t, i18n.language] dep array"
metrics:
  duration_seconds: 480
  completed: "2026-06-01"
  tasks_completed: 3
  tasks_total: 3
  files_created: 0
  files_modified: 11
---

# Phase 9 Plan 3: Translate All Pages + Phase Verification Gate Summary

**One-liner:** All 9 page files fully wrapped in t(); EXAM_DURATIONS/SIZE_OPTIONS moved into component; badge subcomponents translated; 254 en/de keys with parity; 67 tests pass; typecheck clean.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Translate Login, Register, Dashboard, Explore, Import, Admin | 5074aab | LoginPage, RegisterPage, DashboardPage, ExplorePage, ImportPage, AdminPage |
| 2 | Translate Decks, DeckDetail, StudySession | 685a7af | DecksPage, DeckDetailPage, StudySessionPage |
| 3 | Phase verification gate — parity + sweep + remaining fixes | 8996feb | ImportPage (LazyCard), StudySessionPage, en.json, de.json |

## Verification Results

- **Key parity:** en.json and de.json have **254 identical keys** (node parity script exits 0)
- **Test suite:** **67 tests pass** (9 test files) — no regressions
- **TypeScript:** clean (`yarn typecheck` exits 0)
- **Hardcoded-string sweep:** only D-07-excluded matches remain (see below)

## Architecture Decisions

### EXAM_DURATIONS/SIZE_OPTIONS moved inside component
These two arrays previously lived at module scope with hardcoded English strings. Since `t()` requires a React component scope (rule-of-hooks), they were moved inside `StudySessionPage` and computed on each render. This is safe since the arrays are small (5 and 4 items) and re-computation is negligible. The `SIZE_OPTIONS` numeric values `10` and `20` remain as literal number-to-string labels (not translated — per plan spec).

### DeckDetailPage document.title Edge Case 1
When the deck is loaded, `document.title` is set to `` `${deck.title} — Kartex` `` with `deck.title` as raw user content (D-07). When not yet loaded, it falls back to `t('deckDetail.title')`. The effect dependency array is `[deck, t, i18n.language]` so the title updates on both deck load and language switch.

### study.studyDeckLabel new key
The "Study: {deckTitle}" heading in StudySessionPage's mode selector needed a key. Added `study.studyDeckLabel` = `"Study: {{deckTitle}}"` (en) and `"Lernen: {{deckTitle}}"` (de). `deckTitle` is interpolated as a value — the user's deck title is never used as a translation key (D-07).

### LazyCard subcomponent translation
`LazyCard` (private to ImportPage) renders "Front"/"Back" section labels inside expanded card previews. Added `useTranslation` to this subcomponent and replaced with `t('cardEditor.frontLabel')` and `t('cardEditor.backLabel')` which already existed from Plan 02's CardEditorModal translation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Key] study.studyDeckLabel absent from locale files**
- **Found during:** Task 3 (hardcoded-string sweep)
- **Issue:** "Study: {deckTitle}" heading was hardcoded with "Study: " as UI chrome prefix — needed a key to translate the prefix while keeping deckTitle as user content interpolation
- **Fix:** Added `study.studyDeckLabel` to both `en.json` and `de.json` with `{{deckTitle}}` interpolation
- **Files modified:** `apps/frontend/src/locales/en.json`, `apps/frontend/src/locales/de.json`, `apps/frontend/src/pages/StudySessionPage.tsx`
- **Commit:** 8996feb

**2. [Rule 2 - Missing Translation] LazyCard "Front"/"Back" labels not translated**
- **Found during:** Task 3 (hardcoded-string sweep)
- **Issue:** The `LazyCard` subcomponent inside ImportPage rendered "Front" and "Back" as hardcoded strings inside the expanded card preview
- **Fix:** Added `useTranslation` to `LazyCard`; replaced with `t('cardEditor.frontLabel')` and `t('cardEditor.backLabel')` (reusing existing keys from Plan 02)
- **Files modified:** `apps/frontend/src/pages/ImportPage.tsx`
- **Commit:** 8996feb

## Hardcoded-String Sweep — D-07 Exclusions

The following strings remain intentionally untranslated per D-07 (user content) or other legitimate reasons:

| String | File | D-07 Reason |
|--------|------|-------------|
| `{deck.title}` (CardTitle, h2, document.title) | DecksPage, DeckDetailPage | User-authored deck title |
| `{deck.description}` (CardDescription, p) | DecksPage, DeckDetailPage, ExplorePage | User-authored description |
| `{d.deckTitle}` (Link text) | DashboardPage | User-authored deck title |
| `{deck.owner.username}`, `{share.sharedWithUser.username}`, `{u.username}` | DeckDetailPage, ExplorePage, AdminPage | Username is user-authored identity |
| `{deck.sharedByUsername}` (interpolated in t()) | DecksPage | Username passed as interpolation value |
| `{card.frontContent}` (TableCell) | DeckDetailPage | User-authored card content |
| `{card.front.split('\n')[0]}` (preview line) | ImportPage LazyCard | User-authored card content |
| `{card.tags}`, `{tag}` (Badge, h3, group key) | DeckDetailPage, StudySessionPage | User-authored tag values |
| `{tag}` button labels in mode selector | StudySessionPage | User-authored tag values |
| `{parseResult.deck.author}` | ImportPage | User-authored author name |
| `{selectedFile.name}` (fileLabel value) | ImportPage | User-provided filename |
| `{code.code}` (font-mono span) | AdminPage | System-generated invite code |
| `{e.name}: {e.reason}` (import error details) | ImportPage | Backend-provided file path / reason |
| `{w.reason}` (parse warning reason) | ImportPage | Parser-generated reason string |
| `{deckTitle}` in studyDeckLabel interpolation | StudySessionPage | User-authored deck title as value |
| `'10'`, `'20'` in SIZE_OPTIONS | StudySessionPage | Numeric literals — no translation |
| `— Kartex` (title suffix, document.title) | DeckDetailPage, LoginPage, RegisterPage | Brand name |

## Known Stubs

None — all 254 keys have real English and German translations. No placeholder text.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes. All `t()` calls use compile-time string literal keys (T-09-05 mitigated). User content interpolated as values only — never as keys (T-09-05 mitigated). Error toasts use generic translated labels — raw backend strings in console.error only (T-09-06 mitigated).

## Self-Check: PASSED

- apps/frontend/src/pages/LoginPage.tsx: FOUND (contains useTranslation)
- apps/frontend/src/pages/RegisterPage.tsx: FOUND (contains useTranslation)
- apps/frontend/src/pages/DashboardPage.tsx: FOUND (contains useTranslation)
- apps/frontend/src/pages/ExplorePage.tsx: FOUND (contains useTranslation)
- apps/frontend/src/pages/ImportPage.tsx: FOUND (contains useTranslation)
- apps/frontend/src/pages/AdminPage.tsx: FOUND (contains useTranslation)
- apps/frontend/src/pages/DecksPage.tsx: FOUND (contains useTranslation)
- apps/frontend/src/pages/DeckDetailPage.tsx: FOUND (contains useTranslation)
- apps/frontend/src/pages/StudySessionPage.tsx: FOUND (contains useTranslation)
- apps/frontend/src/locales/en.json: FOUND (254 keys)
- apps/frontend/src/locales/de.json: FOUND (254 keys)
- Commit 5074aab: FOUND
- Commit 685a7af: FOUND
- Commit 8996feb: FOUND
