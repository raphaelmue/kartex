---
created: 2026-05-28T20:40:00Z
completed: 2026-05-30T00:00:00Z
title: Add GitHub Actions CI pipeline with Docker build and GHCR push
area: tooling
files:
  - .github/workflows/ci.yml
  - apps/backend/Dockerfile
  - docker-compose.yml
---

CI workflow (`.github/workflows/ci.yml`) shipped in Phase 6 plan 06-03. Backend Dockerfile fixed in quick task 260530-005 (Prisma 7 migration entrypoint fix).
