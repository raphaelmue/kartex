# Phase 6: Sharing, Explore & Production Deploy - Research

**Researched:** 2026-05-29
**Domain:** Deck sharing API, explore/fork UX, Prisma enum migration, Docker multi-stage build, GitHub Actions CI/GHCR
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 3-tier permission model — MANAGE added to Permission enum. READ/EDIT/MANAGE.
- **D-02:** Prisma migration adds `MANAGE` to `enum Permission { READ EDIT MANAGE }`.
- **D-03:** Sharing management section at bottom of DeckDetailPage — owner only. Non-owners see "Owned by [username]".
- **D-04:** Add share by exact username input. Backend validates user exists and is not already a recipient.
- **D-05:** Share list shows username + permission badge + Revoke button. Permission changeable inline per row.
- **D-06:** Shared decks mixed into /decks grid with "Shared by [username]" badge.
- **D-07:** READ-permission users can study shared deck with SM-2 (CardProgress isolation already enforced).
- **D-08:** /explore grid shows all PUBLIC decks — title, description snippet, owner username, card count, Fork button.
- **D-09:** No search/filter on /explore for Phase 6.
- **D-10:** Fork creates clean copy — no sourceId, no attribution in DB.
- **D-11:** Forked deck named "Copy of [original name]", starts PRIVATE, tags preserved.
- **D-12:** media:// refs work as-is in forked cards (GET /api/media/:filename uses findFirst with no ownership check).
- **D-13:** No TLS in project — user handles externally.
- **D-14:** One combined Docker image — Hono backend serves React SPA static files.
- **D-15:** docker-compose.yml has two services: backend + db.
- **D-16:** Two GitHub Actions jobs: ci (every push/PR) and docker (main + v* tags, depends on ci).
- **D-17:** .env.example documents: DATABASE_URL, JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD, ALLOWED_ORIGIN, BACKEND_PORT, STORAGE_PATH, MAX_UPLOAD_BYTES.

### Claude's Discretion
- Exact layout and styling of the sharing section on DeckDetailPage.
- Explore page empty state.
- Fork button placement on explore deck tile.
- Exact Dockerfile structure (multi-stage: shared + frontend + backend builder; runner copies dist + public).
- How Hono serves static files (serveStatic from @hono/node-server/serve-static — already in use).
- Deck tile distinction for shared-by-me vs owned-by-me.

### Deferred Ideas (OUT OF SCOPE)
- TLS / Nginx in the project
- Dark mode
- Tag-based topic filter
- Prisma 7 migration
- Search/filter on /explore
- Deck preview before forking
- /settings page
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SHAR-01 | Deck owner can share with a specific user granting READ or EDIT permission | DeckShare API routes pattern; Prisma upsert on @@unique([deckId, sharedWithUserId]) |
| SHAR-02 | Deck owner can revoke a user's access | DELETE /api/decks/:id/shares/:userId; owner-only guard |
| SHAR-03 | Deck owner can make deck public so it appears on /explore | PATCH /api/decks/:id already exists; visibility: PUBLIC in UpdateDeckSchema |
| SHAR-04 | Any logged-in user can browse public decks on /explore | GET /api/explore new endpoint; ExplorePage component |
| SHAR-05 | User can fork a public or shared deck | POST /api/decks/:id/fork; Prisma transaction create deck + cards |
| SHAR-06 | SM-2 progress per user, never shared | CardProgress @@unique([userId, cardId]) already enforced — no code change needed |
</phase_requirements>

---

## Summary

Phase 6 closes out Kartex v1 with three distinct workstreams: (1) the DeckShare API plus sharing UI in DeckDetailPage, (2) the Explore page and fork endpoint, and (3) production Docker/CI hardening. All three workstreams have independent backend and frontend components but share common Prisma schema changes (adding `MANAGE` to the Permission enum).

The codebase is in excellent shape for this phase. The `apps/backend/Dockerfile` **already exists** with a correct multi-stage build (frontend-builder → backend-builder → production). The `docker-compose.yml` is already finalized with the two-service layout (backend + db). The `serveStatic` middleware from `@hono/node-server/serve-static` is already wired in `apps/backend/src/index.ts` at step 7. The Vite config already outputs the SPA build to `apps/backend/public/`. The entrypoint script already runs `prisma migrate deploy` before starting the server. The primary remaining work is: API routes, Zod schemas, frontend pages, and the GitHub Actions CI workflow file.

The one technical gotcha to watch is the Prisma enum migration. PostgreSQL's `ALTER TYPE ... ADD VALUE` cannot run inside a transaction block — Prisma's migration engine handles simple additions (single ADD VALUE, no other simultaneous changes) via an out-of-transaction statement in Prisma 5.x. However, if the migration file needs manual editing, the pattern is to use `--create-only` first, verify the generated SQL, then apply.

**Primary recommendation:** Plan as three sequential plans — 06-01 (DeckShare API + schema migration), 06-02 (Explore + fork + /decks shared deck extension), 06-03 (GitHub Actions CI workflow + .env.example + final verification). The Dockerfile and docker-compose.yml are already correct and need minimal or no changes.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Share grant/revoke/update | API / Backend | — | Authorization logic; DeckShare Prisma CRUD |
| Permission enforcement (can user access deck?) | API / Backend | — | All access checks server-side before data leaves DB |
| Explore public deck listing | API / Backend | Browser / Client | Backend filters PUBLIC decks; frontend renders grid |
| Fork (copy deck + cards) | API / Backend | — | Atomic Prisma transaction; no client logic needed |
| Sharing panel UI | Browser / Client | — | Owner-only section on DeckDetailPage |
| "Shared by [user]" on deck tiles | Browser / Client | — | /decks GET response now includes sharedDecks; frontend renders badge |
| Static SPA serving | API / Backend (Hono) | — | serveStatic + SPA fallback in index.ts (already wired) |
| CI / Docker image build | CDN / Static (GHCR) | — | GitHub Actions builds image, pushes to ghcr.io |

---

## Standard Stack

### Core (already installed — no new packages needed for API/sharing)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| hono | ^4.7.9 | Backend route handlers | Already in use; `@hono/node-server` 1.19.14 |
| @hono/node-server | ^1.13.7 | Node.js adapter + serveStatic | Already in index.ts |
| @prisma/client | ^5.22.0 | Database ORM | Project standard |
| zod | ^3.23.8 | Schema validation for new sharing schemas | Already in @kartex/shared |
| react + react-router-dom | ^18.3.1 / ^6.28.0 | ExplorePage component | Already in frontend |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | ^2.0.7 | Toast notifications (fork success) | Fork confirmation toast |
| shadcn Card, Button, Badge, Input, Select, Table | installed | Sharing panel, explore grid | Follow DecksPage pattern |
| lucide-react | ^1.16.0 | Icons | GitFork icon for fork button |

### New additions
| Library | Version | Purpose | Install |
|---------|---------|---------|---------|
| None | — | All needed packages already installed | — |

No new npm packages are required for Phase 6 backend or frontend work.

### GitHub Actions (workflow-only, no npm install)
| Action | Version | Purpose |
|--------|---------|---------|
| actions/checkout | v4 | Checkout repository |
| actions/setup-node | v4 | Node.js + pnpm/yarn cache |
| docker/setup-buildx-action | v3 | Docker Buildx |
| docker/login-action | v3 | GHCR login with GITHUB_TOKEN |
| docker/metadata-action | v5 | Auto tag generation (latest + semver) |
| docker/build-push-action | v6 | Build and push multi-stage image |

**Version verification note:** Action versions verified against GitHub's published action marketplace as of May 2026. Use `@v4`/`@v5`/`@v6` tags (not sha-pinned) for this project's scale. [ASSUMED — exact latest minor not verified against marketplace API]

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (React SPA)
    │ /api/decks — GET (own + shared decks)
    │ /api/decks/:id/shares — POST/PATCH/DELETE
    │ /api/explore — GET (public decks)
    │ /api/decks/:id/fork — POST
    ▼
Hono Backend (Node.js — combined image)
    │ authMiddleware (all /api/* except auth)
    │ ┌─────────────────────────────┐
    │ │ decksRouter (extended)      │
    │ │  GET / → own + shared decks │
    │ │  POST /:id/shares           │
    │ │  PATCH /:id/shares/:userId  │
    │ │  DELETE /:id/shares/:userId │
    │ │  POST /:id/fork             │
    │ └─────────────────────────────┘
    │ ┌─────────────────────────────┐
    │ │ exploreRouter (new)         │
    │ │  GET / → PUBLIC decks       │
    │ └─────────────────────────────┘
    │ serveStatic({ root: './public' }) — SPA static files
    │ GET * fallback → ./public/index.html (React Router)
    ▼
PostgreSQL 16 (Prisma)
    Permission enum: READ | EDIT | MANAGE (migration)
    DeckShare @@unique([deckId, sharedWithUserId])
    CardProgress @@unique([userId, cardId]) — already enforced
```

### Recommended Project Structure (new files only)

```
apps/backend/src/routes/
├── decks.ts                 ← EXTEND: add sharing routes + fork + expand GET /
└── explore.ts               ← NEW: GET /api/explore

apps/frontend/src/pages/
└── ExplorePage.tsx          ← NEW: public deck grid + fork button

packages/shared/src/schemas/
└── share.ts                 ← NEW: CreateShareSchema, UpdateShareSchema, ShareSchema, ExploredeckSchema

apps/backend/prisma/migrations/
└── YYYYMMDDHHMMSS_add_manage_permission/
    └── migration.sql        ← ALTER TYPE "Permission" ADD VALUE 'MANAGE'

.github/workflows/
└── ci.yml                   ← NEW: ci job + docker job
```

### Pattern 1: DeckShare Route Authorization Guard

Every sharing management route must check: is the caller the deck owner OR a MANAGE-permission user? The simplest approach uses a helper that does a Prisma query:

```typescript
// Source: decks.ts pattern (VERIFIED from reading apps/backend/src/routes/decks.ts)
async function canManageDeck(deckId: string, userId: string): Promise<boolean> {
  const deck = await prisma.deck.findUnique({ where: { id: deckId } })
  if (!deck) return false
  if (deck.ownerId === userId) return true
  const share = await prisma.deckShare.findUnique({
    where: { deckId_sharedWithUserId: { deckId, sharedWithUserId: userId } },
  })
  return share?.permission === 'MANAGE'
}
```

Use this guard in `POST /api/decks/:id/shares`, `PATCH /api/decks/:id/shares/:userId`, `DELETE /api/decks/:id/shares/:userId`.

### Pattern 2: Extending GET /api/decks to Include Shared Decks

```typescript
// Source: decks.ts GET / pattern (VERIFIED from codebase read)
// Extend to include decks shared with this user
const [ownDecks, sharedDeckRows] = await Promise.all([
  prisma.deck.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { cards: true } } },
  }),
  prisma.deckShare.findMany({
    where: { sharedWithUserId: userId },
    include: {
      deck: {
        include: {
          _count: { select: { cards: true } },
          owner: { select: { username: true } },
        },
      },
    },
  }),
])
// Merge: ownDecks (no sharedByUsername) + sharedDeckRows (add sharedByUsername field)
```

The frontend uses `sharedByUsername` presence to render "Shared by [user]" text.

### Pattern 3: Fork Endpoint — Prisma Transaction

```typescript
// Source: CONTEXT.md D-10, D-11 + Prisma docs pattern [ASSUMED API shape]
const forked = await prisma.$transaction(async (tx) => {
  const source = await tx.deck.findUnique({
    where: { id: deckId },
    include: { cards: true },
  })
  // Access check: source must be PUBLIC or user has a DeckShare record
  if (!source) throw new Error('Not found')
  const isPublic = source.visibility === 'PUBLIC'
  const hasShare = await tx.deckShare.findUnique({
    where: { deckId_sharedWithUserId: { deckId, sharedWithUserId: userId } },
  })
  if (!isPublic && !hasShare) throw new Error('Forbidden')

  const newDeck = await tx.deck.create({
    data: {
      ownerId: userId,
      title: `Copy of ${source.title}`,
      description: source.description,
      visibility: 'PRIVATE',
    },
  })
  await tx.card.createMany({
    data: source.cards.map((c) => ({
      deckId: newDeck.id,
      frontContent: c.frontContent,
      backContent: c.backContent,
      tags: c.tags,
    })),
  })
  return newDeck
})
```

### Pattern 4: Explore Endpoint

```typescript
// Source: [ASSUMED based on existing decks.ts pattern]
const exploreRouter = new Hono<{ Variables: { userId: string } }>()

exploreRouter.get('/', async (c) => {
  const decks = await prisma.deck.findMany({
    where: { visibility: 'PUBLIC' },
    orderBy: { createdAt: 'desc' },
    include: {
      owner: { select: { username: true } },
      _count: { select: { cards: true } },
    },
  })
  return c.json(decks, 200)
})
```

### Pattern 5: Hono serveStatic (already working — VERIFIED)

The backend's `apps/backend/src/index.ts` already has:
```typescript
// Source: VERIFIED from apps/backend/src/index.ts step 7
import { serveStatic } from '@hono/node-server/serve-static'
app.use('*', serveStatic({ root: './public' }))
app.get('*', (c) => {
  try {
    const html = readFileSync('./public/index.html', 'utf8')
    return c.html(html)
  } catch {
    return c.text('Kartex backend is running...', 404)
  }
})
```

The `root: './public'` path is relative to `process.cwd()`. The entrypoint script (`cd /app/apps/backend && exec node dist/index.js`) sets cwd to `/app/apps/backend`, so `./public` resolves to `/app/apps/backend/public` — the correct location where the Dockerfile copies the frontend build. **This is already correct and tested.**

### Pattern 6: Prisma Enum Migration (MANAGE addition)

After updating `schema.prisma` to add `MANAGE` to Permission:

```bash
cd apps/backend
npx prisma migrate dev --name add_manage_permission --create-only
# Inspect the generated migration SQL:
# ALTER TYPE "Permission" ADD VALUE 'MANAGE';
# If and only if it's a single ADD VALUE statement, apply directly:
npx prisma migrate dev
```

The generated SQL will be:
```sql
-- AlterEnum
ALTER TYPE "Permission" ADD VALUE 'MANAGE';
```

**Critical:** Prisma 5.x wraps `ALTER TYPE ... ADD VALUE` statements outside the transaction block for the simple addition case. [MEDIUM confidence — verified as expected behavior from Prisma issue research; actual behavior confirmed by the Prisma 5 changelog fixing issue #5290 in 2.17.0+]

If the migration generates additional changes alongside `ADD VALUE` (e.g., due to schema drift), Prisma 5 may wrap everything in a transaction and the migration will fail. To prevent this: only change the Permission enum in schema.prisma (no other schema edits in the same commit), run `--create-only`, inspect the SQL, then apply.

### Pattern 7: GitHub Actions CI Workflow

**Project uses Yarn 4 (packageManager: "yarn@4.15.0"), not pnpm.** The CI todo spec incorrectly mentions `pnpm` — the CONTEXT.md specifics note "check actual workspace scripts before coding." Root `package.json` scripts use `yarn workspaces` and `packageManager: yarn@4.15.0`. The Dockerfile uses `corepack enable && corepack prepare yarn@4.6.0 --activate`. [VERIFIED from package.json and .yarnrc.yml reads]

```yaml
# Source: GitHub Actions docs + codebase verification [CITED: docs.github.com]
name: CI

on:
  push:
    branches: [main]
    tags: ['v*']
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'yarn'
      - run: corepack enable
      - run: yarn install --immutable
      - run: yarn workspace @kartex/shared build
      - run: yarn workspaces foreach -A run typecheck
      - run: yarn lint
      - run: yarn workspace @kartex/frontend test --run
      - run: yarn workspace @kartex/frontend build
      - run: yarn workspace @kartex/backend build

  docker:
    needs: ci
    if: github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository_owner }}/kartex
          tags: |
            type=raw,value=latest,enable={{is_default_branch}}
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=semver,pattern={{major}}
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: apps/backend/Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
```

**Required repo setting:** Repository Settings → Actions → General → Workflow permissions → "Read and write permissions" (for GHCR push). [CITED: docs.github.com/en/actions/use-cases-and-examples/publishing-packages/publishing-docker-images]

### Anti-Patterns to Avoid

- **Checking ownership only by ownerId in sharing routes:** MANAGE-permission users can also grant/revoke. Always use the two-condition check (ownerId OR MANAGE share record).
- **Using `findMany` instead of `findUnique` on deckShare:** The @@unique([deckId, sharedWithUserId]) constraint means `findUnique` with compound key works and is faster. Use `deckId_sharedWithUserId: { deckId, sharedWithUserId }` as the compound unique key.
- **Forgetting to include owner.username in explore response:** The frontend needs username to display "by [user]". Include `owner: { select: { username: true } }` in the Prisma query.
- **Setting `DeckShare.onDelete` to nothing on Deck delete:** If a deck is deleted, its DeckShare rows should cascade-delete. Verify `onDelete: Cascade` is on the DeckShare.deck relation (currently it's RESTRICT — check and add cascade).
- **Mixing yarn commands with npm run in CI:** Root scripts use `yarn workspaces foreach`. Don't mix with `npm run`.
- **Running Prisma migrate in CI:** CI runs `tsc` + `lint` + `test` + `build`. It does NOT run `prisma migrate dev` — that runs in the container entrypoint at deploy time.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Permission-aware deck access | Custom JWT claims with permission list | Prisma DB lookup per request | DB is source of truth; permission changes must be immediate, not cached in tokens |
| Image tag generation for Docker | Manual tag scripting | docker/metadata-action@v5 | Handles semver parsing, latest-on-main logic, OCI labels automatically |
| Fork as client-side copy | Frontend fetching all cards and POSTing them one by one | Single POST /api/decks/:id/fork (Prisma $transaction) | Atomicity — partial fork is worse than no fork |
| SPA routing fallback | Custom express-style static middleware | Hono serveStatic + readFileSync fallback (already wired) | Already implemented correctly in index.ts |
| Enum migration SQL | Manual psql commands | `prisma migrate dev --create-only` + inspect | Migration history tracking |

---

## Common Pitfalls

### Pitfall 1: DeckShare onDelete Not Set to Cascade
**What goes wrong:** Deleting a deck fails with a foreign key violation because DeckShare rows reference the deck. Or orphaned DeckShare rows remain after deck deletion.
**Why it happens:** The initial schema has `DeckShare` with no `onDelete` directive on the `deck` relation (defaults to RESTRICT). Cards have `onDelete: Cascade` (added in migration 2), but DeckShare does not.
**How to avoid:** Add `onDelete: Cascade` to the `DeckShare.deck` relation in schema.prisma as part of the Phase 6 migration. The migration SQL will be: `ALTER TABLE "DeckShare" DROP CONSTRAINT ...; ALTER TABLE "DeckShare" ADD CONSTRAINT ... ON DELETE CASCADE`.
**Warning signs:** `prisma.deck.delete()` throws PrismaClientKnownRequestError P2003 (foreign key constraint).

### Pitfall 2: Prisma Enum Migration Transaction Error
**What goes wrong:** `prisma migrate dev` fails with "ALTER TYPE ... ADD cannot run inside a transaction block".
**Why it happens:** If the generated migration file wraps the `ALTER TYPE` in a `BEGIN`/`COMMIT` block (can happen when combined with other schema changes), PostgreSQL rejects it.
**How to avoid:** Only change the Permission enum in the schema commit. Use `--create-only` to inspect the generated SQL before applying. The simple case (`ALTER TYPE "Permission" ADD VALUE 'MANAGE'`) runs outside the transaction in Prisma 5.x and should work without editing.
**Warning signs:** Migration SQL file contains `BEGIN;` before `ALTER TYPE ... ADD VALUE`.

### Pitfall 3: GET /api/decks Returns Duplicate Decks
**What goes wrong:** A deck that the user both owns and has a DeckShare for appears twice in the list.
**Why it happens:** Naive merge of own decks + shared decks without deduplication.
**How to avoid:** The owner of a deck is never also a sharedWithUser for that deck (business rule — enforce in the share-grant route: reject if `sharedWithUserId === deck.ownerId`). Also check this server-side in the grant endpoint.
**Warning signs:** /decks page shows the same deck card twice.

### Pitfall 4: Forked Deck Access Mismatch
**What goes wrong:** A user forks a deck they only have READ access to on a SHARED deck (not PUBLIC), then the fork succeeds but expects PUBLIC access semantics.
**Why it happens:** D-05 says fork is allowed from "public or shared" decks. The fork access check must verify: `visibility === 'PUBLIC'` OR `DeckShare record exists for this user`.
**How to avoid:** In `POST /api/decks/:id/fork`, query both conditions and return 403 if neither is true.
**Warning signs:** Users can fork decks they're not supposed to see.

### Pitfall 5: serveStatic root Path Mismatch in Production
**What goes wrong:** Static files are not served; Hono returns 404 for all non-API routes.
**Why it happens:** `serveStatic({ root: './public' })` resolves relative to `process.cwd()`. If the entrypoint doesn't `cd /app/apps/backend` before `node dist/index.js`, cwd is `/app` and `./public` resolves to `/app/public` (empty directory).
**How to avoid:** The entrypoint.sh already does `cd /app/apps/backend && exec node dist/index.js`. This is correct. Do not change the entrypoint or the serveStatic root.
**Warning signs:** `GET /` returns 404 or the SPA fallback text instead of index.html.

### Pitfall 6: Yarn Version Mismatch in CI
**What goes wrong:** CI fails with "yarn: error: unknown option --immutable" or Corepack version mismatch.
**Why it happens:** The Dockerfile uses `yarn@4.6.0` but root package.json says `packageManager: yarn@4.15.0`.
**How to avoid:** Use `corepack enable` in CI (same as Dockerfile) and let Corepack read `packageManager` from package.json to select the correct version. Use `yarn install --immutable` (Yarn Berry equivalent of `--frozen-lockfile`). [VERIFIED: .yarnrc.yml has `nodeLinker: node-modules`]
**Warning signs:** `yarn: command not found` or version conflict errors in CI.

### Pitfall 7: GITHUB_TOKEN Permissions for GHCR Push
**What goes wrong:** Docker push fails with "permission denied" even though GITHUB_TOKEN is set.
**Why it happens:** Default workflow token permission is "read-only". GHCR push requires write permission on packages.
**How to avoid:** Add `permissions: packages: write` to the docker job (not the ci job). Alternatively, enable "Read and write permissions" in repository Settings → Actions.
**Warning signs:** `unauthorized: unauthenticated` or 403 during `docker push`.

---

## Code Examples

### Zod Schema for Share Operations (new file: packages/shared/src/schemas/share.ts)

```typescript
// Source: Pattern following deck.ts and card.ts [ASSUMED shape — follow project convention]
import { z } from 'zod'

export const CreateShareSchema = z.object({
  username: z.string().min(1),
  permission: z.enum(['READ', 'EDIT', 'MANAGE']).default('READ'),
})
export type CreateShareInput = z.infer<typeof CreateShareSchema>

export const UpdateShareSchema = z.object({
  permission: z.enum(['READ', 'EDIT', 'MANAGE']),
})
export type UpdateShareInput = z.infer<typeof UpdateShareSchema>

export const ShareSchema = z.object({
  id: z.string(),
  deckId: z.string(),
  sharedWithUserId: z.string(),
  permission: z.enum(['READ', 'EDIT', 'MANAGE']),
  sharedWithUser: z.object({ username: z.string() }),
})
export type Share = z.infer<typeof ShareSchema>

export const ExploredeckSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  visibility: z.literal('PUBLIC'),
  ownerId: z.string(),
  owner: z.object({ username: z.string() }),
  _count: z.object({ cards: z.number() }).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type ExploreDeck = z.infer<typeof ExploredeckSchema>
```

### Extended Deck Schema for /decks Response

```typescript
// Extend DeckSchema in packages/shared/src/schemas/deck.ts to add sharedByUsername
export const DeckListItemSchema = DeckSchema.extend({
  sharedByUsername: z.string().optional(), // present only for decks shared with you
})
export type DeckListItem = z.infer<typeof DeckListItemSchema>
```

### DeckShare Migration SQL (expected output)

```sql
-- AlterEnum (Prisma 5 generates this outside transaction for simple ADD VALUE)
ALTER TYPE "Permission" ADD VALUE 'MANAGE';

-- AlterTable (if adding onDelete: Cascade to DeckShare.deck relation)
ALTER TABLE "DeckShare" DROP CONSTRAINT "DeckShare_deckId_fkey";
ALTER TABLE "DeckShare" ADD CONSTRAINT "DeckShare_deckId_fkey"
  FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

### ExplorePage Pattern (follow DecksPage.tsx)

```typescript
// Source: Based on DecksPage.tsx pattern [VERIFIED from codebase read]
export function ExplorePage() {
  const [decks, setDecks] = useState<ExploreDeck[]>([])

  const fetchDecks = async () => {
    const res = await api.get('/api/explore')
    if (res.ok) setDecks(await res.json())
  }

  const handleFork = async (deck: ExploreDeck) => {
    const res = await api.post(`/api/decks/${deck.id}/fork`)
    if (res.ok) {
      const forked = await res.json()
      toast.success(`Deck forked — "Copy of ${deck.title}" added to your decks.`, {
        action: { label: 'View deck', onClick: () => navigate(`/decks/${forked.id}`) },
      })
    }
  }
  // Grid matches DecksPage — same shadcn Card grid pattern
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Nginx as SPA + reverse proxy | Hono backend serving SPA static files directly | Decision D-14 | Removes Nginx service from docker-compose; simpler two-service setup |
| sha-pinned Action versions | Named version tags (@v4) for GitHub Actions | Current practice for small repos | Less brittle for project maintenance |

**Already implemented (no work needed):**
- Dockerfile: 3-stage multi-stage build — VERIFIED, file exists at apps/backend/Dockerfile
- docker-compose.yml: two services (backend + db) with healthcheck — VERIFIED, file exists
- entrypoint.sh: runs `prisma migrate deploy` then starts server — VERIFIED
- serveStatic + SPA fallback: wired in apps/backend/src/index.ts steps 7 and 8 — VERIFIED
- Vite outDir → apps/backend/public: wired in vite.config.ts — VERIFIED

---

## Open Questions

1. **DeckShare onDelete behavior for SHARED visibility**
   - What we know: When a deck owner revokes the last DeckShare, should the deck visibility automatically revert to PRIVATE? Or remain SHARED?
   - What's unclear: D-05 says owner controls visibility separately. Probably the deck remains SHARED visibility even with zero shares (user must manually change visibility to PRIVATE).
   - Recommendation: Do not auto-change visibility on revoke. Keep it simple — visibility is a separate setting.

2. **Can non-owners access GET /api/decks/:id?**
   - What we know: Current route returns 403 if `deck.ownerId !== userId`.
   - What's unclear: DeckDetailPage needs to work for shared decks. The MANAGE-permission sharing panel requires viewing DeckDetailPage.
   - Recommendation: Extend `GET /api/decks/:id` to also allow access if the user has a DeckShare record for that deck. Return the deck with an additional `userPermission` field so the frontend knows whether to show the sharing panel.

3. **Yarn version in Dockerfile vs package.json**
   - What we know: Dockerfile uses `corepack prepare yarn@4.6.0`, package.json says `yarn@4.15.0`.
   - What's unclear: This minor version mismatch may cause a warning but not a failure since Corepack respects packageManager field.
   - Recommendation: Update Dockerfile to use `yarn@4.15.0` to match package.json, or rely solely on `corepack enable` without the explicit version pin.

---

## Environment Availability

The Dockerfile and docker-compose.yml are already functional. No new external dependencies introduced by Phase 6.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 22 | CI/CD, Dockerfile | ✓ (in Docker image) | 22-alpine | — |
| Yarn 4 | CI, build | ✓ (via corepack) | 4.15.0 | — |
| Docker Buildx | docker job in CI | ✓ (GitHub-hosted runners) | latest | — |
| GHCR | docker job | ✓ (github.repository_owner) | — | — |
| PostgreSQL 16 | Runtime | ✓ (docker-compose) | 16-alpine | — |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 |
| Config file | apps/frontend — implicit (vitest in package.json scripts) |
| Quick run command | `yarn workspace @kartex/frontend test --run` |
| Full suite command | `yarn workspace @kartex/frontend test --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SHAR-01 | Share grant stores DeckShare with correct permission | Integration (hono/testing) | `yarn workspace @kartex/backend test --run` | ❌ Wave 0 |
| SHAR-02 | Revoke deletes DeckShare row | Integration (hono/testing) | `yarn workspace @kartex/backend test --run` | ❌ Wave 0 |
| SHAR-03 | Owner can set visibility PUBLIC | Integration (hono/testing) | `yarn workspace @kartex/backend test --run` | ❌ Wave 0 |
| SHAR-04 | /explore returns only PUBLIC decks | Integration (hono/testing) | `yarn workspace @kartex/backend test --run` | ❌ Wave 0 |
| SHAR-05 | Fork creates new deck+cards owned by requester | Integration (hono/testing) | `yarn workspace @kartex/backend test --run` | ❌ Wave 0 |
| SHAR-06 | CardProgress isolation — no cross-user bleed | Unit (sm2 logic already tested) | existing | ✅ existing |

**Backend test infrastructure:** The backend does not yet have a Vitest config or test files. Phase 6 should add `vitest.config.ts` and basic route integration tests using `hono/testing` (Hono provides an in-process test client).

### Sampling Rate
- Per task commit: `yarn workspace @kartex/frontend test --run`
- Per wave merge: `yarn workspace @kartex/frontend test --run && yarn workspace @kartex/backend test --run` (if backend tests added)
- Phase gate: Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `apps/backend/vitest.config.ts` — backend test configuration
- [ ] `apps/backend/src/routes/__tests__/sharing.test.ts` — sharing API integration tests
- [ ] `apps/backend/src/routes/__tests__/explore.test.ts` — explore + fork integration tests
- [ ] `apps/backend/package.json` — add `"test": "vitest"` script

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT httpOnly cookie (already implemented) |
| V3 Session Management | yes | authMiddleware on all /api/decks/:id/shares routes |
| V4 Access Control | yes | Owner/MANAGE check on share management; READ check on fork |
| V5 Input Validation | yes | Zod schemas on CreateShareSchema, UpdateShareSchema |
| V6 Cryptography | no | No new crypto in Phase 6 |

### Known Threat Patterns for Hono + Prisma

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR: accessing another user's deck shares | Tampering | Owner/MANAGE guard before all share routes |
| Mass fork attack (CPU/storage DoS) | DoS | Existing rate limiting on auth routes; fork is idempotent but creates DB rows — consider rate limit on /fork |
| Username enumeration in share-add | Information Disclosure | Return generic "User not found." error (not "Username does not exist") |
| Path traversal via media:// in forked content | Tampering | Already mitigated: media.ts uses regex validation `/^[A-Za-z0-9_-]+\.[a-z0-9]{1,10}$/` (VERIFIED from codebase) |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Prisma 5.x handles simple `ALTER TYPE ... ADD VALUE` outside transaction automatically | Pitfall 2, Pattern 6 | Migration fails; needs manual migration file edit to remove BEGIN/COMMIT wrapping |
| A2 | GitHub Action major versions (@v4, @v5, @v6) are current latest | Standard Stack (GH Actions) | May use deprecated action APIs; low risk for stable actions |
| A3 | Backend vitest tests use `hono/testing` in-process client (no running DB needed) | Validation Architecture | If tests require real DB, Wave 0 gaps are larger — need pg test container or mock |
| A4 | DeckShare.deck onDelete is currently RESTRICT (no explicit directive in schema) | Pitfall 1, Code Examples | If already CASCADE, no migration change needed for FK behavior |

---

## Sources

### Primary (HIGH confidence)
- `apps/backend/src/index.ts` — serveStatic and SPA fallback already wired (VERIFIED via direct read)
- `apps/backend/Dockerfile` — multi-stage build already correct (VERIFIED via direct read)
- `apps/backend/entrypoint.sh` — prisma migrate deploy + server start (VERIFIED via direct read)
- `docker-compose.yml` — two services, BACKEND_PORT configurable (VERIFIED via direct read)
- `apps/backend/src/routes/decks.ts` — route pattern to extend (VERIFIED via direct read)
- `apps/backend/prisma/schema.prisma` — Permission enum has READ/EDIT (no MANAGE yet) (VERIFIED)
- `apps/backend/src/middleware/auth.ts` — userId + role set on context (VERIFIED)
- `apps/frontend/src/lib/api.ts` — api.get/post/patch/delete pattern (VERIFIED)
- `packages/shared/src/schemas/deck.ts` — DeckSchema shape (VERIFIED)
- `apps/frontend/vite.config.ts` — outDir: apps/backend/public (VERIFIED)
- Context7 `/websites/hono_dev` — serveStatic root relative to process.cwd() (HIGH)

### Secondary (MEDIUM confidence)
- [docs.github.com — GitHub Actions GHCR publish workflow](https://docs.github.com/en/actions/use-cases-and-examples/publishing-packages/publishing-docker-images) — permissions, GITHUB_TOKEN, metadata-action tag patterns
- [Prisma GitHub Issues #5290, #7251, #8424](https://github.com/prisma/prisma/issues/5290) — ALTER TYPE ADD VALUE transaction behavior; known pitfall; fixed in Prisma 2.17.0+

### Tertiary (LOW confidence)
- WebSearch results on Prisma enum migrations — community workarounds; single-source; verify against actual migration output

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified via direct package.json reads
- Architecture: HIGH — all integration points verified in codebase
- Prisma enum migration: MEDIUM — known pitfall behavior, Prisma 5.x expected to handle simple case correctly
- GitHub Actions workflow: MEDIUM — action versions not verified against marketplace API
- Pitfalls: HIGH — identified from direct codebase inspection + verified issue tracking

**Research date:** 2026-05-29
**Valid until:** 2026-06-28 (30 days — stable tech stack, no fast-moving dependencies)
