# Phase 6: Sharing, Explore & Production Deploy - Pattern Map

**Mapped:** 2026-05-29
**Files analyzed:** 11 (7 new, 4 modified)
**Analogs found:** 11 / 11

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `apps/backend/src/routes/explore.ts` | route | request-response | `apps/backend/src/routes/decks.ts` | exact |
| `apps/frontend/src/pages/ExplorePage.tsx` | component/page | request-response | `apps/frontend/src/pages/DecksPage.tsx` | exact |
| `packages/shared/src/schemas/share.ts` | model/schema | transform | `packages/shared/src/schemas/card.ts` | exact |
| `apps/backend/prisma/migrations/.../migration.sql` | migration | CRUD | `apps/backend/prisma/schema.prisma` (existing enum patterns) | role-match |
| `.github/workflows/ci.yml` | config | batch | `apps/backend/Dockerfile` (build pipeline structure) | partial |
| `apps/backend/src/routes/decks.ts` (modified) | route | CRUD | itself — extend existing file | exact |
| `apps/frontend/src/pages/DecksPage.tsx` (modified) | component/page | request-response | itself — extend existing file | exact |
| `apps/frontend/src/pages/DeckDetailPage.tsx` (modified) | component/page | request-response | itself — extend existing file | exact |
| `apps/frontend/src/App.tsx` (modified) | config/router | request-response | itself — replace ComingSoon | exact |
| `apps/backend/prisma/schema.prisma` (modified) | model | CRUD | itself — extend Permission enum + add onDelete | exact |
| `packages/shared/src/schemas/deck.ts` (modified) | model/schema | transform | itself — extend DeckSchema | exact |
| `packages/shared/src/index.ts` (modified) | config | transform | itself — add export line | exact |

---

## Pattern Assignments

### `apps/backend/src/routes/explore.ts` (route, request-response)

**Analog:** `apps/backend/src/routes/decks.ts`

**Imports pattern** (decks.ts lines 1-4):
```typescript
import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'
// No shared schema import needed for explore GET (read-only, no body validation)
```

**Router instantiation pattern** (decks.ts line 6):
```typescript
const explore = new Hono<{ Variables: { userId: string } }>()
```

**Auth:** Auth is applied globally in `apps/backend/src/index.ts` at step 4 (`app.use('/api/*', authMiddleware)`). The explore router inherits it — no per-route auth import needed.

**Core GET pattern** (decks.ts lines 12-20 — adapt for PUBLIC visibility + owner join):
```typescript
// In decks.ts:
decks.get('/', async (c) => {
  const userId = c.get('userId')
  const rows = await prisma.deck.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { cards: true } } },
  })
  return c.json(rows, 200)
})
// For explore: change where clause to { visibility: 'PUBLIC' }
// and add include: { owner: { select: { username: true } } }
```

**Export pattern** (decks.ts line 71):
```typescript
export { explore as exploreRouter }
```

**Registration in index.ts** — copy the pattern from `apps/backend/src/index.ts` lines 44-51:
```typescript
// After step 5d (importRouter), add:
app.route('/api/explore', exploreRouter)
```

**Error handling pattern** (decks.ts lines 37-44):
```typescript
// 404 guard before access check:
if (!deck) return c.json({ error: 'Not found.' }, 404)
if (deck.ownerId !== c.get('userId')) return c.json({ error: 'Forbidden.' }, 403)
```

---

### `apps/frontend/src/pages/ExplorePage.tsx` (component/page, request-response)

**Analog:** `apps/frontend/src/pages/DecksPage.tsx`

**Imports pattern** (DecksPage.tsx lines 1-16):
```typescript
import { BookOpen } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Deck } from '@kartex/shared'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
// For ExplorePage: swap Deck for ExploreDeck from '@kartex/shared', add useNavigate
```

**State + fetch pattern** (DecksPage.tsx lines 40-58):
```typescript
export function DecksPage() {
  const [decks, setDecks] = useState<Deck[]>([])

  useEffect(() => {
    document.title = 'Decks — Kartex'
  }, [])

  const fetchDecks = async () => {
    try {
      const res = await api.get('/api/decks')
      if (res.ok) setDecks(await res.json())
      else toast.error('Failed to load decks. Please try again.')
    } catch {
      toast.error('Could not reach the server. Check your connection.')
    }
  }

  useEffect(() => {
    void fetchDecks()
  }, [])
```

**Empty state pattern** (DecksPage.tsx lines 96-102):
```typescript
{decks.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
    <BookOpen className="h-10 w-10" aria-hidden="true" />
    <p className="text-sm font-bold">No decks yet</p>
    <p className="text-sm">Create your first deck to start organizing your flashcards.</p>
  </div>
) : (
```

**Card grid pattern** (DecksPage.tsx lines 104-160):
```typescript
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  {decks.map((deck) => (
    <Card key={deck.id}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-bold line-clamp-2">{deck.title}</CardTitle>
          <VisibilityBadge visibility={deck.visibility} />
        </div>
        {deck.description && (
          <CardDescription className="line-clamp-2">{deck.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {deck._count?.cards ?? 0}{' '}
          {deck._count?.cards === 1 ? 'card' : 'cards'}
        </p>
      </CardContent>
      <CardFooter className="flex items-center gap-2">
        ...
      </CardFooter>
    </Card>
  ))}
</div>
```

**Toast + action pattern** (DecksPage.tsx line 67-70 adapted — sonner already imported):
```typescript
toast.success('Deck deleted')
// For fork: toast.success(`Deck forked — "Copy of ${deck.title}" added to your decks.`, {
//   action: { label: 'View deck', onClick: () => navigate(`/decks/${forked.id}`) },
// })
```

**VisibilityBadge** — copy verbatim from `apps/frontend/src/pages/DecksPage.tsx` lines 18-38. It is duplicated in DeckDetailPage.tsx too; the pattern is to keep it local per page file.

---

### `packages/shared/src/schemas/share.ts` (model/schema, transform)

**Analog:** `packages/shared/src/schemas/card.ts`

**Full file pattern** (card.ts lines 1-22):
```typescript
import { z } from 'zod'

export const CreateCardSchema = z.object({
  frontContent: z.string().min(1, 'Front content is required.').max(10000),
  backContent: z.string().min(1, 'Back content is required.').max(10000),
  tags: z.array(z.string()).default([]),
})
export type CreateCardInput = z.infer<typeof CreateCardSchema>

export const UpdateCardSchema = CreateCardSchema.partial()
export type UpdateCardInput = z.infer<typeof UpdateCardSchema>

export const CardSchema = z.object({
  id: z.string(),
  deckId: z.string(),
  ...
})
export type Card = z.infer<typeof CardSchema>
```

Apply this pattern to `share.ts`: one file exports `CreateShareSchema`, `UpdateShareSchema`, `ShareSchema`, `ExploredeckSchema` and their derived TypeScript types. Every schema has a matching `export type X = z.infer<typeof XSchema>`.

---

### `apps/backend/prisma/migrations/.../migration.sql` (migration, CRUD)

**Analog:** `apps/backend/prisma/schema.prisma` — the DeckShare model (lines 83-92) and Card.onDelete pattern (line 97).

**Current Permission enum** (schema.prisma lines 28-31):
```prisma
enum Permission {
  READ
  EDIT
}
```
Add `MANAGE`. The migration SQL will be:
```sql
ALTER TYPE "Permission" ADD VALUE 'MANAGE';
```

**Current DeckShare FK — no onDelete** (schema.prisma lines 83-92):
```prisma
model DeckShare {
  id               String     @id @default(cuid())
  deckId           String
  deck             Deck       @relation(fields: [deckId], references: [id])
  ...
}
```
The `deck` relation has no `onDelete` directive — defaults to RESTRICT. Compare to Card which has `onDelete: Cascade` (schema.prisma line 97). The migration must add CASCADE:
```sql
ALTER TABLE "DeckShare" DROP CONSTRAINT "DeckShare_deckId_fkey";
ALTER TABLE "DeckShare" ADD CONSTRAINT "DeckShare_deckId_fkey"
  FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

**Generation command** (from RESEARCH.md Pattern 6):
```bash
cd apps/backend
npx prisma migrate dev --name add_manage_permission --create-only
# Inspect generated SQL, then:
npx prisma migrate dev
```

---

### `.github/workflows/ci.yml` (config, batch)

**Analog:** `apps/backend/Dockerfile` (multi-stage build pipeline — same sequencing logic: install → build shared → build frontend → build backend).

**Dockerfile stage order** (Dockerfile lines 1-92) confirms build sequencing:
1. Stage 1: frontend-builder — `yarn install`, build shared, build frontend
2. Stage 2: backend-builder — `yarn install`, build shared, prisma generate, build backend
3. Stage 3: production — copy compiled artifacts only

**Package manager confirmed** (Dockerfile lines 15, 37, 68):
```dockerfile
RUN corepack enable && corepack prepare yarn@4.6.0 --activate
RUN yarn install
RUN yarn workspace @kartex/shared build
RUN yarn workspace @kartex/backend prisma generate
RUN yarn workspace @kartex/backend build
```

CI must use the same package manager. The `ci` job mirrors the Dockerfile build sequence without Docker.

**GHCR push pattern** references `apps/backend/Dockerfile` (existing, correct multi-stage):
- `docker/build-push-action@v6` with `file: apps/backend/Dockerfile`
- Context is `.` (repo root) — required because Dockerfile copies from repo root (`COPY package.json`, `COPY apps/frontend/`, etc.)

---

### `apps/backend/src/routes/decks.ts` (modified — extend existing)

**Self-analog:** Read the full file above (72 lines).

**Ownership guard to generalize** (decks.ts lines 42-44 and 50-52):
```typescript
// Current pattern (owner-only):
if (deck.ownerId !== c.get('userId')) return c.json({ error: 'Forbidden.' }, 403)

// New canManageSharing helper (owner OR MANAGE-permission user):
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

**GET / extension pattern** (decks.ts lines 12-20 — replace body):
```typescript
// Current: only own decks
const rows = await prisma.deck.findMany({
  where: { ownerId: userId },
  orderBy: { createdAt: 'desc' },
  include: { _count: { select: { cards: true } } },
})
return c.json(rows, 200)

// New: own decks + shared decks via Promise.all
```

**Prisma transaction pattern** (import.ts lines 91-112 — closest analog for fork):
```typescript
const deck = await prisma.$transaction(async (tx) => {
  const created = await tx.deck.create({
    data: {
      ownerId: userId,
      title: deckName,
      description: ...,
      visibility: 'PRIVATE',
    },
  })
  await tx.card.createMany({
    data: parseResult.cards.map((card) => ({
      deckId: created.id,
      frontContent: card.frontContent,
      backContent: card.backContent,
      tags: card.tags,
    })),
  })
  return created
})
return c.json({ deckId: deck.id, ... }, 201)
```

**Zod validation pattern** (decks.ts lines 24-27):
```typescript
const body = CreateDeckSchema.safeParse(await c.req.json())
if (!body.success) {
  return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
}
```

---

### `apps/frontend/src/pages/DecksPage.tsx` (modified — add sharedByUsername rendering)

**Self-analog:** Read the full file above (170 lines).

**Deck tile header where badge goes** (DecksPage.tsx lines 107-113):
```typescript
<CardHeader>
  <div className="flex items-start justify-between gap-2">
    <CardTitle className="text-lg font-bold line-clamp-2">{deck.title}</CardTitle>
    <VisibilityBadge visibility={deck.visibility} />
  </div>
  {deck.description && (
    <CardDescription className="line-clamp-2">{deck.description}</CardDescription>
  )}
</CardHeader>
```
Add "Shared by [username]" as small muted text below description, inside CardHeader, only when `deck.sharedByUsername` is present:
```typescript
{deck.sharedByUsername && (
  <p className="text-xs text-muted-foreground mt-1">Shared by {deck.sharedByUsername}</p>
)}
```

**Type change:** The state type changes from `Deck[]` to `DeckListItem[]` (from `@kartex/shared`) since the API response now includes `sharedByUsername`.

---

### `apps/frontend/src/pages/DeckDetailPage.tsx` (modified — add sharing panel + attribution)

**Self-analog:** Read the full file above (284 lines).

**State and fetch pattern** (DeckDetailPage.tsx lines 61-103) — all new state vars for sharing follow the existing pattern:
```typescript
const [deck, setDeck] = useState<Deck | null>(null)
// Add:
const [shares, setShares] = useState<Share[]>([])
const [isOwner, setIsOwner] = useState(false)
// or derive isOwner from deck.ownerId vs AuthContext userId
```

**Table pattern for shares** (DeckDetailPage.tsx lines 192-258 — the cards Table) — the sharing section table copies this exact JSX structure:
```typescript
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
```

**Top-of-page attribution area** — insert just below the `<h2>` title (DeckDetailPage.tsx line 153), conditional on non-owner:
```typescript
<div className="space-y-1">
  <h2 className="text-2xl font-bold">{deck.title}</h2>
  {/* Non-owner attribution: */}
  {!isOwner && deck.owner && (
    <p className="text-sm text-muted-foreground">Owned by {deck.owner.username}</p>
  )}
  ...
</div>
```

**Section separator pattern** — use Tailwind divider before the sharing section:
```typescript
<div className="mt-8 pt-8 border-t">
  <h3 className="text-lg font-semibold mb-4">Share this deck</h3>
  ...
</div>
```

**Error handling / toast pattern** (DeckDetailPage.tsx lines 106-118):
```typescript
try {
  const res = await api.delete(`/api/decks/${deckId}`)
  if (res.ok) {
    toast.success('Deck deleted')
    navigate('/decks')
  } else {
    toast.error('Something went wrong. Please try again.')
  }
} catch {
  toast.error('Something went wrong. Please try again.')
}
```

**GET /api/decks/:id — must now return userPermission** (DeckDetailPage.tsx line 80-82):
```typescript
const res = await api.get(`/api/decks/${deckId}`)
if (res.ok) setDeck(await res.json())
else navigate('/decks')
```
The DeckDetailPage will additionally call `GET /api/decks/:id/shares` to load the share list (owner/MANAGE only).

---

### `apps/frontend/src/App.tsx` (modified — wire /explore route)

**Self-analog:** Read the full file above (100 lines).

**Route registration pattern** (App.tsx lines 75-81):
```typescript
<Route path="/decks" element={<DecksPage />} />
<Route path="/decks/:id" element={<DeckDetailPage />} />
<Route path="/decks/:id/learn" element={<StudySessionPage />} />
<Route path="/study" element={<StudySessionPage />} />
<Route path="/import" element={<ImportPage />} />
<Route path="/explore" element={<ComingSoon title="Explore" />} />   {/* replace this */}
```

**Import pattern** (App.tsx lines 7-16 — top import block):
```typescript
import { ExplorePage } from '@/pages/ExplorePage'
```
Then replace `<ComingSoon title="Explore" />` with `<ExplorePage />`.

---

### `apps/backend/prisma/schema.prisma` (modified)

**Self-analog:** lines 28-31 (Permission enum) + lines 83-92 (DeckShare model).

**Change 1 — Permission enum** (schema.prisma lines 28-31):
```prisma
enum Permission {
  READ
  EDIT
  // Add:
  MANAGE
}
```

**Change 2 — DeckShare onDelete** (schema.prisma line 86 — currently no onDelete):
```prisma
// Current:
deck    Deck  @relation(fields: [deckId], references: [id])
// Change to:
deck    Deck  @relation(fields: [deckId], references: [id], onDelete: Cascade)
```
Reference: Card model already does this correctly at schema.prisma line 97:
```prisma
deck  Deck  @relation(fields: [deckId], references: [id], onDelete: Cascade)
```

---

### `packages/shared/src/schemas/deck.ts` (modified — add DeckListItemSchema)

**Self-analog:** Read the full file above (23 lines).

**Extension pattern** (deck.ts lines 13-23):
```typescript
export const DeckSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  visibility: z.enum(['PRIVATE', 'SHARED', 'PUBLIC']),
  ownerId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  _count: z.object({ cards: z.number() }).optional(),
})
export type Deck = z.infer<typeof DeckSchema>

// Add after:
export const DeckListItemSchema = DeckSchema.extend({
  sharedByUsername: z.string().optional(),
})
export type DeckListItem = z.infer<typeof DeckListItemSchema>
```

---

### `packages/shared/src/index.ts` (modified — add export)

**Self-analog:** Read the full file above (10 lines).

**Export line pattern** (index.ts lines 1-10):
```typescript
export * from './schemas/user'
export * from './schemas/auth'
// ... existing lines ...
export * from './schemas/import'
export * from './lib/kartex-parser'
// Add:
export * from './schemas/share'
```

---

## Shared Patterns

### Authentication (inherited via global middleware)
**Source:** `apps/backend/src/middleware/auth.ts` lines 18-31 + `apps/backend/src/index.ts` line 41
```typescript
// In index.ts — applies to ALL /api/* routes except auth + mediaPublic:
app.use('/api/*', authMiddleware)

// In any route handler, get userId:
const userId = c.get('userId')

// In authMiddleware — sets userId + role on context:
c.set('userId', payload.sub as string)
c.set('role', payload.role as string)
```
**Apply to:** `explore.ts` (inherited), new sharing routes on `decks.ts` (inherited). No per-router auth setup needed.

### Error Responses
**Source:** `apps/backend/src/routes/decks.ts` lines 37-44, 50-52, 63-67
```typescript
if (!deck) return c.json({ error: 'Not found.' }, 404)
if (deck.ownerId !== c.get('userId')) return c.json({ error: 'Forbidden.' }, 403)
// Validation:
return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
```
**Apply to:** All new route handlers in `decks.ts` (sharing routes, fork) and `explore.ts`. Keep error strings consistent with existing routes.

### Zod Body Validation
**Source:** `apps/backend/src/routes/decks.ts` lines 24-27
```typescript
const body = CreateDeckSchema.safeParse(await c.req.json())
if (!body.success) {
  return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
}
```
**Apply to:** `POST /api/decks/:id/shares` (validate CreateShareSchema), `PATCH /api/decks/:id/shares/:userId` (validate UpdateShareSchema).

### Prisma Transaction (Atomic Multi-Model Write)
**Source:** `apps/backend/src/routes/import.ts` lines 91-112
```typescript
const deck = await prisma.$transaction(async (tx) => {
  const created = await tx.deck.create({ data: { ... } })
  await tx.card.createMany({ data: cards.map(...) })
  return created
})
```
**Apply to:** `POST /api/decks/:id/fork` — creates new Deck + copies all Cards atomically.

### Toast Notifications (Frontend)
**Source:** `apps/frontend/src/pages/DecksPage.tsx` lines 53-55, 67
```typescript
import { toast } from 'sonner'
// Success:
toast.success('Deck deleted')
// Error:
toast.error('Failed to load decks. Please try again.')
toast.error('Could not reach the server. Check your connection.')
```
**Apply to:** `ExplorePage.tsx` (fork success with action), `DeckDetailPage.tsx` (share grant/revoke success/error), `DecksPage.tsx` (already uses it — no change needed).

### API Client (Frontend fetch wrapper)
**Source:** `apps/frontend/src/lib/api.ts` (used throughout — e.g. DeckDetailPage.tsx lines 80, 92, 108, 122)
```typescript
import { api } from '@/lib/api'
// Usage pattern:
const res = await api.get('/api/decks')
const res = await api.post(`/api/decks/${id}/fork`)
const res = await api.patch(`/api/decks/${id}/shares/${userId}`)
const res = await api.delete(`/api/decks/${id}/shares/${userId}`)
if (res.ok) { ... } else { toast.error(...) }
```
**Apply to:** All new frontend API calls in `ExplorePage.tsx` and `DeckDetailPage.tsx` sharing section.

### Hono Router Registration
**Source:** `apps/backend/src/index.ts` lines 44-51 + `apps/backend/src/routes/decks.ts` line 71
```typescript
// In route file:
export { explore as exploreRouter }

// In index.ts — insert at step 5d or after:
import { exploreRouter } from './routes/explore.js'
app.route('/api/explore', exploreRouter)
```
**Apply to:** `explore.ts` export + `index.ts` registration.

---

## No Analog Found

All files have close analogs in the codebase. No files require falling back to RESEARCH.md patterns exclusively.

| File | Note |
|---|---|
| `.github/workflows/ci.yml` | No existing CI workflow. Use RESEARCH.md Pattern 7 (verified Yarn+GHCR workflow). Dockerfile provides the sequencing analog. |

---

## Key Observations for Planner

1. **DeckShare.onDelete is currently RESTRICT** (schema.prisma line 86 has no onDelete directive). The migration must add CASCADE — combine with the MANAGE enum addition into a single migration.

2. **GET /api/decks/:id currently has a hard ownership check** (decks.ts line 43: `deck.ownerId !== c.get('userId')`). This must be relaxed for Phase 6 — shared-deck users need to view DeckDetailPage. The fix: also allow access if a DeckShare record exists. Add a `userPermission` field to the response so the frontend knows whether to show the sharing panel.

3. **VisibilityBadge is duplicated** in both DecksPage.tsx (lines 18-38) and DeckDetailPage.tsx (lines 19-39). The pattern is to keep it local to each page file — do not extract to a shared component unless explicitly decided.

4. **Package manager is Yarn 4** (not pnpm) — confirmed in Dockerfile lines 15, 37, 68. All CI commands must use `yarn` / `corepack`.

5. **Dockerfile and docker-compose.yml already exist and are correct** (RESEARCH.md "Already implemented"). Plan 06-03 primarily creates `.env.example` and the GitHub Actions workflow; the Dockerfile needs only a minor version pin update (yarn@4.6.0 → yarn@4.15.0 to match package.json).

---

## Metadata

**Analog search scope:** `apps/backend/src/routes/`, `apps/frontend/src/pages/`, `packages/shared/src/schemas/`, `apps/backend/prisma/`, `apps/backend/src/`
**Files scanned:** 11 source files read directly
**Pattern extraction date:** 2026-05-29
