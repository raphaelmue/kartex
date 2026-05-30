---
quick_id: 260530-002
status: complete
---

# Summary: Migrate to Prisma 7

Upgraded `prisma` and `@prisma/client` from 5.22.0 → 7.8.0.

## Breaking changes handled

Prisma 7 removed `url = env("DATABASE_URL")` from `datasource` in
`schema.prisma`. Required three structural changes:

1. **`apps/backend/prisma/schema.prisma`** — removed `url` from datasource
2. **`apps/backend/prisma.config.ts`** (new) — provides `DATABASE_URL` to
   Prisma CLI commands (migrate, generate) via `defineConfig`
3. **`apps/backend/src/lib/prisma.ts`** — switched from `new PrismaClient()`
   to `new PrismaClient({ adapter: new PrismaPg(url) })`

Also installed `@prisma/adapter-pg` 7.8.0 (bundles `pg` and `@types/pg`).

## Verification

- `prisma generate` exits 0
- `typecheck` exits 0
- Test suite: 1 passed, no failures
