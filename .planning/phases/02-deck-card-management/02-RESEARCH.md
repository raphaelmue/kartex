# Phase 2: Deck & Card Management - Research

**Researched:** 2026-05-26
**Domain:** Hono CRUD API, Zod schema patterns, React data fetching, shadcn/ui Dialog + Tabs, react-markdown
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Deck list uses a card grid layout (shadcn `Card` component). Each deck tile shows: title, description snippet (truncated), card count, and a visibility badge (Private / Shared / Public). "New Deck" button anchored at top of page.
- **D-02:** Cards inside a deck are displayed as a table (shadcn `Table`). Columns: row number, front content (truncated), tag chips, and action buttons (Edit / Delete). "Add Card" button below the table.
- **D-03:** Card creation and editing happens in a modal dialog (shadcn `Dialog` — to be added in this phase). Modal contains: front content textarea, back content textarea, tag input, Cancel + Save Card buttons.
- **D-04:** Each textarea in the card editor modal has an Edit / Preview tab toggle. Edit tab shows raw text input. Preview tab shows rendered Markdown via `react-markdown`. This tab structure is the Phase 2 renderer shell — Phase 3 slots KaTeX + Typst support into the same Preview tab without layout changes.

### Claude's Discretion

- Visibility selector for a deck (Private / Shared / Public) — Claude picks the appropriate control (dropdown or radio group) in the deck create/edit form.
- Empty state content for /decks (no decks yet) and /decks/:id (no cards yet) — Claude picks sensible empty-state copy and icon.
- Tag input UX (comma-separated freeform vs chip input) — Claude picks the simpler approach for Phase 2.
- Exact modal width and textarea heights — Claude picks comfortable defaults.
- Toast notifications on create/edit/delete success and error — Claude uses the existing Sonner setup.

### Deferred Ideas (OUT OF SCOPE)

- Deck search/filter on the /decks page
- Bulk card operations (delete multiple, move to another deck)
- Card reordering (drag-and-drop)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DECK-01 | User can create a deck with a title and optional description | Backend: POST /api/decks with Zod CreateDeckSchema; Frontend: modal/form on /decks page |
| DECK-02 | User can view all their own decks on the decks page | Backend: GET /api/decks filtered by ownerId; Frontend: DecksPage card grid |
| DECK-03 | User can edit a deck's title and description | Backend: PATCH /api/decks/:id with ownership check; Frontend: edit deck dialog |
| DECK-04 | User can delete a deck (and all its cards and progress) | Backend: DELETE /api/decks/:id with cascading delete via Prisma; Frontend: confirm then delete |
| DECK-05 | User can set deck visibility: private, shared, or public | Backend: visibility field on CreateDeckSchema and UpdateDeckSchema; Frontend: Select/RadioGroup in deck form |
| CARD-01 | User can create a card in a deck with front and back content | Backend: POST /api/decks/:deckId/cards; Frontend: CardEditorModal on /decks/:id |
| CARD-02 | User can edit an existing card's front, back, or tags | Backend: PATCH /api/decks/:deckId/cards/:cardId; Frontend: CardEditorModal pre-filled |
| CARD-03 | User can delete a card from a deck | Backend: DELETE /api/decks/:deckId/cards/:cardId; Frontend: delete button in card table |
| CARD-04 | User can add freeform tags to a card | Backend: tags String[] field on Card model (already in schema); Frontend: comma-separated tag input |
| CARD-05 | Card content renders Markdown text (via react-markdown) | Frontend: KartexRenderer component using react-markdown + remark-gfm in Preview tab |
</phase_requirements>

---

## Summary

Phase 2 builds full CRUD for decks and cards on top of the Phase 1 foundation. The Prisma schema already has all required models (`Deck`, `Card`, `CardProgress`, `DeckShare`) with the correct fields — no new migration is needed, only `prisma generate` is safe to run if needed. The main work is: (1) writing two new Hono routers (`/api/decks` and `/api/decks/:deckId/cards`), (2) new Zod schemas in `@kartex/shared`, (3) three new frontend pages (`/decks`, `/decks/:id`) and the card editor modal, and (4) the `KartexRenderer` component.

The codebase has clear, consistent patterns from Phase 1. All new code must follow the same route/schema/page structure — there is no ambiguity about how to do this. The only new packages needed are `react-markdown`, `remark-gfm`, `@radix-ui/react-dialog`, and `@radix-ui/react-tabs` (none are currently installed). The `@radix-ui/react-select` package is needed for the visibility dropdown.

**Primary recommendation:** Follow Phase 1 patterns exactly. New Hono routers, new Zod schemas in shared, new React pages. Three shadcn/ui components need to be added (Dialog, Tabs, Select). Extract `KartexRenderer` as a standalone component from day one so Phase 3 can slot in KaTeX/Typst without touching the modal.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Deck CRUD (create/read/update/delete) | API / Backend (Hono) | Database (Prisma) | Business logic and data ownership live server-side; ownership check must happen in Hono, not browser |
| Card CRUD (create/read/update/delete) | API / Backend (Hono) | Database (Prisma) | Same as deck CRUD; card belongs to a deck that belongs to a user — authorization chain is backend responsibility |
| Deck ownership enforcement | API / Backend (Hono) | — | Only the authenticated user's own decks should be mutable; checked via `c.get('userId')` against `deck.ownerId` |
| Deck list display | Browser / Client (React) | Frontend (React state) | SPA data fetch → render grid; no SSR in this stack |
| Card list display | Browser / Client (React) | — | Same as deck list; table rendered client-side from API response |
| Card editor modal | Browser / Client (React) | — | Modal state, form input, and preview tab are all client-side concerns |
| Markdown rendering (KartexRenderer) | Browser / Client (React) | — | react-markdown runs in the browser; content is stored as plain text in DB |
| Zod validation | API / Backend (request validation) + Browser (form validation) | `@kartex/shared` | Single source of truth in shared package; used on both sides |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| hono | ^4.7.9 (installed) | Backend routing + middleware | Already in project; Phase 1 pattern |
| @prisma/client | ^5.22.0 (installed) | ORM for Deck/Card queries | Already in project; schema already has all models |
| zod | ^3.23.8 (installed in shared) | Schema validation for Deck/Card DTOs | Project's single source of truth pattern |
| react-markdown | 10.1.0 | Markdown rendering in KartexRenderer Preview tab | Required by CARD-05; latest stable [VERIFIED: npm registry] |
| remark-gfm | 4.0.1 | GitHub Flavored Markdown plugin for react-markdown | Enables tables, strikethrough, task lists; standard companion [VERIFIED: npm registry] |
| @radix-ui/react-dialog | 1.1.15 | shadcn Dialog component for card editor modal | Required by D-03; latest stable [VERIFIED: npm registry] |
| @radix-ui/react-tabs | 1.1.13 | shadcn Tabs component for Edit/Preview toggle in modal | Required by D-04; latest stable [VERIFIED: npm registry] |
| @radix-ui/react-select | 2.2.6 | shadcn Select component for visibility dropdown | Required for deck form visibility selector [VERIFIED: npm registry] |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-hook-form | ^7.76.1 | Form state for deck create/edit form | Use for deck title/description/visibility form |
| @hookform/resolvers | ^5.4.0 | Zod resolver for react-hook-form | Pair with CreateDeckSchema on the deck form |
| sonner | ^2.0.7 | Toast notifications | CRUD success/error feedback |
| lucide-react | ^1.16.0 | Empty state icons | "No decks yet" and "No cards yet" states |

**Installation (new packages only — run in apps/frontend):**
```bash
pnpm add react-markdown remark-gfm @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-select
```

**Version verification:** Verified against npm registry on 2026-05-26. [VERIFIED: npm registry]

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (React SPA)
  │
  ├── /decks
  │     └── DecksPage
  │           ├── GET /api/decks → deck grid (shadcn Card tiles)
  │           ├── DeckFormModal (create/edit deck)
  │           │     └── react-hook-form + CreateDeckSchema/UpdateDeckSchema
  │           └── delete confirm → DELETE /api/decks/:id
  │
  └── /decks/:id
        └── DeckDetailPage
              ├── GET /api/decks/:id → deck header
              ├── GET /api/decks/:id/cards → card table (shadcn Table)
              ├── CardEditorModal (create/edit card)
              │     ├── front textarea [Edit tab | Preview tab → KartexRenderer]
              │     ├── back textarea  [Edit tab | Preview tab → KartexRenderer]
              │     ├── tag input (comma-separated)
              │     └── POST /api/decks/:id/cards or PATCH /api/decks/:id/cards/:cardId
              └── delete confirm → DELETE /api/decks/:id/cards/:cardId

Nginx /api/*
  │
Hono Backend
  ├── POST   /api/decks              → create deck (ownerId = c.get('userId'))
  ├── GET    /api/decks              → list user's own decks (WHERE ownerId = userId)
  ├── GET    /api/decks/:id          → get deck (ownership check)
  ├── PATCH  /api/decks/:id          → update deck title/desc/visibility (ownership check)
  ├── DELETE /api/decks/:id          → delete deck + cascade cards + progress
  ├── POST   /api/decks/:deckId/cards    → create card
  ├── GET    /api/decks/:deckId/cards    → list cards in deck (ownership check on deck)
  ├── PATCH  /api/decks/:deckId/cards/:cardId → update card
  └── DELETE /api/decks/:deckId/cards/:cardId → delete card
  │
Prisma
  │
PostgreSQL (Deck, Card models — already migrated)
```

### Recommended Project Structure

```
packages/shared/src/schemas/
├── auth.ts           (existing)
├── inviteCode.ts     (existing)
├── user.ts           (existing)
├── deck.ts           (NEW — CreateDeckSchema, UpdateDeckSchema, DeckSchema)
└── card.ts           (NEW — CreateCardSchema, UpdateCardSchema, CardSchema)

apps/backend/src/routes/
├── auth.ts           (existing)
├── admin.ts          (existing)
├── decks.ts          (NEW — deck CRUD router)
└── cards.ts          (NEW — card CRUD router, mounted under /api/decks/:deckId/cards)

apps/frontend/src/pages/
├── AdminPage.tsx     (existing)
├── LoginPage.tsx     (existing)
├── RegisterPage.tsx  (existing)
├── DecksPage.tsx     (NEW — /decks route)
└── DeckDetailPage.tsx (NEW — /decks/:id route)

apps/frontend/src/components/
├── ui/
│   ├── dialog.tsx    (NEW — shadcn Dialog component)
│   ├── tabs.tsx      (NEW — shadcn Tabs component)
│   └── select.tsx    (NEW — shadcn Select component)
├── DeckFormModal.tsx  (NEW — create/edit deck dialog)
├── CardEditorModal.tsx (NEW — card editor with Edit/Preview tabs)
└── KartexRenderer.tsx  (NEW — reusable Markdown renderer; Phase 3 extension point)
```

### Pattern 1: Hono Deck Router (established pattern)

**What:** `new Hono()`, `authMiddleware` on all routes, Zod `.safeParse()` for body, `c.get('userId')` for ownership, `c.json()` for response.

**When to use:** All new backend routes in this phase.

```typescript
// Source: apps/backend/src/routes/auth.ts (established pattern)
import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { CreateDeckSchema } from '@kartex/shared'

const decks = new Hono()
decks.use('*', authMiddleware)

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

export { decks as decksRouter }
```

### Pattern 2: Ownership Check

**What:** Before mutating or reading a deck/card, verify the authenticated user owns the deck.

**When to use:** GET /:id, PATCH /:id, DELETE /:id — all deck and card mutation routes.

```typescript
// Pattern verified from existing admin.ts ownership awareness
const deck = await prisma.deck.findUnique({ where: { id } })
if (!deck) return c.json({ error: 'Not found.' }, 404)
if (deck.ownerId !== c.get('userId')) return c.json({ error: 'Forbidden.' }, 403)
```

### Pattern 3: Zod Schema in @kartex/shared

**What:** All DTOs (request body shapes) defined in `packages/shared/src/schemas/` and exported from `packages/shared/src/index.ts`. Used by both backend (validation) and frontend (form resolver).

**When to use:** Every new resource shape — deck and card.

```typescript
// Source: packages/shared/src/schemas/auth.ts (established pattern)
import { z } from 'zod'

export const CreateDeckSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  visibility: z.enum(['PRIVATE', 'SHARED', 'PUBLIC']).default('PRIVATE'),
})
export type CreateDeckInput = z.infer<typeof CreateDeckSchema>

export const UpdateDeckSchema = CreateDeckSchema.partial()
export type UpdateDeckInput = z.infer<typeof UpdateDeckSchema>

export const CreateCardSchema = z.object({
  frontContent: z.string().min(1),
  backContent: z.string().min(1),
  tags: z.array(z.string()).default([]),
})
export type CreateCardInput = z.infer<typeof CreateCardSchema>

export const UpdateCardSchema = CreateCardSchema.partial()
export type UpdateCardInput = z.infer<typeof UpdateCardSchema>
```

### Pattern 4: React Page with api wrapper (established pattern)

**What:** `useEffect` for data load, `api.get/post/patch/delete` calls through the silent-refresh wrapper, `toast.success/error` for feedback, `useState` for data.

**When to use:** All frontend pages — DecksPage, DeckDetailPage.

```typescript
// Source: apps/frontend/src/pages/AdminPage.tsx (established pattern)
const [decks, setDecks] = useState<Deck[]>([])

const fetchDecks = async () => {
  const res = await api.get('/api/decks')
  if (res.ok) setDecks(await res.json())
}

useEffect(() => { void fetchDecks() }, [])

const handleCreate = async (data: CreateDeckInput) => {
  const res = await api.post('/api/decks', data)
  if (res.ok) { toast.success('Deck created'); await fetchDecks() }
  else toast.error('Something went wrong. Please try again.')
}
```

### Pattern 5: KartexRenderer (Phase 3 extension shell)

**What:** Standalone React component that takes a `content: string` prop and renders it. In Phase 2 it uses `react-markdown` + `remark-gfm`. Phase 3 will add custom `components` for KaTeX and Typst without changing its external interface.

**When to use:** Everywhere card content is rendered — Preview tab in CardEditorModal, card table truncation (optional), future study pages.

```typescript
// react-markdown v10 API — [VERIFIED: npm registry / package README pattern]
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

### Pattern 6: Router Registration in index.ts

**What:** New routers are registered with `app.route('/api/decks', decksRouter)` after auth routes but before the static file catch-all. The `authMiddleware` is applied globally at `app.use('/api/*', authMiddleware)` — deck/card routes inherit it automatically.

**When to use:** When wiring decksRouter and cardsRouter into index.ts.

```typescript
// Source: apps/backend/src/index.ts (established pattern)
import { decksRouter } from './routes/decks.js'
// ...
app.route('/api/decks', decksRouter)
// Card routes are nested under decks in the decks router via .route()
// OR registered separately: app.route('/api/decks', cardsRouter)
```

### Anti-Patterns to Avoid

- **Defining types in page files:** All DTO types come from `@kartex/shared`. Never create a local `interface Deck { ... }` in a page component — it breaks the single-source-of-truth contract.
- **Fetching without the api wrapper:** All fetch calls go through `apps/frontend/src/lib/api.ts`. Bare `fetch()` bypasses silent refresh and will leave users logged out.
- **Cascade delete handled in application code:** Use Prisma's `onDelete: Cascade` or a multi-step Prisma transaction. Do not loop and delete cards before deleting the deck — it is non-atomic and can leave orphans if interrupted. The schema already has cards relating to a deck; add `onDelete: Cascade` on the `deck` relation in the Card model if not already present. **[IMPORTANT: Check the live schema — the Card model's `deck` relation does not currently have `onDelete: Cascade` in schema.prisma. This must be added via a new migration.]**
- **Storing tags as a joined string:** The Card model already has `tags String[]` (PostgreSQL array). Use it directly. Do not split/join strings in application code.
- **Using `put` for updates:** The `api` wrapper exposes `.patch()`, not `.put()`. Use PATCH for partial updates (Zod `.partial()` schemas).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown rendering | Custom parser/tokenizer | `react-markdown` + `remark-gfm` | XSS-safe, plugin ecosystem, Phase 3 extensibility via `components` prop |
| Modal dialog (accessibility) | Custom `<div>` overlay | shadcn `Dialog` (Radix UI) | Focus trap, Esc key, aria-modal, portal — all handled |
| Tab toggle (a11y) | `<button>` + display toggling | shadcn `Tabs` (Radix UI) | aria-selected, keyboard navigation, roving tabindex — all handled |
| Select dropdown | `<select>` or custom dropdown | shadcn `Select` (Radix UI) | Consistent styling, accessible, matches existing shadcn components |
| Form validation | Manual field checks | `react-hook-form` + `@hookform/resolvers/zod` | Already installed; `CreateDeckSchema` plugs straight in |
| Cascading delete | App-level loop | Prisma `onDelete: Cascade` on relation | Atomic, no orphans, no N+1 deletes |

**Key insight:** Every UI primitive in this phase (modal, tabs, select) has a Radix UI equivalent that shadcn copies in. Building these from scratch introduces accessibility regressions that are hard to catch manually.

---

## Common Pitfalls

### Pitfall 1: Missing onDelete Cascade on Card → Deck relation

**What goes wrong:** `DELETE /api/decks/:id` throws a Prisma foreign key constraint violation because cards still reference the deck.

**Why it happens:** The current `schema.prisma` Card model's `deck` relation has no `onDelete: Cascade`. PostgreSQL enforces referential integrity.

**How to avoid:** Add `onDelete: Cascade` to the `deck` relation on Card (and similarly on CardProgress → Card) and create a new migration: `pnpm prisma migrate dev --name add-cascade-deletes`. This is a schema-only migration — no data changes.

**Warning signs:** `DELETE /api/decks/:id` returns a 500 with a Prisma error about foreign key constraint.

### Pitfall 2: react-markdown v10 breaking changes from v8/v9

**What goes wrong:** `import ReactMarkdown from 'react-markdown'` works, but using old `renderers` prop (v7/v8 API) causes runtime errors.

**Why it happens:** react-markdown v9+ uses the `components` prop, not `renderers`. Training data may reference the old API.

**How to avoid:** Use `components` prop for custom element rendering. In Phase 2 no custom components are needed — just `remarkPlugins={[remarkGfm]}`. Phase 3 will add `components` for math nodes.

**Warning signs:** TypeScript error "Property 'renderers' does not exist on type..." or runtime "Unknown prop" warnings.

### Pitfall 3: Card route nesting ambiguity

**What goes wrong:** Card routes registered at `/api/cards` instead of `/api/decks/:deckId/cards` — then ownership/deck association must be passed as a body field (fragile) rather than a URL param.

**Why it happens:** Flat routing feels simpler, but loses the hierarchical resource relationship.

**How to avoid:** Register card routes as a sub-router on decks: in `decks.ts` use `decks.route('/:deckId/cards', cardsRouter)` so the deckId is available as a path parameter in every card handler. Validate deck ownership once per card operation.

**Warning signs:** Card routes at `/api/cards/:id` instead of `/api/decks/:deckId/cards/:cardId`.

### Pitfall 4: Stale deck list after CRUD operations

**What goes wrong:** User creates a deck, but the grid does not update because React state is not refreshed.

**Why it happens:** The `AdminPage` pattern calls `fetchDecks()` after each mutation. If this pattern is not followed in `DecksPage`, the UI will show stale data.

**How to avoid:** After every successful `api.post/patch/delete`, call `fetchDecks()` (or `fetchCards()`) to re-fetch from the server. This is the established pattern from `AdminPage.tsx`.

**Warning signs:** Toast shows "Deck created" but grid does not update until browser refresh.

### Pitfall 5: Dialog component not in project yet

**What goes wrong:** `import { Dialog } from '@/components/ui/dialog'` fails — `dialog.tsx` was never copied into the project.

**Why it happens:** The `CONTEXT.md` explicitly notes the Dialog component needs to be added in this phase. It is not in the current list of `apps/frontend/src/components/ui/` files.

**How to avoid:** Wave 0 of the frontend plan must add `dialog.tsx`, `tabs.tsx`, and `select.tsx` to the shadcn components directory before any page code references them.

**Warning signs:** TypeScript cannot resolve `@/components/ui/dialog`.

### Pitfall 6: Tags as PostgreSQL array — frontend serialization

**What goes wrong:** Sending `tags: "react,typescript"` (comma-joined string) instead of `tags: ["react", "typescript"]` (JSON array). Prisma rejects non-array values for `String[]` fields.

**Why it happens:** The tag input UX (decided as Claude's discretion) will likely be a comma-separated text field. The split must happen before the API call.

**How to avoid:** In the card form submit handler, parse the tag string: `tags: tagInput.split(',').map(t => t.trim()).filter(Boolean)`. Validate with `z.array(z.string())` in `CreateCardSchema`.

**Warning signs:** Prisma validation error on card create/update mentioning the `tags` field.

---

## Code Examples

### Deck schema (new file)

```typescript
// packages/shared/src/schemas/deck.ts
import { z } from 'zod'

export const CreateDeckSchema = z.object({
  title: z.string().min(1, 'Title is required.').max(200),
  description: z.string().max(2000).optional(),
  visibility: z.enum(['PRIVATE', 'SHARED', 'PUBLIC']).default('PRIVATE'),
})
export type CreateDeckInput = z.infer<typeof CreateDeckSchema>

export const UpdateDeckSchema = CreateDeckSchema.partial()
export type UpdateDeckInput = z.infer<typeof UpdateDeckSchema>

// Response shape (what the API returns)
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

### Card schema (new file)

```typescript
// packages/shared/src/schemas/card.ts
import { z } from 'zod'

export const CreateCardSchema = z.object({
  frontContent: z.string().min(1, 'Front content is required.'),
  backContent: z.string().min(1, 'Back content is required.'),
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

### Cascade delete migration

```prisma
// apps/backend/prisma/schema.prisma — Card model update
model Card {
  id           String         @id @default(cuid())
  deckId       String
  deck         Deck           @relation(fields: [deckId], references: [id], onDelete: Cascade)
  // ... rest unchanged
}

model CardProgress {
  // ...
  cardId       String
  card         Card           @relation(fields: [cardId], references: [id], onDelete: Cascade)
  // ...
}
```

### Backend deck list query (with card count)

```typescript
// Source: Prisma docs pattern — _count relation aggregation [ASSUMED: API unchanged in Prisma 5]
const decks = await prisma.deck.findMany({
  where: { ownerId: userId },
  orderBy: { createdAt: 'desc' },
  include: { _count: { select: { cards: true } } },
})
```

### shadcn Dialog shell (to be added as ui/dialog.tsx)

```typescript
// shadcn/ui Dialog — [CITED: https://ui.shadcn.com/docs/components/dialog]
// Wraps @radix-ui/react-dialog with shadcn styling.
// Added via: npx shadcn-ui@latest add dialog
// OR manually copy from https://ui.shadcn.com/docs/components/dialog
```

### react-markdown v10 usage

```typescript
// Source: react-markdown v10 README — [VERIFIED: npm registry]
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

<ReactMarkdown remarkPlugins={[remarkGfm]}>
  {content}
</ReactMarkdown>
```

### Route registration in index.ts

```typescript
// Follows established pattern in apps/backend/src/index.ts
import { decksRouter } from './routes/decks.js'

// After auth router, before admin router:
app.route('/api/decks', decksRouter)
// Cards are sub-routed inside decksRouter: decks.route('/:deckId/cards', cardsSubRouter)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-markdown `renderers` prop | `components` prop | v9.0 (2022) | Phase 3 custom math rendering must use `components`, not `renderers` |
| react-markdown `allowDangerousHtml` | Disabled by default (safe) | v7+ | No action needed — safe by default |
| Prisma `onDelete` in `@relation()` | Supported since Prisma 2.x | N/A | Use `onDelete: Cascade` directly on the relation field |

**Deprecated/outdated:**
- `react-markdown` `renderers` prop: replaced by `components` in v9+. Never use `renderers` in new code.
- shadcn `npx shadcn-ui@latest add` CLI: the CLI installs components. Alternatively, copy the source directly from the shadcn docs site — both are valid. The project already uses the copy-paste approach.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `prisma.deck.findMany` supports `include: { _count: { select: { cards: true } } }` in Prisma 5.x | Code Examples | Card count on deck tiles would not be available; planner would need a fallback (separate count query) |
| A2 | shadcn Dialog, Tabs, and Select source code can be copied verbatim from ui.shadcn.com and will compile against the project's existing Radix UI + Tailwind setup | Standard Stack / Pitfall 5 | Minor — might need cn() import path adjustment, but that is a 1-line fix |
| A3 | The visibility badge colors (muted/blue/green for Private/Shared/Public) can be implemented using Tailwind classes already in the project | Architecture Patterns | Low risk — purely cosmetic, always fixable without API changes |

---

## Open Questions

1. **Cascade delete — migration required?**
   - What we know: The current `schema.prisma` does not have `onDelete: Cascade` on `Card.deck` or `CardProgress.card`. Deleting a deck without cascade will fail on the DB foreign key.
   - What's unclear: Whether a migration is acceptable given "no new migration needed" was stated in CONTEXT.md (this was referring to new model columns, but `onDelete` is a schema-level constraint change that does require a migration).
   - Recommendation: Plan must include a migration task: `pnpm prisma migrate dev --name add-cascade-deletes`. This is a constraint-only migration; it will not alter data.

2. **pnpm vs yarn — package manager discrepancy**
   - What we know: `docs/design.md` and the current `ROADMAP.md` reference `pnpm workspaces` and `pnpm-workspace.yaml`. However, earlier plan 01-01 was specified with "Yarn Berry 4.x" (cross-cutting constraint: "Yarn Berry 4.x with nodeLinker: node-modules"). The root `package.json` lock file type determines which manager is actually in use.
   - What's unclear: Whether the project is actually running pnpm or yarn. This affects install commands.
   - Recommendation: Planner should verify by checking for `pnpm-lock.yaml` vs `yarn.lock` at repo root before specifying install commands.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | pnpm/yarn, build tools | Yes | v24.14.0 | — |
| PostgreSQL | Prisma migrations | Not directly checked (Docker) | 16 (Docker Compose) | Must run via Docker |
| react-markdown | CARD-05 KartexRenderer | No (not installed) | 10.1.0 | None — required |
| remark-gfm | KartexRenderer GFM support | No (not installed) | 4.0.1 | None — required |
| @radix-ui/react-dialog | D-03 card editor modal | No (not installed) | 1.1.15 | None — required |
| @radix-ui/react-tabs | D-04 Edit/Preview toggle | No (not installed) | 1.1.13 | None — required |
| @radix-ui/react-select | Deck visibility selector | No (not installed) | 2.2.6 | None — required |

**Missing dependencies with no fallback:**
- `react-markdown`, `remark-gfm`, `@radix-ui/react-dialog`, `@radix-ui/react-tabs`, `@radix-ui/react-select` — all must be installed in `apps/frontend` as Wave 0 of plan 02-03.

**Missing dependencies with fallback:**
- None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no test config files or test directories found in codebase |
| Config file | None — Wave 0 gap |
| Quick run command | TBD (no test framework installed) |
| Full suite command | TBD |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DECK-01 | POST /api/decks creates a deck with valid data | integration | TBD — no test framework | No — Wave 0 |
| DECK-02 | GET /api/decks returns only the authenticated user's decks | integration | TBD | No — Wave 0 |
| DECK-03 | PATCH /api/decks/:id updates deck fields | integration | TBD | No — Wave 0 |
| DECK-04 | DELETE /api/decks/:id removes deck and all cards | integration | TBD | No — Wave 0 |
| DECK-05 | POST/PATCH /api/decks accepts visibility enum | integration | TBD | No — Wave 0 |
| CARD-01 | POST /api/decks/:deckId/cards creates a card | integration | TBD | No — Wave 0 |
| CARD-02 | PATCH /api/decks/:deckId/cards/:id updates card | integration | TBD | No — Wave 0 |
| CARD-03 | DELETE /api/decks/:deckId/cards/:id removes card | integration | TBD | No — Wave 0 |
| CARD-04 | tags String[] accepted and returned correctly | integration | TBD | No — Wave 0 |
| CARD-05 | KartexRenderer renders Markdown to HTML nodes | unit (React) | TBD | No — Wave 0 |

### Sampling Rate

- No test framework is installed. The project has been built through Phase 1 without automated tests.
- Recommendation for planner: Given no test infrastructure exists and `nyquist_validation: true` in config, the plan should either (a) include a Wave 0 test setup task installing vitest + @testing-library/react for frontend unit tests, or (b) document manual smoke-test steps as the validation gate. Option (b) is lower effort for Phase 2 given the existing zero-test baseline.

### Wave 0 Gaps

- [ ] No test framework installed — if testing is required: `pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom` in `apps/frontend`
- [ ] No backend test setup — if integration tests are required: `pnpm add -D vitest` in `apps/backend`
- [ ] `apps/frontend/src/components/ui/dialog.tsx` — must be added before page code references it
- [ ] `apps/frontend/src/components/ui/tabs.tsx` — must be added before card editor modal
- [ ] `apps/frontend/src/components/ui/select.tsx` — must be added before deck form

*(If no test framework is set up: manual verification steps should be documented in the plan as the validation gate for each wave)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No (Phase 1 handled this) | — |
| V3 Session Management | No (Phase 1 handled this) | — |
| V4 Access Control | Yes | `authMiddleware` (c.get('userId')) + deck.ownerId === userId check on every mutation |
| V5 Input Validation | Yes | Zod schemas (CreateDeckSchema, UpdateDeckSchema, CreateCardSchema, UpdateCardSchema) validated server-side via `.safeParse()` |
| V6 Cryptography | No | No new crypto in this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Insecure Direct Object Reference (IDOR) | Elevation of Privilege | Check `deck.ownerId === c.get('userId')` on every deck GET/PATCH/DELETE; never trust the ID alone |
| Mass assignment | Tampering | Zod schemas only allow declared fields — Prisma `create/update` receives only validated `body.data` |
| Markdown XSS | Tampering | react-markdown sanitizes by default (no `allowDangerousHtml`); do not enable it |
| Oversized card content | Denial of Service | Add `z.string().max(10000)` on frontContent/backContent in CreateCardSchema |

---

## Project Constraints (from CLAUDE.md)

- All Zod schemas live in `packages/shared/src/schemas/` — never duplicate type definitions
- Hono routes live in `apps/backend/src/routes/` — one file per resource
- shadcn/ui components are copied into `apps/frontend/src/components/` and customized freely
- JWT stored in `httpOnly` cookie — never in localStorage
- All secrets via `.env` — never hardcoded
- All API endpoints except `/api/auth/login` and `/api/auth/refresh` require a valid JWT (INFR-03) — deck/card routes inherit this via the global `app.use('/api/*', authMiddleware)` already in `index.ts`
- Keep files under 500 lines
- Use typed interfaces for all public APIs

---

## Sources

### Primary (HIGH confidence)
- `apps/backend/prisma/schema.prisma` — live schema; Deck, Card, CardProgress, DeckShare models confirmed
- `apps/backend/src/routes/auth.ts` — Hono route pattern verified
- `apps/backend/src/routes/admin.ts` — Hono CRUD pattern (no Zod on admin but same structure)
- `apps/backend/src/middleware/auth.ts` — authMiddleware implementation confirmed
- `apps/frontend/src/lib/api.ts` — api wrapper confirmed (GET/POST/PATCH/DELETE)
- `apps/frontend/src/pages/AdminPage.tsx` — frontend CRUD pattern confirmed
- `apps/frontend/package.json` — installed packages confirmed
- npm registry — react-markdown@10.1.0, remark-gfm@4.0.1, @radix-ui/react-dialog@1.1.15, @radix-ui/react-tabs@1.1.13, @radix-ui/react-select@2.2.6 [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- react-markdown v10 `components` prop API — consistent with package changelog and npm listing [VERIFIED: npm registry metadata]
- Prisma `onDelete: Cascade` on relation fields — standard Prisma feature, confirmed in schema.prisma syntax [ASSUMED training knowledge; standard since Prisma 2.x]

### Tertiary (LOW confidence)
- None — all critical claims have HIGH or MEDIUM confidence sources.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all package versions verified against npm registry on 2026-05-26
- Architecture: HIGH — patterns read directly from existing Phase 1 codebase
- Pitfalls: HIGH — cascade delete pitfall identified from live schema; others from direct code reading
- react-markdown API: MEDIUM — npm registry confirms v10 is current; `components` prop is the established API

**Research date:** 2026-05-26
**Valid until:** 2026-06-26 (stable ecosystem — Prisma, Radix UI, react-markdown all have slow-moving APIs)
