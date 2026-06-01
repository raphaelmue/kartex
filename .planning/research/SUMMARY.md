# Project Research Summary

**Project:** Kartex v1.2 — Study Control & PWA
**Domain:** Self-hosted spaced-repetition flashcard web app (milestone supplement)
**Researched:** 2026-06-02
**Confidence:** HIGH

## Executive Summary

Kartex v1.2 adds four well-scoped features to an already-validated stack: active deck rotation (`isActive` on `Deck`), SM-2 preset modes (`studyMode` on `User`), a PWA installable shell via `vite-plugin-pwa`, and documentation updates. None of these features require architectural changes to the existing Hono + Prisma + React SPA setup. The work is purely additive: two schema columns, one new Prisma enum, one new npm dev-dependency, two new backend routes, three modified backend routes, and a handful of frontend pages brought from placeholder to functional.

The recommended implementation approach follows a strict dependency chain: schema first, shared Zod types second, backend routes and frontend UI in parallel after that. The PWA assets and manifest configuration are independent of schema work and can proceed in parallel. All three feature streams (deck rotation, SM-2 modes, PWA) can be planned as separate phases precisely because their only shared prerequisite is the Prisma migration step, which can be handled in a single combined migration.

The dominant risk in v1.2 is the PWA integration with the existing Typst WASM assets. The Typst web compiler WASM file is 28 MB — well above vite-plugin-pwa's 2 MB precache limit — and will cause a fatal build error if incorrectly included in the Workbox glob patterns. Additionally, the COEP/COOP headers required for Typst's SharedArrayBuffer are currently only set in the Vite dev server config and are absent from the production Hono server, which is pre-existing technical debt that the PWA phase must resolve.

## Key Findings

### Recommended Stack

The existing stack requires exactly one new npm package: `vite-plugin-pwa@^1.3.0` (devDependency in `@kartex/frontend`). Workbox is bundled as a peer dependency of vite-plugin-pwa — no separate workbox package is needed. All other v1.2 features (deck `isActive`, user `studyMode`, settings API, deck picker UI, Settings page) are implemented using the existing stack: Prisma schema changes, Zod schema additions in `packages/shared`, Hono route handlers, and React components using existing shadcn/ui primitives.

**New dependency:**
- `vite-plugin-pwa@^1.3.0`: PWA manifest + service worker generation — verified against Vite 5 peer dep range, ships with Workbox 7.x bundled

**Schema additions (no new libraries):**
- `Deck.isActive Boolean @default(true)`: active deck rotation — safe, zero-downtime migration
- `User.studyMode StudyMode @default(NORMAL)`: SM-2 preset — adds alongside existing `role`/`isActive` pattern
- `StudyMode` enum (NORMAL / INTENSIVE / EXAM_PREP): typed enum avoids raw string comparisons

**Architecture decision — studyMode storage:** Add directly to the `User` model rather than a separate `UserSettings` table. There is only one preference in v1.2 scope; a dedicated table is premature abstraction. The `/api/auth/me` endpoint already returns `UserSchema`, so the settings page reads `user.studyMode` from `AuthContext` without an extra round-trip.

### Expected Features

**Must have (table stakes):**
- `isActive` toggle per deck, persisted server-side — core purpose of active rotation
- Inactive decks excluded from `GET /api/study/due` — without this the toggle is purely cosmetic
- Active/inactive state visible on deck list and deck detail pages — user needs feedback
- Dashboard due-count reflects active-only decks — consistency with study queue
- SM-2 mode picker in Settings (Normal / Intensive / Exam Prep) — first real content for the `/settings` placeholder
- Mode applies server-side in `POST /api/study/rate` — mode must be enforced on the backend; client-only state would be silently ignored
- PWA manifest with required fields + 192x192 and 512x512 PNG icons — Chrome will not offer installation without these
- Service worker precaching static shell (JS, CSS, HTML) — instant second-visit loads
- SW update prompt (not auto-update) — `registerType: 'prompt'` prevents mid-session page reloads
- README.md at repo root — any shared or public repo without this looks abandoned

**Should have (differentiators):**
- Deck picker pre-step on `/study` — lets users combine cards from specific decks per session without permanently toggling `isActive`
- Visual mode indicator in study session header when non-Normal mode is active
- In-app "Install App" button in AppShell (captures `beforeinstallprompt`) — browser native prompt is easy to miss
- `docs/design.md` updated to match current Hono-serves-SPA reality (Nginx was removed; pnpm references are wrong)
- `docs/kartex-format.md` updated to cover `#typst`, audio, and the `.kartex.zip` bundle format

**Defer to v2+:**
- Offline card study (service worker caching API responses) — no offline card data in v1.2
- Push notifications — no backend infrastructure exists
- Per-deck SM-2 modes — increases cognitive load; global mode is sufficient
- Inactive deck count on dashboard ("3 decks paused") — nice-to-have, low priority
- Custom SM-2 multiplier input — 3 presets cover the practical range; YAGNI
- Full OpenAPI reference docs — Zod schemas + route comments are sufficient

### Architecture Approach

All four features integrate into the existing layered architecture (React SPA -> Hono -> Prisma -> PostgreSQL) without structural changes. The build pipeline (Vite -> `apps/backend/public/`) means vite-plugin-pwa's emitted `sw.js`, `workbox-*.js`, and `manifest.webmanifest` land in the correct location for Hono's `serveStatic` wildcard to serve them automatically — no Dockerfile changes, no new Hono routes for file serving. The one exception is that two Hono middleware additions are needed: `Cache-Control: no-store` for `/sw.js` specifically, and COEP/COOP response headers for all routes (to fix pre-existing production omission).

**Modified components:**

1. `schema.prisma` (Deck + User models + StudyMode enum) — single combined migration, both columns have defaults, zero-downtime
2. `packages/shared/schemas/deck.ts` and `schemas/user.ts` — add `isActive`, `StudyModeEnum`, `studyMode`, `UpdateStudyModeSchema`; shared types are the contract between backend and frontend
3. `apps/backend/src/routes/study.ts` — add `isActive: true` to `deckFilter` (propagates to both `dueWithProgress` and `neverSeen` queries); apply `studyMode` multiplier after `calculateSM2` call in `POST /rate` (multiplier is a post-processing step, not a param to the pure function)
4. `apps/backend/src/routes/dashboard.ts` — add `isActive: true` to its independent deck filter (this route does NOT reuse the `deckFilter` from study.ts — both must be updated)
5. `apps/backend/src/index.ts` — register new preferences route; add COEP/COOP middleware; add `Cache-Control: no-store` for `/sw.js`
6. New route: `PATCH /api/users/me/preferences` — persists `{ studyMode }` to `User`
7. `apps/frontend/vite.config.ts` — add `VitePWA(...)` plugin with WASM-aware workbox config
8. `apps/frontend/src/pages/SettingsPage.tsx` — replace `<ComingSoon>` with study mode radio group
9. `apps/frontend/src/pages/StudySessionPage.tsx` — add deck-picker pre-step to global SR path

### Critical Pitfalls

1. **Typst WASM breaks the PWA build** — `typst_ts_web_compiler_bg-*.wasm` is 28 MB, exceeding vite-plugin-pwa's 2 MB precache limit (fatal build error since v0.20.2). Never add `*.wasm` to `workbox.globPatterns`. Use `globIgnores` to exclude the compiler WASM explicitly; use a `runtimeCaching` `CacheFirst` rule for WASM assets instead.

2. **Stale `sw.js` after redeployment** — Hono's `serveStatic` wildcard does not set `Cache-Control: no-store` on responses. Without it, browsers may cache `sw.js` and never detect the updated service worker after a new Docker deploy. Add an explicit Hono route for `/sw.js` that sets `Cache-Control: no-store` before the catch-all `serveStatic`.

3. **COEP/COOP headers absent from production Hono** — Vite's `server.headers` config is dev-only. The production Hono server does not send `Cross-Origin-Embedder-Policy: require-corp` or `Cross-Origin-Opener-Policy: same-origin`, which Typst WASM needs for `SharedArrayBuffer`. Add a global Hono middleware for these headers. This is pre-existing technical debt; the PWA phase resolves it.

4. **`Deck.isActive` migration must include `@default(true)`** — Prisma only adds a SQL `DEFAULT` clause if `@default()` is in the schema. Without it, `prisma migrate deploy` will fail on any populated database because PostgreSQL rejects a `NOT NULL` column with no default when rows already exist. Verify the generated SQL contains `DEFAULT true` before merging.

5. **SM-2 multiplier must only affect `nextReview`, not the stored `interval`** — The interval multiplier for Intensive/Exam Prep modes must be applied after `calculateSM2` returns, as a post-processing step on the `nextReview` date calculation. The `interval` field stored in `CardProgress` must always be the raw SM-2 output. Applying the multiplier to the stored interval permanently shrinks the card's base, corrupting future scheduling.

## Implications for Roadmap

Based on research, the strict dependency chain (schema -> shared types -> backend + frontend) naturally maps to three implementation phases, with docs as a standalone final phase.

### Phase 1: Schema Foundation + Active Deck Rotation

**Rationale:** The Prisma schema changes for `isActive` and `studyMode` must come first because both backend routes and frontend UI import from `packages/shared`, which in turn reflects the schema. Bundling both schema changes into a single migration avoids a second deploy cycle. Active deck rotation is the simpler of the two DB-backed features and makes a good first integration test of the schema-first pattern.

**Delivers:** Working `isActive` toggle on decks; inactive decks excluded from study queue and dashboard; deck picker pre-step on `/study`; single Prisma migration covering both schema additions.

**Addresses:** Active deck rotation (all table stakes), deck picker, dashboard consistency.

**Avoids:** Pitfall 4 (missing `@default(true)`) — verify generated SQL before merging; Pitfall 6 (missing filter in one of the two query sites in `study.ts`); Pitfall 7 (session-picker state must not write to `isActive`); Pitfall 13 (document that single-deck `/learn` sessions intentionally bypass `isActive`).

### Phase 2: SM-2 Preset Modes + Settings Page

**Rationale:** The `User.studyMode` field is added in the Phase 1 migration, so Phase 2 is purely backend route + frontend UI work. The `StudyModeEnum` and related Zod schemas (added to `packages/shared` in Phase 1) are the only prerequisite. This phase is independent of PWA work and can proceed in parallel with Phase 3 if desired, but sequencing it before PWA keeps the surface area focused.

**Delivers:** Working `/settings` page (replaces `<ComingSoon>`); `PATCH /api/users/me/preferences` endpoint; interval multiplier applied in `POST /api/study/rate`; `studyMode` exposed via `/api/auth/me` and available in `AuthContext`.

**Addresses:** SM-2 preset modes (all table stakes), visual mode indicator in session header.

**Avoids:** Pitfall 5 (multiplier corrupting stored interval — apply post-calculateSM2, not as a param); Pitfall 10 (studyMode must be server-side; rate endpoint looks up mode from DB, never accepts it from client).

### Phase 3: PWA Shell

**Rationale:** PWA work is independent of the schema changes and can technically be done in any order, but placing it last means the full app (including deck rotation and SM-2 modes) is already working when the service worker is configured — making Lighthouse testing and install flow verification more meaningful. The COEP/COOP header fix is a prerequisite for both correct Typst rendering in production and correct PWA behavior; this phase resolves that pre-existing technical debt.

**Delivers:** Installable PWA with `manifest.webmanifest`; precached static shell (JS/CSS/HTML); SW update prompt; in-app install button; COEP/COOP headers added to Hono production server; `Cache-Control: no-store` on `sw.js`.

**Addresses:** PWA installable shell (all table stakes), in-app install button, COEP/COOP production fix.

**Avoids:** Pitfall 1 (28 MB WASM kills precache build — exclude from globPatterns, use runtimeCaching CacheFirst for WASM); Pitfall 2 (stale sw.js — add explicit Hono route with no-store header); Pitfall 3 (COEP/COOP missing in production — add Hono global middleware); Pitfall 8 (iOS cookie isolation — document, no code workaround); Pitfall 9 (beforeinstallprompt single-use — null-out after prompt()); Pitfall 11 (manifest start_url at `/` — correct by default for root deployment); Pitfall 12 (navigateFallback required for SPA routing — set to `/index.html` with API denylist).

### Phase 4: Documentation

**Rationale:** Docs require no code changes and have no dependencies on the other three phases. Placing them last means design.md can reflect the final v1.2 state accurately, including the PWA installability and the Settings page that now has real content.

**Delivers:** README.md at repo root; `docs/design.md` updated to current Hono-serves-SPA architecture (Nginx removed, yarn 4, i18n, mobile shell, tag filter); `docs/kartex-format.md` updated with `#typst`, audio, and `.kartex.zip` bundle.

**Addresses:** Documentation (all table stakes).

### Phase Ordering Rationale

- Schema first because both backend and frontend depend on `packages/shared` Zod types, which reflect the schema; no parallel work is possible until this contract is established.
- Active deck rotation precedes SM-2 modes because both share the same migration and rotation is the simpler feature — good for validating the schema-first workflow before tackling the study rate logic.
- PWA last because it is the most complex integration (WASM size pitfall, Hono header changes, Workbox config) and benefits from a fully working app to test against.
- Docs last because they should describe the finished v1.2 state.

### Research Flags

Phases with well-documented patterns (standard implementation, skip additional research-phase):
- **Phase 1 (Schema + Active Deck Rotation):** Prisma additive migration with `@default` is standard; `deckFilter` update is mechanical; deck picker is a React state pattern.
- **Phase 2 (SM-2 Preset Modes):** Interval multiplier post-processing is straightforward; Settings page uses existing shadcn/ui radio group pattern.
- **Phase 4 (Documentation):** No implementation research needed.

Phase that warrants review of this research before coding:
- **Phase 3 (PWA Shell):** Three interacting pitfalls (WASM size, sw.js caching, COEP/COOP headers) require careful config. Reference PITFALLS.md Pitfalls 1-3 and STACK.md COEP analysis before writing `vite.config.ts` changes.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | `vite-plugin-pwa@1.3.0` verified via `npm info`; Vite 5 peer dep confirmed; Workbox bundled — no surprises. Schema additions use established Prisma patterns with no new libraries. |
| Features | HIGH | Feature scope derived from direct codebase inspection and Anki/SM-2 literature; all table stakes grounded in referenced behavior from production SRS apps. |
| Architecture | HIGH | All architectural claims verified against actual source files (`index.ts`, `study.ts`, `dashboard.ts`, `vite.config.ts`, `AuthContext.tsx`). Build output path confirmed via `vite.config.ts -> build.outDir`. |
| Pitfalls | HIGH | Critical pitfalls (WASM size, sw.js cache, COEP/COOP) verified against official vite-plugin-pwa docs, Prisma migration docs, and MDN. COEP + service worker interaction rated MEDIUM within Pitfall 1 (spec-based, not empirically tested in this stack). |

**Overall confidence:** HIGH

### Gaps to Address

- **WASM runtime caching validation:** The `runtimeCaching` CacheFirst rule for WASM files is the correct pattern but should be verified with Lighthouse after first PWA integration — confirm the service worker registers cleanly and the WASM cache is populated on first load.
- **`manifest.webmanifest` MIME type via Hono:** Confirm at implementation time that the `@hono/node-server` adapter maps `.webmanifest` to `application/manifest+json`. Check with `curl -I /manifest.webmanifest`; if wrong, add a one-liner Hono middleware before `serveStatic`.
- **COEP `credentialless` vs `require-corp` for future embeds:** Current strategy is `require-corp`. If v2+ adds YouTube/Vimeo embeds, `require-corp` will block them. Not a v1.2 concern but should be noted in design.md.
- **Deck picker `deckIds` query param shape:** `GET /api/study/due?deckIds=a,b,c` is the suggested API shape. Confirm at implementation time whether comma-separated IDs or repeated params (`deckIds[]=a`) is cleaner with Hono's query parser.

## Sources

### Primary (HIGH confidence)
- `npm info vite-plugin-pwa` — version 1.3.0, Vite 5 peer dep confirmed
- Kartex codebase — `apps/backend/src/index.ts`, `routes/study.ts`, `routes/dashboard.ts`, `apps/frontend/vite.config.ts`, `packages/shared/src/lib/sm2.ts` (all claims directly verified)
- [vite-plugin-pwa GitHub](https://github.com/vite-pwa/vite-plugin-pwa) — strategy docs, generateSW behavior
- [vite-plugin-pwa FAQ](https://vite-pwa-org.netlify.app/guide/faq) — `maximumFileSizeToCacheInBytes` behavior
- [Prisma Customizing Migrations](https://www.prisma.io/docs/orm/prisma-migrate/workflows/customizing-migrations) — `@default` column behavior
- [MDN COEP Header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy) — COEP + service worker interaction

### Secondary (MEDIUM confidence)
- [vite-plugin-pwa PWA Requirements (DeepWiki)](https://deepwiki.com/vite-pwa/vite-plugin-pwa/8.1-pwa-requirements) — MIME type and deployment concerns; cross-referenced with official Nginx deployment guide
- [PWA Icon Requirements 2026](https://logofoundry.app/blog/pwa-icon-requirements-safe-areas) — maskable icon safe zone
- [web.dev COOP/COEP](https://web.dev/articles/coop-coep) — cross-origin isolation requirements
- [SM-2 Algorithm — RemNote](https://help.remnote.com/en/articles/6026144-the-anki-sm-2-spaced-repetition-algorithm) — interval multiplier mechanics
- [Control-Alt-Backspace SM-2 overdue handling](https://controlaltbackspace.org/overdue-handling/) — EF floor rationale

### Tertiary (LOW confidence — no v1.2 decisions depend on these)
- [PWA iOS Limitations](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) — iOS cookie isolation behavior (Pitfall 8; expected behavior, no code workaround needed)
- [Fresh Cards changelog](https://freshcardsapp.com/changelog/) — deck status dot UX pattern (informs visual design for inactive deck display)

---
*Research completed: 2026-06-02*
*Ready for roadmap: yes*
