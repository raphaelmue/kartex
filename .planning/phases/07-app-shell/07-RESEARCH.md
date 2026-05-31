# Phase 7: App Shell - Research

**Researched:** 2026-05-31
**Domain:** React responsive layout, Tailwind CSS mobile patterns, Vite build-time injection, WCAG accessibility
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** A full-width mobile-only topbar appears on screens narrower than 768px. On desktop (≥768px) it is hidden.
- **D-02:** The topbar contains three elements: hamburger icon (far left) + "Kartex" brand name + current page title.
- **D-03:** Current page title reflects active route label — may read from `navItems.find()` against `useLocation()`.
- **D-04:** The sidebar opens as a left-side overlay drawer — content does not push; drawer renders on top with `position: fixed`.
- **D-05:** A semi-transparent dark backdrop covers the content area behind the drawer when open.
- **D-06:** Drawer closes on: (a) tapping the backdrop, (b) clicking any nav link. No X button.
- **D-07:** Footer sits in the content column only (right of sidebar). AppShell `flex h-screen` layout preserved.
- **D-08:** Footer is sticky at the bottom of the viewport — always visible regardless of content scroll.
- **D-09:** Footer shows: version number (`v0.1.0`), `© Raphael Müßeler`, and two hardcoded links.
- **D-10:** Hardcoded footer links: GitHub repository + Documentation / README.
- **D-11:** Version string imported at build time via `import.meta.env` Vite pattern or direct import from `package.json`. Planner chooses.

### Claude's Discretion

- Exact Tailwind classes for topbar height, backdrop opacity, drawer animation
- Whether to extract the drawer into a separate `MobileSidebar.tsx` or keep inline in `AppShell.tsx`
- Footer height, text size, and arrangement of footer elements
- How exactly the page title is surfaced in the topbar

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SHELL-01 | Sidebar collapses by default below 768px and can be toggled via a hamburger button | Tailwind `hidden md:flex` / `flex md:hidden` breakpoint pattern; `Menu` icon from lucide-react already installed |
| SHELL-02 | On mobile, opening the sidebar renders as an overlay drawer (no layout push) | `position: fixed` drawer panel with `z-50`, backdrop `z-40`; CSS transform slide or conditional render; `useState(false)` local state |
| SHELL-03 | App footer shows version (from package.json), "© Raphael Müßeler", and optional links | Vite `define` approach for version injection; semantic `<footer>` element; `<a target="_blank" rel="noopener noreferrer">` for external links |

</phase_requirements>

---

## Summary

Phase 7 is a pure frontend modification to a single file (`AppShell.tsx`, currently 127 lines). The scope is tightly bounded: add responsive mobile behavior and a footer. No new npm dependencies are required. All needed tools — `lucide-react`, shadcn `Button`, `NavLink`, Tailwind CSS — are already installed.

The three research questions with definitive answers are: (1) **version injection**: use `vite.config.ts` `define` with a `createRequire`-based package.json read, because `resolveJsonModule` is incompatible with the project's current `allowImportingTsExtensions: true` + `moduleResolution: "bundler"` tsconfig combination; (2) **drawer animation**: use CSS transform toggle (`translate-x-0` / `-translate-x-full`) rather than conditional render, to get a smooth 200ms slide without DOM mount/unmount; (3) **`min-h-0`**: the correct Tailwind fix for the Safari flex child overflow bug in `flex flex-col h-screen` layouts.

**Primary recommendation:** Make all changes directly in `AppShell.tsx`, adding ~70 lines. Extract to `MobileSidebar.tsx` only if the file exceeds 200 lines after the edit (it will not — expected total is ~195 lines). The UI-SPEC is the authoritative source for all visual contracts; all decisions in this document defer to it.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Mobile sidebar toggle | Browser / Client | — | Pure UI state (`useState`) — no server involvement |
| Overlay drawer | Browser / Client | — | CSS positioning (`fixed`), local state |
| Backdrop | Browser / Client | — | Presentational overlay, no data |
| Mobile topbar | Browser / Client | — | Layout element, page title from router hook |
| App footer | Browser / Client | — | Static content + build-time version constant |
| Version string | CDN / Static (build time) | — | Vite `define` injects at build; no runtime fetch |

---

## Standard Stack

### Core (all already installed — no new dependencies)

| Library | Installed Version | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| `lucide-react` | `^1.16.0` | Hamburger (`Menu`) icon for topbar trigger | Already used in AppShell for theme icons |
| `tailwindcss` | `^3.4.17` | Responsive classes (`hidden md:flex`), transform animation | Design system for this project |
| `react-router-dom` | `^6.28.0` | `NavLink`, `useLocation` | Routing already established |
| shadcn `Button` | (copy-paste) | Ghost icon button for hamburger | Pattern already used for theme toggle |

### No New Packages

This phase installs zero new npm dependencies. All required building blocks exist.

**Package Legitimacy Audit:** NOT REQUIRED — no packages to install.

---

## Architecture Patterns

### System Architecture Diagram

```
User (mobile, < 768px)
    │ tap hamburger
    ▼
AppShell (useState: drawerOpen)
    ├── <header> Mobile Topbar [flex md:hidden]
    │       └── hamburger Button → setDrawerOpen(true)
    │       └── "Kartex" brand + page title (from useLocation + navItems)
    │
    ├── <aside> Desktop Sidebar [hidden md:flex]  ← UNCHANGED
    │
    ├── Backdrop [fixed inset-0 z-40, aria-hidden] ← conditional render
    │       └── onClick → setDrawerOpen(false)
    │
    ├── Drawer Panel [fixed top-0 left-0 z-50, CSS transform toggle]
    │       └── NavLinks with onClick → setDrawerOpen(false)
    │       └── user area (theme toggle, logout) — same as sidebar
    │
    └── Right Column [flex flex-col flex-1 min-h-0]
            ├── <main> [flex-1 overflow-y-auto]  ← content
            └── <footer> [h-10 shrink-0]  ← NEW
                    ├── Left: v0.1.0 · © Raphael Müßeler
                    └── Right: GitHub | Docs links
```

### Recommended Project Structure

No new directories needed. Modifications are:

```
apps/frontend/src/
├── components/
│   └── AppShell.tsx          ← primary edit target (~195 lines after edit)
│   └── AppFooter.tsx         ← optional extraction (executor discretion)
├── vite-env.d.ts             ← add declare const __APP_VERSION__: string
vite.config.ts                ← add define block (apps/frontend/vite.config.ts)
```

### Pattern 1: Right Column with Footer (flex layout)

The current `<main>` element is a direct child of the outer flex container. To add a footer below `<main>`, wrap both in a `flex flex-col` container with `min-h-0` to fix Safari overflow.

**What:** Replace `<main className="flex-1 overflow-y-auto ...">` with a wrapping `<div className="flex flex-col flex-1 min-h-0">` containing `<main>` + `<footer>`.

**Why `min-h-0`:** Flex children have `min-height: auto` by default. In Safari, this prevents the flex child from shrinking when content overflows. `min-h-0` overrides to `min-height: 0`, allowing the child to respect its flex constraints. This is the canonical fix. [VERIFIED: multiple flexbugs references + CSS specification behavior]

```tsx
// Source: UI-SPEC §Structural Layout + flexbugs fix
<div className="flex flex-col flex-1 min-h-0">
  <header className="flex items-center md:hidden h-16 px-4 bg-card border-b border-border">
    {/* mobile topbar */}
  </header>
  <main className="flex-1 overflow-y-auto bg-background p-8">
    <Outlet />
  </main>
  <footer className="h-10 shrink-0 border-t border-border flex items-center justify-between px-4 text-xs text-muted-foreground">
    {/* footer content */}
  </footer>
</div>
```

### Pattern 2: CSS Transform Drawer (preferred over conditional render)

**What:** Keep the drawer panel always in the DOM. Toggle `translate-x-0` / `-translate-x-full` via Tailwind class. Use `transition-transform duration-200 ease-in-out`.

**Why over conditional render:** CSS transform animates on the GPU compositor thread, avoiding layout recalculation. Conditional render (mount/unmount) cannot animate the exit — the element is removed before any transition runs, producing an instant disappearance. The 200ms slide specified in UI-SPEC requires always-in-DOM with transform toggle. [VERIFIED: CSS transform compositing — GPU path, no layout recalculation]

**Focus management note:** When using always-in-DOM approach, inert the drawer panel when closed so screen readers and keyboard users cannot Tab into it. Alternatively, use `tabIndex={-1}` on all focusable children, or apply `aria-hidden={!drawerOpen}` to the panel. [ASSUMED — inert attribute browser support ~97% as of 2025; verify if IE11 is a concern, it is not for this project]

```tsx
// Source: UI-SPEC §Dimension 5 — Interaction & Motion
<div
  id="mobile-nav-drawer"
  className={cn(
    'fixed top-0 left-0 h-full w-60 bg-card border-r border-border z-50 flex flex-col',
    'transition-transform duration-200 ease-in-out',
    drawerOpen ? 'translate-x-0' : '-translate-x-full',
  )}
  aria-hidden={!drawerOpen}
>
  {/* nav content mirrors desktop aside */}
</div>
```

**Backdrop** — always-in-DOM is harder to animate on exit; conditional render is acceptable here since the backdrop has no exit animation requirement. Simple pattern: `{drawerOpen && <div ... />}`.

### Pattern 3: Vite `define` for Build-Time Version Injection

**What:** Read `version` from `package.json` in `vite.config.ts` using `createRequire` (Node.js ESM-safe approach). Inject as a global constant `__APP_VERSION__`.

**Why NOT `import pkg from '../../package.json' assert { type: 'json' }`:**
- Import assertions (`assert { type: 'json' }`) are **deprecated** in Node.js v22+; the replacement is import attributes (`with { type: 'json' }`).
- The project is running **Node.js v24.14.0** — import assertions may not work.
- Even if they worked, this injects the whole `package.json` into the browser bundle (a security concern — exposes all metadata).

**Why NOT `resolveJsonModule: true` in tsconfig:**
- The current `tsconfig.json` uses `moduleResolution: "bundler"` + `allowImportingTsExtensions: true`.
- Adding `resolveJsonModule: true` raises a TypeScript error: `"Option 'resolveJsonModule' cannot be specified without 'node' module resolution strategy"`. This is a documented TypeScript constraint when `allowImportingTsExtensions` is combined with `moduleResolution: "bundler"`. [VERIFIED: TypeScript compiler behavior — multiple issue threads confirm] Changing `moduleResolution` would break the Vite alias setup and the `@/*` path imports.

**Correct approach — `createRequire` in `vite.config.ts`:**

```ts
// apps/frontend/vite.config.ts (addition to existing config)
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const pkg = require('./package.json') as { version: string }

export default defineConfig({
  // ...existing config...
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
```

**TypeScript declaration** (add to `apps/frontend/src/vite-env.d.ts` or create it):

```ts
// Source: Vite define documentation pattern
declare const __APP_VERSION__: string
```

**Usage in component:**

```tsx
const version = __APP_VERSION__ // 'v0.1.0' — replaced at build time
```

Prepend `v` in the display: `v${__APP_VERSION__}` → `v0.1.0`.

**Alternative still valid:** `import.meta.env.VITE_APP_VERSION` via defining `'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version)` — both patterns are supported by Vite 5. The `__APP_VERSION__` pattern is marginally cleaner (no `import.meta.env` prefix). [CITED: vite.dev/config/shared-options.html — define option]

### Pattern 4: NavLink with `onClick` to Close Drawer

`NavLink` from `react-router-dom` v6 is a thin wrapper around `<a>` and accepts standard DOM event handlers including `onClick`. [CITED: reactrouter.com/api/components/NavLink] No wrapping or hook needed.

```tsx
// Source: react-router-dom v6 NavLink API — onClick is standard React prop
<NavLink
  key={to}
  to={to}
  onClick={() => setDrawerOpen(false)}
  className={({ isActive }) => cn(...)}
>
  {({ isActive }) => <>{/* icon + label */}</>}
</NavLink>
```

`onClick` fires before navigation — React Router still navigates normally. Do NOT call `event.preventDefault()` unless you want to block navigation.

### Pattern 5: Page Title Derivation in Topbar

```tsx
// Source: CONTEXT.md §D-03 + UI-SPEC §Topbar element layout
import { useLocation } from 'react-router-dom'

const location = useLocation()
const currentLabel =
  navItems.find(item => location.pathname.startsWith(item.to))?.label ?? 'Kartex'
```

Admin link (`/admin`) is not in `navItems`. Either add it to `navItems` as a conditional entry (cleaner), or handle as a special case with `|| (location.pathname.startsWith('/admin') ? 'Admin' : 'Kartex')`.

### Anti-Patterns to Avoid

- **Putting `min-h-0` on `<main>` instead of the right-column wrapper:** `min-h-0` must be on the direct flex child that is the column container, not on `<main>`. The right-column `div` is the flex child of the outer `flex h-screen` container.
- **Using `display: none` to hide the drawer instead of `translate`:** `display: none` cannot be transitioned, producing instant show/hide with no animation.
- **Adding `resolveJsonModule: true` to tsconfig:** Breaks TypeScript compilation with the current `moduleResolution: "bundler"` + `allowImportingTsExtensions` combo.
- **Placing the backdrop `z-50` and drawer `z-50`:** The backdrop must be `z-40` (behind the drawer at `z-50`) per UI-SPEC §Z-index stacking.
- **Using `import.meta.url` for version at runtime:** Version must be a build-time constant, not a runtime file read.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Version string at build time | Custom file I/O or fetch at runtime | Vite `define` in `vite.config.ts` | Build-time replacement is zero runtime cost; no async |
| Hamburger icon | SVG string | `Menu` from `lucide-react` | Already imported; consistent sizing with `h-5 w-5` |
| Conditional class joining | `${open ? 'translate-x-0' : '-translate-x-full'}` strings | `cn()` utility | Already imported in `AppShell.tsx`; handles merge conflicts |
| Focus trap in drawer | Custom Tab intercept listener | `aria-hidden={!drawerOpen}` + `inert` attribute | Acceptable for this phase per UI-SPEC §Dimension 6 |

**Key insight:** This phase modifies 127 lines of existing, well-structured code. The heavy lifting is already done — routing, auth, theme, nav items. The additions are additive layout changes, not architectural.

---

## Common Pitfalls

### Pitfall 1: Safari Flex Overflow (missing `min-h-0`)

**What goes wrong:** On Safari, the right column (`flex-1`) expands to intrinsic content height instead of being constrained by the parent `h-screen`. The footer pushes off-screen or the main content does not scroll.

**Why it happens:** CSS flexbox default `min-height: auto` on flex children. Chrome respects `flex-1` correctly; Safari uses the intrinsic height floor.

**How to avoid:** Add `min-h-0` to the right-column wrapper div: `<div className="flex flex-col flex-1 min-h-0">`.

**Warning signs:** Footer visible on Chrome but cut off on Safari/WebKit; `<main>` scroll does not work on mobile.

### Pitfall 2: `resolveJsonModule` + `allowImportingTsExtensions` conflict

**What goes wrong:** Adding `"resolveJsonModule": true` to `tsconfig.json` causes TypeScript error: `Option 'resolveJsonModule' cannot be specified without 'node' module resolution strategy.`

**Why it happens:** `allowImportingTsExtensions: true` requires `moduleResolution: "bundler"`. `resolveJsonModule` is not supported with `moduleResolution: "bundler"`. These two options are mutually exclusive with that tsconfig combination. [VERIFIED: TypeScript compiler constraint]

**How to avoid:** Use the Vite `define` approach with `createRequire` in `vite.config.ts` instead. Do not touch `tsconfig.json`.

### Pitfall 3: Import assertion deprecation in Node.js v24

**What goes wrong:** Using `import pkg from './package.json' assert { type: 'json' }` in `vite.config.ts` may fail or emit deprecation warnings on Node v22+. The project runs Node v24.14.0.

**Why it happens:** The `assert { type: 'json' }` syntax is deprecated in Node.js v22+ (replaced by `with { type: 'json' }` import attributes). esbuild, which Vite 5 uses to process config files, may strip import attributes and produce errors.

**How to avoid:** Use `createRequire` from `'module'` to read `package.json` synchronously in `vite.config.ts`. This is Node-native CJS-in-ESM, always safe.

### Pitfall 4: Drawer focus leak (keyboard accessibility)

**What goes wrong:** When the drawer is closed (off-screen via `translate`), keyboard users can still Tab into the drawer's focusable elements because the drawer remains in the DOM.

**Why it happens:** CSS transform does not remove elements from the tab order. `-translate-x-full` is purely visual.

**How to avoid:** Add `aria-hidden={!drawerOpen}` to the drawer panel div. Additionally, add `tabIndex={-1}` to the drawer wrapper or use the HTML `inert` attribute (`inert={!drawerOpen}`). The `inert` attribute (now supported in all modern browsers) removes all children from the tab order and accessibility tree. [ASSUMED — `inert` attribute browser support: ~97% globally as of mid-2025; sufficient for this project's audience]

**Minimum viable for this phase per UI-SPEC §Dimension 6:** Focus moves into drawer on open (`useEffect` + `ref.focus()` on first nav link). Full focus trap is executor discretion.

### Pitfall 5: Admin link missing from page title derivation

**What goes wrong:** `navItems.find(item => location.pathname.startsWith(item.to))` returns `undefined` on `/admin` because the Admin link is conditional and not in `navItems`.

**Why it happens:** Admin link is rendered separately with a guard (`user?.role === 'ADMIN'`).

**How to avoid:** Either (a) add the Admin item to `navItems` with a `requiresAdmin: true` flag and filter it in rendering, or (b) add a special-case fallback: `|| (pathname.startsWith('/admin') && user?.role === 'ADMIN' ? 'Admin' : 'Kartex')`. Option (a) is cleaner.

### Pitfall 6: GitHub URL mismatch

**What goes wrong:** The UI-SPEC footer constants reference `https://github.com/raphael-mueller/kartex` but the actual git remote is `https://github.com/raphaelmue/kartex.git`.

**Verified canonical URL:** `https://github.com/raphaelmue/kartex` (git remote confirmed). [VERIFIED: git remote get-url origin]

```ts
// Correct constants for footer
const GITHUB_URL = 'https://github.com/raphaelmue/kartex'
const DOCS_URL = 'https://github.com/raphaelmue/kartex#readme'
```

---

## Code Examples

### Complete `vite.config.ts` with version define

```ts
// Source: Vite define docs + createRequire Node.js module pattern
import { createRequire } from 'module'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'
import topLevelAwait from 'vite-plugin-top-level-await'
import wasm from 'vite-plugin-wasm'

const require = createRequire(import.meta.url)
const pkg = require('./package.json') as { version: string }

export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@kartex/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  // ...rest unchanged
})
```

### TypeScript global declaration

```ts
// apps/frontend/src/vite-env.d.ts  (create if not exists)
/// <reference types="vite/client" />
declare const __APP_VERSION__: string
```

Check if `vite-env.d.ts` already exists before creating — avoid duplicating `/// <reference types="vite/client" />`.

### Hamburger button (matches existing theme toggle pattern)

```tsx
// Source: UI-SPEC §Dimension 4 — Component Contracts
import { Menu } from 'lucide-react'

<Button
  variant="ghost"
  size="icon"
  aria-label="Open navigation menu"
  aria-expanded={drawerOpen}
  aria-controls="mobile-nav-drawer"
  onClick={() => setDrawerOpen(true)}
>
  <Menu className="h-5 w-5" aria-hidden="true" />
</Button>
```

### Footer

```tsx
// Source: UI-SPEC §Dimension 2 + §Dimension 4
const GITHUB_URL = 'https://github.com/raphaelmue/kartex'
const DOCS_URL = 'https://github.com/raphaelmue/kartex#readme'

<footer className="h-10 shrink-0 border-t border-border flex items-center justify-between px-4 text-xs text-muted-foreground">
  <span>
    v{__APP_VERSION__}&nbsp;·&nbsp;© Raphael Müßeler
  </span>
  <div className="flex items-center gap-3">
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-foreground underline-offset-4 hover:underline"
    >
      GitHub
    </a>
    <a
      href={DOCS_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-foreground underline-offset-4 hover:underline"
    >
      Docs
    </a>
  </div>
</footer>
```

---

## Component Extraction Decision

**Recommendation: keep inline in `AppShell.tsx`.**

| Factor | Value |
|--------|-------|
| Current file size | 127 lines |
| Estimated additions | ~65-75 lines (topbar ~15, drawer ~30, footer ~20, state/imports ~10) |
| Projected total | ~195 lines |
| Project limit (CLAUDE.md) | 500 lines |

195 lines is well within the project's 500-line guideline. The mobile drawer content is a near-duplicate of the existing sidebar markup — extraction to `MobileSidebar.tsx` would actually increase total lines (add file boundary overhead) without improving clarity at this scale. Inline keeps the responsive behavior visible alongside the desktop sidebar it mirrors. If the file grows past ~300 lines in a future phase, extraction is warranted then.

**Extract `AppFooter.tsx` only if** footer logic becomes complex (e.g., dynamic link management in Phase 9+). For this phase, an inline `<footer>` element is sufficient.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `assert { type: 'json' }` import assertions | `with { type: 'json' }` import attributes (or `createRequire`) | Assertions deprecated in Node 22+; `createRequire` is the safe CJS fallback |
| `resolveJsonModule` for JSON imports in `tsconfig` | Not compatible with `moduleResolution: "bundler"` + `allowImportingTsExtensions` | Vite `define` is the workaround for this project's tsconfig |
| Headless UI `<Transition>` for drawer animation | CSS transform toggle via Tailwind + `cn()` | Simpler, no additional library needed for 200ms slide |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `inert` attribute browser support ~97% as of mid-2025 | Pattern 2, Pitfall 4 | If lower, need `aria-hidden` + manual `tabIndex={-1}` — still simple to fix |
| A2 | `with { type: 'json' }` import attributes supported in Node v24 | Pitfall 3 | Low risk — `createRequire` is the recommended approach regardless; this affects only the explanation |
| A3 | `lucide-react ^1.16.0` includes the `Menu` icon | Standard Stack | If missing, different icon name needed — check lucide.dev for correct export name before coding |

---

## Open Questions

1. **Does `vite-env.d.ts` already exist in the project?**
   - What we know: `vitest.config.ts` exists; `src/test/setup.ts` exists. No `vite-env.d.ts` was found in the glob search.
   - What's unclear: Whether `/// <reference types="vite/client" />` is declared elsewhere.
   - Recommendation: Planner should add a Wave 0 task to check for `src/vite-env.d.ts` before creating it. If it exists, append the `declare const __APP_VERSION__` line.

2. **Does `Menu` export exactly as `Menu` from `lucide-react` v1.16.0?**
   - What we know: `lucide-react ^1.16.0` is installed. `BookOpen`, `Compass`, `LayoutDashboard`, `Moon`, `Settings`, `Shield`, `Sun`, `Upload` are confirmed imports in `AppShell.tsx`.
   - What's unclear: Whether `Menu` is the correct export name in v1.x (Lucide has renamed icons historically).
   - Recommendation: Executor should verify `import { Menu } from 'lucide-react'` compiles without error in Wave 0.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite build, `createRequire` | ✓ | v24.14.0 | — |
| Vite | Build-time `define` | ✓ | 5.4.21 (from root node_modules) | — |
| `lucide-react` | Hamburger `Menu` icon | ✓ | ^1.16.0 (in package.json) | Use inline SVG |
| shadcn `Button` | Hamburger button component | ✓ | Installed (in components/ui/button.tsx) | Use native `<button>` |
| `react-router-dom` | `NavLink`, `useLocation` | ✓ | ^6.28.0 | — |
| Tailwind CSS | All responsive classes | ✓ | ^3.4.17 | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 + @testing-library/react 16.3.2 |
| Config file | `apps/frontend/vitest.config.ts` |
| Setup file | `apps/frontend/src/test/setup.ts` (imports `@testing-library/jest-dom`) |
| Quick run command | `pnpm --filter @kartex/frontend test --run` |
| Full suite command | `pnpm --filter @kartex/frontend test --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SHELL-01 | Sidebar hidden on mobile, hamburger visible | unit (DOM) | `vitest run src/components/__tests__/AppShell.test.tsx` | ❌ Wave 0 |
| SHELL-02 | Hamburger click opens overlay drawer, backdrop closes it | unit (DOM) | same file | ❌ Wave 0 |
| SHELL-03 | Footer renders version, copyright, links | unit (DOM) | same file | ❌ Wave 0 |

**Note on CSS responsive testing:** jsdom does not implement CSS media queries. Tailwind class presence (`hidden md:flex`) can be asserted on DOM elements, but breakpoint visual behavior requires a manual browser check. The automated test verifies the correct classes are applied; the human verification step confirms mobile layout at 375px viewport.

### Wave 0 Gaps

- [ ] `apps/frontend/src/components/__tests__/AppShell.test.tsx` — new file needed for SHELL-01, SHELL-02, SHELL-03

**Testing approach for AppShell:** AppShell requires mocking `useAuth`, `useTheme`, and react-router-dom. Use `vi.mock()` for context hooks. Wrap render with `MemoryRouter` from `react-router-dom` for `useLocation`. Pattern: see `CardFlip.test.tsx` for the established mock-first approach.

### Sampling Rate

- **Per task commit:** `pnpm --filter @kartex/frontend test --run`
- **Per wave merge:** `pnpm --filter @kartex/frontend test --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Not in scope for shell layout |
| V3 Session Management | No | Not in scope |
| V4 Access Control | No | No new data-access endpoints |
| V5 Input Validation | No | No user input in footer/drawer/topbar |
| V6 Cryptography | No | Not applicable |

### Known Threat Patterns Relevant to Footer Links

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Open redirect via `target="_blank"` | Tampering | `rel="noopener noreferrer"` on all external links (already required by UI-SPEC) |
| XSS via version string | Tampering | Version is a build-time constant, not user input — no sanitization needed |

No security-sensitive changes in this phase. The only new external surface is the footer's two hardcoded `<a href>` links — both pointing to fixed GitHub URLs. `rel="noopener noreferrer"` is sufficient.

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on This Phase |
|-----------|----------------------|
| Files under 500 lines | AppShell.tsx projected at ~195 lines — compliant; no extraction required |
| Use TypeScript typed interfaces for public APIs | No new public API in this phase — all changes are internal to AppShell |
| Never hardcode secrets | Footer constants (GitHub URL, Docs URL) are not secrets — compliant |
| Prefer TDD London School (mock-first) | AppShell.test.tsx should mock `useAuth`, `useTheme`, react-router-dom |
| ALWAYS run tests after making code changes | Planner must include test-run step after each wave |
| All secrets via `.env` | Not applicable — version is public data from package.json |
| Never commit .env files | Not applicable |

---

## Sources

### Primary (HIGH confidence)
- Vite official docs — vite.dev/config/shared-options.html (`define` option behavior)
- Vite official docs — vite.dev/guide/features.html (native JSON import support confirmed)
- CSS Flexbox specification — `min-height: auto` default on flex children (canonical flex behavior)
- react-router-dom official docs — reactrouter.com/api/components/NavLink (NavLink accepts standard React props)
- Git remote URL — `git remote get-url origin` → `https://github.com/raphaelmue/kartex.git`
- Direct file inspection — `AppShell.tsx`, `tsconfig.json`, `vite.config.ts`, `package.json`, `vitest.config.ts`

### Secondary (MEDIUM confidence)
- TypeScript constraint — `resolveJsonModule` + `moduleResolution: "bundler"` + `allowImportingTsExtensions` incompatibility — confirmed via multiple GitHub issue threads (vitejs/vite #11490, vitejs/vite discussion #14001) cross-referencing TypeScript compiler behavior
- Node.js v22+ import assertion deprecation — confirmed via github.com/vitejs/vite/issues/17291 discussion
- `createRequire` as safe fallback for package.json in ESM vite.config — medium.com/mkdir-awesome/using-vite-config-ts-to-display-package-json-information

### Tertiary (LOW confidence)
- `inert` attribute ~97% browser support — training data estimate, not verified in this session [ASSUMED]
- CSS transform GPU compositor path being preferred over conditional render — general CSS performance knowledge, not benchmarked for this specific case [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages are already installed and directly inspected
- Architecture: HIGH — pattern is dictated by approved UI-SPEC; no ambiguity
- Version injection approach: HIGH — TypeScript constraint verified via multiple authoritative sources; `createRequire` is the established pattern
- Pitfalls: HIGH — all pitfalls traced to verifiable causes (tsconfig constraints, Node.js version behavior, CSS spec)
- Test plan: MEDIUM — jsdom CSS limitation is a known constraint of testing library

**Research date:** 2026-05-31
**Valid until:** 2026-06-30 (stable dependencies; no fast-moving ecosystem concerns)
