# Phase 2: Deck & Card Management - Pattern Map

**Mapped:** 2026-05-26
**Files analyzed:** 13 new/modified files
**Analogs found:** 11 / 13

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `packages/shared/src/schemas/deck.ts` | schema | CRUD | `packages/shared/src/schemas/auth.ts` | role-match |
| `packages/shared/src/schemas/card.ts` | schema | CRUD | `packages/shared/src/schemas/auth.ts` | role-match |
| `packages/shared/src/index.ts` | config | — | `packages/shared/src/index.ts` (self) | exact |
| `apps/backend/src/routes/decks.ts` | route | CRUD | `apps/backend/src/routes/admin.ts` | exact |
| `apps/backend/src/routes/cards.ts` | route | CRUD | `apps/backend/src/routes/admin.ts` | exact |
| `apps/backend/src/index.ts` | config | — | `apps/backend/src/index.ts` (self) | exact |
| `apps/backend/prisma/schema.prisma` | migration | — | `apps/backend/prisma/schema.prisma` (self) | exact |
| `apps/frontend/src/pages/DecksPage.tsx` | component/page | CRUD | `apps/frontend/src/pages/AdminPage.tsx` | exact |
| `apps/frontend/src/pages/DeckDetailPage.tsx` | component/page | CRUD | `apps/frontend/src/pages/AdminPage.tsx` | exact |
| `apps/frontend/src/components/DeckFormModal.tsx` | component | request-response | `apps/frontend/src/pages/LoginPage.tsx` | role-match |
| `apps/frontend/src/components/CardEditorModal.tsx` | component | request-response | `apps/frontend/src/pages/LoginPage.tsx` | role-match |
| `apps/frontend/src/components/KartexRenderer.tsx` | component | transform | none | no analog |
| `apps/frontend/src/components/ui/dialog.tsx` | ui | — | `apps/frontend/src/components/ui/card.tsx` | partial |
| `apps/frontend/src/components/ui/tabs.tsx` | ui | — | `apps/frontend/src/components/ui/card.tsx` | partial |
| `apps/frontend/src/components/ui/select.tsx` | ui | — | `apps/frontend/src/components/ui/card.tsx` | partial |
| `apps/frontend/src/App.tsx` | config | — | `apps/frontend/src/App.tsx` (self) | exact |

---

## Pattern Assignments

### `packages/shared/src/schemas/deck.ts` (schema, CRUD)

**Analog:** `packages/shared/src/schemas/auth.ts`

**Imports pattern** (auth.ts lines 1):
```typescript
import { z } from 'zod'
```

**Core schema pattern** (auth.ts lines 3-24):
```typescript
// Each schema file exports: input schema, inferred type, optional response schema
export const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.'),
})
export type LoginInput = z.infer<typeof LoginSchema>
```

**Apply to deck.ts — full schema to create:**
```typescript
import { z } from 'zod'

export const CreateDeckSchema = z.object({
  title: z.string().min(1, 'Title is required.').max(200),
  description: z.string().max(2000).optional(),
  visibility: z.enum(['PRIVATE', 'SHARED', 'PUBLIC']).default('PRIVATE'),
})
export type CreateDeckInput = z.infer<typeof CreateDeckSchema>

export const UpdateDeckSchema = CreateDeckSchema.partial()
export type UpdateDeckInput = z.infer<typeof UpdateDeckSchema>

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
```

---

### `packages/shared/src/schemas/card.ts` (schema, CRUD)

**Analog:** `packages/shared/src/schemas/auth.ts`

**Core schema pattern** — same `.partial()` convention as deck.ts:
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
  frontContent: z.string(),
  backContent: z.string(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Card = z.infer<typeof CardSchema>
```

---

### `packages/shared/src/index.ts` (config, barrel export)

**Analog:** `packages/shared/src/index.ts` (self — lines 1-3)

**Current file (lines 1-3):**
```typescript
export * from './schemas/user'
export * from './schemas/auth'
export * from './schemas/inviteCode'
```

**Add two lines:**
```typescript
export * from './schemas/deck'
export * from './schemas/card'
```

---

### `apps/backend/src/routes/decks.ts` (route, CRUD)

**Analog:** `apps/backend/src/routes/admin.ts`

**Imports pattern** (admin.ts lines 1-3, auth.ts lines 1-9):
```typescript
import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'
// Add from auth.ts pattern:
import { CreateDeckSchema, UpdateDeckSchema } from '@kartex/shared'
```

**Router instantiation** (admin.ts line 4):
```typescript
const decks = new Hono()
```

**Auth guard pattern** — authMiddleware is applied globally at `/api/*` in `index.ts` (line 31), so deck routes inherit it automatically. No `decks.use('*', authMiddleware)` needed. However, referencing `c.get('userId')` is safe in all handlers.

**GET list with ownership filter** (admin.ts lines 8-21 as structural analog):
```typescript
decks.get('/', async (c) => {
  const userId = c.get('userId')
  const rows = await prisma.deck.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { cards: true } } },
  })
  return c.json(rows, 200)
})
```

**POST create with Zod safeParse** (auth.ts lines 49-53 pattern):
```typescript
decks.post('/', async (c) => {
  const body = CreateDeckSchema.safeParse(await c.req.json())
  if (!body.success) {
    return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
  }
  const userId = c.get('userId')
  const deck = await prisma.deck.create({
    data: { ...body.data, ownerId: userId },
  })
  return c.json(deck, 201)
})
```

**Ownership check pattern** (admin.ts lines 52-55 structural analog):
```typescript
// Used in GET /:id, PATCH /:id, DELETE /:id
const { id } = c.req.param()
const deck = await prisma.deck.findUnique({ where: { id } })
if (!deck) return c.json({ error: 'Not found.' }, 404)
if (deck.ownerId !== c.get('userId')) return c.json({ error: 'Forbidden.' }, 403)
```

**PATCH update** (admin.ts lines 25-73 as structural analog):
```typescript
decks.patch('/:id', async (c) => {
  const { id } = c.req.param()
  const deck = await prisma.deck.findUnique({ where: { id } })
  if (!deck) return c.json({ error: 'Not found.' }, 404)
  if (deck.ownerId !== c.get('userId')) return c.json({ error: 'Forbidden.' }, 403)

  const body = UpdateDeckSchema.safeParse(await c.req.json())
  if (!body.success) {
    return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
  }
  const updated = await prisma.deck.update({ where: { id }, data: body.data })
  return c.json(updated, 200)
})
```

**DELETE** (admin.ts lines 124-138 as structural analog):
```typescript
decks.delete('/:id', async (c) => {
  const { id } = c.req.param()
  const deck = await prisma.deck.findUnique({ where: { id } })
  if (!deck) return c.json({ error: 'Not found.' }, 404)
  if (deck.ownerId !== c.get('userId')) return c.json({ error: 'Forbidden.' }, 403)
  await prisma.deck.delete({ where: { id } })
  return c.json({ message: 'Deck deleted.' }, 200)
})
```

**Export pattern** (admin.ts line 141):
```typescript
export { decks as decksRouter }
```

---

### `apps/backend/src/routes/cards.ts` (route, CRUD)

**Analog:** `apps/backend/src/routes/admin.ts`

**Sub-router pattern** — cards are mounted as a sub-router on decks so `deckId` is available as a path param. Registration in `decks.ts`: `decks.route('/:deckId/cards', cardsRouter)`.

**Imports:**
```typescript
import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'
import { CreateCardSchema, UpdateCardSchema } from '@kartex/shared'
```

**Ownership guard (shared helper)** — each card handler must verify the parent deck belongs to the authenticated user before operating on cards:
```typescript
// Ownership check — reuse exact pattern from decks.ts
const { deckId } = c.req.param()
const deck = await prisma.deck.findUnique({ where: { id: deckId } })
if (!deck) return c.json({ error: 'Not found.' }, 404)
if (deck.ownerId !== c.get('userId')) return c.json({ error: 'Forbidden.' }, 403)
```

**POST create card** (auth.ts safeParse pattern, lines 49-53):
```typescript
cards.post('/', async (c) => {
  const { deckId } = c.req.param()
  const deck = await prisma.deck.findUnique({ where: { id: deckId } })
  if (!deck) return c.json({ error: 'Not found.' }, 404)
  if (deck.ownerId !== c.get('userId')) return c.json({ error: 'Forbidden.' }, 403)

  const body = CreateCardSchema.safeParse(await c.req.json())
  if (!body.success) {
    return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
  }
  const card = await prisma.card.create({ data: { ...body.data, deckId } })
  return c.json(card, 201)
})
```

**Export pattern:**
```typescript
export { cards as cardsRouter }
```

---

### `apps/backend/src/index.ts` (config, router registration)

**Analog:** `apps/backend/src/index.ts` (self — lines 27-35)

**Current registration block (lines 28-35):**
```typescript
// ─── 3. Auth routes (no JWT required for register/login/logout/refresh) ───────
app.route('/api/auth', authRouter)

// ─── 4. JWT auth middleware on all remaining /api/* routes (INFR-03) ──────────
app.use('/api/*', authMiddleware)

// ─── 5. Admin routes (JWT + ADMIN role required) ──────────────────────────────
app.use('/api/admin/*', requireAdmin)
app.route('/api/admin', adminRouter)
```

**Insert after step 4, before step 5:**
```typescript
// ─── 5. Deck + Card routes (JWT required — inherited from step 4) ─────────────
import { decksRouter } from './routes/decks.js'
app.route('/api/decks', decksRouter)
// Card sub-router is registered inside decksRouter via decks.route('/:deckId/cards', cardsRouter)
```

---

### `apps/backend/prisma/schema.prisma` (migration, cascade deletes)

**Analog:** `apps/backend/prisma/schema.prisma` (self — lines 94-120)

**Current Card model (lines 94-105) — missing `onDelete: Cascade`:**
```prisma
model Card {
  id           String         @id @default(cuid())
  deckId       String
  deck         Deck           @relation(fields: [deckId], references: [id])
  // ^^^ NO onDelete: Cascade — must add
  frontContent String
  backContent  String
  tags         String[]
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  progress CardProgress[]
}
```

**Required change to Card.deck relation:**
```prisma
deck  Deck  @relation(fields: [deckId], references: [id], onDelete: Cascade)
```

**Required change to CardProgress.card relation (lines 113-116):**
```prisma
card  Card  @relation(fields: [cardId], references: [id], onDelete: Cascade)
```

**After schema edit, run:**
```bash
pnpm prisma migrate dev --name add-cascade-deletes
```

---

### `apps/frontend/src/pages/DecksPage.tsx` (component/page, CRUD)

**Analog:** `apps/frontend/src/pages/AdminPage.tsx`

**Imports pattern** (AdminPage.tsx lines 1-23):
```typescript
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { api } from '@/lib/api'
import { Deck } from '@kartex/shared'
// Note: Do NOT declare local interface Deck — import from @kartex/shared
```

**Data fetch pattern** (AdminPage.tsx lines 65-79):
```typescript
const [decks, setDecks] = useState<Deck[]>([])

const fetchDecks = async () => {
  try {
    const res = await api.get('/api/decks')
    if (res.ok) {
      const data = await res.json()
      setDecks(data)
    }
  } catch {
    // silently ignore fetch errors on load
  }
}

useEffect(() => {
  void fetchDecks()
}, [])
```

**CRUD mutation pattern** (AdminPage.tsx lines 81-95):
```typescript
const handleCreate = async (data: CreateDeckInput) => {
  try {
    const res = await api.post('/api/decks', data)
    if (res.ok) {
      toast.success('Deck created')
      await fetchDecks()
    } else {
      toast.error('Something went wrong. Please try again.')
    }
  } catch {
    toast.error('Something went wrong. Please try again.')
  }
}
```

**Delete with inline confirm pattern** (AdminPage.tsx lines 98-111 and 183-218):
```typescript
// Two-step confirm: first click sets confirmDeleteId, second click calls handleDelete
const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

const handleDelete = async (id: string) => {
  try {
    const res = await api.delete(`/api/decks/${id}`)
    if (res.ok) {
      toast.success('Deck deleted')
      setDecks((prev) => prev.filter((d) => d.id !== id))
      setConfirmDeleteId(null)
    } else {
      toast.error('Something went wrong. Please try again.')
    }
  } catch {
    toast.error('Something went wrong. Please try again.')
  }
}
```

**Badge pattern for visibility** (AdminPage.tsx lines 385-435 — inline badge spans):
```typescript
// Reuse exact badge pattern from AdminPage.tsx with Tailwind classes:
function VisibilityBadge({ visibility }: { visibility: 'PRIVATE' | 'SHARED' | 'PUBLIC' }) {
  if (visibility === 'PUBLIC') {
    return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">Public</span>
  }
  if (visibility === 'SHARED') {
    return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">Shared</span>
  }
  return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">Private</span>
}
```

**Empty state pattern** (AdminPage.tsx lines 165-170):
```typescript
// Empty state inside Table or grid — reuse TableCell colSpan pattern:
{decks.length === 0 && (
  <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
    <BookOpen className="h-10 w-10" aria-hidden="true" />
    <p className="text-sm">No decks yet. Create your first deck above.</p>
  </div>
)}
```

**Page title pattern** (AdminPage.tsx lines 439-441):
```typescript
useEffect(() => {
  document.title = 'Decks — Kartex'
}, [])
```

---

### `apps/frontend/src/pages/DeckDetailPage.tsx` (component/page, CRUD)

**Analog:** `apps/frontend/src/pages/AdminPage.tsx`

**useParams for route ID** — AdminPage has no param, so use react-router pattern from App.tsx:
```typescript
import { useParams } from 'react-router-dom'
const { id: deckId } = useParams<{ id: string }>()
```

**Dual fetch pattern** (AdminPage.tsx data fetch pattern applied twice):
```typescript
const [deck, setDeck] = useState<Deck | null>(null)
const [cards, setCards] = useState<Card[]>([])

const fetchDeck = async () => {
  const res = await api.get(`/api/decks/${deckId}`)
  if (res.ok) setDeck(await res.json())
}

const fetchCards = async () => {
  const res = await api.get(`/api/decks/${deckId}/cards`)
  if (res.ok) setCards(await res.json())
}

useEffect(() => {
  void fetchDeck()
  void fetchCards()
}, [deckId])
```

**Card table pattern** (AdminPage.tsx lines 154-222 — shadcn Table with TableHeader/TableBody):
```typescript
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

// Columns: row number, front content (truncated), tag chips, Edit/Delete actions
<Table aria-label="Cards in deck">
  <TableHeader>
    <TableRow>
      <TableHead>#</TableHead>
      <TableHead>Front</TableHead>
      <TableHead>Tags</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {cards.length === 0 && (
      <TableRow>
        <TableCell colSpan={4} className="text-center text-muted-foreground">
          No cards yet.
        </TableCell>
      </TableRow>
    )}
    {cards.map((card, i) => (
      <TableRow key={card.id}>
        <TableCell>{i + 1}</TableCell>
        <TableCell className="max-w-xs truncate">{card.frontContent}</TableCell>
        <TableCell>
          {card.tags.map(tag => (
            <span key={tag} className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground mr-1">{tag}</span>
          ))}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => openEditModal(card)}>Edit</Button>
            <Button size="sm" variant="destructive" onClick={() => handleDeleteCard(card.id)}>Delete</Button>
          </div>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

### `apps/frontend/src/components/DeckFormModal.tsx` (component, request-response)

**Analog:** `apps/frontend/src/pages/LoginPage.tsx`

**Imports pattern** (LoginPage.tsx lines 1-29):
```typescript
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { CreateDeckInput, CreateDeckSchema } from '@kartex/shared'
import { Button } from '@/components/ui/button'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
// Plus new shadcn components added in this phase:
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
```

**react-hook-form + Zod resolver pattern** (LoginPage.tsx lines 57-62):
```typescript
const form = useForm<CreateDeckInput>({
  resolver: zodResolver(CreateDeckSchema),
  defaultValues: { title: '', description: '', visibility: 'PRIVATE' },
})
const { isSubmitting } = form.formState
```

**FormField pattern** (LoginPage.tsx lines 95-111):
```typescript
<FormField
  control={form.control}
  name="title"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Title</FormLabel>
      <FormControl>
        <Input placeholder="Deck title" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Submit with loading state** (LoginPage.tsx lines 132-143):
```typescript
<Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
  {isSubmitting ? 'Saving...' : 'Save Deck'}
</Button>
```

**Edit mode pattern** — DeckFormModal receives optional `deck` prop; when present, use `UpdateDeckSchema` and `api.patch`:
```typescript
interface DeckFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deck?: Deck  // undefined = create, defined = edit
  onSuccess: () => void
}
```

---

### `apps/frontend/src/components/CardEditorModal.tsx` (component, request-response)

**Analog:** `apps/frontend/src/pages/LoginPage.tsx` (form pattern) + no analog for tab structure

**Imports:**
```typescript
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { CreateCardInput, CreateCardSchema } from '@kartex/shared'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { KartexRenderer } from '@/components/KartexRenderer'
// Form components as in LoginPage.tsx
```

**Form setup** (LoginPage.tsx pattern):
```typescript
const form = useForm<CreateCardInput>({
  resolver: zodResolver(CreateCardSchema),
  defaultValues: { frontContent: '', backContent: '', tags: [] },
})
```

**Tag input serialization** — Claude's discretion (comma-separated input):
```typescript
// In submit handler, before api call:
const tagString = form.watch('tagInput') // local uncontrolled field
const tags = tagString.split(',').map((t: string) => t.trim()).filter(Boolean)
// Pass tags array to api, not tagString
```

**Edit/Preview tab structure** (no existing analog — new pattern for this phase):
```typescript
<Tabs defaultValue="edit">
  <TabsList>
    <TabsTrigger value="edit">Edit</TabsTrigger>
    <TabsTrigger value="preview">Preview</TabsTrigger>
  </TabsList>
  <TabsContent value="edit">
    <Textarea {...field} rows={6} />
  </TabsContent>
  <TabsContent value="preview">
    <KartexRenderer content={field.value} />
  </TabsContent>
</Tabs>
```

---

### `apps/frontend/src/components/KartexRenderer.tsx` (component, transform)

**Analog:** None — first render component in the project.

**Use RESEARCH.md pattern directly:**
```typescript
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface KartexRendererProps {
  content: string
}

export function KartexRenderer({ content }: KartexRendererProps) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
```

**Phase 3 extension point:** The `components` prop on `<ReactMarkdown>` is where KaTeX and Typst renderers will be injected. The external interface (`content: string` prop) must not change.

---

### `apps/frontend/src/components/ui/dialog.tsx`, `tabs.tsx`, `select.tsx` (ui, shadcn)

**Analog:** `apps/frontend/src/components/ui/card.tsx`

**Shadcn component pattern** (card.tsx lines 1-76):
```typescript
import * as React from 'react'
import { cn } from '@/lib/utils'
// Radix UI primitive import (not present in card.tsx — card is pure HTML)
// For dialog/tabs/select, add:
import * as DialogPrimitive from '@radix-ui/react-dialog'
```

**cn() utility usage** (card.tsx lines 8-16):
```typescript
className={cn(
  'rounded-lg border bg-card text-card-foreground shadow-sm',
  className,
)}
```

**Pattern:** All three components are standard shadcn copy-paste components. Copy verbatim from https://ui.shadcn.com/docs/components/dialog, /tabs, /select. The only adjustment needed: ensure `cn` is imported from `@/lib/utils` (matching the project path alias already used in card.tsx).

---

### `apps/frontend/src/App.tsx` (config, route registration)

**Analog:** `apps/frontend/src/App.tsx` (self — lines 36-48)

**Current route block (lines 36-48):**
```typescript
<Route element={<ProtectedRoute />}>
  <Route element={<AppShell />}>
    <Route path="/dashboard" element={<ComingSoon title="Dashboard" />} />
    <Route path="/decks" element={<ComingSoon title="Decks" />} />
    ...
  </Route>
</Route>
```

**Replace /decks ComingSoon and add /decks/:id:**
```typescript
import { DecksPage } from '@/pages/DecksPage'
import { DeckDetailPage } from '@/pages/DeckDetailPage'

// Inside <Route element={<AppShell />}>:
<Route path="/decks" element={<DecksPage />} />
<Route path="/decks/:id" element={<DeckDetailPage />} />
```

---

## Shared Patterns

### Authentication / Authorization
**Source:** `apps/backend/src/index.ts` line 31 + `apps/backend/src/middleware/auth.ts`
**Apply to:** All backend route handlers in `decks.ts` and `cards.ts`

```typescript
// Global middleware in index.ts already covers all /api/* routes:
app.use('/api/*', authMiddleware)

// In any handler, retrieve the authenticated user's ID:
const userId = c.get('userId')  // type-safe via ContextVariableMap declaration in auth.ts
```

No per-router `authMiddleware` application needed in deck/card routers — it is inherited from `index.ts` step 4.

### Ownership Check (IDOR prevention)
**Source:** `apps/backend/src/routes/admin.ts` lines 52-55 (structural analog) + RESEARCH.md Pattern 2
**Apply to:** GET /api/decks/:id, PATCH /api/decks/:id, DELETE /api/decks/:id, and all card routes

```typescript
const deck = await prisma.deck.findUnique({ where: { id } })
if (!deck) return c.json({ error: 'Not found.' }, 404)
if (deck.ownerId !== c.get('userId')) return c.json({ error: 'Forbidden.' }, 403)
```

### Zod Validation (safeParse)
**Source:** `apps/backend/src/routes/auth.ts` lines 50-53
**Apply to:** All POST and PATCH handlers in decks.ts and cards.ts

```typescript
const body = SomeSchema.safeParse(await c.req.json())
if (!body.success) {
  return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
}
```

### API Wrapper (frontend fetch)
**Source:** `apps/frontend/src/lib/api.ts` lines 64-88
**Apply to:** All data-fetching code in DecksPage.tsx, DeckDetailPage.tsx, DeckFormModal.tsx, CardEditorModal.tsx

```typescript
// ALWAYS use api.get/post/patch/delete — never raw fetch()
const res = await api.get('/api/decks')
const res = await api.post('/api/decks', body)
const res = await api.patch(`/api/decks/${id}`, body)
const res = await api.delete(`/api/decks/${id}`)
```

### Toast Notifications (Sonner)
**Source:** `apps/frontend/src/pages/AdminPage.tsx` lines 85-95
**Apply to:** All CRUD mutation handlers in frontend components

```typescript
import { toast } from 'sonner'

// Success:
toast.success('Deck created')
toast.success('Card deleted')

// Error (generic — never leak backend details):
toast.error('Something went wrong. Please try again.')
```

### Badge Inline Span (status indicators)
**Source:** `apps/frontend/src/pages/AdminPage.tsx` lines 385-435
**Apply to:** VisibilityBadge in DecksPage.tsx and tag chips in DeckDetailPage.tsx

```typescript
// Pattern: inline-flex rounded-full px-2 py-0.5 text-xs font-medium + semantic color classes
<span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
  Label
</span>
```

### react-hook-form + Zod Resolver
**Source:** `apps/frontend/src/pages/LoginPage.tsx` lines 57-62
**Apply to:** DeckFormModal.tsx, CardEditorModal.tsx

```typescript
const form = useForm<SchemaInput>({
  resolver: zodResolver(Schema),
  defaultValues: { ... },
})
const { isSubmitting } = form.formState
```

### Prisma Client Singleton
**Source:** `apps/backend/src/lib/prisma.ts` (referenced in all route files)
**Apply to:** decks.ts, cards.ts

```typescript
import { prisma } from '../lib/prisma.js'
// Note the .js extension — required for ESM in this project (see auth.ts, admin.ts imports)
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `apps/frontend/src/components/KartexRenderer.tsx` | component | transform | No render/transform components exist yet — first content renderer in the project. Use RESEARCH.md Pattern 5 directly. |
| `apps/frontend/src/components/ui/dialog.tsx` | ui | — | No modal/overlay components exist. Copy from ui.shadcn.com/docs/components/dialog. Adjust `cn` import path to `@/lib/utils`. |
| `apps/frontend/src/components/ui/tabs.tsx` | ui | — | No tab components exist. Copy from ui.shadcn.com/docs/components/tabs. |
| `apps/frontend/src/components/ui/select.tsx` | ui | — | No select components exist. Copy from ui.shadcn.com/docs/components/select. |

---

## Critical Notes for Planner

1. **Wave 0 — install packages first.** `react-markdown`, `remark-gfm`, `@radix-ui/react-dialog`, `@radix-ui/react-tabs`, `@radix-ui/react-select` must be installed in `apps/frontend` before any component code references them. Run: `pnpm add react-markdown remark-gfm @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-select` from `apps/frontend`.

2. **Wave 0 — add shadcn ui components.** `dialog.tsx`, `tabs.tsx`, `select.tsx` must exist in `apps/frontend/src/components/ui/` before `CardEditorModal.tsx` or `DeckFormModal.tsx` are written.

3. **Wave 0 — Prisma cascade migration required.** The `Card.deck` relation lacks `onDelete: Cascade`. Add it and run `pnpm prisma migrate dev --name add-cascade-deletes` before writing delete route handlers.

4. **Import extension rule.** All backend imports use `.js` extension (ESM): `from '../lib/prisma.js'`, `from '../middleware/auth.js'`. Follow exactly as seen in `auth.ts` and `admin.ts`.

5. **Types from @kartex/shared only.** Never declare local `interface Deck` or `interface Card` in page files. AdminPage.tsx currently does declare local types — for Phase 2 this anti-pattern must not be repeated. All types come from `@kartex/shared`.

6. **Package manager.** The repo root has `yarn.lock` (referenced in index.ts comment: "Start the frontend with: yarn dev:frontend"). RESEARCH.md notes a pnpm/yarn discrepancy. Planner should verify actual lock file at repo root before specifying install commands.

---

## Metadata

**Analog search scope:** `apps/backend/src/routes/`, `apps/backend/src/middleware/`, `apps/frontend/src/pages/`, `apps/frontend/src/components/ui/`, `apps/frontend/src/lib/`, `packages/shared/src/schemas/`
**Files scanned:** 12 source files read directly
**Pattern extraction date:** 2026-05-26
