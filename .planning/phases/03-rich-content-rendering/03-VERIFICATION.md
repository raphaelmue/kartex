---
phase: 03-rich-content-rendering
verified: 2026-05-27T16:50:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open a card in the study view or card editor preview tab. Enter content with a #typst block (e.g. '#typst\n$ a + b = c $'). Observe whether a spinner appears briefly and then the rendered SVG formula replaces it."
    expected: "A 'Rendering...' spinner with a spinning Loader2 icon appears, then the Typst expression renders as an inline SVG without a page reload."
    why_human: "Typst WASM init requires a real browser environment — the unit test mocks renderTypstToSvg entirely. WASM loading, $typst.setCompilerInitOptions, and actual SVG generation cannot be exercised in jsdom."
  - test: "Open the card editor. Click the Image upload button on the Front toolbar. Select a PNG or JPEG image from your filesystem. Observe the textarea content change."
    expected: "The upload succeeds (toast 'Image uploaded' appears), and the text '![image](media://uuid.ext)' is inserted at the cursor position in the front content textarea."
    why_human: "The upload flow requires a real HTTP call to POST /api/media/upload with a real multipart boundary — fetch with FormData cannot be tested in jsdom without a mock server. The cursor-position insertion also requires a focused textarea with selectionStart/selectionEnd."
  - test: "Visit /decks/:id, open a card that contains '![alt](media://some-uuid.png)'. Observe whether the image renders in the card face."
    expected: "The image appears inline in the card, loaded from /api/media/some-uuid.png without requiring an auth cookie."
    why_human: "End-to-end media serving requires a running backend with STORAGE_PATH set, a real Docker volume, and a file written by the POST /upload handler. Cannot verify programmatically without running infrastructure."
  - test: "Enter a YouTube URL in card content (e.g. '[video](https://youtube.com/watch?v=dQw4w9WgXcQ)') and view the card preview tab."
    expected: "An embedded YouTube player (iframe) appears. The CSP in Nginx must allow frame-src https://www.youtube.com for the player to load."
    why_human: "CSP header enforcement requires a running Nginx with the correct header. Phase 3 notes that Nginx CSP config is a Phase 6 concern (T-03-YT-CSP) — the iframe renders in code but will be blocked by browser CSP until Phase 6 adds the frame-src directive."
---

# Phase 3: Rich Content Rendering Verification Report

**Phase Goal:** Card content renders the full Kartex format — Markdown, inline and block math (KaTeX), Typst WASM blocks, images, audio, and syntax-highlighted code.
**Verified:** 2026-05-27T16:50:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Inline math (`$...$`) and block math (`$$...$$`) render as formatted equations via KaTeX | VERIFIED | KartexRenderer.tsx uses [rehypeKatex, {throwOnError:false}] in rehypePlugins; CARD-06 and CARD-07 unit tests pass (container.querySelector('.katex') and '.katex-display' both found) |
| 2 | A `#typst` block renders as a Typst WASM expression without a page reload | VERIFIED (unit test only) | typst.ts singleton with initPromise gate exists; TypstBlock component in KartexRenderer.tsx handles both p and h6 #typst detection; CARD-08 mocked unit tests pass (happy path + error path); real WASM execution requires human verification |
| 3 | An image referenced as `media://filename` appears inline on the card face | VERIFIED | KartexRenderer.tsx img component handler rewrites media:// to /api/media/; kartexUrlTransform passes media:// through react-markdown's URL sanitizer; CARD-09 unit test passes; backend GET /:filename route exists and is registered before authMiddleware |
| 4 | An audio file renders as a native HTML audio player embedded in the card | VERIFIED | KartexRenderer.tsx a handler renders `<audio controls src=...>` for media:// links; CARD-10 unit test passes (audio element with controls attribute and correct src found) |
| 5 | A YouTube URL renders as an embedded iframe player, and a fenced code block renders with syntax highlighting | VERIFIED | extractYouTubeId() supports 3 URL patterns; iframe rendered for YouTube links; CARD-11 unit test passes; rehype-highlight with detect:true wired in rehypePlugins; CARD-12 unit test passes (hljs/language-js class found on code element) |

**Score:** 5/5 truths verified (automated); 4 human verification items required for real-browser behaviors

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/frontend/vitest.config.ts` | Vitest config with jsdom environment | VERIFIED | environment:'jsdom', globals:true, setupFiles:['./src/test/setup.ts'], @/ alias resolved |
| `apps/frontend/src/test/setup.ts` | @testing-library/jest-dom matchers | VERIFIED | Single import '@testing-library/jest-dom' |
| `apps/frontend/src/components/__tests__/KartexRenderer.test.tsx` | Unit tests for CARD-06 through CARD-12 | VERIFIED | 10 tests, all passing — CARD-06, CARD-07, CARD-12 (inline math, block math, code highlight), CARD-08 (Typst happy+error), CARD-09 (image rewrite + passthrough), CARD-10 (audio controls), CARD-11 (YouTube iframe + non-YouTube anchor) |
| `apps/frontend/src/components/KartexRenderer.tsx` | Extended renderer with KaTeX + highlight.js + Typst + media plugins | VERIFIED | All plugins present: remarkMath, rehypeKatex, rehypeHighlight, renderTypstToSvg import, kartexComponents (p, h6, img, a), kartexUrlTransform |
| `apps/frontend/src/main.tsx` | Global CSS imports for KaTeX and highlight.js | VERIFIED | 'katex/dist/katex.min.css' and 'highlight.js/styles/github.css' imported after './index.css' |
| `apps/frontend/src/lib/typst.ts` | Lazy Typst WASM singleton with renderTypstToSvg export | VERIFIED | initPromise module-level guard (5 references), $typst.setCompilerInitOptions, renderTypstToSvg exported |
| `apps/frontend/vite.config.ts` | Vite config with wasm() and topLevelAwait() plugins | VERIFIED | plugins: [react(), wasm(), topLevelAwait()] in that order |
| `packages/shared/src/schemas/media.ts` | MediaUploadResponseSchema and MediaUploadResponse type | VERIFIED | Both exported; MediaSchema also exported |
| `apps/backend/src/routes/media.ts` | POST /upload (auth-protected) + GET /:filename (public) | VERIFIED | Two separate Hono routers exported: mediaRouter (POST) and mediaPublicRouter (GET); UUID filename validation regex present; prisma.media.create and prisma.media.findFirst both used |
| `apps/backend/src/index.ts` | media router registration with correct auth split | VERIFIED | mediaPublicRouter registered at line 35 BEFORE authMiddleware at line 38; mediaRouter registered after at line 44 |
| `apps/frontend/src/components/MediaUploadToolbar.tsx` | Per-field Image + Audio upload toolbar | VERIFIED | exports MediaUploadToolbar; uses raw fetch (not api.post); credentials:'include' present; cursor insertion via selectionStart/selectionEnd; toast.success/error calls present |
| `apps/frontend/src/components/CardEditorModal.tsx` | MediaUploadToolbar integrated above each Tabs for front and back fields | VERIFIED | 3 occurrences of MediaUploadToolbar (1 import + 2 usages); frontRef and backRef useRef<HTMLTextAreaElement> present; refs attached to textareas |
| `docker-compose.yml` | STORAGE_PATH env var in backend service | VERIFIED | STORAGE_PATH: /app/media found at line 15 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/frontend/src/main.tsx` | `katex/dist/katex.min.css` | ESM import | WIRED | `import 'katex/dist/katex.min.css'` confirmed |
| `apps/frontend/src/components/KartexRenderer.tsx` | `rehype-katex` | rehypePlugins | WIRED | `[rehypeKatex, {throwOnError:false, errorColor:...}]` in rehypePlugins array |
| `apps/frontend/src/components/KartexRenderer.tsx` | `rehype-highlight` | rehypePlugins | WIRED | `[rehypeHighlight, {detect:true}]` in rehypePlugins array; placed after rehypeKatex per RESEARCH.md Pitfall 2 |
| `apps/frontend/src/components/KartexRenderer.tsx` | `apps/frontend/src/lib/typst.ts` | import renderTypstToSvg | WIRED | `import { renderTypstToSvg } from '@/lib/typst'` present; called in TypstBlock useEffect |
| `apps/frontend/src/lib/typst.ts` | `@myriaddreamin/typst.ts` | `$typst.svg()` | WIRED | `$typst.svg({ mainContent: source })` called in renderTypstToSvg |
| `apps/frontend/vite.config.ts` | `vite-plugin-wasm` | plugins array | WIRED | wasm() in plugins; import from 'vite-plugin-wasm' present |
| `apps/backend/src/index.ts` | `apps/backend/src/routes/media.ts` | mediaPublicRouter before authMiddleware | WIRED | Line 35: `app.route('/api/media', mediaPublicRouter)` at line 35; authMiddleware at line 38 — public GET is before auth |
| `apps/frontend/src/components/KartexRenderer.tsx` | `/api/media/:filename` | img component src rewrite | WIRED | `src?.startsWith('media://')` check rewrites to `/api/media/${src.slice('media://'.length)}` |
| `apps/frontend/src/components/MediaUploadToolbar.tsx` | `POST /api/media/upload` | raw fetch with credentials:'include' | WIRED | `fetch('/api/media/upload', { method:'POST', credentials:'include', body:formData })` |
| `apps/frontend/src/components/CardEditorModal.tsx` | `MediaUploadToolbar` | onInsert callback + frontRef/backRef | WIRED | Both field FormItems contain `<MediaUploadToolbar fieldRef={frontRef/backRef} onInsert={(val) => field.onChange(val)} />` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `KartexRenderer.tsx` (TypstBlock) | `svg` state | `renderTypstToSvg(source)` → `$typst.svg()` WASM | Yes (WASM compiles Typst source to SVG string) | FLOWING (mocked in tests; real WASM verified via human test) |
| `KartexRenderer.tsx` (img component) | `resolvedSrc` | inline URL transform from `media://` → `/api/media/` | Yes (deterministic rewrite, no async) | FLOWING |
| `KartexRenderer.tsx` (a component) | audio src / iframe src | inline URL parsing (media:// and YouTube regex) | Yes (deterministic, no async) | FLOWING |
| `apps/backend/src/routes/media.ts` (GET) | `bytes` | `prisma.media.findFirst({ where: { filename } })` then `readFile(fullPath)` | Yes (real DB query + disk read) | FLOWING |
| `apps/backend/src/routes/media.ts` (POST) | created Media record | `prisma.media.create(...)` + `writeFile(fullPath, ...)` | Yes (real DB write + disk write) | FLOWING |

### Behavioral Spot-Checks

Step 7b is SKIPPED for the running-server tests (POST /api/media/upload, GET /api/media/:filename) because they require a live backend + PostgreSQL + Docker volume. The unit test suite serves as the automated behavioral check.

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 10 unit tests pass | `yarn workspace @kartex/frontend test --run` | 10/10 passed, exit 0 | PASS |
| KaTeX CSS globally imported | `grep -c 'katex/dist/katex.min.css' apps/frontend/src/main.tsx` | 1 | PASS |
| highlight.js CSS globally imported | `grep -c 'highlight.js/styles/github.css' apps/frontend/src/main.tsx` | 1 | PASS |
| mediaPublicRouter registered before authMiddleware | Line comparison in `apps/backend/src/index.ts` | mediaPublicRouter at line 35, authMiddleware at line 38 | PASS |
| STORAGE_PATH in docker-compose.yml | `grep -c 'STORAGE_PATH' docker-compose.yml` | 1 | PASS |
| initPromise singleton guard | `grep -c 'initPromise' apps/frontend/src/lib/typst.ts` | 5 (declaration + null check + assignment + return + await) | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CARD-06 | 03-01 | Inline math `$...$` via KaTeX | SATISFIED | remarkMath + rehypeKatex wired; CARD-06 unit test passes |
| CARD-07 | 03-01 | Block math `$$...$$` via KaTeX | SATISFIED | Block math renders as `.katex-display`; CARD-07 unit test passes |
| CARD-08 | 03-02 | `#typst` blocks via Typst WASM | SATISFIED (unit) | typst.ts singleton + TypstBlock component; CARD-08 unit test passes with mocked WASM; real WASM needs human verification |
| CARD-09 | 03-03 | Inline images from uploaded media | SATISFIED | media:// rewrite in img handler + backend GET route + CARD-09 unit test passes |
| CARD-10 | 03-03 | Audio files with native HTML audio player | SATISFIED | audio element rendered for media:// links; CARD-10 unit test passes |
| CARD-11 | 03-03 | External video links (YouTube) as embedded players | SATISFIED | YouTube iframe via extractYouTubeId(); CARD-11 unit test passes |
| CARD-12 | 03-01 | Fenced code blocks with syntax highlighting | SATISFIED | rehypeHighlight with detect:true; CARD-12 unit test passes (hljs/language-js class found) |

All 7 phase requirements (CARD-06 through CARD-12) are claimed by plans and have verified implementation. No orphaned requirements.

Note: REQUIREMENTS.md checkbox column shows CARD-06, CARD-07, CARD-08, CARD-12 as `[ ]` (unchecked) while CARD-09, CARD-10, CARD-11 are marked `[x]`. The checkbox state in REQUIREMENTS.md is inconsistent — implementation exists for all seven. The REQUIREMENTS.md traceability table also still shows CARD-06, CARD-07, CARD-08, CARD-12 as "Pending". This is a documentation tracking issue, not an implementation gap.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/frontend/src/components/KartexRenderer.tsx` | 87 | `dangerouslySetInnerHTML={{ __html: svg ?? '' }}` in TypstBlock | Info | XSS via malicious Typst SVG output — accepted per T-03-SVG threat register (invite-only user model, Phase 5+ concern) |
| `apps/backend/src/routes/media.ts` | (GET route) | GET /api/media/:filename intentionally unauthenticated | Info | T-03-MEDIA-AUTH: UUID obscurity mitigates enumeration; accepted for MVP per threat register |
| `apps/frontend/src/components/KartexRenderer.tsx` | (YouTube iframe) | iframe embed without Nginx CSP frame-src header | Warning | YouTube iframes will be blocked by browser CSP until Phase 6 adds `frame-src https://www.youtube.com` to Nginx config. T-03-YT-CSP noted in threat register — Phase 6 concern. CARD-11 unit test passes but real browser embed may fail in production. |

No TODO/FIXME/PLACEHOLDER stubs found in any phase 3 implementation files. No empty return statements in logic paths. No hardcoded empty state arrays feeding renders.

### Human Verification Required

#### 1. Typst WASM compilation in browser

**Test:** Open the card editor (or a card preview in the study view). Enter this content in the Front field: `#typst\n$a + b = c$` (with a real newline after `#typst`). Switch to the Preview tab.
**Expected:** A spinning "Rendering..." indicator appears briefly, then the Typst expression `a + b = c` renders as an inline SVG formula without a page reload. If Typst compilation fails, a red-bordered error block shows the error message and raw source.
**Why human:** The unit test mocks `renderTypstToSvg` entirely. The actual `@myriaddreamin/typst.ts` WASM binary (typst_ts_web_compiler_bg.wasm + typst_ts_renderer_bg.wasm) cannot be loaded in the jsdom test environment. Real compilation requires a Chromium/Firefox browser with WebAssembly support.

#### 2. Media upload and cursor insertion

**Test:** Open the card editor for any card. Click the Image button (mountain icon) in the toolbar above the Front field. Select a PNG image (under 10 MB). Observe the textarea content.
**Expected:** A spinner appears on the button during upload. After success, the toast "Image uploaded" appears, and the text `![image](media://some-uuid.png)` is inserted at the last cursor position in the front content textarea. Switching to Preview shows the image inline.
**Why human:** The upload requires a live POST /api/media/upload endpoint with a running backend and accessible STORAGE_PATH. The cursor-insertion logic (selectionStart/selectionEnd) requires a focused, interactive textarea. Neither can be exercised in jsdom without a mock server.

#### 3. Media serving without auth cookie (img/audio src resolution)

**Test:** Create a card with content `![alt](media://some-uuid.png)` where `some-uuid.png` is a file previously uploaded. Open the card in the study view or card preview tab in an incognito window (or clear cookies). Observe whether the image loads.
**Expected:** The image loads successfully from `/api/media/some-uuid.png` without requiring the user to be authenticated. The `<img>` src resolves correctly because GET /api/media/:filename is registered before authMiddleware.
**Why human:** Requires a live backend, a file on the Docker volume, and a browser to verify the cookie/auth behavior of the split-auth router registration.

#### 4. YouTube iframe rendering and CSP

**Test:** Create a card with content `[video](https://youtube.com/watch?v=dQw4w9WgXcQ)`. View it in the card preview tab or study view.
**Expected:** An embedded YouTube player appears and is playable. The iframe src is `https://www.youtube.com/embed/dQw4w9WgXcQ`.
**Why human:** In a production deployment behind Nginx, the YouTube iframe will be blocked by the browser's CSP unless Nginx includes `frame-src https://www.youtube.com` in the Content-Security-Policy header. Phase 3 does not own nginx.conf (T-03-YT-CSP deferred to Phase 6). The unit test confirms the iframe element is rendered; the actual playability depends on Nginx config outside this phase.

### Gaps Summary

No structural gaps found. All 7 required CARD requirements have complete implementation:
- Code exists, is substantive (non-stub), is wired end-to-end, and data flows correctly.
- All 10 unit tests pass.
- All key architectural links are verified (public GET before authMiddleware, WASM lazy singleton, media:// URL transform).

The 4 human verification items are required because they test real-browser behavior (WASM execution, file upload, cookie-less media serving, CSP enforcement) that cannot be reproduced in a jsdom test environment. These are verification gaps only — not implementation gaps.

---

_Verified: 2026-05-27T16:50:00Z_
_Verifier: Claude (gsd-verifier)_
