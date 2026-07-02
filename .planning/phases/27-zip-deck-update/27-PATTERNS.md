# Phase 27: Zip Deck Update — Pattern Map

**Mapped:** 2026-06-30
**Files analyzed:** 6
**Analogs found:** 6 / 6

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/backend/src/lib/importMedia.ts` | utility/helper | file-I/O + transform | `apps/backend/src/routes/import.ts` | exact (extracted from) |
| `apps/backend/src/routes/import.ts` | route | file-I/O | `apps/backend/src/routes/import.ts` | self (minor refactor — replace inline logic with importMedia imports) |
| `apps/backend/src/routes/deckUpdate.ts` | route | file-I/O + CRUD | `apps/backend/src/routes/import.ts` | exact (same zip + media pattern, different tx shape) |
| `apps/frontend/src/pages/DeckDetailPage.tsx` | component/page | request-response | self | self (one attribute change) |
| `apps/frontend/src/locales/en.json` | config | — | self | self (add/update deckUpdate keys) |
| `apps/frontend/src/locales/de.json` | config | — | `apps/frontend/src/locales/en.json` | exact (parity) |

---

## Pattern Assignments

### `apps/backend/src/lib/importMedia.ts` (NEW utility, file-I/O + transform)

**Analog:** `apps/backend/src/routes/import.ts` — extract from lines 1–33 and 183–243.

**Imports pattern** (`import.ts` lines 1–8):
```typescript
import { basename } from 'node:path'
import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileTypeFromBuffer } from 'file-type'
import { Prisma } from '@prisma/client'
```

**ALLOWED_MIMES constant** (`import.ts` lines 14–23):
```typescript
export const ALLOWED_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
])
```

**rewriteMediaRefs function** (`import.ts` lines 28–33):
```typescript
export function rewriteMediaRefs(text: string, storedFilenames: Map<string, string>): string {
  return text.replace(/media:\/\/([^\s)'"]+)/g, (_match, refName: string) => {
    const stored = storedFilenames.get(refName)
    return stored ? `media://${stored}` : `media://${refName}`
  })
}
```

**Validation + buffer collection phase** (`import.ts` lines 183–216 — extract as `collectAndValidateMedia`):
```typescript
const MAX_MEDIA_ENTRIES = 100
const MAX_TOTAL_BYTES = MAX_BYTES * 10

if (mediaEntries.length > MAX_MEDIA_ENTRIES) { ... return 422 }

const validationErrors: { name: string; reason: string }[] = []
const entryBuffers = new Map<string, Buffer>()
let totalUncompressedBytes = 0

for (const entry of mediaEntries) {
  const entryName = basename(entry.path.replace(/\\/g, '/'))
  const bytes = await entry.buffer()
  totalUncompressedBytes += bytes.length
  if (totalUncompressedBytes > MAX_TOTAL_BYTES) { return 422 }
  entryBuffers.set(entryName, bytes)
  if (bytes.length > MAX_BYTES) { validationErrors.push(...); continue }
  const detected = await fileTypeFromBuffer(bytes)
  if (!detected || !ALLOWED_MIMES.has(detected.mime)) { validationErrors.push(...) }
}
```

**Storage phase** (`import.ts` lines 224–243 — extract as `storeMediaBuffers`):
```typescript
const storedFilenames = new Map<string, string>()
for (const [entryName, bytes] of entryBuffers) {
  const detected = await fileTypeFromBuffer(bytes)
  const filename = randomUUID() + '.' + detected!.ext
  const fullPath = join(storagePath, filename)
  await writeFile(fullPath, bytes)
  await prisma.media.create({
    data: { ownerId: userId, filename, mimeType: detected!.mime, storagePath: fullPath, sizeBytes: bytes.length },
  })
  storedFilenames.set(entryName, filename)
}
```

---

### `apps/backend/src/routes/import.ts` (MODIFIED route — minor refactor)

**Change:** Replace inline `ALLOWED_MIMES`, `rewriteMediaRefs`, the validation loop (lines 183–216), and storage loop (lines 224–243) with imports from `../lib/importMedia.js`. All other logic stays identical.

**Import to add** (replace removed inline declarations):
```typescript
import { ALLOWED_MIMES, rewriteMediaRefs, collectAndValidateMedia, storeMediaBuffers } from '../lib/importMedia.js'
```

No other changes to this file.

---

### `apps/backend/src/routes/deckUpdate.ts` (MODIFIED route — add zip branch)

**Analog:** `apps/backend/src/routes/import.ts` for the zip path; `apps/backend/src/routes/deckUpdate.ts` self for the existing plain-kartex and transaction shape.

**Imports to add** (`deckUpdate.ts` line 1–5 block):
```typescript
import { mkdir } from 'node:fs/promises'
import unzipper from 'unzipper'
import { rewriteMediaRefs, collectAndValidateMedia, storeMediaBuffers } from '../lib/importMedia.js'
```

**MAX_BYTES fix** (`deckUpdate.ts` line 7 — replace hardcoded 5 MB):
```typescript
// BEFORE (wrong):
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB — same as import.ts

// AFTER (align with import.ts):
const MAX_BYTES = parseInt(process.env.MAX_UPLOAD_BYTES ?? '10485760', 10)
```

**Zip detection guard** (replace the two separate rejection guards in both preview and apply handlers at `deckUpdate.ts` lines 133–139 and 195–200):
```typescript
// BEFORE (two guards — explicit rejection):
if (normalizedName.endsWith('.kartex.zip')) {
  return c.json({ error: 'File must be a .kartex file (not .kartex.zip).' }, 400)
}
if (!normalizedName.endsWith('.kartex')) {
  return c.json({ error: 'File must be a .kartex file.' }, 400)
}

// AFTER (accept both):
const isZip = normalizedName.endsWith('.kartex.zip')
const isKartex = normalizedName.endsWith('.kartex') && !isZip
if (!isKartex && !isZip) {
  return c.json({ error: 'File must be a .kartex or .kartex.zip.' }, 400)
}
```

**Preview — zip branch** (insert after detection guard in preview handler; parse deck.kartex only, no media extraction):
```typescript
// Zip: open buffer, find deck.kartex, parse, computeDiff — NO media extraction (stateless)
if (isZip) {
  const buffer = Buffer.from(await file.arrayBuffer())
  let directory: Awaited<ReturnType<typeof unzipper.Open.buffer>>
  try {
    directory = await unzipper.Open.buffer(buffer)
  } catch {
    return c.json({ error: 'Could not open zip file.' }, 422)
  }
  const kartexEntry = directory.files.find(
    (f) => f.path === 'deck.kartex' || f.path.replace(/\\/g, '/').endsWith('/deck.kartex'),
  )
  if (!kartexEntry) return c.json({ error: 'No deck.kartex found in zip.' }, 422)
  const kartexText = (await kartexEntry.buffer()).toString('utf-8')
  const parseResult = parseKartex(kartexText)
  if ('fatal' in parseResult) return c.json({ error: parseResult.message }, 422)
  if (hasDuplicateKartexIds(parseResult.cards)) return c.json({ error: 'Duplicate id values in file.' }, 422)
  const deckCards = await prisma.card.findMany({ where: { deckId }, select: { id: true, kartexId: true, frontContent: true, backContent: true, tags: true } })
  const diff = computeDiff(parseResult.cards, deckCards)
  return c.json({ added: diff.added, updated: diff.updated, unchanged: diff.unchanged, removed: diff.removed }, 200)
}
// ... fall through to existing plain-kartex path
```

**Apply — zip branch** (insert after detection guard in apply handler; full media validate + store + rewrite):
```typescript
if (isZip) {
  const buffer = Buffer.from(await file.arrayBuffer())
  let directory: Awaited<ReturnType<typeof unzipper.Open.buffer>>
  try {
    directory = await unzipper.Open.buffer(buffer)
  } catch {
    return c.json({ error: 'Could not open zip file.' }, 422)
  }
  const kartexEntry = directory.files.find(
    (f) => f.path === 'deck.kartex' || f.path.replace(/\\/g, '/').endsWith('/deck.kartex'),
  )
  if (!kartexEntry) return c.json({ error: 'No deck.kartex found in zip.' }, 422)
  const kartexText = (await kartexEntry.buffer()).toString('utf-8')
  const parseResult = parseKartex(kartexText)
  if ('fatal' in parseResult) return c.json({ error: parseResult.message }, 422)
  if (hasDuplicateKartexIds(parseResult.cards)) return c.json({ error: 'Duplicate id values in file.' }, 422)

  const mediaEntries = directory.files.filter((f) => {
    const normalized = f.path.replace(/\\/g, '/')
    return normalized.startsWith('media/') && !normalized.startsWith('__MACOSX/') && !normalized.endsWith('/')
  })

  const storagePath = process.env.STORAGE_PATH ?? '/app/media'
  await mkdir(storagePath, { recursive: true })

  const { entryBuffers, validationErrors } = await collectAndValidateMedia(mediaEntries, MAX_BYTES)
  if (validationErrors.length > 0) {
    return c.json({ error: 'Validation failed', files: validationErrors }, 422)
  }

  const deckCards = await prisma.card.findMany({ where: { deckId }, select: { id: true, kartexId: true, frontContent: true, backContent: true, tags: true } })
  const diff = computeDiff(parseResult.cards, deckCards)

  // T-5-07 (accepted): if $transaction fails after media writes, orphaned files remain on disk
  const storedFilenames = await storeMediaBuffers(entryBuffers, storagePath, userId, prisma)

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (diff.addedCards.length > 0) {
      await tx.card.createMany({
        data: diff.addedCards.map((fc) => ({
          deckId,
          frontContent: rewriteMediaRefs(fc.front, storedFilenames),
          backContent: rewriteMediaRefs(fc.back, storedFilenames),
          tags: fc.tags,
          kartexId: fc.id ?? null,
        })),
      })
    }
    for (const { fileCard, deckCard } of diff.updatedCards) {
      await tx.card.update({
        where: { id: deckCard.id },
        data: {
          frontContent: rewriteMediaRefs(fileCard.front, storedFilenames),
          backContent: rewriteMediaRefs(fileCard.back, storedFilenames),
          tags: fileCard.tags,
        },
      })
    }
    if (!keepRemoved && diff.removedIds.length > 0) {
      await tx.card.deleteMany({ where: { id: { in: diff.removedIds } } })
    }
  })

  return c.json({ added: diff.added, updated: diff.updated, unchanged: diff.unchanged, removed: diff.removed, deckId }, 200)
}
// ... fall through to existing plain-kartex apply path
```

**Key guard: plain-kartex tx.card.update data** (`deckUpdate.ts` lines 242–250 — unchanged for plain path, rewriteMediaRefs only applies to zip branch):
```typescript
// Plain kartex path — NO rewriteMediaRefs (no media refs in plain .kartex files):
await tx.card.update({
  where: { id: deckCard.id },
  data: { frontContent: fileCard.front, backContent: fileCard.back, tags: fileCard.tags },
})
```

---

### `apps/frontend/src/pages/DeckDetailPage.tsx` (MODIFIED component — one attribute)

**Analog:** Self. Change is at line 570.

**Before** (`DeckDetailPage.tsx` line 570):
```tsx
accept=".kartex"
```

**After**:
```tsx
accept=".kartex,.kartex.zip"
```

Full surrounding context (`DeckDetailPage.tsx` lines 567–578) is stable — no other changes needed.

---

### `apps/frontend/src/locales/en.json` (MODIFIED config — deckUpdate section)

**Analog:** Self. The `deckUpdate` section is at lines 420–437.

**Current `parseError` key** (`en.json` line 435):
```json
"parseError": "Could not parse the file. Check it is a valid .kartex file."
```

**Updated value** (mention zip):
```json
"parseError": "Could not parse the file. Check it is a valid .kartex or .kartex.zip file."
```

Optionally add (if DeckUpdateModal is extended to surface `data.files` detail — planner decision):
```json
"zipValidationFail": "The following files in your zip failed validation:",
"zipFixHint": "Remove or fix these files and re-upload the zip."
```
These exact keys already exist in `import` section (lines 300–301) and can be reused if the modal is updated to show file-level errors. Copy pattern from `ImportPage` component if detail display is added.

---

### `apps/frontend/src/locales/de.json` (MODIFIED config — parity)

**Analog:** `apps/frontend/src/locales/en.json` — same key structure, German translations.

Apply the same `parseError` update in German. Pattern: every key updated in `en.json` must have a matching key updated in `de.json` at the same path.

---

## Shared Patterns

### bodyLimit middleware placement
**Source:** `apps/backend/src/routes/import.ts` lines 46–52; `apps/backend/src/routes/deckUpdate.ts` lines 113–118 and 174–178.
**Apply to:** Both preview and apply handlers in `deckUpdate.ts`.
**Rule:** `bodyLimit` MUST be the first middleware in the handler chain — before `parseBody()`. The `MAX_BYTES` constant must come from `process.env.MAX_UPLOAD_BYTES`.
```typescript
bodyLimit({
  maxSize: MAX_BYTES,
  onError: (c) =>
    c.json({ error: `File too large. Maximum size is ${MAX_BYTES} bytes.` }, 413),
}),
```

### Owner gate before file processing
**Source:** `apps/backend/src/routes/deckUpdate.ts` lines 124–126 (preview) and 185–187 (apply).
**Apply to:** Both preview and apply handlers — zip branch inherits, no change needed.
```typescript
const deck = await prisma.deck.findUnique({ where: { id: deckId } })
if (!deck) return c.json({ error: 'Not found.' }, 404)
if (deck.ownerId !== userId) return c.json({ error: 'Forbidden.' }, 403)
```

### Validate-all-then-write (abort on first failure group)
**Source:** `apps/backend/src/routes/import.ts` lines 172–221.
**Apply to:** `deckUpdate.ts` zip apply branch; `importMedia.ts` `collectAndValidateMedia` helper.
**Rule:** Collect ALL validation errors before writing anything to disk or DB. Return 422 with full `files` array if any errors exist.

### macOS zip metadata filter
**Source:** `apps/backend/src/routes/import.ts` lines 163–170.
**Apply to:** `deckUpdate.ts` zip apply branch; copy exactly.
```typescript
const mediaEntries = directory.files.filter((f) => {
  const normalized = f.path.replace(/\\/g, '/')
  return (
    normalized.startsWith('media/') &&
    !normalized.startsWith('__MACOSX/') &&
    !normalized.endsWith('/')
  )
})
```

### Magic-bytes MIME detection (never trust extension)
**Source:** `apps/backend/src/routes/import.ts` lines 209–215.
**Apply to:** `importMedia.ts` `collectAndValidateMedia` helper.
```typescript
const detected = await fileTypeFromBuffer(bytes)
if (!detected || !ALLOWED_MIMES.has(detected.mime)) {
  validationErrors.push({ name: entryName, reason: `File type not allowed: ${detected?.mime ?? 'unknown'}` })
}
```

### UUID-based storage filename (T-5-02)
**Source:** `apps/backend/src/routes/import.ts` lines 229–230.
**Apply to:** `importMedia.ts` `storeMediaBuffers` helper.
```typescript
const filename = randomUUID() + '.' + detected!.ext
```

### Prisma transaction shape for card mutations
**Source:** `apps/backend/src/routes/deckUpdate.ts` lines 227–259.
**Apply to:** `deckUpdate.ts` zip apply branch (same shape, add `rewriteMediaRefs` wrapping).
**Rule:** Transaction touches only `frontContent`, `backContent`, `tags`. Never update `kartexId`, `easeFactor`, `interval`, `repetitions` (SM-2 fields). This preserves CardProgress via `@@unique([userId, cardId])` indirection.

---

## No Analog Found

All files have close analogs. No entries here.

---

## Metadata

**Analog search scope:** `apps/backend/src/routes/`, `apps/backend/src/lib/`, `apps/frontend/src/`, `apps/frontend/src/locales/`
**Files read:** `import.ts`, `deckUpdate.ts`, `DeckDetailPage.tsx` (lines 560–578), `en.json`
**Pattern extraction date:** 2026-06-30
