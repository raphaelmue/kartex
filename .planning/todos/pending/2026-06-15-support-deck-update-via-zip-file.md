---
created: 2026-06-15T07:24:31.750Z
title: Support deck update via zip file upload
area: ui
files:
  - apps/frontend/src/pages/ImportPage.tsx
  - apps/backend/src/routes/import.ts
---

## Problem

Users cannot update an existing deck by uploading a `.zip` file. The deck update (import-update) flow in the ImportPage only handles `.kartex` text files — `.zip` files containing a `.kartex` file plus media assets are rejected or unsupported on the update path. This was discovered during normal use.

The new-deck import path already supports `.zip` (upload + extract + create), but the update flow was never extended to accept zip archives.

## Solution

Extend the import-update flow to accept `.zip` archives on both frontend (file picker accept types, upload handler) and backend (`/api/import/apply` or equivalent route). The zip should be extracted server-side the same way as new-deck import: pull out the `.kartex` manifest and any media files, then run the diff/apply logic against the target deck.

Reference: Phase 16 (import-update) plans for the existing update implementation.
