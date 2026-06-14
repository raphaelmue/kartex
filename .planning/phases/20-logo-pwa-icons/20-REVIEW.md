---
phase: 20-logo-pwa-icons
reviewed: 2026-06-14T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - apps/frontend/public/logo.svg
  - apps/frontend/src/components/AppShell.tsx
  - apps/frontend/src/components/__tests__/AppShell.test.tsx
  - apps/frontend/package.json
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 20: Code Review Report

**Reviewed:** 2026-06-14T00:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Phase 20 introduced the Kartex logo SVG, wired it into `AppShell` in two brand areas (desktop sidebar + mobile drawer), generated PNG PWA icon assets, and registered them in `vite.config.ts` / `index.html`. The implementation mostly works, but contains one security/correctness blocker in the PWA manifest icon declaration, four warnings around accessibility, icon correctness, and test brittleness, and three minor info items.

---

## Critical Issues

### CR-01: PWA manifest conflates two distinct icon purposes in a single entry

**File:** `apps/frontend/vite.config.ts:30`

**Issue:** The manifest `icons` array contains two separate entries for `pwa-512x512.png`, but the second one specifies `purpose: 'any maskable'`. The W3C Web App Manifest spec treats `purpose` as a space-separated list of tokens, so `'any maskable'` is valid syntax — however, browsers use this **same raster file** for both purposes. A maskable icon must have significant padding ("safe zone" = inner 80% of canvas) so that OS chrome can crop a circle/squircle without clipping the artwork. The generated `maskable-icon-512x512.png` already exists in `public/` (it was produced by `pwa-assets-generator --preset minimal-2023`, which pads the artwork for safe zones), yet the manifest entry for `'any maskable'` still points to `pwa-512x512.png` instead of `maskable-icon-512x512.png`. Using the un-padded icon as a maskable icon will cause the logo's card frame (which has content close to the outer strokes) to be visually clipped on Android adaptive-icon launchers that apply a circular mask.

**Fix:**
```ts
icons: [
  { src: 'pwa-64x64.png',              sizes: '64x64',   type: 'image/png' },
  { src: 'pwa-192x192.png',            sizes: '192x192', type: 'image/png' },
  { src: 'pwa-512x512.png',            sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: 'maskable-icon-512x512.png',  sizes: '512x512', type: 'image/png', purpose: 'maskable' },
],
```
Split `any` and `maskable` into separate entries and point `maskable` at the correctly-padded file.

---

## Warnings

### WR-01: Logo SVG invisible in dark-mode contexts — hardcoded white fill

**File:** `apps/frontend/public/logo.svg:3`

**Issue:** The card background is hard-coded as `fill="#ffffff"` (pure white). When the SVG is rendered as an `<img>` tag, CSS and the document's `prefers-color-scheme` cannot alter SVG fill attributes. In the dark-theme sidebar the card icon renders as a solid white rectangle with an indigo stroke, which is legible against the dark card surface — but when the logo is used as a favicon or PWA splash icon on a device with a dark system theme, the white rectangle disappears against the white/light backgrounds browsers use for splash screens, effectively hiding the icon's main shape.

More importantly, the `favicon.svg` is an identical copy of `logo.svg` (confirmed content match). Browsers that support SVG favicons can apply `prefers-color-scheme` when the SVG uses `currentColor` or a `@media (prefers-color-scheme: dark)` block, but neither is present here.

**Fix:** Add a `<style>` block inside the SVG so the card fill adapts:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <style>
    @media (prefers-color-scheme: dark) {
      .card-bg { fill: #1e1b4b; }
    }
  </style>
  <rect class="card-bg" x="96" y="56" width="320" height="400" rx="32" ry="32"
        fill="#ffffff" stroke="#4f46e5" stroke-width="24"/>
  ...
</svg>
```
This approach is backward-compatible: browsers that do not support `prefers-color-scheme` in SVG keep the white fill.

### WR-02: Mobile drawer nav violates ARIA while visually hidden (focusable children remain in tab order)

**File:** `apps/frontend/src/components/AppShell.tsx:157-158`

**Issue:** The mobile drawer uses `aria-hidden={!drawerOpen}` to hide itself from screen readers when closed. However, `aria-hidden` does not remove interactive children from the keyboard tab order. When the drawer is closed (translated off-screen with `-translate-x-full`), all the `NavLink` and `Button` elements inside it remain focusable via `Tab`. A keyboard user can tab into the invisible drawer, navigate to links, and activate them without any visible focus indicator — a WCAG 2.1 SC 2.1.1 and 2.4.7 failure.

**Fix:** Add `inert` attribute when the drawer is closed:
```tsx
<div
  id="mobile-nav-drawer"
  className={cn(
    'fixed top-0 left-0 h-full w-60 bg-card border-r border-border z-50 flex flex-col',
    'transition-transform duration-200 ease-in-out',
    drawerOpen ? 'translate-x-0' : '-translate-x-full',
  )}
  aria-hidden={!drawerOpen}
  {...(!drawerOpen && { inert: '' })}
>
```
The `inert` attribute suppresses both tab focus and AT interaction for the entire subtree.

### WR-03: `currentLabel` computed with double `navItems.find()` call — also silently falls back to hardcoded string 'Kartex'

**File:** `apps/frontend/src/components/AppShell.tsx:36-39`

**Issue:** Lines 36-39 call `navItems.find(...)` twice for the same predicate within a single ternary:

```ts
const currentLabel =
  navItems.find(item => location.pathname.startsWith(item.to))
    ? t(navItems.find(item => location.pathname.startsWith(item.to))!.labelKey)
    : (location.pathname.startsWith('/admin') ? t('nav.admin') : 'Kartex')
```

The first call checks existence; the second retrieves the item with a non-null assertion (`!`). If `navItems` is ever mutated between the two calls (not currently possible with a module-level `const`, but the pattern is fragile), or if this is refactored to a mutable source, the `!` assertion will throw. Additionally the fallback `'Kartex'` is a hardcoded string literal rather than a translation key — if the app is localized into non-Latin scripts this page title will not translate.

**Fix:**
```ts
const matchedItem = navItems.find(item => location.pathname.startsWith(item.to))
const currentLabel = matchedItem
  ? t(matchedItem.labelKey)
  : location.pathname.startsWith('/admin')
    ? t('nav.admin')
    : t('nav.home')   // add 'nav.home': 'Kartex' to en.json / de.json
```

### WR-04: Test SHELL-02b's backdrop selector is overly fragile and will break if class order changes

**File:** `apps/frontend/src/components/__tests__/AppShell.test.tsx:90`

**Issue:** The test locates the mobile backdrop using a compound CSS selector:
```ts
const backdrop = document.querySelector('[aria-hidden="true"].fixed.inset-0')
```
This selector depends on specific Tailwind utility classes being present on the element **in addition to** `aria-hidden`. If a future change renames, splits, or removes those utility classes (e.g., switching to a CSS module or a different layout approach), the selector silently returns `null`, causing the test to fail at `fireEvent.click(backdrop!)` with an unhelpful crash rather than a clear assertion failure. The `expect(backdrop).not.toBeNull()` check is present but the message won't indicate why the selector didn't match.

Furthermore, the desktop sidebar `<aside>` brand logo also has `aria-hidden="true"`, and several other elements may share classes with the backdrop. The compound selector is not guaranteed to be unique.

**Fix:** Add a `data-testid="mobile-backdrop"` attribute to the backdrop `<div>` in `AppShell.tsx` and use `screen.getByTestId('mobile-backdrop')` in the test. This decouples test mechanics from layout implementation.

---

## Info

### IN-01: `pwa-64x64.png` generated but not listed in manifest icons

**File:** `apps/frontend/vite.config.ts:27-31`

**Issue:** `public/pwa-64x64.png` exists in the `public/` directory (produced by `pwa-assets-generator`) but is omitted from the manifest `icons` array. PWA install prompts pick the closest available icon size; without a 64 × 64 entry, browsers that look for a small icon (e.g., taskbar pinning on Windows) will fall back to the 192 × 192 entry and scale it down. This is not a breakage but wastes an asset that was already generated.

**Fix:** Add the 64 × 64 entry to the manifest icons array (see CR-01 fix for the full corrected list).

### IN-02: `apple-touch-icon` link in `index.html` references generic filename without explicit size attribute

**File:** `apps/frontend/index.html:7`

**Issue:**
```html
<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
```
The file `apple-touch-icon.png` exists in `public/` alongside the more specifically named `apple-touch-icon-180x180.png`. Both appear to be 180 × 180 images generated by `pwa-assets-generator`. Having two copies (one named generically, one with the size in the filename) with the same content is confusing. Only the generic `apple-touch-icon.png` is referenced in `index.html`, which is correct per Apple's convention, but the duplicate `apple-touch-icon-180x180.png` is an unnecessary artifact taking up space.

**Fix:** Remove `apple-touch-icon-180x180.png` from `public/` if it is not referenced anywhere, or confirm it is intentionally kept as an alias. If kept, update the link to use the size-named file for clarity:
```html
<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" sizes="180x180" />
```

### IN-03: GITHUB_URL and DOCS_URL defined as inline constants — should be configuration constants

**File:** `apps/frontend/src/components/AppShell.tsx:41-42`

**Issue:** Two URLs are hard-coded as `const` variables inside the component function body, meaning they are re-allocated on every render:
```ts
const GITHUB_URL = 'https://github.com/raphaelmue/kartex'
const DOCS_URL   = 'https://github.com/raphaelmue/kartex/blob/main/docs/kartex-format.md'
```
These are never configurable and currently reference a personal GitHub namespace (`raphaelmue`). If the repository is moved or these URLs need to change, they must be found and updated inside a render function rather than in a central config. Move them to module scope (outside the component) or to a project-level constants file.

**Fix:**
```ts
// Outside the component, at module scope:
const GITHUB_URL = 'https://github.com/raphaelmue/kartex'
const DOCS_URL   = 'https://github.com/raphaelmue/kartex/blob/main/docs/kartex-format.md'

export function AppShell() { ... }
```

---

_Reviewed: 2026-06-14T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
