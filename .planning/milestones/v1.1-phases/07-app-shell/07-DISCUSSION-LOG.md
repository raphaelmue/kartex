# Phase 7: App Shell - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-31
**Phase:** 07-app-shell
**Areas discussed:** Mobile header layout, Drawer close triggers, Footer position, Footer optional links

---

## Mobile header layout

| Option | Description | Selected |
|--------|-------------|----------|
| Full-width topbar | A dedicated header bar spans the full screen width, containing a hamburger icon on the left and the 'Kartex' brand name. Most common mobile pattern. | ✓ |
| Hamburger icon only | A small hamburger button appears in the top-left corner of the main content area with no title or brand text. | |
| Hamburger inside sidebar header | The sidebar renders normally but collapsed; the existing sidebar brand area exposes just a hamburger. | |

**Follow-up — topbar contents:**

| Option | Description | Selected |
|--------|-------------|----------|
| Hamburger + brand only | Just hamburger icon and 'Kartex' — no page title in the topbar. | |
| Hamburger + brand + page title | All three: hamburger on the left, 'Kartex' brand, and the active page title. | ✓ |

**User's choice:** Full-width mobile-only topbar with hamburger + "Kartex" brand + current page title.
**Notes:** User selected "all 3" in follow-up, clarified as all three elements together.

---

## Drawer close triggers

| Option | Description | Selected |
|--------|-------------|----------|
| Backdrop tap + nav link click | Standard mobile pattern — no X button needed. | ✓ |
| Backdrop tap + nav click + X button | All of the above plus a visible close button inside the drawer header. | |
| Nav link click only | Only navigating closes the drawer. No backdrop dismiss. | |

**Follow-up — backdrop styling:**

| Option | Description | Selected |
|--------|-------------|----------|
| Semi-transparent dark overlay | Standard overlay pattern — communicates modal layer. | ✓ |
| No backdrop | Content behind remains fully visible. | |

**User's choice:** Backdrop tap + nav click auto-closes. Semi-transparent dark overlay behind drawer.
**Notes:** No explicit X button needed.

---

## Footer position

| Option | Description | Selected |
|--------|-------------|----------|
| Sticky at the bottom of the viewport | Always visible, pinned to bottom. Footer row sits below `<main>` in the content column flex container. | ✓ |
| Inside the scrollable content area | Only visible when scrolled to bottom. | |
| Fixed position (CSS fixed) | Absolutely fixed, overlapping content. | |

**Follow-up — footer width:**

| Option | Description | Selected |
|--------|-------------|----------|
| Content column only (right of sidebar) | Footer in the main content area only, not behind sidebar. Fits naturally in current flex layout. | ✓ |
| Full width (across both sidebar and content) | Footer spans entire screen width. | |

**User's choice:** Sticky at viewport bottom, content column only.
**Notes:** Preserves existing `flex h-screen` AppShell layout.

---

## Footer optional links

| Option | Description | Selected |
|--------|-------------|----------|
| Skip links for now | Footer shows only version + copyright. | |
| Vite env variables | Links read from `VITE_FOOTER_LINKS` JSON array. | |
| Hardcoded links | A small fixed list of links baked into the component. | ✓ |

**Follow-up — which links:**

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub repository | Link to the Kartex GitHub repo. | ✓ |
| Documentation / README | Link to project docs or the README. | ✓ |
| No links | Just copyright + version. | |

**User's choice:** Hardcoded links — GitHub repository + Documentation/README.
**Notes:** Both links hardcoded as constants in the footer component.

---

## Claude's Discretion

- Exact Tailwind classes for topbar height, backdrop opacity, drawer slide-in animation
- Whether to extract the drawer into `MobileSidebar.tsx` or keep inline in `AppShell.tsx`
- Footer height, text size, and exact arrangement of footer elements
- How page title is derived in the topbar (likely `useLocation()` + `navItems.find()`)
- Exact GitHub and documentation URLs for the footer links

## Deferred Ideas

None — discussion stayed within phase scope.
