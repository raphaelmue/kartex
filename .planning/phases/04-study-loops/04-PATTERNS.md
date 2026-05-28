# Phase 4: Study Loops - Pattern Map

**Mapped:** 2026-05-28
**Files analyzed:** 14 (11 new, 3 modified)
**Analogs found:** 14 / 14

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/shared/src/schemas/study.ts` | schema | transform | `packages/shared/src/schemas/card.ts` | exact |
| `packages/shared/src/index.ts` (modify) | config | — | `packages/shared/src/index.ts` | exact |
| `apps/backend/src/lib/sm2.ts` | utility | transform | `apps/backend/src/lib/prisma.ts` (structure) | role-match |
| `apps/backend/src/routes/study.ts` | route | request-response | `apps/backend/src/routes/cards.ts` | exact |
| `apps/backend/src/routes/dashboard.ts` | route | request-response | `apps/backend/src/routes/decks.ts` | exact |
| `apps/backend/src/index.ts` (modify) | config | — | `apps/backend/src/index.ts` | exact |
| `apps/frontend/src/pages/DashboardPage.tsx` | page | request-response | `apps/frontend/src/pages/DecksPage.tsx` | exact |
| `apps/frontend/src/pages/StudySessionPage.tsx` | page | event-driven | `apps/frontend/src/pages/DeckDetailPage.tsx` | role-match |
| `apps/frontend/src/hooks/useStudySession.ts` | hook | event-driven | `apps/frontend/src/context/AuthContext.tsx` | role-match |
| `apps/frontend/src/components/CardFlip.tsx` | component | event-driven | `apps/frontend/src/components/KartexRenderer.tsx` | role-match |
| `apps/frontend/src/components/RatingButtons.tsx` | component | event-driven | `apps/frontend/src/components/KartexRenderer.tsx` | partial |
| `apps/frontend/src/components/ExamTimer.tsx` | component | event-driven | `apps/frontend/src/context/AuthContext.tsx` (useEffect) | partial |
| `apps/frontend/src/components/SessionProgress.tsx` | component | transform | `apps/frontend/src/pages/DecksPage.tsx` | partial |
| `apps/frontend/src/App.tsx` (modify) | config | — | `apps/frontend/src/App.tsx` | exact |

---

## Pattern Assignments

### `packages/shared/src/schemas/study.ts` (schema, transform)

**Analog:** `packages/shared/src/schemas/card.ts`

**Imports pattern** (card.ts lines 1):
```typescript
import { z } from 'zod'
```

**Core schema pattern** (card.ts lines 3-22):
```typescript
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

**Pattern to copy:** Every schema block exports: (1) a named `XSchema`, (2) a `type X = z.infer<typeof XSchema>`. No default exports. Always `export const` + `export type`. Use `z.literal()` unions for discriminated values (e.g., rating 1|2|3|4).

**Apply to study.ts:** Follow this exact pattern for `RatingSchema`, `RateCardSchema`, `RateCardResponseSchema`, `DueCardSchema`, `DashboardStatsSchema`.

---

### `packages/shared/src/index.ts` (modify — add export)

**Analog:** `packages/shared/src/index.ts` (lines 1-6)

**Current pattern** (lines 1-6):
```typescript
export * from './schemas/user'
export * from './schemas/auth'
export * from './schemas/inviteCode'
export * from './schemas/deck'
export * from './schemas/card'
export * from './schemas/media'
```

**Modification:** Append one line at end:
```typescript
export * from './schemas/study'
```

**Pattern rule:** One `export *` barrel export per schema file, in order of addition. No named re-exports.

---

### `apps/backend/src/lib/sm2.ts` (utility, transform)

**Analog:** `apps/backend/src/lib/prisma.ts` (structure)

**Lib file structure** (prisma.ts lines 1-11):
```typescript
import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

export const prisma = global.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}
```

**Pattern to copy:** Lib files in `apps/backend/src/lib/` are thin modules with named exports only. No default exports. No framework imports (no Hono). Pure TypeScript with typed interfaces.

**Apply to sm2.ts:** Export `SM2Input` interface, `SM2Output` interface, `RATING_TO_QUALITY` const, and `calculateSM2` function. All named exports. No side effects at module level.

---

### `apps/backend/src/routes/study.ts` (route, request-response)

**Analog:** `apps/backend/src/routes/cards.ts`

**Imports pattern** (cards.ts lines 1-3):
```typescript
import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'
import { CreateCardSchema, UpdateCardSchema } from '@kartex/shared'
```

**Router instantiation pattern** (cards.ts line 5):
```typescript
const cards = new Hono<{ Variables: { userId: string } }>()
```

**Auth — userId extraction** (cards.ts line 9, 12):
```typescript
const deckId = c.req.param('deckId') as string
if (deck.ownerId !== c.get('userId')) return c.json({ error: 'Forbidden.' }, 403)
```

**Validation pattern** (cards.ts lines 26-29):
```typescript
const body = CreateCardSchema.safeParse(await c.req.json())
if (!body.success) {
  return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
}
```

**Not-found pattern** (cards.ts lines 10-11):
```typescript
const deck = await prisma.deck.findUnique({ where: { id: deckId } })
if (!deck) return c.json({ error: 'Not found.' }, 404)
```

**Success response pattern** (cards.ts lines 17, 31, 48, 61):
```typescript
return c.json(rows, 200)      // GET list
return c.json(card, 201)      // POST create
return c.json(updated, 200)   // PATCH update
return c.json({ message: 'Card deleted.' }, 200)  // DELETE
```

**Export pattern** (cards.ts line 64):
```typescript
export { cards as cardsRouter }
```

**Apply to study.ts:**
- `const study = new Hono<{ Variables: { userId: string } }>()`
- Import `RateCardSchema` from `@kartex/shared`
- Import `calculateSM2, RATING_TO_QUALITY` from `'../lib/sm2.js'`
- Three handlers: `study.get('/due', ...)`, `study.get('/deck/:deckId', ...)`, `study.post('/rate', ...)`
- Ownership check in POST /rate: verify `card.deck.ownerId === userId` before upserting
- Export: `export { study as studyRouter }`

---

### `apps/backend/src/routes/dashboard.ts` (route, request-response)

**Analog:** `apps/backend/src/routes/decks.ts`

**Imports pattern** (decks.ts lines 1-4):
```typescript
import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'
import { CreateDeckSchema, UpdateDeckSchema } from '@kartex/shared'
import { cardsRouter } from './cards.js'
```

**GET with aggregate** (decks.ts lines 12-19):
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

**Apply to dashboard.ts:**
- Single `dashboard.get('/stats', ...)` handler
- `const userId = c.get('userId')` — same extraction pattern
- Import `DashboardStatsSchema` from `@kartex/shared` for response typing
- Export: `export { dashboard as dashboardRouter }`

---

### `apps/backend/src/index.ts` (modify — add route registrations)

**Analog:** `apps/backend/src/index.ts` (lines 40-44)

**Current registration pattern** (lines 40-44):
```typescript
// ─── 5. Deck + Card routes (JWT required — inherited from step 4) ─────────────
app.route('/api/decks', decksRouter)

// ─── 5b. Media protected route (POST /upload — auth required) ────────────────
app.route('/api/media', mediaRouter)
```

**Import pattern** (lines 7-11):
```typescript
import { authMiddleware, requireAdmin } from './middleware/auth.js'
import { authRouter } from './routes/auth.js'
import { adminRouter } from './routes/admin.js'
import { decksRouter } from './routes/decks.js'
import { mediaRouter, mediaPublicRouter } from './routes/media.js'
```

**Modification — add these two lines:**

Add to imports block (after line 10):
```typescript
import { studyRouter } from './routes/study.js'
import { dashboardRouter } from './routes/dashboard.js'
```

Add to route registrations block (after line 41, `app.route('/api/decks', decksRouter)`):
```typescript
// ─── 5c. Study + Dashboard routes (JWT required) ─────────────────────────────
app.route('/api/study', studyRouter)
app.route('/api/dashboard', dashboardRouter)
```

**Pattern rule:** All JWT-protected routes live between line 38 (`app.use('/api/*', authMiddleware)`) and the admin routes block (line 47). Section header comments use the `─── N. Title ───` format.

---

### `apps/frontend/src/pages/DashboardPage.tsx` (page, request-response)

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
```

**Data fetching pattern** (DecksPage.tsx lines 50-58):
```typescript
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

**Document title pattern** (DecksPage.tsx lines 46-48):
```typescript
useEffect(() => {
  document.title = 'Decks — Kartex'
}, [])
```

**Empty state pattern** (DecksPage.tsx lines 96-103):
```typescript
{decks.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
    <BookOpen className="h-10 w-10" aria-hidden="true" />
    <p className="text-sm font-bold">No decks yet</p>
    <p className="text-sm">Create your first deck to start organizing your flashcards.</p>
    <Button onClick={openCreate}>New Deck</Button>
  </div>
) : (
```

**Table usage** (DeckDetailPage.tsx lines 9-15, 192-213):
```typescript
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

<Table aria-label="Cards in deck">
  <TableHeader>
    <TableRow>
      <TableHead className="w-12">#</TableHead>
      <TableHead>Front</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {cards.length === 0 && (
      <TableRow>
        <TableCell colSpan={4}>...</TableCell>
      </TableRow>
    )}
  </TableBody>
</Table>
```

**Apply to DashboardPage.tsx:**
- Named export: `export function DashboardPage()`
- `document.title = 'Dashboard — Kartex'` in `useEffect([], [])`
- `api.get('/api/dashboard/stats')` with same try/catch + toast.error pattern
- D-07 hero: large number heading + full-width "Start Studying" `<Button size="lg">` navigating to `/study`
- D-07 per-deck table: `<Table>` with deck name + count columns (same import path as DeckDetailPage)
- D-08 stat chips: two `border rounded-lg p-4` divs in a `flex gap-4 mt-6` container
- D-07 empty state: "All caught up!" message when `stats.totalDue === 0` (no Start Studying button)

---

### `apps/frontend/src/pages/StudySessionPage.tsx` (page, event-driven)

**Analog:** `apps/frontend/src/pages/DeckDetailPage.tsx`

**Params + navigate pattern** (DeckDetailPage.tsx lines 62-64):
```typescript
const { id: deckId } = useParams<{ id: string }>()
const navigate = useNavigate()
const [deck, setDeck] = useState<Deck | null>(null)
```

**useEffect data loading pattern** (DeckDetailPage.tsx lines 99-103):
```typescript
useEffect(() => {
  void fetchDeck()
  void fetchCards()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch fns are component-scoped; deckId is the only meaningful dep
}, [deckId])
```

**Guard render pattern** (DeckDetailPage.tsx line 146):
```typescript
if (!deck) return null
```

**Apply to StudySessionPage.tsx:**
- Named export: `export function StudySessionPage()`
- `const { id: deckId } = useParams<{ id: string }>()` + `const navigate = useNavigate()`
- Mode selector rendered before session starts (full-page, not modal — per Claude's Discretion)
- Session loop delegates to `useStudySession` hook
- Renders `<CardFlip>`, `<RatingButtons>`, `<ExamTimer>` (exam mode), `<SessionProgress>` as sub-components
- On session DONE: render completion screen with summary counts + "Return to Dashboard" button calling `navigate('/dashboard')`

---

### `apps/frontend/src/hooks/useStudySession.ts` (hook, event-driven)

**Analog:** `apps/frontend/src/context/AuthContext.tsx`

**Hook state initialization pattern** (AuthContext.tsx lines 24-27):
```typescript
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
```

**useEffect with cleanup pattern** (AuthContext.tsx lines 29-55):
```typescript
useEffect(() => {
  setAuthFailureHandler(() => {
    setUser(null)
    navigate('/login')
    toast.error('Your session has expired. Please sign in again.')
  })

  api
    .get('/api/auth/me')
    .then(async (res) => {
      if (res.ok) {
        const data = await res.json()
        setUser(data)
      } else {
        setUser(null)
      }
    })
    .catch(() => {
      setUser(null)
    })
    .finally(() => {
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

**api call pattern** (AuthContext.tsx lines 57-65):
```typescript
const logout = async () => {
  try {
    await api.post('/api/auth/logout')
  } catch {
    // Fail-open: even if request fails, clear state and navigate
  } finally {
    setUser(null)
    navigate('/login')
  }
}
```

**Apply to useStudySession.ts:**
- Named export: `export function useStudySession(cards: DueCard[], mode: StudyMode)`
- State: `currentIndex`, `face` ('front'|'back'), `isFlipping`, `sessionDone`, `ratedCount`, `againCount`
- `flip()` callback: guard `face !== 'front' || isFlipping`, then `setTimeout(() => setFace('back'), 150)`
- `rate(rating: 1|2|3|4)` callback: if mode !== 'exam', call `api.post('/api/study/rate', { cardId, rating })` then advance index
- keyboard `useEffect` on `window` with cleanup: Space→flip, 1-4→rate (only when `face === 'back'`)
- Return: `{ currentCard, face, flip, rate, isFlipping, sessionDone, progress }` — hook returns, component renders

---

### `apps/frontend/src/components/CardFlip.tsx` (component, event-driven)

**Analog:** `apps/frontend/src/components/KartexRenderer.tsx`

**Component interface pattern** (KartexRenderer.tsx lines 10-12):
```typescript
interface KartexRendererProps {
  content: string
}
```

**Export pattern** (KartexRenderer.tsx line 299):
```typescript
export function KartexRenderer({ content }: KartexRendererProps) {
```

**Tailwind className composition** (KartexRenderer.tsx line 301):
```typescript
<div className="prose prose-sm max-w-none dark:prose-invert">
```

**KartexRenderer usage** (KartexRenderer.tsx line 299-316 — the component itself is the pattern):
```typescript
// Pass card.frontContent / card.backContent directly:
<KartexRenderer content={card.frontContent} />
<KartexRenderer content={card.backContent} />
```

**Apply to CardFlip.tsx:**
- Interface: `CardFlipProps { card: DueCard; isFlipped: boolean; onClick: () => void }`
- Outer wrapper: `<div style={{ perspective: '1000px' }}>` — no `overflow: hidden` on this wrapper (Pitfall 3)
- Inner flip div: Tailwind arbitrary values `[transform-style:preserve-3d]`, `[transform:rotateY(180deg)]` when `isFlipped`
- Front face: `[backface-visibility:hidden]` + inline style `{ WebkitBackfaceVisibility: 'hidden' }` (Pitfall 2)
- Back face: same `backface-visibility` + `[transform:rotateY(180deg)]` on the face itself
- Both faces render `<KartexRenderer content={...} />` — import from `@/components/KartexRenderer`
- Rating buttons slot: rendered inside back face div, conditionally by `isFlipped` prop
- `onClick` on the outer card wrapper triggers flip — entire card body is the click target (D-01)

---

### `apps/frontend/src/components/RatingButtons.tsx` (component, event-driven)

**Analog:** `apps/frontend/src/components/ui/button.tsx` (Button primitive usage)

**Button import pattern** (DecksPage.tsx line 7):
```typescript
import { Button } from '@/components/ui/button'
```

**Button variant usage** (DecksPage.tsx lines 123-128):
```typescript
<Button size="sm" variant="outline" asChild>
  <Link to={`/decks/${deck.id}`}>Open</Link>
</Button>
<Button size="sm" variant="outline" onClick={() => openEdit(deck)}>
  Edit
</Button>
```

**Destructive variant** (DecksPage.tsx lines 135-140):
```typescript
<Button
  size="sm"
  variant="destructive"
  onClick={() => void handleDelete(deck.id)}
>
  Yes, delete
</Button>
```

**Apply to RatingButtons.tsx:**
- Interface: `RatingButtonsProps { onRate: (rating: 1|2|3|4) => void; disabled?: boolean }`
- Four `<Button>` elements in a `flex gap-2` row
- Color overrides via `className` on each Button (D-04):
  - Again (1): `bg-red-500 hover:bg-red-600 text-white`
  - Hard (2): `bg-orange-500 hover:bg-orange-600 text-white`
  - Good (3): `bg-green-500 hover:bg-green-600 text-white`
  - Easy (4): `bg-blue-500 hover:bg-blue-600 text-white`
- Label text includes keyboard hint (D-03): `"Again (1)"`, `"Hard (2)"`, `"Good (3)"`, `"Easy (4)"`
- `disabled` prop passed through — disable all buttons while `isFlipping` is true

---

### `apps/frontend/src/components/ExamTimer.tsx` (component, event-driven)

**Analog:** `apps/frontend/src/context/AuthContext.tsx` (useEffect lifecycle pattern)

**useEffect with cleanup** (AuthContext.tsx lines 29-55 — same pattern as above):
- Return a cleanup function to cancel the interval on unmount (Pitfall 4)

**Apply to ExamTimer.tsx:**
- Interface: `ExamTimerProps { durationSeconds: number; onExpire: () => void }`
- `const [secondsLeft, setSecondsLeft] = useState(durationSeconds)`
- `const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)`
- `useEffect` starts `setInterval` updating `secondsLeft` via functional updater `prev => prev - 1`
- When `prev <= 1`: call `clearInterval`, call `onExpire()`, return 0
- Cleanup: `return () => { if (timerRef.current) clearInterval(timerRef.current) }`
- Render: lucide `Timer` icon + `MM:SS` formatted display
- D-05: when expired, caller (`StudySessionPage`) shows "time's up" banner but does not force-navigate until current card is rated

---

### `apps/frontend/src/components/SessionProgress.tsx` (component, transform)

**Analog:** `apps/frontend/src/pages/DecksPage.tsx` (stat display pattern)

**Inline stat display** (DecksPage.tsx lines 117-120):
```typescript
<p className="text-sm text-muted-foreground">
  {deck._count?.cards ?? 0}{' '}
  {deck._count?.cards === 1 ? 'card' : 'cards'}
</p>
```

**Apply to SessionProgress.tsx:**
- Interface: `SessionProgressProps { current: number; total: number }`
- Render: progress text `"{current} / {total}"` + a `<progress>` element or a `<div>` with width percentage
- Keep minimal — a single line display above the card flip area

---

### `apps/frontend/src/App.tsx` (modify — add routes)

**Analog:** `apps/frontend/src/App.tsx` (lines 61-95 — current route structure)

**Protected route pattern** (App.tsx lines 69-88):
```typescript
<Route element={<ProtectedRoute />}>
  <Route element={<AppShell />}>
    <Route path="/dashboard" element={<ComingSoon title="Dashboard" />} />
    <Route path="/decks" element={<DecksPage />} />
    <Route path="/decks/:id" element={<DeckDetailPage />} />
    <Route path="/import" element={<ComingSoon title="Import" />} />
    <Route path="/explore" element={<ComingSoon title="Explore" />} />
    <Route path="/settings" element={<ComingSoon title="Settings" />} />
    <Route
      path="/admin"
      element={
        <AdminRoute>
          <AdminPage />
        </AdminRoute>
      }
    />
  </Route>
</Route>
```

**Import pattern** (App.tsx lines 9-13):
```typescript
import { AdminPage } from '@/pages/AdminPage'
import { DeckDetailPage } from '@/pages/DeckDetailPage'
import { DecksPage } from '@/pages/DecksPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
```

**Modifications:**

Add to imports block (after existing page imports):
```typescript
import { DashboardPage } from '@/pages/DashboardPage'
import { StudySessionPage } from '@/pages/StudySessionPage'
```

Replace ComingSoon dashboard placeholder (line 71):
```typescript
// Before:
<Route path="/dashboard" element={<ComingSoon title="Dashboard" />} />
// After:
<Route path="/dashboard" element={<DashboardPage />} />
```

Add new routes (after `/decks/:id` route, line 73):
```typescript
<Route path="/decks/:id/learn" element={<StudySessionPage />} />
<Route path="/study" element={<StudySessionPage />} />
```

**Note:** `/study` is the global SR mode route (open question resolved per RESEARCH.md recommendation). `/decks/:id/learn` is deck-specific (Deck Mode + Exam Mode). `StudySessionPage` detects mode from URL params + state.

---

## Shared Patterns

### Authentication (userId extraction)

**Source:** `apps/backend/src/routes/cards.ts` line 12 + `apps/backend/src/middleware/auth.ts` line 25

**Apply to:** `study.ts`, `dashboard.ts` — all route handlers

```typescript
// middleware sets it (auth.ts line 25):
c.set('userId', payload.sub as string)

// handlers read it (cards.ts pattern):
const userId = c.get('userId')
```

Auth is already applied globally via `app.use('/api/*', authMiddleware)` in `index.ts` line 38. New routers registered after line 38 inherit it automatically. **Do not re-apply `authMiddleware` inside the router files.**

### Ownership / Authorization check

**Source:** `apps/backend/src/routes/cards.ts` lines 10-12

**Apply to:** `POST /api/study/rate` — must verify card belongs to the authenticated user's deck

```typescript
const deck = await prisma.deck.findUnique({ where: { id: deckId } })
if (!deck) return c.json({ error: 'Not found.' }, 404)
if (deck.ownerId !== c.get('userId')) return c.json({ error: 'Forbidden.' }, 403)
```

For `/api/study/rate`, the check is: fetch `card` with `include: { deck: true }`, then `if (card.deck.ownerId !== userId) return c.json({ error: 'Forbidden.' }, 403)`.

### Zod Validation

**Source:** `apps/backend/src/routes/cards.ts` lines 26-29

**Apply to:** `POST /api/study/rate` handler in `study.ts`

```typescript
const body = RateCardSchema.safeParse(await c.req.json())
if (!body.success) {
  return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
}
```

### API Fetch (frontend)

**Source:** `apps/frontend/src/lib/api.ts` lines 64-88

**Apply to:** All fetch calls in `DashboardPage.tsx`, `StudySessionPage.tsx`, `useStudySession.ts`

```typescript
// GET:
const res = await api.get('/api/dashboard/stats')
if (res.ok) setStats(await res.json())
else toast.error('Failed to load stats. Please try again.')

// POST with body:
const res = await api.post('/api/study/rate', { cardId, rating })
```

Never use `fetch()` directly. Always use `api.get/post/patch/delete` — it handles `credentials: 'include'` and silent token refresh automatically.

### Toast Notifications (frontend)

**Source:** `apps/frontend/src/pages/DecksPage.tsx` lines 4, 54-57

**Apply to:** `DashboardPage.tsx`, `StudySessionPage.tsx`, `useStudySession.ts`

```typescript
import { toast } from 'sonner'

// Error:
toast.error('Failed to load. Please try again.')
// Success:
toast.success('Session complete!')
```

### Component Named Export

**Source:** `apps/frontend/src/pages/DecksPage.tsx` line 40, `apps/frontend/src/components/KartexRenderer.tsx` line 299

**Apply to:** All new page and component files

```typescript
// Pages:
export function DecksPage() { ... }
// Components:
export function KartexRenderer({ content }: KartexRendererProps) { ... }
```

No default exports anywhere in `src/pages/` or `src/components/`. Always named exports.

### Path Alias

**Source:** `apps/frontend/src/pages/DecksPage.tsx` lines 6-15

**Apply to:** All frontend files

```typescript
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
// NOT: import { Button } from '../../../components/ui/button'
```

`@/` is the Vite alias for `apps/frontend/src/`. Always use `@/` for cross-directory imports within `src/`.

---

## No Analog Found

All files have analogs. No files require fallback to RESEARCH.md patterns only.

---

## Metadata

**Analog search scope:** `packages/shared/src/`, `apps/backend/src/`, `apps/frontend/src/`
**Files scanned:** 26 source files read
**Pattern extraction date:** 2026-05-28
