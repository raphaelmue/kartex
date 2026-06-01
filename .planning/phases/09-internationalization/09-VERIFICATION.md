---
phase: 09-internationalization
verified: 2026-06-01T20:25:30Z
status: human_needed
score: 12/12 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open the app in a browser, observe the language toggle button (EN) in the sidebar, click it, and confirm all visible strings switch to German immediately without a page reload or any network navigation"
    expected: "All nav labels, page headings, form labels, toasts, and aria-labels render in German after one click; clicking again returns to English; no full page reload occurs (no browser navigation event)"
    why_human: "React re-render on i18next language change is a live DOM behaviour that grep and typecheck cannot exercise; confirms the useTranslation subscription model actually drives re-renders"
  - test: "Visit /decks/:id/learn, start a study session, and switch language mid-session using the toggle"
    expected: "Rating button labels (Again / Hard / Good / Easy), session progress text, timer aria-label, and all session-complete stats switch to German without resetting session state"
    why_human: "Confirms that components deep in a study session tree re-render on language switch; state preservation during language change cannot be verified statically"
---

# Phase 9: Internationalization Verification Report

**Phase Goal:** react-i18next setup, string externalization, and language switcher — every visible UI string renders via t() and the user can switch between English and German without a page reload.
**Verified:** 2026-06-01T20:25:30Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Frontend uses react-i18next and locale JSON files exist under `apps/frontend/src/locales/` | VERIFIED | `apps/frontend/src/locales/en.json` and `de.json` exist; `package.json` declares `react-i18next@^17.0.8`, `i18next@^26.3.0`, `i18next-browser-languagedetector@^8.2.1` |
| 2 | Every visible UI string in the app renders via a `t()` call — no hardcoded English strings remain in JSX | VERIFIED | All 8 component files and all 9 page files contain `useTranslation`; badge subcomponents (InviteStatusBadge, RoleBadge, StatusBadge) also use `useTranslation`; hardcoded-string grep sweep returns zero sentence-level JSX strings outside D-07 exclusions |
| 3 | A language selector control is accessible in the UI, and switching language updates all strings immediately without a page reload | VERIFIED (static) | AppShell lines 48-50 define `toggleLanguage → void i18n.changeLanguage(...)`; buttons at lines 132-139 (desktop) and 243-250 (drawer) are both wired; `aria-label={t('a11y.switchLanguage')}`; LanguageToggle test (GREEN, 2 tests) confirms accessible name and `changeLanguage('de')` call; live re-render behaviour requires human check |
| 4 | i18next initializes before React renders and all 65 existing tests stay green | VERIFIED | `apps/frontend/src/main.tsx` line 1: `import './i18n'` is the first import; test suite result: 67 tests pass (9 test files) — all green |
| 5 | Both en.json and de.json exist and contain the same key set | VERIFIED | Node parity script: `OK 254 keys match`; key count grew from 252 (Plan 01) → 253 (Plan 02 added `a11y.revealHint`) → 254 (Plan 03 added `study.studyDeckLabel`) — both files kept in sync at every step |
| 6 | t('nonexistent.key') is a TypeScript compile error via CustomTypeOptions | VERIFIED | `apps/frontend/src/i18n.d.ts` augments `CustomTypeOptions` with `resources: typeof resources['en']`; `yarn typecheck` exits 0 (clean) |
| 7 | A failing LanguageToggle test stub exists / LanguageToggle tests pass GREEN | VERIFIED | `apps/frontend/src/components/__tests__/LanguageToggle.test.tsx` has 2 tests; test run shows them GREEN (I18N-03a, I18N-03b) |
| 8 | AppShell, 5 shared components, and 2 modals render all UI strings via t() | VERIFIED | `useTranslation` found in: AppShell.tsx, CardFlip.tsx, RatingButtons.tsx, SessionProgress.tsx, ExamTimer.tsx, MediaUploadToolbar.tsx, DeckFormModal.tsx, CardEditorModal.tsx |
| 9 | All 9 page files render all UI strings via t() | VERIFIED | `useTranslation` found in: LoginPage, RegisterPage, DashboardPage, ExplorePage, ImportPage, AdminPage, DecksPage, DeckDetailPage, StudySessionPage |
| 10 | document.title on each page uses t() and updates on language switch (i18n.language in effect deps) | VERIFIED | `i18n.language` found in all 9 page files; DashboardPage `[t, i18n.language]` dep confirmed; DeckDetailPage uses `[deck, t, i18n.language]` dep with raw `deck.title` (correct D-07) |
| 11 | User-authored content is never passed through t() as a key — only interpolated as values | VERIFIED | `deck.title`, `deck.description`, `deck.owner.username`, card content, tags confirmed as raw JSX expressions or `{ title: deck.title }` interpolation values; D-07 exclusion list documented in 09-03-SUMMARY.md |
| 12 | Full frontend test suite green and typecheck clean across the whole app | VERIFIED | `yarn test --run`: 67 tests pass (9 test files); `yarn typecheck`: exits 0 (no output = clean) |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/frontend/src/locales/en.json` | English locale, source of truth for TypeScript types | VERIFIED | 254 keys, real translations, contains `"nav"` |
| `apps/frontend/src/locales/de.json` | German locale, fully translated, same keys as en.json | VERIFIED | 254 keys, parity confirmed by node script |
| `apps/frontend/src/i18n.ts` | i18next init with LanguageDetector + initReactI18next, exports resources | VERIFIED | All three plugins chained; `resources` exported `as const`; contains `initReactI18next` |
| `apps/frontend/src/i18n.d.ts` | CustomTypeOptions augmentation referencing resources['en'] | VERIFIED | `typeof resources['en']` used; `CustomTypeOptions` declared |
| `apps/frontend/src/components/__tests__/LanguageToggle.test.tsx` | RED stub (Plan 01) → GREEN (Plan 02) | VERIFIED | 2 tests GREEN in final run; contains `changeLanguage` spy |
| `apps/frontend/src/test/setup.ts` | i18n initialized synchronously for test environment (Option C) | VERIFIED | Uses `i18n.use(initReactI18next).init(...)` with real English resources; `initImmediate` omitted (correct for i18next v26) |
| `apps/frontend/src/main.tsx` | `import './i18n'` as first import | VERIFIED | Line 1 is `import './i18n'` — before React import |
| `apps/frontend/src/components/AppShell.tsx` | Translated shell + language toggle button | VERIFIED | `useTranslation`, `toggleLanguage` handler, toggle buttons in desktop sidebar and mobile drawer |
| `apps/frontend/src/components/RatingButtons.tsx` | Translated rating labels + aria-labels | VERIFIED | `useTranslation` + `t('rating.ariaLabel', { label, shortcut })` |
| `apps/frontend/src/components/CardEditorModal.tsx` | Translated modal labels/placeholders/toasts | VERIFIED | `useTranslation`; toast calls confirmed via `t('cardEditor.cardUpdated')` etc. |
| `apps/frontend/src/pages/StudySessionPage.tsx` | Fully translated study session | VERIFIED | `useTranslation`; EXAM_DURATIONS moved inside component; `t('study.nMinutes', { count })`; SIZE_OPTIONS use t() |
| `apps/frontend/src/pages/DeckDetailPage.tsx` | Fully translated deck detail with dynamic title | VERIFIED | `deck.title` raw when loaded; `t('deckDetail.title')` fallback; `[deck, t, i18n.language]` dep array |
| `apps/frontend/src/pages/AdminPage.tsx` | Fully translated admin page + badge components | VERIFIED | `useTranslation` in InviteStatusBadge, RoleBadge, StatusBadge subcomponents |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/frontend/src/main.tsx` | `apps/frontend/src/i18n.ts` | `import './i18n'` as first import | WIRED | Line 1 of main.tsx; precedes all React imports |
| `apps/frontend/src/i18n.d.ts` | `apps/frontend/src/i18n.ts` | `import { resources } from './i18n'` | WIRED | Line 1 of i18n.d.ts uses `resources` export |
| `apps/frontend/src/test/setup.ts` | `apps/frontend/src/locales/en.json` | i18n.init with English resources | WIRED | `import en from '../locales/en.json'`; passed directly to init |
| `apps/frontend/src/components/AppShell.tsx` | `i18n.changeLanguage` | language toggle onClick handler | WIRED | `toggleLanguage` calls `void i18n.changeLanguage(...)` at lines 48-50; bound to onClick at lines 135, 246 |
| `apps/frontend/src/components/AppShell.tsx` | `react-i18next` | `useTranslation` hook | WIRED | `const { t, i18n } = useTranslation()` at line 32 |
| `apps/frontend/src/pages/DashboardPage.tsx` | `react-i18next` | useTranslation + document.title effect with i18n.language dep | WIRED | `[t, i18n.language]` dep array confirmed |
| `apps/frontend/src/pages/DeckDetailPage.tsx` | `deck.title` (user content) | raw interpolation, not t() | WIRED | `` `${deck.title} — Kartex` `` in document.title effect; `{deck.title}` in JSX — not passed through t() |

### Data-Flow Trace (Level 4)

Not applicable — this phase does not render dynamic data from the backend. It wraps existing JSX strings with t() calls and adds a language toggle. The data source for translations is the bundled locale JSON (static at build time), not a network query. No hollow-prop risk.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 67 tests pass including LanguageToggle GREEN | `cd apps/frontend && yarn test --run` | `67 passed (9)` | PASS |
| TypeScript compile with CustomTypeOptions | `cd apps/frontend && yarn typecheck` | exit 0, no output | PASS |
| en.json / de.json key parity (254 keys) | node parity one-liner | `OK 254 keys match` | PASS |
| Language toggle wired in AppShell sidebar | grep `toggleLanguage` AppShell.tsx | lines 48-50, 135, 246 | PASS |
| All 9 pages use useTranslation | grep `useTranslation` src/pages/*.tsx | 9 files matched | PASS |
| All 8 components use useTranslation | grep `useTranslation` src/components/*.tsx | 8 files matched | PASS |

### Probe Execution

No probes declared or applicable for this phase (no scripts/*/tests/probe-*.sh).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| I18N-01 | 09-01-PLAN.md | Frontend uses react-i18next with a locale directory (`apps/frontend/src/locales/`) | SATISFIED | Packages installed; en.json + de.json in `apps/frontend/src/locales/`; i18n.ts + i18n.d.ts created; CustomTypeOptions augmentation active |
| I18N-02 | 09-02-PLAN.md, 09-03-PLAN.md | All frontend UI strings are externalized to locale JSON and use `t()` calls | SATISFIED | All 8 components + 9 pages wrapped; badge subcomponents translated; hardcoded-string sweep clean; 254 locale keys; typecheck clean |
| I18N-03 | 09-01-PLAN.md (stub), 09-02-PLAN.md (impl) | User can switch the application language via a language selector | SATISFIED (pending human) | Toggle button in AppShell sidebar (desktop) and drawer (mobile); EN/DE label cycles; `changeLanguage` called; LanguageToggle tests GREEN; live re-render requires human confirmation |

All three requirement IDs declared across the three plans (I18N-01, I18N-02, I18N-03) are accounted for. No orphaned requirements: REQUIREMENTS.md maps exactly I18N-01, I18N-02, I18N-03 to Phase 9.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/frontend/src/pages/AdminPage.tsx` | 146 | `placeholder="7"` | Info | Numeric input placeholder for expiry days field — legitimate D-07 numeric literal; not a UI string |

No TBD, FIXME, or XXX markers found in any phase-modified file. No stub patterns found. No empty return values or disconnected data flows.

### Human Verification Required

#### 1. Language toggle live re-render in browser

**Test:** Open the running app in a browser. Observe the language toggle button (showing "EN") in the left sidebar. Click it.
**Expected:** All visible strings — nav labels, page headings, form labels, button text, toasts — switch to German immediately. The URL does not change and no full page reload occurs. Click again to return to English.
**Why human:** React's `useTranslation` subscription to i18next's language change event drives re-renders at runtime. grep confirms the wiring (`useTranslation` in all components, `changeLanguage` in AppShell) but cannot execute the subscription chain or observe DOM updates.

#### 2. Language switch mid-session in /decks/:id/learn

**Test:** Start a study session on any deck. Switch language via the sidebar toggle mid-session.
**Expected:** Rating button labels (Again / Hard / Good / Easy → Nochmal / Schwer / Gut / Einfach), session progress text, exam timer aria-label, and session-complete statistics all update to German without losing session state (current card index, progress counter).
**Why human:** Confirms that deeply nested components (RatingButtons, SessionProgress, ExamTimer inside a running session) re-render correctly on language change, and that i18next re-render does not reset React state owned by parent components.

### Gaps Summary

No gaps. All 12 must-haves are verified. The only outstanding items are human-testable UI behaviours (live re-render on language switch) that cannot be confirmed programmatically.

---

_Verified: 2026-06-01T20:25:30Z_
_Verifier: Claude (gsd-verifier)_
