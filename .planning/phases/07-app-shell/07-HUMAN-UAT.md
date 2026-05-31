---
status: partial
phase: 07-app-shell
source: [07-VERIFICATION.md]
started: 2026-05-31T07:15:00Z
updated: 2026-05-31T07:15:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Mobile layout at 375px
expected: Sidebar is not visible; a topbar with hamburger icon and "Kartex" brand appears at the top of the page
result: [pending]

### 2. Overlay drawer open behavior
expected: Tapping the hamburger opens the left drawer as an overlay — the right content area does not shift; backdrop visible; ~200ms animation
result: [pending]

### 3. Backdrop close behavior
expected: Tapping the semi-transparent backdrop closes the drawer with a slide-out animation
result: [pending]

### 4. NavLink navigation-and-close
expected: Clicking a nav link inside the drawer closes the drawer and navigates to the target route
result: [pending]

### 5. Desktop layout at 1024px
expected: Sidebar is visible, topbar is hidden, footer still present at the bottom
result: [pending]

### 6. Footer sticky on scroll
expected: Footer remains fixed at the bottom of the viewport even when content scrolls (including Safari/WebKit)
result: [pending]

### 7. Footer on all protected pages
expected: Footer with version, copyright, GitHub and Docs links is visible on /dashboard, /decks, /import, /explore, /settings
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
