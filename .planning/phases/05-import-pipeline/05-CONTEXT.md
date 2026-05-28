# Phase 5: Import Pipeline - Context

**Gathered:** 2026-05-28
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the complete `.kartex` import pipeline: a pure-function parser for `.kartex` files (living in `packages/shared`), a backend Import API (single-file and `.kartex.zip` bundle upload, MIME + magic bytes validation, media extraction and storage, deck + card creation), and an `/import` frontend page (file picker, lazy-rendered card preview with `KartexRenderer`, deck name editing, confirm/cancel flow).

**In scope:** IMPT-01 through IMPT-05, MDIA-01 through MDIA-04. Three plans per roadmap: (1) `.kartex` parser in `packages/shared`, (2) Import API, (3) Import page UI.

**Out of scope:** Deck sharing and fork (Phase 6), AI-generated deck from script (v2), editing individual card content during the import preview (user can only rename the deck).

</domain>

<decisions>
## Implementation Decisions

### Parser Behavior (D-01 to D-03)
- **D-01:** The parser is **lenient for card blocks** — if a card block is malformed (e.g. missing `back:` field, unclosed `::` delimiter), that card is skipped and a warning is collected. All valid cards continue to be parsed. The import proceeds with the valid subset.
- **D-02:** The **deck header is required** — if the `--- ... ---` block is absent or unparseable as YAML, the parser returns a fatal error and the whole import fails. No fallback to filename inference. Error message: "No deck header found. Your .kartex file must start with a `---` YAML block."
- **D-03:** The parser lives in **`packages/shared/src/lib/kartex-parser.ts`** (or similar), returning a typed result: `{ deck: DeckHeader, cards: ParsedCard[], warnings: ParseWarning[] }`. It is a pure function — no I/O, no DB access.

### Import Preview UI (D-04 to D-07)
- **D-04:** Preview shows a **scrollable card list with lazy rendering** — cards are rendered with `KartexRenderer` only as the user scrolls them into view. This keeps the page performant for large decks (100+ cards).
- **D-05:** The preview includes an **editable deck name field**, pre-filled from the `deck:` value in the `.kartex` header. The user can rename before confirming. This is the only editable field in the preview step.
- **D-06:** **Parse warnings appear as a banner at the top of the preview** — a yellow/orange alert box listing each skipped card and the reason (e.g. "Card 3 skipped — missing `back:` field"). If no warnings, no banner is shown.
- **D-07:** Preview also shows total card count and deck metadata from the header (author, tags if present).

### Media Failure Handling (D-08 to D-09)
- **D-08:** If a `.kartex.zip` contains a media file that **fails MDIA-03 validation** (wrong MIME type, magic bytes mismatch) or **exceeds the size limit (MDIA-04)** — the **entire import is aborted**. A clear error lists every offending file, its type, and the reason for rejection. Nothing is written to the database. User must fix the zip and re-upload.
- **D-09:** If a card's content references a `media://filename` that is simply **absent from the zip** (file not included) — this is a **warning only**. The deck and all cards are still created. The card is imported with its `media://` reference intact; since no media file was stored, the reference will render as a broken image/audio placeholder. The warning banner lists which media files were referenced but not found.

### Client-Side Size Limit (D-10 to D-11)
- **D-10:** A new `GET /api/import/config` endpoint returns the configured upload limit: `{ maxFileSizeBytes: number }`. The frontend fetches this on `/import` page load and uses it for instant client-side validation before sending the file.
- **D-11:** Client-side check fires **before** the file is uploaded — if the selected file (or zip) exceeds the limit, show an inline error immediately without making an HTTP request. The backend still validates independently (source of truth). If the frontend config fetch fails, upload proceeds without client-side check (graceful degradation).

### Claude's Discretion
- Exact layout and styling of the import page (file drop zone vs. button-only, drag-and-drop bonus if time allows).
- How the lazy-render list is implemented (Intersection Observer, virtualization library, or simple scroll-based chunking) — choose the simplest approach that works.
- Card preview card design in the list (collapsible front/back vs. side-by-side vs. stacked — consistent with existing card designs in study session).
- Progress/loading state during zip extraction and validation (spinner, progress bar, or none).
- Exact JSON schema for `GET /api/import/config` response (keep it minimal — only `maxFileSizeBytes`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### .kartex Format Specification
- `docs/design.md` §7 — Full `.kartex` format spec: deck header syntax (`--- ... ---`), card block delimiters (`:: card` / `::`), `front:` / `back:` / `tags:` fields, inline math, block math, `#typst`, `media://` image references, external video links, comment lines (`# ...`)
- `docs/design.md` §7 — Import bundle structure: `my-deck.kartex.zip` → `deck.kartex` + `media/` folder

### Media & Validation
- `docs/design.md` §8 — Multimedia types and allowed formats: PNG/JPEG/WebP/GIF (images), MP3/OGG/WAV (audio), external URLs (video — no bundled video storage)
- `docs/design.md` §13 — Security: "File uploads: MIME + magic bytes validation, configurable max size"
- `apps/backend/src/routes/media.ts` — Existing media storage implementation (UUID filename, STORAGE_PATH env var, Docker volume, DB record in `Media` table) — the import pipeline stores bundled media using the same pattern

### Requirements
- `.planning/REQUIREMENTS.md` §IMPT-01 to IMPT-05 — All 5 import requirements
- `.planning/REQUIREMENTS.md` §MDIA-01 to MDIA-04 — All 4 media validation requirements

### Existing Code to Extend
- `apps/frontend/src/App.tsx` — Replace `<ComingSoon title="Import" />` with `<ImportPage />` at the `/import` route
- `apps/frontend/src/components/KartexRenderer.tsx` — Reuse directly for card preview rendering in the import UI
- `apps/frontend/src/lib/api.ts` — All fetch calls (including multipart upload) go through the `api` wrapper
- `apps/backend/src/index.ts` — Register new import router here
- `packages/shared/src/index.ts` — Export new parser and import schemas from here

### Data Model
- `apps/backend/prisma/schema.prisma` — `Deck`, `Card`, and `Media` models already defined; import creates new `Deck` + `Card[]` records and `Media` records for bundled files

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `KartexRenderer` (`apps/frontend/src/components/KartexRenderer.tsx`): Full rendering pipeline (Markdown, KaTeX, Typst WASM, media://, YouTube, code). Interface: `content: string`. Drop in directly for card preview — no changes needed.
- `api` wrapper (`apps/frontend/src/lib/api.ts`): Handles auth cookies + silent refresh. Use for the config fetch and multipart import upload.
- `MediaUploadResponseSchema` (`packages/shared/src/schemas/media.ts`): Already defines `{ filename, url }` — extend or reuse as the media record shape in import results.
- `authMiddleware` (`apps/backend/src/middleware/auth.ts`): Apply to all import routes (POST /api/import, GET /api/import/config).
- shadcn `Card`, `Button`, `Badge`, `Table`, `Dialog` components — all available.

### Established Patterns
- Backend: `new Hono()` router + Zod body validation from `@kartex/shared` + `authMiddleware` + `c.json()` — follow exactly as in `media.ts`/`study.ts`/`cards.ts`
- Frontend: Page component in `apps/frontend/src/pages/`, React hooks in `apps/frontend/src/hooks/`
- Zod schemas in `packages/shared/src/schemas/` — `ImportResultSchema`, `ParsedCardSchema`, `ParseWarningSchema`, `ImportConfigSchema` all go here
- Media storage: `STORAGE_PATH` env var + `randomUUID() + ext` filename + `prisma.media.create()` — replicate this pattern for bundled zip media

### Integration Points
- `/import` route in `App.tsx`: replace `<ComingSoon title="Import" />` with `<ImportPage />`
- New backend router `apps/backend/src/routes/import.ts` — register in `apps/backend/src/index.ts`
- New parser `packages/shared/src/lib/kartex-parser.ts` — export from `packages/shared/src/index.ts`
- Docker volume already wired (`media_data` volume + `STORAGE_PATH` mount) — bundled media files go to the same volume

</code_context>

<specifics>
## Specific Ideas

- Parse warnings banner: use the same amber/yellow color scheme as Tailwind's `bg-yellow-50 border-yellow-200` or a shadcn `Alert` variant with `AlertTriangle` icon (consistent with existing error patterns in the app).
- The import config endpoint is minimal: `GET /api/import/config` → `{ maxFileSizeBytes: 10485760 }` (10MB default). Source from `process.env.MAX_UPLOAD_BYTES ?? '10485760'`.
- Client-side rejection message: "File is too large ({X} MB). Maximum allowed size is {limit} MB."
- Preview deck name input: a standard shadcn `Input` field labeled "Deck name", styled consistently with `DeckFormModal`.
- Lazy rendering: `IntersectionObserver` on a sentinel element per card, toggling `isVisible` state. Simple, zero dependencies.
- Abort on media validation failure: collect ALL bad files first (don't stop on first), then return one error response listing everything — `{ error: 'Validation failed', files: [{ name, reason }] }`.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-import-pipeline*
*Context gathered: 2026-05-28*
