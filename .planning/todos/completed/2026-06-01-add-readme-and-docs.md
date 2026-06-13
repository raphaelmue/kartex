---
created: 2026-06-01T21:30:00Z
title: Add README and small docs
area: docs
resolves_phase: 13
files: []
---

## Problem

The project has no README.md at the repo root and no getting-started documentation. New users or contributors have no entry point — there is no overview of what Kartex is, how to run it locally, or how to deploy it with Docker Compose.

## Solution

- Root `README.md`: project description, screenshot (optional), tech stack, quick-start (Docker Compose + `.env` setup), and link to `docs/design.md`
- Possibly a `CONTRIBUTING.md` or dev setup section for local development (yarn install, prisma migrate, dev servers)
- Could also surface existing `docs/kartex-format.md` and `docs/design.md` in the README as reference links
