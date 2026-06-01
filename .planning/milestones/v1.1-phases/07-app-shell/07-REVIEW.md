---
phase: 07-app-shell
reviewed: 2026-05-31T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - apps/frontend/src/components/__tests__/AppShell.test.tsx
  - apps/frontend/src/components/AppShell.tsx
  - apps/frontend/vite.config.ts
  - apps/frontend/src/vite-env.d.ts
findings:
  critical: 1
  warning: 5
  info: 3
  total: 9
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-05-31T00:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Four files were reviewed for the App Shell phase: the `AppShell` React component, its Vitest test suite, the Vite build config, and the ambient type declaration for `__APP_VERSION__`. The implementation is broadly correct — the drawer pattern, version injection, and auth/theme integration all hang together. However, one critical accessibility defect allows keyboard focus to reach interactive elements inside a hidden (closed) drawer, and five warnings cover a `startsWith`-based route-matching fragility, duplicate nav landmarks, a missing `@kartex/shared` alias in the Vitest config, a tight build-output coupling, and a missing keyboard escape handler for the drawer.

## Critical Issues

### CR-01: Keyboard-focusable elements inside closed drawer have no `inert` or `tabIndex={-1}` guard

**File:** `apps/frontend/src/components/AppShell.tsx:141-232`

**Issue:** The mobile drawer panel is always mounted in the DOM and uses CSS `transform` to slide off-screen when closed. `aria-hidden={!drawerOpen}` is set on the outer `<div>`, which correctly hides it from the accessibility tree when closed. However, `aria-hidden` does NOT prevent keyboard focus from reaching child elements. The drawer contains multiple `<NavLink>` anchors and two `<Button>` elements. When the drawer is closed, a keyboard user tabbing through the page can still land on these elements, activating invisible controls. This is a WCAG 2.1 SC 2.1.1 (Keyboard) violation.

**Fix:** Apply the HTML `inert` attribute to the drawer panel when it is closed. The `inert` attribute suppresses both focus and pointer events for all descendants without removing them from the DOM:

```tsx
<div
  id="mobile-nav-drawer"
  className={cn(
    'fixed top-0 left-0 h-full w-60 bg-card border-r border-border z-50 flex flex-col',
    'transition-transform duration-200 ease-in-out',
    drawerOpen ? 'translate-x-0' : '-translate-x-full',
  )}
  aria-hidden={!drawerOpen}
  inert={!drawerOpen ? true : undefined}
>
```

React 18 supports `inert` as an HTML attribute. Alternatively, add `tabIndex={-1}` to every interactive child when `!drawerOpen`, but `inert` is cleaner and covers future additions.

---

## Warnings

### WR-01: `startsWith` route matching is fragile and order-dependent

**File:** `apps/frontend/src/components/AppShell.tsx:34-36`

**Issue:** `currentLabel` is resolved by finding the first `navItem` whose `to` value satisfies `location.pathname.startsWith(item.to)`. For current routes this happens to be correct, but it relies on the insertion order in `navItems` and on the assumption no route is a prefix of another. For example, if a future route `/deck` is added before `/decks`, it would shadow `/decks/*` paths. More concretely: `startsWith('/decks')` would also match a hypothetical path `/decks-archive`. The pattern is also silently wrong on exact root matches — `/dashboard-new` would match the `Dashboard` label.

**Fix:** Match using either an exact segment check or the same `end` logic NavLink uses:

```ts
const currentLabel =
  navItems.find(item => {
    const base = item.to.replace(/\/$/, '')
    return location.pathname === base || location.pathname.startsWith(base + '/')
  })?.label ??
  (location.pathname.startsWith('/admin') ? 'Admin' : 'Kartex')
```

The same fix should be applied to the `startsWith('/admin')` fallback for consistency.

---

### WR-02: Two `<nav>` elements share identical `aria-label="Main navigation"`

**File:** `apps/frontend/src/components/AppShell.tsx:55-57` and `156-158`

**Issue:** The desktop sidebar `<nav>` and the mobile drawer `<nav>` both carry `aria-label="Main navigation"`. Screen readers that list page landmarks (e.g., NVDA's element list, VoiceOver rotor) will present two landmarks with the same name. Users cannot distinguish which is which. Although only one is visually accessible at any given viewport, both are in the DOM simultaneously.

**Fix:** Give the drawer nav a distinct label:

```tsx
/* Desktop sidebar nav */
<nav aria-label="Main navigation" …>

/* Mobile drawer nav */
<nav aria-label="Mobile navigation" …>
```

---

### WR-03: `vitest.config.ts` is missing the `@kartex/shared` path alias

**File:** `apps/frontend/vitest.config.ts:11-14`

**Issue:** `vite.config.ts` defines two aliases: `@` → `./src` and `@kartex/shared` → `../../packages/shared/src`. The `vitest.config.ts` only mirrors `@`. Any test file that imports from `@kartex/shared` (directly or transitively through a component under test) will fail with a module-not-found error in the test environment. This is a latent test-reliability bug — it will surface as soon as shared types are imported in a tested component.

**Fix:**

```ts
// vitest.config.ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
    '@kartex/shared': path.resolve(__dirname, '../../packages/shared/src'),
  },
},
```

---

### WR-04: `vite.config.ts` outputs build artifacts into `apps/backend/public` with `emptyOutDir: true`

**File:** `apps/frontend/vite.config.ts:36-39`

**Issue:** The build output directory is set to `../../apps/backend/public` with `emptyOutDir: true`. This means every frontend build deletes the entire contents of `apps/backend/public` before writing new files. If the backend ever serves static files from that directory that are not regenerated by the frontend build (e.g., uploaded media thumbnails, favicon overrides, robots.txt), they will be silently wiped on every `npm run build`. The coupling is also fragile: renaming or moving the backend app would break the frontend build without any obvious error.

**Fix:** Either use a dedicated output directory and mount it via Docker volume/Nginx config, or explicitly document in `apps/backend/public/.gitkeep` and in the deploy script what this directory contains so future contributors do not place persistent files there.

---

### WR-05: Drawer has no keyboard Escape handler, trapping keyboard users

**File:** `apps/frontend/src/components/AppShell.tsx:140-232`

**Issue:** The mobile drawer can be closed by clicking the backdrop or by clicking a nav link. There is no `keydown` listener for the Escape key. Keyboard-only users who open the drawer (via the hamburger button, which is reachable by Tab) have no standard way to dismiss it without navigating into and through the drawer contents. This fails the ARIA Authoring Practices Guide pattern for dialogs/disclosure widgets, which requires Escape to close overlay panels.

**Fix:** Add an effect or a `keydown` handler on the drawer panel:

```tsx
<div
  id="mobile-nav-drawer"
  …
  onKeyDown={(e) => { if (e.key === 'Escape') setDrawerOpen(false) }}
>
```

Also ensure focus returns to the hamburger button when the drawer closes, using a `ref` and `focus()` call in a `useEffect` that watches `drawerOpen`.

---

## Info

### IN-01: `handleLogout` wrapper function is unnecessary

**File:** `apps/frontend/src/components/AppShell.tsx:41-43`

**Issue:** The `handleLogout` function wraps `logout()` solely to discard the returned promise with `void`. It is defined once and used twice (desktop and drawer user areas). The wrapping is valid but adds indirection; an inline arrow `onClick={() => void logout()}` expresses the same intent without a named function. Minor readability concern only.

**Fix:** Inline the handler or keep the wrapper — either is acceptable, but if kept it should be moved to module scope or `useCallback` memoized to avoid re-creation on every render.

---

### IN-02: Drawer is missing an explicit close button

**File:** `apps/frontend/src/components/AppShell.tsx:150-153`

**Issue:** The drawer brand area contains only the "Kartex" text. There is no explicit close/dismiss button (`aria-label="Close navigation menu"`) inside the drawer. Users who open the drawer and are unable to interact with the backdrop (touch users with precision limitations, keyboard users before WR-05 is fixed) have no direct affordance to close it without navigating to a page.

**Fix:** Add an `X` icon button alongside the brand in the drawer header:

```tsx
<div className="h-16 flex items-center justify-between px-4">
  <span className="text-xl font-bold">Kartex</span>
  <Button
    variant="ghost"
    size="icon"
    aria-label="Close navigation menu"
    onClick={() => setDrawerOpen(false)}
  >
    <X className="h-5 w-5" aria-hidden="true" />
  </Button>
</div>
```

---

### IN-03: Test global `__APP_VERSION__` assignment bypasses Vite's `define` mechanism

**File:** `apps/frontend/src/components/__tests__/AppShell.test.tsx:7`

**Issue:** The test sets `(globalThis as Record<string, unknown>).__APP_VERSION__ = '0.1.0'` to simulate the Vite `define` injection. This works in jsdom because `__APP_VERSION__` is an unqualified identifier that falls back to the global object, but it is fragile: if Vite's `define` replacement ever changes the way the constant is compiled (e.g., via a `const` declaration in a shim), the `globalThis` assignment will have no effect and the test will throw a `ReferenceError`. The `vitest.config.ts` should inject the constant the same way `vite.config.ts` does.

**Fix:** Add the `define` block to `vitest.config.ts`:

```ts
// vitest.config.ts
import pkg from './package.json'

export default defineConfig({
  test: { … },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: { … },
})
```

Then remove the manual `globalThis` assignment from the test file.

---

_Reviewed: 2026-05-31T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
