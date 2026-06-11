---
created: 2026-06-11T15:00:00Z
title: Deck card buttons always overflowing on mobile and desktop
area: ui
files:
  - apps/frontend/src/pages/DecksPage.tsx
---

## Problem

The action buttons on deck cards overflow their card container on both mobile and desktop. The `CardFooter` row likely has too many/too-wide buttons with no wrapping, causing content to spill out of the card boundary.

## Solution

Audit `DecksPage` `CardFooter` layout. Apply `flex-wrap` or use a two-line footer layout. Consider reducing button labels to icons-only on narrow widths, or restructuring secondary actions into a dropdown. Verify on ~375px mobile and 1280px desktop.
</content>
</invoke>