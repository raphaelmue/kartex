---
phase: 07-app-shell
verified: 2026-05-31T09:18:00Z
status: human_needed
score: 6/6 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open the app at 375px viewport width (Chrome DevTools device emulation) and navigate to /dashboard"
    expected: "Sidebar is hidden; a topbar with hamburger icon and 'Kartex' brand is visible at the top; the topbar shows 'Dashboard' as the current page label"
    why_human: "jsdom does not evaluate CSS media queries — Tailwind's md: breakpoint (hidden md:flex / flex md:hidden) cannot be exercised by the unit test suite; only visual browser inspection at 375px confirms the actual layout"
  - test: "At 375px viewport, tap the hamburger button"
    expected: "The left drawer slides in from the left as an overlay (content area does not shift right); a dark semi-transparent backdrop covers the content behind the drawer; the slide animation takes ~200ms"
    why_human: "CSS transform animation timing and the visual overlay-vs-push distinction cannot be verified programmatically in jsdom"
  - test: "With drawer open, tap the backdrop"
    expected: "Drawer slides out to the left in ~200ms; backdrop disappears"
    why_human: "Exit animation smoothness requires visual inspection"
  - test: "With drawer open, click any nav link inside the drawer"
    expected: "Drawer closes; navigation occurs to the clicked route"
    why_human: "Navigation side-effects in jsdom are mocked; real browser routing must be verified"
  - test: "Resize viewport to 1024px (desktop)"
    expected: "Sidebar is visible on the left; topbar is hidden; footer is still visible at the bottom of the right column"
    why_human: "CSS media queries are not evaluated in jsdom; desktop vs mobile element visibility must be confirmed visually"
  - test: "Scroll the main content area to the bottom and to the top"
    expected: "Footer remains stuck at the viewport bottom at all times; it does not scroll away with content"
    why_human: "Sticky footer layout (flex h-screen + shrink-0) and Safari min-h-0 fix can only be confirmed by scrolling in a real browser, including on WebKit"
  - test: "Check the footer on every protected page (/dashboard, /decks, /import, /explore, /settings)"
    expected: "Footer shows 'v0.1.0 · © Raphael Müßeler', a 'GitHub' link, and a 'Docs' link on every page without exception"
    why_human: "Footer presence across all routes depends on AppShell being the layout wrapper for all protected routes — this is a runtime routing concern, not testable with a unit test of the component in isolation"
---

# Phase 7: App Shell Verification Report

**Phase Goal:** The app shell works correctly on all screen sizes and carries attribution
**Verified:** 2026-05-31T09:18:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | On screens narrower than 768px the sidebar is hidden (`hidden md:flex` on aside) and a hamburger button is visible (`md:hidden` on topbar header) | VERIFIED | `AppShell.tsx` line 48: `className="hidden md:flex w-60 ..."` on aside; line 237: `className="flex items-center gap-2 h-16 px-4 bg-card border-b border-border md:hidden"` on header; SHELL-01a and SHELL-01b unit tests pass |
| 2 | Tapping the hamburger sets drawerOpen=true; drawer panel slides in from left (translate-x-0) over page content without shifting right column | VERIFIED | `AppShell.tsx` line 146: `cn(... drawerOpen ? 'translate-x-0' : '-translate-x-full')` with `transition-transform duration-200 ease-in-out`; right column in separate `div.flex.flex-col.flex-1.min-h-0` — no layout shift possible; SHELL-02a test passes |
| 3 | Tapping backdrop or clicking any nav link sets drawerOpen=false; drawer slides out (-translate-x-full) | VERIFIED | `AppShell.tsx` line 136: backdrop `onClick={() => setDrawerOpen(false)}`; lines 164, 191: each NavLink in drawer has `onClick={() => setDrawerOpen(false)}`; SHELL-02b and SHELL-02c tests pass |
| 4 | Footer is always visible at bottom of right column, showing version v0.1.0, © Raphael Müßeler, GitHub link, and Docs link | VERIFIED | `AppShell.tsx` lines 258–280: `<footer className="h-10 shrink-0 border-t border-border flex items-center justify-between ...">` containing `v{__APP_VERSION__}·© Raphael Müßeler` and two anchors; SHELL-03a through SHELL-03d tests pass |
| 5 | All footer external links carry rel=noopener noreferrer | VERIFIED | `AppShell.tsx` lines 265, 273: both `<a>` elements have `rel="noopener noreferrer"`; grep count confirms exactly 2 occurrences; SHELL-03b and SHELL-03c tests assert rel attributes |
| 6 | `__APP_VERSION__` is a build-time constant (not runtime fetch) provided by Vite define in vite.config.ts | VERIFIED | `vite.config.ts` lines 1, 8–9, 13–15: `createRequire` reads `package.json`, `define: { __APP_VERSION__: JSON.stringify(pkg.version) }`; `vite-env.d.ts` line 2: `declare const __APP_VERSION__: string`; typecheck exits 0 |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/frontend/src/components/__tests__/AppShell.test.tsx` | 9 unit tests for SHELL-01/02/03 | VERIFIED | 156 lines; 9 tests across 3 describe blocks; all 9 pass |
| `apps/frontend/vite.config.ts` | define block with `__APP_VERSION__` from `createRequire` | VERIFIED | 40 lines; contains `createRequire`, `define: { __APP_VERSION__: JSON.stringify(pkg.version) }` |
| `apps/frontend/src/vite-env.d.ts` | TypeScript global declaration for `__APP_VERSION__` | VERIFIED | 2 lines; contains `/// <reference types="vite/client" />` and `declare const __APP_VERSION__: string` |
| `apps/frontend/src/components/AppShell.tsx` | Responsive app shell with mobile topbar, overlay drawer, footer (min 185 lines) | VERIFIED | 284 lines; contains all required elements |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| AppShell.tsx hamburger button | drawer panel `#mobile-nav-drawer` | `aria-controls="mobile-nav-drawer"` + `drawerOpen` state | WIRED | Line 243: `aria-controls="mobile-nav-drawer"`; line 31: `useState(false)` drives both hamburger `aria-expanded` and drawer `cn()` class |
| vite.config.ts define block | AppShell.tsx footer `__APP_VERSION__` usage | Vite build-time replacement | WIRED | `vite.config.ts` line 14: `__APP_VERSION__: JSON.stringify(pkg.version)`; `AppShell.tsx` line 260: `v{__APP_VERSION__}` — same identifier, replaced at build time |
| drawer NavLink onClick handlers | `drawerOpen = false` | `onClick={() => setDrawerOpen(false)}` | WIRED | Lines 164 and 191: both NavLink groups in drawer carry `onClick={() => setDrawerOpen(false)}` |

### Data-Flow Trace (Level 4)

Not applicable for this phase. The only dynamic data rendered is `__APP_VERSION__` (a build-time constant, not a runtime data fetch) and `user?.username` (inherited from AuthContext, established in Phase 1). No new data sources introduced.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 9 AppShell unit tests pass | `yarn workspace @kartex/frontend test --run src/components/__tests__/AppShell.test.tsx` | 9 passed | PASS |
| Full 52-test suite — no regressions | `yarn workspace @kartex/frontend test --run` | 52 passed (6 files) | PASS |
| TypeScript clean | `yarn workspace @kartex/frontend typecheck` | exit 0 | PASS |
| Security gate: `noopener noreferrer` count | `grep -v '^//' AppShell.tsx \| grep -c 'noopener noreferrer'` | 2 | PASS |
| File size under 500 lines | `wc -l AppShell.tsx` | 284 | PASS |

### Probe Execution

No probe scripts declared for this phase. PLAN.md verification section specifies manual grep commands only (all run above as behavioral spot-checks). Step 7c: SKIPPED — no `scripts/*/tests/probe-*.sh` files exist for this phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SHELL-01 | 07-01-PLAN.md | Sidebar collapses by default below 768px and can be toggled via hamburger | SATISFIED | `aside` has `hidden md:flex`; `header` has `md:hidden`; hamburger button present with correct aria attributes; SHELL-01a/b tests pass |
| SHELL-02 | 07-01-PLAN.md | On mobile, opening the sidebar renders as an overlay drawer (no layout push) | SATISFIED | Drawer is `position: fixed z-50`; backdrop at `z-40`; right column wrapper with `flex-1 min-h-0` never shifts; SHELL-02a/b/c tests pass |
| SHELL-03 | 07-01-PLAN.md | App footer shows version, "© Raphael Müßeler", and links | SATISFIED | Footer element with `h-10 shrink-0`; `v{__APP_VERSION__}·© Raphael Müßeler`; GitHub and Docs links with `rel="noopener noreferrer"`; SHELL-03a/b/c/d tests pass |

No orphaned requirements — REQUIREMENTS.md maps exactly SHELL-01, SHELL-02, SHELL-03 to Phase 7, and all three appear in 07-01-PLAN.md's `requirements` field.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None found | — | — |

No `TBD`, `FIXME`, `XXX`, `TODO`, `HACK`, `PLACEHOLDER`, stub implementations (`return null`, `return []`, `return {}`), or hardcoded-empty prop values found in any file modified by this phase.

### Human Verification Required

The unit test suite verifies DOM structure and CSS class names. It cannot verify the actual visual and interactive behavior because jsdom does not implement CSS media queries, layout rendering, or animation timing. The following checks require a real browser.

#### 1. Mobile layout at 375px viewport

**Test:** Open the app at 375px width (Chrome DevTools device emulation), navigate to /dashboard.
**Expected:** Sidebar is invisible; topbar shows hamburger icon, "Kartex" brand, and "Dashboard" as the page label.
**Why human:** jsdom ignores `hidden md:flex` and `md:hidden` — these Tailwind breakpoint classes require a real CSS engine.

#### 2. Overlay drawer open behavior

**Test:** At 375px viewport, tap the hamburger button.
**Expected:** Left drawer slides in from the left as an overlay. Content area (right side) does not shift or push. Dark semi-transparent backdrop covers content. Slide animation is approximately 200ms.
**Why human:** CSS transform animation duration and overlay-vs-push visual distinction require real browser rendering.

#### 3. Backdrop close behavior

**Test:** With drawer open, tap the backdrop.
**Expected:** Drawer slides out to the left in ~200ms; backdrop disappears immediately after the click.
**Why human:** Exit animation smoothness requires visual inspection in a real browser.

#### 4. NavLink navigation-and-close

**Test:** With drawer open, click a nav link inside the drawer (e.g., "Decks").
**Expected:** Drawer closes; the app navigates to /decks.
**Why human:** jsdom mocks navigation; only a real browser confirms the route change occurs after drawer closes.

#### 5. Desktop layout at 1024px viewport

**Test:** Resize viewport to 1024px.
**Expected:** Left sidebar is visible; mobile topbar is hidden; footer remains visible at the bottom of the right column.
**Why human:** `hidden md:flex` behavior requires a real CSS engine at the desktop breakpoint.

#### 6. Footer sticky on scroll

**Test:** Navigate to a page with long content (e.g., /decks with many decks). Scroll page content.
**Expected:** Footer remains pinned at the viewport bottom; it does not scroll away.
**Why human:** Sticky footer behavior in `flex h-screen` with `shrink-0` — and the Safari `min-h-0` fix — must be verified in real browser layout, especially on Safari/WebKit.

#### 7. Footer present on all protected pages

**Test:** Navigate to each protected route: /dashboard, /decks, /import, /explore, /settings.
**Expected:** Footer shows "v0.1.0 · © Raphael Müßeler", "GitHub" link, and "Docs" link on every page.
**Why human:** AppShell is the layout wrapper for all protected routes — cross-page footer presence depends on runtime routing being wired correctly through App.tsx, which the AppShell unit test does not exercise end-to-end.

### Gaps Summary

No automated gaps found. All 6 must-have truths are verified in the codebase. All 3 requirements (SHELL-01, SHELL-02, SHELL-03) are implemented and tested. The phase status is `human_needed` because CSS media query behavior, animation timing, and cross-page footer presence require visual browser verification — these are inherent limitations of jsdom-based unit testing, not implementation deficiencies.

---

_Verified: 2026-05-31T09:18:00Z_
_Verifier: Claude (gsd-verifier)_
