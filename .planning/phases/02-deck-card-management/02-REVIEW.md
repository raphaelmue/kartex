---
phase: 02-deck-card-management
reviewed: 2026-05-26T00:00:00Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - packages/shared/src/schemas/deck.ts
  - packages/shared/src/schemas/card.ts
  - packages/shared/src/index.ts
  - apps/backend/src/routes/decks.ts
  - apps/backend/src/routes/cards.ts
  - apps/backend/src/index.ts
  - apps/backend/prisma/schema.prisma
  - apps/frontend/src/components/ui/dialog.tsx
  - apps/frontend/src/components/ui/tabs.tsx
  - apps/frontend/src/components/ui/select.tsx
  - apps/frontend/src/components/KartexRenderer.tsx
  - apps/frontend/src/components/DeckFormModal.tsx
  - apps/frontend/src/components/CardEditorModal.tsx
  - apps/frontend/src/pages/DecksPage.tsx
  - apps/frontend/src/pages/DeckDetailPage.tsx
  - apps/frontend/src/App.tsx
findings:
  critical: 2
  warning: 5
  info: 3
  total: 10
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-05-26
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

This phase delivers deck and card management: Zod schemas in shared, Hono REST routes, a Prisma schema, and React UI pages/modals. The overall structure is clean and follows the project conventions. Two critical issues were found — a database referential integrity bug that will crash deck deletions in production, and missing error handling on all Prisma calls that will surface as unhandled promise rejections. Five warnings cover a tag-state sync bug in `CardEditorModal`, a misleading empty-state on network failure, a blank loading screen, a missing cascade that silently mutes errors, and synchronous `readFileSync` in a request handler. Three info items cover duplicated component code, stale form state, and a `createdAt`/`updatedAt` type mismatch in the shared schemas.

---

## Critical Issues

### CR-01: DeckShare missing onDelete cascade — deck deletion throws FK violation

**File:** `apps/backend/prisma/schema.prisma:83-91`

**Issue:** The `DeckShare` model references `Deck` with no `onDelete` directive. PostgreSQL defaults to `RESTRICT`, meaning any attempt to delete a deck that has associated `DeckShare` rows will throw a foreign key constraint violation. The backend `DELETE /api/decks/:id` handler (decks.ts:67) does not catch this error, so the request will reject with an unhandled exception. A `PUBLIC` or `SHARED` deck that has been shared with any user cannot be deleted until this is fixed.

**Fix:**
```prisma
model DeckShare {
  id               String     @id @default(cuid())
  deckId           String
  deck             Deck       @relation(fields: [deckId], references: [id], onDelete: Cascade)
  sharedWithUserId String
  sharedWithUser   User       @relation(fields: [sharedWithUserId], references: [id])
  permission       Permission @default(READ)

  @@unique([deckId, sharedWithUserId])
}
```
After editing the schema, run `npx prisma migrate dev --name add-deckshare-cascade`.

---

### CR-02: All Prisma calls in route handlers lack try/catch — unhandled rejections on DB errors

**File:** `apps/backend/src/routes/decks.ts:14,29,38,50,57,64,67` and `apps/backend/src/routes/cards.ts:10,13,23,25,30,41,47,58,60`

**Issue:** Every Prisma database call in both route files is unawaited inside an `async` handler with no surrounding `try/catch`. If the database is unavailable, a query times out, or a constraint is violated (e.g., CR-01 above), the promise rejects and the error propagates as an unhandled rejection. Hono does have a default error handler that returns a 500, but the error leaks internals and there is no structured JSON error body for the client. More critically, Prisma errors (e.g., `PrismaClientKnownRequestError`) are not caught, so detailed DB error messages may be surfaced to the client.

**Fix:** Wrap each handler body in try/catch and return a consistent error response:

```typescript
// Example for GET /api/decks/:id in decks.ts
decks.get('/:id', async (c) => {
  const { id } = c.req.param()
  try {
    const deck = await prisma.deck.findUnique({
      where: { id },
      include: { _count: { select: { cards: true } } },
    })
    if (!deck) return c.json({ error: 'Not found.' }, 404)
    if (deck.ownerId !== c.get('userId')) return c.json({ error: 'Forbidden.' }, 403)
    return c.json(deck, 200)
  } catch (err) {
    console.error('[decks] GET /:id error', err)
    return c.json({ error: 'Internal server error.' }, 500)
  }
})
```

Apply the same pattern to all handlers in both `decks.ts` and `cards.ts`.

---

## Warnings

### WR-01: CardEditorModal tag state is disconnected from form validation — tags field always stale

**File:** `apps/frontend/src/components/CardEditorModal.tsx:51,70,75-76`

**Issue:** Tags are managed as a separate `tagInput` string state (line 51) rather than through the `react-hook-form` field. On `useEffect` reset (line 70), `form.reset()` sets `tags: card?.tags ?? []` while `tagInput` is updated separately. On submit (line 75), `tagInput` is parsed and injected into `payload` via spread, overriding `data.tags`. This means: (1) the `tags` field in form state is always the initial value from `form.reset`, never the current `tagInput`; (2) if Zod ever adds validation rules to the `tags` field (e.g., max length, max count), those rules will never fire because `form.handleSubmit` validates stale state, not `tagInput`. The submit-time override silently bypasses the schema.

**Fix:** Either control the tags field through react-hook-form using `useController` / `setValue`, or validate `tagInput` explicitly before submission:

```typescript
const onSubmit = async (data: CardFormInput) => {
  const tags = tagInput.split(',').map((t) => t.trim()).filter(Boolean)
  // Validate tags against schema before submitting
  const parsed = CreateCardSchema.shape.tags.safeParse(tags)
  if (!parsed.success) {
    toast.error('Invalid tags.')
    return
  }
  const payload = { ...data, tags: parsed.data }
  // ...
}
```

Long-term, wire the tags field into react-hook-form using `form.setValue('tags', parsedTags)` on `tagInput` change.

---

### WR-02: fetchDecks silently swallows errors — user sees misleading empty state

**File:** `apps/frontend/src/pages/DecksPage.tsx:50-57`

**Issue:** The `catch` block in `fetchDecks` is empty (line 55: `// silently ignore on load`). If the API is unreachable or returns an error, `decks` remains `[]` and the page renders the "No decks yet" empty state. A user with 50 decks who experiences a network error will see "Create your first deck" with no indication anything went wrong.

**Fix:**
```typescript
const fetchDecks = async () => {
  try {
    const res = await api.get('/api/decks')
    if (res.ok) {
      setDecks(await res.json())
    } else {
      toast.error('Failed to load decks.')
    }
  } catch {
    toast.error('Failed to load decks. Check your connection.')
  }
}
```

---

### WR-03: DeckDetailPage renders null while loading — blank screen on initial navigation

**File:** `apps/frontend/src/pages/DeckDetailPage.tsx:144`

**Issue:** `if (!deck) return null` is the guard before the main render. On initial page load, `deck` is `null` (the `useState` initial value) until the async `fetchDeck` resolves. This produces a completely blank screen during the network round-trip. If the fetch fails, `navigate('/decks')` is called (line 82-83), which is correct — but while the request is in-flight the user sees nothing. Additionally, if `fetchDeck` succeeds but `fetchCards` is still pending, the table is rendered with an empty cards list before cards arrive.

**Fix:** Add a loading state:
```typescript
const [loading, setLoading] = useState(true)

const fetchDeck = async () => {
  if (!deckId) return
  try {
    const res = await api.get(`/api/decks/${deckId}`)
    if (res.ok) setDeck(await res.json())
    else navigate('/decks')
  } catch {
    navigate('/decks')
  } finally {
    setLoading(false)
  }
}

// In render:
if (loading) return <div className="flex justify-center py-16"><span>Loading...</span></div>
if (!deck) return null
```

---

### WR-04: fetchCards silently ignores errors on DeckDetailPage — cards list appears empty on failure

**File:** `apps/frontend/src/pages/DeckDetailPage.tsx:88-95`

**Issue:** `fetchCards` has an empty catch block (`// silently ignore`). If this call fails after `fetchDeck` succeeds, the user sees the deck header and an empty table with the "No cards yet" placeholder — even if the deck has cards. Unlike `fetchDeck`, there is no fallback navigation or error toast.

**Fix:**
```typescript
const fetchCards = async () => {
  if (!deckId) return
  try {
    const res = await api.get(`/api/decks/${deckId}/cards`)
    if (res.ok) setCards(await res.json())
    else toast.error('Failed to load cards.')
  } catch {
    toast.error('Failed to load cards. Check your connection.')
  }
}
```

---

### WR-05: Synchronous readFileSync in SPA fallback handler blocks the event loop

**File:** `apps/backend/src/index.ts:48`

**Issue:** The SPA fallback handler calls `readFileSync('./public/index.html', 'utf8')` synchronously on every unmatched request. Node.js is single-threaded; a synchronous file read blocks all other requests while the I/O completes. In production this fires for every client-side React Router path (e.g., `/decks`, `/decks/abc123`), which is every page navigation.

**Fix:** Read `index.html` once at startup and cache it:
```typescript
// At module level, after imports
let spaHtml: string | null = null
try {
  spaHtml = readFileSync('./public/index.html', 'utf8')
} catch {
  // Development: no build yet
}

// In handler:
app.get('*', (c) => {
  if (spaHtml) return c.html(spaHtml)
  return c.text('Kartex backend is running. Start the frontend with: yarn dev:frontend', 404)
})
```

---

## Info

### IN-01: VisibilityBadge component duplicated in DecksPage and DeckDetailPage

**File:** `apps/frontend/src/pages/DecksPage.tsx:18-38` and `apps/frontend/src/pages/DeckDetailPage.tsx:19-39`

**Issue:** The `VisibilityBadge` component is defined identically in both files — 21 lines of identical JSX. Any styling change must be made in two places.

**Fix:** Extract to a shared component, e.g. `apps/frontend/src/components/VisibilityBadge.tsx`, and import it in both pages.

---

### IN-02: DeckSchema and CardSchema use z.string() for DateTime fields — type mismatch at API boundary

**File:** `packages/shared/src/schemas/deck.ts:19-20` and `packages/shared/src/schemas/card.ts:19-20`

**Issue:** `createdAt` and `updatedAt` are declared as `z.string()` in `DeckSchema` and `CardSchema`, but Prisma returns JavaScript `Date` objects for `DateTime` fields. If API responses are ever parsed through these schemas (e.g., for runtime validation), the parse will fail because `Date` is not a string. Currently the frontend uses `res.json()` directly without schema validation, so this is latent — but it will become a bug if schema parsing is added, or if any code compares `deck.createdAt` as a string against an ISO date.

**Fix:** Either use `z.coerce.date()` to accept both strings and Date objects, or `z.string().datetime()` if the API always serializes to ISO strings (which `JSON.stringify` does for Date):
```typescript
// Option A: coerce — works for both Date objects and ISO strings
createdAt: z.coerce.date(),
updatedAt: z.coerce.date(),

// Option B: strict string — only if API always returns serialized JSON (preferred)
createdAt: z.string().datetime(),
updatedAt: z.string().datetime(),
```

---

### IN-03: useEffect in DeckFormModal and CardEditorModal missing form in dependency array

**File:** `apps/frontend/src/components/DeckFormModal.tsx:68` and `apps/frontend/src/components/CardEditorModal.tsx:72`

**Issue:** Both `useEffect` hooks that call `form.reset(...)` list `[open, deck]` / `[open, card]` as dependencies but omit `form`. React's exhaustive-deps lint rule would flag this. In practice `form` is a stable object returned by `useForm`, so this does not cause a bug — but it is a lint warning that signals the dependency array is incomplete.

**Fix:** Add `form` to the dependency arrays:
```typescript
// DeckFormModal.tsx
}, [open, deck, form])

// CardEditorModal.tsx
}, [open, card, form])
```

---

_Reviewed: 2026-05-26_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
