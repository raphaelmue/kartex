# Phase 12: PWA Shell - Research

**Researched:** 2026-06-03
**Domain:** Progressive Web App — vite-plugin-pwa, Workbox, COEP/COOP headers, Hono serveStatic
**Confidence:** HIGH

---

## Summary

Phase 12 adds PWA installability and fast app-shell caching to the Kartex app. The project
already uses Vite 5 with `vite-plugin-pwa` as the standard integration point. Three independent
concerns must be handled correctly in this phase:

1. **Manifest + Service Worker (PWA-01, PWA-02, PWA-03):** `vite-plugin-pwa` v1.3.0 with Workbox's
   `generateSW` strategy handles precaching of the JS/CSS/HTML shell, excludes Typst WASM (~28 MB)
   from the precache manifest via `globPatterns` (removing `.wasm`), and routes all `/api/*` traffic
   through a `NetworkOnly` runtime caching rule. The Typst WASM files get a separate `CacheFirst`
   runtime caching rule so they are cached on first use but not precached on service worker install.

2. **COEP/COOP headers (PWA-04):** Hono's built-in `secureHeaders` middleware supports both
   `crossOriginOpenerPolicy` and `crossOriginEmbedderPolicy`. These headers must be applied globally
   (before the `/api/*` routes and before `serveStatic`) so every response — API, static files, and
   the SPA fallback — carries them. This resolves the pre-existing production gap: currently the
   headers only appear in Vite's dev server.

3. **Service worker cache control (PWA-05):** `serveStatic` in `@hono/node-server` supports an
   `onFound(path, c)` callback for setting per-file headers. A targeted route for `sw.js` and a
   glob-based check in `onFound` for `workbox-*.js` ensure `Cache-Control: no-store` is sent for
   these files while all other static assets keep long-lived cache headers.

**Primary recommendation:** Use `vite-plugin-pwa` v1.3.0 with `generateSW` mode, `registerType:
'autoUpdate'`, custom `globPatterns` (no `.wasm`), `NetworkOnly` for `/api/*`, and `CacheFirst`
for `*.wasm`; add `secureHeaders` middleware globally in `apps/backend/src/index.ts`; add `sw.js`
and `workbox-*.js` `no-store` routes before the `serveStatic` catch-all.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PWA-01 | App has a web app manifest with name, 192×192 + 512×512 icons, theme color, `display: standalone` | manifest config in VitePWA(); icon generation via `@vite-pwa/assets-generator` |
| PWA-02 | Service worker precaches JS/CSS/HTML shell; Typst WASM excluded from precache, handled via CacheFirst runtime caching | `globPatterns: ['**/*.{js,css,html}']` + `runtimeCaching` CacheFirst for `*.wasm` |
| PWA-03 | All `/api/*` requests bypass the service worker (NetworkOnly) | `navigateFallbackDenylist` + `runtimeCaching` NetworkOnly for `/api/*` |
| PWA-04 | Production Hono sends COOP: same-origin and COEP: require-corp on all responses | Hono `secureHeaders` middleware with `crossOriginOpenerPolicy` + `crossOriginEmbedderPolicy` |
| PWA-05 | `sw.js` and `workbox-*.js` served with `Cache-Control: no-store` | Explicit Hono route for `sw.js` before `serveStatic`; `onFound` callback for `workbox-*.js` |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| PWA manifest generation | Frontend Server (build-time Vite plugin) | — | `vite-plugin-pwa` emits `manifest.webmanifest` during `vite build` |
| Service worker precache | Frontend Server (build-time) | Browser | Workbox generates the SW with a precache manifest at build time; browser installs it |
| Runtime caching (WASM, /api) | Browser (SW runtime) | — | Service worker intercepts fetch events at runtime; rules declared at build time |
| COEP/COOP headers | API / Backend (Hono) | — | Headers must be on HTTP responses from the Hono server, not just in the built frontend |
| SW cache control (no-store) | API / Backend (Hono) | — | Hono is the HTTP server; it controls response headers including Cache-Control |
| Icon generation | Developer tooling (build step) | — | `@vite-pwa/assets-generator` CLI runs once to produce PNG icons from an SVG source |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `vite-plugin-pwa` | 1.3.0 [VERIFIED: npm registry] | Vite plugin — generates manifest + service worker via Workbox | Official Vite PWA integration; supports Vite 3–8; 8+ year track record; Google Chrome team endorsement |
| `workbox-window` | 7.4.1 [VERIFIED: npm registry] | Browser-side SW registration + update handling | Peer dependency of `vite-plugin-pwa`; Google Workbox project |
| `hono/secure-headers` | bundled with `hono` ^4.7.9 | COEP/COOP middleware | Built-in Hono middleware — no extra package |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@vite-pwa/assets-generator` | 1.0.2 [VERIFIED: npm registry] | CLI to generate PWA icons (192×192, 512×512) from a single SVG | Use once at setup to create icon assets |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `generateSW` mode | `injectManifest` mode | `injectManifest` requires maintaining a custom `sw.ts` file — adds complexity for no benefit given the project's standard caching needs |
| `registerType: 'autoUpdate'` | `registerType: 'prompt'` | `prompt` requires UI code to show an update notification; `autoUpdate` is simpler and appropriate for a small team app |

**Installation (frontend):**
```bash
yarn workspace @kartex/frontend add -D vite-plugin-pwa workbox-window
yarn workspace @kartex/frontend add -D @vite-pwa/assets-generator
```

**Version verification:**
```
vite-plugin-pwa  1.3.0  (published 2026-05-05)
workbox-window   7.4.1  (published 2019-01-15, continuously updated — Google Workbox monorepo)
@vite-pwa/assets-generator  1.0.2
```

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `vite-plugin-pwa` | npm | ~5 yrs (2020-08) | Millions/wk | github.com/vite-pwa/vite-plugin-pwa | Not run (CLI unavailable in shell) | [ASSUMED] — approved based on official docs + widely used |
| `workbox-window` | npm | ~7 yrs (2019-01) | Tens of millions/wk | github.com/googlechrome/workbox | Not run | [ASSUMED] — Google Chrome project, widely used |
| `@vite-pwa/assets-generator` | npm | ~2 yrs | Hundreds of thousands/wk | github.com/vite-pwa/assets-generator | Not run | [ASSUMED] — official vite-pwa org package |

**slopcheck was unavailable in the shell environment.** All three packages above are tagged `[ASSUMED]`. Before installing, the planner must add a `checkpoint:human-verify` step confirming these packages are genuine on npmjs.com. The packages were confirmed to exist via `npm view` and are referenced from official vite-pwa documentation.

**Postinstall scripts:** `npm view <pkg> scripts.postinstall` returned empty for all three packages — no postinstall network calls or filesystem writes outside the project directory.

**Packages removed due to slopcheck verdict:** none

---

## Architecture Patterns

### System Architecture Diagram

```
vite build
    │
    ├── vite-plugin-pwa (generateSW)
    │       ├── emits: apps/backend/public/manifest.webmanifest
    │       ├── emits: apps/backend/public/sw.js  (Workbox precache + runtime rules)
    │       └── emits: apps/backend/public/workbox-*.js  (Workbox chunks)
    │
    └── Vite output → apps/backend/public/
            ├── index.html
            ├── assets/ (hashed JS/CSS bundles)
            ├── *.wasm  (Typst WASM — NOT in SW precache manifest)
            ├── manifest.webmanifest
            ├── sw.js
            └── workbox-*.js

Browser visit (production)
    │
    │  HTTPS request
    ▼
Hono Node server
    ├── Middleware 0: secureHeaders (COOP + COEP) ← applied FIRST, all responses
    ├── GET /sw.js         → File + Cache-Control: no-store
    ├── GET /workbox-*.js  → serveStatic (onFound sets no-store)
    ├── GET /api/*         → API routes (JWT-protected, NetworkOnly in SW)
    └── GET /* (catch-all) → serveStatic (public/) → SPA fallback

Service Worker (in browser)
    ├── Precache on install: index.html, assets/*.js, assets/*.css
    ├── Runtime: /api/* → NetworkOnly (never cached)
    ├── Runtime: *.wasm → CacheFirst (cached on first load, served from cache thereafter)
    └── navigateFallback: index.html (except /api/*)
```

### Recommended Project Structure Changes

```
apps/frontend/
├── public/
│   ├── pwa-192x192.png     ← generated by @vite-pwa/assets-generator
│   ├── pwa-512x512.png     ← generated by @vite-pwa/assets-generator
│   └── pwa-maskable-192x192.png  ← optional maskable icon
apps/backend/src/
│   index.ts                ← add secureHeaders middleware + sw.js no-store route
```

### Pattern 1: vite-plugin-pwa Configuration (generateSW)

**What:** Configure VitePWA plugin in `vite.config.ts` to generate manifest and service worker.
**When to use:** Standard React SPA — no custom service worker logic needed.

```typescript
// Source: https://vite-pwa-org.netlify.app/workbox/generate-sw.html
// + https://github.com/vite-pwa/vite-plugin-pwa/discussions/545

import { VitePWA } from 'vite-plugin-pwa'

VitePWA({
  registerType: 'autoUpdate',
  // devOptions disabled by default — no SW in dev (avoids WASM + proxy conflicts)
  devOptions: { enabled: false },

  // ── Manifest ──────────────────────────────────────────────────────────────
  manifest: {
    name: 'Kartex',
    short_name: 'Kartex',
    description: 'Self-hosted spaced-repetition flashcard app',
    theme_color: '#ffffff',
    display: 'standalone',
    start_url: '/',
    icons: [
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  },

  // ── Workbox ───────────────────────────────────────────────────────────────
  workbox: {
    // Precache JS, CSS, HTML — NOT .wasm (default includes wasm, must be removed)
    // Default globPatterns is ['**/*.{js,wasm,css,html}'] — we drop 'wasm' here
    globPatterns: ['**/*.{js,css,html}'],

    // Prevent SW from serving cached HTML for /api/* navigations
    navigateFallbackDenylist: [/^\/api\//],

    runtimeCaching: [
      // /api/* — always go to network, never cache
      {
        urlPattern: ({ url }) => url.pathname.startsWith('/api'),
        handler: 'NetworkOnly',
      },
      // Typst WASM files — too large to precache (28 MB); cache on first use
      // CacheFirst: once downloaded, serve from cache indefinitely (content-addressed)
      {
        urlPattern: /\.wasm$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'wasm-cache',
          cacheableResponse: { statuses: [0, 200] },
          // No expiration — WASM is content-addressed; old cache entries expire naturally
          // on SW update when new precache manifest is installed
        },
      },
    ],
  },
})
```

### Pattern 2: COEP/COOP Headers in Hono (secureHeaders)

**What:** Apply COOP + COEP globally via Hono's built-in `secureHeaders` middleware.
**When to use:** Must be the FIRST middleware registered — before API routes and before `serveStatic`.

```typescript
// Source: https://hono.dev/docs/middleware/builtin/secure-headers
import { secureHeaders } from 'hono/secure-headers'

// ─── 0. COEP/COOP — MUST be first middleware ──────────────────────────────
// Required for Typst WASM (SharedArrayBuffer) in production (PWA-04)
// Currently dev-only via Vite server.headers — this closes the production gap
app.use(
  '*',
  secureHeaders({
    crossOriginOpenerPolicy: 'same-origin',
    crossOriginEmbedderPolicy: 'require-corp',
  }),
)
```

**Important:** `crossOriginEmbedderPolicy` is disabled by default in `secureHeaders` — it must be
explicitly set to `'require-corp'`. [VERIFIED: hono.dev/docs/middleware/builtin/secure-headers]

### Pattern 3: sw.js Cache-Control: no-store (PWA-05)

**What:** Explicit route for `sw.js` before `serveStatic` catch-all; `onFound` callback for
`workbox-*.js` files.
**When to use:** Every Hono deployment serving a PWA — service worker files must not be cached by
the browser HTTP cache, or redeployments won't propagate.

```typescript
// Source: https://deepwiki.com/honojs/node-server/4.4-static-file-middleware-api
import { readFileSync } from 'node:fs'
import { serveStatic } from '@hono/node-server/serve-static'

// ─── 7a. sw.js — no-store (must be before the serveStatic catch-all) ─────
app.get('/sw.js', (c) => {
  try {
    const sw = readFileSync('./public/sw.js', 'utf8')
    c.header('Cache-Control', 'no-store')
    c.header('Content-Type', 'application/javascript')
    return c.body(sw)
  } catch {
    return c.text('Service worker not found', 404)
  }
})

// ─── 7b. workbox-*.js — no-store via onFound callback ────────────────────
// ─── 7c. All other static files — standard long-cache (immutable) ─────────
app.use(
  '*',
  serveStatic({
    root: './public',
    onFound: (path, c) => {
      if (path.includes('workbox-') && path.endsWith('.js')) {
        c.header('Cache-Control', 'no-store')
      }
      // Hashed assets (assets/main-abc123.js) get immutable by Vite — no header override needed
    },
  }),
)
```

**Alternative approach for sw.js:** Rather than `readFileSync`, add a separate `serveStatic` with
`path` option and `onFound`. The `readFileSync` approach is simpler and consistent with the existing
SPA fallback at line 70 of `index.ts`.

### Pattern 4: Icon Generation (PWA-01)

**What:** Generate 192×192 and 512×512 PNG icons from a single SVG source.
**When to use:** No icons exist yet in the project — must be created before the manifest is valid.

```bash
# Step 1: Create source SVG at apps/frontend/public/logo.svg
# (A simple Kartex-branded SVG — must be square)

# Step 2: Run assets generator
npx @vite-pwa/assets-generator --preset minimal-2023 apps/frontend/public/logo.svg
# Outputs: pwa-192x192.png, pwa-512x512.png, pwa-maskable-192x192.png, favicon.ico, etc.

# All output goes to apps/frontend/public/ by default
```

The `minimal-2023` preset generates: 48×48, 64×64, 192×192, 512×512 PNG; maskable variants;
favicon.ico; apple-touch-icon.png. [CITED: https://vite-pwa-org.netlify.app/assets-generator/]

### Pattern 5: index.html Meta Tags (PWA-01)

**What:** Add theme-color meta and apple-touch-icon link to `apps/frontend/index.html`.
**When to use:** Required for full Lighthouse PWA audit pass and iOS Safari home screen icon.

```html
<!-- Source: https://vite-pwa-org.netlify.app/guide/pwa-minimal-requirements.html -->
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#ffffff" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
  <title>Kartex</title>
</head>
```

### Anti-Patterns to Avoid

- **Including `.wasm` in globPatterns:** The Workbox default `globPatterns` includes `wasm`.
  At 28 MB the Typst WASM would fail the `maximumFileSizeToCacheInBytes` check (default 2 MB)
  and generate a Workbox warning, or if the limit is raised, it would bloat the service worker
  install payload. Use `globPatterns: ['**/*.{js,css,html}']` instead.

- **Applying COEP/COOP only to `/api/*`:** The headers must be on ALL responses (static files
  included) to achieve cross-origin isolation. The browser requires COOP/COEP on the document
  response (index.html), not just API responses.

- **Registering COEP/COOP middleware after API routes:** Hono middleware runs in registration
  order. If COEP/COOP is registered after API routes, API responses won't carry the headers.
  Register it as the very first `app.use('*', ...)`.

- **Forgetting `navigateFallbackDenylist`:** Without denylist, the service worker will return
  the cached `index.html` for navigation requests to `/api/*`, breaking the API entirely for
  users who are offline or who hit a stale SW.

- **Using `registerType: 'prompt'` without a UI:** The `prompt` option requires registering
  the `useRegisterSW` composable or similar; with nothing in the UI to handle it, updates are
  silently skipped. Use `autoUpdate` for this project.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Service worker precache manifest | Custom SW with hardcoded asset list | `vite-plugin-pwa` generateSW | Hardcoded lists go stale; Workbox generates a revision-hash manifest that updates precisely |
| WASM caching strategy | Custom fetch intercept in SW | Workbox `CacheFirst` with `cacheableResponse` | Handles opaque responses, cache storage quota, and cache versioning correctly |
| Cross-origin isolation headers | Manual `c.header(...)` calls on every route | `hono/secure-headers` middleware | `secureHeaders` applies globally; individual `c.header()` calls can be missed on new routes |
| Icon resizing | Manual image editing for each size | `@vite-pwa/assets-generator` | Generates all required sizes + maskable variants + favicon from a single SVG source |

**Key insight:** Service worker correctness is a deceptively hard problem. Workbox has battle-tested
implementations of CacheFirst, NetworkOnly, and NetworkFirst that correctly handle edge cases
(opaque responses, quota errors, race conditions). Never implement these strategies from scratch.

---

## Common Pitfalls

### Pitfall 1: WASM Precache Failure (maximumFileSizeToCacheInBytes)

**What goes wrong:** Workbox emits a warning or error: "Refusing to precache URL that exceeds
maximumFileSizeToCacheInBytes" for Typst WASM files during `vite build`.
**Why it happens:** Default `globPatterns` includes `*.wasm`; Typst WASM files are ~28 MB, well
above the 2 MB default limit.
**How to avoid:** Remove `wasm` from `globPatterns`: `['**/*.{js,css,html}']`. Add a `CacheFirst`
runtime caching rule for `*.wasm` instead.
**Warning signs:** `workbox: File ... was greater than the specified maxFileSizeToCacheInBytes` in
the build output.

### Pitfall 2: API Requests Returning Cached index.html

**What goes wrong:** After service worker installation, fetch requests to `/api/decks` return the
cached `index.html` document instead of JSON, breaking all API calls.
**Why it happens:** The service worker's `navigateFallback` is set to `index.html` for all paths
not explicitly excluded. Without `navigateFallbackDenylist: [/^\/api\//]`, API paths are treated as
client-side navigation and served the HTML fallback.
**How to avoid:** Always add `navigateFallbackDenylist: [/^\/api\//]` AND the `NetworkOnly`
runtime caching rule for `/api/*`.
**Warning signs:** API calls returning HTML (Content-Type: text/html) when JSON is expected; 200
status on requests that should 401/404.

### Pitfall 3: Stale Service Worker After Redeployment

**What goes wrong:** Users continue using an old version of the app days after a redeployment
because the browser cached `sw.js` with a long-lived Cache-Control header.
**Why it happens:** `serveStatic` serves all files with default headers; `sw.js` gets
treated like any other static asset. The browser won't check for an updated SW if the HTTP cache
says the old one is still fresh.
**How to avoid:** Explicit route for `/sw.js` with `Cache-Control: no-store` BEFORE the
`serveStatic` middleware. Same for `workbox-*.js` via `onFound`.
**Warning signs:** `sw.js` response has a `Cache-Control` header with `max-age` or `immutable`.

### Pitfall 4: COEP/COOP Breaking Media Requests

**What goes wrong:** `Cross-Origin-Embedder-Policy: require-corp` causes third-party images,
fonts, or external resources to be blocked (shown as opaque network errors in DevTools).
**Why it happens:** COEP `require-corp` blocks any cross-origin resource that doesn't include
`Cross-Origin-Resource-Policy: cross-origin` (or `same-site`) in its response headers. External
CDN-hosted resources typically don't send CORP headers.
**How to avoid:** Kartex uses only self-hosted media (local volume via `/api/media/...`) and the
Typst/KaTeX resources are already bundled. Review any external font or image loads. If any
external resource is needed, use `credentialless` mode instead of `require-corp`.
**Warning signs:** Resources blocked in Network tab with "blocked:coep" reason; `SharedArrayBuffer
is not defined` error still appearing (means COEP did not apply).

### Pitfall 5: Lighthouse PWA Audit — Missing apple-touch-icon

**What goes wrong:** Lighthouse PWA audit warns "Does not provide a valid apple-touch-icon" even
when manifest icons are correct.
**Why it happens:** Older versions of Lighthouse (and some iOS Safari versions) require an explicit
`<link rel="apple-touch-icon">` in `index.html` in addition to manifest icons.
**How to avoid:** Add `<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">`
to `index.html`. The `@vite-pwa/assets-generator` `minimal-2023` preset generates
`apple-touch-icon.png` as part of its output. Note: Safari 15.4+ reads from the manifest directly,
but the explicit tag remains a safe addition for Lighthouse compliance.
**Warning signs:** Lighthouse audit passes on Chrome desktop but iOS Safari home screen shows a
generic icon.

### Pitfall 6: vite-plugin-pwa + vite-plugin-wasm Order

**What goes wrong:** WASM modules fail to load or throw worker errors when `vite-plugin-pwa`
conflicts with `vite-plugin-wasm` or `vite-plugin-top-level-await`.
**Why it happens:** Plugin order matters in Vite. VitePWA should come after other content-
transforming plugins.
**How to avoid:** In `vite.config.ts`, put `VitePWA()` after `react()`, `wasm()`, and
`topLevelAwait()` in the plugins array.
**Warning signs:** WASM loading errors in production that don't appear in dev.

### Pitfall 7: devOptions.enabled Conflicts with Dev Proxy

**What goes wrong:** Enabling `devOptions.enabled: true` causes the service worker to intercept
API calls in development, bypassing the Vite proxy. NetworkOnly rules don't help because the dev
SW may not load at all.
**Why it happens:** Dev mode service workers use a simplified precache and may behave differently
from production SWs. COEP/COOP in dev are already handled by `vite.config.ts server.headers`.
**How to avoid:** Keep `devOptions.enabled: false` (the default). Test PWA behavior only in
production builds (`yarn build && yarn preview`).

---

## Code Examples

### Complete vite.config.ts with VitePWA

```typescript
// Source: https://vite-pwa-org.netlify.app/workbox/generate-sw.html
// + https://github.com/vite-pwa/vite-plugin-pwa/discussions/545
import { createRequire } from 'module'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'
import topLevelAwait from 'vite-plugin-top-level-await'
import { VitePWA } from 'vite-plugin-pwa'
import wasm from 'vite-plugin-wasm'

const require = createRequire(import.meta.url)
const pkg = require('./package.json') as { version: string }

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
      manifest: {
        name: 'Kartex',
        short_name: 'Kartex',
        description: 'Self-hosted spaced-repetition flashcard app',
        theme_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html}'],
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /\.wasm$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'wasm-cache',
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@kartex/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } },
  },
  build: {
    outDir: path.resolve(__dirname, '../../apps/backend/public'),
    emptyOutDir: true,
  },
})
```

### Hono index.ts changes (diff-style view)

```typescript
// Source: https://hono.dev/docs/middleware/builtin/secure-headers

// ADD THIS IMPORT at the top:
import { secureHeaders } from 'hono/secure-headers'

// ADD THIS AS THE VERY FIRST middleware (before the existing health endpoint):
// ─── 0. Cross-origin isolation headers (PWA-04 + Typst WASM in production) ─
app.use(
  '*',
  secureHeaders({
    crossOriginOpenerPolicy: 'same-origin',
    crossOriginEmbedderPolicy: 'require-corp',
  }),
)

// BETWEEN the existing step 6 (admin routes) and step 7 (serveStatic):
// ─── 7a. sw.js — Cache-Control: no-store (PWA-05) ─────────────────────────
app.get('/sw.js', (c) => {
  try {
    const sw = readFileSync('./public/sw.js', 'utf8')
    c.header('Cache-Control', 'no-store')
    c.header('Content-Type', 'application/javascript')
    return c.body(sw)
  } catch {
    return c.text('Service worker not found', 404)
  }
})

// MODIFY the existing serveStatic (step 7) to add onFound callback:
// ─── 7b. Static files with no-store for workbox chunks (PWA-05) ──────────
app.use(
  '*',
  serveStatic({
    root: './public',
    onFound: (path, c) => {
      if (/workbox-[^/]+\.js$/.test(path)) {
        c.header('Cache-Control', 'no-store')
      }
    },
  }),
)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual service worker with `importScripts('workbox-sw.js')` | vite-plugin-pwa + Workbox generateSW | 2020+ | Plugin handles precache manifest, no manual file lists |
| `workbox-webpack-plugin` | `vite-plugin-pwa` | 2021+ | Native Vite integration, no Webpack required |
| `COEP: require-corp` (only mode) | `COEP: credentialless` (Chrome 96+) | 2022 | `credentialless` avoids breaking third-party resources; `require-corp` still needed for Firefox/Safari |

**Deprecated/outdated:**
- Manual `precacheAndRoute()` calls in custom SW: Workbox generateSW handles this automatically.
- `pwa-plugin` (different from `vite-plugin-pwa`): Abandoned project — different package name.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@vite-pwa/assets-generator minimal-2023` preset generates `apple-touch-icon.png` at 180×180 | Pattern 4 / Pitfall 5 | If not, apple-touch-icon must be created manually; Lighthouse warning persists |
| A2 | Typst WASM files reside at root of the built `public/` output (matched by `/\.wasm$/i`) | Pattern 1 | If WASM is nested under `assets/`, the regex still matches since it checks the suffix, not path |
| A3 | `secureHeaders` from `hono/secure-headers` is included in `hono` ^4.7.9 (no separate package) | Pattern 2 | If it requires a separate import, `yarn add hono-secure-headers` or similar would be needed |
| A4 | `onFound` callback in `@hono/node-server` `serveStatic` receives the relative file path as the first argument | Pattern 3 | If the argument is an absolute path or URL, the regex pattern needs adjustment |

A3 is LOW risk — `hono/secure-headers` is a named export from the `hono` package, confirmed in official Hono docs. [CITED: hono.dev/docs/middleware/builtin/secure-headers]

---

## Open Questions

1. **SVG source for icon generation**
   - What we know: `@vite-pwa/assets-generator` needs a square SVG source image.
   - What's unclear: No logo/icon asset exists anywhere in the project yet.
   - Recommendation: Planner should include a task to create a minimal Kartex logo SVG (plain
     letter-mark "K" or similar) before running the assets generator. The exact design is a
     discretion decision — any valid square SVG works for Lighthouse purposes.

2. **COEP breaking media loading**
   - What we know: Media files (`/api/media/*`) are served from the same origin — no CORS issues.
   - What's unclear: Whether KaTeX self-hosted fonts or other bundled assets carry CORP headers
     by default when served via Hono `serveStatic`.
   - Recommendation: After adding COEP/COOP, run a smoke test with the card renderer open and
     check DevTools Network tab for `blocked:coep` errors. Typst fonts are bundled with the WASM —
     should be fine. KaTeX fonts come from the npm package and are served from same origin — fine.

3. **autoUpdate data-loss risk for study sessions**
   - What we know: `autoUpdate` calls `skipWaiting` + `clientsClaim`, which reloads all tabs
     immediately on SW update. A user mid-session could lose their current card position.
   - What's unclear: Whether the study session state is server-persisted (each card rating is a
     POST to `/api/study/rate`) or ephemeral in React state.
   - Recommendation: Since every card rating is immediately POSTed to the backend, autoUpdate
     data loss risk is minimal for Kartex. `autoUpdate` remains the right choice. Include a note
     in the plan for human review.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend Hono server | ✓ | Inferred from project | — |
| yarn@4.15.0 | Package install | ✓ | 4.15.0 (confirmed in STATE.md) | — |
| Vite 5.x | `vite-plugin-pwa` peer dep | ✓ | 5.4.19 (package.json) | — |
| `npx` | `@vite-pwa/assets-generator` CLI | ✓ | bundled with Node | — |
| Chrome DevTools / Lighthouse | PWA audit | ✓ (human step) | N/A | Lighthouse CLI: `npx lighthouse <url> --view` |

No blocking missing dependencies.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 |
| Config file | `apps/frontend/vitest.config.ts` |
| Quick run command | `yarn workspace @kartex/frontend test --run` |
| Full suite command | `yarn workspace @kartex/frontend test --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PWA-01 | manifest.webmanifest exists with required fields after build | smoke (build output inspection) | `yarn build && test -f apps/backend/public/manifest.webmanifest` | ❌ Wave 0 (shell script or manual) |
| PWA-02 | SW precache manifest does NOT include *.wasm URLs | smoke (build output inspection) | `yarn build && grep -v '\.wasm' apps/backend/public/sw.js` or manual | ❌ Wave 0 (shell script or manual) |
| PWA-03 | API routes use NetworkOnly (no cached API responses) | manual-only | Browser DevTools Application → Service Workers → offline test | Manual — cannot unit-test SW behavior in jsdom |
| PWA-04 | Hono server returns COOP + COEP headers | smoke (curl) | `curl -I http://localhost:3000/ \| grep -i cross-origin` | ❌ Wave 0 (curl script or manual) |
| PWA-05 | sw.js has Cache-Control: no-store | smoke (curl) | `curl -I http://localhost:3000/sw.js \| grep -i cache-control` | ❌ Wave 0 (curl script or manual) |

**Note on automated testability:** PWA requirements are primarily integration/smoke tests that
require a running server and/or a production build. Vitest unit tests cannot meaningfully cover
SW registration, manifest validation, or HTTP headers. The planner should schedule these as
manual verification steps or simple shell smoke scripts run after `yarn build`.

### Sampling Rate

- **Per task commit:** `yarn workspace @kartex/frontend test --run` (regression guard — existing tests)
- **Per wave merge:** `yarn workspace @kartex/frontend test --run` + manual smoke (build + curl checks)
- **Phase gate:** Full suite green + manual Lighthouse audit before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `apps/backend/public/` — does not exist until `yarn build`; plan must include build step
- [ ] No Lighthouse CI configured — manual Lighthouse audit is the acceptance gate for PWA-01
- [ ] No automated header assertion test — curl-based smoke script sufficient for PWA-04/05

*(No Vitest test files need to be created for this phase — requirements are not unit-testable.
Existing test suite covers regression only.)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | partial | NetworkOnly for /api/* prevents SW from serving stale auth responses |
| V5 Input Validation | no | — |
| V6 Cryptography | no | — |
| V14 Configuration | yes | COEP/COOP headers, no-store for SW files |

### Known Threat Patterns for PWA Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stale SW serving cached authenticated responses | Info Disclosure | NetworkOnly for /api/* — no API response ever cached |
| Prototype pollution via SW message events | Tampering | generateSW mode — no custom SW message handlers |
| COEP header missing → SharedArrayBuffer not isolated | Tampering (side-channel) | `secureHeaders` with `crossOriginEmbedderPolicy: 'require-corp'` on ALL responses |
| sw.js cached → user runs old code after security fix | Tampering | `Cache-Control: no-store` on sw.js — browser always checks for updates |

---

## Sources

### Primary (HIGH confidence)
- [vite-pwa-org.netlify.app/workbox/generate-sw.html](https://vite-pwa-org.netlify.app/workbox/generate-sw.html) — generateSW config, runtimeCaching patterns, navigateFallbackDenylist
- [hono.dev/docs/middleware/builtin/secure-headers](https://hono.dev/docs/middleware/builtin/secure-headers) — COEP/COOP secureHeaders middleware API
- [developer.chrome.com/docs/workbox/modules/workbox-build](https://developer.chrome.com/docs/workbox/modules/workbox-build) — globPatterns defaults, maximumFileSizeToCacheInBytes
- [developer.chrome.com/docs/lighthouse/pwa/installable-manifest/](https://developer.chrome.com/docs/lighthouse/pwa/installable-manifest/) — Lighthouse installability requirements
- [vite-pwa-org.netlify.app/guide/pwa-minimal-requirements.html](https://vite-pwa-org.netlify.app/guide/pwa-minimal-requirements.html) — manifest fields, icon sizes

### Secondary (MEDIUM confidence)
- [deepwiki.com/honojs/node-server/4.4-static-file-middleware-api](https://deepwiki.com/honojs/node-server/4.4-static-file-middleware-api) — `onFound` callback in serveStatic (DeepWiki, cross-referenced with search results)
- [github.com/vite-pwa/vite-plugin-pwa/discussions/545](https://github.com/vite-pwa/vite-plugin-pwa/discussions/545) — navigateFallbackDenylist + NetworkOnly for /api/* (official maintainer response)
- [vite-pwa-org.netlify.app/assets-generator/](https://vite-pwa-org.netlify.app/assets-generator/) — PWA assets generator usage
- [web.dev/articles/coop-coep](https://web.dev/articles/coop-coep) — COOP/COEP semantics and compatibility

### Tertiary (LOW confidence)
- npm view results for package versions (verified on npm registry, `[ASSUMED]` for legitimacy)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — vite-plugin-pwa is the established Vite integration; versions verified via npm registry; docs fetched from official source
- Architecture: HIGH — patterns derived from official Workbox docs and official Hono docs
- COEP/COOP: HIGH — verified against hono.dev official middleware docs
- serveStatic onFound: MEDIUM — confirmed in DeepWiki (derived from source) but not from official Hono primary docs page (that page returned only limited content)
- Pitfalls: HIGH — Pitfalls 1–4 from official docs; Pitfall 5 from Lighthouse official docs; Pitfall 6/7 from community sources

**Research date:** 2026-06-03
**Valid until:** 2026-09-03 (90 days — vite-plugin-pwa has stable API; Workbox 7.x is current)
