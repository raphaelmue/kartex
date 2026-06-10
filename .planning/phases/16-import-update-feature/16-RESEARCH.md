# Phase 16: Import Update Feature - Research

**Researched:** 2026-06-10
**Domain:** File upload, diff algorithm, Prisma interactive transaction, React modal state machine
**Confidence:** HIGH

---

## Summary

Phase 16 delivers the import-update flow: an owner uploads a new `.kartex` file against an existing deck, sees a diff preview (added / updated / unchanged / removed card counts), toggles whether absent cards are deleted, then commits the apply. The design is stateless — the file is uploaded twice (preview POST, then apply POST), and the diff is recomputed server-side on apply to prevent TOCTOU.

All infrastructure dependencies are already in place from Phase 14: `Card.kartexId` column exists with the `@@unique([deckId, kartexId])` constraint, `parseKartex` returns `id` on `ParsedCard`, and `DeckUpdatePreviewSchema` / `DeckUpdateResultSchema` are exported from `packages/shared`. The Hono route pattern (multipart body parsing via `c.req.parseBody()`, `bodyLimit` middleware, owner auth check) is established in `apps/backend/src/routes/import.ts`. The frontend Dialog + Switch + api.postForm patterns are established in `CardEditorModal.tsx`, `DeckFormModal.tsx`, and `useImport.ts`.

The main implementation risk is the DeckDetailPage file-size constraint: it is already 558 lines, exceeding the 500-line limit from CLAUDE.md. The DeckUpdateModal must be extracted as a separate component in `apps/frontend/src/components/DeckUpdateModal.tsx` — embedding it inline would push the page file further over the limit.

**Primary recommendation:** Two new backend routes added to a new `apps/backend/src/routes/deckUpdate.ts` file, mounted under the existing decks router. One new frontend component `DeckUpdateModal.tsx`. DeckDetailPage gains only a hidden file input + button (roughly 20 lines net).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| File upload acceptance (multipart) | API / Backend | — | Server parses body, validates file, enforces auth |
| Diff computation (added/updated/unchanged/removed) | API / Backend | — | Stateless design — diff must be reproducible server-side on apply |
| kartexId card matching | API / Backend | — | Requires DB read; client has no DB access |
| Apply transaction (create/update/delete) | API / Backend | — | Prisma interactive transaction; database is the source of truth |
| Preview modal UI (diff counts, toggle, confirm) | Browser / Client | — | Local React state; no round-trip until user clicks Apply |
| File picker trigger | Browser / Client | — | Hidden `<input type="file">` ref; owner-only conditional render |
| keepRemoved toggle state | Browser / Client | — | Local modal state; sent to backend on Apply POST |
| Auth guard (owner-only) | API / Backend | Frontend (button visibility) | Backend is authoritative; frontend hides button as UX convenience |

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IMP-01 | User can upload a `.kartex` file from the Deck Detail page to update an existing deck | Hidden file input on DeckDetailPage (owner-only conditional), triggers DeckUpdateModal |
| IMP-02 | A preview modal shows diff counts (added/updated/unchanged/removed) before any commit | DeckUpdateModal with two-phase state: uploading→previewing; diff from POST /preview response |
| IMP-03 | Cards matched by kartexId are updated in place (content refreshed, SM-2 preserved) | Backend: card.update({ frontContent, backContent, tags }) — never touch CardProgress; kartexId string equality match |
| IMP-04 | Cards in file but absent in deck are added as new cards | Backend: tx.card.createMany for "added" bucket, including kartexId |
| IMP-05 | Cards in deck but absent in file listed as "removed" in preview | Backend diff: deck cards not matched by any file card kartexId |
| IMP-06 | "Keep removed cards" toggle (default on); when off, absent cards are deleted on apply | keepRemoved boolean in apply request body; tx.card.deleteMany when false |
</phase_requirements>

---

## Standard Stack

### Core (all already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Hono | existing | New POST routes in deckUpdate.ts | Same pattern as import.ts and stats.ts |
| `hono/body-limit` | existing | Enforce MAX_UPLOAD_BYTES on preview/apply | Already used in import.ts |
| Prisma Client | existing | Interactive transaction for apply | `prisma.$transaction(async tx => {...})` established pattern |
| `@kartex/shared` | existing | `parseKartex`, `DeckUpdatePreviewSchema`, `DeckUpdateResultSchema`, `ParsedCardSchema` | Single source of truth |
| React + shadcn/ui Dialog | existing | DeckUpdateModal | Dialog pattern from CardEditorModal.tsx |
| shadcn/ui Switch | existing | keepRemoved toggle | Already installed; used in DeckDetailPage toggle |
| react-i18next | existing | All new UI strings | Established i18n pattern |

**No new packages required.** [VERIFIED: codebase grep — all dependencies present]

### Package Legitimacy Audit

No new packages are introduced in this phase. This section is not applicable.

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (DeckDetailPage)
  │
  ├─ "Update from file" button (owner-only, deck.ownerId === user.id)
  │    └─ triggers hidden <input type="file" accept=".kartex">
  │         └─ onChange → opens DeckUpdateModal with File object
  │
DeckUpdateModal (state: idle|uploading|previewing|applying|done|error)
  │
  ├─ UPLOAD PHASE: api.postForm('/api/decks/:id/update/preview', formData)
  │    └─ formData: { file: File }
  │    └─ Response: { added, updated, unchanged, removed }  ← DeckUpdatePreviewSchema
  │
  ├─ PREVIEW PHASE: show diff counts + keepRemoved Switch (default: true)
  │    └─ user clicks "Apply" → APPLY PHASE
  │
  └─ APPLY PHASE: api.postForm('/api/decks/:id/update/apply', formData)
       └─ formData: { file: File, keepRemoved: 'true'|'false' }
       └─ Response: { added, updated, unchanged, removed, deckId } ← DeckUpdateResultSchema
       └─ on success: toast.success + onSuccess() callback + close modal

Backend POST /api/decks/:id/update/preview
  ├─ Auth: userId from JWT middleware (inherited from index.ts step 4)
  ├─ Owner check: deck.ownerId === userId → 403 if not owner
  ├─ bodyLimit middleware (MAX_BYTES)
  ├─ parseBody() → file instanceof File → validate .kartex extension
  ├─ parseKartex(text) → ParsedCard[] with optional id fields
  ├─ Load existing deck cards: prisma.card.findMany({ where: { deckId } })
  ├─ computeDiff(fileCards, deckCards) → { added, updated, unchanged, removed }
  └─ return DeckUpdatePreviewSchema shape (200)

Backend POST /api/decks/:id/update/apply
  ├─ Auth + owner check (same as preview)
  ├─ bodyLimit + parse + validate (re-compute — stateless design)
  ├─ computeDiff again (TOCTOU prevention)
  ├─ keepRemoved = body['keepRemoved'] === 'true'
  └─ prisma.$transaction(async tx => {
       tx.card.createMany(added cards)         // IMP-04
       for (card of updatedCards) tx.card.update(...)  // IMP-03 (individual updates)
       if (!keepRemoved) tx.card.deleteMany(removedIds) // IMP-06
     })
  └─ return DeckUpdateResultSchema shape (200)
```

### Recommended Project Structure

```
apps/backend/src/routes/
├── deckUpdate.ts           ← NEW: POST /:id/update/preview + /:id/update/apply
├── decks.ts                ← Add: import + mount deckUpdateRouter
└── ...

apps/frontend/src/components/
├── DeckUpdateModal.tsx     ← NEW: Dialog with two-phase UI
└── ...

apps/frontend/src/pages/
├── DeckDetailPage.tsx      ← EDIT: add hidden file input + button (owner-only, ~20 lines)
└── ...

apps/frontend/src/locales/
├── en.json                 ← EDIT: add deckUpdate.* keys
└── de.json                 ← EDIT: add deckUpdate.* keys (same commit)
```

### Pattern 1: Backend multipart route with owner auth check

Established in `import.ts`. The new routes follow the same structure:

```typescript
// Source: apps/backend/src/routes/import.ts (verified)
deckUpdateRouter.post(
  '/:id/update/preview',
  bodyLimit({
    maxSize: MAX_BYTES,
    onError: (c) => c.json({ error: `File too large.` }, 413),
  }),
  async (c) => {
    const { id: deckId } = c.req.param()
    const userId = c.get('userId')

    // Owner-only gate (v1.3-research decision)
    const deck = await prisma.deck.findUnique({ where: { id: deckId } })
    if (!deck) return c.json({ error: 'Not found.' }, 404)
    if (deck.ownerId !== userId) return c.json({ error: 'Forbidden.' }, 403)

    const body = await c.req.parseBody()
    const file = body['file']
    if (!(file instanceof File)) return c.json({ error: 'File is required.' }, 400)

    const normalizedName = file.name.replace(/\\/g, '/')
    if (!normalizedName.endsWith('.kartex')) {
      return c.json({ error: 'File must be a .kartex file.' }, 400)
    }

    const text = Buffer.from(await file.arrayBuffer()).toString('utf-8')
    const parseResult = parseKartex(text)
    if ('fatal' in parseResult) return c.json({ error: parseResult.message }, 422)

    // Load deck cards
    const deckCards = await prisma.card.findMany({ where: { deckId } })
    const diff = computeDiff(parseResult.cards, deckCards)

    return c.json(diff, 200)
  },
)
```

### Pattern 2: Diff computation (pure function)

```typescript
// Source: design (verified against Card schema — kartexId: String? field exists)
type DiffResult = { added: number; updated: number; unchanged: number; removed: number }
type DiffDetail = {
  addedCards: ParsedCard[]
  updatedCards: { fileCard: ParsedCard; deckCard: { id: string } }[]
  unchangedCards: ParsedCard[]
  removedIds: string[]
}

function computeDiff(
  fileCards: ParsedCard[],
  deckCards: { id: string; kartexId: string | null; frontContent: string; backContent: string; tags: string[] }[],
): DiffResult & DiffDetail {
  // Build lookup: kartexId → deckCard
  // Cards with kartexId=null are unmatchable — always "added" if they appear in the file without id
  const deckByKartexId = new Map<string, typeof deckCards[number]>()
  for (const dc of deckCards) {
    if (dc.kartexId) deckByKartexId.set(dc.kartexId, dc)
  }

  const addedCards: ParsedCard[] = []
  const updatedCards: { fileCard: ParsedCard; deckCard: typeof deckCards[number] }[] = []
  const unchangedCards: ParsedCard[] = []
  const matchedDeckCardIds = new Set<string>()

  for (const fc of fileCards) {
    if (!fc.id) {
      // No kartexId in file card — treat as new (always added)
      addedCards.push(fc)
      continue
    }
    const existing = deckByKartexId.get(fc.id)
    if (!existing) {
      addedCards.push(fc)
    } else {
      matchedDeckCardIds.add(existing.id)
      const changed =
        existing.frontContent !== fc.front ||
        existing.backContent !== fc.back ||
        JSON.stringify([...existing.tags].sort()) !== JSON.stringify([...fc.tags].sort())
      if (changed) {
        updatedCards.push({ fileCard: fc, deckCard: existing })
      } else {
        unchangedCards.push(fc)
      }
    }
  }

  // Removed: deck cards not matched by any file card
  const removedIds = deckCards
    .filter((dc) => !matchedDeckCardIds.has(dc.id))
    .map((dc) => dc.id)

  return {
    added: addedCards.length,
    updated: updatedCards.length,
    unchanged: unchangedCards.length,
    removed: removedIds.length,
    addedCards,
    updatedCards,
    unchangedCards,
    removedIds,
  }
}
```

**Tag comparison note:** Tags are order-independent arrays. Use `JSON.stringify([...tags].sort())` for equality — a tag reordering must not count as an "update". [ASSUMED — reasonable default; user should confirm if order-sensitive tags are desired]

### Pattern 3: Prisma interactive transaction for apply

```typescript
// Source: apps/backend/src/routes/decks.ts fork handler (verified)
// card.updateMany cannot be used here — each card has different data (v1.3-research decision)
await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
  // IMP-04: new cards
  if (diff.addedCards.length > 0) {
    await tx.card.createMany({
      data: diff.addedCards.map((fc) => ({
        deckId,
        frontContent: fc.front,
        backContent: fc.back,
        tags: fc.tags,
        kartexId: fc.id ?? null,
      })),
    })
  }

  // IMP-03: updated cards — individual update calls (never touch CardProgress)
  for (const { fileCard, deckCard } of diff.updatedCards) {
    await tx.card.update({
      where: { id: deckCard.id },
      data: {
        frontContent: fileCard.front,
        backContent: fileCard.back,
        tags: fileCard.tags,
        // kartexId: intentionally not updated — it is the match key
      },
    })
  }

  // IMP-06: remove absent cards when keepRemoved=false
  if (!keepRemoved && diff.removedIds.length > 0) {
    await tx.card.deleteMany({
      where: { id: { in: diff.removedIds } },
    })
  }
})
```

### Pattern 4: Frontend file input + modal trigger

```typescript
// Source: apps/frontend/src/pages/ImportPage.tsx (verified)
const updateFileInputRef = useRef<HTMLInputElement>(null)

// Hidden file input — owner-only conditional in JSX
<input
  ref={updateFileInputRef}
  type="file"
  accept=".kartex"
  className="sr-only"
  aria-hidden="true"
  onChange={(e) => {
    const file = e.target.files?.[0]
    if (file) setUpdateFile(file)   // triggers modal open
    e.target.value = ''  // reset so same file can be re-selected
  }}
/>

// Trigger button (inside owner-only block)
{deck.ownerId === user?.id && (
  <Button
    size="sm"
    variant="outline"
    onClick={() => updateFileInputRef.current?.click()}
  >
    {t('deckUpdate.updateFromFile')}
  </Button>
)}
```

### Pattern 5: DeckUpdateModal state machine

States: `idle | uploading | previewing | applying | done | error`

```typescript
// Source: based on useImport hook pattern (verified apps/frontend/src/hooks/useImport.ts)
// Modal is opened by parent (DeckDetailPage) passing the selected File
// Modal manages its own fetch lifecycle

interface DeckUpdateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deckId: string
  file: File | null      // set by parent when file is selected
  onSuccess: () => void  // callback to refresh card list
}
```

**State transitions:**
- `open=true && file != null` → auto-trigger preview fetch → `uploading`
- Preview fetch success → `previewing` (show diff counts)
- Preview fetch error → `error` (show error message, offer close)
- User clicks Apply → `applying`
- Apply fetch success → `done` (toast + onSuccess + close)
- Apply fetch error → `error` (stay open, show error)
- User clicks Cancel / close → `idle`, clear file

**Why not a custom hook?** The modal is the only consumer; extracting a hook adds file overhead for no reuse benefit. Follow the DeckFormModal inline pattern.

### Anti-Patterns to Avoid

- **Storing server-side session between preview and apply:** Stateless is correct — file re-uploaded on apply. Do not add a session token or preview cache. [VERIFIED: v1.3-research decision]
- **Using card.updateMany for content updates:** Does not support different data per record. Use individual `tx.card.update` calls inside the transaction. [VERIFIED: v1.3-research decision]
- **Modifying CartProgress in the apply transaction:** The entire value of IMP-03 is that SM-2 progress is preserved. Never include `CardProgress` in the update data. [VERIFIED: schema — CardProgress is a separate model with @@unique([userId, cardId])]
- **Treating tag order as significant in diff:** Tags are arrays stored as PostgreSQL `String[]`. Sort before comparing to avoid false "updated" classifications.
- **kartexId case sensitivity:** String equality is case-sensitive in PostgreSQL by default. The diff algorithm must use exact string equality — no normalisation. [ASSUMED — reasonable; kartexId values are author-controlled]
- **Skipping the uniqueness conflict on createMany:** If a file has two cards with the same `id:` value and that id already exists in the deck, the second card in "added" bucket would hit the `@@unique([deckId, kartexId])` constraint. Handle: deduplicate file cards by kartexId before diffing (first occurrence wins), or return a 422 if duplicate ids found in file.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multipart body parsing | Custom stream parser | `c.req.parseBody()` (Hono built-in) | Already proven in import.ts |
| Request body size limit | Manual size check | `bodyLimit` from `hono/body-limit` | Intercepts before parseBody(); must be first in handler chain |
| File type detection for kartex | MIME header check | Extension check `.endsWith('.kartex')` | .kartex files have no standard MIME type; extension check is sufficient (this is not media upload) |
| Modal UI | Custom overlay | shadcn/ui `Dialog` | Already installed; consistent with CardEditorModal and DeckFormModal |
| Toggle UI | Custom checkbox/switch | shadcn/ui `Switch` | Already installed in ui/switch.tsx |

---

## Common Pitfalls

### Pitfall 1: bodyLimit must be first in handler chain

**What goes wrong:** If `bodyLimit` is registered after `c.req.parseBody()` runs, the body has already been consumed and the size limit is never enforced.
**Why it happens:** Hono middleware runs in registration order.
**How to avoid:** Register `bodyLimit(...)` as the first argument in the route handler array, before the `async (c) => {...}` handler. See `import.ts` line 46–52 for the exact pattern.
**Warning signs:** 413 response never fires on large uploads.

### Pitfall 2: `Card.kartexId` uniqueness constraint violation on apply

**What goes wrong:** If the uploaded file contains two cards with the same `id:` value, `tx.card.createMany` for the "added" bucket may insert a duplicate `kartexId` for the deck, violating `@@unique([deckId, kartexId])`.
**Why it happens:** The parser accepts duplicate ids (Phase 14 Test 3 confirmed this by design). Uniqueness is enforced at the DB level, not parser level.
**How to avoid:** Before diffing, deduplicate file cards by `id` value — first occurrence wins. Or return a 422 error with a clear message: "Duplicate id values in file."
**Warning signs:** Prisma throws a P2002 (unique constraint violation) inside the transaction.

### Pitfall 3: DeckDetailPage exceeds 500 lines

**What goes wrong:** The DeckDetailPage is already 558 lines (above the 500-line limit in CLAUDE.md). Adding the modal inline would push it further over the limit.
**Why it happens:** CLAUDE.md enforces a 500-line file size convention.
**How to avoid:** Extract `DeckUpdateModal` as a separate component in `apps/frontend/src/components/DeckUpdateModal.tsx`. DeckDetailPage adds only the hidden file input, a `useState<File | null>(null)` for the selected update file, and the button — approximately 20 net lines.
**Warning signs:** File line count over 500 after edits.

### Pitfall 4: File input reset for re-selection

**What goes wrong:** If `e.target.value = ''` is omitted in the `onChange` handler, selecting the same file a second time does not trigger `onChange`.
**Why it happens:** Browser does not fire `change` when the selected file is the same path.
**How to avoid:** Add `e.target.value = ''` after reading `e.target.files?.[0]`. See `ImportPage.tsx` `handleFileInputChange` for the exact pattern.

### Pitfall 5: `api.post` sends JSON, not FormData

**What goes wrong:** Using `api.post(url, body)` serialises `body` as JSON. File objects cannot be JSON-serialised.
**Why it happens:** `api.post` in `apps/frontend/src/lib/api.ts` calls `JSON.stringify(body)`.
**How to avoid:** Use `api.postForm(url, formData)` which sets `body: formData` (FormData), allowing the browser to set the correct `multipart/form-data` Content-Type automatically. See `useImport.ts` `submitImport` for the pattern.

### Pitfall 6: keepRemoved must be sent as a string in FormData

**What goes wrong:** `formData.append('keepRemoved', true)` — TypeScript accepts it but FormData serialises booleans as strings (`"true"` / `"false"`). The backend must read `body['keepRemoved'] === 'true'`, not `=== true`.
**Why it happens:** FormData values are always strings.
**How to avoid:** `formData.append('keepRemoved', String(keepRemoved))`. Backend: `const keepRemoved = body['keepRemoved'] !== 'false'` (default-true if missing).

### Pitfall 7: .kartex.zip files not accepted for deck update

**What goes wrong:** The existing ImportPage accepts `.kartex.zip` bundles. The deck-update flow only supports plain `.kartex` files (no media assets in update scope for v1.3).
**Why it happens:** Update-with-media is a future feature (IMP-F01 and beyond).
**How to avoid:** `accept=".kartex"` on the hidden file input (not `.kartex.zip`). Backend validates extension and rejects zip with a clear message.

### Pitfall 8: Preview response shape used as apply body

**What goes wrong:** The diff detail (addedCards, updatedCards arrays) from the preview is large and should never be sent back from frontend to backend as the apply "body". The apply endpoint recomputes the diff from the raw file.
**Why it happens:** Stateless design — file is the canonical input.
**How to avoid:** Apply endpoint accepts only `{ file: File, keepRemoved: boolean }`. It recomputes diff internally. Preview response only returns summary counts (DeckUpdatePreviewSchema shape).

### Pitfall 9: Route mounting — deckUpdateRouter must be mounted before decks.ts handlers

**What goes wrong:** Hono route matching is first-match-wins within a router. If the new update routes are appended to `decks.ts` after the existing `/:id` GET handler, they may conflict.
**Why it happens:** The existing `decks.get('/:id', ...)` could shadow `/:id/update/preview` if the router matches the prefix.
**How to avoid:** Mount `deckUpdateRouter` in `decks.ts` via `decks.route('/:deckId', deckUpdateRouter)` — sub-router path `/update/preview` does not conflict with Hono's parameter routing. Alternatively, keep the update routes in a separate file and mount in `index.ts` at `/api/decks`. The separate-file approach is cleaner and keeps `decks.ts` under 300 lines.

---

## Backend Route Registration

The new routes should live in `apps/backend/src/routes/deckUpdate.ts` and be mounted in `index.ts`:

```typescript
// In apps/backend/src/index.ts — after existing /api/decks mount
import { deckUpdateRouter } from './routes/deckUpdate.js'
app.route('/api/decks', deckUpdateRouter)
```

The `deckUpdateRouter` handles `POST /:id/update/preview` and `POST /:id/update/apply`. This avoids growing `decks.ts` (currently 298 lines) further and keeps concerns separated.

**Auth:** Both routes inherit `authMiddleware` from index.ts step 4. Owner check is performed inside each handler via direct Prisma query (`deck.ownerId !== userId → 403`).

---

## i18n Keys

All new keys must be added to **both** `en.json` and `de.json` in the same commit (v1.3-research decision, 10-05 decision).

Proposed namespace: `deckUpdate.*`

| Key | en value | de value |
|-----|----------|---------|
| `deckUpdate.updateFromFile` | "Update from file" | "Aus Datei aktualisieren" |
| `deckUpdate.modalTitle` | "Update Deck from File" | "Deck aus Datei aktualisieren" |
| `deckUpdate.uploading` | "Uploading..." | "Hochladen..." |
| `deckUpdate.previewHeading` | "Changes preview" | "Änderungsvorschau" |
| `deckUpdate.added` | "{{count}} added" | "{{count}} hinzugefügt" |
| `deckUpdate.updated` | "{{count}} updated" | "{{count}} aktualisiert" |
| `deckUpdate.unchanged` | "{{count}} unchanged" | "{{count}} unverändert" |
| `deckUpdate.removed` | "{{count}} removed" | "{{count}} entfernt" |
| `deckUpdate.keepRemovedLabel` | "Keep removed cards" | "Entfernte Karten behalten" |
| `deckUpdate.keepRemovedHint` | "When off, cards absent from the file will be deleted." | "Wenn deaktiviert, werden Karten, die nicht in der Datei enthalten sind, gelöscht." |
| `deckUpdate.apply` | "Apply changes" | "Änderungen übernehmen" |
| `deckUpdate.applying` | "Applying..." | "Wird übernommen..." |
| `deckUpdate.successToast` | "Deck updated successfully" | "Deck erfolgreich aktualisiert" |
| `deckUpdate.errorTitle` | "Update failed" | "Aktualisierung fehlgeschlagen" |
| `deckUpdate.parseError` | "Could not parse the file. Check it is a valid .kartex file." | "Datei konnte nicht verarbeitet werden. Bitte prüfen Sie, ob es eine gültige .kartex-Datei ist." |
| `deckUpdate.fileTooLarge` | "File is too large." | "Datei ist zu groß." |

Total: 16 new keys. [ASSUMED — German translations are approximate; native speaker review recommended]

---

## Test Coverage

### Backend Tests (Vitest, same pattern as `stats-summary.test.ts` and `kartex-parser-id.test.ts`)

New test file: `apps/backend/src/routes/__tests__/deck-update.test.ts`

| Test ID | Behavior | Type |
|---------|----------|------|
| T-16-01 | preview: 403 when caller is not deck owner | unit/route |
| T-16-02 | preview: 404 when deckId does not exist | unit/route |
| T-16-03 | preview: 422 when file is not a .kartex file | unit/route |
| T-16-04 | preview: returns correct added/updated/unchanged/removed counts | unit/route |
| T-16-05 | preview: cards without kartexId in file → counted as "added" | unit/route |
| T-16-06 | apply: 403 when caller is not deck owner | unit/route |
| T-16-07 | apply: creates new cards for added bucket | unit/route |
| T-16-08 | apply: updates front/back/tags for matched cards; CardProgress untouched | unit/route |
| T-16-09 | apply: keepRemoved=true — absent deck cards remain | unit/route |
| T-16-10 | apply: keepRemoved=false — absent deck cards deleted | unit/route |
| T-16-11 | apply: transaction is atomic — if update fails, no partial changes | unit/route |
| T-16-12 | security: userId is taken from JWT (c.get('userId')), never from request body | unit/route |

### Frontend Tests (Vitest + Testing Library)

New test file: `apps/frontend/src/components/__tests__/DeckUpdateModal.test.tsx`

| Test ID | Behavior | Type |
|---------|----------|------|
| T-16-FE-01 | uploading state: shows spinner while preview fetch is in-flight | unit |
| T-16-FE-02 | previewing state: shows diff counts (added/updated/unchanged/removed) | unit |
| T-16-FE-03 | keepRemoved toggle: default state is checked (true) | unit |
| T-16-FE-04 | Apply button triggers apply fetch with keepRemoved value | unit |
| T-16-FE-05 | error state: shows error message on preview fetch failure | unit |
| T-16-FE-06 | done: calls onSuccess() and closes modal on successful apply | unit |

DeckDetailPage integration test additions in `apps/frontend/src/pages/__tests__/DeckDetailPage.test.tsx`:

| Test ID | Behavior | Type |
|---------|----------|------|
| T-16-FE-07 | "Update from file" button visible when deck.ownerId === user.id | unit |
| T-16-FE-08 | "Update from file" button absent when user is not owner | unit |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 (pinned — not 4.x) |
| Config file | `apps/frontend/vitest.config.ts` / `apps/backend/vitest.config.ts` |
| Quick run command | `yarn workspace @kartex/frontend test --run` / `yarn workspace @kartex/backend test --run` |
| Full suite command | `yarn test` (root workspace) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| IMP-01 | "Update from file" button visible to owner | unit | Frontend test suite |
| IMP-02 | Preview modal shows diff counts | unit | Frontend test suite |
| IMP-03 | kartexId-matched cards updated; CardProgress untouched | unit | Backend test suite |
| IMP-04 | Cards in file but not in deck created as new | unit | Backend test suite |
| IMP-05 | Cards in deck but not in file shown as removed | unit | Backend test suite |
| IMP-06 | keepRemoved toggle controls deletion on apply | unit | Backend test suite |

### Sampling Rate

- **Per task commit:** `yarn workspace @kartex/backend test --run` (backend routes only)
- **Per wave merge:** `yarn test` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `apps/backend/src/routes/__tests__/deck-update.test.ts` — 12 stubs (T-16-01 through T-16-12)
- [ ] `apps/frontend/src/components/__tests__/DeckUpdateModal.test.tsx` — 6 stubs (T-16-FE-01 through T-16-FE-06)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT httpOnly cookie (existing `authMiddleware`) |
| V3 Session Management | no | Stateless preview/apply design |
| V4 Access Control | yes | Owner-only gate (`deck.ownerId !== userId → 403`) |
| V5 Input Validation | yes | File extension check; `parseKartex` validates file content; `bodyLimit` enforces max size |
| V6 Cryptography | no | No new crypto operations |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR — update another user's deck | Elevation of privilege | `deck.ownerId !== userId → 403` before any DB write |
| Mass file upload (DoS) | DoS | `bodyLimit(MAX_BYTES)` as first middleware in handler chain |
| Malformed .kartex file (parser bomb) | Tampering | `parseKartex` returns `KartexParseError` on fatal; no infinite loops in parser |
| File extension spoofing | Tampering | Extension check (`.kartex` suffix) + `parseKartex` validates content |
| CartProgress data overwrite | Tampering | `tx.card.update` only touches `frontContent`, `backContent`, `tags` — never `CardProgress` fields |
| Privilege escalation via keepRemoved | Tampering | `keepRemoved` is a boolean that only affects deletion of the caller's own deck cards; owner check precedes transaction |

---

## Environment Availability

No new external dependencies. All tools, runtimes, and services required by this phase are already used by phases 14–15.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend (Hono) | ✓ | existing | — |
| PostgreSQL 16 | Prisma | ✓ | existing | — |
| Prisma Client | ORM | ✓ | existing (7.x) | — |
| yarn workspaces | Build | ✓ | 4.15.0 | — |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Tags are order-independent in diff comparison (sort before compare) | Architecture Patterns (computeDiff) | If tag order is meaningful, false "unchanged" classifications occur |
| A2 | kartexId string comparison is case-sensitive (no normalisation) | Architecture Patterns | If user intends case-insensitive matching, same kartexId in different cases creates duplicates |
| A3 | German translations for new i18n keys are approximately correct | i18n Keys table | Non-blocking — functional correctness unaffected; native speaker review recommended |
| A4 | .kartex.zip files are not supported for deck update (plain .kartex only) | Architecture (file input accept) | If user wants to update a deck with media assets, they cannot in v1.3 |
| A5 | Duplicate kartexId values in a single file should be a 422 error (or: first-wins deduplification) | Pitfall 2 | Prisma P2002 constraint violation if not handled; planner must choose approach |

---

## Open Questions (RESOLVED)

1. **Duplicate kartexId in uploaded file — error or deduplicate?**
   - What we know: Parser allows duplicate ids (Phase 14 Test 3). DB constraint `@@unique([deckId, kartexId])` will reject the second insert.
   - What's unclear: Should the backend return 422 with "duplicate ids in file" or silently use first-wins?
   - Recommendation: Return 422 with a clear error message. Simpler, and informs the user their file has a problem.
   - **RESOLVED:** Return 422 with `"Duplicate id values in file."` — per Plan 16-02 behavior block (T-16-03 and duplicate-guard logic in preview + apply routes).

2. **kartexId not updated on apply for matched cards**
   - What we know: The kartexId is the match key. Updating it would break future matches.
   - What's unclear: If a user changes the `id:` field value in their .kartex file, should that be treated as a new card (added) and the old one as removed?
   - Recommendation: Yes — kartexId is the identity key. Changing it = new identity. The old deck card appears in "removed"; the new file card appears in "added". This is correct behavior and requires no special handling — the diff algorithm handles it naturally.
   - **RESOLVED:** kartexId is intentionally never updated on apply — per Plan 16-02 action (`tx.card.update` omits `kartexId` explicitly). Changed id = new identity; handled naturally by computeDiff.

3. **Unchanged count: include deck cards with no kartexId?**
   - What we know: Deck cards with `kartexId=null` are unmatchable by any file card with an id.
   - What's unclear: If the deck has old null-kartexId cards (imported before Phase 14), they always appear in "removed" since no file card can match them by id.
   - Recommendation: Explicitly note this in the preview UI or in a tooltip: "Cards added before the id: field was supported cannot be matched and will appear as removed." The planner should flag this to the user in the modal.
   - **RESOLVED:** Null-kartexId deck cards fall into the `removedIds` bucket (they are never matched by file cards) — per Plan 16-02 computeDiff logic. The DeckUpdateModal previewing state displays the removed count so users see the impact before applying.

---

## Sources

### Primary (HIGH confidence)
- `apps/backend/src/routes/import.ts` — multipart handling, bodyLimit, parseKartex call pattern [VERIFIED: codebase read]
- `apps/backend/src/routes/decks.ts` — owner auth pattern, Prisma interactive transaction (fork handler) [VERIFIED: codebase read]
- `apps/frontend/src/hooks/useImport.ts` — api.postForm, FormData construction, step state machine [VERIFIED: codebase read]
- `apps/frontend/src/components/CardEditorModal.tsx` — Dialog modal pattern, open/onOpenChange props [VERIFIED: codebase read]
- `apps/frontend/src/lib/api.ts` — api.postForm signature [VERIFIED: codebase read]
- `packages/shared/src/schemas/update.ts` — DeckUpdatePreviewSchema, DeckUpdateResultSchema (add/update/unchanged/removed + deckId) [VERIFIED: codebase read]
- `packages/shared/src/schemas/import.ts` — ParsedCardSchema with optional id field [VERIFIED: codebase read]
- `apps/backend/prisma/schema.prisma` — Card.kartexId: String?, @@unique([deckId, kartexId]) [VERIFIED: codebase read]
- `apps/backend/src/index.ts` — route mounting order and auth middleware placement [VERIFIED: codebase read]
- `.planning/STATE.md` § Accumulated Context — v1.3-research locked decisions [VERIFIED: codebase read]

### Secondary (MEDIUM confidence)
- `apps/frontend/src/pages/DeckDetailPage.tsx` — 558 lines (file size context, existing button pattern) [VERIFIED: codebase read + wc -l]
- `apps/frontend/src/locales/en.json` — existing key namespace conventions [VERIFIED: codebase read]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed; no new packages
- Architecture: HIGH — patterns taken directly from existing codebase (import.ts, decks.ts, CardEditorModal.tsx)
- Diff algorithm: HIGH — kartexId field and @@unique constraint verified in schema
- Pitfalls: HIGH — most derived from existing codebase patterns and locked decisions
- i18n keys: MEDIUM — English keys are definitive; German translations assumed

**Research date:** 2026-06-10
**Valid until:** 2026-07-10 (stable stack — 30-day window)
