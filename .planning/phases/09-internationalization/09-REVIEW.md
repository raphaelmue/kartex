---
phase: 09-internationalization
reviewed: 2026-06-01T15:30:45Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - apps/frontend/src/i18n.ts
  - apps/frontend/src/i18n.d.ts
  - apps/frontend/src/main.tsx
  - apps/frontend/src/test/setup.ts
  - apps/frontend/src/components/__tests__/LanguageToggle.test.tsx
  - apps/frontend/src/components/AppShell.tsx
  - apps/frontend/src/components/CardFlip.tsx
  - apps/frontend/src/components/RatingButtons.tsx
  - apps/frontend/src/components/SessionProgress.tsx
  - apps/frontend/src/components/ExamTimer.tsx
  - apps/frontend/src/components/MediaUploadToolbar.tsx
  - apps/frontend/src/components/DeckFormModal.tsx
  - apps/frontend/src/components/CardEditorModal.tsx
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
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 09: Code Review Report

**Reviewed:** 2026-06-01T15:30:45Z
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

This phase adds react-i18next internationalization across the full frontend — locale files, type augmentation, test setup, and translation calls in every component and page. The locale files (en.json, de.json) are complete and internally consistent; no missing keys were found between them.

Two blockers were found: the test setup comment promises synchronous i18n initialization via `initImmediate: false` but the option is absent from the actual `init()` call, meaning tests can render before translations load; and an unhandled promise rejection path exists in `MediaUploadToolbar` when `fetch` throws a network error. Four warnings cover a stale-closure risk in `ExamTimer`, a hardcoded English string in `DeckDetailPage`, dead locale keys in AppShell, and a `console.error` left in production code. Three info items address code duplication and style.

---

## Critical Issues

### CR-01: `initImmediate: false` missing from test i18n setup — translations may not be ready on first render

**File:** `apps/frontend/src/test/setup.ts:6-15`
**Issue:** The comment at line 6-9 explicitly states that `initImmediate: false` is required to make `i18n.init()` synchronous in the test environment, and that without it the first render in jsdom will receive key strings rather than translated text. The option is described as the reason all existing tests stay green. However, `initImmediate: false` is **not present** in the actual `init()` options object passed at lines 10-15. The promise returned by `init()` is discarded via `void`. In the default configuration, i18next defers initialization to the next tick via `setImmediate`/`setTimeout`. If a test renders a component before the tick resolves, `t('some.key')` returns the key string `"some.key"` rather than the English text, causing assertion failures or silent test mismatch.

**Fix:**
```ts
void i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  initImmediate: false,   // <-- add this; makes init run synchronously
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false },
})
```

---

### CR-02: Unhandled promise rejection in `MediaUploadToolbar` on network error

**File:** `apps/frontend/src/components/MediaUploadToolbar.tsx:61-65, 70-74`
**Issue:** `handleUpload` is called with `.finally()` only — there is no `.catch()`. If `fetch('/api/media/upload', ...)` throws a network-level error (e.g. `TypeError: Failed to fetch`), the rejected promise propagates through `handleUpload` (which is `async`) and is not caught. The `.finally()` callback still runs to reset state, but the rejection itself becomes an unhandled promise rejection, which is logged as an uncaught error in the browser console and silently swallows the failure without showing the user an error toast.

```ts
// handleImageChange — no .catch(), network errors silently fail
handleUpload(file, 'image').finally(() => {
  setUploadingImage(false)
  if (imageInputRef.current) imageInputRef.current.value = ''
})
```

**Fix:** Add a `.catch()` to show the error toast and prevent unhandled rejections:
```ts
handleUpload(file, 'image')
  .catch(() => toast.error(t('media.uploadFailed')))
  .finally(() => {
    setUploadingImage(false)
    if (imageInputRef.current) imageInputRef.current.value = ''
  })
```
Apply the same fix to `handleAudioChange` at lines 70-74.

---

## Warnings

### WR-01: `ExamTimer` — `onExpire` excluded from effect deps, stale closure risk

**File:** `apps/frontend/src/components/ExamTimer.tsx:15-33`
**Issue:** The `useEffect` that starts the interval deliberately excludes `onExpire` from the dependency array (the eslint-disable comment on line 32 applies only to `durationSeconds`). If the parent component passes a new `onExpire` reference on a subsequent render (e.g., an inline arrow function), the interval will still call the stale version captured at mount time. In `StudySessionPage`, `onExpire` is `() => setExamExpired(true)`, which is recreated on every render. While `setExamExpired` itself is a stable state-setter and the closure is benign in this specific call site, the pattern is fragile: any future refactor of the parent's `onExpire` that adds logic beyond calling a state setter could silently call stale code.

**Fix:** Wrap `onExpire` in a ref so the effect always calls the latest version without re-creating the interval:
```ts
const onExpireRef = useRef(onExpire)
useEffect(() => { onExpireRef.current = onExpire }, [onExpire])

useEffect(() => {
  timerRef.current = setInterval(() => {
    setSecondsLeft((prev) => {
      if (prev <= 1) {
        clearInterval(timerRef.current!)
        timerRef.current = null
        onExpireRef.current()   // always latest
        return 0
      }
      return prev - 1
    })
  }, 1000)
  return () => { if (timerRef.current) clearInterval(timerRef.current) }
}, [durationSeconds])
```

---

### WR-02: Hardcoded English string `"more"` in `DeckDetailPage` bypasses i18n

**File:** `apps/frontend/src/pages/DeckDetailPage.tsx:90`
**Issue:** The `TagChips` component renders `+{extra} more` as a hardcoded English string. This is the only translatable string in the reviewed codebase that was not migrated to the i18n system. In German locale it will render as e.g. "+2 more" instead of "+2 weitere".

```tsx
{extra > 0 && (
  <span className="text-xs text-muted-foreground">+{extra} more</span>
)}
```

**Fix:** Add a key to both locale files and use `t()`:

en.json: `"nMoreTags": "+{{count}} more"`
de.json: `"nMoreTags": "+{{count}} weitere"`

```tsx
{extra > 0 && (
  <span className="text-xs text-muted-foreground">{t('common.nMoreTags', { count: extra })}</span>
)}
```

---

### WR-03: Dead locale keys `lang.en` / `lang.de` — language toggle uses hardcoded strings instead

**File:** `apps/frontend/src/components/AppShell.tsx:138, 249`
**Issue:** Both locale files (en.json and de.json) define a `lang` namespace with `en: "EN"` and `de: "DE"`. These keys are never used. The language toggle button instead renders hardcoded string literals `'DE'` / `'EN'`:

```tsx
{i18n.language === 'de' ? 'DE' : 'EN'}
```

This is inconsistent — the locale files imply the intention to translate these labels, but the implementation bypasses them. If those locale keys are removed the code still works, but if they are kept they should be used, otherwise the keys are dead weight that misleads future maintainers.

**Fix (option A — use the keys that already exist):**
```tsx
{i18n.language === 'de' ? t('lang.de') : t('lang.en')}
```

**Fix (option B — remove the dead keys):** Delete `lang.en` and `lang.de` from both locale files to remove the confusion.

---

### WR-04: `console.error` left in production code

**File:** `apps/frontend/src/pages/StudySessionPage.tsx:254`
**Issue:** A `console.error` call is present in the prefetch effect of `StudySessionPage`. The comment acknowledges this is for debugging purposes (`"WR-04"`), but it will emit error-level log noise in production builds and reveal internal context about the data-fetching flow to anyone with DevTools open.

```ts
console.error('[StudySessionPage] prefetch failed:', err)
```

**Fix:** Either remove the log entirely (the comment already says it is non-critical) or replace it with a proper error boundary / toast if user feedback is desired:
```ts
// remove the console.error — failure is non-critical and already handled by empty state
```

---

## Info

### IN-01: `VisibilityBadge` component duplicated verbatim in `DecksPage` and `DeckDetailPage`

**File:** `apps/frontend/src/pages/DecksPage.tsx:19-40`, `apps/frontend/src/pages/DeckDetailPage.tsx:30-51`
**Issue:** The `VisibilityBadge` function component is identical in both files, including its i18n keys and Tailwind classes. Any change to badge styling or translation keys must be made twice.

**Fix:** Extract `VisibilityBadge` into a shared component (e.g., `apps/frontend/src/components/VisibilityBadge.tsx`) and import it in both pages.

---

### IN-02: Double `navItems.find()` call in `AppShell` title derivation

**File:** `apps/frontend/src/components/AppShell.tsx:36-39`
**Issue:** `navItems.find()` is called twice — once to check for a truthy match and once more (with a `!` assertion) to access the `.labelKey`. The first result is discarded.

```ts
const currentLabel =
  navItems.find(item => location.pathname.startsWith(item.to))
    ? t(navItems.find(item => location.pathname.startsWith(item.to))!.labelKey)
    : ...
```

**Fix:** Capture the result once:
```ts
const activeItem = navItems.find(item => location.pathname.startsWith(item.to))
const currentLabel = activeItem
  ? t(activeItem.labelKey)
  : (location.pathname.startsWith('/admin') ? t('nav.admin') : 'Kartex')
```

---

### IN-03: i18n init error silently swallowed in `i18n.ts`

**File:** `apps/frontend/src/i18n.ts:12`
**Issue:** The `void` operator discards the promise returned by `.init()`. If initialization fails (malformed JSON, missing resource, plugin error), there is no error handler and the failure is silently ignored. The app will continue running with i18n in an uninitialized or partially initialized state, causing `t()` to return raw keys everywhere with no visible indication of the root cause.

**Fix:** Attach a `.catch()` for at minimum a console error in development:
```ts
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({ ... })
  .catch((err) => {
    console.error('[i18n] initialization failed:', err)
  })
```

---

_Reviewed: 2026-06-01T15:30:45Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
