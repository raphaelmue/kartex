# Architecture: v1.2 Feature Integration

**Project:** Kartex v1.2 — Study Control & PWA
**Researched:** 2026-06-02
**Confidence:** HIGH (all claims verified against codebase source)

---

## Existing Architecture Baseline

```
Browser (React SPA)
      |  HTTP(S)
Hono backend (Node.js, port 3000)
  |-- /api/*          → route handlers (auth, decks, study, dashboard, ...)
  |-- * (catch-all)   → serveStatic({ root: './public' })  [step 7 in index.ts]
  |-- * (SPA fallback)→ readFileSync('./public/index.html') [step 8 in index.ts]
      |
  Prisma 7 + PostgreSQL 16
      |
  Docker volume (media files)
```

Build pipeline: Vite builds `apps/frontend` → output lands at `apps/backend/public/` (via `build.outDir` in vite.config.ts). Docker copies that directory into the production image at `/app/apps/backend/public/`. At startup, `entrypoint.sh` runs `prisma migrate deploy` then `node dist/index.js`.

The monorepo uses yarn 4.15.0 workspaces (not pnpm despite CLAUDE.md header).

---

## Feature 1: Active Deck Rotation

### What changes

**Schema (one migration):**
Add `isActive Boolean @default(true)` to `Deck`. Default `true` means all existing decks remain active — zero-downtime migration.

**Backend — three touch points:**

1. `apps/backend/src/routes/decks.ts` — `PATCH /api/decks/:id` already delegates to `UpdateDeckSchema`. Add `isActive` to `UpdateDeckSchema` in `packages/shared/src/schemas/deck.ts` so the existing PATCH handler can persist the toggle without a new route.

2. `apps/backend/src/routes/study.ts` — `GET /api/study/due` builds a `deckFilter` OR-combining owned + shared decks. Add `isActive: true` to the Deck condition in both the `dueWithProgress` and `neverSeen` queries. The `deckFilter` object is used in two places inside the same route handler — both must be updated.

3. `apps/backend/src/routes/dashboard.ts` — `GET /api/dashboard/stats` has its own hard-coded `deck: { ownerId: userId }` filter (does not reuse `deckFilter` from study.ts). It must also add `isActive: true` to its deck condition so the dashboard count stays consistent with what the study queue will show.

**Shared types:**
- `packages/shared/src/schemas/deck.ts` — `DeckSchema` and `DeckListItemSchema` must expose `isActive: z.boolean()` so the frontend can read and toggle the field.
- `UpdateDeckSchema` gains an optional `isActive: z.boolean()` field.

**Frontend:**
- `DecksPage.tsx` (or `DeckDetailPage.tsx`) — add an active/inactive toggle control (e.g., a Switch from shadcn/ui). The toggle calls `PATCH /api/decks/:id` with `{ isActive: false }`.
- `StudySessionPage.tsx` — the `/study` route auto-commits with `{ mode: 'sr', tags: new Set(), size: 'all', count: 1 }`. Currently it has no deck-picker UI. A deck-picker panel (checkboxes or chips listing the user's active decks) needs to be added to the config screen that is already present for deck-specific sessions (`!selectedMode` branch). The global SR path (`isGlobalSR === true`) skips the config screen; this branch needs to be opened up or replaced with a new config-first flow.

**Data flow change:** `GET /api/study/due` gains a `WHERE "Deck"."isActive" = true` condition via Prisma. No API surface change — the response shape is identical.

### Migration risk

LOW. `isActive` defaults to `true` → existing rows are unaffected. Single additive column. Rollback: drop column (no FK dependencies).

---

## Feature 2: SM-2 Preset Modes

### Decision: User model field vs. UserPreferences table

**Recommendation: add `studyMode` to the `User` model directly.**

Rationale:
- There is only one preference (study mode) in v1.2 scope. A `UserPreferences` table is premature abstraction.
- The existing `User` model already has a simple profile shape (id, username, passwordHash, role, isActive, createdAt). Adding one nullable enum field keeps the same pattern used for `role` and `isActive`.
- The `/api/auth/me` endpoint already returns the full `UserSchema`. Adding `studyMode` to `UserSchema` exposes it to the frontend in one place with no extra round-trip.
- If future preferences emerge (v2+), the `User` model can be refactored to a `UserPreferences` table at that time.

**Schema addition:**

```prisma
enum StudyMode {
  NORMAL
  INTENSIVE
  EXAM_PREP
}

model User {
  ...
  studyMode StudyMode @default(NORMAL)
  ...
}
```

**Where the multiplier runs:**

The SM-2 logic lives in `packages/shared/src/lib/sm2.ts` → `calculateSM2(input: SM2Input): SM2Output`. The function is pure and stateless — it does not read from the DB. The multiplier must be applied **in the route handler** (`apps/backend/src/routes/study.ts`, `POST /api/study/rate`), after `calculateSM2` returns and before `prisma.cardProgress.upsert`. Specifically:

```
const sm2 = calculateSM2({ quality, repetitions, easeFactor, interval })
// Apply mode multiplier to the computed interval:
const modeMultiplier = { NORMAL: 1, INTENSIVE: 0.5, EXAM_PREP: 0.25 }[userStudyMode]
const scaledInterval = Math.max(1, Math.round(sm2.interval * modeMultiplier))
// Recompute nextReview from scaledInterval (or pass multiplied interval to a helper)
```

The `calculateSM2` function itself should NOT be modified — it stays a pure SM-2 implementation. The mode scaling is a post-processing step at the route layer. This keeps `packages/shared/sm2.ts` test-stable and the shared package free of backend concerns.

**New API endpoint:** `PATCH /api/users/me/preferences` (or `PATCH /api/auth/me`) accepting `{ studyMode: 'NORMAL' | 'INTENSIVE' | 'EXAM_PREP' }`. The `POST /api/study/rate` handler must fetch the caller's `studyMode` before calling `calculateSM2` — this is one additional `prisma.user.findUnique` per rate call. For 2-5 users and non-hot-path card rating, this is acceptable; caching is not needed.

**Shared types:**
- Add `StudyModeEnum = z.enum(['NORMAL', 'INTENSIVE', 'EXAM_PREP'])` to `packages/shared/src/schemas/user.ts`.
- Add `studyMode: StudyModeEnum` to `UserSchema` and `UserResponseSchema`.
- New `UpdateStudyModeSchema = z.object({ studyMode: StudyModeEnum })` — can live in `schemas/user.ts`.

**Frontend:**
- `/settings` route is currently a `<ComingSoon>` placeholder (see `App.tsx`). This feature gives the `/settings` page its first real content: a mode picker (radio group or select) that PATCHes the new endpoint.
- `AuthContext.tsx` stores the `User` object returned by `/api/auth/me`. Once `UserSchema` includes `studyMode`, the context automatically carries it — no context refactor needed.

**Migration risk:** LOW. Nullable-or-defaulted enum column. PostgreSQL `ALTER TABLE ADD COLUMN ... DEFAULT 'NORMAL'` is instant for small tables. Rollback: drop column + drop enum type.

---

## Feature 3: PWA Shell

### Build output

`vite-plugin-pwa` with `generateSW` strategy emits into Vite's `build.outDir` (currently `apps/backend/public/`):
- `sw.js` — service worker at root of outDir
- `workbox-<hash>.js` — Workbox runtime
- `manifest.webmanifest` — Web App Manifest (JSON)
- `registerSW.js` — auto-injected registration script

The plugin injects the `<link rel="manifest">` tag and the `registerSW.js` script tag into `index.html` automatically during build.

### Hono static serving interaction

Current Hono routing order in `index.ts`:

```
step 7: app.use('*', serveStatic({ root: './public' }))
step 8: app.get('*', (c) => readFileSync('./public/index.html'))
```

Step 7 uses `@hono/node-server/serve-static`. This middleware serves any file that exists in `./public` by path. Because `sw.js` and `manifest.webmanifest` land **in the root of `./public`**, `serveStatic` will serve them at `/sw.js` and `/manifest.webmanifest` respectively — **no Hono route changes are needed** for file serving.

However, two concerns need to be addressed:

**1. Content-Type for manifest.webmanifest:**
Browsers require `Content-Type: application/manifest+json` for `.webmanifest` files. Hono's `serveStatic` delegates MIME detection to the underlying file system adapter. The `@hono/node-server` adapter uses the `mime` package. Verify that `mime` maps `.webmanifest` → `application/manifest+json`. If not (older `mime` versions map it to `application/json`), add a custom middleware before `serveStatic` that intercepts `/manifest.webmanifest` and sets the correct header. This is a one-liner Hono middleware.

**2. Cache-Control for sw.js and manifest.webmanifest:**
Browsers refuse to cache service workers longer than 86400 seconds, and a stale `sw.js` prevents updates from reaching users. Hono's `serveStatic` does not set `Cache-Control` by default, which is acceptable (browsers apply their own defaults for SW files). For production correctness, add a Hono middleware that sets `Cache-Control: no-cache` for `/sw.js` and `/manifest.webmanifest` specifically. This matches the PWA deployment guidance for non-hashed files.

**3. COOP/COEP headers in production:**
The Vite dev server sets `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` (required for Typst WASM SharedArrayBuffer). These headers are currently **only in the Vite dev server config** (`vite.config.ts` → `server.headers`). They are NOT applied by Hono in production. Add these two headers to Hono for all `*` responses (before `serveStatic`) to maintain Typst WASM correctness in production. This is pre-existing tech debt; the PWA work is a good time to fix it.

**SW scope:** `vite-plugin-pwa` registers the SW at `/sw.js` with scope `/` by default. Since the SPA is served from the root, this is correct. No `Service-Worker-Allowed` header override is needed.

**HTTPS:** Service workers require HTTPS in production. The existing deployment (Docker Compose, port 3000) is expected to be behind a reverse proxy that terminates TLS. No change needed in the application.

### Docker / production path

The Dockerfile copies `apps/backend/public/` into `/app/apps/backend/public/`. After the Vite build with `vite-plugin-pwa`, that directory will contain `sw.js`, `workbox-*.js`, and `manifest.webmanifest` alongside the existing `index.html` and `assets/`. No Dockerfile changes are needed.

### PWA manifest content

The `manifest.webmanifest` is configured inside `vite.config.ts` under the `VitePWA({ manifest: { ... } })` plugin option. Required fields for installability: `name`, `short_name`, `start_url`, `display: 'standalone'`, `background_color`, `theme_color`, `icons` (at minimum 192x192 and 512x512 PNG). Icons must exist in `apps/frontend/public/` to be included in the build output and referenced by the manifest.

### What vite-plugin-pwa is NOT doing in v1.2

The offline study requirement is explicitly deferred to v2. The `generateSW` workbox config should use `networkFirst` or `networkOnly` for `/api/*` routes — precaching only static shell assets (HTML, JS, CSS, fonts, icons). This prevents stale API responses from being served from cache.

---

## Feature 4: Docs (README.md)

No architectural impact. Touches only repo root and `docs/`. No schema, backend, or frontend code changes.

---

## Component Map: New vs Modified

| Component | Status | Change |
|-----------|--------|--------|
| `schema.prisma` — Deck model | **Modified** | Add `isActive Boolean @default(true)` |
| `schema.prisma` — User model | **Modified** | Add `studyMode StudyMode @default(NORMAL)` |
| `schema.prisma` — enums | **Modified** | Add `StudyMode` enum |
| New Prisma migration | **New** | Single migration for both schema changes |
| `packages/shared/schemas/deck.ts` | **Modified** | Add `isActive` to `DeckSchema`, `UpdateDeckSchema` |
| `packages/shared/schemas/user.ts` | **Modified** | Add `StudyModeEnum`, `studyMode` to `UserSchema`/`UserResponseSchema`, new `UpdateStudyModeSchema` |
| `apps/backend/src/routes/study.ts` — `GET /due` | **Modified** | Add `isActive: true` filter to `deckFilter` (two query sites) |
| `apps/backend/src/routes/study.ts` — `POST /rate` | **Modified** | Fetch user's `studyMode`, apply interval multiplier after `calculateSM2` |
| `apps/backend/src/routes/dashboard.ts` | **Modified** | Add `isActive: true` to deck filter in stats query |
| `apps/backend/src/routes/decks.ts` — `PATCH /:id` | **Unchanged** | Already delegates to `UpdateDeckSchema` — picks up `isActive` automatically |
| New route: `PATCH /api/users/me/preferences` (or `PATCH /api/auth/me`) | **New** | Accepts `{ studyMode }`, persists to User |
| `apps/backend/src/index.ts` | **Modified** | Register new preferences route; add COOP/COEP headers for production; add Cache-Control middleware for `/sw.js`, `/manifest.webmanifest` |
| `apps/frontend/vite.config.ts` | **Modified** | Add `vite-plugin-pwa` with `generateSW`, manifest config, workbox routes |
| `apps/frontend/public/` | **New files** | PWA icons (192×192, 512×512 PNG) |
| `apps/frontend/src/pages/StudySessionPage.tsx` | **Modified** | Global SR path: open config screen, add deck-picker UI |
| `apps/frontend/src/pages/DecksPage.tsx` or `DeckDetailPage.tsx` | **Modified** | Add active/inactive toggle per deck |
| `apps/frontend/src/pages/SettingsPage.tsx` | **New** (replaces `<ComingSoon>`) | Study mode picker (radio group), calls PATCH preferences endpoint |
| `apps/frontend/src/App.tsx` | **Unchanged** | `/settings` route already wired |
| `apps/backend/prisma/migrations/<new>/migration.sql` | **New** | Generated by `prisma migrate dev` |

---

## Build Order and Dependencies

The dependency chain is strict — each step unblocks the next:

```
1. Schema changes (schema.prisma)
   └─> 2. Generate Prisma migration
         └─> 3. Shared type updates (packages/shared)
               ├─> 4a. Backend route changes (study.ts, dashboard.ts, new prefs route, index.ts)
               └─> 4b. Frontend UI changes (StudySessionPage, DecksPage, SettingsPage, vite.config.ts)
                         └─> 5. PWA icons + manifest config (can run in parallel with 4b)
```

Steps 4a and 4b can be worked on in parallel once step 3 is done (shared types are the contract between them). Step 5 (PWA icon assets + vite.config.ts plugin config) is independent of steps 1-4 and can be done at any time.

**Critical ordering rule:** The Prisma migration must be committed and applied before any backend code that references the new fields (`isActive`, `studyMode`) is deployed. In the Docker Compose flow, `entrypoint.sh` runs `prisma migrate deploy` before starting the server — so this is automatically enforced at deploy time.

---

## Patterns to Follow

### Pattern: Additive Schema + Shared Type First

Always update `schema.prisma` → generate migration → update `packages/shared` schemas → then update backend routes and frontend. This prevents TypeScript compile errors in routes that import shared types.

### Pattern: `deckFilter` Reuse

The `deckFilter` object in `study.ts` is used in multiple Prisma queries. The `isActive: true` condition must be added to the `deckFilter` definition (or its constituent OR clauses), not duplicated at each query site. Current structure:

```typescript
const deckFilter = {
  OR: [
    { ownerId: userId },
    { id: { in: sharedDeckIds } },
  ],
}
```

Becomes:

```typescript
const deckFilter = {
  isActive: true,   // <-- add here
  OR: [
    { ownerId: userId },
    { id: { in: sharedDeckIds } },
  ],
}
```

Both the `dueWithProgress` and `neverSeen` queries then inherit the filter automatically.

### Pattern: SM-2 Stays Pure

Do not add a `mode` or `multiplier` parameter to `calculateSM2`. The function is tested and shared — it must remain a direct SM-2 implementation. Apply the interval multiplier at the call site in `routes/study.ts` as a post-processing step, and recompute `nextReview` from the scaled interval using the same date-arithmetic pattern already in `sm2.ts`.

### Pattern: StudyMode in Auth Context

`AuthContext` stores the `User` object from `/api/auth/me`. Once `UserSchema` gains `studyMode`, the settings page can read `user.studyMode` from the context without an additional fetch. After a successful PATCH, call `/api/auth/me` again (or update local state directly) to reflect the change.

---

## Anti-Patterns to Avoid

### Anti-Pattern: Separate UserPreferences Table

A dedicated `UserPreferences` table for a single field adds a join to every user fetch and a second migration. The `User` model pattern (adding typed nullable/defaulted fields) is already established by `role`, `isActive`, and the upcoming `studyMode`. Use it.

### Anti-Pattern: Modifying calculateSM2 Signature

Adding mode parameters to the shared `sm2.ts` function breaks the clean separation between algorithm and application logic, contaminates tests, and forces the frontend (which also imports this function) to handle backend-only concepts. Apply mode at the route layer.

### Anti-Pattern: Precaching /api/* in Service Worker

If the Workbox `generateSW` config does not explicitly exclude `/api/*`, Workbox's default behavior may attempt to cache API responses. This would serve stale flashcard data from cache. Always configure `runtimeCaching` with `NetworkOnly` or `NetworkFirst` for `/api/*` routes, or exclude them from the precache manifest using `navigateFallbackDenylist`.

### Anti-Pattern: Forgetting dashboard.ts Filter

`dashboard.ts` has its own independent deck filter (`deck: { ownerId: userId }`). It does NOT import or reuse `deckFilter` from `study.ts`. If only `study.ts` is updated with `isActive: true`, the dashboard will still count inactive decks. Both files must be updated.

---

## Migration Risk Summary

| Change | Risk | Mitigation |
|--------|------|------------|
| `Deck.isActive @default(true)` | LOW | Non-breaking additive column, default preserves existing behavior |
| `User.studyMode @default(NORMAL)` | LOW | Non-breaking additive column + enum, default preserves existing behavior |
| Single combined migration | LOW | `prisma migrate deploy` in entrypoint runs before server start |
| `vite-plugin-pwa` in vite.config.ts | LOW | Build-time only; worst case: build fails, not runtime failure |
| COOP/COEP headers added to Hono | LOW-MEDIUM | Required for Typst WASM; could break if reverse proxy strips custom headers |
| Cache-Control for `/sw.js` | LOW | Additive Hono middleware, no existing behavior changed |
| `manifest.webmanifest` Content-Type | LOW | One-liner Hono middleware; easily verifiable with curl |

---

## Sources

- Codebase: `apps/backend/src/index.ts`, `routes/study.ts`, `routes/dashboard.ts`, `routes/decks.ts`
- Codebase: `apps/backend/prisma/schema.prisma`
- Codebase: `packages/shared/src/lib/sm2.ts`, `schemas/study.ts`, `schemas/deck.ts`, `schemas/user.ts`
- Codebase: `apps/frontend/vite.config.ts`, `src/pages/StudySessionPage.tsx`, `src/context/AuthContext.tsx`
- [vite-plugin-pwa PWA Requirements](https://deepwiki.com/vite-pwa/vite-plugin-pwa/8.1-pwa-requirements) — MEDIUM confidence (DeepWiki, verified against official Nginx deployment guide)
- [vite-plugin-pwa Nginx deployment guide](https://vite-pwa-org.netlify.app/deployment/nginx) — MEDIUM confidence (official docs site)
- [vite-plugin-pwa GitHub](https://github.com/vite-pwa/vite-plugin-pwa) — HIGH confidence (official source)
