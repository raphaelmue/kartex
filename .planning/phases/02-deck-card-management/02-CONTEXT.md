# Phase 2: Deck & Card Management - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers: full CRUD for decks and cards (text/Markdown only), freeform card tags, deck visibility toggle (UI only — enforcement comes in Phase 6), a Markdown-only card renderer component, and the frontend pages: /decks (deck list), /decks/:id (deck detail + card list), and card editor modal.

**In scope:** DECK-01 through DECK-05, CARD-01 through CARD-05 (Markdown rendering via react-markdown).

**Out of scope:** KaTeX/Typst rendering (Phase 3), spaced repetition (Phase 4), media uploads (Phase 5), sharing enforcement (Phase 6). The Prisma schema already has all required models — no new migration needed.

</domain>

<decisions>
## Implementation Decisions

### Deck List — /decks (D-01)
- **D-01:** Deck list uses a **card grid** layout (shadcn `Card` component). Each deck tile shows: title, description snippet (truncated), card count, and a visibility badge (Private / Shared / Public). "New Deck" button anchored at top of page.

### Card List — /decks/:id (D-02)
- **D-02:** Cards inside a deck are displayed as a **table** (shadcn `Table`, same component as AdminPage). Columns: row number, front content (truncated), tag chips, and action buttons (Edit / Delete). "Add Card" button below the table.

### Card Editor (D-03)
- **D-03:** Card creation and editing happens in a **modal dialog** (shadcn `Dialog` — to be added in this phase). Modal contains: front content textarea, back content textarea, tag input, Cancel + Save Card buttons. User stays in context of the deck page while editing.

### Markdown Preview in Editor (D-04)
- **D-04:** Each textarea in the card editor modal has an **Edit / Preview tab toggle**. Edit tab shows raw text input. Preview tab shows rendered Markdown via `react-markdown`. This tab structure is the Phase 2 renderer shell — Phase 3 slots KaTeX + Typst support into the same Preview tab without layout changes.

### Deck Visibility Selector (Claude's Discretion)
- Visibility selector for a deck (Private / Shared / Public) — Claude picks the appropriate control (dropdown or radio group) in the deck create/edit form.

### Claude's Discretion
- Empty state content for /decks (no decks yet) and /decks/:id (no cards yet) — Claude picks sensible empty-state copy and icon.
- Tag input UX (comma-separated freeform vs chip input) — Claude picks the simpler approach for Phase 2.
- Exact modal width and textarea heights — Claude picks comfortable defaults.
- Toast notifications on create/edit/delete success and error — Claude uses the existing Sonner setup.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & Data Model
- `docs/design.md` §3 — Monorepo structure (apps/frontend, apps/backend, packages/shared)
- `docs/design.md` §6 — Full Prisma schema (Deck, Card, CardProgress, DeckShare models — already migrated)
- `apps/backend/prisma/schema.prisma` — Live schema; Deck and Card models are already in place

### Backend Patterns (established in Phase 1)
- `apps/backend/src/routes/auth.ts` — Route pattern: Hono router, Zod validation from @kartex/shared, authMiddleware
- `apps/backend/src/middleware/auth.ts` — authMiddleware (userId available via `c.get('userId')`)
- `apps/backend/src/lib/prisma.ts` — Prisma client singleton

### Frontend Patterns (established in Phase 1)
- `apps/frontend/src/lib/api.ts` — All fetch calls go through the `api` wrapper (handles silent refresh)
- `apps/frontend/src/App.tsx` — Route structure; /decks and /dashboard are placeholder ComingSoon routes to replace
- `apps/frontend/src/components/AppShell.tsx` — Sidebar nav already has Decks link

### Shared Types
- `packages/shared/src/index.ts` — Re-exports; all new Deck/Card Zod schemas go in packages/shared/src/schemas/
- `.planning/REQUIREMENTS.md` — DECK-01 to DECK-05, CARD-01 to CARD-05

### UI Components (already in project)
- `apps/frontend/src/components/ui/card.tsx` — shadcn Card (reuse for deck grid tiles)
- `apps/frontend/src/components/ui/table.tsx` — shadcn Table (reuse for card list)
- `apps/frontend/src/components/ui/form.tsx`, `input.tsx`, `button.tsx`, `label.tsx` — Form elements
- `apps/frontend/src/components/ui/sonner.tsx` — Toast notifications

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Card` component (`apps/frontend/src/components/ui/card.tsx`): has CardHeader, CardContent, CardFooter — use for deck grid tiles
- `Table` component (`apps/frontend/src/components/ui/table.tsx`): same one used in AdminPage for user management — reuse for card list
- `api` wrapper (`apps/frontend/src/lib/api.ts`): handles GET/POST/PATCH/DELETE with silent token refresh — all data fetching must go through this
- `authMiddleware` (`apps/backend/src/middleware/auth.ts`): apply to all deck/card routes; provides `c.get('userId')`
- `sonner` toast: already wired in the app; use for CRUD success/error feedback

### Established Patterns
- Backend route pattern: `new Hono()`, Zod `.safeParse()` for body validation, `authMiddleware` on protected routes, return `c.json()` — follow exactly as in `auth.ts` and `admin.ts`
- Zod schemas in `packages/shared/src/schemas/` — new `deck.ts` and `card.ts` schemas go here, exported from `packages/shared/src/index.ts`
- Frontend pages are React components in `apps/frontend/src/pages/` — follow the pattern from `AdminPage.tsx`
- Prisma schema already has Deck, Card, DeckShare, CardProgress — no `prisma migrate` needed; only `prisma generate` if needed

### Integration Points
- `apps/frontend/src/App.tsx`: replace `ComingSoon` for `/decks` route; add `/decks/:id` nested route under AppShell
- `apps/backend/src/index.ts`: register new deck and card routers alongside auth and admin routers
- `packages/shared/src/index.ts`: export new Deck and Card schemas

</code_context>

<specifics>
## Specific Ideas

- The card editor modal uses **Edit / Preview tabs per field** — this is the foundation that Phase 3 extends. The renderer component (`KartexRenderer` or similar) should be extracted as a reusable component from the start, even though it only handles Markdown in Phase 2. Phase 3 will add KaTeX + Typst to that same component without changing the modal layout.
- Deck grid tiles should show a visibility badge that uses distinct colors/styles for Private (muted), Shared (blue), and Public (green) — to give quick at-a-glance status.

</specifics>

<deferred>
## Deferred Ideas

- **Deck search/filter** on the /decks page — would be a useful feature but is a new capability; defer to backlog
- **Bulk card operations** (delete multiple, move to another deck) — Phase 2 is single-card CRUD; bulk ops deferred
- **Card reordering** (drag-and-drop) — deferred; SM-2 ordering is by due date, not manual order

</deferred>

---

*Phase: 02-deck-card-management*
*Context gathered: 2026-05-26*
