---
slug: 260530-005-backend-dockerfile
status: complete
completed: 2026-05-30
---

## What was done

Fixed the production Docker image to work correctly with Prisma 7's pg driver adapter.

**Root cause:** After the Prisma 7 migration, `schema.prisma` no longer contains a `url` in the datasource block — the URL is sourced from `prisma.config.ts` instead. The production Docker image never copied `prisma.config.ts`, so `prisma migrate deploy` had no way to determine `DATABASE_URL` and would crash on every container startup.

**Changes:**
- `Dockerfile`: Added `COPY apps/backend/prisma.config.ts apps/backend/` to the production stage
- `entrypoint.sh`: Changed migration step to `cd /app/apps/backend && npx prisma migrate deploy` (no `--schema` flag — the config auto-discovers the schema path)

**Commit:** `0398325` — fix(docker): copy prisma.config.ts and fix migration entrypoint for Prisma 7
