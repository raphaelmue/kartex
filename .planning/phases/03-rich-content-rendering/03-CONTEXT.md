# Phase 3: Rich Content Rendering - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the full Kartex rich content rendering stack — extending `KartexRenderer` from Markdown-only to support: inline and block KaTeX math (`$...$` and `$$...$$`), Typst WASM blocks (`#typst`), inline images from uploaded media (`media://` URLs), native audio players for audio files, embedded YouTube video players, and syntax-highlighted fenced code blocks (highlight.js).

It also adds a backend media upload API (POST /api/media/upload) with Docker volume wiring, plus upload buttons directly in the card editor.

**In scope:** CARD-06 through CARD-12 from REQUIREMENTS.md. Three plans: (1) KaTeX + highlight.js, (2) Typst WASM + `#typst` parser, (3) image/audio upload API + volume + upload UI in card editor + video embed rendering.

**Out of scope:** Full MDIA validation suite (MIME + magic bytes, size limits via env var) — those are MDIA-01 through MDIA-04 assigned to Phase 5. Vimeo embeds — YouTube only. Spaced repetition (Phase 4). `.kartex` import pipeline (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### Media Upload UI (D-01 to D-03)
- **D-01:** Phase 3 ships upload buttons directly in the card editor (`CardEditorModal`). The backend endpoint (POST /api/media/upload) and the UI are both in scope for Plan 03-03.
- **D-02:** Upload controls appear as a **per-field toolbar above each textarea** (front field has its own toolbar; back field has its own). Each toolbar has an Image icon button and an Audio icon button. Clicking opens a file picker.
- **D-03:** After a successful upload, the `media://filename` reference is **inserted at the cursor position** in the textarea — `![alt](media://filename)` for images, `[audio](media://filename)` for audio.

### Typst WASM Loading (D-04 to D-06)
- **D-04:** Typst WASM loads **lazily** — initialize `typst.ts` only when the renderer first encounters a `#typst` block. Users without Typst cards pay zero startup cost.
- **D-05:** While the WASM is loading (first encounter), show an **inline spinner with "Rendering..." text** in place of the `#typst` block.
- **D-06:** The Typst compiler instance is a **module-level singleton** — once initialized, it stays alive for the browser session. Subsequent `#typst` blocks render without re-initialization.

### Video Embed Trigger (D-07 to D-08)
- **D-07:** Use **URL pattern matching** to detect video links — any Markdown link whose URL matches `youtube.com`, `youtu.be` renders as an embedded `<iframe>` player. Link text is irrelevant; the URL is the trigger.
- **D-08:** **YouTube only** at launch. No Vimeo support in Phase 3 (Vimeo URLs render as regular hyperlinks).

### Render Error States (D-09 to D-10)
- **D-09:** When **KaTeX** fails to parse a math expression: show a **red-bordered inline block** with the KaTeX error message and the raw `$...$` source below it. Use KaTeX's `throwOnError: false` + `errorColor` option — do not let errors crash the renderer.
- **D-10:** When **Typst** fails to compile a `#typst` block: same pattern as D-09 — a red-bordered block with the Typst compilation error message and the raw source. Consistent error treatment across all rich content types.

### Claude's Discretion
- Exact styling of the upload toolbar (icon size, button variant, spacing within the modal) — follow the existing shadcn button/icon patterns.
- Audio player styling — native HTML `<audio controls>` element; Claude applies consistent CSS sizing.
- Code block highlight.js language handling — auto-detect if no language specified; explicit language label takes precedence.
- `media://` URL resolution — frontend KartexRenderer transforms `media://filename` → `/api/media/filename` via a custom `img` component in react-markdown's `components` prop; backend serves from Docker volume at `/api/media/:filename`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & Content Format
- `docs/design.md` §7 — Kartex format spec: card syntax, `#typst` blocks, `media://` URL scheme, `![alt](media://...)` image syntax, `[video](https://...)` external video, fenced code blocks
- `docs/design.md` §8 — Multimedia flashcards table: type → format → rendering library mapping (KaTeX, typst.ts, highlight.js, native audio, embedded video)
- `apps/backend/prisma/schema.prisma` — Media model (if any) already in schema; check before adding

### Renderer (Phase 2 foundation — extend, don't replace)
- `apps/frontend/src/components/KartexRenderer.tsx` — Current Markdown-only implementation; Phase 3 extends this component without changing its `content: string` interface
- `apps/frontend/src/components/CardEditorModal.tsx` — Phase 3 adds upload toolbar here; read before modifying

### Backend Patterns
- `apps/backend/src/routes/decks.ts` — Route pattern for new media router
- `apps/backend/src/middleware/auth.ts` — authMiddleware: `c.get('userId')` — apply to upload endpoint
- `apps/backend/src/index.ts` — Register new media router here

### Frontend Patterns
- `apps/frontend/src/lib/api.ts` — All fetch calls (including upload) go through the `api` wrapper
- `apps/frontend/src/App.tsx` — No new routes needed for Phase 3

### Requirements
- `.planning/REQUIREMENTS.md` §CARD-06 to CARD-12 — The 7 rendering requirements this phase must satisfy

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `KartexRenderer` (`apps/frontend/src/components/KartexRenderer.tsx`): Uses `react-markdown` + `remark-gfm`. Phase 3 extends it by adding `remarkPlugins` (remark-math), `rehypePlugins` (rehype-katex), and custom `components` handlers for `#typst` detection, `media://` images, and YouTube iframe embedding. External interface (`content: string`) stays unchanged.
- `api` wrapper (`apps/frontend/src/lib/api.ts`): Handles auth cookies + silent refresh — upload endpoint must use this wrapper too.
- `authMiddleware` (`apps/backend/src/middleware/auth.ts`): Apply to POST /api/media/upload.
- shadcn `Button` component: Use for upload toolbar buttons (icon variant).
- shadcn `Tabs` component: Already used in CardEditorModal for Edit/Preview tabs — per-field toolbar sits above the Tabs component for each field.

### Established Patterns
- Backend: `new Hono()` router, Zod body validation from `@kartex/shared`, `authMiddleware`, `c.json()` — follow exactly as in `cards.ts`/`decks.ts`
- Frontend: React component in `apps/frontend/src/components/` — new upload-toolbar component (if extracted) follows this convention
- Zod schemas in `packages/shared/src/schemas/` — any new media upload schema goes here

### Integration Points
- `CardEditorModal.tsx`: Add per-field upload toolbar above each `<Textarea>` (front + back fields)
- `apps/backend/src/index.ts`: Register new `mediaRouter` alongside existing routers
- `apps/frontend/vite.config.ts`: May need WASM plugin (`vite-plugin-wasm` or `@vitejs/plugin-wasm`) for typst.ts WASM loading — check typst.ts docs
- Docker Compose: Add `STORAGE_PATH` env var + `media_data` volume mount to backend service (per `docs/design.md` §10)

</code_context>

<specifics>
## Specific Ideas

- The card editor upload toolbar uses a **per-field** layout: front textarea has its own row of upload icons, back textarea has its own. Not a shared "Upload Files" section at the top of the modal.
- Typst WASM singleton pattern: a module-level `let typstInstance: TypstCompiler | null = null` in the renderer module; initialize once on first `#typst` encounter, reuse thereafter.
- YouTube URL detection regex must handle both `youtube.com/watch?v=`, `youtu.be/`, and `youtube.com/embed/` formats.
- Error blocks for KaTeX/Typst failures should be visually consistent — same red border + monospace source display — so users immediately recognize a render failure vs. intended content.

</specifics>

<deferred>
## Deferred Ideas

- **Vimeo embed support** — URL pattern detection for vimeo.com URLs. Deferred from Phase 3; render Vimeo links as regular hyperlinks for now. Can be added in Phase 6 (or a quick task) without schema changes.
- **Drag-and-drop file upload** in the card editor — the Phase 3 upload UI uses file picker buttons only. Drag-and-drop UX improvement is deferred.
- **Full MDIA validation** (MIME type, magic bytes, configurable max size via env var) — MDIA-01 to MDIA-04 are assigned to Phase 5. Phase 3 upload endpoint has basic size/type checks but not the full validation stack.

</deferred>

---

*Phase: 03-rich-content-rendering*
*Context gathered: 2026-05-26*
