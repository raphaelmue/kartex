# Phase 9: Internationalization - Context

**Gathered:** 2026-05-31
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase adds i18n infrastructure to the frontend and ships two fully-translated locales:

1. **I18N-01 (infrastructure)** — Install react-i18next, configure i18next with localStorage language detection, create `apps/frontend/src/locales/en.json` and `apps/frontend/src/locales/de.json` with type-safe key augmentation.
2. **I18N-02 (string wrapping)** — Every visible UI string in the app renders via a `t()` call. No hardcoded English strings remain in JSX. Aria-labels and screen reader strings are included. User-authored content is explicitly excluded.
3. **I18N-03 (language switcher)** — A compact toggle button in the AppShell sidebar (near the theme toggle) switches between EN and DE. Selection persists to localStorage. No page reload required.

**In scope:** Frontend only. All 9 pages, AppShell, modals, form labels, toast messages, error labels, and aria-labels. Both `en.json` and `de.json` fully populated.
**Out of scope:** Backend i18n, Settings page implementation (stays ComingSoon), adding a third language, user-authored content (deck titles, card text, tags), backend error text reaching the UI.

</domain>

<decisions>
## Implementation Decisions

### Language Set
- **D-01:** Ship **English + German** in v1.1. Both locales are fully translated — `de.json` must be complete, not a stub.
- **D-02:** Single file per language: `apps/frontend/src/locales/en.json` and `apps/frontend/src/locales/de.json`. No namespace split — one file per locale covers the entire app.
- **D-03:** **Type-safe translation keys.** Augment react-i18next TypeScript types from `en.json` so `t('nonexistent.key')` is a TypeScript compile error. Pattern: declare `CustomTypeOptions` in a `src/i18n.d.ts` type file referencing the English locale as the source of truth.

### Language Switcher
- **D-04:** Language switcher lives in the **AppShell sidebar**, near the existing theme toggle (bottom of the sidebar). The `/settings` route stays as `<ComingSoon>` — no real Settings page in this phase.
- **D-05:** Visual: **compact toggle button** showing the current language code (EN / DE). Clicking it cycles to the next language. Same size and style pattern as the theme toggle button (`Button variant="ghost" size="icon"`).
- **D-06:** Language selection **persists to localStorage** via `i18next-browser-languagedetector`. Survives page reload and new sessions. Detection order: localStorage → browser language → fallback to English (`en`).

### String Scope
- **D-07:** Content that is **NOT translated** (never pass through `t()`):
  - User-authored content: deck titles, card fronts/backs, descriptions, tags
  - Usernames and email addresses (interpolated into translated strings: `t('loggedInAs', { name: user.username })`)
  - Media filenames and file paths shown in upload/import UI
  - KaTeX and Typst math expressions inside card content
- **D-08:** **Backend error messages:** translate only generic frontend labels ("Something went wrong", "Failed to load", "Please try again"). Raw backend error strings (e.g. `"Unique constraint failed"`) must not be shown to the user — they belong in `console.error` only. If a backend error surfaces in the UI, show a generic translated label instead.
- **D-09:** **Translate aria-labels and accessibility strings** too — `aria-label="Main navigation"`, `aria-label="Close drawer"`, etc. use `t()`. Accessibility strings are user-facing even if not visually rendered.

### Claude's Discretion
- Exact key naming convention within locale JSON (flat dotted keys vs nested objects — e.g., `"nav.dashboard"` or `{ "nav": { "dashboard": "Dashboard" } }`)
- Whether to use `useTranslation()` hook directly in components or create a thin wrapper
- Whether language state lives in ThemeContext (co-located with theme) or a separate LanguageContext
- Exact positioning of the language toggle relative to the theme toggle in the sidebar
- i18next initialization location (`src/i18n.ts` imported once in `main.tsx` is the standard pattern)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Internationalization — I18N-01, I18N-02, I18N-03 (3 requirements for this phase)
- `.planning/ROADMAP.md` §Phase 9 — Success criteria (3 criteria, the acceptance test for this phase)

### Files Being Modified
- `apps/frontend/src/main.tsx` — Import `src/i18n.ts` here (i18next init must run before React renders)
- `apps/frontend/src/components/AppShell.tsx` — Add language toggle button near theme toggle; wrap navItem labels and aria-labels in `t()`
- `apps/frontend/src/App.tsx` — Wrap `AuthProvider` with `I18nextProvider` or confirm initReactI18next pattern doesn't need a provider wrapper
- All page files under `apps/frontend/src/pages/` — Wrap all JSX strings in `t()`
- All modal/component files under `apps/frontend/src/components/` — Wrap all JSX strings in `t()`

### Files Being Created
- `apps/frontend/src/locales/en.json` — English locale (source of truth for TypeScript types)
- `apps/frontend/src/locales/de.json` — German locale (fully translated, no stubs)
- `apps/frontend/src/i18n.ts` — i18next initialization (resources, detection, fallback)
- `apps/frontend/src/i18n.d.ts` — TypeScript type augmentation for type-safe keys

### Existing Patterns to Follow
- `apps/frontend/src/context/ThemeContext.tsx` — Pattern for a React context + provider (reference if adding LanguageContext)
- `apps/frontend/src/components/AppShell.tsx` — Theme toggle at line ~60-ish: `Button variant="ghost" size="icon"` — language toggle follows the same pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AppShell.tsx` theme toggle button — `Button variant="ghost" size="icon"` with `onClick={toggleTheme}` pattern. Language toggle mirrors this exactly.
- `ThemeContext.tsx` — context + provider pattern; planner may co-locate language in ThemeContext or create a parallel LanguageContext.
- `navItems` array (AppShell.tsx line 20-26) — labels are currently hardcoded strings (`'Dashboard'`, `'Decks'`, etc.). These must be replaced with `t('nav.dashboard')` etc.
- `cn()` utility — available everywhere for conditional class merging.

### Established Patterns
- **No global state library** — app uses React Context for shared state (AuthContext, ThemeContext). i18next's own state is self-managed; no Redux or Zustand needed.
- **Provider nesting in App.tsx** — current: `ErrorBoundary > AuthProvider > Routes`. The i18next `initReactI18next` approach (calling `i18n.use(initReactI18next)` in `i18n.ts`) does not require a JSX provider wrapper — it modifies the module-level i18n instance. Import `./i18n` at the top of `main.tsx`.
- **Vite + TypeScript** — `src/locales/en.json` can be imported directly as a typed object via `import en from './locales/en.json'`. Vite handles JSON imports natively.
- **No `t()` in test files** — existing tests mock component output. Tests for translated strings should use `i18next.t()` directly or set `lng: 'cimode'` in test i18n config to return key names instead of translations.

### Integration Points
- `main.tsx` — import `./i18n` before rendering `<App />` to guarantee init before first render
- `AppShell.tsx` — primary integration point for the language toggle UI
- All page and component files — `useTranslation()` hook call added at the top of each component
- Vitest config — may need a test i18n setup file that initializes i18next with `initImmediate: false` and test resources

</code_context>

<specifics>
## Specific Ideas

- Language toggle: a small button showing "EN" or "DE" text (or a flag emoji 🇬🇧/🇩🇪 if compact enough) — same ghost/icon-size as the theme toggle. Clicking it toggles between the two languages.
- i18n init pattern (in `src/i18n.ts`):
  ```ts
  import i18n from 'i18next'
  import { initReactI18next } from 'react-i18next'
  import LanguageDetector from 'i18next-browser-languagedetector'
  import en from './locales/en.json'
  import de from './locales/de.json'

  void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({ resources: { en: { translation: en }, de: { translation: de } }, fallbackLng: 'en', interpolation: { escapeValue: false } })

  export default i18n
  ```
- TypeScript type augmentation (in `src/i18n.d.ts`):
  ```ts
  import en from './locales/en.json'
  declare module 'i18next' {
    interface CustomTypeOptions {
      resources: { translation: typeof en }
    }
  }
  ```
- `document.title` strings (currently set via `useEffect` in some pages) should also use `t()`.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 09-internationalization*
*Context gathered: 2026-05-31*
