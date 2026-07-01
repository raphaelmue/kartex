# Phase 28: Quick-Edit in Study - Research

**Researched:** 2026-07-01
**Domain:** Permission-gated inline editing inside an existing React study-session runtime + Hono/Prisma permission computation
**Confidence:** HIGH — every claim below is verified by direct reads of the current source files in this repo (not the milestone-kickoff pass, which explicitly flagged `study.ts` as unread)

## Summary

This phase adds a 3-dot menu to study cards that is visible only to users with owner/EDIT/MANAGE access to the card's deck, letting them edit the card inline or jump to its deck page. The milestone-kickoff research in `ARCHITECTURE.md` proposed a reasonable design (`canEdit: z.boolean()` on `DueCardSchema`, computed via a batch `Set<deckId>` lookup in `study.ts`) but explicitly flagged it as MEDIUM confidence because `study.ts` was not read in full. Having now read the actual file, **the proposed design is correct and cheap to implement** — both `GET /api/study/due` and `GET /api/study/deck/:deckId` already do a single `deckShare.findMany` (or `findUnique`) per request, so adding a `Set<string>` of EDIT/MANAGE deck IDs costs zero extra queries in `/due` (the share query already runs) and one extra query in `/deck/:deckId` (which currently only checks share existence, not permission level).

Three corrections to CONTEXT.md/ARCHITECTURE.md surface from re-reading the code:
1. The reusable `DropdownMenu` + destructive-item pattern lives in **`DecksPage.tsx`** (lines ~218-270), not `DeckDetailPage.tsx` — `DeckDetailPage.tsx`'s card action cell uses plain `Button` pairs, no `DropdownMenu` at all.
2. `e.stopPropagation()` is **not required** given D-01 (menu lives in the progress row, physically outside `CardFlip`'s click zone) — this contradicts the "Event Propagation Guard" note in `ARCHITECTURE.md` §Feature 7 and the STATE.md decision log line `v1.4-research: e.stopPropagation() on StudyCardMenu DropdownMenuTrigger...`, both of which assumed a different (card-overlay) placement that CONTEXT.md's D-01 supersedes.
3. `cards` state (the array `SessionRunner` iterates) is owned by the **parent** `StudySessionPage` component, not by `SessionRunner` itself. `SessionRunner` receives `cards` as a prop and has no setter today — a new prop must be threaded down for D-03's in-place replace-by-id to work.

**Primary recommendation:** Add `canEdit: z.boolean()` to `DueCardSchema`; compute it in `study.ts` using the deck-owner-or-editable-share pattern already established in `cards.ts`'s `getDeckAccess` helper (reuse that exact READ vs EDIT/MANAGE distinction, not a new one). Build `StudyCardMenu.tsx` using the `DropdownMenu` primitives exactly as used in `DecksPage.tsx`. Thread a new `onCardUpdated` callback prop from `StudySessionPage` (owns `cards` state) through `SessionRunner`, and give `CardEditorModal` an `onCardUpdated` callback that receives the parsed PATCH response so `SessionRunner`'s parent can merge only the edited fields (`frontContent`, `backContent`, `tags`) into the existing `DueCard`, preserving `easeFactor`/`interval`/`repetitions`/`nextReview`/`deckTitle`/`canEdit` which the PATCH response does not return.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEDIT-01 | 3-dot overflow menu appears only for owner/EDIT permission | `canEdit` computed server-side in `study.ts` using the same owner-or-share pattern as `cards.ts` `getDeckAccess`; frontend renders `StudyCardMenu` only when `currentCard.canEdit` |
| SEDIT-02 | "Edit this card" opens `CardEditorModal` inline; session continues after save | `CardEditorModal` already exists and is reused; needs `onCardUpdated` callback wired through `SessionRunner` → `StudySessionPage`'s `cards` state |
| SEDIT-03 | "Jump to deck" navigates to deck detail page | `navigate('/decks/' + card.deckId)` — same pattern as `handleLeave` in `SessionRunner` |
| SEDIT-04 | Menu hidden (not disabled) for non-editors | Conditional render `{currentCard.canEdit && <StudyCardMenu ... />}` — never render-then-disable |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `canEdit` permission computation | API / Backend | — | Must be server-computed and trustworthy; frontend cannot be the source of truth for a security-relevant flag (same principle as existing `PATCH /api/decks/:id/cards/:id` route already enforcing this independently) |
| Menu visibility gating | Browser / Client | API / Backend (enforces on PATCH) | UI decides render vs. no-render from the server-supplied flag; the actual mutation is still gated again by `cards.ts`'s `getDeckAccess` on save, so the client flag is UX-only, not the security boundary |
| Inline card edit UI | Browser / Client | — | Reuses existing `CardEditorModal` component and existing `PATCH /api/decks/:deckId/cards/:cardId` route — no new backend mutation endpoint needed |
| Session continuity after edit | Browser / Client | — | Pure client-side state merge (`cards` array replace-by-id) in `StudySessionPage`; no new API calls needed beyond the existing PATCH |
| Navigation to deck | Browser / Client | — | `react-router-dom` `navigate()`, consistent with existing `handleLeave` |

## User Constraints (from CONTEXT.md)

<user_constraints>
### Locked Decisions

- **D-01:** Trigger sits in the progress row (same row as `SessionProgress` + deck badge), not floating on the card face. This is entirely outside `CardFlip`'s click zone, so `e.stopPropagation()` is not required for click-safety (the menu physically cannot trigger a flip). **[VERIFIED against current CardFlip.tsx — confirmed below.]**
- **D-02:** Menu is visible on both the front and back face — since it lives in the progress row above `CardFlip`, it's unaffected by flip state and stays available throughout.
- **D-03:** Saving via "Edit this card" updates the currently displayed content immediately. `CardEditorModal` needs an `onCardUpdated: (updatedCard) => void` callback (or equivalent); `SessionRunner` replaces the matching card in its local `cards` array by `id` so the user never rates a card while still seeing content they just corrected. **[CORRECTION: `cards` is NOT local to `SessionRunner` — it is state owned by the parent `StudySessionPage`. See "Common Pitfalls" below.]**
- **D-04:** If tags change during the inline edit, the active session's tag filter is NOT re-evaluated. The filter was committed when the session started (`committedConfig`); a card is never removed from the in-progress queue due to a tag edit. Simplicity over correctness here.
- **D-05:** The menu shows in all study modes, including Exam mode, with no mode-based suppression. `SEDIT-01`'s permission rule (owner or EDIT access) is the only gate — no additional mode check needed in `StudyCardMenu` or `SessionRunner`.
- **D-06:** "Jump to deck" navigates immediately, with no confirmation dialog — consistent with the existing "Leave Session" button (`handleLeave`), which also navigates without confirming.

### Claude's Discretion

- Exact permission computation for `canEdit` (owner OR deck share with EDIT/MANAGE permission), the batch-lookup query shape in `study.ts`, and the exact shared-schema/component wiring are implementation details.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope. (Reviewed-but-not-folded: `2026-06-19-improve-user-management...` — already resolved by Phases 23-25, not applicable here.)
</user_constraints>

## Verified Current State of Relevant Files

### `apps/backend/src/routes/study.ts` (read in full — corrects MEDIUM confidence note in ARCHITECTURE.md)

- **`GET /api/study/due`** (lines 17-95): already runs `prisma.deckShare.findMany({ where: { sharedWithUserId: userId, isActive: true }, select: { deckId: true } })` to build `activeSharedDeckIds` for the `deckFilter`. **Adding `canEdit` here costs one extra field in the existing query** — change `select: { deckId: true }` to `select: { deckId: true, permission: true }` and build a `Set<string>` of deck IDs where `permission === 'EDIT' || permission === 'MANAGE'`. No new query. `[VERIFIED: apps/backend/src/routes/study.ts]`
- **`GET /api/study/deck/:deckId`** (lines 99-138): currently does `prisma.deckShare.findUnique(...)` only to check share *existence* (line 106-109), discarding the `permission` field. **One extra field read from the already-fetched `share` object** — no new query, since `share` is already loaded for the auth check. If `deck.ownerId === userId`, `canEdit = true`; else `canEdit = share.permission === 'EDIT' || share.permission === 'MANAGE'`. `[VERIFIED: apps/backend/src/routes/study.ts]`
- Both endpoints build their response arrays via `.map()` (lines 64-90 and 121-135) — `canEdit` is a one-line addition to each mapped object. Need `deck.ownerId` in scope: for `/due`, the `deckFilter` doesn't directly expose ownerId per card, so the simplest correct approach is: `const editableDeckIds = new Set(sharedRows.filter(r => r.permission === 'EDIT' || r.permission === 'MANAGE').map(r => r.deckId))`, then `canEdit: card.deck... ownerId === userId || editableDeckIds.has(card.deckId)`. **Caveat:** the current `include: { card: { include: { deck: { select: { id: true, title: true } } } } }` does NOT select `ownerId` — this select must be extended to `{ id: true, title: true, ownerId: true }` in both the `dueWithProgress` and `neverSeen` queries to know if the current card's deck is user-owned (since `/due` spans multiple decks, not just one). This is the one genuinely new piece of data needed — not a new query, just a wider `select`. `[VERIFIED]`

**Conclusion: ARCHITECTURE.md's MEDIUM-confidence batch-query assumption is CONFIRMED correct** — no new queries are needed in either endpoint, only wider `select` clauses on already-executed queries. Upgrade this from MEDIUM to HIGH confidence.

### `packages/shared/src/schemas/study.ts` (read in full)

Current `DueCardSchema` (lines 30-41):
```ts
export const DueCardSchema = z.object({
  id: z.string(),
  deckId: z.string(),
  deckTitle: z.string(),
  frontContent: z.string(),
  backContent: z.string(),
  tags: z.array(z.string()),
  easeFactor: z.number().default(2.5),
  interval: z.number().default(1),
  repetitions: z.number().default(0),
  nextReview: z.string().optional(),
})
```
No `canEdit` field present — CONTEXT.md's claim "confirmed via grep" is re-confirmed exactly. `[VERIFIED: packages/shared/src/schemas/study.ts]`

### `apps/backend/prisma/schema.prisma` — `DeckShare` model and `Permission` enum

```prisma
enum Permission {
  READ
  EDIT
  MANAGE
}

model DeckShare {
  id               String     @id @default(cuid())
  deckId           String
  deck             Deck       @relation(fields: [deckId], references: [id], onDelete: Cascade)
  sharedWithUserId String
  sharedWithUser   User       @relation(fields: [sharedWithUserId], references: [id])
  permission       Permission @default(READ)
  isActive         Boolean    @default(true)

  @@unique([deckId, sharedWithUserId])
}
```
`[VERIFIED: apps/backend/prisma/schema.prisma]`

### Existing permission-check precedent: `apps/backend/src/routes/cards.ts`

`cards.ts` already has a `getDeckAccess(deckId, userId)` helper returning `'owner' | 'editor' | 'reader' | null`, used to gate `POST`/`PATCH`/`DELETE /api/decks/:deckId/cards/*`. **This is the authoritative, already-tested owner/EDIT/MANAGE distinction in this codebase — reuse its exact semantics for computing `canEdit`, do not invent a parallel rule.** Note it does NOT check `isActive` on the share (unlike `study.ts`'s `/due` and `/rate` which do check `share.isActive`) — the planner should decide whether `canEdit` in study responses should also require `isActive` on the share (recommended: yes, for consistency with `/due`'s existing `deckFilter` which already excludes inactive shares from appearing at all — a card from an inactive share would never reach the response in `/due` in the first place, but `/deck/:deckId` doesn't check `isActive` at all currently, a pre-existing gap outside this phase's scope). `[VERIFIED: apps/backend/src/routes/cards.ts]`

**Security boundary reminder:** `canEdit` is UX-only. The actual mutation on save goes through `PATCH /api/decks/:deckId/cards/:cardId`, which independently re-derives `getDeckAccess` server-side (lines 62-64 of `cards.ts`) and rejects `'reader'`/`null` with 403/404. A stale or client-tampered `canEdit=true` cannot bypass this — it would only cause a 403 toast on save. No new server-side authorization logic is needed beyond what `cards.ts` already enforces; this phase only needs to *compute and expose* the flag for UI gating.

### `apps/frontend/src/components/CardEditorModal.tsx` (read in full)

Current props (lines 37-43):
```ts
interface CardEditorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deckId: string
  card?: Card
  onSuccess: () => void
}
```
- `onSubmit` (lines 82-99) calls `api.patch(...)` or `api.post(...)`, checks `res.ok`, then calls `onOpenChange(false)` and `onSuccess()` — **the parsed response body is currently discarded** (`res` is never `.json()`'d). To support D-03, `onSubmit` must be changed to `const updated = await res.json()` and pass it to a new `onCardUpdated?.(updated)` callback (make it optional so `DeckDetailPage`'s existing call site, which has no such callback, keeps compiling unchanged).
- `card?: Card` prop type is `CardSchema` (`id, deckId, frontContent, backContent, tags, createdAt, updatedAt`, see `packages/shared/src/schemas/card.ts`). `DueCard` (the type of `currentCard` in the study session) has `id, deckId, deckTitle, frontContent, backContent, tags, easeFactor, interval, repetitions, nextReview` — **it has NO `createdAt`/`updatedAt`, and has extra fields `deckTitle`/`easeFactor`/`interval`/`repetitions`/`nextReview` that `Card` doesn't have.** `CardEditorModal` only reads `card?.frontContent`, `card?.backContent`, `card?.tags` internally (lines 54, 59-61, 73-77) — `createdAt`/`updatedAt` are never touched. **Still, passing a `DueCard` directly where a `Card` is typed will fail strict TypeScript compilation** (missing required `createdAt`/`updatedAt`). The planner must either (a) construct a `Card`-shaped object with the three needed fields (frontContent/backContent/tags) plus dummy/coerced `id`/`deckId`/`createdAt`/`updatedAt`, or (b) widen `CardEditorModal`'s `card` prop type to `Pick<Card, 'id' | 'deckId' | 'frontContent' | 'backContent' | 'tags'>` (the only fields actually used) — **option (b) is cleaner and lower-risk** since it doesn't require fabricating fake timestamps. `[VERIFIED: apps/frontend/src/components/CardEditorModal.tsx, packages/shared/src/schemas/card.ts]`

### `apps/frontend/src/pages/StudySessionPage.tsx` — `SessionRunner` (read in full)

- Progress row (lines 144-153) is a `flex items-center gap-2` div containing `SessionProgress`, a deck-title `Badge`, and an optional mode `Badge` — sits directly above the `<CardFlip>` block (line 156+) as a sibling, not a child. **Confirms D-01: this row is structurally outside `CardFlip`'s `onClick`/`role="button"` element** (verified by reading `CardFlip.tsx` — the entire flip zone is one `div` with `onClick={onClick}` wrapping only the front/back faces; the progress row is never inside it). `stopPropagation()` is genuinely unnecessary for this placement.
- **`cards` state ownership:** `SessionRunner` receives `cards: DueCard[]` as a *prop* (line 32) from its caller `StudySessionPage` (line 727: `<SessionRunner cards={cards} ... />`). `StudySessionPage` owns `const [cards, setCards] = useState<DueCard[] | null>(null)` (line 335). **`SessionRunner` has no setter today.** For D-03 to work, a new prop (e.g. `onCardUpdated: (updated: DueCard) => void`) must be added to `SessionRunner`'s props, and `StudySessionPage` must pass down something like:
  ```ts
  onCardUpdated={(updated) =>
    setCards((prev) => prev?.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)) ?? prev)
  }
  ```
  This merge (`{ ...c, ...updated }`) is important: the PATCH response only contains `Card`-shaped fields (`frontContent`, `backContent`, `tags`, `id`, `deckId`, `createdAt`, `updatedAt`) — it does NOT contain `easeFactor`/`interval`/`repetitions`/`nextReview`/`deckTitle`/`canEdit`. A naive full replace (`updated` verbatim) would silently drop those fields from the in-progress card and could crash `SessionProgress`/`Badge` rendering (`currentCard.deckTitle` would become `undefined`). **The spread-merge is required, not optional.**
- `useStudySession(cards, mode)` (line 45) takes `cards` as a parameter and internally does `const currentCard = cards[currentIndex] ?? null` (hook `useStudySession.ts` line 116) — `currentIndex` is hook-internal state, so replacing an item in the `cards` array by id (same length, same order) safely produces an updated `currentCard` on the next render without disturbing `currentIndex`, `face`, or any other session-progress state. **Confirmed: in-place replace-by-id is safe and sufficient — no need to reset `currentIndex` or session state.** `[VERIFIED: apps/frontend/src/hooks/useStudySession.ts]`
- `handleLeave` (lines 52-55):
  ```ts
  const handleLeave = () => {
    if (deckId) navigate(`/decks/${deckId}`)
    else navigate('/dashboard')
  }
  ```
  This confirms D-06's "navigate without confirmation" pattern exactly. For "Jump to deck" (SEDIT-03), the target is always the *card's* deck (`currentCard.deckId`), not the session's `deckId` prop (which is `undefined` in global SR mode) — use `navigate('/decks/' + currentCard.deckId)` directly, do not reuse `handleLeave` as-is since its branch logic answers a different question (where to go when leaving the whole session) than "jump to this specific card's deck" (which is always known and always available from `currentCard.deckId`, even in global SR mode spanning multiple decks).

### DropdownMenu pattern — CORRECTED location: `apps/frontend/src/pages/DecksPage.tsx` (not `DeckDetailPage.tsx`)

`DeckDetailPage.tsx`'s `CardActionCell` (lines 102-118) uses plain `<Button>` pairs with no dropdown — CONTEXT.md's citation of "Phase 17-02 DeckDetailPage.tsx" for the `DropdownMenu` pattern does not match the current file. Grep across `apps/frontend/src` confirms `DropdownMenu` is imported in exactly two page files: `AdminPage.tsx` and `DecksPage.tsx`. The concrete, directly-reusable pattern is in `DecksPage.tsx` (lines 218-232):

```tsx
// Source: apps/frontend/src/pages/DecksPage.tsx (verified current file)
import { MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button size="sm" variant="ghost" aria-label={t('decks.moreActions')}>
      <MoreVertical className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => openEdit(deck)}>
      {t('decks.editButton')}
    </DropdownMenuItem>
    <DropdownMenuItem
      className="text-destructive focus:text-destructive"
      onClick={() => setDeleteTargetId(deck.id)}
    >
      {t('decks.deleteButton')}
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

The original todo (folded into CONTEXT.md) suggested `MoreHorizontal` from `lucide-react`; the existing codebase precedent actually uses `MoreVertical`. **Recommendation: follow the existing codebase precedent (`MoreVertical`) for visual consistency with `DecksPage.tsx`**, not the todo's original suggestion — no destructive item is needed for `StudyCardMenu` (neither "Edit this card" nor "Jump to deck" is destructive), so the `text-destructive` className is not applicable here, just the `DropdownMenu`/`DropdownMenuTrigger`/`DropdownMenuContent`/`DropdownMenuItem` shell. `[VERIFIED: apps/frontend/src/pages/DecksPage.tsx, apps/frontend/src/components/ui/dropdown-menu.tsx]`

## Standard Stack

No new packages required for this phase — `@radix-ui/react-dropdown-menu` (via shadcn's `dropdown-menu.tsx`) and `lucide-react` are already installed and used elsewhere in the codebase (`DecksPage.tsx`, `AdminPage.tsx`).

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| (none — existing deps only) | — | — | — |

## Package Legitimacy Audit

Not applicable — this phase installs no new packages. All required primitives (`DropdownMenu`, `lucide-react` icons, `CardEditorModal`) already exist in the codebase.

## Architecture Patterns

### System Architecture Diagram

```
Study session (SessionRunner)
  │
  ├─ GET /api/study/due  or  GET /api/study/deck/:deckId   [existing, extended]
  │     └─ study.ts: build editableDeckIds Set from already-fetched DeckShare rows
  │           └─ response: DueCard[] now includes canEdit: boolean per card
  │
  ├─ Render progress row (SessionProgress + deck Badge + [NEW] StudyCardMenu)
  │     └─ StudyCardMenu only rendered when currentCard.canEdit === true   (SEDIT-01, SEDIT-04)
  │           ├─ "Edit this card" → open CardEditorModal(card=currentCard, deckId=currentCard.deckId)
  │           │        └─ on save: PATCH /api/decks/:deckId/cards/:cardId  [existing, unchanged]
  │           │              └─ server re-derives getDeckAccess independently (security boundary, unchanged)
  │           │                    └─ CardEditorModal parses response → onCardUpdated(updatedFields)
  │           │                          └─ StudySessionPage: setCards(prev => prev.map(replace-by-id, spread-merge))
  │           │                                └─ useStudySession picks up new cards[] via prop; currentIndex unchanged
  │           │                                      └─ SEDIT-02: session continues from the same position, updated content shown
  │           └─ "Jump to deck" → navigate(`/decks/${currentCard.deckId}`)   (SEDIT-03, no confirmation per D-06)
  │
  └─ CardFlip (click zone) — structurally separate from progress row; no stopPropagation needed (D-01)
```

### Recommended Project Structure

No new directories. New file:
```
apps/frontend/src/components/
└── StudyCardMenu.tsx    # NEW — 3-dot DropdownMenu, gated on card.canEdit
```

### Pattern 1: Server-computed permission flag reused from an existing query

**What:** Extend an already-fetched Prisma `select` to include the field needed for a derived boolean, instead of adding a new query.
**When to use:** Any time a permission check can piggyback on a query the endpoint already runs for a different purpose (here: the `DeckShare` existence/scope check that both `/due` and `/deck/:deckId` already perform).
**Example:**
```ts
// Source: apps/backend/src/routes/study.ts (current, to be extended)
const sharedRows = await prisma.deckShare.findMany({
  where: { sharedWithUserId: userId, isActive: true },
  select: { deckId: true, permission: true }, // add `permission`
})
const editableDeckIds = new Set(
  sharedRows
    .filter((r) => r.permission === 'EDIT' || r.permission === 'MANAGE')
    .map((r) => r.deckId)
)
// later, per card:
canEdit: card.deck.ownerId === userId || editableDeckIds.has(card.deckId)
```

### Pattern 2: Callback threading through a stateless child component

**What:** `SessionRunner` is stateless w.r.t. `cards` — it only reads the prop. The mutation authority (`setCards`) lives in the parent. New callback props must be threaded down, not invented as local state in the child.
**When to use:** Whenever a child component needs to trigger a state update that lives in its parent (React unidirectional data flow) — applies directly to D-03's requirement.
**Example:**
```tsx
// StudySessionPage.tsx (parent) — passes setter-derived callback down
<SessionRunner
  cards={cards}
  onCardUpdated={(updated) =>
    setCards((prev) => prev?.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)) ?? prev)
  }
  // ...existing props
/>
```

### Anti-Patterns to Avoid
- **Replacing the whole `DueCard` with the PATCH response:** the PATCH response is `Card`-shaped, not `DueCard`-shaped — a full replace drops `deckTitle`/`easeFactor`/`interval`/`repetitions`/`nextReview`/`canEdit` and will break rendering (`currentCard.deckTitle` becomes `undefined` mid-session). Always spread-merge (`{ ...existing, ...patchResponse }`).
- **Adding `e.stopPropagation()` "just in case":** given D-01's placement (progress row, structurally outside `CardFlip`), this is dead code that could mask a future regression if someone ever moves the trigger back onto the card face without re-checking the click zone. Add a code comment explaining why it's *not* needed instead of adding a no-op guard.
- **Computing `canEdit` client-side from a `userId`/`ownerId` comparison the client doesn't reliably have:** `DueCard` today has no `ownerId` or `sharedWith` field — do not attempt to infer permission client-side; it must come from the server.
- **Trusting `canEdit` as an authorization boundary:** it is UI-only. `PATCH /api/decks/:deckId/cards/:cardId` in `cards.ts` already independently re-derives and enforces access — do not skip or duplicate that logic, and do not treat a "menu was shown" as proof the save will succeed (a race where a share is revoked mid-session should still correctly 403 on save, which it already will).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Owner-or-share permission check | A new bespoke permission function in `study.ts` | Mirror the `getDeckAccess` distinction from `cards.ts` (owner / EDIT-or-MANAGE / READ / none) | Keeps the "what counts as editable" definition in exactly one conceptual place across the codebase — divergence here would be a subtle security/UX inconsistency (e.g., a share with EDIT permission shows the menu in study but the card action buttons behave differently in `DeckDetailPage`) |
| Card edit form/validation | A stripped-down inline editor inside `StudyCardMenu` or `SessionRunner` | Existing `CardEditorModal` | Already handles Zod validation, KaTeX/Typst preview tabs, media upload toolbar, i18n, and the PATCH call — a second editor would double-maintain all of that |
| Dropdown menu primitive | Custom absolutely-positioned `<div>` menu | shadcn `DropdownMenu` (`@/components/ui/dropdown-menu`) | Already installed, already has the Radix accessibility/keyboard/focus-trap behavior, already has a proven usage pattern in `DecksPage.tsx` |

**Key insight:** Every piece this phase needs (permission-check shape, edit UI, menu primitive, navigate-without-confirm pattern) already exists somewhere in this codebase. The work is 100% wiring/composition, not new capability — treat any temptation to build something novel as a signal to re-check for an existing pattern first.

## Common Pitfalls

### Pitfall 1: Overwriting session-progress fields on card update
**What goes wrong:** After saving an edit, the displayed card loses its `deckTitle` badge or the session appears to reset SM-2-related fields.
**Why it happens:** The `PATCH /api/decks/:deckId/cards/:cardId` response is `Card`-shaped (only `id, deckId, frontContent, backContent, tags, createdAt, updatedAt`), not `DueCard`-shaped. A naive `setCards(prev => prev.map(c => c.id === updated.id ? updated : c))` replaces the whole object.
**How to avoid:** Spread-merge: `{ ...c, ...updated }` so only the edited fields overwrite, and all `DueCard`-only fields (`deckTitle`, `easeFactor`, `interval`, `repetitions`, `nextReview`, `canEdit`) survive.
**Warning signs:** `Badge` showing "undefined" for deck title after an inline edit; TypeScript error if `setCards` is typed strictly and `updated` (a `Card`) doesn't satisfy `DueCard`.

### Pitfall 2: Assuming `SessionRunner` owns `cards` state
**What goes wrong:** Attempting `useState` for `cards` inside `SessionRunner` to implement D-03, creating a second source of truth that diverges from `StudySessionPage`'s `cards` state (used elsewhere for tag filtering / session restart logic).
**Why it happens:** CONTEXT.md's own wording ("`SessionRunner` replaces the matching card in its local `cards` array") is imprecise — `cards` is a prop, not local state, as of the current `StudySessionPage.tsx`.
**How to avoid:** Add a new callback prop (`onCardUpdated`) to `SessionRunner`'s prop interface; the actual `setCards` call happens in `StudySessionPage`, which already owns the state (line 335: `useState<DueCard[] | null>(null)`).
**Warning signs:** TypeScript complains `cards` prop is read-only / cannot call a setter that doesn't exist on a prop array.

### Pitfall 3: `CardEditorModal`'s `card` prop type mismatch with `DueCard`
**What goes wrong:** Passing `currentCard` (a `DueCard`) directly as `card={currentCard}` where `CardEditorModal` expects `card?: Card` fails TypeScript compilation (missing `createdAt`/`updatedAt`, extra fields not assignable).
**Why it happens:** `DueCard` and `Card` are structurally different schemas that happen to overlap on the fields the editor actually uses.
**How to avoid:** Widen `CardEditorModal`'s `card` prop type to `Pick<Card, 'id' | 'deckId' | 'frontContent' | 'backContent' | 'tags'>` (the only fields it reads internally per the current source) rather than fabricating fake `createdAt`/`updatedAt` values on the `DueCard` object.
**Warning signs:** TS2322 "Type 'DueCard' is not assignable to type 'Card | undefined'" at the `<CardEditorModal card={currentCard} .../>` call site.

### Pitfall 4: Radix `DropdownMenu` doesn't open with plain `fireEvent.click` in JSDOM tests
**What goes wrong:** A test that does `fireEvent.click(triggerButton)` to open `StudyCardMenu` finds the menu content never appears.
**Why it happens:** Documented in STATE.md (line 200): "Radix DropdownMenu JSDOM testing: `fireEvent.pointerDown` before `fireEvent.click` required to open Radix UI DropdownMenu 2.x in JSDOM test environment." This is an established, previously-hit project pitfall (Phase 17/18/19 era), not new to this phase.
**How to avoid:** In any new test for `StudyCardMenu`, always do `fireEvent.pointerDown(trigger); fireEvent.click(trigger);` before asserting on menu item visibility.
**Warning signs:** `screen.getByText('Edit this card')` throws "unable to find element" even though the component renders the trigger correctly.

### Pitfall 5: `getDeckAccess`-style checks omit `isActive` on the share in `/deck/:deckId`
**What goes wrong:** A `canEdit=true` could be computed for a card whose share has been deactivated (`DeckShare.isActive === false`) if the `/deck/:deckId` endpoint's existing access check (which does not currently check `isActive` at all — see line 106-109 of `study.ts`) is copied verbatim for the `canEdit` computation.
**Why it happens:** `/due` already filters `isActive: true` into its `deckFilter` (so any card reaching `/due`'s response necessarily has an active share/ownership), but `/deck/:deckId`'s existing 403 check at lines 104-110 doesn't check `share.isActive` — this is a pre-existing gap unrelated to this phase, but worth being deliberate about when adding `canEdit`.
**How to avoid:** When computing `canEdit` for `/deck/:deckId`, explicitly include `share.isActive` in the EDIT/MANAGE check (`canEdit = deck.ownerId === userId || (share?.permission in ['EDIT','MANAGE'] && share.isActive)`) even though the existing 403 gate for viewing the deck at all doesn't check it — don't propagate the existing gap into the new field.
**Warning signs:** A user whose share was deactivated but who still has a stale browser tab open on `/decks/:id/learn` sees an editable menu that then 403s on save (functionally harmless given the security boundary in Pitfall's "why", but a confusing UX regression worth avoiding cheaply).

## Code Examples

### Computing `canEdit` in `GET /api/study/due` (extends existing code, no new queries)
```ts
// Source: apps/backend/src/routes/study.ts (current file, showing the extension point)
const sharedRows = await prisma.deckShare.findMany({
  where: { sharedWithUserId: userId, isActive: true },
  select: { deckId: true, permission: true }, // ADD permission
})
const activeSharedDeckIds = sharedRows.map((r) => r.deckId)
const editableSharedDeckIds = new Set(
  sharedRows.filter((r) => r.permission === 'EDIT' || r.permission === 'MANAGE').map((r) => r.deckId)
)

// widen deck select in both dueWithProgress and neverSeen queries:
// deck: { select: { id: true, title: true, ownerId: true } }

const progressCards = dueWithProgress.map((p) => ({
  // ...existing fields...
  canEdit: p.card.deck.ownerId === userId || editableSharedDeckIds.has(p.card.deckId),
}))
```

### `StudyCardMenu.tsx` component sketch
```tsx
// Source: composed from apps/frontend/src/pages/DecksPage.tsx pattern + CONTEXT.md D-01..D-06
import { MoreVertical } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

interface StudyCardMenuProps {
  onEdit: () => void
  onJumpToDeck: () => void
}

export function StudyCardMenu({ onEdit, onJumpToDeck }: StudyCardMenuProps) {
  const { t } = useTranslation()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" aria-label={t('study.cardMenuAriaLabel')}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>{t('study.editThisCard')}</DropdownMenuItem>
        <DropdownMenuItem onClick={onJumpToDeck}>{t('study.jumpToDeck')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```
No `e.stopPropagation()` on the trigger — placement in the progress row (D-01) makes it unnecessary; `CardFlip`'s click zone does not wrap this component.

## State of the Art

| Old Approach (per ARCHITECTURE.md milestone-kickoff) | Current/Verified Approach | When Changed | Impact |
|--------------------------------------------------------|---------------------------|---------------|--------|
| "Overlay on card face; needs `e.stopPropagation()`" | Progress row placement (D-01); no `stopPropagation` needed | CONTEXT.md discuss-phase session, 2026-07-01 | Simpler component, no click-zone interference to reason about; remove the stale guidance from ARCHITECTURE.md/STATE.md mentally when planning |
| "Reuse DropdownMenu pattern from DeckDetailPage.tsx (17-02)" | Pattern actually lives in `DecksPage.tsx` | Discovered during this research pass — `DeckDetailPage.tsx`'s card actions never used `DropdownMenu` | Planner should cite `DecksPage.tsx` as the reference file in task descriptions, not `DeckDetailPage.tsx` |
| "MEDIUM confidence on batch-query cost" | HIGH confidence — confirmed zero new queries needed, only wider `select` | This research pass (full read of `study.ts`) | No performance risk; safe to implement exactly as scoped |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Widening `CardEditorModal`'s `card` prop type to a `Pick<Card, ...>` is preferable to fabricating dummy `createdAt`/`updatedAt` on a `DueCard` | Pitfall 3 / Code Examples | Low — both approaches compile; this is a stylistic recommendation, not a verified requirement. Planner/executor can choose either; noted as discretion, not a locked fact. |
| A2 | `canEdit` for `/deck/:deckId` should additionally check `share.isActive` even though the existing access-check gate at that endpoint doesn't | Pitfall 5 | Low-medium — if not applied, a deactivated-share user could see (but not successfully use) the edit menu until they reload; not a security bug (PATCH still 403s) but a minor UX inconsistency. Recommend applying it, but it's this researcher's judgment call, not directly stated in CONTEXT.md. |

## Open Questions (RESOLVED)

1. **RESOLVED: Should `canEdit` also require `deck.isActive` (the deck itself being active, separate from the share)?**
   - What we know: `/due`'s existing `deckFilter` already requires `isActive: true` on owned decks (and doesn't check `Deck.isActive` for shared decks — it uses `DeckShare.isActive` instead, per STATE.md `18-01` decision). Since only active-deck cards reach the response array in `/due` at all, `canEdit` doesn't need a redundant `isActive` check there.
   - What's unclear: whether `/deck/:deckId` (used for Deck Mode / Exam Mode, which loads all cards in a deck "regardless of nextReview") should block editing on an inactive deck the *owner* has deactivated. Since a deck's own owner can always edit their own (even inactive) deck's cards via `DeckDetailPage` already (no `isActive` gate there per the read of `cards.ts`), this is likely a non-issue — inactive only affects study-queue *inclusion*, not edit rights.
   - Recommendation: no extra `isActive`-on-deck check needed for `canEdit`; only the share's own `isActive` matters (Pitfall 5), consistent with how the rest of the codebase treats deck-level `isActive` as a study-queue filter, not an edit-permission gate.

## Environment Availability

Not applicable — this phase has no new external dependencies (no new packages, no new services, no new CLI tools). All work is within the existing Node/React/Prisma/Postgres stack already running in this repo.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 (pinned per STATE.md `03-01` — do not upgrade to 4.x) |
| Config file | `apps/backend/vitest.config.ts`, `apps/frontend/vitest.config.ts` |
| Quick run command | `yarn workspace @kartex/backend test -- study` / `yarn workspace @kartex/frontend test -- StudySessionPage` |
| Full suite command | `npm test` (root) — runs both workspaces per `package.json` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEDIT-01 | `canEdit` computed correctly for owner/EDIT/MANAGE/READ/no-access cases in `/due` and `/deck/:deckId` | unit/integration (backend) | `yarn workspace @kartex/backend test -- study` | ❌ Wave 0 — existing `study-rate-reviewlog.test.ts` and `sharing.test.ts` are `it.todo` stubs only; no live Prisma-mock harness exists yet for `study.ts`. **Project convention (confirmed in `sharing.test.ts`, `study-rate-reviewlog.test.ts`) is to document behavior as `it.todo(...)` rather than build a full Prisma-mock harness** — the planner should follow this established convention for backend permission tests unless explicitly asked to build real mocks. |
| SEDIT-01, SEDIT-04 | `StudyCardMenu` renders only when `currentCard.canEdit === true`, absent otherwise | unit (frontend) | `yarn workspace @kartex/frontend test -- StudySessionPage` | ❌ Wave 0 — `StudySessionPage.test.tsx` exists but has no `canEdit`/menu assertions yet; must add cases with `makeCard(...)` extended to include `canEdit: true/false` |
| SEDIT-02 | Edit → save → session continues with updated content at same position | unit (frontend) | `yarn workspace @kartex/frontend test -- StudySessionPage` | ❌ Wave 0 — needs `api.patch` mock added to the existing `vi.mock('@/lib/api', ...)` block (currently only mocks `get`/`post`) |
| SEDIT-03 | "Jump to deck" navigates to `/decks/:deckId` | unit (frontend) | `yarn workspace @kartex/frontend test -- StudySessionPage` | ❌ Wave 0 — needs a `navigate` spy assertion; the existing mock `useNavigate: () => vi.fn()` returns a fresh unspied fn per render, must be hoisted to a shared spy to assert calls (existing tests don't currently assert navigation, so this is a new pattern to introduce in this phase, following the `vi.hoisted` pattern already used for `mockApiGet`) |

### Sampling Rate
- **Per task commit:** targeted `yarn workspace @kartex/backend test -- study` and/or `yarn workspace @kartex/frontend test -- StudySessionPage`
- **Per wave merge:** `npm test` (full suite, both workspaces)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] Extend `StudySessionPage.test.tsx`'s `makeCard()` helper to accept/return `canEdit: boolean` — covers SEDIT-01/04
- [ ] Add `api.patch` to the existing `vi.mock('@/lib/api', ...)` factory in `StudySessionPage.test.tsx` (currently only `get`/`post` are mocked) — needed for SEDIT-02
- [ ] Hoist a shared `navigate` spy in `StudySessionPage.test.tsx`'s router mock (currently `useNavigate: () => vi.fn()` creates an unassertable fresh spy) — needed for SEDIT-03
- [ ] Decide test-authoring convention for `study.ts` `canEdit` computation: follow existing `it.todo` documentation-only convention (per `sharing.test.ts`, `study-rate-reviewlog.test.ts`) unless the plan explicitly commits to introducing a live Prisma-mock harness for this phase — recommend following convention to stay consistent with the rest of the backend test suite

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | yes | `canEdit` is server-computed only; the actual mutation (`PATCH /api/decks/:deckId/cards/:cardId`) independently re-derives access via `getDeckAccess` in `cards.ts` — no new access-control logic needed, but the new field must never become itself an authorization decision point (client-supplied `canEdit` must never be trusted server-side, and it isn't — the PATCH route doesn't read it) |
| V5 Input Validation | yes | Unchanged — existing `UpdateCardSchema` (Zod, `.partial()` of `CreateCardSchema`) already validates the PATCH body; no new input surface introduced by this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Client trusts its own `canEdit` flag and skips server-side re-check on save | Elevation of Privilege | Already mitigated — `PATCH /api/decks/:deckId/cards/:cardId` independently calls `getDeckAccess` and rejects `'reader'`/`null`. This phase must not bypass or duplicate that check client-side; it only adds a *display* hint, never a save-time trust boundary. |
| Stale share revoked mid-session, user still sees editable menu (Pitfall 5) | Information Disclosure (minor UX only) | Save attempt still 403s server-side; no data exposure risk, purely a UX polish item (see Open Question 1 / Pitfall 5) |

## Sources

### Primary (HIGH confidence — direct codebase reads this session)
- `apps/backend/src/routes/study.ts` — full file read, both `GET` endpoints and `POST /rate`
- `packages/shared/src/schemas/study.ts` — full file read, confirmed `DueCardSchema` shape
- `apps/backend/prisma/schema.prisma` — `DeckShare` model + `Permission` enum (grep + context)
- `apps/backend/src/routes/cards.ts` — full file read, `getDeckAccess` helper and all three mutation routes
- `apps/frontend/src/components/CardEditorModal.tsx` — full file read
- `apps/frontend/src/components/CardFlip.tsx` — full file read, click-zone structure
- `apps/frontend/src/pages/StudySessionPage.tsx` — full file read, `SessionRunner` + state ownership
- `apps/frontend/src/hooks/useStudySession.ts` — full file read, `currentIndex`/`cards` relationship
- `apps/frontend/src/pages/DeckDetailPage.tsx` — read lines 1-480, confirmed no `DropdownMenu` usage
- `apps/frontend/src/pages/DecksPage.tsx` — grep + targeted read, confirmed actual `DropdownMenu` usage location
- `packages/shared/src/schemas/card.ts` — full file read, `CardSchema` shape
- `apps/backend/src/routes/decks.ts` — grep for `userPermission` computation pattern
- `apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx` — read for existing test/mock structure
- `apps/backend/src/routes/__tests__/sharing.test.ts`, `study-rate-reviewlog.test.ts` — read for backend test convention (it.todo pattern)
- `.planning/config.json` — confirmed `nyquist_validation: true`, no `security_enforcement` key (treated as enabled)

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` §Feature 7 (Quick-Edit in Study Mode) — milestone-kickoff design, largely confirmed correct, two corrections noted above
- `.planning/STATE.md` decision log (`v1.4-research: canEdit field...`, `v1.4-research: e.stopPropagation()...`) — the stopPropagation note is superseded by CONTEXT.md D-01, noted explicitly

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new packages, all primitives already installed and used elsewhere
- Architecture: HIGH - every integration point read directly from current source, not inferred
- Pitfalls: HIGH - each pitfall traced to a specific current-file line or an established project decision log entry (STATE.md)

**Research date:** 2026-07-01
**Valid until:** 30 days (stable internal codebase, no external API/version drift risk since no new dependencies)
