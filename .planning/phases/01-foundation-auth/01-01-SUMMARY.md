---
phase: 01-foundation-auth
plan: "01"
subsystem: scaffold
tags: [monorepo, yarn, prisma, docker, postgres]
dependency_graph:
  requires: []
  provides:
    - yarn-workspace-root
    - prisma-schema-all-models
    - initial-db-migration
    - docker-compose-production
    - frontend-scaffold
    - shared-package-barrel
  affects:
    - apps/backend
    - apps/frontend
    - packages/shared
tech_stack:
  added:
    - "yarn@4.6.0 (Berry, node-modules linker)"
    - "hono@^4.7.9 + @hono/node-server"
    - "prisma@^5.22.0 + @prisma/client"
    - "jose@^5.9.6"
    - "bcryptjs@^2.4.3"
    - "react@^18.3.1 + react-dom + react-router-dom@^6"
    - "vite@^5 + @vitejs/plugin-react"
    - "tailwindcss@^3.4.17 + postcss + autoprefixer"
    - "zod@^3.23.8"
    - "tsx@^4.19.2"
  patterns:
    - "Yarn Berry workspace:* cross-package protocol"
    - "Multi-stage Dockerfile: frontend-builder -> backend-builder -> production"
    - "entrypoint.sh: prisma migrate deploy then exec node"
    - "Vite build output directed to apps/backend/public/ for single-container serving"
key_files:
  created:
    - package.json
    - .yarnrc.yml
    - .gitignore
    - .env.example
    - yarn.lock
    - docker-compose.yml
    - apps/backend/Dockerfile
    - apps/backend/entrypoint.sh
    - apps/backend/package.json
    - apps/backend/tsconfig.json
    - apps/backend/src/index.ts
    - apps/backend/prisma/schema.prisma
    - apps/backend/prisma/migrations/20260525200713_init/migration.sql
    - apps/backend/prisma/migrations/migration_lock.toml
    - apps/frontend/package.json
    - apps/frontend/tsconfig.json
    - apps/frontend/vite.config.ts
    - apps/frontend/index.html
    - apps/frontend/src/main.tsx
    - apps/frontend/src/App.tsx
    - apps/frontend/src/index.css
    - packages/shared/package.json
    - packages/shared/tsconfig.json
    - packages/shared/src/index.ts
  modified: []
decisions:
  - "Yarn Berry 4.6.0 with node-modules linker (not PnP) — Docker/Prisma compatible"
  - "packageManager field set to yarn@4.6.0 in root package.json for corepack pinning"
  - "workspace:* protocol for all cross-workspace dependencies (not bare *)"
  - "Vite build outDir: apps/backend/public/ for D-06 single-container serving"
  - "Dockerfile build context is repo root (.) so all workspace packages are accessible"
  - "PostgreSQL used port 5432 was occupied; migration ran on port 5433 (temp container)"
  - "entrypoint.sh uses set -e for fail-fast behavior"
metrics:
  duration_seconds: 328
  completed_date: "2026-05-25"
  tasks_completed: 2
  tasks_total: 2
  files_created: 24
  files_modified: 0
---

# Phase 01 Plan 01: Monorepo Scaffold + Prisma + Docker Summary

**One-liner:** Yarn Berry 4.6.0 workspace monorepo with full 8-model Prisma schema, initial migration, multi-stage Dockerfile, and production Docker Compose (backend + PostgreSQL, no proxy).

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Yarn workspace root + all three package.json files + tsconfig files | 92b4cd3 | package.json, .yarnrc.yml, apps/*/package.json, packages/shared/**, yarn.lock |
| 2 | Full Prisma schema + initial migration + Docker Compose + Dockerfile | 5e4568f | schema.prisma, migrations/20260525200713_init/, Dockerfile, docker-compose.yml, entrypoint.sh |

## Verification Results

| Check | Result |
|-------|--------|
| `yarn install` exits 0 | PASS |
| `yarn typecheck` exits 0 (all 3 workspaces) | PASS |
| `prisma validate` exits 0 | PASS |
| `apps/backend/prisma/migrations/` directory exists | PASS |
| No hardcoded secrets in docker-compose.yml | PASS |
| No proxy/nginx service in docker-compose.yml | PASS |
| All workspace deps use `workspace:*` protocol | PASS |
| `.yarnrc.yml` has `nodeLinker: node-modules` | PASS |
| `.env.example` has all 6 required env vars | PASS |
| Prisma schema has 8 models + 3 enums | PASS |
| User model has no email field (username-only auth) | PASS |

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

**Note on PostgreSQL port:** The plan specified using port 5432 for the temporary migration container, but port 5432 was already allocated on the host. The migration container was started on port 5433 instead. This is a temporary container used only during migration generation and does not affect any permanent artifacts. The generated migration SQL, schema, and docker-compose.yml are all correct.

## Architecture Notes

### Single-container Strategy (D-06)
The Vite `build.outDir` is set to `path.resolve(__dirname, '../../apps/backend/public')` in `vite.config.ts`, directing the React SPA build directly into the backend's public directory. The production Dockerfile copies this output from the `frontend-builder` stage into `/app/apps/backend/public/` in the final image. Plans 01-02 will wire up `serveStatic` in Hono to serve these files.

### Multi-stage Dockerfile
- **Stage 1 (frontend-builder):** Builds React + Vite → output in `apps/backend/public/`
- **Stage 2 (backend-builder):** Runs `prisma generate` (platform-specific binaries) + `tsc`
- **Stage 3 (production):** `node:22-slim` base, copies compiled artifacts, uses `yarn workspaces focus` for production deps only

### Prisma Binary Targets
`binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` ensures the Prisma client works on both the development host (native) and the Alpine-based Docker image (musl + OpenSSL 3.0.x).

## Known Stubs

The following files are intentional minimal scaffolds — they will be replaced/expanded in Plans 01-02 and 01-03:
- `apps/backend/src/index.ts` — minimal Hono server with health endpoint only; auth routes added in 01-02
- `apps/frontend/src/App.tsx` — single route rendering "Kartex" text; replaced in 01-03
- `packages/shared/src/index.ts` — empty barrel export; schemas added in 01-02

These stubs do not prevent the plan's goal (scaffold + typecheck + docker-compose baseline) from being achieved.

## Threat Flags

No new security-relevant surface not covered in the plan's threat model.

Threat model compliance:
- T-01-01: `.env` in `.gitignore`, `.env.example` has placeholder values only — MITIGATED
- T-01-02: All docker-compose.yml secrets use `${VAR}` syntax, none hardcoded — MITIGATED
- T-01-04: `binaryTargets` includes `linux-musl-openssl-3.0.x` — MITIGATED

## Self-Check: PASSED

Files verified:
- `package.json` — FOUND
- `.yarnrc.yml` — FOUND
- `.env.example` — FOUND
- `apps/backend/prisma/schema.prisma` — FOUND
- `apps/backend/prisma/migrations/20260525200713_init/migration.sql` — FOUND
- `docker-compose.yml` — FOUND
- `apps/backend/Dockerfile` — FOUND
- `apps/backend/entrypoint.sh` — FOUND

Commits verified:
- 92b4cd3 — FOUND (chore(01-01): scaffold Yarn workspace monorepo with three packages)
- 5e4568f — FOUND (feat(01-01): Prisma schema, initial migration, Dockerfile, docker-compose)
