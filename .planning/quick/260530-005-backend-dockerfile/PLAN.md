---
slug: 260530-005-backend-dockerfile
title: Fix Dockerfile for Prisma 7 pg-driver-adapter
created: 2026-05-30
status: in-progress
---

## Problem

After the Prisma 7 migration, `schema.prisma` no longer has a `url` in the datasource block:

```prisma
datasource db {
  provider = "postgresql"
  // no url!
}
```

The URL is now provided via `prisma.config.ts`. But the production Docker image never copies `prisma.config.ts`, and `entrypoint.sh` runs `prisma migrate deploy` from `/app` (not from the backend dir where the config lives). Result: migrations fail at container startup.

## Root Cause

`entrypoint.sh`:
```sh
npx prisma migrate deploy --schema /app/apps/backend/prisma/schema.prisma
```
- Prisma CLI can't determine DATABASE_URL: schema has no `url`, config not on disk
- Even if we pass `--schema`, Prisma still needs the config or env to locate the datasource URL

## Fix

### 1. Dockerfile (production stage)
Add `prisma.config.ts` copy so the CLI can load it at runtime:
```dockerfile
COPY apps/backend/prisma.config.ts apps/backend/
```

### 2. entrypoint.sh
Change migration command to:
```sh
cd /app/apps/backend
npx prisma migrate deploy
exec node dist/index.js
```
- `cd` to backend dir → Prisma CLI auto-discovers `prisma.config.ts` there
- No `--schema` flag needed — config specifies `schema: 'prisma/schema.prisma'` (relative)

## Tasks

- [x] Add `prisma.config.ts` COPY line to Dockerfile production stage
- [x] Update entrypoint.sh to cd first, then migrate without --schema
- [ ] Verify Dockerfile builds without errors
- [ ] Commit
