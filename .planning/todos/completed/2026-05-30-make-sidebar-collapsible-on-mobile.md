---
created: 2026-05-30T00:00:00Z
title: Make sidebar collapsible on mobile devices
area: ui
resolves_phase: 7
files:
  - apps/frontend/src/components/Sidebar.tsx
  - apps/frontend/src/App.tsx
---

## Problem

On mobile viewports the sidebar is permanently visible and cannot be collapsed. This consumes most of the screen width and makes the main content area too narrow to use comfortably.

## Solution

Add a hamburger/close toggle button for screens below the md breakpoint (768 px). Default the sidebar to collapsed (hidden, off-canvas) on mobile. Opening it should render as a slide-in drawer or overlay so it doesn't push content. On desktop the sidebar remains always visible as today. The toggle state can be local React state (no persistence needed).
