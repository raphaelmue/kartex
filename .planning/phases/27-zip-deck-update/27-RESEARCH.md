# Phase 27: Zip Deck Update — Research

**Researched:** 2026-06-30
**Domain:** Backend zip extraction + deck update route extension + frontend file picker
**Confidence:** HIGH (entire domain already implemented in the project for import.ts; this phase extends existing production code)

---

## Summary

Phase 27 extends the existing deck update feature (Phase 16) to accept `.kartex.zip` bundles containing media files. The core challenge is zero new library complexity — the project already uses `unzipper` and `file-type` in `import.ts` for exactly this purpose. The primary deliverable is refactoring: extract media-handling logic into a shared helper (`importMedia.ts`) and call that helper from both `import.ts` (unchanged behavior) and the extended `deckUpdate.ts` (new zip path).

Phase 16's `deckUpdate.ts` currently **explicitly rejects** `.kartex.zip` files with `{ error: 'File must be a .kartex file (not .kartex.zip).' }` in both preview and apply. Phase 27 lifts that restriction and adds full zip support. The diff engine (`computeDiff`), SM-2 preservation (kartexId matching), and the Prisma transaction pattern are all unchanged — the only new logic is zip extraction, media validation, and media ref rewriting on card content.

**Primary recommendation:** Extract `importMedia.ts` helper first (pure refactor of `import.ts`), then extend `deckUpdate.ts` to call it. Keep the preview endpoint media-free (parse `deck.kartex` only for diff counts) to stay stateless and avoid holding large media buffers across the preview→apply round trip.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Zip extraction + media validation | API / Backend | — | Magic-bytes validation must be server-side; client cannot be trusted for MIME type |
| Media UUID storage (disk + DB) | API / Backend | Local Docker Volume | Media files stored on server volume; DB records UUID→storagePath mapping |
| Diff computation (added/updated/removed) | API / Backend | — | Stateless re-computation on each call (TOCTOU prevention per v1.3-research) |
| Card content ref rewriting | API / Backend | — | `media://original.png` → `media://uuid.ext` must happen before DB write |
| File picker accept attribute | Browser / Client | — | `accept=".kartex,.kartex.zip"` — browser-side filter only; server re-validates |
| SM-2 progress preservation | API / Backend | Database/Storage | kartexId matching in computeDiff + tx.card.update excludes CardProgress fields |

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DECKU-01 | Deck update path accepts `.kartex.zip` files in addition to existing `.kartex` | Remove the `.kartex.zip` rejection guards in deckUpdate.ts preview + apply; add zip detection branch |
| DECKU-02 | Media files from zip's `media/` folder are extracted, validated (magic bytes), and stored | Reuse ALLOWED_MIMES + fileTypeFromBuffer pattern from import.ts via importMedia.ts helper |
| DECKU-03 | Media references in updated card content are rewritten to new UUID filenames | Apply rewriteMediaRefs() on frontContent/backContent before tx.card.update and tx.card.createMany |
| DECKU-04 | SM-2 progress for matched cards is untouched by the zip update | Guaranteed by existing computeDiff() + tx.card.update data payload (only frontContent/backContent/tags) |
</phase_requirements>

---

## Standard Stack

### Core (No New Packages — All Already Installed)

| Library | Version | Purpose | Evidence |
|---------|---------|---------|----------|
| `unzipper` | `^0.12.3` | Zip buffer extraction | `apps/backend/package.json`; used in `import.ts` [VERIFIED: codebase] |
| `file-type` | `^22.0.1` | Magic-bytes MIME detection | `apps/backend/package.json`; used in `import.ts` [VERIFIED: codebase] |
| `hono` | `^4.7.9` | Route handlers + bodyLimit middleware | `apps/backend/package.json` [VERIFIED: codebase] |
| `@prisma/client` | `^7.0.0` | DB operations inside $transaction | `apps/backend/package.json` [VERIFIED: codebase] |
| `vitest` | `2.1.9` (pinned) | Test runner — backend | `apps/backend/package.json`; pinned to avoid Vite 6 requirement [VERIFIED: codebase] |

**No new npm packages are required.** All libraries needed for zip extraction, magic-byte validation, and media storage are already in production use in `import.ts`.

### Installation

None required. All dependencies already installed.

### Version Verification

All packages verified against `apps/backend/package.json` in the working tree. [VERIFIED: codebase]

---

## Package Legitimacy Audit

All packages in scope are existing project dependencies — not newly introduced by this phase.

| Package | Registry | Verdict | Disposition |
|---------|----------|---------|-------------|
| `unzipper` | npm | SUS (registry shows recent publish, 14M weekly downloads, GitHub source repo present) | **Approved — existing project dependency, in production use** |
| `file-type` | npm | OK (41M weekly downloads, sindresorhus/file-type) | Approved — existing project dependency |
| `hono` | npm | SUS (registry shows recent publish, 47M weekly downloads, GitHub source) | **Approved — existing project dependency, in production use** |
| `vitest` | npm | SUS (registry shows recent publish, 68M weekly downloads) | **Approved — existing project dependency** |

**SUS verdicts are all "too-new" signals from registry publish timestamp, not legitimacy concerns.** These packages are established dependencies already running in production in this project. No removal or checkpoint gate required.

**Packages removed due to SLOP verdict:** none
**Packages flagged as suspicious (SUS) requiring new install:** none

---

## Architecture Patterns

### System Architecture Diagram

```
POST /api/decks/:id/update/preview
     │
     ├─ File: .kartex?  ──► parse kartex → computeDiff → return counts (unchanged from Phase 16)
     │
     └─ File: .kartex.zip?
          │
          ├─ Open zip (unzipper.Open.buffer)
          ├─ Find + parse deck.kartex from zip
          ├─ computeDiff (same as plain path)
          └─ return counts (NO media extraction — stateless preview)

POST /api/decks/:id/update/apply
     │
     ├─ File: .kartex?  ──► parse kartex → computeDiff → $transaction(adds/updates/deletes) (unchanged)
     │
     └─ File: .kartex.zip?
          │
          ├─ Open zip (unzipper.Open.buffer)
          ├─ Find + parse deck.kartex from zip
          ├─ Filter media/ entries (skip __MACOSX, directories)
          ├─ VALIDATION PHASE: fileTypeFromBuffer each entry → collect errors
          │    └─ if errors → 422 (abort — nothing written)
          ├─ STORAGE PHASE: writeFile(uuid.ext) + prisma.media.create per entry
          │    └─ storedFilenames Map<originalName → uuid.ext>
          ├─ computeDiff (same logic)
          └─ $transaction:
               ├─ card.createMany (added): rewriteMediaRefs on frontContent/backContent
               ├─ card.update each (updated): rewriteMediaRefs on frontContent/backContent
               └─ card.deleteMany (removed, if keepRemoved=false)
```

### New File: `apps/backend/src/lib/importMedia.ts`

This is the key refactor. The helper exports constants and functions extracted from `import.ts`:

```typescript
// [VERIFIED: codebase — extracted from import.ts as-is]
export const ALLOWED_MIMES = new Set([
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'audio/mpeg', 'audio/ogg', 'audio/wav',
])

// Rewrites media://originalName → media://storedUuidName
export function rewriteMediaRefs(
  text: string,
  storedFilenames: Map<string, string>,
): string {
  return text.replace(/media:\/\/([^\s)'"]+)/g, (_match, refName: string) => {
    const stored = storedFilenames.get(refName)
    return stored ? `media://${stored}` : `media://${refName}`
  })
}

// Validates + stores all media/ entries from a zip buffer.
// Returns storedFilenames Map on success. Returns validationErrors array on failure.
// Does NOT open the zip or find deck.kartex — caller handles zip navigation.
export async function processZipMedia(params: {
  entryBuffers: Map<string, Buffer>  // originalFilename → Buffer (pre-collected by caller)
  storagePath: string
  userId: string
  maxFileBytes: number
  maxTotalBytes: number
  prismaMedia: { create: (args: unknown) => Promise<unknown> }
}): Promise<
  | { ok: true; storedFilenames: Map<string, string> }
  | { ok: false; errors: { name: string; reason: string }[] }
>
```

### Recommended Project Structure After Phase 27

```
apps/backend/src/
├── lib/
│   ├── importMedia.ts     ← NEW: shared zip media helper
│   ├── jwt.ts
│   ├── mailer.ts
│   ├── prisma.ts
│   ├── seed.ts
│   └── sm2.ts
└── routes/
    ├── import.ts          ← MODIFIED: import from ../lib/importMedia.js
    ├── deckUpdate.ts      ← MODIFIED: add zip path using importMedia
    └── ...

apps/frontend/src/pages/
└── DeckDetailPage.tsx     ← MODIFIED: accept=".kartex,.kartex.zip"

apps/frontend/src/locales/
├── en.json                ← MODIFIED: deckUpdate.parseError mentions zip
└── de.json                ← MODIFIED: parity
```

### Pattern 1: Zip Detection (deckUpdate.ts)

```typescript
// [VERIFIED: codebase — mirrors import.ts pattern exactly]
const normalizedName = file.name.replace(/\\/g, '/')
const isZip = normalizedName.endsWith('.kartex.zip')
const isKartex = normalizedName.endsWith('.kartex') && !isZip

if (!isKartex && !isZip) {
  return c.json({ error: 'File must be a .kartex or .kartex.zip.' }, 400)
}
```

### Pattern 2: Zip Buffer Opening + deck.kartex Extraction

```typescript
// [VERIFIED: codebase — already in import.ts]
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
if (!kartexEntry) {
  return c.json({ error: 'No deck.kartex found in zip.' }, 422)
}
const kartexText = (await kartexEntry.buffer()).toString('utf-8')
```

### Pattern 3: Media Entry Filtering (macOS-safe)

```typescript
// [VERIFIED: codebase — already in import.ts, must replicate in deckUpdate.ts]
const mediaEntries = directory.files.filter((f) => {
  const normalized = f.path.replace(/\\/g, '/')
  return (
    normalized.startsWith('media/') &&
    !normalized.startsWith('__MACOSX/') &&
    !normalized.endsWith('/')
  )
})
```

### Pattern 4: rewriteMediaRefs in Card Update (the new requirement)

```typescript
// [ASSUMED] — pattern follows import.ts; must be applied to deckUpdate.ts apply path
// When applying zip update, updated card content must have media refs rewritten:

// BEFORE (Phase 16 — plain kartex only, no media refs):
await tx.card.update({
  where: { id: deckCard.id },
  data: { frontContent: fileCard.front, backContent: fileCard.back, tags: fileCard.tags },
})

// AFTER (Phase 27 — with media ref rewriting):
await tx.card.update({
  where: { id: deckCard.id },
  data: {
    frontContent: rewriteMediaRefs(fileCard.front, storedFilenames),
    backContent: rewriteMediaRefs(fileCard.back, storedFilenames),
    tags: fileCard.tags,
  },
})
// Same pattern for tx.card.createMany added cards.
```

### Pattern 5: bodyLimit for Zip Uploads

```typescript
// [VERIFIED: codebase — import.ts uses env var; deckUpdate.ts has hardcoded 5MB (wrong)]
// deckUpdate.ts currently: const MAX_BYTES = 5 * 1024 * 1024 // comment says "same as import.ts" but import.ts uses env var!
// Fix: align with import.ts pattern
const MAX_BYTES = parseInt(process.env.MAX_UPLOAD_BYTES ?? '10485760', 10)
```

### Anti-Patterns to Avoid

- **Writing media to disk on preview:** The preview endpoint must NOT store media files. Stateless design: each call re-reads the file. Preview for zip should just parse `deck.kartex` and compute diff.
- **Skipping rewriteMediaRefs on updated cards:** Phase 16 `tx.card.update` passes `fileCard.front` verbatim. For zip updates, `fileCard.front` contains `media://original.png` refs that must be rewritten. Forgetting this is silent data corruption (refs stored as original filenames, never served).
- **Trusting client MIME type:** `file.type` from the multipart body is client-supplied. Always use `fileTypeFromBuffer()` magic-bytes detection (per existing import.ts pattern, T-5-03).
- **Not skipping `__MACOSX/` entries:** macOS Archive Utility adds metadata entries. Already handled in import.ts — must replicate.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Zip extraction | Custom byte parser | `unzipper.Open.buffer()` | Already in project; handles zip64, nested paths, streaming |
| MIME detection | File extension check | `fileTypeFromBuffer()` (file-type) | Magic bytes — extension can be spoofed; already used in import.ts |
| UUID filename generation | Sequential counters | `randomUUID()` (Node.js built-in) | Already used in import.ts and media.ts — consistent pattern |
| Media ref regex rewriting | String.replace with indexOf | `rewriteMediaRefs()` helper | Already implemented in import.ts — extract, don't duplicate |

**Key insight:** Every piece of custom logic needed in Phase 27 already exists in `import.ts`. The work is extraction (creating `importMedia.ts`) and wiring (calling it from `deckUpdate.ts`). There is no new algorithm to design.

---

## Common Pitfalls

### Pitfall 1: preview endpoint writes media to disk
**What goes wrong:** If the developer adds media processing to the preview endpoint, files get written to disk/DB but the user clicks Cancel → orphaned files accumulate.
**Why it happens:** It seems "nice" to validate media eagerly in preview. But the preview→apply flow is stateless (by design, v1.3-research).
**How to avoid:** Preview endpoint opens the zip, parses `deck.kartex`, computes diff — stops there. No `fileTypeFromBuffer`, no `writeFile`, no `prisma.media.create`.
**Warning signs:** Any `await writeFile(...)` or `await prisma.media.create(...)` call inside the preview handler.

### Pitfall 2: rewriteMediaRefs omitted for card.update (updated cards)
**What goes wrong:** Cards matched by kartexId and identified as "updated" get their content rewritten to DB with raw `media://carnot.png` refs instead of `media://uuid.ext`. These refs are never served (no Media row with filename `carnot.png`), so images/audio in updated cards silently break.
**Why it happens:** Phase 16's `tx.card.update` data was designed for plain `.kartex` (no media refs). The zip extension requires adding `rewriteMediaRefs()` to both the added bucket (`createMany`) and the updated bucket (`update` loop).
**How to avoid:** Both `diff.addedCards.map(...)` and `diff.updatedCards.forEach(...)` paths must call `rewriteMediaRefs()` on `frontContent` and `backContent`.
**Warning signs:** A test that verifies `frontContent` in the `tx.card.update` call payload matches `media://uuid.*` pattern.

### Pitfall 3: bodyLimit mismatch (5 MB vs env var)
**What goes wrong:** A user uploads a 6 MB `.kartex.zip` bundle and gets a 413 even though `MAX_UPLOAD_BYTES=52428800` is set in docker-compose.
**Why it happens:** `deckUpdate.ts` has `const MAX_BYTES = 5 * 1024 * 1024` (hardcoded); `import.ts` uses `parseInt(process.env.MAX_UPLOAD_BYTES ?? '10485760', 10)`.
**How to avoid:** Replace the hardcoded constant in `deckUpdate.ts` with the same env-var pattern as `import.ts`.
**Warning signs:** `// 5 MB — same as import.ts` comment (incorrect — import.ts uses env var).

### Pitfall 4: file-type is ESM-only (dynamic import)
**What goes wrong:** `import fileType from 'file-type'` with CommonJS-style usage breaks at build time.
**Why it happens:** `file-type@22` is pure ESM. The project uses `"type": "module"` in backend `package.json`, so this is not a problem for the production code — but test environments that don't handle ESM properly could fail.
**How to avoid:** Follow existing import.ts pattern exactly: `import { fileTypeFromBuffer } from 'file-type'` (named export). The project already works this way.
**Warning signs:** Build error mentioning `ERR_REQUIRE_ESM` or `default import`.

### Pitfall 5: kartexId uniqueness constraint violation on apply
**What goes wrong:** Applying a zip update adds a card with a `kartexId` that already exists in the deck (e.g., from a previous partial update). Postgres throws on `@@unique([deckId, kartexId])`.
**Why it happens:** `hasDuplicateKartexIds()` guards against file-level duplicates only. Cross-update collisions (same kartexId appears in two successive updates as "new") would reach the DB.
**How to avoid:** `computeDiff()` already handles this — if a kartexId exists in the deck it goes to the updated bucket (not added). The only scenario where this breaks is if a card was manually created with a kartexId set. But `computeDiff` skips cards with `kartexId = null` in the removed bucket and doesn't try to create them. This is an existing safeguard; Phase 27 should not break it.
**Warning signs:** `Unique constraint failed on the fields: (\`deckId\`,\`kartexId\`)` runtime error.

---

## Code Examples

### Extracting importMedia.ts from import.ts

```typescript
// apps/backend/src/lib/importMedia.ts
// [VERIFIED: codebase — all logic extracted from apps/backend/src/routes/import.ts]
import { basename } from 'node:path'
import { fileTypeFromBuffer } from 'file-type'

export const ALLOWED_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
])

export function rewriteMediaRefs(text: string, storedFilenames: Map<string, string>): string {
  return text.replace(/media:\/\/([^\s)'"]+)/g, (_match, refName: string) => {
    const stored = storedFilenames.get(refName)
    return stored ? `media://${stored}` : `media://${refName}`
  })
}

export type MediaValidationError = { name: string; reason: string }
export type MediaBuffers = Map<string, Buffer>  // originalFilename → Buffer

// Collects and validates media entries from an already-opened zip directory.
// Returns entryBuffers on success, or validationErrors (non-empty) on failure.
export async function collectAndValidateMedia(
  mediaEntries: { path: string; buffer: () => Promise<Buffer> }[],
  maxFileBytes: number,
  maxTotalBytes: number,
  maxEntries: number,
): Promise<{ entryBuffers: MediaBuffers; validationErrors: MediaValidationError[] }> {
  // ... (extracted logic from import.ts VALIDATION PHASE)
}
```

### DeckDetailPage.tsx File Picker Change

```tsx
// [VERIFIED: codebase — apps/frontend/src/pages/DeckDetailPage.tsx line 572]
// BEFORE (Phase 16):
<input ref={updateFileInputRef} type="file" accept=".kartex" ... />

// AFTER (Phase 27 — DECKU-01):
<input ref={updateFileInputRef} type="file" accept=".kartex,.kartex.zip" ... />
```

### deckUpdate.ts apply endpoint — zip branch skeleton

```typescript
// [ASSUMED] — pattern follows import.ts exactly; must be adapted for diff context
if (isZip) {
  // 1. Open zip + parse deck.kartex (same as import.ts)
  const buffer = Buffer.from(await file.arrayBuffer())
  const directory = await unzipper.Open.buffer(buffer)
  const kartexEntry = directory.files.find(...)
  const kartexText = (await kartexEntry.buffer()).toString('utf-8')
  const parseResult = parseKartex(kartexText)

  // 2. Collect media entries (macOS-safe filter)
  const mediaEntries = directory.files.filter(f => ...)

  // 3. Collect + validate (no disk writes yet)
  const { entryBuffers, validationErrors } = await collectAndValidateMedia(...)
  if (validationErrors.length > 0) {
    return c.json({ error: 'Validation failed', files: validationErrors }, 422)
  }

  // 4. Compute diff from parsed kartex
  const deckCards = await prisma.card.findMany({ where: { deckId }, select: {...} })
  const diff = computeDiff(parseResult.cards, deckCards)

  // 5. Execute transaction: store media + apply diff
  await prisma.$transaction(async (tx) => {
    // Store media (disk + DB) inside transaction scope
    const storedFilenames = await storeMediaBuffers(entryBuffers, storagePath, userId, tx)

    // Add new cards with rewritten refs
    if (diff.addedCards.length > 0) {
      await tx.card.createMany({
        data: diff.addedCards.map((fc) => ({
          deckId, kartexId: fc.id ?? null,
          frontContent: rewriteMediaRefs(fc.front, storedFilenames),
          backContent: rewriteMediaRefs(fc.back, storedFilenames),
          tags: fc.tags,
        })),
      })
    }

    // Update matched cards with rewritten refs
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

    // Delete removed cards (if keepRemoved=false)
    if (!keepRemoved && diff.removedIds.length > 0) {
      await tx.card.deleteMany({ where: { id: { in: diff.removedIds } } })
    }
  })
}
```

Note: Placing `storeMediaBuffers` inside the `$transaction` callback keeps disk writes and DB creates co-located. If the transaction fails after media writes, orphaned files remain on disk (accepted limitation — T-5-07 pattern from import.ts). This is explicitly called out in import.ts: `// T-5-07 (accepted): if transaction fails after media writes, orphaned files remain on disk`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| deckUpdate.ts rejects .kartex.zip | deckUpdate.ts accepts .kartex.zip | Phase 27 | Users can update decks that contain media |
| Zip media logic duplicated | importMedia.ts shared helper | Phase 27 (refactor) | import.ts and deckUpdate.ts share one implementation |
| bodyLimit hardcoded 5 MB in deckUpdate.ts | MAX_UPLOAD_BYTES env var | Phase 27 | Zip bundles respect docker-compose size config |

**Deprecated/outdated:**
- The comment `// 5 MB — same as import.ts` in `deckUpdate.ts` is already incorrect (import.ts uses env var). Phase 27 fixes this.

---

## Runtime State Inventory

> Rename/refactor check: Phase 27 renames/moves logic from `import.ts` into `importMedia.ts`. No user-facing string changes; no DB schema changes.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Media records in `Media` table use `storagePath` and `filename` (UUID-based) — no name references the source file being moved | None — pure code refactor |
| Live service config | No service config references `import.ts` by name | None |
| OS-registered state | None | None |
| Secrets/env vars | `MAX_UPLOAD_BYTES`, `STORAGE_PATH` — both already used in `import.ts`; `deckUpdate.ts` will now also read `MAX_UPLOAD_BYTES` | None — env var names unchanged |
| Build artifacts | Backend TypeScript build produces `dist/routes/import.js` and `dist/routes/deckUpdate.js` and will gain `dist/lib/importMedia.js` | Docker Compose entrypoint runs `node dist/index.js` — no path change needed |

---

## Open Questions

1. **Should the preview endpoint validate media from a zip?**
   - What we know: The stateless design principle (v1.3-research) says preview and apply re-parse independently. Import page shows `zipNoPreview` i18n key ("Card preview is not available for .kartex.zip bundles") for the full import flow.
   - What's unclear: Should deck-update preview also skip media, or should it report "N media files found" in the preview counts?
   - Recommendation: Skip media on preview (just parse `deck.kartex` and compute diff). Keeps preview fast and stateless. The apply call validates + stores media. If media validation fails on apply, the user sees the error then.

2. **Should DeckUpdateModal show media validation errors (`data.files`) in detail?**
   - What we know: DeckUpdateModal currently only reads `data.error` (string). For zip validation failures, backend returns `{ error: 'Validation failed', files: [{name, reason}] }` — same shape as import.ts. ImportPage shows the file list.
   - What's unclear: Whether the modal needs the same detail, or if the generic error string is sufficient.
   - Recommendation: For MVP, the generic error step ("Update failed" + `data.error`) is acceptable. The user can see "Validation failed" and know to check their zip. Detail can be added in a follow-up. The planner can decide whether to add `data.files` handling to DeckUpdateModal.

---

## Environment Availability

> Phase 27 is a code-only change. No new external services required.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `unzipper` | DECKU-02 zip extraction | ✓ | `^0.12.3` (installed) | — |
| `file-type` | DECKU-02 magic-byte validation | ✓ | `^22.0.1` (installed) | — |
| `STORAGE_PATH` env var | media disk writes | ✓ | defaults to `/app/media` | — |
| `MAX_UPLOAD_BYTES` env var | bodyLimit | ✓ | defaults to `10485760` (10 MB) | — |
| Docker volume (media storage) | DECKU-02 disk writes | ✓ | configured in docker-compose.yml | — |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** none

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 (pinned) |
| Config file | `apps/backend/vitest.config.ts` |
| Quick run command | `yarn workspace @kartex/backend test` |
| Full suite command | `yarn workspace @kartex/backend test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DECKU-01 | Preview endpoint accepts `.kartex.zip` (no 400) | unit | `yarn workspace @kartex/backend test deck-update` | ✅ (extend deck-update.test.ts) |
| DECKU-01 | Apply endpoint accepts `.kartex.zip` (no 400) | unit | `yarn workspace @kartex/backend test deck-update` | ✅ (extend deck-update.test.ts) |
| DECKU-02 | Media extracted + validated + stored on apply | unit | `yarn workspace @kartex/backend test deck-update` | ✅ (extend with zip mock) |
| DECKU-02 | Invalid MIME type in zip → 422 before any writes | unit | `yarn workspace @kartex/backend test deck-update` | ✅ (extend) |
| DECKU-03 | card.update data payload contains rewritten `media://uuid.*` refs | unit | `yarn workspace @kartex/backend test deck-update` | ✅ (extend) |
| DECKU-03 | card.createMany data contains rewritten media refs for added cards | unit | `yarn workspace @kartex/backend test deck-update` | ✅ (extend) |
| DECKU-04 | tx.card.update data payload excludes kartexId, easeFactor, interval, repetitions | unit | `yarn workspace @kartex/backend test deck-update` | ✅ (already T-16-08; verify still holds) |
| DECKU-01 | Frontend file picker accepts `.kartex.zip` (accept attribute) | manual/smoke | Open DeckDetailPage, click "Update from file", verify OS picker shows .kartex.zip | — |

### Sampling Rate

- **Per task commit:** `yarn workspace @kartex/backend test`
- **Per wave merge:** `yarn workspace @kartex/backend test && yarn workspace @kartex/frontend test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `apps/backend/src/lib/__tests__/importMedia.test.ts` — unit tests for the extracted helper (validateZipMedia, rewriteMediaRefs, ALLOWED_MIMES). Optional if coverage is provided through deck-update.test.ts integration-style tests.
- [ ] Mocking pattern for `node:fs/promises` (mkdir, writeFile) — not established in existing backend tests; must use `vi.mock('node:fs/promises', () => ({ mkdir: vi.fn(), writeFile: vi.fn() }))` with `'node:'` prefix [ASSUMED — standard Vitest pattern].
- [ ] Mocking pattern for `file-type` — must mock `fileTypeFromBuffer` to return controlled MIME types: `vi.mock('file-type', () => ({ fileTypeFromBuffer: vi.fn() }))`.
- [ ] Mocking pattern for `unzipper` — must mock `unzipper.Open.buffer` to return a fake directory object with `.files` array.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT auth middleware already on all `/api/decks/*` routes (inherited from index.ts step 4) |
| V4 Access Control | yes | Owner gate: `deck.ownerId !== userId → 403` — already in both preview and apply handlers; must remain in zip branch |
| V5 Input Validation | yes | Magic-bytes validation via `fileTypeFromBuffer` — never trust client-declared MIME type (T-5-03) |
| V6 Cryptography | no | Media files stored by UUID; no encryption needed for this phase |

### Known Threat Patterns for Zip Upload Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Zip bomb (nested/large archive) | DoS | `bodyLimit` (rejects large uploads pre-parse); `MAX_MEDIA_ENTRIES = 100` + `MAX_TOTAL_BYTES = MAX_BYTES * 10` uncompressed ceiling — from import.ts |
| Path traversal via zip entry path | Spoofing/Tampering | `basename(entry.path)` strips directories; UUID-based storage filename prevents any original path from touching filesystem |
| MIME spoofing via extension | Tampering | `fileTypeFromBuffer` magic-bytes detection ignores filename entirely |
| Unauthorized update by non-owner | Elevation of Privilege | `deck.ownerId !== userId → 403` guard runs before any file processing |
| TOCTOU on preview→apply | Tampering | Stateless: apply re-reads file and re-checks owner independently (v1.3-research pattern) |

---

## Sources

### Primary (HIGH confidence)
- `apps/backend/src/routes/import.ts` — full zip extraction + validation + storage implementation (production code) [VERIFIED: codebase]
- `apps/backend/src/routes/deckUpdate.ts` — current Phase 16 implementation, explicit .kartex.zip rejection [VERIFIED: codebase]
- `apps/frontend/src/pages/DeckDetailPage.tsx` — file picker `accept=".kartex"` at line 572 [VERIFIED: codebase]
- `apps/frontend/src/components/DeckUpdateModal.tsx` — full modal implementation [VERIFIED: codebase]
- `apps/frontend/src/locales/en.json` — existing `deckUpdate.*` i18n keys [VERIFIED: codebase]
- `.planning/STATE.md` — `v1.4-research: importMedia.ts shared helper to be extracted from import.ts for reuse in zip deck update` [VERIFIED: project planning]
- `apps/backend/prisma/schema.prisma` — `Card.@@unique([deckId, kartexId])`, `Media` model shape, `CardProgress` fields [VERIFIED: codebase]
- `apps/backend/package.json` — `unzipper@^0.12.3`, `file-type@^22.0.1` confirmed [VERIFIED: codebase]

### Secondary (MEDIUM confidence)
- Research cache: unzipper API (Open.buffer, files array, entry.buffer()) — confirmed from production use in import.ts
- Research cache: file-type fileTypeFromBuffer — confirmed from production use in import.ts
- Research cache: Hono bodyLimit placement — confirmed from production use in both import.ts and deckUpdate.ts
- Research cache: Vitest mocking pattern for node:fs/promises [ASSUMED — no existing example in project]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Vitest `vi.mock('node:fs/promises', ...)` works with the `node:` prefix in backend test environment | Validation Architecture | Tests for importMedia.ts won't run; alternative: mock at a higher level via the route test (pass mock prisma + mock writeFile via DI) |
| A2 | The preview endpoint should NOT extract/validate media from zip (stateless design) | Architecture Patterns | If user expectation is to see a warning about media validation failure before committing, preview needs to at least validate (but not store) — adds complexity |
| A3 | `storeMediaBuffers` can be called inside a Prisma `$transaction` callback without conflict (disk writes inside transaction) | Code Examples | If disk writes inside transaction cause issues, move media storage before the transaction and accept orphaned-file risk on transaction failure |

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already in production use in this codebase
- Architecture: HIGH — full source of import.ts and deckUpdate.ts read; patterns are direct extensions
- Pitfalls: HIGH — derived from careful reading of both source files and existing test cases
- Test patterns: MEDIUM — fs/promises mocking untested in this project specifically

**Research date:** 2026-06-30
**Valid until:** 2026-07-30 (stable stack; no fast-moving dependencies)

---

## RESEARCH COMPLETE
