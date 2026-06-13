---
created: 2026-06-01T21:35:00Z
title: Create mobile web app (PWA)
area: ui
resolves_phase: 12
files: []
---

## Problem

The current app is a responsive SPA but not installable or optimized for mobile use (no service worker, no offline support, no app manifest). Users who want to study flashcards on their phone have to use the browser without a native-feeling experience.

## Solution

Turn the frontend into a Progressive Web App (PWA):
- Add a `manifest.json` (name, icons, theme color, display: standalone)
- Register a service worker (via Vite PWA plugin — `vite-plugin-pwa`) for offline caching of the app shell and static assets
- Decide on caching strategy for API responses (stale-while-revalidate for card data, network-first for study sessions)
- Add install prompt / "Add to Home Screen" affordance

Note: Full offline study (caching card content + media) is a larger lift and was explicitly deferred to v2 (see PROJECT.md Out of Scope). This todo covers the installable PWA shell; offline study capability is a separate decision.
