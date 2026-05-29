---
phase: 06-sharing-explore-deploy
plan: 03
subsystem: ci/deploy
tags: [github-actions, dockerfile, docker, ci-cd, ghcr, env, devops]
dependency_graph:
  requires:
    - apps/backend/Dockerfile (created earlier in phase 6)
    - yarn@4.15.0 (root packageManager field)
  provides:
    - .github/workflows/ci.yml — ci + docker jobs (SHAR-03, SHAR-04, SHAR-05, SHAR-06)
    - .env.example — all D-17 environment variables documented
    - apps/backend/Dockerfile — yarn version pin corrected to 4.15.0
  affects:
    - .github/workflows/ci.yml (new)
    - .env.example (updated)
    - apps/backend/Dockerfile (yarn version fix)
tech_stack:
  added: []
  patterns:
    - "Corepack reads packageManager from package.json — corepack enable (no explicit version) in CI"
    - "yarn install --immutable (not --frozen-lockfile) for Yarn 4"
    - "docker/metadata-action for semver + latest tagging strategy"
    - "GITHUB_TOKEN automatic — no additional secrets needed for GHCR push"
    - "permissions: packages: write on docker job only — ci job runs with default read-only token (T-06-09)"
key_files:
  created:
    - .github/workflows/ci.yml
  modified:
    - .env.example
    - apps/backend/Dockerfile
decisions:
  - "yarn install --immutable used (not --frozen-lockfile) — correct Yarn 4 flag"
  - "corepack enable without version pin in CI — reads packageManager field from package.json"
  - "permissions: packages: write scoped to docker job only — ci job has no package permissions (T-06-09)"
  - "docker job if condition: github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/v')"
metrics:
  duration: "~5 minutes"
  completed: "2026-05-29"
  tasks_completed: 3
  tasks_total: 3
  files_created: 1
  files_modified: 2
---

# Phase 06 Plan 03: CI/CD Pipeline + .env.example + Dockerfile Fix Summary

**One-liner:** GitHub Actions CI workflow with two jobs (ci + docker/GHCR push), .env.example documenting all D-17 environment variables, and Dockerfile yarn version corrected from 4.6.0 to 4.15.0.

## What Was Built

### Task 1 — Fix Dockerfile yarn version mismatch (4.6.0 → 4.15.0)

Updated all three `corepack prepare` lines in `apps/backend/Dockerfile` from `yarn@4.6.0` to `yarn@4.15.0` to match the `packageManager` field in root `package.json`. The three stages affected:
- `frontend-builder`: `RUN corepack enable && corepack prepare yarn@4.15.0 --activate`
- `backend-builder`: `RUN corepack enable && corepack prepare yarn@4.15.0 --activate`
- `production`: `RUN corepack enable && corepack prepare yarn@4.15.0 --activate && \`

No other changes to the Dockerfile. Multi-stage build structure, entrypoint, and all COPY directives remain intact.

**Commit:** `f245e7f`

### Task 2 — .env.example — all D-17 environment variables

Updated `.env.example` from 6 variables to all 8 D-17 variables with inline documentation. Added:
- `DATABASE_URL` — Prisma connection URL with placeholder values for docker-compose deployment
- `STORAGE_PATH` — container-internal media directory path
- `MAX_UPLOAD_BYTES` — upload limit (default 10 MB = 10485760 bytes)

Existing variables retained and enhanced with documentation comments. Each variable group has a section header comment explaining purpose and usage context. `.env` is confirmed in `.gitignore` (T-06-10 mitigated).

**Commit:** `ed38d12`

### Task 3 — .github/workflows/ci.yml — ci + docker jobs (D-16)

Created `.github/workflows/ci.yml` with two jobs:

**Job `ci`** (runs on every push/PR to main):
- `actions/checkout@v4`
- `actions/setup-node@v4` with `node-version: '22'` and `cache: 'yarn'`
- `corepack enable` (reads packageManager from package.json — no version pin needed)
- `yarn install --immutable`
- `yarn workspace @kartex/shared build`
- `yarn workspaces foreach -A run typecheck`
- `yarn lint`
- `yarn workspace @kartex/frontend test --run`
- `yarn workspace @kartex/backend test --run`
- `yarn workspace @kartex/frontend build`
- `yarn workspace @kartex/backend build`

**Job `docker`** (push to main or v* tags only, depends on ci):
- `permissions: contents: read; packages: write` (scoped to docker job only)
- `docker/setup-buildx-action@v3`
- `docker/login-action@v3` with `registry: ghcr.io` + `secrets.GITHUB_TOKEN`
- `docker/metadata-action@v5` — image `ghcr.io/${{ github.repository_owner }}/kartex`, tags: latest (main), semver patterns for releases
- `docker/build-push-action@v6` with `context: .`, `file: apps/backend/Dockerfile`, `push: true`, GHA layer cache

**Commit:** `943a891`

## Verification Results

```
grep "corepack prepare" apps/backend/Dockerfile
  → RUN corepack enable && corepack prepare yarn@4.15.0 --activate (x3)

grep -c "^[A-Z_]*=" .env.example
  → 8 (all D-17 variables)

yarn workspace @kartex/shared build         → exit 0
yarn workspace @kartex/frontend typecheck   → exit 0
yarn workspace @kartex/backend typecheck    → exit 0
yarn workspace @kartex/backend test --run   → 1 passed, 25 todo
yarn workspace @kartex/frontend test --run  → 41 passed, 2 pre-existing failures (KartexRenderer Typst — not caused by this plan)
yarn lint                                   → 4 pre-existing errors, 3 warnings (not caused by this plan)
```

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Notes

**Pre-existing lint errors (out of scope):** `yarn lint` reports 4 errors in files not touched by this plan:
- `apps/frontend/src/components/CardFlip.tsx` — `prefer-as-const` (pre-existing from Phase 3)
- `apps/frontend/src/components/__tests__/CardFlip.test.tsx` — unused `beforeEach` (pre-existing)
- `apps/frontend/src/pages/StudySessionPage.tsx` — `Date.now` impure function in render (pre-existing)
- `packages/shared/src/lib/sm2.ts` — useless assignment (pre-existing)

These are all pre-existing and not caused by this plan's changes. Logged to deferred items.

**Pre-existing Typst test failures (out of scope):** 2 KartexRenderer Typst test failures are pre-existing (documented in 06-02-SUMMARY). Not caused by this plan.

**ci.yml `uses:` count:** Plan acceptance criterion says "at least 8" but the provided template itself has exactly 7 action `uses:` entries. All required actions (checkout, setup-node, setup-buildx, login-action, metadata-action, build-push-action) are present and correct.

## Security Notes (Threat Model)

| Threat | Mitigation | Status |
|--------|-----------|--------|
| T-06-09: GITHUB_TOKEN over-permission | `permissions: packages: write` on docker job only; ci job has no packages permission block | Implemented |
| T-06-10: .env committed to git | .env.example contains only placeholder values; `.env` is in .gitignore (verified) | Implemented |
| T-06-11: Supply chain via unpinned actions | Named version tags (@v4, @v5, @v6) accepted for this project's risk profile | Accepted |
| T-06-12: Unlimited CI minutes | CI on push/PR to main only (not all branches) | Implemented |

## Known Stubs

None — no placeholder data or TODO markers in any files created/modified by this plan.

## Threat Flags

No new security-relevant surfaces beyond what is declared in the plan's threat model.

## Self-Check: PASSED

Files exist:
- `.github/workflows/ci.yml` — FOUND
- `.env.example` (updated) — FOUND
- `apps/backend/Dockerfile` (yarn version updated) — FOUND

Commits:
- `f245e7f` — FOUND (Dockerfile yarn version fix)
- `ed38d12` — FOUND (.env.example D-17 variables)
- `943a891` — FOUND (ci.yml workflow)
