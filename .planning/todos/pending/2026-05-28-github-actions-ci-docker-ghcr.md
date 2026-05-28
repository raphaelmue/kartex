---
created: 2026-05-28T20:40:00Z
title: Add GitHub Actions CI pipeline with Docker build and GHCR push
area: tooling
files:
  - .github/workflows/ci.yml
  - apps/backend/Dockerfile
  - docker-compose.yml
---

## Problem

No CI pipeline exists. Tests and quality checks run locally only. The docker-compose.yml
references `apps/backend/Dockerfile` but that file doesn't exist yet (Phase 6 work).
There is no automated path from a merge to main (or a release tag) to a production-ready
Docker image in the GitHub Container Registry.

## Solution

Two GitHub Actions jobs in `.github/workflows/ci.yml`:

### Job 1: `ci` — runs on every push and PR

```yaml
steps:
  - checkout
  - setup Node + yarn cache
  - yarn install --frozen-lockfile
  - yarn workspace @kartex/shared build       # build shared package first
  - yarn workspaces run typecheck             # tsc --noEmit all packages
  - yarn workspaces run lint                  # eslint all packages
  - yarn workspaces run test --run            # vitest (non-watch)
  - yarn workspace @kartex/frontend build     # Vite prod build
  - yarn workspace @kartex/backend build      # tsc prod build
```

### Job 2: `docker` — runs only on push to `main` or `v*` release tags

Depends on `ci` passing. Builds and pushes to ghcr.io.

```yaml
needs: ci
if: github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/v')
steps:
  - checkout
  - Set up Docker Buildx
  - Log in to ghcr.io (GITHUB_TOKEN)
  - Extract metadata (tags: latest on main, semver on release tags)
  - Build and push: ghcr.io/${{ github.repository_owner }}/kartex:tag
```

### Dockerfile (`apps/backend/Dockerfile`)

Multi-stage build:
1. **builder** — Node 20-alpine, install all deps, build shared + frontend + backend
2. **runner** — Node 20-alpine, copy only backend dist + node_modules (prod) +
   frontend build output (already in backend/public/ from Vite config) + prisma client

The final image runs `node dist/index.js` and exposes port 3000.

### Secrets / permissions required

- `GITHUB_TOKEN` (automatic) — for ghcr.io push and package read
- Repo → Settings → Actions → Workflow permissions: "Read and write" (for GHCR push)

### Tags strategy

| Trigger | Image tag |
|---------|-----------|
| push to `main` | `latest` |
| tag `v1.2.3` | `1.2.3`, `1.2`, `1`, `latest` |

Use `docker/metadata-action` to generate tags automatically from ref.
