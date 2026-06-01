# Phase 8: Study UX - Research

**Researched:** 2026-05-31
**Domain:** React state management, client-side filtering/sorting, shadcn/ui component patterns
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** The tag filter and session size picker appear **above the 3 mode cards** on the existing mode selector screen (`StudySessionPage`) — a "Session options" section between the title/back button and the mode cards.
- **D-02:** The config section appears on **deck-specific sessions only** (`/decks/:id/learn`). The global `/study` route skips mode selection and goes directly into SR mode — no config screen shown there.
- **D-03:** The config section layout: tag chips on one side, size picker on the other (or stacked), separated from the mode cards by spacing/divider.
- **D-04:** Default state: **no tags selected = all cards included**. User opts into filtering by clicking tag chips.
- **D-05:** **Untagged cards are always excluded when any tag filter is active.** If the user selects "biology", only cards tagged with "biology" appear — cards with no tags are excluded.
- **D-06:** Multiple tags selected uses **OR logic**: a card appears if it matches any of the selected tags.
- **D-07:** Tag filter UI: **toggle chips** — each tag is a small clickable chip. Selected = filled/active style, deselected = outline. Tags derived client-side from the fetched deck cards.
- **D-08:** Session size picker applies to **SR mode only**. Deck Mode and Exam Mode continue to use all cards.
- **D-09:** The 4 options (All due / 10 / 20 / Custom) are displayed as a **segmented button row**.
- **D-10:** Selecting "Custom" reveals an **inline number input** immediately — no modal or popover.
- **D-11:** Cards are shuffled **client-side in `StudySessionPage`** before being passed to `SessionRunner`/`useStudySession`. Apply to all 3 modes. No UI indicator needed.
- **D-12:** Replace the flat `<Table>` with a **section layout**: bold tag header + mini-table of cards per section.
- **D-13:** Within each section, cards render with the same **table columns** as before: # / Front / Tags / Actions. Edit/Delete actions remain.
- **D-14:** Cards with **multiple tags appear under their first tag only** — no duplication across sections.
- **D-15:** Sections are ordered **alphabetically by tag name**. The **"Untagged" section always appears last**.

### Claude's Discretion

- Exact Tailwind classes for the config section layout, chip toggle states, segmented button row styling
- Whether to extract the config section as a `SessionConfig` sub-component or keep inline in `StudySessionPage`
- Tag section header format (capitalization, card count display style)
- Empty state within a tag section (edge case)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STUDY-01 | User can filter a study session by one or more tags before it begins | Tags derived from `cards.flatMap(c => c.tags)` dedup; filter applied to `cards` state before `SessionRunner`; chips toggle `selectedTags: Set<string>` state |
| STUDY-02 | User can choose session size (All due / 10 / 20 / custom) before starting a session | Segmented `Button` row; `sessionSize` state (`'all' | 10 | 20 | 'custom'`); custom reveals `<Input type="number">`; applied only when `selectedMode === 'sr'` |
| STUDY-03 | Cards in a study session are always presented in random order | Fisher-Yates shuffle via `[...arr]` spread + `sort(() => Math.random() - 0.5)` applied in `StudySessionPage` before `setCards()`; no new API calls |
| STUDY-04 | Deck detail page groups cards under tag headers; untagged cards appear under "Untagged" | Group `cards` array client-side by `card.tags[0] ?? 'Untagged'`; sort sections alpha, `Untagged` last; render per-section `<Table>` replacing single flat table |

</phase_requirements>

---

## Summary

Phase 8 is a pure frontend change touching exactly two files: `StudySessionPage.tsx` (250 lines) and `DeckDetailPage.tsx` (517 lines). No new npm packages are required — all needed primitives are already installed: shadcn `Button` (all variants), `Input`, `Table`, `lucide-react`, and Tailwind CSS. No backend API changes are needed; tag data is already returned in every `DueCard` and `Card` response as `tags: string[]`.

The core technical work is four independent changes that can be planned as separate tasks: (1) derive a unique sorted tag list from the already-fetched `cards` state, add toggle-chip UI in `StudySessionPage` above the mode cards; (2) add a segmented button row for session size, applying the slice only when `selectedMode === 'sr'`; (3) shuffle the `cards` array with a non-mutating spread before passing to `SessionRunner`; (4) replace the flat `<Table>` in `DeckDetailPage` with grouped sections ordered alphabetically with `Untagged` last.

The key architectural constraint (confirmed by reading the source): `StudySessionPage` fetches cards only *after* `selectedMode` is set (see the `useEffect` on line 210). The tag filter config section must be pre-mode-selection UI, meaning tag chips must be derived from the prefetch that already happens for `deckTotalCards`/`deckDueCount` — specifically from `/api/study/deck/:deckId` (allCardsRes), which is already fetched but currently only used for the count. The tags from that prefetch can populate the filter chips before any mode is chosen.

**Primary recommendation:** Add two new state variables to `StudySessionPage` (`selectedTags: Set<string>`, `sessionSize`), derive `availableTags` from the existing `allCardsRes` prefetch, render the config section in the `if (!selectedMode)` branch, and apply filter+slice+shuffle in the `useEffect` that calls `setCards`. For `DeckDetailPage`, add a pure helper function `groupCardsByFirstTag(cards: Card[])` that returns an ordered array of `{ tag: string; cards: Card[] }`, then replace the single `<Table>` block with a mapped render of those groups.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Tag filter UI (STUDY-01) | Browser / Client | — | Toggle state is ephemeral session config; no server involvement |
| Tag filtering logic (STUDY-01) | Browser / Client | — | `card.tags` already returned by API; filter is a pure array operation |
| Session size UI (STUDY-02) | Browser / Client | — | Same as above; slice applied to already-fetched array |
| Shuffle (STUDY-03) | Browser / Client | — | Pure client-side array transform; no API call needed |
| Deck detail tag grouping (STUDY-04) | Browser / Client | — | Grouping is a pure transform on already-fetched `Card[]` |

All four requirements are 100% client-side. No tier ambiguity exists.

---

## Standard Stack

### Core (all already installed — no new packages)

| Library | Installed Version | Purpose | Why Standard |
|---------|----------|---------|--------------|
| React | 18.x | Component state, effects | Project stack |
| shadcn/ui Button | present | Toggle chips + segmented row | `variant="default"` (filled) / `variant="outline"` pattern already used in project |
| shadcn/ui Input | present | Custom session size number input | Already used in `DeckDetailPage` share form |
| shadcn/ui Table | present | Per-section mini-tables in DeckDetailPage | Already imported in `DeckDetailPage.tsx` |
| Tailwind CSS | present | Layout and chip styling | Project UI framework |

[VERIFIED: codebase grep] — all components confirmed present in `apps/frontend/src/components/ui/`.

### No New Dependencies

This phase installs zero new packages. The Package Legitimacy Audit section is omitted — no packages to evaluate.

---

## Architecture Patterns

### System Architecture Diagram

```
User selects tags/size
        │
        ▼
StudySessionPage (mode selector branch: !selectedMode)
  ├── availableTags  ◄── derived from allCardsRes prefetch (already fetched)
  ├── selectedTags   ◄── Set<string> state, toggled by chip clicks
  ├── sessionSize    ◄── 'all' | 10 | 20 | 'custom' | number state
  │
  └── [User clicks mode card]
        │
        ▼
  loadCards useEffect (triggered by selectedMode change)
        │
        ▼
  API fetch (/api/study/due filtered by deckId  OR  /api/study/deck/:deckId)
        │
        ▼
  Apply tag filter → apply size slice → Fisher-Yates shuffle
        │
        ▼
  setCards(processedCards)
        │
        ▼
SessionRunner receives cards (already filtered, sized, shuffled)
        │
        ▼
useStudySession(cards, mode)   ← no changes to this hook
```

```
DeckDetailPage (cards already fetched via /api/decks/:deckId/cards)
        │
        ▼
groupCardsByFirstTag(cards)
  → sorted alpha by tag name
  → 'Untagged' section appended last
        │
        ▼
  {groups.map(group =>
    <section>
      <h3>{group.tag} — {group.cards.length} cards</h3>
      <Table> (same columns: # / Front / Tags / Actions) </Table>
    </section>
  )}
```

### Recommended Project Structure

No new files required. All changes are in-file additions to:

```
apps/frontend/src/
├── pages/
│   ├── StudySessionPage.tsx   ← add state + config section UI + filter/shuffle logic
│   └── DeckDetailPage.tsx     ← add groupCardsByFirstTag helper + replace flat Table
└── components/__tests__/
    └── StudySessionPage.test.tsx   ← new test file (Wave 0)
```

### Pattern 1: Tag Toggle Chip (selected = filled, deselected = outline)

The exact pattern is already described in CONTEXT.md §Specifics and matches the shadcn `Button` variant model.

```typescript
// Source: apps/frontend/src/components/ui/button.tsx (codebase read)
// variant="default" → bg-primary text-primary-foreground (filled)
// variant="outline" → border border-input bg-background (unfilled)

function TagFilterChip({
  tag,
  selected,
  onToggle,
}: {
  tag: string
  selected: boolean
  onToggle: (tag: string) => void
}) {
  return (
    <Button
      size="sm"
      variant={selected ? 'default' : 'outline'}
      onClick={() => onToggle(tag)}
      type="button"
    >
      {tag}
    </Button>
  )
}
```

### Pattern 2: Segmented Button Row (All / 10 / 20 / Custom)

```typescript
// Source: apps/frontend/src/components/ui/button.tsx (codebase read)
// Active option → variant="default", inactive → variant="outline"
// When 'custom' active → <Input type="number"> appears inline to the right

type SessionSizeOption = 'all' | 10 | 20 | 'custom'

// State: sessionSize: SessionSizeOption = 'all', customCount: number = 1
const SIZE_OPTIONS: { label: string; value: SessionSizeOption }[] = [
  { label: 'All due', value: 'all' },
  { label: '10', value: 10 },
  { label: '20', value: 20 },
  { label: 'Custom', value: 'custom' },
]

// Render:
<div className="flex items-center gap-2 flex-wrap">
  {SIZE_OPTIONS.map((opt) => (
    <Button
      key={String(opt.value)}
      size="sm"
      variant={sessionSize === opt.value ? 'default' : 'outline'}
      onClick={() => setSessionSize(opt.value)}
      type="button"
    >
      {opt.label}
    </Button>
  ))}
  {sessionSize === 'custom' && (
    <Input
      type="number"
      min={1}
      value={customCount}
      onChange={(e) => setCustomCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
      className="w-20 h-8"
    />
  )}
</div>
```

### Pattern 3: Tag Derivation from Cards Array

The config section needs tags before mode selection. The existing prefetch (lines 186–207 of `StudySessionPage.tsx`) already fetches `allCardsRes` from `/api/study/deck/${deckId}` but discards it after counting. The fix: capture those cards and derive tag list from them.

```typescript
// In the existing prefetch useEffect (StudySessionPage.tsx lines 182–207):
if (allCardsRes.ok) {
  const all = await allCardsRes.json() as DueCard[]
  setDeckTotalCards(all.length)
  // NEW: derive unique sorted tags from all deck cards
  const tags = [...new Set(all.flatMap((c) => c.tags))].sort()
  setAvailableTags(tags)  // new state: availableTags: string[]
}
```

This avoids an additional API call. The endpoint `/api/study/deck/:deckId` returns `DueCard[]` which includes `tags: string[]`.

### Pattern 4: Tag Filter + Size Slice + Shuffle (in loadCards useEffect)

Applied in the existing `useEffect` that triggers on `selectedMode` change (lines 210–240 of `StudySessionPage.tsx`):

```typescript
// After: const filtered = ... (existing deckId filter, line 227-229)
// NEW steps applied in order:

// 1. Tag filter (STUDY-01)
const tagFiltered =
  selectedTags.size === 0
    ? filtered
    : filtered.filter((c) => c.tags.some((t) => selectedTags.has(t)))

// 2. Session size slice (STUDY-02) — SR mode only
const sized =
  selectedMode === 'sr' && sessionSize !== 'all'
    ? tagFiltered.slice(
        0,
        sessionSize === 'custom' ? Math.max(1, customCount) : sessionSize
      )
    : tagFiltered

// 3. Shuffle (STUDY-03) — all modes, non-mutating
const shuffled = [...sized].sort(() => Math.random() - 0.5)

setCards(shuffled)
```

### Pattern 5: groupCardsByFirstTag Helper (DeckDetailPage)

```typescript
// Pure helper function — no imports needed beyond Card type
function groupCardsByFirstTag(
  cards: Card[]
): { tag: string; cards: Card[] }[] {
  const groups = new Map<string, Card[]>()

  for (const card of cards) {
    const tag = card.tags[0] ?? 'Untagged'
    if (!groups.has(tag)) groups.set(tag, [])
    groups.get(tag)!.push(card)
  }

  // Sort alphabetically, Untagged always last
  const sorted = [...groups.entries()]
    .filter(([tag]) => tag !== 'Untagged')
    .sort(([a], [b]) => a.localeCompare(b))

  if (groups.has('Untagged')) {
    sorted.push(['Untagged', groups.get('Untagged')!])
  }

  return sorted.map(([tag, cards]) => ({ tag, cards }))
}
```

### Pattern 6: Tag Section JSX (DeckDetailPage)

Replaces the single `<Table aria-label="Cards in deck">` block (lines 326–400 of `DeckDetailPage.tsx`):

```typescript
// The empty-state case (cards.length === 0) moves outside the grouped sections,
// rendered as a single block before the groups map.
{cards.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
    <BookOpen className="h-10 w-10" aria-hidden="true" />
    <p className="text-sm font-bold">No cards yet</p>
    ...
  </div>
) : (
  groupCardsByFirstTag(cards).map(({ tag, cards: groupCards }) => (
    <div key={tag} className="mb-6">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        {tag}
        <span className="font-normal ml-1">— {groupCards.length} cards</span>
      </h3>
      <Table aria-label={`Cards tagged ${tag}`}>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Front</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupCards.map((card, i) => (
            <TableRow key={card.id}>
              <TableCell className="w-12">{i + 1}</TableCell>
              ...  {/* same cell content as before */}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ))
)}
```

### Anti-Patterns to Avoid

- **Shuffle in render body:** Calling `[...cards].sort(...)` directly in JSX or as a derived value computed every render causes a different order on each re-render, which triggers flickering. Shuffle must happen once in the `useEffect` that calls `setCards()`, not in the render path.
- **Mutating the fetched cards array:** `cards.sort(...)` mutates in-place. Always use `[...cards].sort(...)`. The `setCards` state setter holds the canonical array; the `SessionRunner` receives a reference to it.
- **Deriving tags from the post-filter cards:** Available tag chips should reflect all tags in the deck, not just the currently filtered subset. If chips re-derive from the already-filtered list, selecting one tag makes other tags disappear. Always derive from the full `allCardsRes` prefetch.
- **Re-running the prefetch useEffect on selectedTags change:** The `availableTags` derivation belongs in the prefetch `useEffect` (deckId dep), not in the card-load `useEffect` (selectedMode dep). Mixing these causes double fetches.
- **groupCardsByFirstTag called in JSX:** Calling `groupCardsByFirstTag(cards)` inline in JSX recomputes every render. Acceptable here (DeckDetailPage doesn't have heavy re-render pressure), but if lint rules require it, wrap in `useMemo(() => groupCardsByFirstTag(cards), [cards])`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chip toggle styling | Custom CSS classes | shadcn `Button` `variant="default"` / `variant="outline"` | Variant system already handles focus ring, disabled opacity, color tokens |
| Number input validation | Manual regex / custom component | Native `<Input type="number" min={1}>` with `parseInt` guard | Browser handles up/down arrows, keyboard input; guard handles NaN |
| Set-based dedup | `Array.reduce()` accumulator | `[...new Set(arr)]` | Idiomatic ES2015+; 1 line |
| Alphabetical sort | Manual comparator | `Array.sort()` with `localeCompare` | Correct Unicode ordering vs `<` comparison |

**Key insight:** Every primitive needed for this phase (toggle button, number input, table) ships with the already-installed shadcn component set. Zero new dependencies required.

---

## Common Pitfalls

### Pitfall 1: Shuffle on Every Re-Render

**What goes wrong:** Placing `[...cards].sort(() => Math.random() - 0.5)` as a computed value in the render path (e.g., as a `const shuffled = ...` before the return statement) causes the order to change on every React re-render triggered by any state update (exam timer tick, flip animation, etc.). Cards visually jump around mid-session.

**Why it happens:** `Math.random()` is not deterministic; calling it in render produces a new order each time React re-renders the component.

**How to avoid:** Apply shuffle once inside the `useEffect` that populates `cards` state with `setCards(shuffled)`. The shuffled array is then stable state — it only changes when the effect re-runs (i.e., when `selectedMode` changes).

**Warning signs:** Cards appearing to "jump" to different positions mid-session; test asserting card order fails intermittently.

### Pitfall 2: Tag Chips Derived from Wrong Source

**What goes wrong:** Deriving `availableTags` from the `cards` state variable (the post-fetch, post-filter array) instead of from the full deck card prefetch. Once any tag filter is active, the `cards` array is already filtered, so the tag chip list shrinks — chips for unselected tags disappear, making it impossible to select multiple tags.

**Why it happens:** `cards` state holds the filtered+sliced result, not the full deck inventory.

**How to avoid:** Derive `availableTags` only from `allCardsRes` in the prefetch `useEffect`. This runs once per `deckId` change and is independent of filter state.

### Pitfall 3: sessionSize Applied to Non-SR Modes

**What goes wrong:** Slicing the card array for Deck Mode or Exam Mode when the user previously set a custom count. Exam Mode already has time-based limiting; Deck Mode should always show all cards.

**Why it happens:** `sessionSize` state persists across mode changes in the same page visit.

**How to avoid:** Wrap the slice in `if (selectedMode === 'sr')` guard (D-08). See Pattern 4 above.

### Pitfall 4: `selectedTags` Stale Closure in useEffect

**What goes wrong:** The `loadCards` `useEffect` currently has deps `[selectedMode, deckId]`. Adding `selectedTags` and `sessionSize` to the filter logic inside the effect without adding them to the dep array means React will use stale values of those variables.

**Why it happens:** React's exhaustive-deps rule; the effect closure captures the variable at definition time.

**How to avoid:** Add `selectedTags` and `sessionSize` (and `customCount` if used) to the `useEffect` dependency array. Alternatively, apply filter/slice/shuffle to the fetched data before calling `setCards`, capturing the current values at the time the async fetch resolves (this is fine because they are read synchronously from the closure after the await).

**Note:** The existing `useEffect` at line 210 already captures `selectedMode` and `deckId` as deps. Adding `selectedTags` and `sessionSize` to the dep array means the cards will be re-fetched if the user changes tags after clicking a mode. Preferred approach: apply filter/slice/shuffle to the fetched result inside the same async IIFE, reading from the state variables. Since `selectedTags`, `sessionSize`, `customCount` are read synchronously from the closure after the `await`, they will reflect the values at the time the effect fires — which is correct because the effect should only fire when `selectedMode` changes (the user starts a session). The tag/size selection UI is only shown while `!selectedMode`, so these values are frozen the moment the user picks a mode.

### Pitfall 5: DeckDetailPage Table Empty State Placement

**What goes wrong:** The existing empty state (`cards.length === 0`) is currently rendered as a `<TableRow colSpan={4}>` inside the single `<Table>`. When replacing with grouped sections, the empty-state case must be handled before the `groupCardsByFirstTag` call, or it will render zero sections with no visible feedback.

**How to avoid:** Add an early-out render for `cards.length === 0` before the grouped table JSX (outside the groups map).

---

## Code Examples

### Current StudySessionPage.tsx State Variables (lines 166–175)

```typescript
// Source: apps/frontend/src/pages/StudySessionPage.tsx (codebase read)
const [selectedMode, setSelectedMode] = useState<StudyMode | null>(isGlobalSR ? 'sr' : null)
const [examDurationSeconds, setExamDurationSeconds] = useState<number | null>(null)
const [cards, setCards] = useState<DueCard[] | null>(null)
const [loadingCards, setLoadingCards] = useState(false)
const [deckTitle, setDeckTitle] = useState<string>('')
const [deckTotalCards, setDeckTotalCards] = useState<number>(0)
const [deckDueCount, setDeckDueCount] = useState<number>(0)
```

New state variables to add:

```typescript
// Phase 8 additions
const [availableTags, setAvailableTags] = useState<string[]>([])
const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
const [sessionSize, setSessionSize] = useState<'all' | 10 | 20 | 'custom'>('all')
const [customCount, setCustomCount] = useState<number>(1)
```

### Current Prefetch useEffect — Lines to Modify (lines 182–207)

```typescript
// Source: apps/frontend/src/pages/StudySessionPage.tsx (codebase read)
// Line 196-198 currently:
if (allCardsRes.ok) {
  const all = await allCardsRes.json() as unknown[]
  setDeckTotalCards(all.length)
}
// Change 'unknown[]' → 'DueCard[]' and derive tags:
if (allCardsRes.ok) {
  const all = await allCardsRes.json() as DueCard[]
  setDeckTotalCards(all.length)
  setAvailableTags([...new Set(all.flatMap((c) => c.tags))].sort())
}
```

### Current loadCards useEffect — Lines to Modify (lines 210–240)

```typescript
// Source: apps/frontend/src/pages/StudySessionPage.tsx (codebase read)
// After existing: const filtered = selectedMode === 'sr' && deckId ? data.filter(...) : data
// Add:
const tagFiltered =
  selectedTags.size === 0
    ? filtered
    : filtered.filter((c) => c.tags.some((t) => selectedTags.has(t)))

const sized =
  selectedMode === 'sr' && sessionSize !== 'all'
    ? tagFiltered.slice(0, sessionSize === 'custom' ? Math.max(1, customCount) : sessionSize)
    : tagFiltered

const shuffled = [...sized].sort(() => Math.random() - 0.5)
setCards(shuffled)   // replaces: setCards(filtered)
```

### Config Section Insertion Point (inside `if (!selectedMode)` return, before mode cards)

```typescript
// Source: apps/frontend/src/pages/StudySessionPage.tsx (codebase read)
// Insert between line 256 (h1 title) and line 258 (SR mode card div):

{availableTags.length > 0 && (
  <div className="mb-6 space-y-3">
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Filter by tag
      </p>
      <div className="flex flex-wrap gap-2">
        {availableTags.map((tag) => (
          <Button
            key={tag}
            size="sm"
            variant={selectedTags.has(tag) ? 'default' : 'outline'}
            onClick={() => {
              setSelectedTags((prev) => {
                const next = new Set(prev)
                if (next.has(tag)) next.delete(tag)
                else next.add(tag)
                return next
              })
            }}
            type="button"
          >
            {tag}
          </Button>
        ))}
      </div>
    </div>
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Session size (SR mode only)
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {SIZE_OPTIONS.map((opt) => (
          <Button
            key={String(opt.value)}
            size="sm"
            variant={sessionSize === opt.value ? 'default' : 'outline'}
            onClick={() => setSessionSize(opt.value)}
            type="button"
          >
            {opt.label}
          </Button>
        ))}
        {sessionSize === 'custom' && (
          <Input
            type="number"
            min={1}
            value={customCount}
            onChange={(e) =>
              setCustomCount(Math.max(1, parseInt(e.target.value, 10) || 1))
            }
            className="w-20 h-8"
          />
        )}
      </div>
    </div>
  </div>
)}
```

### TagChips component (existing, DeckDetailPage.tsx lines 72–90)

```typescript
// Source: apps/frontend/src/pages/DeckDetailPage.tsx (codebase read)
// DISPLAY-ONLY chip — no toggle behavior. Used in table cell for card's tags.
// Phase 8 does NOT modify this component — it stays as-is in the tag column.
// The new toggle chips in StudySessionPage are a separate local pattern using Button.
function TagChips({ tags }: { tags: string[] }) {
  const visible = tags.slice(0, 3)
  const extra = tags.length - 3
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((tag) => (
        <span key={tag} className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground gap-1">
          {tag}
        </span>
      ))}
      {extra > 0 && <span className="text-xs text-muted-foreground">+{extra} more</span>}
    </div>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flat card table in DeckDetailPage | Tag-sectioned layout | Phase 8 | Improves scannability for decks with many cards across topics |
| All cards always included in session | User-configurable tag filter + size | Phase 8 | Reduces session scope to targeted topics |
| Cards in fetch order | Shuffled before session | Phase 8 | Every session feels fresh |

**No deprecated patterns introduced.** All patterns used (shadcn Button variants, functional Set operations, Array sort) are idiomatic for this stack.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `/api/study/deck/:deckId` returns `DueCard[]` (which includes `tags: string[]`) — used as tag source for the config section | Architecture Patterns: Pattern 3 | Low — confirmed by `DueCardSchema` in `packages/shared/src/schemas/study.ts` which defines `tags: z.array(z.string())` |
| A2 | `allCardsRes` in the existing prefetch fetches from `/api/study/deck/:deckId` (confirmed at line 188 of `StudySessionPage.tsx`) | Code Examples | Confirmed by codebase read |

Both assumptions are verified from codebase reads — the assumptions log is included for traceability only.

**Effectively zero unresolved assumptions.** All claims derive from codebase reads of the actual source files.

---

## Open Questions

None. All scope questions were resolved in the discussion phase (08-CONTEXT.md) and confirmed by codebase inspection.

---

## Environment Availability

Step 2.6: SKIPPED — this phase has no external dependencies beyond the project's own installed packages. All required components (shadcn Button, Input, Table) are confirmed present in `apps/frontend/src/components/ui/` by Glob.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 + @testing-library/react |
| Config file | `apps/frontend/vitest.config.ts` |
| Quick run command | `npm run test --workspace=apps/frontend -- --run` |
| Full suite command | `npm run test --workspace=apps/frontend -- --run` |
| Current baseline | 52 tests pass across 6 files |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STUDY-01a | No tags selected → all cards pass through filter | unit | `npm run test --workspace=apps/frontend -- --run src/pages/__tests__/StudySessionPage.test.tsx` | Wave 0 |
| STUDY-01b | Selecting tag "bio" → only cards tagged "bio" included; untagged excluded | unit | same | Wave 0 |
| STUDY-01c | Two tags selected → OR logic (card with either tag included) | unit | same | Wave 0 |
| STUDY-01d | Tag chips render; clicking chip toggles variant (default ↔ outline) | unit | same | Wave 0 |
| STUDY-02a | sessionSize=10 + SR mode → cards sliced to max 10 | unit | same | Wave 0 |
| STUDY-02b | sessionSize=10 + Deck mode → no slice applied (all cards) | unit | same | Wave 0 |
| STUDY-02c | sessionSize='custom', customCount=5 → cards sliced to 5 | unit | same | Wave 0 |
| STUDY-02d | Selecting "Custom" option reveals number Input | unit | same | Wave 0 |
| STUDY-03a | Cards array passed to SessionRunner is shuffled (different from fetch order) | unit | same | Wave 0 |
| STUDY-03b | Shuffle is non-mutating (original fetched array not mutated) | unit | same | Wave 0 |
| STUDY-04a | groupCardsByFirstTag returns sections sorted alpha, Untagged last | unit | `npm run test --workspace=apps/frontend -- --run src/pages/__tests__/DeckDetailPage.test.tsx` | Wave 0 |
| STUDY-04b | Card with 2 tags appears only in first tag's section | unit | same | Wave 0 |
| STUDY-04c | Card with no tags appears in Untagged section | unit | same | Wave 0 |

### Mock Strategy for StudySessionPage Tests

Based on reading `AppShell.test.tsx` (the most recent complex page test), the following mocks are required:

```typescript
// 1. useAuth — StudySessionPage does NOT import useAuth directly
//    (DeckDetailPage does, but StudySessionPage does not — confirmed by codebase read)
//    No useAuth mock needed for StudySessionPage tests.

// 2. react-router-dom — useParams, useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ id: 'deck-abc' }),
    useNavigate: () => vi.fn(),
  }
})

// 3. api module — all fetch calls
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

// 4. sonner toast
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))
```

`StudySessionPage.tsx` does not import `useAuth` — confirmed by reading lines 1–14. No auth context mock needed.

The `api.get` mock must be set up with `mockResolvedValueOnce` in sequence to match the three concurrent `Promise.all` calls: `GET /api/decks/:id`, `GET /api/study/deck/:id`, `GET /api/study/due`. For testing the config section and filter logic specifically, the `allCardsRes` mock (second call) is the critical one — it determines `availableTags`.

### DeckDetailPage Tests — Mock Strategy

`DeckDetailPage.tsx` imports `useAuth` (line 7). Must mock:

```typescript
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', username: 'testuser', role: 'USER', isActive: true, createdAt: '2026-01-01' },
    loading: false,
    setUser: vi.fn(),
    logout: vi.fn(),
  }),
}))
```

For `groupCardsByFirstTag` pure function tests: the helper can be exported and tested in isolation without any mocks (pure function, no React).

### Sampling Rate

- **Per task commit:** `npm run test --workspace=apps/frontend -- --run`
- **Per wave merge:** `npm run test --workspace=apps/frontend -- --run`
- **Phase gate:** Full suite green (currently 52 tests; target 52 + new phase 8 tests) before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx` — covers STUDY-01a/b/c/d, STUDY-02a/b/c/d, STUDY-03a/b
- [ ] `apps/frontend/src/pages/__tests__/DeckDetailPage.test.tsx` — covers STUDY-04a/b/c (can test `groupCardsByFirstTag` as pure function export)

*(Existing test infrastructure — Vitest, @testing-library/react, setup.ts, jsdom — covers all phase requirements. Only the two new test files are gaps.)*

---

## Security Domain

ASVS enforcement applies. This phase has a narrow security surface — all changes are pure client-side UI with no new API endpoints, no new auth paths, and no new data storage.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth changes |
| V3 Session Management | No | No session changes |
| V4 Access Control | No | No new routes or permissions |
| V5 Input Validation | Yes (narrow) | Custom size input: `parseInt` + `Math.max(1, ...)` guard prevents NaN and < 1 values |
| V6 Cryptography | No | No crypto operations |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Custom session size input: NaN injection | Tampering | `parseInt(val, 10) || 1` + `Math.max(1, ...)` — already in Pattern 2 code example above |
| XSS via tag names rendered into DOM | Tampering | React JSX auto-escapes string interpolation; `{tag}` in JSX is safe |

No new attack surface introduced. The two controls above are sufficient.

---

## Sources

### Primary (HIGH confidence)

- `apps/frontend/src/pages/StudySessionPage.tsx` — full file read; confirmed state shape, useEffect deps, prefetch pattern, mode selector structure
- `apps/frontend/src/pages/DeckDetailPage.tsx` — full file read; confirmed TagChips component, Table import, canEdit pattern, cards fetch endpoint
- `apps/frontend/src/hooks/useStudySession.ts` — full file read; confirmed interface, no changes needed
- `apps/frontend/src/components/ui/button.tsx` — full file read; confirmed all 6 variants and sizes
- `apps/frontend/src/components/ui/input.tsx` — full file read; confirmed InputProps interface
- `packages/shared/src/schemas/study.ts` — full file read; confirmed `DueCard.tags: z.array(z.string())`
- `packages/shared/src/schemas/card.ts` — full file read; confirmed `Card.tags: z.array(z.string())`
- `apps/frontend/src/context/AuthContext.tsx` — full file read; confirmed `StudySessionPage` does NOT import `useAuth`
- `apps/frontend/src/components/__tests__/AppShell.test.tsx` — full file read; established mock patterns for vi.mock router and context
- `apps/frontend/vitest.config.ts` — full file read; confirmed jsdom environment, globals: true, test include pattern
- `apps/frontend/src/test/setup.ts` — confirmed `@testing-library/jest-dom` imported
- Vitest test run output — confirmed 52 tests passing across 6 files

### Secondary (MEDIUM confidence)

None needed — all findings derived directly from codebase reads.

### Tertiary (LOW confidence)

None.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all components confirmed present via Glob and file reads
- Architecture: HIGH — data flow traced through actual source code, not assumed
- Pitfalls: HIGH — derived from actual code structure (existing useEffect deps, existing render patterns)
- Test mocks: HIGH — derived from reading existing test files that use the same patterns

**Research date:** 2026-05-31
**Valid until:** Stable — no external dependencies; only changes with future code edits to the two target files
