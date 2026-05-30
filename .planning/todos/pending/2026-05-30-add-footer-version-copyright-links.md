---
created: 2026-05-30T00:00:00Z
title: Add app footer with version, copyright, and links
area: ui
files:
  - apps/frontend/src/components/AppShell.tsx
  - package.json
---

## Problem

The app has no footer. There is nowhere to see the running version, claim ownership, or surface links to the project or the author.

## Solution

Add a small footer fixed to the bottom-right corner of the app shell (inside the main content area, not overlapping the sidebar). It should contain:

- App version — read from `package.json` at build time via `import.meta.env.VITE_APP_VERSION` or Vite's `define` config so it stays in sync automatically.
- Copyright line — "© [year] Raphael Müßeler" (year can be hardcoded or `new Date().getFullYear()`).
- Optional links (small, muted): GitHub repo and personal website https://raphael-muesseler.de.

Style: subtle, low-contrast text (e.g. `text-muted-foreground text-xs`). Should not interfere with page content scrolling — stick to the bottom of the viewport or the bottom of the sidebar column, not a sticky overlay on the content area.
