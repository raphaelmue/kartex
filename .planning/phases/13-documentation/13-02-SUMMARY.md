---
phase: 13-documentation
plan: "02"
subsystem: documentation
tags: [docs, design, architecture, prisma, docker]
dependency_graph:
  requires: []
  provides: [DOCS-02]
  affects: [docs/design.md]
tech_stack:
  added: []
  patterns: []
key_files:
  modified:
    - docs/design.md
decisions:
  - "design.md now reflects 2-service Docker Compose architecture (backend + db, no proxy)"
  - "Tech Stack table updated to yarn workspaces (yarn@4.15.0), Nginx/Proxy row removed"
  - "Prisma schema in design.md updated to match actual schema.prisma (passwordHash, studyMode, isActive, MANAGE, InviteCode, RefreshToken)"
  - "PWA removed from Future Features — shipped in Phase 12"
metrics:
  duration: "2 min"
  completed_date: "2026-06-03"
  tasks_completed: 1
  files_modified: 1
---

# Phase 13 Plan 02: Fix Stale design.md Sections (DOCS-02) Summary

**One-liner:** Updated docs/design.md from stale 4-service nginx-proxied pnpm architecture to accurate 2-service Hono serveStatic yarn workspaces architecture with current Prisma schema.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix stale sections in docs/design.md (DOCS-02) | dbfe3d6 | docs/design.md |

## What Was Done

Applied 7 targeted edits to `docs/design.md` without wholesale rewriting unrelated sections:

1. **Section 2 Tech Stack — Monorepo row:** `pnpm workspaces` → `yarn workspaces (yarn@4.15.0)`
2. **Section 2 Tech Stack — Proxy row removed:** Deleted `| Proxy | Nginx |` row entirely
3. **Section 3 Monorepo tree — pnpm-workspace.yaml removed:** Deleted stale file reference from tree
4. **Section 4 Architecture — Diagram replaced:** Old 4-tier Nginx diagram replaced with accurate 2-tier diagram showing Hono serving both API (`/api/*`) and React SPA via `serveStatic` on port 3000
5. **Section 4 Architecture — Services table updated:** Replaced 4-row table (frontend/backend/db/proxy) with 2-row table (backend + db only)
6. **Section 6 Data Model — Prisma schema replaced:** Updated to actual `prisma/schema.prisma` content including: `passwordHash` (not `hashedPassword`), `studyMode`, `isActive` on both User and Deck, `MANAGE` permission enum value, `InviteCode` model, `RefreshToken` model, `@@unique` on DeckShare, `onDelete: Cascade` on relations, and correct datasource block (no url field — Prisma 7 driver adapter)
7. **Section 12 Docker Compose — YAML and deployment replaced:** Actual 2-service `docker-compose.yml` content; deployment command updated to mention `ADMIN_USERNAME`/`ADMIN_PASSWORD` and correct port (3000)
8. **Section 14 Future Features — PWA bullet removed:** `Offline / PWA` shipped in Phase 12; removed from future features list

## Verification Results

All acceptance criteria passed:

```
grep -ci "nginx"  docs/design.md  → 0  ✓
grep -ci "pnpm"   docs/design.md  → 0  ✓
grep -c "yarn workspaces" docs/design.md → 1  ✓
grep -c "serveStatic" docs/design.md → 1  ✓
grep -c "postgres:16-alpine" docs/design.md → 2  ✓
grep -c "passwordHash" docs/design.md → 1  ✓
grep -c "Offline / PWA" docs/design.md → 0  ✓
grep -c "studyMode" docs/design.md → 1  ✓
grep -c "isActive" docs/design.md → 2  ✓
grep -c "MANAGE" docs/design.md → 1  ✓
grep -c "pnpm-workspace.yaml" docs/design.md → 0  ✓
```

## Deviations from Plan

None — plan executed exactly as written. All 7 targeted edits were applied without modifying sections not listed in the plan.

## Known Stubs

None — this plan updates documentation only; no data stubs exist.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced. This is a pure documentation update.

## Self-Check: PASSED

- `docs/design.md` exists and is modified: confirmed (1 file changed, 118 insertions, 70 deletions)
- Commit `dbfe3d6` exists: confirmed via `git rev-parse --short HEAD`
- All grep acceptance criteria: all 11 checks passed as shown above
