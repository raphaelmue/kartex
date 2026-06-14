---
status: testing
phase: 20-logo-pwa-icons
source: [20-01-SUMMARY.md]
started: 2026-06-14T18:45:00Z
updated: 2026-06-14T18:45:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 1
name: Desktop Sidebar Logo
expected: |
  Open the app at /dashboard on a desktop-width viewport (≥768px). The brand area
  in the left sidebar shows the new K-on-card SVG icon — an indigo "K" lettermark
  on a white card with an indigo border — to the left of the "Kartex" wordmark.
  The old purple square placeholder is gone.
awaiting: user response

## Tests

### 1. Desktop Sidebar Logo
expected: Open the app at /dashboard on a desktop-width viewport (≥768px). The brand area in the left sidebar shows the new K-on-card SVG icon — an indigo "K" lettermark on a white card with an indigo border — to the left of the "Kartex" wordmark. The old purple square placeholder is gone.
result: [pending]

### 2. Mobile Drawer Logo
expected: Narrow the viewport below 768px (or open on mobile). Tap the hamburger menu to open the drawer. The brand area at the top of the drawer shows the same K-on-card SVG icon beside the "Kartex" wordmark.
result: [pending]

### 3. Browser Tab Favicon
expected: Open the app in an incognito/private window (to bypass favicon cache). The browser tab shows the new K-on-card motif icon — not the old purple square. The favicon should be visible and clearly show the "K" letterform.
result: [pending]

### 4. Dark Mode Logo Visibility
expected: Switch your OS or browser to dark mode, then open the app. The K-on-card logo in the sidebar (and drawer if visible) should remain clearly visible — the card background adapts from white to dark indigo (#1e1b4b) so the logo doesn't disappear against a dark background.
result: [pending]

### 5. Mobile Drawer Keyboard Navigation (inert)
expected: Close the mobile drawer. Then press Tab repeatedly to cycle through focusable elements on the page. Focus should NOT enter the drawer's navigation items while it is closed — those links are removed from the tab order when the drawer is hidden.
result: [pending]

### 6. PWA Manifest Icons
expected: In Chrome DevTools → Application → Manifest, the icons listed include the 192×192 and 512×512 sizes. Each icon thumbnail shows the K-on-card design (indigo K on white/card background), not the old purple square.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps

[none yet]
