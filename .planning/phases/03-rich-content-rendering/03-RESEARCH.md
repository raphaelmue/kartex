# Phase 3: Rich Content Rendering - Research

**Researched:** 2026-05-26
**Domain:** React rendering pipeline (remark/rehype), KaTeX math, Typst WASM, media upload, file serving
**Confidence:** HIGH (core stack), MEDIUM (typst.ts API specifics)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Media Upload UI (D-01 to D-03)**
- D-01: Phase 3 ships upload buttons directly in the card editor (`CardEditorModal`). The backend endpoint (POST /api/media/upload) and the UI are both in scope for Plan 03-03.
- D-02: Upload controls appear as a **per-field toolbar above each textarea** (front field has its own toolbar; back field has its own). Each toolbar has an Image icon button and an Audio icon button. Clicking opens a file picker.
- D-03: After a successful upload, the `media://filename` reference is **inserted at the cursor position** in the textarea — `![alt](media://filename)` for images, `[audio](media://filename)` for audio.

**Typst WASM Loading (D-04 to D-06)**
- D-04: Typst WASM loads **lazily** — initialize `typst.ts` only when the renderer first encounters a `#typst` block. Users without Typst cards pay zero startup cost.
- D-05: While the WASM is loading (first encounter), show an **inline spinner with "Rendering..." text** in place of the `#typst` block.
- D-06: The Typst compiler instance is a **module-level singleton** — once initialized, it stays alive for the browser session. Subsequent `#typst` blocks render without re-initialization.

**Video Embed Trigger (D-07 to D-08)**
- D-07: Use **URL pattern matching** to detect video links — any Markdown link whose URL matches `youtube.com`, `youtu.be` renders as an embedded `<iframe>` player. Link text is irrelevant; the URL is the trigger.
- D-08: **YouTube only** at launch. No Vimeo support in Phase 3.

**Render Error States (D-09 to D-10)**
- D-09: When **KaTeX** fails to parse a math expression: show a **red-bordered inline block** with the KaTeX error message and the raw `$...$` source below it. Use KaTeX's `throwOnError: false` + `errorColor` option — do not let errors crash the renderer.
- D-10: When **Typst** fails to compile a `#typst` block: same pattern as D-09 — a red-bordered block with the Typst compilation error message and the raw source.

### Claude's Discretion
- Exact styling of the upload toolbar (icon size, button variant, spacing within the modal) — follow the existing shadcn button/icon patterns.
- Audio player styling — native HTML `<audio controls>` element; Claude applies consistent CSS sizing.
- Code block highlight.js language handling — auto-detect if no language specified; explicit language label takes precedence.
- `media://` URL resolution — frontend KartexRenderer transforms `media://filename` → `/api/media/filename` via a custom `img` component in react-markdown's `components` prop; backend serves from Docker volume at `/api/media/:filename`.

### Deferred Ideas (OUT OF SCOPE)
- Vimeo embed support — deferred to Phase 6+.
- Drag-and-drop file upload in the card editor — file picker buttons only in Phase 3.
- Full MDIA validation (MIME type, magic bytes, configurable max size via env var) — MDIA-01 to MDIA-04 are assigned to Phase 5.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CARD-06 | Card content renders inline math (`$...$`) via KaTeX | remark-math + rehype-katex + `katex/dist/katex.min.css` in entry point |
| CARD-07 | Card content renders block math (`$$...$$`) via KaTeX | Same plugin chain; rehype-katex handles math-inline vs math-display automatically |
| CARD-08 | Card content renders `#typst` blocks via Typst WASM | `$typst.svg()` from `@myriaddreamin/typst.ts`; lazy singleton; vite-plugin-wasm required |
| CARD-09 | Card content renders inline images from uploaded media | Custom `img` component in react-markdown rewrites `media://` src; backend POST /api/media/upload |
| CARD-10 | Card content renders audio with native HTML audio player | Custom `a` component detects `media://` audio links; renders `<audio controls>` |
| CARD-11 | Card content renders external video links as embedded players | Custom `a` component detects YouTube URL patterns; renders `<iframe>` |
| CARD-12 | Card content renders fenced code blocks with syntax highlighting | rehype-highlight plugin + `highlight.js/styles/github.css` import |
</phase_requirements>

---

## Summary

Phase 3 extends `KartexRenderer` from Markdown-only to the full Kartex rendering stack. The extension strategy adds remark/rehype plugins directly to the existing `ReactMarkdown` call, plus custom `components` handlers for media, video, and Typst blocks. No structural changes to the component interface are needed.

The rendering pipeline splits cleanly into three sub-plans. Plan 03-01 (KaTeX + highlight.js) is entirely plugin-based — install four packages, add two plugin arrays, import two CSS files. Plan 03-02 (Typst WASM) introduces browser-side WASM compilation with lazy singleton initialization and requires a Vite WASM plugin. Plan 03-03 (media upload) adds a backend multipart upload route, Docker volume wiring, the `media://` URL transformer in the renderer, and per-field upload toolbars in the card editor.

The `Media` model already exists in `schema.prisma` with all required fields (`ownerId`, `filename`, `mimeType`, `storagePath`, `sizeBytes`). The Docker Compose `media_data` volume is declared but the backend service is missing `STORAGE_PATH` env var — that gap must be closed in Plan 03-03.

**Primary recommendation:** Use the remark/rehype plugin chain for math and code (zero custom parsing), `$typst.svg()` API from `@myriaddreamin/typst.ts` for Typst blocks (WASM, lazy singleton), and Hono's `c.req.parseBody()` + `fs.writeFile` for file uploads with the already-present `Media` Prisma model.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| KaTeX math rendering | Browser / Client | — | Pure client-side HTML generation from math strings; no backend involvement |
| Typst WASM compilation | Browser / Client | — | WASM runs entirely in the browser; backend never sees Typst source |
| Code syntax highlighting | Browser / Client | — | rehype-highlight transforms AST nodes during React render pass |
| `media://` URL rewrite | Browser / Client | — | Custom react-markdown `img` component rewrites src at render time |
| Media file storage | API / Backend | Docker Volume | Hono handles upload; writes to mounted volume; Prisma records metadata |
| Media file serving | API / Backend | — | Backend serves `/api/media/:filename` from Docker volume path |
| Audio/video embedding | Browser / Client | — | React component outputs native `<audio>` or YouTube `<iframe>` |
| Upload UI (toolbar) | Browser / Client | — | CardEditorModal gets per-field toolbar buttons |

---

## Standard Stack

### Core (new packages for this phase)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `remark-math` | 6.0.0 | Parses `$...$` and `$$...$$` math syntax in Markdown AST | Official remark-math family; maintained by unified ecosystem |
| `rehype-katex` | 7.0.1 | Transforms math AST nodes into KaTeX-rendered HTML | Official paired plugin; handles inline vs display mode automatically |
| `katex` | 0.17.0 | KaTeX math rendering engine (peer dep of rehype-katex) | Industry standard for fast LaTeX in browsers |
| `rehype-highlight` | 7.0.2 | Syntax highlights fenced code blocks via lowlight/highlight.js | Official rehype plugin; integrates cleanly with unified pipeline |
| `highlight.js` | 11.11.1 | Syntax highlighting library (peer dep of rehype-highlight) | Standard for highlight.js-based syntax highlighting |
| `@myriaddreamin/typst.ts` | 0.7.0-rc2 | High-level browser Typst compiler API (`$typst.svg()`) | Only viable Typst-in-browser solution |
| `@myriaddreamin/typst-ts-web-compiler` | 0.7.0-rc2 | WASM compiler module for typst.ts | Required companion to typst.ts for browser compilation |
| `@myriaddreamin/typst-ts-renderer` | 0.7.0-rc2 | WASM renderer module for typst.ts | Required companion for SVG rendering |
| `vite-plugin-wasm` | 3.6.0 | Enables WASM ESM integration in Vite | Required for typst.ts WASM loading in Vite 5 |
| `vite-plugin-top-level-await` | 1.6.0 | Supports top-level await in browser bundles | Required companion for vite-plugin-wasm (async WASM init) |

### Already Installed (no new install needed)

| Library | Version | Purpose |
|---------|---------|---------|
| `react-markdown` | 10.1.0 | Markdown renderer (Phase 2 foundation) |
| `remark-gfm` | 4.0.1 | GFM tables/strikethrough (Phase 2) |
| `lucide-react` | 1.16.0 | Icons for upload toolbar (Image, Music icons) |
| `hono` | 4.7.9 | Backend routing; `parseBody()` for multipart upload |
| `@prisma/client` | 5.22.0 | ORM; `Media` model already in schema |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `rehype-katex` | Custom KaTeX render in `components` | Plugin approach handles error fallback + CSS injection automatically; custom approach requires reimplementing error handling |
| `rehype-highlight` | Custom `code` component with highlight.js | Plugin is cleaner and handles all language detection; custom component only needed if needing non-highlight.js highlighter |
| `$typst.svg()` | typst.ts React component (`@myriaddreamin/typst.react`) | SVG injection gives more rendering control; React component adds another dependency for marginal benefit |

**Installation (frontend):**
```bash
yarn workspace @kartex/frontend add katex remark-math rehype-katex rehype-highlight highlight.js @myriaddreamin/typst.ts @myriaddreamin/typst-ts-web-compiler @myriaddreamin/typst-ts-renderer
yarn workspace @kartex/frontend add -D vite-plugin-wasm vite-plugin-top-level-await @types/katex
```

**Installation (backend):** No new packages needed — Hono's `parseBody()` handles multipart; Node.js `fs/promises` handles filesystem writes.

**Version verification:** All versions above confirmed via `npm view <pkg> version` during this research session. [VERIFIED: npm registry]

---

## Package Legitimacy Audit

> slopcheck ran successfully during this research session.

| Package | Registry | slopcheck | Notes | Disposition |
|---------|----------|-----------|-------|-------------|
| `katex` | npm | [OK] | 8+ years, MIT, 50M+/wk downloads | Approved |
| `remark-math` | npm | [OK] | Official unified ecosystem package | Approved |
| `rehype-katex` | npm | [OK] | Official unified ecosystem package | Approved |
| `rehype-highlight` | npm | [OK] | Official rehype ecosystem package | Approved |
| `highlight.js` | npm | [OK] | 10+ years, standard highlighter | Approved |
| `vite-plugin-wasm` | npm | [OK] | 3.6.0, published 2 months ago, well-known Vite ecosystem plugin | Approved |
| `vite-plugin-top-level-await` | npm | [OK] | Same author as vite-plugin-wasm (Menci) | Approved |
| `@myriaddreamin/typst.ts` | npm | [OK] | Note: no source repo linked in registry metadata. GitHub at Myriad-Dreamin/typst.ts is confirmed. RC release (0.7.0-rc2). | Approved — RC status noted |
| `@myriaddreamin/typst-ts-web-compiler` | npm | [OK] | WASM companion module; same publisher | Approved — RC status noted |
| `@myriaddreamin/typst-ts-renderer` | npm | [OK] | WASM companion module; same publisher | Approved — RC status noted |

**Packages removed due to slopcheck [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** none

**RC status note:** All three `@myriaddreamin/` packages are at `0.7.0-rc2`. This is the `latest` dist-tag on npm (no stable release exists). The planner should note this is pre-1.0 RC software. The API (`$typst.svg()`) is used by production projects (typst-online-editor). No checkpoint needed but implementors should pin exact version. [VERIFIED: npm registry]

---

## Architecture Patterns

### System Architecture Diagram

```
Card content (string)
        │
        ▼
  KartexRenderer
        │
  ReactMarkdown
    ├── remarkPlugins: [remarkGfm, remarkMath]
    └── rehypePlugins: [rehypeKatex, rehypeHighlight]
        │
        ├── math-inline / math-display nodes  ──► KaTeX HTML
        ├── code[language-*] nodes            ──► highlight.js spans
        └── custom components:
              ├── img (src starts with media://)  ──► /api/media/filename
              ├── a (href is YouTube URL)          ──► <iframe> embed
              └── a (href starts with media://)   ──► <audio controls>
                       │ (for #typst detection)
              └── p/code containing "#typst\n..."  ──► typstSingleton.svg()
                                                          │
                                                     WASM module (lazy)
                                                          │
                                                     SVG injected inline

Upload flow:
  CardEditorModal
    ├── Front field: [Image btn] [Audio btn] <textarea>
    └── Back field:  [Image btn] [Audio btn] <textarea>
              │ (click btn → file picker → api.post FormData)
              ▼
  POST /api/media/upload  (Hono, multipart)
              │
  writeFile → Docker volume (/app/media/)
              │
  prisma.media.create → PostgreSQL (Media model)
              │
  Response: { filename, url }
              │
  Insert at cursor: ![alt](media://filename) or [audio](media://filename)
```

### Recommended Project Structure

```
apps/frontend/src/
├── components/
│   ├── KartexRenderer.tsx          ← extend with plugins + components
│   ├── CardEditorModal.tsx         ← add per-field upload toolbar
│   └── MediaUploadToolbar.tsx      ← new: Image+Audio buttons (extracted component)
└── lib/
    └── typst.ts                    ← new: typst singleton (lazy init + svg())

apps/backend/src/
└── routes/
    └── media.ts                    ← new: POST /api/media/upload + GET /api/media/:filename

packages/shared/src/schemas/
└── media.ts                        ← new: MediaUploadResponseSchema
```

### Pattern 1: remark-math + rehype-katex Plugin Chain

**What:** Add `remarkMath` and `rehypeKatex` to the `ReactMarkdown` plugin arrays. rehype-katex handles `throwOnError` internally (tries strict render first, falls back to `strict: 'ignore'` + `throwOnError: false` on parse failure). The `errorColor` option can be passed to color the error text.

**When to use:** Any time math expressions need to render. Zero custom code required for happy path.

```typescript
// Source: github.com/remarkjs/remark-math README + rehype-katex package docs
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

// In KartexRenderer.tsx:
<ReactMarkdown
  remarkPlugins={[remarkGfm, remarkMath]}
  rehypePlugins={[rehypeKatex]}
  components={customComponents}
>
  {content}
</ReactMarkdown>
```

**CSS import:** `import 'katex/dist/katex.min.css'` must be added to `apps/frontend/src/main.tsx` (or `index.css` via `@import`) — it's a global CSS requirement. [VERIFIED: npm registry + official rehype-katex docs]

**Error behavior:** rehype-katex v7 internally uses `throwOnError: false` fallback — malformed math renders as highlighted error text rather than crashing. The `errorColor` KaTeX option (e.g., `'#cc0000'`) can be passed to `rehypeKatex` as options. [CITED: unifiedjs.com/explore/package/rehype-katex + KaTeX/KaTeX#3973]

### Pattern 2: rehype-highlight for Code Blocks

**What:** Add `rehypeHighlight` to rehype plugins. It detects fenced code blocks with language annotations (e.g., ` ```typescript `) and applies highlight.js class-based highlighting. A CSS theme must be imported globally.

```typescript
// Source: rehype-highlight README
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'

rehypePlugins={[rehypeKatex, rehypeHighlight]}
```

**Auto-detection:** rehype-highlight supports `detect: true` option for language auto-detection when no language is specified. Per Claude's discretion, this should be enabled. [CITED: rehype-highlight README]

### Pattern 3: Custom react-markdown `components` for media:// and YouTube

**What:** Pass a `components` prop to `ReactMarkdown` to override the default rendering of `img` and `a` tags. The custom handlers inspect `src`/`href` and branch accordingly.

```typescript
// Source: react-markdown docs + project convention (KartexRenderer extension point)
const components = {
  img: ({ src, alt }: { src?: string; alt?: string }) => {
    const resolvedSrc = src?.startsWith('media://')
      ? `/api/media/${src.slice('media://'.length)}`
      : (src ?? '')
    return <img src={resolvedSrc} alt={alt ?? ''} className="max-w-full rounded" />
  },
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
    // Audio: media:// scheme
    if (href?.startsWith('media://')) {
      const url = `/api/media/${href.slice('media://'.length)}`
      return <audio controls src={url} className="w-full mt-2" />
    }
    // YouTube embed
    const youtubeId = extractYouTubeId(href ?? '')
    if (youtubeId) {
      return (
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}`}
          className="w-full aspect-video rounded"
          allowFullScreen
          title="YouTube video"
        />
      )
    }
    return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
  },
}
```

**YouTube ID extraction** must handle three URL patterns (D-07): [ASSUMED — regex specifics]
- `youtube.com/watch?v=VIDEO_ID`
- `youtu.be/VIDEO_ID`
- `youtube.com/embed/VIDEO_ID`

### Pattern 4: Typst WASM Singleton (Module-Level)

**What:** A module-level singleton in `apps/frontend/src/lib/typst.ts` that lazy-initializes `@myriaddreamin/typst.ts` on first call. Returns a promise for the SVG string. Renderer component holds loading state per block.

```typescript
// Source: myriad-dreamin.github.io/typst.ts cookery docs + github-pages/preview.html example
import { $typst } from '@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs'
import typstWasmCompiler from '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url'
import typstWasmRenderer from '@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm?url'

let initPromise: Promise<void> | null = null

export async function ensureTypstReady(): Promise<void> {
  if (initPromise) return initPromise
  initPromise = (async () => {
    $typst.setCompilerInitOptions({ getModule: () => typstWasmCompiler })
    $typst.setRendererInitOptions({ getModule: () => typstWasmRenderer })
  })()
  return initPromise
}

export async function renderTypstToSvg(source: string): Promise<string> {
  await ensureTypstReady()
  return $typst.svg({ mainContent: source })
}
```

**Vite config extension required:**
```typescript
// Source: vite-plugin-wasm README
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

plugins: [react(), wasm(), topLevelAwait()]
```

The `?url` WASM import syntax (line 3-4 above) is Vite's built-in asset URL import — it returns the resolved URL string for the `.wasm` file, which is what `getModule` expects. This avoids serving WASM from a CDN. [CITED: vite-plugin-wasm README + Vite docs on asset URL imports]

**CRITICAL NOTE on typst.ts import path:** The `@myriaddreamin/typst.ts` package uses an unconventional npm name containing `.ts`. The import path `@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs` is what the official docs show. TypeScript may need `moduleResolution: bundler` or `node16` to resolve `.mjs` imports. [ASSUMED — needs verification during implementation]

### Pattern 5: Hono Multipart File Upload

**What:** `POST /api/media/upload` receives `multipart/form-data` with a `file` field. Uses `c.req.parseBody()`, validates File instance, writes to `STORAGE_PATH` env var directory, creates `Media` record in Prisma.

```typescript
// Source: hono.dev/examples/file-upload + project pattern from cards.ts
import { writeFile, mkdir } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { randomUUID } from 'node:crypto'

media.post('/upload', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.parseBody()
  const file = body['file']

  if (!(file instanceof File)) {
    return c.json({ error: 'File is required.' }, 400)
  }

  const storagePath = process.env.STORAGE_PATH ?? '/app/media'
  await mkdir(storagePath, { recursive: true })

  const ext = extname(file.name)
  const filename = `${randomUUID()}${ext}`
  const fullPath = join(storagePath, filename)

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(fullPath, buffer)

  await prisma.media.create({
    data: {
      ownerId: userId,
      filename,
      mimeType: file.type,
      storagePath: fullPath,
      sizeBytes: file.size,
    },
  })

  return c.json({ filename, url: `/api/media/${filename}` }, 201)
})

media.get('/:filename', async (c) => {
  // Serve from STORAGE_PATH using Node.js fs + c.body()
  const { filename } = c.req.param()
  // ... readFile + c.newResponse with correct Content-Type
})
```

**Note:** The `api` wrapper in `lib/api.ts` already handles `FormData` correctly — it omits the `Content-Type: application/json` header when `body instanceof FormData`, letting the browser set `multipart/form-data` with boundary automatically. [VERIFIED: reading apps/frontend/src/lib/api.ts]

### Pattern 6: Per-Field Upload Toolbar in CardEditorModal

**What:** A small toolbar row above each `<Textarea>` in `CardEditorModal` with Image and Audio icon buttons. On click: open `<input type="file" accept="image/*">` or `<audio/*>`, call upload API, insert at cursor.

Cursor insertion into a `<textarea>` uses `selectionStart` / `selectionEnd` on the DOM element, combined with `react-hook-form`'s `field.onChange` to update the controlled value. [ASSUMED — textarea ref + cursor insert approach]

**Toolbar component interface:**
```typescript
interface MediaUploadToolbarProps {
  onInsert: (text: string) => void  // callback to insert text at cursor
  fieldRef: React.RefObject<HTMLTextAreaElement>
}
```

### Anti-Patterns to Avoid

- **Importing `katex` directly in the renderer:** rehype-katex is the correct integration point. Calling `katex.renderToString()` manually in a `components` handler bypasses the plugin's error handling and CSS class injection.
- **Initializing Typst WASM eagerly at module load:** This runs the WASM download for all users even if no card has a `#typst` block. Always use lazy init via `ensureTypstReady()`.
- **Using `innerHTML` to inject Typst SVG output:** XSS risk. Use `dangerouslySetInnerHTML` only for the SVG string returned by `$typst.svg()`, after confirming typst.ts sanitizes output — or use DOMParser to validate SVG structure before injection. [ASSUMED — SVG sanitization behavior of typst.ts not confirmed in docs]
- **Storing the raw File object reference for deferred upload:** File objects become invalid after the picker closes in some browsers. Always upload immediately on file selection.
- **Using user-supplied filenames verbatim:** The backend must generate a UUID-based filename to prevent path traversal. Never write `process.env.STORAGE_PATH + '/' + file.name`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Math AST parsing | Custom `$...$` regex replacement | remark-math + rehype-katex | Edge cases: `$` in code blocks, escaped math, display vs inline detection |
| Code syntax highlighting | Custom highlight.js integration | rehype-highlight | The plugin handles language class detection, applies highlight.js in the AST before React render |
| Typst compilation | Writing Rust/WASM from scratch | `@myriaddreamin/typst.ts` | Complete Typst WASM implementation already exists; only viable browser option |
| YouTube URL normalization | Custom regex for embed URL construction | extractYouTubeId util with the 3-pattern regex | Multiple URL formats exist; must handle `?v=`, `youtu.be/`, `/embed/` |
| File serving with Content-Type | Custom mime-type detection | Built-in: read `Media.mimeType` from Prisma, use it in `c.newResponse()` | MIME type stored at upload time; no need for runtime extension detection |

**Key insight:** The remark/rehype ecosystem handles math and code entirely in the AST transformation phase — before React ever sees the content. Custom `components` handlers are only needed for things the plugin pipeline cannot handle: `media://` URL rewriting, YouTube iframe injection, and Typst blocks.

---

## Common Pitfalls

### Pitfall 1: KaTeX CSS Not Imported

**What goes wrong:** Math renders as unstyled Unicode characters or garbled text.
**Why it happens:** KaTeX generates HTML with specific class names that require `katex.min.css` to display correctly.
**How to avoid:** Add `import 'katex/dist/katex.min.css'` to `apps/frontend/src/main.tsx` (global entry point). This is a one-time addition, not per-component.
**Warning signs:** Math content shows raw LaTeX-like text without proper spacing/formatting.

### Pitfall 2: remark-math and react-markdown Plugin Order

**What goes wrong:** Math not parsed; `$...$` appears as literal text.
**Why it happens:** `remark-math` must be in `remarkPlugins`, not `rehypePlugins`. `rehype-katex` must be in `rehypePlugins`. Swapping them causes silent failures.
**How to avoid:** Always: `remarkPlugins={[remarkGfm, remarkMath]}` and `rehypePlugins={[rehypeKatex, rehypeHighlight]}`.
**Warning signs:** Literal `$x^2$` text visible in rendered output.

### Pitfall 3: Typst WASM + Vite `top-level await`

**What goes wrong:** Build fails or runtime error: "Top-level await is not available in the configured target environment."
**Why it happens:** WASM initialization uses top-level await internally. Vite 5 targets ES2015 by default, which doesn't support top-level await.
**How to avoid:** Add both `vite-plugin-wasm()` AND `vite-plugin-top-level-await()` to `vite.config.ts`. Order matters: `wasm()` before `topLevelAwait()`.
**Warning signs:** Build error mentioning `top-level await` or `asyncWebAssembly`.

### Pitfall 4: Typst WASM Module Import Path

**What goes wrong:** TypeScript error on `.mjs` import; or WASM file not found at runtime.
**Why it happens:** `@myriaddreamin/typst.ts` exports from `dist/esm/contrib/snippet.mjs`. TypeScript's module resolution may reject `.mjs` paths unless `moduleResolution: bundler` or `node16`.
**How to avoid:** Use `?url` suffix for WASM files (Vite asset URL import). Verify the TypeScript config allows `.mjs` resolution. If the `.mjs` import fails, check for an alternative entrypoint in the package's `exports` field.
**Warning signs:** TS2307 "Cannot find module" error for the typst.ts snippet path.

### Pitfall 5: `media://` Images Not Rendering in Preview Tab

**What goes wrong:** Images that work in the view page don't render in the CardEditorModal Preview tab.
**Why it happens:** The preview tab calls `KartexRenderer` with the raw `media://filename` string. If the custom `img` component isn't in the renderer yet, the browser tries to load `media://filename` as a URL (invalid).
**How to avoid:** Implement the `media://` → `/api/media/` transform in `KartexRenderer` before the upload feature is functional. The renderer and upload UI should be co-developed in Plan 03-03.
**Warning signs:** Broken image icon in preview tab; network request to `media://...` URL.

### Pitfall 6: FormData Upload Bypassing `api` Wrapper `Content-Type`

**What goes wrong:** Upload fails with "boundary not found" or body parse error on the server.
**Why it happens:** Manually setting `Content-Type: multipart/form-data` without the boundary causes Hono's `parseBody()` to fail. The boundary must be set by the browser automatically.
**How to avoid:** The `api` wrapper in `lib/api.ts` already handles this — it omits `Content-Type` when `body instanceof FormData`. Pass a `FormData` object to `api.post()` and do NOT set Content-Type manually.
**Warning signs:** 400 from Hono upload endpoint; `body['file']` returns `undefined`.

### Pitfall 7: Docker Volume Path Mismatch

**What goes wrong:** Uploaded files saved to `/app/media/` but `STORAGE_PATH` env var not set, or set to a different path than the Docker volume mount.
**Why it happens:** The current `docker-compose.yml` mounts `media_data:/app/media` but does NOT set `STORAGE_PATH` env var in the backend service.
**How to avoid:** Add `STORAGE_PATH: /app/media` to the backend service's `environment` block in `docker-compose.yml`. Backend code defaults to `process.env.STORAGE_PATH ?? '/app/media'` to be safe.
**Warning signs:** Files upload successfully (201) but GET /api/media/:filename returns 404; file not found on disk.

### Pitfall 8: `#typst` Block Detection in Markdown

**What goes wrong:** The `#typst` block is not detected; displays as a paragraph starting with `#typst`.
**Why it happens:** Markdown treats `#typst` as a heading (level 6 with unusual syntax) or as a plain paragraph depending on context. The `#typst` block in the Kartex format is a paragraph whose first line is literally `#typst`.
**How to avoid:** In the `p` component handler (or `code` component), check if `children` string starts with `#typst\n`. Extract the Typst source as the remainder of the string. A remark plugin could also pre-process this more cleanly, but a custom component check is simpler for Phase 3.
**Warning signs:** `#typst` appears as a visible heading or paragraph in rendered output instead of a Typst block.

---

## Code Examples

### KartexRenderer Extended (full plugin chain)

```typescript
// Source: remark-math README + rehype-katex README + react-markdown docs
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github.css'

export function KartexRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={kartexComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
```

### YouTube ID Extraction Utility

```typescript
// Source: [ASSUMED] — covers the three URL formats in D-07
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}
```

### Typst Singleton Module

```typescript
// Source: myriad-dreamin.github.io/typst.ts cookery/guide/compiler/bindings.html
import { $typst } from '@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs'
// WASM files imported as Vite asset URLs (vite-plugin-wasm required):
import compilerWasm from '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url'
import rendererWasm from '@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm?url'

let initPromise: Promise<void> | null = null

async function ensureTypstReady(): Promise<void> {
  if (initPromise !== null) return initPromise
  initPromise = (async () => {
    $typst.setCompilerInitOptions({ getModule: () => compilerWasm })
    $typst.setRendererInitOptions({ getModule: () => rendererWasm })
    // $typst lazily initializes on first .svg() call; no explicit init() needed
  })()
  return initPromise
}

export async function renderTypstToSvg(source: string): Promise<string> {
  await ensureTypstReady()
  return $typst.svg({ mainContent: source })
}
```

### Hono File Upload Route

```typescript
// Source: hono.dev/examples/file-upload + project cards.ts pattern
import { Hono } from 'hono'
import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { prisma } from '../lib/prisma.js'

const media = new Hono<{ Variables: { userId: string } }>()

media.post('/upload', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.parseBody()
  const file = body['file']
  if (!(file instanceof File)) {
    return c.json({ error: 'File is required.' }, 400)
  }
  const storagePath = process.env.STORAGE_PATH ?? '/app/media'
  await mkdir(storagePath, { recursive: true })
  const ext = extname(file.name)
  const filename = `${randomUUID()}${ext}`
  const fullPath = join(storagePath, filename)
  await writeFile(fullPath, Buffer.from(await file.arrayBuffer()))
  await prisma.media.create({
    data: { ownerId: userId, filename, mimeType: file.type, storagePath: fullPath, sizeBytes: file.size },
  })
  return c.json({ filename, url: `/api/media/${filename}` }, 201)
})

media.get('/:filename', async (c) => {
  const { filename } = c.req.param()
  // Prevent path traversal: filename must not contain slashes or dots
  if (!/^[A-Za-z0-9_-]+\.[a-z0-9]+$/.test(filename)) {
    return c.json({ error: 'Invalid filename.' }, 400)
  }
  const storagePath = process.env.STORAGE_PATH ?? '/app/media'
  const fullPath = join(storagePath, filename)
  try {
    const media = await prisma.media.findFirst({ where: { filename } })
    if (!media) return c.json({ error: 'Not found.' }, 404)
    const bytes = await readFile(fullPath)
    return c.newResponse(bytes, 200, { 'Content-Type': media.mimeType })
  } catch {
    return c.json({ error: 'Not found.' }, 404)
  }
})

export { media as mediaRouter }
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Manual KaTeX rendering in component | rehype-katex plugin in unified pipeline | Plugin handles display/inline mode, error fallback, and CSS class injection automatically |
| highlight.js via custom code component | rehype-highlight in unified pipeline | Cleaner integration; language autodetection available |
| Separate WASM init step required | typst.ts lazy singleton via $typst.svg() | First call initializes transparently; subsequent calls are instant |
| react-markdown `transformImageUri` prop | Custom `img` component in `components` prop | `transformImageUri` was removed in react-markdown v8+; `components` is the current API |

**Deprecated/outdated:**
- `transformImageUri` / `transformLinkUri` props: Removed from react-markdown v8+. Use `components: { img: ..., a: ... }` instead. [CITED: react-markdown GitHub README]
- `rehype-katex` v6 and below: `throwOnError` was user-configurable; v7 manages it internally with a two-phase render strategy.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | YouTube video ID regex covers `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/embed/` formats | Pattern 3, Code Examples | Some YouTube URLs not embedded; fallback renders as regular link (acceptable) |
| A2 | `$typst.svg()` return value is safe to inject via `dangerouslySetInnerHTML` — typst.ts sanitizes SVG output | Pattern 4 | XSS via malicious card content; mitigated by invite-only user model |
| A3 | `@myriaddreamin/typst.ts` import from `dist/esm/contrib/snippet.mjs` works with TypeScript `moduleResolution: bundler` | Pattern 4 | TS2307 error; alternative: check package `exports` field for correct path |
| A4 | Cursor insertion into react-hook-form controlled `<textarea>` via `selectionStart`/`selectionEnd` + `field.onChange` works reliably | Pattern 6 | Upload succeeds but text inserted at start/end instead of cursor position |
| A5 | `#typst` paragraph detection can be done via the `p` component handler checking children string prefix | Pitfall 8, Pattern 4 | `#typst` parsed as heading or skipped; requires remark plugin instead |

---

## Open Questions

1. **typst.ts import path for TypeScript**
   - What we know: Official docs show `@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs`
   - What's unclear: Whether `tsconfig.json` in the frontend needs `moduleResolution: bundler` (Vite projects often use this already)
   - Recommendation: Check `apps/frontend/tsconfig.json` during implementation; if `moduleResolution` is `node`, update to `bundler` or use a type-safe wrapper

2. **`#typst` block detection approach in Markdown**
   - What we know: The Kartex format spec (design.md §7) defines `#typst\n...` as a block. Markdown may parse `#typst` as a heading level 6.
   - What's unclear: Whether react-markdown parses `#typst` as `<h6>typst</h6>` or as a `<p>` starting with `#typst`
   - Recommendation: Test both the `h6` and `p` component handlers; one will capture it. A custom remark plugin (e.g., `remark-typst`) would be more robust but adds scope.

3. **typst.ts `$typst.svg()` font availability in WASM**
   - What we know: Typst documents use fonts; browser WASM environment has no system fonts
   - What's unclear: Whether `$typst.svg()` bundles a default font set or requires explicit font provisioning
   - Recommendation: Test with a simple snippet (`Hello, typst!`); if fonts fail, typst.ts documentation has font loading APIs

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Package install, Vite build | ✓ | (inferred from project running) | — |
| yarn 4.x | pnpm workspace install | ✓ | 4.15.0 | — |
| PostgreSQL | Prisma migrations | ✓ (via Docker) | 16 | — |
| Docker Compose | media_data volume | ✓ | (existing compose file) | — |
| `media_data` Docker volume | File uploads | ✓ declared | — | Volume declared in compose; will be created on `docker compose up` |
| `STORAGE_PATH` env var | Backend upload handler | ✗ NOT SET | — | Backend defaults to `/app/media`; Docker volume mounts at `/app/media` — works without explicit env var, but should be set explicitly |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** `STORAGE_PATH` env var — backend code should default to `/app/media` matching the Docker volume mount. Plan 03-03 must add `STORAGE_PATH: /app/media` to `docker-compose.yml` backend environment.

---

## Validation Architecture

### Test Framework

No test infrastructure exists yet in this project. Phase 3 introduces the first test setup.

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.7 + @testing-library/react 16.3.2 |
| Config file | `apps/frontend/vitest.config.ts` — Wave 0 gap |
| Quick run command | `yarn workspace @kartex/frontend test --run` |
| Full suite command | `yarn workspace @kartex/frontend test --run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CARD-06 | KartexRenderer renders `$x^2$` as KaTeX span | unit | `yarn workspace @kartex/frontend test --run -t "renders inline math"` | ❌ Wave 0 |
| CARD-07 | KartexRenderer renders `$$x^2$$` as display math | unit | `yarn workspace @kartex/frontend test --run -t "renders block math"` | ❌ Wave 0 |
| CARD-08 | KartexRenderer renders `#typst` block as SVG | unit (mocked typst) | `yarn workspace @kartex/frontend test --run -t "renders typst block"` | ❌ Wave 0 |
| CARD-09 | `media://carnot.png` renders as `<img src="/api/media/carnot.png">` | unit | `yarn workspace @kartex/frontend test --run -t "rewrites media:// image"` | ❌ Wave 0 |
| CARD-10 | `[audio](media://file.mp3)` renders `<audio controls>` | unit | `yarn workspace @kartex/frontend test --run -t "renders audio player"` | ❌ Wave 0 |
| CARD-11 | YouTube link renders as iframe | unit | `yarn workspace @kartex/frontend test --run -t "renders YouTube embed"` | ❌ Wave 0 |
| CARD-12 | Fenced ` ```js ` code block has highlight.js class | unit | `yarn workspace @kartex/frontend test --run -t "highlights code blocks"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `yarn workspace @kartex/frontend test --run`
- **Per wave merge:** `yarn workspace @kartex/frontend test --run --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/frontend/vitest.config.ts` — framework config with jsdom environment
- [ ] `apps/frontend/src/components/__tests__/KartexRenderer.test.tsx` — covers CARD-06 through CARD-12
- [ ] `apps/frontend/src/test/setup.ts` — `@testing-library/jest-dom` matchers
- [ ] Framework install: `yarn workspace @kartex/frontend add -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitest/coverage-v8`

**Note on WASM testing:** `@myriaddreamin/typst.ts` WASM will not initialize in jsdom. Mock `apps/frontend/src/lib/typst.ts` module in tests: `vi.mock('@/lib/typst', () => ({ renderTypstToSvg: vi.fn().mockResolvedValue('<svg>mock</svg>') }))`.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | authMiddleware on POST /api/media/upload |
| V3 Session Management | no | Covered in Phase 1 |
| V4 Access Control | yes | Upload endpoint: only authenticated users; serve endpoint: currently public (any URL-guesser can fetch) |
| V5 Input Validation | yes | Filename sanitization (UUID-generated server-side); MIME type stored from upload; Phase 5 adds magic bytes |
| V6 Cryptography | no | Not applicable to file upload |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via filename | Tampering | Generate UUID filenames server-side; validate GET param with strict regex |
| XSS via SVG injection | Spoofing / Tampering | typst.ts SVG output injected via dangerouslySetInnerHTML; mitigated by invite-only user model (A2 assumption) |
| Unrestricted file upload (size) | Denial of Service | Phase 5 adds MDIA-04 size limit; Phase 3 has no size limit (acceptable for MVP) |
| Unrestricted file upload (type) | Tampering | Phase 5 adds MDIA-03 magic bytes check; Phase 3 stores `file.type` (browser-supplied, unverified) |
| YouTube iframe CSP | Spoofing | Nginx CSP header must allow `frame-src https://www.youtube.com` — note for Plan 03-01 |
| Broken object-level access on media | Information Disclosure | GET /api/media/:filename is currently unauthenticated (required for `<img>` rendering). Mitigation: UUID filenames provide obscurity. Full auth on media is a Phase 5 concern. |

**Phase 3 security posture:** Acceptable for MVP (invite-only, 2-5 trusted users). Gaps intentionally deferred to Phase 5 (MDIA-01 to MDIA-04).

---

## Sources

### Primary (HIGH confidence)
- `apps/frontend/src/components/KartexRenderer.tsx` — confirmed existing implementation
- `apps/frontend/src/components/CardEditorModal.tsx` — confirmed structure for toolbar insertion
- `apps/backend/prisma/schema.prisma` — `Media` model already present
- `docker-compose.yml` — `media_data` volume present; `STORAGE_PATH` env var missing
- `apps/frontend/src/lib/api.ts` — FormData Content-Type handling confirmed
- npm registry (`npm view`) — all package versions verified

### Secondary (MEDIUM confidence)
- [hono.dev/examples/file-upload](https://hono.dev/examples/file-upload) — parseBody() multipart pattern
- [myriad-dreamin.github.io/typst.ts cookery guide](https://myriad-dreamin.github.io/typst.ts/cookery/guide/compiler/bindings.html) — $typst.svg() API
- [github.com/remarkjs/remark-math](https://github.com/remarkjs/remark-math) — remark-math + rehype-katex plugin chain
- [vite-plugin-wasm README](https://www.npmjs.com/package/vite-plugin-wasm) — wasm() + topLevelAwait() config

### Tertiary (LOW confidence)
- YouTube ID regex patterns — [ASSUMED] based on well-known URL formats
- Cursor insertion approach in controlled textarea — [ASSUMED]
- `#typst` detection as `p` vs `h6` — requires runtime verification

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all package versions verified via npm registry; APIs confirmed via official docs
- KaTeX + highlight.js integration: HIGH — official unified ecosystem packages; straightforward plugin chain
- Typst WASM integration: MEDIUM — $typst.svg() API confirmed; specific TypeScript import path and WASM font availability need runtime verification
- Media upload backend: HIGH — Hono parseBody() pattern confirmed; Media model already in Prisma
- Pitfalls: HIGH — derived from reading actual codebase (api.ts FormData handling, missing STORAGE_PATH)

**Research date:** 2026-05-26
**Valid until:** 2026-07-26 (stable ecosystem; typst.ts RC status could change to stable sooner)
