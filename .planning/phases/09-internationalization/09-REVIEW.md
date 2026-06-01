---
phase: 09-internationalization
reviewed: 2026-06-01T00:00:00Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - apps/frontend/src/locales/en.json
  - apps/frontend/src/locales/de.json
  - apps/frontend/src/i18n.ts
  - apps/frontend/src/i18n.d.ts
  - apps/frontend/src/main.tsx
  - apps/frontend/src/test/setup.ts
  - apps/frontend/src/components/AppShell.tsx
  - apps/frontend/src/components/CardFlip.tsx
  - apps/frontend/src/components/RatingButtons.tsx
  - apps/frontend/src/components/SessionProgress.tsx
  - apps/frontend/src/components/ExamTimer.tsx
  - apps/frontend/src/components/MediaUploadToolbar.tsx
  - apps/frontend/src/components/DeckFormModal.tsx
  - apps/frontend/src/components/CardEditorModal.tsx
  - apps/frontend/src/components/__tests__/LanguageToggle.test.tsx
  - apps/frontend/src/pages/LoginPage.tsx
  - apps/frontend/src/pages/RegisterPage.tsx
  - apps/frontend/src/pages/DashboardPage.tsx
  - apps/frontend/src/pages/ExplorePage.tsx
  - apps/frontend/src/pages/ImportPage.tsx
  - apps/frontend/src/pages/AdminPage.tsx
  - apps/frontend/src/pages/DecksPage.tsx
  - apps/frontend/src/pages/DeckDetailPage.tsx
  - apps/frontend/src/pages/StudySessionPage.tsx
findings:
  critical: 1
  warning: 3
  info: 3
  total: 7
status: issues_found
---

# Phase 9: Code Review Report

**Reviewed:** 2026-06-01
**Depth:** standard
**Files Reviewed:** 24
**Status:** issues_found

## Summary

This phase introduces react-i18next (i18next v26) across the full frontend: en/de locale JSON files, TypeScript type augmentation via `i18n.d.ts`, test setup, and `t()` wrapping in every component and page. Key parity between `en.json` and `de.json` is perfect — a programmatic comparison confirms zero missing keys in either direction. All `t()` call sites use keys that exist in the locale files. User-supplied data (deck titles, usernames, card content) is consistently passed as interpolation values, never as keys — there is no pathway from user content to XSS through the i18n layer. The TypeScript type augmentation in `i18n.d.ts` provides compile-time key checking across the codebase.

One critical bug was found: `ExamTimer` places multiple side effects inside a React state updater function, violating React's purity requirement. In React 18 StrictMode (enabled in `main.tsx`), this causes `onExpire()` to fire twice in development. Three warnings cover a variable shadowing issue that could silently misdirect future code edits, an untranslated UI string, and a misleading test comment that documents an option which is absent from the actual configuration.

## Critical Issues

### CR-01: Side effects inside state updater in `ExamTimer` — double-fires `onExpire` in StrictMode

**File:** `apps/frontend/src/components/ExamTimer.tsx:17-23`

**Issue:** The `setSecondsLeft` functional updater contains three side effects: `clearInterval(timerRef.current!)`, `timerRef.current = null`, and `onExpire()`. React requires state updater functions to be pure. In React 18 StrictMode — which is enabled via `<React.StrictMode>` in `main.tsx:16` — React intentionally double-invokes state updaters in development to surface this class of bug. The result is that `onExpire()` fires twice when the timer expires. The current `onExpire` caller (`setExamExpired(true)`) is idempotent, so visible state is not corrupted. However: (a) this is an undocumented side-effect-double-fire that any future non-idempotent `onExpire` (e.g. score submission, navigation) will hit; (b) `clearInterval` and `timerRef.current = null` inside a pure function context is a correctness violation regardless of current outcomes.

**Fix:** Move all side effects into a separate `useEffect` that watches `secondsLeft`, using a stable ref for `onExpire` to avoid re-creating the interval:

```tsx
export function ExamTimer({ durationSeconds, onExpire }: ExamTimerProps) {
  const { t } = useTranslation()
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onExpireRef = useRef(onExpire)
  useEffect(() => { onExpireRef.current = onExpire }, [onExpire])

  // Pure state updater — no side effects
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [durationSeconds])

  // Side effects isolated in their own effect
  useEffect(() => {
    if (secondsLeft === 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      onExpireRef.current()
    }
  }, [secondsLeft])

  // ... rest of render unchanged
}
```

---

## Warnings

### WR-01: Variable `t` shadows translation function in `DeckDetailPage`

**File:** `apps/frontend/src/pages/DeckDetailPage.tsx:293`

**Issue:** The arrow function passed to `Array.prototype.some()` uses `t` as its parameter name:

```tsx
const filteredCards = filterTags.size > 0
  ? cards.filter((c) => c.tags.some((t) => filterTags.has(t)))
  : cards
```

This shadows the `t` translation function destructured from `useTranslation()` at line 116. Inside the `.some()` callback, `t` resolves to the iterated tag string, not the translator. TypeScript does not error on this because both are `string`-like in this context. The risk is that a future developer adding a translated message inside that callback (e.g. for logging or display) would silently get a tag string compared/passed instead of a translation call.

**Fix:** Rename the callback parameter:
```tsx
const filteredCards = filterTags.size > 0
  ? cards.filter((c) => c.tags.some((tag) => filterTags.has(tag)))
  : cards
```

---

### WR-02: Hardcoded English string `"+N more"` in `TagChips` not localized

**File:** `apps/frontend/src/pages/DeckDetailPage.tsx:89`

**Issue:** The `TagChips` component renders the overflow label as a hardcoded English string that bypasses the i18n system entirely:

```tsx
{extra > 0 && (
  <span className="text-xs text-muted-foreground">+{extra} more</span>
)}
```

This is the only translatable UI string in the reviewed files that was not migrated to `t()`. A German-locale user sees "+2 more" instead of "+2 weitere".

**Fix:** Add the key to both locale files and use `t()`:

```json
// en.json — add to "deckDetail" section
"nMoreTags": "+{{count}} more"

// de.json — add to "deckDetail" section
"nMoreTags": "+{{count}} weitere"
```

```tsx
{extra > 0 && (
  <span className="text-xs text-muted-foreground">
    {t('deckDetail.nMoreTags', { count: extra })}
  </span>
)}
```

---

### WR-03: Test setup comment documents `initImmediate: false` but the option is absent

**File:** `apps/frontend/src/test/setup.ts:7`

**Issue:** Lines 6–9 comment: *"initImmediate: false makes init synchronous so the first render in jsdom has translations."* The option `initImmediate: false` is not present in the `init()` call at lines 10–15. The comment describes this option as the mechanism that keeps tests green. In i18next v26, initialisation with bundled `resources` happens to be synchronous by default — so tests currently pass by coincidence. If the option is absent and a future version of i18next (or a plugin) changes the default, `t()` will return raw key strings on the first render, silently breaking assertions without a clear diagnostic.

**Fix:** Add the option explicitly to match the documented intent:
```ts
void i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  initImmediate: false,   // synchronous init — required so first jsdom render has translations
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false },
})
```

---

## Info

### IN-01: Dead locale keys `lang.en` and `lang.de` — never referenced in any component

**File:** `apps/frontend/src/locales/en.json:297-299`, `apps/frontend/src/locales/de.json:296-299`

**Issue:** Both locale files define:
```json
"lang": { "en": "EN", "de": "DE" }
```
No component calls `t('lang.en')` or `t('lang.de')`. The `AppShell` language toggle renders hardcoded `'DE'` / `'EN'` literals directly. These keys are dead configuration that implies an intention that was not implemented.

**Fix (option A):** Use the defined keys in `AppShell.tsx` lines 138 and 249:
```tsx
{i18n.language === 'de' ? t('lang.de') : t('lang.en')}
```
**Fix (option B):** Delete the `"lang"` section from both locale files to eliminate the misleading dead keys.

---

### IN-02: `navItems.find()` called twice to compute `currentLabel` in `AppShell`

**File:** `apps/frontend/src/components/AppShell.tsx:37-39`

**Issue:** `currentLabel` calls `navItems.find()` with the identical predicate twice — once to test for a match and a second time (with a `!` non-null assertion) to access the result:

```ts
const currentLabel =
  navItems.find(item => location.pathname.startsWith(item.to))
    ? t(navItems.find(item => location.pathname.startsWith(item.to))!.labelKey)
    : ...
```

**Fix:**
```ts
const activeItem = navItems.find(item => location.pathname.startsWith(item.to))
const currentLabel = activeItem
  ? t(activeItem.labelKey)
  : (location.pathname.startsWith('/admin') ? t('nav.admin') : 'Kartex')
```

---

### IN-03: Inconsistent `document.title` key pattern for auth pages vs all other pages

**File:** `apps/frontend/src/pages/LoginPage.tsx:39`, `apps/frontend/src/pages/RegisterPage.tsx:38`

**Issue:** Auth pages construct the browser title by concatenating a translated partial string with a hardcoded suffix:
```ts
document.title = t('auth.signInTitle') + ' — Kartex'   // "Sign in — Kartex"
document.title = t('auth.createAccountTitle') + ' — Kartex'
```
Every other page stores the full title — including the `" — Kartex"` suffix — inside the translation key (e.g. `t('dashboard.title')` returns `"Dashboard — Kartex"`). This means the auth-page title suffix cannot be overridden per locale without touching the component source, contrary to the pattern set by every other page.

**Fix:** Move the full title into the locale key, consistent with all other pages:
```json
// en.json
"signInTitle": "Sign in — Kartex",
"createAccountTitle": "Create account — Kartex"

// de.json
"signInTitle": "Anmelden — Kartex",
"createAccountTitle": "Konto erstellen — Kartex"
```
```ts
// LoginPage.tsx / RegisterPage.tsx
document.title = t('auth.signInTitle')
document.title = t('auth.createAccountTitle')
```

---

_Reviewed: 2026-06-01_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
