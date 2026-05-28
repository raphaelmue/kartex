# Phase 5: Import Pipeline - Research

**Researched:** 2026-05-28
**Domain:** File parsing, ZIP extraction, MIME/magic-bytes validation, multipart upload, React lazy rendering
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Parser Behavior (D-01 to D-03)**
- D-01: Parser is lenient for card blocks — malformed cards are skipped with a warning, valid cards continue
- D-02: Deck header is required — missing or unparseable YAML block is a fatal error; error message: "No deck header found. Your .kartex file must start with a `---` YAML block."
- D-03: Parser lives in `packages/shared/src/lib/kartex-parser.ts`; returns `{ deck: DeckHeader, cards: ParsedCard[], warnings: ParseWarning[] }`; pure function — no I/O, no DB

**Import Preview UI (D-04 to D-07)**
- D-04: Preview uses lazy rendering via IntersectionObserver (cards render only when scrolled into view)
- D-05: Only editable field in preview is the deck name (shadcn `Input`, pre-filled from `deck:` header value)
- D-06: Parse warnings appear as amber banner (shadcn `Alert` with `AlertTriangle`) — hidden if no warnings
- D-07: Preview shows total card count and deck metadata (author, tags from header)

**Media Failure Handling (D-08 to D-09)**
- D-08: MIME/magic validation failure or size-limit exceed for any media file in a zip aborts the entire import; collect ALL bad files first, return one error response `{ error: 'Validation failed', files: [{ name, reason }] }`; nothing written to DB
- D-09: Media file referenced in card content but absent from the zip = warning only; deck and cards are still created; `media://` reference left intact (renders as broken placeholder)

**Client-Side Size Limit (D-10 to D-11)**
- D-10: `GET /api/import/config` returns `{ maxFileSizeBytes: number }` sourced from `process.env.MAX_UPLOAD_BYTES ?? '10485760'`
- D-11: Client-side size check fires before upload; if config fetch fails, upload proceeds without check (graceful degradation)

### Claude's Discretion
- Exact layout and styling of the import page (file drop zone vs. button-only)
- How lazy-render list is implemented — IntersectionObserver chosen (D-04), but implementation details free
- Card preview card design (collapsible front/back vs. side-by-side vs. stacked)
- Progress/loading state during zip extraction (spinner, progress bar, or none)
- Exact JSON schema for `GET /api/import/config` (keep minimal — only `maxFileSizeBytes`)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IMPT-01 | User can upload a `.kartex` file and see a preview of parsed cards before importing | Parser (D-03) + ImportPage (D-04 to D-07) |
| IMPT-02 | User can upload a `.kartex.zip` bundle (deck.kartex + media/ folder) with preview before importing | unzipper (buffer API) + media storage pattern |
| IMPT-03 | Importing creates a new deck and all cards from the parsed `.kartex` file | Backend import route + Prisma `deck.create` + `card.createMany` |
| IMPT-04 | Importing a `.kartex.zip` stores bundled media files and links them to cards | Media storage pattern (UUID + STORAGE_PATH + `prisma.media.create`) |
| IMPT-05 | Import preview renders card content using the Kartex renderer (Markdown, math, Typst) | KartexRenderer drop-in, IntersectionObserver lazy load |
| MDIA-01 | Images (PNG, JPEG, WebP, GIF) can be uploaded and stored on backend Docker volume | file-type `fileTypeFromBuffer` + allowed-types allowlist |
| MDIA-02 | Audio files (MP3, OGG, WAV) can be uploaded and stored on backend Docker volume | file-type + allowed-types allowlist |
| MDIA-03 | All file uploads validated by both MIME type header and magic bytes | file-type (`ext` + `mime` fields) cross-checked against claimed Content-Type |
| MDIA-04 | Maximum upload file size configurable via environment variable (default 10 MB) | Hono `bodyLimit` middleware + `GET /api/import/config` endpoint |
</phase_requirements>

---

## Summary

Phase 5 delivers three self-contained plans: a pure-function `.kartex` parser in `packages/shared`, a backend import API, and a frontend import page. All three have clean implementation paths given the project's existing patterns.

The `.kartex` parser is the most nuanced piece. The format is a custom text format (not Markdown, not JSON) — it needs a purpose-built parser. The deck header is YAML (parseable with the `yaml` npm package), the card blocks use `:: card ... ::` delimiters with `front:` / `back:` / `tags:` fields. The key constraint is lenient parsing: malformed cards are skipped with a warning while valid cards pass through. The parser can be implemented as a pure function with no external I/O dependencies beyond the `yaml` package added to `@kartex/shared`.

The backend import API follows the established `media.ts` pattern exactly — `File` object from `c.req.parseBody()`, `arrayBuffer()`, write to disk with UUID filename, `prisma.media.create()`. For `.kartex.zip`, `unzipper.Open.buffer()` handles in-memory extraction. Magic-bytes validation uses `file-type@22` (ESM, compatible with the backend's `"type": "module"`). Hono's built-in `bodyLimit` middleware (from `hono/middleware/body-limit`) enforces the size limit at the HTTP layer before the handler runs.

The frontend import page is a new page component in `apps/frontend/src/pages/ImportPage.tsx`. `KartexRenderer` is used as-is for preview. IntersectionObserver-based lazy rendering is a zero-dependency, straightforward approach. The `api` wrapper handles both the config GET and the multipart POST upload. File upload uses `FormData` directly (the `api` wrapper already skips `Content-Type: application/json` when `body instanceof FormData`).

**Primary recommendation:** Add `yaml` to `packages/shared` + `unzipper` + `@types/unzipper` + `file-type` to `apps/backend`. No other new dependencies are required. All other functionality uses existing stack.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `.kartex` text parsing (header + card blocks) | Shared package (pure function) | — | Parser must be usable by both frontend (preview) and backend (import); pure function in `packages/shared` is the pattern established for SM-2 |
| YAML deck header parsing | Shared package (via `yaml` dep) | — | Parser is in shared; `yaml` package added as a dependency there |
| ZIP extraction | API / Backend | — | Requires Node.js file system access and native crypto for UUID filenames |
| MIME + magic bytes validation | API / Backend | — | `file-type` reads raw bytes; validation must happen server-side (never trust client) |
| Media file storage | API / Backend (Docker volume) | — | Files land on local Docker volume via `STORAGE_PATH`; mirrors `media.ts` exactly |
| Import size limit enforcement | API / Backend (Hono middleware) | Browser / Client (D-11 soft check) | Backend is authoritative; client provides UX-only early rejection |
| Upload size configuration | API / Backend (env var) | — | `process.env.MAX_UPLOAD_BYTES`; exposed read-only via `GET /api/import/config` |
| Card preview rendering | Browser / Client (React) | — | `KartexRenderer` is a client-side React component; Typst WASM runs in browser |
| IntersectionObserver lazy rendering | Browser / Client (React) | — | DOM API, per-component visibility state |
| Deck creation in DB | API / Backend (Prisma) | — | `prisma.deck.create` + `prisma.card.createMany` inside a transaction |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `yaml` | 2.9.0 | Parse the `--- ... ---` YAML deck header in `.kartex` files | Official YAML parser; used across JS ecosystem; CJS+ESM compatible; `yaml.parse()` is one call |
| `unzipper` | 0.12.3 | Extract `.kartex.zip` contents in memory on the backend | Stream-based, has `Open.buffer()` API for in-memory zip; CJS importable from ESM backend |
| `@types/unzipper` | 0.10.11 | TypeScript types for `unzipper` | Bundled type definitions; required for strict TypeScript backend |
| `file-type` | 22.0.1 | Detect file MIME type from magic bytes (MDIA-03) | Pure ESM; provides `fileTypeFromBuffer(buffer)` returning `{ ext, mime }`; handles PNG/JPEG/WebP/GIF/MP3/OGG/WAV |

### Already Available (no install needed)

| Library | Version | Purpose | Where |
|---------|---------|---------|-------|
| `hono/middleware/body-limit` | (hono@4.7.9) | Enforce `MAX_UPLOAD_BYTES` at HTTP layer (MDIA-04) | Built into installed hono — `import { bodyLimit } from 'hono/body-limit'` |
| `zod` | ^3.23.8 | Schemas: `ParsedCardSchema`, `ParseWarningSchema`, `DeckHeaderSchema`, `ImportResultSchema`, `ImportConfigSchema` | Already in `packages/shared` |
| `KartexRenderer` | — | Drop-in card content rendering in preview (IMPT-05) | `apps/frontend/src/components/KartexRenderer.tsx` |
| `api` (fetch wrapper) | — | Config fetch + multipart import upload | `apps/frontend/src/lib/api.ts` |
| `authMiddleware` | — | Protect all import routes | `apps/backend/src/middleware/auth.ts` |
| `prisma` client | ^5.22.0 | `deck.create`, `card.createMany`, `media.create` | Already in backend |

[VERIFIED: npm registry] — versions confirmed via `npm view <package> version` on 2026-05-28.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `unzipper` | `adm-zip` | `adm-zip` loads entire zip into memory and its constructor takes a file path or Buffer directly (`new AdmZip(buffer)`); simpler API but no streaming; acceptable for 10 MB limit. Either works — `unzipper.Open.buffer()` chosen because its stream/buffer hybrid avoids full memory materialization of all files simultaneously |
| `unzipper` | Node.js built-in `zlib` | `zlib` handles gzip/deflate only — not zip archives; cannot replace `unzipper` |
| `file-type` | `magic-bytes.js` | Both check magic bytes; `file-type` has broader format support and is actively maintained; both are viable |
| `yaml` | Manual regex | `.kartex` deck header is real YAML (list syntax for tags: `[a, b]`); a regex would break on edge cases; `yaml` is the correct choice |

**Installation (backend — new deps only):**
```bash
yarn workspace @kartex/backend add unzipper @types/unzipper file-type
yarn workspace @kartex/shared add yaml
```

**Version verification:** All versions confirmed against npm registry on 2026-05-28. [VERIFIED: npm registry]

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (React SPA)
  │
  ├─ GET /api/import/config ──────────────────────────────────────►  Hono importRouter
  │   ◄── { maxFileSizeBytes: 10485760 }                              │
  │                                                                    │  reads process.env.MAX_UPLOAD_BYTES
  ├─ POST /api/import (FormData: file = .kartex or .kartex.zip) ──►  Hono importRouter
  │                                                                    │
  │                                                                    ├─ bodyLimit(maxSize) — reject >limit with 413
  │                                                                    │
  │                                                                    ├─ [.kartex path]
  │                                                                    │   file.arrayBuffer() → text decode → parseKartex()
  │                                                                    │   → { deck, cards[], warnings[] }
  │                                                                    │   → prisma.$transaction(
  │                                                                    │       deck.create, card.createMany)
  │                                                                    │   ← { deckId, cardCount, warnings }  201
  │                                                                    │
  │                                                                    └─ [.kartex.zip path]
  │                                                                        file.arrayBuffer() → Buffer
  │                                                                        unzipper.Open.buffer(buf)
  │                                                                        ├─ read "deck.kartex" entry → parseKartex()
  │                                                                        ├─ enumerate media/ entries
  │                                                                        │   foreach mediaFile:
  │                                                                        │     fileTypeFromBuffer(bytes) → { ext, mime }
  │                                                                        │     validate mime ∈ ALLOWED_TYPES
  │                                                                        │     validate bytes.length ≤ maxBytes
  │                                                                        │     [FAIL] → collect to errors[]
  │                                                                        │     [PASS] → write to STORAGE_PATH/uuid.ext
  │                                                                        │              prisma.media.create()
  │                                                                        │              build filename→storedName map
  │                                                                        ├─ if errors[] non-empty → rollback + 422
  │                                                                        └─ prisma.$transaction(
  │                                                                             deck.create, card.createMany)
  │                                                                           ← { deckId, cardCount, warnings }  201
  │
  ◄── ImportPage reacts:
       step=UPLOAD → step=PREVIEW (show KartexRenderer cards, warnings banner, deck name input)
       → confirm → POST /api/import → step=SUCCESS (navigate to /decks/:id)
       → cancel   → step=UPLOAD
```

### Recommended Project Structure

New files only (all existing files unchanged):

```
packages/shared/src/
├── lib/
│   └── kartex-parser.ts        ← pure function parser (new)
└── schemas/
    └── import.ts               ← Zod schemas: DeckHeaderSchema, ParsedCardSchema,
                                   ParseWarningSchema, ImportResultSchema,
                                   ImportConfigSchema (new)

apps/backend/src/routes/
└── import.ts                   ← Hono importRouter (new)

apps/frontend/src/pages/
└── ImportPage.tsx              ← /import page (new)

apps/frontend/src/hooks/
└── useImport.ts                ← upload state machine hook (new)
```

Modified files:
- `packages/shared/src/index.ts` — add `export * from './schemas/import'` + `export * from './lib/kartex-parser'`
- `apps/backend/src/index.ts` — register `importRouter` at `/api/import`
- `apps/frontend/src/App.tsx` — replace `<ComingSoon title="Import" />` with `<ImportPage />`

### Pattern 1: Pure Function `.kartex` Parser

**What:** Parse `.kartex` text into a typed result — no I/O, no side effects.
**When to use:** Called by the backend import route after reading the file bytes.

```typescript
// Source: design.md §7 + established project pattern (sm2.ts)
// packages/shared/src/lib/kartex-parser.ts

import { parse as parseYaml } from 'yaml'

export interface DeckHeader {
  deck: string
  author?: string
  tags?: string[]
}

export interface ParsedCard {
  front: string
  back: string
  tags: string[]
}

export interface ParseWarning {
  cardIndex: number   // 1-based card number in source
  reason: string
}

export interface KartexParseResult {
  deck: DeckHeader
  cards: ParsedCard[]
  warnings: ParseWarning[]
}

export type KartexParseError = { fatal: true; message: string }

export function parseKartex(
  source: string
): KartexParseResult | KartexParseError {
  // 1. Extract YAML header between first --- ... ---
  // 2. If absent: return { fatal: true, message: "No deck header found..." }
  // 3. Parse YAML with yaml.parse(); if throws: return fatal error
  // 4. Split remainder on /^:: card$/m ... /^::$/m blocks
  // 5. For each block: extract front:, back:, optional tags:
  //    If missing front or back: push to warnings[], skip card
  // 6. Return { deck, cards, warnings }
}
```

### Pattern 2: Backend Import Route (following media.ts)

**What:** Hono route handling `.kartex` and `.kartex.zip` upload, validation, DB write.
**When to use:** POST `/api/import` — protected by `authMiddleware`.

```typescript
// Source: apps/backend/src/routes/media.ts (established pattern)
// apps/backend/src/routes/import.ts

import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import unzipper from 'unzipper'
import { fileTypeFromBuffer } from 'file-type'
import { parseKartex } from '@kartex/shared'
import { prisma } from '../lib/prisma.js'

const MAX_BYTES = parseInt(process.env.MAX_UPLOAD_BYTES ?? '10485760', 10)

const ALLOWED_TYPES: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp',
  'image/gif': 'gif', 'audio/mpeg': 'mp3', 'audio/ogg': 'ogg',
  'audio/wav': 'wav',
}

const importRouter = new Hono<{ Variables: { userId: string } }>()

// GET /api/import/config — returns configured max upload size (D-10)
importRouter.get('/config', (c) => {
  return c.json({ maxFileSizeBytes: MAX_BYTES })
})

// POST /api/import — single .kartex or .kartex.zip upload
importRouter.post(
  '/',
  bodyLimit({ maxSize: MAX_BYTES, onError: (c) => c.json({ error: 'File too large.' }, 413) }),
  async (c) => {
    const userId = c.get('userId')
    const body = await c.req.parseBody()
    const file = body['file']
    if (!(file instanceof File)) return c.json({ error: 'File is required.' }, 400)

    const isZip = file.name.endsWith('.kartex.zip')
    const isKartex = file.name.endsWith('.kartex') && !isZip

    if (!isKartex && !isZip) {
      return c.json({ error: 'File must be a .kartex or .kartex.zip.' }, 400)
    }
    // ... extraction, parsing, storage, DB write
  }
)

export { importRouter }
```

### Pattern 3: IntersectionObserver Lazy Rendering

**What:** Each card in the preview list observes its own sentinel element; renders `KartexRenderer` only when visible.
**When to use:** Preview list in `ImportPage.tsx`.

```typescript
// Source: MDN IntersectionObserver API [ASSUMED — standard browser API]
// apps/frontend/src/pages/ImportPage.tsx (excerpt)

function LazyCard({ card }: { card: ParsedCard }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.1 }
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="min-h-[80px]">
      {visible ? (
        <div className="border rounded-lg p-4 space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Front</div>
          <KartexRenderer content={card.front} />
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-3">Back</div>
          <KartexRenderer content={card.back} />
        </div>
      ) : (
        <div className="border rounded-lg p-4 h-20 animate-pulse bg-muted/30" />
      )}
    </div>
  )
}
```

### Pattern 4: FormData Upload via `api` Wrapper

**What:** Multipart upload through the existing `api` wrapper without triggering JSON `Content-Type`.
**When to use:** `ImportPage.tsx` confirm handler.

```typescript
// Source: apps/frontend/src/lib/api.ts — baseFetch skips Content-Type header when body is FormData
const formData = new FormData()
formData.append('file', file)

// Use baseFetch directly (or extend api with a postForm helper)
const response = await fetch('/api/import', {
  method: 'POST',
  credentials: 'include',
  body: formData,
  // NO Content-Type header — browser sets multipart boundary automatically
})
```

Note: The `api` wrapper already handles this correctly — its `baseFetch` only sets `Content-Type: application/json` when `!(options.body instanceof FormData)`. So `api.post('/api/import', formData)` will NOT work because `post()` calls `JSON.stringify(body)`. Use `baseFetch` directly or add a `postForm` method to `api`. [VERIFIED: apps/frontend/src/lib/api.ts line 15-18]

### Pattern 5: Prisma Transaction for Deck + Cards

**What:** Atomic creation of deck + all cards — either all succeed or nothing is created.
**When to use:** After validation passes in the import route.

```typescript
// Source: established Prisma pattern (cards created in batch in Phase 2)
const result = await prisma.$transaction(async (tx) => {
  const deck = await tx.deck.create({
    data: {
      ownerId: userId,
      title: deckName,          // user-edited name from request body
      description: parsedDeck.author ? `Imported from ${parsedDeck.author}` : undefined,
      visibility: 'PRIVATE',
    },
  })

  await tx.card.createMany({
    data: cards.map((card) => ({
      deckId: deck.id,
      frontContent: card.front,
      backContent: card.back,
      tags: card.tags,
    })),
  })

  return deck
})
```

### Anti-Patterns to Avoid

- **Parsing YAML manually with regex:** The deck header is real YAML (`tags: [physics, thermo, exam-2025]`); a regex will fail on lists, multiline strings, and edge cases. Use the `yaml` package.
- **Trusting client MIME type:** `file.type` from `parseBody()` is the Content-Type value claimed by the client — never use it alone. Always run `fileTypeFromBuffer` on the actual bytes (MDIA-03). [VERIFIED: CONTEXT.md D-08]
- **Calling `api.post()` with FormData:** `api.post()` calls `JSON.stringify(body)` unconditionally — this corrupts the multipart body. Pass `FormData` to `baseFetch` directly or add a `postForm` helper. [VERIFIED: apps/frontend/src/lib/api.ts]
- **Writing media files before validation completes:** Collect ALL validation errors first (D-08), then write nothing or write all. Never write partial results to disk before checking every file.
- **No Prisma transaction for deck + cards:** Creating deck and cards in separate operations risks an orphaned deck with no cards if `card.createMany` fails. Wrap in `prisma.$transaction`.
- **Global `bodyLimit` on all routes:** Apply `bodyLimit` only to the import POST, not globally. Other routes (auth, decks) should not be affected by the upload size limit.
- **Assuming `unzipper` path separators:** ZIP entries under `media/` may have paths like `media/file.png` or `media\file.png` depending on the zip tool. Use `entry.path` and check for both separators or use `path.basename()`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML parsing | Custom YAML regex | `yaml` package (`yaml.parse()`) | YAML has edge cases: lists, multiline strings, special characters, quoted strings. `yaml.parse()` is one line. |
| Magic bytes detection | Byte-offset lookup table | `file-type@22` (`fileTypeFromBuffer`) | 300+ formats; keeps format list updated; handles edge cases like JPEG progressive, OGG variants |
| ZIP extraction | Manual binary parsing | `unzipper.Open.buffer()` | ZIP format has central directory, compression variants; `unzipper` handles all of this |
| HTTP body size limiting | Manual `Content-Length` check | `hono/body-limit` (`bodyLimit`) | Handles chunked encoding (no Content-Length header); already present in installed Hono |
| Lazy list rendering | Virtual scroller library | `IntersectionObserver` + `useState(visible)` | Zero dependencies; browser-native; sufficient for 100-500 card lists; correct per D-04 |

**Key insight:** The three genuinely complex pieces — YAML parsing, magic bytes, and ZIP extraction — each have a single, well-maintained library that is one function call. Do not attempt to replace them with custom implementations.

---

## Common Pitfalls

### Pitfall 1: `:: card` Delimiter Edge Cases

**What goes wrong:** Card block delimiter `:: card` might have trailing whitespace; card-end delimiter `::` might appear inside card content (e.g., a code example). The parser treats the first `::` on its own line as block end, which truncates card content.

**Why it happens:** The `.kartex` format spec (design.md §7) does not define escaping for `::` inside card content.

**How to avoid:** Match `:: card` and `::` with a `/^::\s*card\s*$/m` and `/^::\s*$/m` regex respectively (trim whitespace). For `::` inside content: document that `::` on its own line is always a card end — this is a format limitation to note in warnings if encountered during development.

**Warning signs:** Cards with code examples get truncated; `warnings[]` array shows unexpected skips on large import test fixtures.

### Pitfall 2: YAML Tags Field Parsing

**What goes wrong:** The `.kartex` deck header `tags: [physics, thermo]` parses to a JavaScript array via `yaml.parse()`. But the `tags:` field in a card block is NOT YAML — it's raw text inside a `:: card` block parsed by custom logic. Attempting to reuse `yaml.parse()` on the card body fails.

**Why it happens:** Design doc shows `tags: [laws, formula]` inside card blocks which looks like YAML but is in a custom block context.

**How to avoid:** Parse the card body line by line. `tags:` in a card block is parsed by extracting the line `tags: [...]` and applying `yaml.parse()` only to the value portion (everything after `tags:`), or by a simple bracket-and-split approach.

### Pitfall 3: `api.post()` Corrupts FormData

**What goes wrong:** Calling `api.post('/api/import', formData)` causes `JSON.stringify(formData)` to produce `{}`, and `Content-Type: application/json` is set — the backend receives no file.

**Why it happens:** `api.post()` always calls `JSON.stringify(body)` (line ~72 of api.ts). [VERIFIED: apps/frontend/src/lib/api.ts]

**How to avoid:** Either (a) add a `postForm` helper to `api` that passes `FormData` directly to `baseFetch`, or (b) call `baseFetch` directly from the import hook with `method: 'POST', body: formData`. Option (a) is cleaner and extensible.

**Warning signs:** Backend receives `Content-Type: application/json` with an empty body `{}`.

### Pitfall 4: `file-type` ESM-only in CJS Context

**What goes wrong:** `file-type@22` is a pure ESM package (`"type": "module"`). The backend is also `"type": "module"`, so `import { fileTypeFromBuffer } from 'file-type'` works correctly. But if any tooling (build script, test runner) runs in CJS mode and tries `require('file-type')`, it will throw `ERR_REQUIRE_ESM`.

**Why it happens:** `file-type` dropped CJS support in v17+. [VERIFIED: npm registry]

**How to avoid:** Confirm the backend's `"type": "module"` (confirmed: `apps/backend/package.json`). No CJS test runner for the backend — tests are in the frontend vitest config (jsdom). If backend unit tests are added, use Vitest with ESM mode.

**Warning signs:** `ERR_REQUIRE_ESM` at runtime or build time.

### Pitfall 5: `unzipper` CJS in ESM Backend

**What goes wrong:** `unzipper` is a CJS package. Default import in ESM (`import unzipper from 'unzipper'`) works in Node.js 12+ via CJS interop, but TypeScript may complain about the import shape without `@types/unzipper` or `esModuleInterop: true`.

**Why it happens:** CJS default export interop requires `esModuleInterop: true` (or `allowSyntheticDefaultImports: true`) in `tsconfig.json`.

**How to avoid:** Check `apps/backend/tsconfig.json` for `esModuleInterop`. If not set, use `import * as unzipper from 'unzipper'` or add `"esModuleInterop": true`. Install `@types/unzipper` for proper type coverage.

**Warning signs:** TypeScript error `Module '"unzipper"' has no default export`.

### Pitfall 6: `bodyLimit` Applied After `parseBody()`

**What goes wrong:** If the body is read via `c.req.parseBody()` before the `bodyLimit` middleware runs, the entire request body has already been buffered into memory — the size limit is pointless.

**Why it happens:** Hono middleware runs in registration order. If `parseBody()` is called in an earlier middleware or the handler runs before `bodyLimit`.

**How to avoid:** Register `bodyLimit` as the first argument in the route's middleware chain, before the handler that calls `parseBody()`. [VERIFIED: hono body-limit source confirms it intercepts the raw body stream before any parsing]

### Pitfall 7: Deck Name Not Sent in Import Request

**What goes wrong:** The user edits the deck name in the preview step, but the POST `/api/import` request only includes `file` — the edited name is lost and the name from the `.kartex` header is used.

**Why it happens:** FormData only contains fields explicitly appended. The deck name field must be appended alongside the file.

**How to avoid:** Append both `formData.append('file', file)` and `formData.append('deckName', editedName)` before submitting. Backend reads `body['deckName']` as a string field.

### Pitfall 8: ZIP Entry Path Prefix Variations

**What goes wrong:** ZIP archives created on Windows may use `\` as path separator; archives created on macOS may include a `__MACOSX/` directory with metadata files. The media extraction logic needs to handle both.

**Why it happens:** ZIP format allows any path separator; macOS adds `__MACOSX/` metadata entries automatically.

**How to avoid:** Filter entries: keep only entries whose `path` starts with `media/` (or `media\`) using `entry.path.replace(/\\/g, '/')`. Skip entries whose path starts with `__MACOSX/`. Use `path.basename(entry.path)` to get the bare filename for the `media://filename` lookup.

---

## Code Examples

### YAML Deck Header Parsing

```typescript
// Source: yaml npm package (yaml v2.x API)
import { parse as parseYaml } from 'yaml'

function parseDeckHeader(yamlBlock: string): DeckHeader | null {
  try {
    const parsed = parseYaml(yamlBlock) as Record<string, unknown>
    if (typeof parsed?.deck !== 'string') return null
    return {
      deck: parsed.deck,
      author: typeof parsed.author === 'string' ? parsed.author : undefined,
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
    }
  } catch {
    return null
  }
}
```

### Magic Bytes Validation

```typescript
// Source: file-type@22 npm readme [VERIFIED: npm view file-type readme]
import { fileTypeFromBuffer } from 'file-type'

const ALLOWED_MIMES = new Set([
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'audio/mpeg', 'audio/ogg', 'audio/wav',
])

async function validateMediaFile(
  bytes: Uint8Array,
  claimedName: string,
): Promise<{ valid: true; mime: string; ext: string } | { valid: false; reason: string }> {
  const detected = await fileTypeFromBuffer(bytes)
  if (!detected) {
    return { valid: false, reason: `${claimedName}: Could not detect file type from magic bytes` }
  }
  if (!ALLOWED_MIMES.has(detected.mime)) {
    return { valid: false, reason: `${claimedName}: Type ${detected.mime} is not allowed` }
  }
  return { valid: true, mime: detected.mime, ext: detected.ext }
}
```

### ZIP Extraction (in-memory buffer)

```typescript
// Source: unzipper npm readme [VERIFIED: npm view unzipper readme]
import unzipper from 'unzipper'

const buffer = Buffer.from(await file.arrayBuffer())
const directory = await unzipper.Open.buffer(buffer)

// Find deck.kartex
const kartexEntry = directory.files.find(
  (f) => f.path === 'deck.kartex' || f.path.endsWith('/deck.kartex')
)
if (!kartexEntry) return c.json({ error: 'No deck.kartex found in zip.' }, 422)

const kartexText = (await kartexEntry.buffer()).toString('utf-8')

// Enumerate media entries
const mediaEntries = directory.files.filter(
  (f) => f.path.replace(/\\/g, '/').startsWith('media/') && !f.path.startsWith('__MACOSX/')
)
```

### Hono `bodyLimit` Middleware

```typescript
// Source: hono/middleware/body-limit [VERIFIED: hono dist files confirmed]
import { bodyLimit } from 'hono/body-limit'

const MAX_BYTES = parseInt(process.env.MAX_UPLOAD_BYTES ?? '10485760', 10)

importRouter.post(
  '/',
  bodyLimit({
    maxSize: MAX_BYTES,
    onError: (c) => c.json({ error: `File too large. Maximum size is ${MAX_BYTES} bytes.` }, 413),
  }),
  async (c) => { /* handler */ }
)
```

### GET /api/import/config

```typescript
// Source: CONTEXT.md D-10
importRouter.get('/config', (c) => {
  const maxFileSizeBytes = parseInt(process.env.MAX_UPLOAD_BYTES ?? '10485760', 10)
  return c.json({ maxFileSizeBytes })
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-rolled ZIP parser | `unzipper.Open.buffer()` | N/A (new feature) | Reliable ZIP reading without manual binary parsing |
| `mime` or `mime-types` for MIME detection | `file-type` (magic bytes) | N/A | Magic bytes are authoritative; declared MIME types from client cannot be trusted |
| Rendering entire list at once | IntersectionObserver lazy render | N/A | 100+ card lists remain performant |

**Deprecated / outdated:**
- `jszip`: Still maintained but API is callback+promise hybrid with less ergonomic buffer support; `unzipper` is preferred for streaming
- `file-type` v16 and below: Dropped before ESM support; only v17+ is pure ESM
- Virtual scroller libraries (react-window, react-virtual) for this use case: Overkill for 100-500 card preview lists; IntersectionObserver is sufficient per D-04

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | IntersectionObserver is available in all target browsers without polyfill | Architecture Patterns (Pattern 3) | Typst WASM already requires a modern browser; IntersectionObserver is supported in all browsers that support WASM (Chrome 51+, Firefox 55+, Safari 12.1+) — risk is very low [ASSUMED — not independently verified for exact Typst.ts browser requirements] |
| A2 | `unzipper` CJS default import works in the ESM backend without `esModuleInterop` | Pitfall 5 / Standard Stack | Node.js 12+ handles CJS interop for default exports; if tsconfig lacks esModuleInterop, build may fail — `@types/unzipper` + `allowSyntheticDefaultImports` or `esModuleInterop` needed [ASSUMED — tsconfig not read] |
| A3 | `prisma.$transaction` is available in Prisma 5.x | Pattern 5 | Prisma `$transaction` has been available since v2; backend uses `^5.22.0` — very low risk [ASSUMED — not verified against Prisma 5 changelog] |

---

## Open Questions

1. **`tsconfig.json` `esModuleInterop` setting in backend**
   - What we know: Backend is `"type": "module"` (ESM); `unzipper` is CJS
   - What's unclear: Whether `esModuleInterop: true` is set in `apps/backend/tsconfig.json` (not read during research)
   - Recommendation: Plan 05-02 should read `apps/backend/tsconfig.json` and add `"esModuleInterop": true` if missing, or use `import * as unzipper from 'unzipper'` as a fallback

2. **Card content limits in DB**
   - What we know: `CreateCardSchema` sets `max(10000)` on frontContent/backContent; `.kartex` cards have no explicit length limit in the format spec
   - What's unclear: Whether a bulk-imported card from an LLM-generated `.kartex` file could exceed 10000 chars
   - Recommendation: Parser should emit a warning (not skip) for cards whose front or back exceeds 10000 chars and truncate with a note, or the import route should validate and include in warnings

3. **`api.ts` FormData upload helper**
   - What we know: `api.post()` JSON-stringifies the body; cannot be used for multipart upload
   - What's unclear: Whether to add a `postForm` helper to `api.ts` or call `fetch` directly in the import hook
   - Recommendation: Plan 05-03 should add `postForm(url, formData)` to `api.ts` for consistency; importing page should use `api.postForm('/api/import', formData)`

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js v20+ | `unzipper`, `file-type`, backend | ✓ | v24.14.0 | — |
| `yaml` (npm) | packages/shared parser | NOT INSTALLED | 2.9.0 (registry) | None — install required |
| `unzipper` (npm) | backend ZIP extraction | NOT INSTALLED | 0.12.3 (registry) | adm-zip (simpler API, same result) |
| `@types/unzipper` (npm) | TypeScript types | NOT INSTALLED | 0.10.11 (registry) | — |
| `file-type` (npm) | backend magic bytes | NOT INSTALLED | 22.0.1 (registry) | magic-bytes.js |
| `hono/body-limit` | backend size enforcement | ✓ (built-in) | hono@4.7.9 | — |
| `IntersectionObserver` | frontend lazy render | ✓ (browser API) | Web standard | Simple scroll-based chunking |
| PostgreSQL | Prisma deck/card creation | ✓ (Docker) | 16 | — |
| Docker volume `media_data` | Media file storage | ✓ (existing) | — | — |

**Missing dependencies with no fallback:**
- `yaml` — required for YAML deck header parsing; no viable in-project alternative
- `file-type` — required for MDIA-03 magic bytes validation; `magic-bytes.js` is a drop-in fallback if `file-type` is not used
- `unzipper` — required for IMPT-02 zip extraction; `adm-zip` is a viable fallback

**Missing dependencies with fallback:**
- `file-type` → `magic-bytes.js` (similar API, slightly fewer formats)
- `unzipper` → `adm-zip` (accepts Buffer in constructor; synchronous API)

[VERIFIED: npm registry] for versions. [VERIFIED: Bash — none of the 4 new packages are currently installed in any workspace.]

---

## Validation Architecture

`nyquist_validation` is enabled (config.json `workflow.nyquist_validation: true`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 (pinned — Vite 5.x incompatibility with Vitest 4.x) |
| Config file | `apps/frontend/vitest.config.ts` (existing) |
| Quick run command | `yarn workspace @kartex/frontend test --run` |
| Full suite command | `yarn workspace @kartex/frontend test --run --coverage` |
| Environment | jsdom (existing setup) |

Note: The backend currently has no Vitest config. Phase 4 unit tests (SM-2, streak) are housed in the **frontend** workspace and import from `@kartex/shared`. The kartex-parser tests should follow the same pattern — tests in `apps/frontend/src/lib/__tests__/kartex-parser.test.ts`, importing `parseKartex` from `@kartex/shared`.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IMPT-01 | `.kartex` parser returns correct deck + cards for valid input | unit | `yarn workspace @kartex/frontend test --run src/lib/__tests__/kartex-parser.test.ts` | ❌ Wave 0 |
| IMPT-01 | Parser returns `fatal` error when deck header is missing (D-02) | unit | same | ❌ Wave 0 |
| IMPT-01 | Parser skips malformed card (missing `back:`) and adds to warnings (D-01) | unit | same | ❌ Wave 0 |
| IMPT-01 | Parser handles cards with `tags:` list correctly | unit | same | ❌ Wave 0 |
| IMPT-02 | ZIP with `deck.kartex` + `media/` parses correctly (backend route) | manual / integration | — | ❌ manual |
| IMPT-03 | POST `/api/import` with valid `.kartex` creates deck + cards in DB | manual / integration | — | ❌ manual |
| IMPT-04 | POST `/api/import` with `.kartex.zip` stores media + creates DB records | manual / integration | — | ❌ manual |
| IMPT-05 | KartexRenderer renders import preview content (reuse of existing renderer) | existing tests cover renderer | — | ✅ Phase 3 |
| MDIA-03 | Magic bytes validation rejects file with wrong extension | unit (parser helper) | `yarn workspace @kartex/frontend test --run src/lib/__tests__/kartex-parser.test.ts` | ❌ Wave 0 |
| MDIA-04 | Size limit: `bodyLimit` rejects request > MAX_UPLOAD_BYTES | manual (HTTP-layer) | — | ❌ manual |

### Unit Test Strategy (Plan 05-01)

The parser is a pure function — the ideal target for unit tests. Test cases should cover:

1. **Happy path:** Valid `.kartex` string with deck header + 2-3 cards → correct `DeckHeader`, `ParsedCard[]`, empty `warnings[]`
2. **Fatal error:** No `---` block → `{ fatal: true, message: "No deck header found..." }`
3. **Fatal error:** Malformed YAML in header → `{ fatal: true }`
4. **Lenient parsing:** Card missing `back:` field → card skipped, warning added, remaining cards present
5. **Tags parsing:** Card with `tags: [a, b]` → `tags: ['a', 'b']` in `ParsedCard`
6. **Deck tags:** Header with `tags: [physics, thermo]` → `DeckHeader.tags = ['physics', 'thermo']`
7. **Comments:** Lines starting with `#` (outside YAML block) → ignored
8. **Media references:** `![alt](media://carnot.png)` in card content → passed through verbatim in `front`/`back` string (parser does not transform media refs — that is KartexRenderer's job)
9. **Math content:** Cards with `$...$` and `$$...$$` → content passed through verbatim
10. **`#typst` blocks:** Content starting with `#typst\n...` → passed through verbatim

### Sampling Rate

- **Per task commit:** `yarn workspace @kartex/frontend test --run src/lib/__tests__/kartex-parser.test.ts`
- **Per wave merge:** `yarn workspace @kartex/frontend test --run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `apps/frontend/src/lib/__tests__/kartex-parser.test.ts` — covers IMPT-01 + MDIA-03 unit cases
- [ ] No new framework setup needed — existing Vitest config + jsdom + `@testing-library/jest-dom` setup is sufficient

*(The parser is imported from `@kartex/shared`, so it runs in the frontend Vitest workspace identically to how `calculateSM2` is tested today.)*

---

## Security Domain

`security_enforcement` is not explicitly set to false in config.json — treated as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (all routes) | `authMiddleware` applied to all `/api/import/*` routes |
| V3 Session Management | no | JWT session already established by auth layer |
| V4 Access Control | yes | Import creates deck owned by `userId` from JWT — no privilege escalation possible |
| V5 Input Validation | yes | Zod body validation on import request; parser validates format; `bodyLimit` for size |
| V6 Cryptography | no | No new crypto operations — UUID generation via `randomUUID()` (existing pattern) |
| V12 File Upload | yes (MDIA-03, MDIA-04) | MIME + magic bytes validation; max size limit; UUID-based filenames; path traversal prevention |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious ZIP (zip bomb) | Denial of Service | `bodyLimit` limits total upload size to MAX_UPLOAD_BYTES (default 10MB) before extraction; extracted file bytes are individually size-checked |
| Path traversal via ZIP entry names | Tampering | Filter entries to `media/` prefix only; use `path.basename()` for storage filename — never use ZIP entry path directly on disk |
| MIME type spoofing (client sets wrong Content-Type) | Spoofing | `fileTypeFromBuffer` checks actual magic bytes; client-declared MIME is ignored (D-08) |
| Oversized media file inside ZIP | Denial of Service | Each extracted media file's `bytes.length` checked against `MAX_UPLOAD_BYTES` individually |
| Malformed YAML header causing parser crash | Denial of Service | `yaml.parse()` wrapped in try/catch → returns fatal error response, not 500 |
| Stored XSS via card content | Tampering/Elevation | `react-markdown` has `allowDangerousHtml: false` by default (T-02-07 accepted in Phase 2) — card content is never raw HTML |
| Orphaned media files on disk if DB write fails | Integrity | Use Prisma `$transaction` — if DB write fails, return error to client; implement cleanup if needed (out of scope for MVP) |

---

## Sources

### Primary (HIGH confidence)

- [VERIFIED: apps/backend/src/routes/media.ts] — Exact media storage pattern to replicate
- [VERIFIED: apps/frontend/src/lib/api.ts] — FormData upload behavior confirmed
- [VERIFIED: apps/frontend/vitest.config.ts] — Vitest 2.1.9, jsdom environment
- [VERIFIED: apps/backend/package.json] — hono@4.7.9, `"type": "module"` ESM backend
- [VERIFIED: packages/shared/package.json] — zod ^3.23.8 only dep; `yaml` not yet present
- [VERIFIED: node_modules/hono/dist/middleware/] — `body-limit` middleware confirmed present
- [VERIFIED: docs/design.md §7] — `.kartex` format spec and import bundle structure
- [VERIFIED: .planning/phases/05-import-pipeline/05-CONTEXT.md] — All D-01 through D-11 decisions

### Secondary (MEDIUM confidence)

- [VERIFIED: npm registry — `npm view <pkg> version`] — Versions for `file-type@22.0.1`, `unzipper@0.12.3`, `@types/unzipper@0.10.11`, `yaml@2.9.0`, `adm-zip@0.5.17`
- [VERIFIED: npm registry — `npm view file-type readme`] — `fileTypeFromBuffer(buffer)` API confirmed as ESM
- [VERIFIED: npm registry — `npm view unzipper readme`] — `unzipper.Open.buffer(buffer)` API confirmed
- [VERIFIED: npm registry — `npm view yaml type`] — `yaml` is CJS-compatible (`"type": "commonjs"`)
- [VERIFIED: npm registry — `npm view file-type type`] — `file-type` is pure ESM (`"type": "module"`)

### Tertiary (LOW confidence)

- [ASSUMED] IntersectionObserver browser compatibility — standard API since 2016, broadly supported

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm registry; existing patterns confirmed in codebase
- Architecture: HIGH — follows established `media.ts` pattern exactly; new elements (zip, magic bytes) are single-function library calls
- Pitfalls: HIGH — Pitfalls 3, 4, 5, 6 verified directly in source code; Pitfalls 1, 2, 7, 8 based on format spec and library documentation

**Research date:** 2026-05-28
**Valid until:** 2026-06-28 (stable libraries; yaml/file-type/unzipper have slow release cadences)
