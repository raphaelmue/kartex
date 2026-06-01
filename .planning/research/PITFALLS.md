# Domain Pitfalls — Kartex v1.2

**Domain:** Adding Active Deck Rotation, SM-2 Preset Modes, PWA Shell, and Docs to an existing Vite 5 + Hono + Prisma 7 system.
**Researched:** 2026-06-02
**Scope:** Integration pitfalls specific to this codebase. Not generic advice.

---

## Critical Pitfalls

Mistakes that cause broken functionality, build failures, or require rewrites.

---

### Pitfall 1: Typst WASM Files Will Break the PWA Build

**Feature:** PWA shell (vite-plugin-pwa)
**What goes wrong:** The build step that generates the service worker precache manifest will throw a hard error if any asset in `apps/backend/public/assets/` exceeds `maximumFileSizeToCacheInBytes` (default: 2 MiB). The Kartex build already contains `typst_ts_web_compiler_bg-*.wasm` at **28 MB** and `typst_ts_renderer_bg-*.wasm` at **952 KB**. From vite-plugin-pwa v0.20.2 onward, this is a fatal build error, not a silent warning. The build will fail in CI and in Docker.

**Why it happens:** `vite-plugin-pwa` uses `workbox-build` to traverse the Vite output directory. By default, it catches all `*.{js,css,html}` but the WASM files land in `public/assets/` alongside the JS chunks. If the globPattern is widened to include `*.wasm`, the 28 MB file triggers the size guard.

**Consequences:** Docker image build fails. CI fails. If somehow bypassed, a 28 MB precache on first install would make the PWA install prompt a terrible UX — the service worker would try to download 30+ MB before activation.

**Prevention:**
1. Do NOT add `*.wasm` to `workbox.globPatterns`. Leave WASM out of the precache manifest entirely.
2. Set `workbox.maximumFileSizeToCacheInBytes` explicitly (e.g., 5 MB) only if you need to cache the renderer WASM (952 KB) — not the compiler WASM.
3. Add the Typst WASM pattern to `workbox.globIgnores` or use `workbox.dontCacheBustURLsMatching` to exclude files matching `typst_ts_web_compiler`.
4. Use a Workbox `runtimeCaching` rule with `CacheFirst` for WASM assets instead — they are loaded lazily and hashed by Vite already, so cache-busting is correct at the URL level.

**Concrete config:**
```ts
VitePWA({
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,svg,png}'], // no .wasm
    globIgnores: ['**/typst_ts_web_compiler_bg*.wasm'],
    maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MB covers renderer WASM
    runtimeCaching: [
      {
        urlPattern: /\.wasm$/i,
        handler: 'CacheFirst',
        options: { cacheName: 'wasm-cache', expiration: { maxAgeSeconds: 30 * 24 * 60 * 60 } },
      },
    ],
  },
})
```

**Detection:** Build output contains `"Warning: rollup chunk exceeds..."` or `"maximumFileSizeToCacheInBytes"` in build logs. CI fails on the frontend build step.

---

### Pitfall 2: Hono's Wildcard Static Handler Will Serve a Stale sw.js After Redeployment

**Feature:** PWA shell (vite-plugin-pwa + Hono serveStatic)
**What goes wrong:** `vite-plugin-pwa` emits `sw.js` and `workbox-*.js` into the Vite output dir (`apps/backend/public/`). Hono's existing catch-all `app.use('*', serveStatic({ root: './public' }))` will serve these files correctly — **but** the browser will aggressively cache `sw.js` according to the HTTP headers Hono sets. If `sw.js` is served with any `Cache-Control` max-age greater than zero, browsers may continue running the old service worker version after a redeployment, never detecting the update.

**Why it happens:** By default, `@hono/node-server/serve-static` does not set `Cache-Control: no-cache` on its responses. The service worker update check works by re-fetching `sw.js` byte-for-byte; if the HTTP cache returns a stale response, the browser never sees the changed file.

**Consequences:** After deploying a new build, users continue running the old service worker for hours or days. New JS chunks are served fresh (Vite content-hashes the filenames), but the service worker's precache manifest is stale. Users see runtime errors if the new app tries to load chunk filenames not in the old manifest.

**Prevention:**
1. Add explicit `Cache-Control: no-store` or `no-cache` headers for `sw.js` and `workbox-*.js` in the Hono static serving middleware. Add a specific route before the wildcard:
   ```ts
   app.get('/sw.js', (c) => {
     c.header('Cache-Control', 'no-store')
     // delegate to serveStatic or readFileSync
   })
   app.get('/workbox-:hash.js', (c) => {
     c.header('Cache-Control', 'no-store')
   })
   ```
2. Alternatively, serve `sw.js` with `Cache-Control: max-age=0, must-revalidate`.
3. Do NOT configure `registerType: 'autoUpdate'` without also ensuring sw.js cache headers are correct — autoUpdate is only reliable when the browser always fetches a fresh copy of sw.js.

**Phase that addresses this:** The PWA phase plan must include explicit Hono response headers for service worker files. This is not handled by vite-plugin-pwa itself — it is the server's responsibility.

---

### Pitfall 3: COEP/COOP Headers Are Set in Vite Dev Server But Not in Production Hono

**Feature:** PWA shell (Typst WASM requires SharedArrayBuffer)
**What goes wrong:** The Vite dev server config at `apps/frontend/vite.config.ts` sets `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` under `server.headers`. These are dev-only. The production Hono server in `apps/backend/src/index.ts` does **not** set these headers. Typst WASM (the web compiler) requires `SharedArrayBuffer`, which requires cross-origin isolation. In production today, Typst may be silently falling back to a degraded mode, or it may fail outright — the installed PWA will have the same issue.

**Why it happens:** `server.headers` in Vite config is a dev-server-only setting. It has no effect on the built SPA served by Hono.

**Consequences:** Typst `#typst` blocks fail to render in production. If the PWA is installed and the app is opened in standalone mode, the missing COEP/COOP headers may additionally prevent service worker registration in some browsers.

**Prevention:**
1. Add COEP/COOP headers to the Hono server for all responses (or at least for the HTML document responses):
   ```ts
   app.use('*', async (c, next) => {
     await next()
     c.header('Cross-Origin-Opener-Policy', 'same-origin')
     c.header('Cross-Origin-Embedder-Policy', 'require-corp')
   })
   ```
2. This should be done in the phase that integrates PWA, but must also be validated for existing Typst rendering correctness in production.
3. Note: COEP `require-corp` blocks cross-origin resources that don't send `Cross-Origin-Resource-Policy` headers. External YouTube/Vimeo embeds will break unless you switch to `COEP: credentialless` (Chrome 96+, Firefox 119+). Safari support for `credentialless` is limited — verify before adopting.

**Detection:** In production, open DevTools Console → check for `SharedArrayBuffer is not defined` or `Cross-Origin-Opener-Policy` errors. Check Network tab for COEP header on HTML responses.

---

### Pitfall 4: Prisma Migration for Deck.isActive Must Use @default(true) or It Will Fail on Existing Rows

**Feature:** Active deck rotation (new `isActive Boolean` on `Deck` model)
**What goes wrong:** Adding a `NOT NULL` column to an existing table with rows fails unless a default value is provided at the SQL level. Prisma's migration generator will include `@default(true)` in the schema annotation, which causes `ALTER TABLE "Deck" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true`. This is safe — existing rows get `true` (active). **However**, if the developer writes the schema field as `isActive Boolean` without `@default(true)`, Prisma will generate a migration that adds a NOT NULL column with no DEFAULT, which will be rejected by PostgreSQL if any rows exist.

**Why it happens:** Prisma does not add a column-level DEFAULT automatically unless `@default()` is in the schema. The migration SQL is literal: no `@default` in Prisma schema = no `DEFAULT` in the `ALTER TABLE` SQL.

**Consequences:** `prisma migrate deploy` fails in production Docker container during startup. The entrypoint script (`set -e`) causes the container to exit immediately. The deployment is broken.

**Prevention:**
1. Always include `@default(true)` on the Deck schema field: `isActive Boolean @default(true)`.
2. Before merging the migration, verify the generated `.sql` file in `apps/backend/prisma/migrations/` contains `DEFAULT true` in the `ALTER TABLE` statement.
3. Test `prisma migrate deploy` against a populated test database before production deployment, not just against a fresh database.

**Detection:** Container exits at startup with `prisma migrate deploy` error in logs. Error message: `column "isActive" of relation "Deck" contains null values` or `violates not-null constraint`.

---

## Moderate Pitfalls

---

### Pitfall 5: SM-2 Multiplier Applied to nextReview Interval But EF Floor Still Clamps Growth

**Feature:** SM-2 preset modes (Normal / Intensive / Exam Prep)
**What goes wrong:** The preset modes multiply computed intervals (e.g., Intensive halves them, Exam Prep quarters them). A naive implementation applies the multiplier to the raw `newInterval` result from `calculateSM2`. The pitfall is that the EF floor (1.3) still applies — a card permanently at EF=1.3 with Intensive mode (0.5x multiplier) will have its already-slow growth further compressed. This creates cards that never escape short intervals: at EF=1.3 and an interval of 10 days, normal mode gives 13 days, Intensive gives 6 days. After repeated `Again` ratings, the card is stuck at 1-day intervals even in Normal mode, and the multiplier makes no perceptible difference.

**Also:** If the multiplier is applied **before** the EF multiplication in the interval formula (i.e., to the interval being fed in rather than to the output), it corrupts the stored `interval` in `CardProgress`, permanently shrinking the card's base interval. The multiplier must only apply to `nextReview` calculation — the stored `interval` in the database must remain the un-multiplied SM-2 interval.

**Prevention:**
1. The multiplier must only affect the `nextReview` date calculation, not the `interval` value stored in `CardProgress`. Store the raw SM-2 interval always; compute `nextReview = today + interval * multiplier`.
2. Add a test case: a card at EF=1.3, interval=1, rating=Good under Exam Prep (0.25x). Verify `nextReview` is 1 day (not 0 or fractional), `interval` stored is 1 (not 0.25), and the EF is still updated normally.
3. Apply `Math.max(1, Math.round(interval * multiplier))` to avoid `nextReview` rounding to 0 days (which would make a card immediately due again, identical to `Again` behavior).

**Detection:** Unit tests for `calculateSM2` should cover the multiplier interaction. A card rated Easy repeatedly under Exam Prep mode should still advance intervals, just more slowly.

---

### Pitfall 6: The /study Due-Card Query Does Not Filter by Deck.isActive

**Feature:** Active deck rotation + existing `/api/study/due` endpoint
**What goes wrong:** The existing `GET /api/study/due` query in `apps/backend/src/routes/study.ts` has a `deckFilter` object with `OR: [{ ownerId: userId }, { id: { in: sharedDeckIds } }]`. Adding `isActive` filtering requires modifying this query in two places: the `dueWithProgress` query and the `neverSeen` query. If either is missed, inactive decks will still appear in the study queue.

**Prevention:**
1. Add `isActive: true` to the `deckFilter` object. Since `deckFilter` is a shared variable used in both queries, a single change propagates — but verify both `prisma.cardProgress.findMany` and `prisma.card.findMany` use the same filter reference.
2. Add a backend test case: create a deck with `isActive: false`, add cards, call `/api/study/due` — the response must not include those cards.
3. Consider whether shared decks (decks you don't own) should also respect the `isActive` flag on the deck owner's side, or if sharing overrides `isActive`. Document this decision explicitly.

---

### Pitfall 7: Deck Picker Selection State Must Not Be Stored in the Deck's isActive Field

**Feature:** Deck picker on /study page
**What goes wrong:** The /study page deck picker lets the user choose which decks to include in the upcoming session. There is a temptation to use `isActive` for this — toggle a deck's `isActive` as the user checks/unchecks in the picker. This is wrong: `isActive` is a persistent preference ("I've archived this deck"), not a per-session selection. Using it for session selection means checking a deck in the picker writes to the database on every click, and deselecting one deck during a session would permanently archive it.

**Prevention:**
1. The /study picker's per-session selection is local React state (or URL search params) — never persisted.
2. `isActive` on the `Deck` model is only toggled from the deck's settings/detail page, not from the study session picker.
3. The /study picker should pre-populate with active decks (`isActive: true`) but allow the user to temporarily include inactive ones or exclude active ones for the current session without writing to the database.

---

### Pitfall 8: iOS Safari PWA Standalone Mode Has Cookie Isolation From the Browser

**Feature:** PWA shell (installable app)
**What goes wrong:** When a user installs the Kartex PWA on iOS and launches it in standalone mode (from the home screen), Safari provides an isolated storage context. Cookies set by the browser tab (during the install flow) are **not shared** with the standalone PWA context in older iOS versions. The user may authenticate in the browser, install the PWA, open it — and find themselves logged out.

**Why it happens:** iOS isolates standalone PWA storage from the browser. From iOS 14 onward, the PWA and Safari share the service worker and CacheStorage but cookies, localStorage, and sessionStorage remain separate per-context.

**Consequences:** Users must log in again after installing the PWA. This is expected behavior on iOS, but it should not be presented as a bug. The JWT httpOnly cookie auth flow will work normally within the standalone context once the user logs in.

**Prevention:**
1. No code change required — the httpOnly cookie auth works correctly within the standalone context.
2. Document this behavior for self-hosted operators and end users: "After installing as a PWA on iOS, you will need to log in once."
3. Do not attempt to work around this with localStorage token storage — that is a security regression.

---

### Pitfall 9: beforeinstallprompt Cannot Be Called Twice If Dismissed

**Feature:** PWA shell (install prompt UI)
**What goes wrong:** The `beforeinstallprompt` event can only be `.prompt()`-ed once. If the user dismisses the native install dialog without installing, the event is consumed. Calling `.prompt()` again on the same event object does nothing. Additionally, the browser may suppress `beforeinstallprompt` from firing again for a period after dismissal (browser-dependent, commonly 90 days on Chrome).

**Prevention:**
1. After calling `deferredPrompt.prompt()`, immediately set `deferredPrompt = null`. Do not re-show the in-app install button until a new `beforeinstallprompt` event fires.
2. Show the install prompt after a meaningful user action (e.g., after completing a study session) — not immediately on page load. This satisfies Chrome's user engagement heuristic.
3. Provide a manual "Install app" button in the settings page for users who dismissed the prompt, explaining what to do on iOS (where `beforeinstallprompt` never fires — use the Safari Share > Add to Home Screen flow instead).

---

### Pitfall 10: SM-2 studyMode Must Be Stored Per-User on the Server, Not in the Client

**Feature:** SM-2 preset modes
**What goes wrong:** If `studyMode` is stored in localStorage or React state only, it is lost on browser clear, not shared across devices, and cannot be validated server-side. More critically: if the study rate endpoint `POST /api/study/rate` calls `calculateSM2` without the mode multiplier (because it's client-only state), the intervals are always stored as if Normal mode is active.

**Prevention:**
1. `studyMode` must be a field on the `User` model (or a `UserSettings` model) in the database.
2. The `POST /api/study/rate` endpoint must read the user's `studyMode` from the database and apply the multiplier when computing `nextReview`.
3. The Zod schema for the rate endpoint must NOT accept `studyMode` from the client — it is looked up server-side from the authenticated user's record. This prevents client-side spoofing of the multiplier.
4. Adding `studyMode` to the `User` model requires a Prisma migration. The same migration safety rules as Pitfall 4 apply: include a `@default("NORMAL")` or similar.

---

## Minor Pitfalls

---

### Pitfall 11: PWA Manifest start_url Must Match the App's Base URL

**What goes wrong:** If `manifest.json` has `"start_url": "/"` but the app is deployed at a sub-path (e.g., `/kartex/`), the installed PWA will open to a 404.

**Prevention:** Kartex is deployed at the root (`/`) via Docker Compose. Set `start_url: "/"` and `scope: "/"`. No sub-path deployment is planned. If that changes, the Vite `base` config and manifest `start_url` must be updated in tandem.

---

### Pitfall 12: workbox.navigateFallback Must Be Set for SPA Client-Side Routing

**What goes wrong:** By default, if the service worker handles navigation requests (i.e., direct URL access like `/decks/xyz`), it looks for a precached resource at that exact URL. Since `/decks/xyz` is not a static file, the service worker returns a 404 (or falls through to network, which works when online — but breaks the "app shell" model).

**Prevention:** Set `workbox.navigateFallback: '/index.html'` in the vite-plugin-pwa config so all navigation requests return the cached SPA shell. Pair with `workbox.navigateFallbackDenylist: [/^\/api\//]` to exclude API routes from the fallback — API requests must always go to the network.

---

### Pitfall 13: Deck isActive Filter Must Be Consistent Across All Study Entry Points

**What goes wrong:** Kartex has three study entry points: `/study` (SM-2 due queue), `/decks/:id/learn` (single deck session), and `/study` exam mode. If `isActive` filtering is only applied to the `/api/study/due` endpoint but not to the deck session endpoint (`/api/study/deck/:deckId`), users can still study from an inactive deck by navigating directly to `/decks/:id/learn`. This is arguably correct behavior (explicit per-deck study should ignore `isActive`) — but it must be a deliberate decision, not an oversight.

**Prevention:** Decide and document: should `/api/study/deck/:deckId` respect `isActive`? Recommendation: No — explicit single-deck study should always work regardless of `isActive`. Only the aggregate `/api/study/due` queue should filter by `isActive`. Document this in the API.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| PWA: vite-plugin-pwa integration | Typst WASM 28 MB breaks precache build (Pitfall 1) | Exclude WASM from globPatterns on day one of this phase |
| PWA: Hono static serving + sw.js | No `Cache-Control: no-store` on sw.js = stale SW after deploy (Pitfall 2) | Add explicit Hono route for sw.js before the wildcard serveStatic |
| PWA: Typst rendering in production | COEP/COOP headers missing in production Hono server (Pitfall 3) | Add COEP/COOP middleware to Hono; validate Typst works in production first |
| Schema: Deck.isActive migration | Missing `@default(true)` breaks `prisma migrate deploy` on populated DB (Pitfall 4) | Verify generated SQL contains `DEFAULT true`; test against populated DB |
| SM-2 modes: multiplier implementation | Multiplier corrupts stored interval if applied pre-storage (Pitfall 5) | Multiplier only affects nextReview date; stored interval is always raw SM-2 output |
| SM-2 modes: server-side storage | studyMode in localStorage only = server always uses Normal mode (Pitfall 10) | Add studyMode to User model with @default; look up in rate endpoint |
| Deck picker: isActive semantics | Session selection conflated with archival (Pitfall 7) | Session selection = local React state; isActive toggle = deck settings page only |
| PWA: iOS install | Cookie isolation on iOS standalone (Pitfall 8) | Expected; document for users; no code workaround needed |
| PWA: install prompt | beforeinstallprompt single-use (Pitfall 9) | Null-out deferred event after prompt(); show post-session |

---

## Sources

- [vite-plugin-pwa FAQ — maximumFileSizeToCacheInBytes](https://vite-pwa-org.netlify.app/guide/faq)
- [vite-plugin-pwa Service Worker Precache](https://vite-pwa-org.netlify.app/guide/service-worker-precache)
- [vite-plugin-pwa Auto Update](https://vite-pwa-org.netlify.app/guide/auto-update.html)
- [Prisma Customizing Migrations](https://www.prisma.io/docs/orm/prisma-migrate/workflows/customizing-migrations)
- [Prisma Discussion: Adding Non-Nullable Column](https://github.com/prisma/prisma/discussions/20607)
- [Prisma Migrate Deploy with Docker — notiz.dev](https://notiz.dev/blog/prisma-migrate-deploy-with-docker/)
- [MDN: Trigger PWA Install Prompt](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt)
- [web.dev: PWA Installation Prompt](https://web.dev/learn/pwa/installation-prompt)
- [web.dev: Cross-Origin Isolation with COOP/COEP](https://web.dev/articles/coop-coep)
- [PWA iOS Limitations and Safari Support](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)
- [Workbox GitHub Issue: index.html and SPA navigation](https://github.com/GoogleChrome/workbox/issues/2067)
- [SM-2 Algorithm — Anki/RemNote](https://help.remnote.com/en/articles/6026144-the-anki-sm-2-spaced-repetition-algorithm)
