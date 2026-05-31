# Phase 7: App Shell - Context

**Gathered:** 2026-05-31
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase adds responsive behavior and a footer to the existing `AppShell.tsx`:

1. **Mobile sidebar collapse (SHELL-01)** — The sidebar hides by default on screens narrower than 768px. A hamburger button in a mobile topbar reveals it.
2. **Mobile overlay drawer (SHELL-02)** — Tapping the hamburger opens the sidebar as an overlay drawer with a dimmed backdrop. The main content area does not shift.
3. **App footer (SHELL-03)** — A footer strip is added to the content column (right of sidebar), sticky at the bottom of the viewport, showing version, copyright, and hardcoded links.

**In scope:** SHELL-01, SHELL-02, SHELL-03 — all in `AppShell.tsx` and any new sub-components.
**Out of scope:** Backend changes, settings page, navigation restructuring, link management UI.

</domain>

<decisions>
## Implementation Decisions

### Mobile Header / Topbar
- **D-01:** A full-width **mobile-only topbar** appears on screens narrower than 768px. On desktop (≥768px) it is hidden; the fixed sidebar shows as usual.
- **D-02:** The topbar contains three elements: **hamburger icon** (far left) + **"Kartex" brand name** + **current page title** (the active nav item label).
- **D-03:** The current page title in the topbar should reflect the active route label (e.g. "Dashboard", "Decks", "Import") — implementation may read it from the active `navItem` matched against `useLocation()`.

### Drawer / Overlay Behavior
- **D-04:** The sidebar opens as a **left-side overlay drawer** — content does not push; the drawer renders on top with `position: fixed` or equivalent.
- **D-05:** A **semi-transparent dark backdrop** covers the content area behind the drawer when it is open.
- **D-06:** The drawer closes on: (a) **tapping the backdrop**, (b) **clicking any nav link**. No explicit X button is needed.

### Footer Layout & Position
- **D-07:** The footer sits in the **content column only** (right of the sidebar) — it does not span the full app width behind the sidebar. The current `flex h-screen` AppShell layout is preserved; the footer is a sibling row below `<main>` in the right column flex container.
- **D-08:** The footer is **sticky at the bottom of the viewport** — always visible regardless of content scroll. Achieved by giving the right column a flex-col layout and making `<main>` flex-grow with the footer as a fixed-height row below it.

### Footer Content & Links
- **D-09:** Footer shows: version number (read from `apps/frontend/package.json` version field — `v0.1.0`), **"© Raphael Müßeler"**, and two hardcoded links.
- **D-10:** Hardcoded footer links: **GitHub repository** + **Documentation / README**. Links are defined as constants in the footer component. URLs determined by Claude (e.g., `https://github.com/[owner]/kartex` — planner should check if a canonical URL exists in the project).
- **D-11:** The version string is imported at build time via `import.meta.env` Vite pattern or a direct import from `package.json`. Either approach is acceptable — planner chooses.

### Claude's Discretion
- Exact Tailwind classes for the topbar height, backdrop opacity, drawer animation (slide-in transition)
- Whether to extract the drawer into a separate `MobileSidebar.tsx` component or keep it inline in `AppShell.tsx`
- Footer height, text size, and exact arrangement of the three footer elements
- How exactly the page title is surfaced in the topbar (could use `navItems.find(item => location.pathname.startsWith(item.to))?.label` or a React context)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §App Shell — SHELL-01, SHELL-02, SHELL-03 (three requirements for this phase)
- `.planning/ROADMAP.md` §Phase 7 — Success criteria (3 criteria, the acceptance test for this phase)

### Existing AppShell to Modify
- `apps/frontend/src/components/AppShell.tsx` — The single file being modified. Current: fixed `w-60` sidebar, no mobile behavior, no footer. Phase 7 modifies this file and may extract sub-components.
- `apps/frontend/src/App.tsx` — `AppShell` is used as a layout wrapper for all protected routes. No changes expected here.

### Styling & Component System
- `apps/frontend/package.json` — `version` field (`0.1.0`) — used in footer version display
- `apps/frontend/src/components/ui/button.tsx` — shadcn Button component (already used in AppShell for logout/theme)
- `lucide-react` (already imported in AppShell) — `Menu` icon for hamburger, `X` if needed

### Patterns from Prior Phases
- `apps/frontend/src/context/ThemeContext.tsx` — Pattern for React context (if mobile open/close state needs context)
- `apps/frontend/src/pages/DecksPage.tsx` — VisibilityBadge pattern (example of inline component in page file)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AppShell.tsx` — The component to modify. Has `navItems` array, `useAuth`, `useTheme`, and renders `<Outlet />` for page content.
- shadcn `Button` with `variant="ghost"` and `size="icon"` — already used for theme toggle; use the same pattern for hamburger button.
- `lucide-react` already imported — add `Menu` icon for hamburger.
- `cn()` utility — already imported from `@/lib/utils`; use for conditional classes.
- `NavLink` from `react-router-dom` — already used; its `onClick` handler can close the drawer.
- `useLocation()` from `react-router-dom` — available to derive the current page title for the topbar.

### Established Patterns
- Tailwind breakpoints: `md:` corresponds to 768px. Use `hidden md:flex` (hide on mobile, show on desktop) and `flex md:hidden` (show on mobile, hide on desktop) to switch between sidebar and topbar.
- The AppShell layout: `<div className="flex h-screen overflow-hidden">` — right column is `<main className="flex-1 overflow-y-auto ...">`. To add the footer, wrap main+footer in a `flex flex-col` container.
- All auth-protected pages render as children of AppShell via `<Outlet />` — no page-level changes needed for the footer.

### Integration Points
- `AppShell.tsx` — primary and likely only file changed (plus potential extraction of `MobileSidebar.tsx`)
- No backend changes required
- No shared package changes required
- `App.tsx` — read-only reference; no changes expected

</code_context>

<specifics>
## Specific Ideas

- Mobile drawer: the existing sidebar markup can be rendered twice (or conditionally) — on desktop as `aside`, on mobile as an overlay `div` with `position: fixed, inset-0` backdrop + `w-60` left panel.
- Page title in topbar: `navItems.find(item => location.pathname.startsWith(item.to))?.label ?? 'Kartex'` with a fallback — Admin link is a special case (not in navItems array, would need to be included).
- Footer example layout: `<footer className="h-10 border-t border-border flex items-center justify-between px-4 text-xs text-muted-foreground shrink-0">`.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-app-shell*
*Context gathered: 2026-05-31*
