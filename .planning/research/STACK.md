# Technology Stack — v1.2 Additions

**Project:** Kartex v1.2 Study Control & PWA
**Researched:** 2026-06-02
**Mode:** Milestone supplement — existing stack is fixed; this covers NEW additions only.

---

## Scope

Four feature areas require stack changes. The existing stack (React 18 + Vite 5 + TypeScript + shadcn/ui + Hono + Prisma 7 + PostgreSQL 16 + react-i18next v26) is validated and not re-researched.

---

## Feature 1: Active Deck Rotation (`isActive` on Deck)

### Prisma Schema Change

Add `isActive Boolean @default(true)` to the `Deck` model.

**No new libraries needed.** This is a pure Prisma migration.

**Migration pattern — safe for existing rows:**

Because `isActive` has a `@default(true)`, Prisma's `migrate dev` will generate:

```sql
ALTER TABLE "Deck" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
```

PostgreSQL fills all existing rows with `true` atomically. No backfill script needed. No `--create-only` customization required. This is the standard, safe path for boolean-with-default columns on Prisma + PostgreSQL.

**Confidence:** HIGH — this is Prisma's standard behavior for `@default` on non-nullable columns with existing data.

**One-liner schema addition:**
```prisma
model Deck {
  // ... existing fields ...
  isActive    Boolean     @default(true)   // NEW
}
```

No Zod schema drift: add `isActive: z.boolean().default(true)` to the shared Deck schema in `packages/shared/src/schemas/`.

---

## Feature 2: SM-2 Preset Modes (User Settings, Server-Side)

### Schema: New `UserSettings` Model vs JSON Column

**Recommendation: Dedicated `UserSettings` table with typed columns.**

Rationale: SM-2 presets are a small, schema-stable set of fields (one enum for study mode, possibly one integer for session size default). A typed table gives:
- Type-safe Prisma queries — no manual JSON parsing
- Zod schemas in `packages/shared` map cleanly to typed fields
- Easy to extend with future settings without JSON shape gymnastics
- Avoids `Json` type in Prisma which loses type safety without workarounds

The JSON column approach (storing `{ studyMode: "NORMAL" }` in a `settings Json` field on `User`) saves one migration but requires runtime parsing and manual validation. For 3–4 well-known fields, it is the wrong tradeoff.

**No new libraries needed.** Prisma handles this natively.

**Proposed schema addition:**

```prisma
enum StudyMode {
  NORMAL
  INTENSIVE
  EXAM_PREP
}

model UserSettings {
  id          String    @id @default(cuid())
  userId      String    @unique
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  studyMode   StudyMode @default(NORMAL)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

Add the back-relation to `User`:
```prisma
model User {
  // ... existing ...
  settings    UserSettings?
}
```

**Migration safety:** New table + new enum. Existing users get no `UserSettings` row initially — the backend UPSERT pattern on first access (`prisma.userSettings.upsert(...)`) handles row creation transparently on the first settings read or write. No migration risk.

**Confidence:** HIGH — standard Prisma pattern; the UPSERT-on-first-access pattern is idiomatic for optional user preferences.

---

## Feature 3: PWA Shell (vite-plugin-pwa)

### Library

| Library | Version | Why |
|---------|---------|-----|
| `vite-plugin-pwa` | `^1.3.0` | Latest stable; peer dep supports Vite `^3.1 \|\| ^4 \|\| ^5 \|\| ^6 \|\| ^7 \|\| ^8` — Vite 5 (currently `5.4.19`) is fully covered |

Workbox is bundled as a dependency of `vite-plugin-pwa` (`workbox-build ^7.4.1` and `workbox-window ^7.4.1`). No separate workbox package needed.

**Confidence:** HIGH — verified via `npm info vite-plugin-pwa` (version 1.3.0, peer dep string verified).

### Installation

```bash
yarn workspace @kartex/frontend add -D vite-plugin-pwa
```

### Service Worker Strategy: `generateSW` (recommended for this scope)

Use `strategy: 'generateSW'` (the default). It auto-generates a service worker that precaches all static build outputs (HTML, JS, CSS, WASM chunks, icons). No custom service worker file to maintain.

`injectManifest` (custom SW) is only needed when you require custom route interception or background sync — both are out of scope for v1.2.

### Vite Config Integration

The existing `vite.config.ts` has `COEP: require-corp` headers in the `server` block (needed for Typst WASM + SharedArrayBuffer). This is a **critical integration concern** — see PITFALL below.

Minimal config addition to `vite.config.ts`:

```typescript
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
        // Exclude API routes from SW interception
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: 'Kartex',
        short_name: 'Kartex',
        description: 'Self-hosted spaced repetition flashcard app',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  // ... rest of config unchanged
})
```

### COEP / Service Worker Interaction — Critical Pitfall

The dev server sets `Cross-Origin-Embedder-Policy: require-corp` for Typst WASM. This header also applies to the service worker scope. Under `COEP: require-corp`, cached opaque (cross-origin no-CORS) responses cannot be served by the service worker back to the page — the browser blocks them.

**Impact for Kartex v1.2:** All resources being cached by the SW are same-origin (JS/CSS/HTML/WASM from the same Hono server). There are no third-party CDN imports. The Typst WASM files are bundled by Vite, not fetched cross-origin at runtime. KaTeX CSS is also bundled. **This means COEP does not conflict with the service worker for same-origin-only static assets.**

The COEP header is only set in `server.headers` (dev mode proxy); the production build is served by Hono's `serveStatic` which sets its own response headers. Confirm that Hono adds COEP headers in production too (required for Typst WASM threading) — if it does, same analysis applies: all SW-cached assets are same-origin, no conflict.

**Action:** Add `wasm` to `globPatterns` so Typst's `.wasm` chunks are precached. Explicitly exclude `/api/*` from SW navigation fallback.

**Confidence:** MEDIUM — COEP + SW interaction analysis based on spec and web research; same-origin assertion based on examining the current stack (no CDN imports). Verify with Lighthouse after first integration that SW registers cleanly.

### Required PWA Assets

These must be added to `apps/frontend/public/`:

| File | Size | Notes |
|------|------|-------|
| `pwa-192x192.png` | 192×192 px | Android home screen icon |
| `pwa-512x512.png` | 512×512 px | Splash screen / maskable |
| `apple-touch-icon.png` | 180×180 px | iOS Safari |
| `favicon.ico` | 32×32 px | Already exists (verify) |

The 512×512 image serves double duty as `purpose: 'any maskable'` — acceptable if the icon has safe-zone padding. For a clean maskable icon, a separate `pwa-maskable-512x512.png` is optional but not required for installability.

`theme-color` meta tag must also be added to `apps/frontend/index.html`:
```html
<meta name="theme-color" content="#ffffff" />
```

### `@vite-pwa/assets-generator` (optional)

If icon generation from an SVG source is desired:

```bash
npx @vite-pwa/assets-generator --preset minimal public/logo.svg
```

This is a one-time CLI tool, not a build dependency. Use if a source SVG exists; otherwise create PNGs manually.

---

## Feature 4: Docs (README, design.md, kartex-format.md)

**No stack additions.** Documentation is written in Markdown. No new tooling needed. Existing `docs/` structure is sufficient.

---

## Summary of New Dependencies

| Package | Workspace | Type | Version | Purpose |
|---------|-----------|------|---------|---------|
| `vite-plugin-pwa` | `@kartex/frontend` | devDependency | `^1.3.0` | PWA manifest + SW generation |

Everything else (Deck `isActive`, `UserSettings` model, SM-2 preset enum, docs) requires **zero new npm packages** — only Prisma schema changes, Zod schema additions in `packages/shared`, and backend route updates using existing libraries.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| PWA plugin | `vite-plugin-pwa` | Manual manifest + custom SW | vite-plugin-pwa auto-generates precache manifest from Vite build output; manual is error-prone with hashed filenames |
| SW strategy | `generateSW` | `injectManifest` | injectManifest requires a custom SW file; no custom SW logic needed for static-only caching in v1.2 |
| User settings storage | Typed `UserSettings` table | `Json` column on `User` | JSON loses Prisma type safety; typed table maps cleanly to Zod schemas in `packages/shared` |
| Settings row creation | UPSERT on first access | Migration-time backfill | UPSERT is simpler; no need for a backfill script since settings are optional until first access |

---

## Sources

- `npm info vite-plugin-pwa` — version 1.3.0, peer deps confirmed (HIGH confidence)
- [vite-plugin-pwa GitHub](https://github.com/vite-pwa/vite-plugin-pwa) — strategy docs
- [PWA Minimal Requirements — Vite PWA](https://vite-pwa-org.netlify.app/guide/pwa-minimal-requirements.html) — icon sizes, manifest fields
- [Prisma Customizing Migrations](https://www.prisma.io/docs/orm/prisma-migrate/workflows/customizing-migrations) — migration patterns
- [Prisma Working with JSON Fields](https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields) — JSON vs typed table tradeoffs
- [MDN COEP Header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy) — COEP + service worker behavior
