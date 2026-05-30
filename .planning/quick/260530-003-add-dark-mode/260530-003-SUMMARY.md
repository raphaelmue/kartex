---
quick_id: 260530-003
status: complete
---

# Summary: Add Dark Mode

Wired up dark mode toggle with no new dependencies.

## What was already in place

- `tailwind.config.ts`: `darkMode: 'class'` already set
- `index.css`: `.dark` CSS variable block already fully defined

## Changes made

1. **`apps/frontend/src/context/ThemeContext.tsx`** (new) — `ThemeProvider`
   toggles `.dark` on `<html>`, reads/writes localStorage, defaults to
   `prefers-color-scheme` system setting.
2. **`apps/frontend/src/main.tsx`** — wrapped app in `<ThemeProvider>`
3. **`apps/frontend/src/components/AppShell.tsx`** — added Moon/Sun icon
   button (lucide-react) in the sidebar footer, uses `useTheme()`

## Test note

2 pre-existing Typst WASM test failures (CARD-08) remain — confirmed
failing before this change. Not introduced by dark mode.
