---
phase: 03-rich-content-rendering
reviewed: 2026-05-27T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - apps/backend/src/index.ts
  - apps/backend/src/routes/media.ts
  - apps/frontend/package.json
  - apps/frontend/src/components/CardEditorModal.tsx
  - apps/frontend/src/components/KartexRenderer.tsx
  - apps/frontend/src/components/MediaUploadToolbar.tsx
  - apps/frontend/src/components/__tests__/KartexRenderer.test.tsx
  - apps/frontend/src/lib/typst.ts
  - apps/frontend/src/main.tsx
  - apps/frontend/src/test/setup.ts
  - apps/frontend/vite.config.ts
  - apps/frontend/vitest.config.ts
  - docker-compose.yml
  - packages/shared/src/index.ts
  - packages/shared/src/schemas/media.ts
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-05-27T00:00:00Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

The phase 3 rich-content rendering stack is well-structured. The Typst WASM singleton, KaTeX pipeline, media upload flow, and custom `kartexUrlTransform` are all implemented carefully with explicit reasoning comments. The two critical findings are a missing file-type validation on media upload (any file extension is accepted server-side) and XSS exposure via unsanitized SVG injection from the Typst renderer. Four warnings cover error-handling gaps and edge cases that could surface in normal use.

---

## Critical Issues

### CR-01: No MIME type / extension allowlist on media upload — arbitrary file storage

**File:** `apps/backend/src/routes/media.ts:56-61`

**Issue:** The upload handler stores whatever file the client sends. `file.type` is a client-supplied string (not verified by the server) and `extname(file.name)` accepts any extension including `.html`, `.js`, `.svg`, `.php`, etc. A logged-in user can store an HTML file under `/app/media` and retrieve it via the public `GET /:filename` endpoint. Because `Content-Type` is replayed verbatim from `media.mimeType` (which was set from the untrusted client value), the browser will execute or render the file as that type. This is a stored-XSS / content-sniffing vector.

**Fix:** Validate the extension against an explicit allowlist and re-derive the MIME type server-side rather than trusting the client value:

```typescript
const ALLOWED_EXTENSIONS: Record<string, string> = {
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif':  'image/gif',
  '.mp3':  'audio/mpeg',
  '.ogg':  'audio/ogg',
  '.wav':  'audio/wav',
}

const ext = extname(file.name).toLowerCase()
const mimeType = ALLOWED_EXTENSIONS[ext]
if (!mimeType) {
  return c.json({ error: 'Unsupported file type.' }, 415)
}

// Use server-derived mimeType, not file.type
await prisma.media.create({ data: { ..., mimeType, ... } })
```

Also add a file-size cap before writing to disk:
```typescript
const MAX_BYTES = 20 * 1024 * 1024 // 20 MB
if (file.size > MAX_BYTES) {
  return c.json({ error: 'File too large.' }, 413)
}
```

---

### CR-02: `dangerouslySetInnerHTML` with unvalidated Typst SVG output

**File:** `apps/frontend/src/components/KartexRenderer.tsx:87`

**Issue:** The `TypstBlock` component injects the SVG string returned by `renderTypstToSvg` directly into the DOM via `dangerouslySetInnerHTML`. The Typst WASM renderer can embed arbitrary content in the SVG output (e.g., `<script>`, `<foreignObject>`, event handler attributes). If a card is shared between users (via `DeckShare`) and the Typst source was crafted maliciously, this executes JavaScript in the reader's browser session — a stored XSS attack.

```tsx
// line 87 — current code
return <div dangerouslySetInnerHTML={{ __html: svg ?? '' }} />
```

**Fix:** Strip script elements and event-handler attributes from the SVG before injection. The lightest correct approach is a dedicated SVG sanitizer:

```tsx
import DOMPurify from 'dompurify'

// In TypstBlock, after receiving svg:
const safeSvg = DOMPurify.sanitize(svg ?? '', {
  USE_PROFILES: { svg: true, svgFilters: true },
})
return <div dangerouslySetInnerHTML={{ __html: safeSvg }} />
```

Add `dompurify` and `@types/dompurify` to `apps/frontend/package.json`. Alternatively, render the SVG into a sandboxed `<iframe srcdoc>` with no `allow` attributes to fully isolate execution context.

---

## Warnings

### WR-01: Upload error path does not throw — `setUploadingImage` stays `true` on network error

**File:** `apps/frontend/src/components/MediaUploadToolbar.tsx:25-53`

**Issue:** `handleUpload` is declared `async` and called with `.finally(() => setUploadingImage(false))`. However, if `fetch` itself throws (network offline, CORS error, etc.), the rejected promise propagates out of `handleUpload` and `.finally()` on the outer call does execute — that part is fine. But the `res.ok` check on line 31 only calls `toast.error`; it does NOT `throw`, so `.finally()` still runs and state is correctly reset. This is actually working correctly for the non-ok path. The real gap is: there is no `try/catch` around the `fetch` call. A thrown network error surfaces as an unhandled rejection in the component because `handleImageChange` calls `handleUpload(...).finally(...)` without a `.catch()`. The `.finally()` chain does not suppress rejections — they propagate.

**Fix:** Add a `.catch()` after `.finally()` in both handlers, or wrap `handleUpload` body in try/catch:

```typescript
async function handleUpload(file: File, type: 'image' | 'audio') {
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/media/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    if (res.ok) {
      // ... existing success path
    } else {
      toast.error('Upload failed. Please try again.')
    }
  } catch {
    toast.error('Upload failed. Please try again.')
  }
}
```

---

### WR-02: `ensureTypstReady` silently swallows initialization errors

**File:** `apps/frontend/src/lib/typst.ts:18-26`

**Issue:** `initPromise` is set once and never cleared. If the WASM fetch fails (network error, CDN miss, incorrect asset path), the promise rejects. On the very first call, `renderTypstToSvg` will re-throw that rejection correctly and `TypstBlock` will show the error UI. However, on any **subsequent** call to `renderTypstToSvg`, `initPromise` is still the rejected promise. `await ensureTypstReady()` will immediately re-throw the same initialization error for every future call, permanently breaking all Typst blocks in the session — even if the network has recovered.

**Fix:** Clear `initPromise` on failure so the next call retries:

```typescript
async function ensureTypstReady(): Promise<void> {
  if (initPromise !== null) return initPromise
  initPromise = (async () => {
    $typst.setCompilerInitOptions({ getModule: () => compilerWasm })
    $typst.setRendererInitOptions({ getModule: () => rendererWasm })
  })()
  // Clear cached promise on failure so callers can retry
  initPromise = initPromise.catch((err) => {
    initPromise = null
    throw err
  })
  return initPromise
}
```

---

### WR-03: `MediaSchema` exposes `storagePath` — internal server path leaks to clients

**File:** `packages/shared/src/schemas/media.ts:9-18`

**Issue:** `MediaSchema` includes `storagePath` (the absolute filesystem path on the server, e.g. `/app/media/uuid.png`). This schema is in `packages/shared` — the single source of truth imported by both frontend and backend. If the backend ever serializes a `Media` record using `MediaSchema` (e.g., in a list-media API endpoint added later), the client receives the internal Docker volume path. This is an information-disclosure issue and violates the principle of least privilege.

**Fix:** Split into two schemas — an internal one (used by Prisma) and a public one (used in API responses):

```typescript
// Full internal schema (backend only — not re-exported from index.ts)
export const MediaInternalSchema = z.object({ ...all fields including storagePath })

// Public API schema — no storagePath
export const MediaSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  createdAt: z.string(),
})
export type Media = z.infer<typeof MediaSchema>
```

---

### WR-04: `CardEditorModal` tags are sourced from local `tagInput` state, not form state — data can diverge on programmatic `form.reset`

**File:** `apps/frontend/src/components/CardEditorModal.tsx:52, 80-82`

**Issue:** Tags are kept in a separate `useState` (`tagInput`) instead of being a controlled field under react-hook-form. On submit (line 80-82), `tagInput` is parsed and merged into the payload, bypassing the form's schema validation for tags. The `CreateCardSchema` validates `tags` as an array, but the actual tags submitted come from `tagInput.split(',')` — so if `CreateCardSchema` adds constraints on tags (e.g., max length, allowed characters), they are silently skipped. Additionally, `form.reset()` inside the `useEffect` (line 70-74) resets form fields but `tagInput` is reset separately via `setTagInput` — if these get out of sync (e.g., a mid-flight re-render), the submitted tags could be stale.

**Fix:** Register tags as a form field controlled by react-hook-form, or at minimum ensure validation is applied to the parsed tag array before submit:

```typescript
const onSubmit = async (data: CardFormInput) => {
  const tags = tagInput.split(',').map((t) => t.trim()).filter(Boolean)
  // Validate tags against schema constraints
  const tagsResult = CreateCardSchema.shape.tags.safeParse(tags)
  if (!tagsResult.success) {
    toast.error('Invalid tags: ' + tagsResult.error.issues[0].message)
    return
  }
  const payload = { ...data, tags: tagsResult.data }
  // ...
}
```

---

## Info

### IN-01: `vitest.config.ts` alias missing `@kartex/shared` — tests cannot import shared schemas

**File:** `apps/frontend/vitest.config.ts:7-9`

**Issue:** `vite.config.ts` defines two aliases: `@` → `./src` and `@kartex/shared` → `../../packages/shared/src`. `vitest.config.ts` only defines `@`. If any test file (or a module it imports) uses `@kartex/shared`, the test runner will fail to resolve it. Currently `KartexRenderer.tsx` imports from `@/lib/typst` and `@/components/...` only, so existing tests pass. But this is a latent breakage waiting to happen as tests grow.

**Fix:**
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
    '@kartex/shared': path.resolve(__dirname, '../../packages/shared/src'),
  },
},
```

---

### IN-02: YouTube iframe missing `sandbox` attribute

**File:** `apps/frontend/src/components/KartexRenderer.tsx:172-179`

**Issue:** The YouTube `<iframe>` embed has no `sandbox` attribute. While YouTube embeds need script execution to function, the absence of a restrictive sandbox allows the embedded page to run scripts in the top-level frame's origin context when combined with non-standard browser behaviors. The minimal safe practice is to add `sandbox="allow-scripts allow-same-origin"` (required for YouTube player to work) and omit `allow-popups` and `allow-top-navigation`.

**Fix:**
```tsx
<iframe
  src={`https://www.youtube.com/embed/${youtubeId}`}
  className="w-full aspect-video rounded-md"
  allowFullScreen
  title="YouTube video"
  sandbox="allow-scripts allow-same-origin allow-presentation"
/>
```

---

### IN-03: `docker-compose.yml` has no Nginx service — TLS and static-file proxy are absent

**File:** `docker-compose.yml:1-43`

**Issue:** The architecture diagram in `CLAUDE.md` shows Nginx as the reverse proxy handling TLS and static files. The current `docker-compose.yml` only defines `backend` and `db` services. In production, the backend port is published directly (`${BACKEND_PORT:-3000}:3000`), meaning the app is accessible without TLS and without the rate-limiting/security headers that Nginx would provide. This is an incomplete infrastructure configuration rather than a code bug, but it is a security gap for any deployment.

**Fix:** Add an Nginx service with a TLS certificate volume and proxy pass to the backend. At minimum, document that Nginx must be configured externally before deploying to a public endpoint.

---

_Reviewed: 2026-05-27T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
