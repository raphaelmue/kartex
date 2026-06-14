# Phase 20: Logo & PWA Icons - Research

**Researched:** 2026-06-14
**Domain:** SVG logo design, PWA icon generation, React component integration
**Confidence:** MEDIUM

## Summary

Phase 20 replaces the current placeholder logo (purple square with Arial "K" text) with a new "K on learning-card motif" SVG. The new SVG becomes the single source of truth: it appears in the AppShell header sidebar brand area, drives all PWA icon sizes via `@vite-pwa/assets-generator`, and is referenced as the favicon.

The technical path is well-understood and low-risk. The existing Phase 12 infrastructure (VitePWA config, index.html meta tags, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png` + `apple-touch-icon.png` symlink) only needs the source SVG replaced and the generator re-run. The only design decision is the SVG artwork itself: once the new `logo.svg` is in `apps/frontend/public/`, one CLI command regenerates all icons.

The main design constraint is that `logo.svg` must work at both 16px (favicon, high detail collapses) and 512px. Text content must be converted to outlines (no `<text>` elements with `font-family`) to avoid font-rendering failures when rasterized by `sharp`. The maskable icon must keep all critical content within the inner 80% of the image area (circle radius = 40% of width).

**Primary recommendation:** Author the new `logo.svg` as a 512×512 viewBox SVG with filled vector paths only (no `<text>`, no external references). Add a `generate-pwa-assets` script in `apps/frontend/package.json` invoking `pwa-assets-generator --preset minimal-2023 public/logo.svg`. Update AppShell to show an `<img>` tag referencing `/logo.svg` (static, no CSS recoloring needed). No new packages required.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| SVG logo artwork | Static asset (`public/`) | — | Served directly; referenced by both browser and icon generator |
| PWA icon generation | Build-time CLI | — | Runs once at build time; outputs PNGs to `public/` |
| Header logo display | Browser / Client (React) | — | AppShell renders the logo as an `<img>` in sidebar brand area |
| Favicon / browser tab | Browser (HTML `<head>`) | — | `index.html` links already exist; point to generated files |
| PWA manifest icons | vite-plugin-pwa config | — | `vite.config.ts` manifest.icons already wired to correct filenames |

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BRAND-01 | App logo SVG is replaced with a new design featuring a stylised "K" on a learning-card motif, visible in the AppShell header and browser tab favicon | New `logo.svg` → `<img>` in AppShell brand area + `<link rel="icon">` in index.html (already wired to `favicon.svg` / `favicon.ico` via Phase 12) |
| BRAND-02 | PWA icons (192×192, 512×512, apple-touch-icon 180×180) are regenerated from the new logo using the existing `@vite-pwa/assets-generator` pipeline | `pwa-assets-generator --preset minimal-2023 public/logo.svg` regenerates all seven icon files; `vite.config.ts` already references correct filenames |
</phase_requirements>

## Standard Stack

### Core (no new installs required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@vite-pwa/assets-generator` | `^1.0.0` (v1.0.2 current) [VERIFIED: npm registry] | CLI to regenerate PWA icons from SVG source | Already in `yarn.lock` as peer dep of `vite-plugin-pwa`; must be installed explicitly to invoke CLI |
| `vite-plugin-pwa` | `^1.3.0` (v1.3.0 current) [VERIFIED: npm registry] | PWA manifest + service worker; already installed | Phase 12 output; no change needed |

**Note:** `@vite-pwa/assets-generator` is in `yarn.lock` as an optional peer dependency of `vite-plugin-pwa` but is NOT listed in any `package.json` `devDependencies`. It must be added explicitly to `apps/frontend/package.json` (or root) to be invocable via `yarn run pwa-assets-generator`.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `<img src="/logo.svg">` in AppShell | inline SVG or `vite-plugin-svgr` + `import Logo from './logo.svg?react'` | SVGR enables CSS `currentColor` theming but adds a plugin and import syntax; the logo is a static brand mark that does not need runtime CSS recoloring — `<img>` is simpler and sufficient |
| Manual icon resize (Figma/Inkscape export) | `@vite-pwa/assets-generator` CLI | Generator is already wired; manual resize is error-prone and produces inconsistent results |

**Installation (if not already runnable):**
```bash
yarn workspace @kartex/frontend add -D @vite-pwa/assets-generator
```

**Version verification:** `npm view @vite-pwa/assets-generator version` → `1.0.2` (checked 2026-06-14). [VERIFIED: npm registry]

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@vite-pwa/assets-generator` | npm | ~2.5 yrs (Oct 2025 latest) | 182,322/wk | github.com/vite-pwa/assets-generator | OK | Approved |
| `vite-plugin-pwa` | npm | Established | 3,335,934/wk | github.com/vite-pwa/vite-plugin-pwa | OK | Approved (already installed) |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
New logo.svg (public/logo.svg)
        │
        ├──[pwa-assets-generator CLI]──► favicon.ico, favicon.svg, pwa-64x64.png
        │                                pwa-192x192.png, pwa-512x512.png
        │                                maskable-icon-512x512.png
        │                                apple-touch-icon-180x180.png
        │
        ├──[index.html <link>]──────────► Browser tab favicon
        │
        ├──[AppShell <img src>]─────────► Sidebar brand area (desktop + mobile drawer)
        │
        └──[vite.config.ts manifest]───► PWA install prompt icons (already wired)
```

### Recommended Project Structure

No new directories. All changes in:
```
apps/frontend/
├── public/
│   ├── logo.svg                     ← REPLACE with new design
│   ├── favicon.ico                  ← regenerated by CLI
│   ├── favicon.svg                  ← regenerated by CLI
│   ├── pwa-64x64.png               ← regenerated by CLI
│   ├── pwa-192x192.png             ← regenerated by CLI
│   ├── pwa-512x512.png             ← regenerated by CLI
│   ├── maskable-icon-512x512.png   ← regenerated by CLI
│   ├── apple-touch-icon-180x180.png ← regenerated by CLI
│   └── apple-touch-icon.png        ← still needs manual copy (see Pitfall 2)
├── src/components/AppShell.tsx      ← add <img> logo to brand areas
└── package.json                     ← add generate-pwa-assets script
```

### Pattern 1: SVG Logo as `<img>` in AppShell

**What:** Reference `logo.svg` from `public/` as a static `<img>` tag in AppShell's sidebar brand area.

**When to use:** When the logo is a static brand mark that does not need CSS recoloring or dynamic prop changes. The simplest and most performant approach.

**Example:**
```tsx
// Source: [ASSUMED] — standard React img pattern
// In AppShell.tsx, brand area div (both desktop sidebar and mobile drawer):
<div className="h-16 flex items-center gap-2 px-4">
  <img
    src="/logo.svg"
    alt="Kartex"
    className="h-8 w-8"
    aria-hidden="true"
  />
  <span className="text-xl font-bold">Kartex</span>
</div>
```

**Note:** Two brand area `div`s exist in AppShell (desktop sidebar + mobile drawer) — both must be updated identically. [ASSUMED]

### Pattern 2: SVG Logo Design — "K on Learning Card" Motif

**What:** A 512×512 viewBox SVG depicting a stylised flashcard rectangle (portrait orientation, rounded corners) with a bold "K" as the focal element. All text as outlined paths.

**Design constraints derived from research:**

1. **No `<text>` elements** — `sharp` rasterizes SVG via librsvg; system fonts may not match design intent. Convert "K" and any text to `<path>` outlines. [ASSUMED based on sharp/librsvg behavior]
2. **512×512 viewBox** — existing `logo.svg` uses `viewBox="0 0 512 512"`. Keep this so the generator doesn't need re-configuration.
3. **Filled shapes over strokes** — at 16px (favicon), strokes of 2–4px in a 512 viewBox become sub-pixel and disappear. Use filled rectangles/paths for the card border and letter.
4. **Maskable safe zone** — keep the card motif within the inner ~410×410px of the 512×512 canvas (80% circle safe zone). Background can extend to edges.
5. **Opaque background for maskable** — the `minimal-2023` preset generates `maskable-icon-512x512.png` with a white background. If the logo SVG has a transparent background, the generator will place white behind it. This means the brand color (#4f46e5) should appear in the card/letter elements themselves, not solely as a background fill.

**Suggested design directions (from todo):**
- Option A: Card rectangle (indigo fill) with bold white "K" path on face — simple, scales perfectly
- Option B: White card with indigo "K" path + indigo card border — works with white maskable bg
- Option C: Slightly tilted card stack with "K" on the top card — more character, but verify legibility at 16px before committing

**Recommended approach (Option B):** White or near-white card rectangle with rounded corners, indigo (#4f46e5) "K" path, indigo card border — works naturally with the white maskable background and apple-touch-icon background applied by the generator. [ASSUMED — design judgment]

**Minimal viable SVG structure:**
```svg
<!-- Source: [ASSUMED] — recommended structure based on research -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- Full-bleed background (for favicon.ico, pwa-*.png transparent variants: alpha bg) -->
  <!-- For maskable: generator adds white bg automatically -->

  <!-- Card shape: portrait rectangle, rounded corners -->
  <rect x="96" y="56" width="320" height="400" rx="32" ry="32"
        fill="#ffffff" stroke="#4f46e5" stroke-width="24"/>

  <!-- "K" lettermark as outlined path — no <text> element -->
  <!-- Path data for K: left vertical bar + two diagonals -->
  <!-- Fits within ~160x240px centered in card (well inside 80% safe zone) -->
  <path d="..." fill="#4f46e5"/>
</svg>
```

### Pattern 3: `@vite-pwa/assets-generator` CLI Usage

**What:** One CLI command reads `logo.svg` and writes all 7 icon files to `public/`.

**When to use:** After any change to `logo.svg`, or during the initial icon setup for this phase.

**Example:**
```bash
# Source: [CITED: https://vite-pwa-org.netlify.app/assets-generator/cli]
# Run from apps/frontend/ directory
npx @vite-pwa/assets-generator --preset minimal-2023 public/logo.svg

# Or via package.json script (recommended):
# "generate-pwa-assets": "pwa-assets-generator --preset minimal-2023 public/logo.svg"
yarn workspace @kartex/frontend generate-pwa-assets
```

**What the minimal-2023 preset outputs:** [CITED: vite-pwa-org.netlify.app/assets-generator]
- `public/favicon.ico` — 48×48, ICO format
- `public/favicon.svg` — SVG copy
- `public/pwa-64x64.png` — transparent
- `public/pwa-192x192.png` — transparent
- `public/pwa-512x512.png` — transparent, purpose: `any`
- `public/maskable-icon-512x512.png` — white background, purpose: `maskable`
- `public/apple-touch-icon-180x180.png` — white background

### Anti-Patterns to Avoid

- **Using `<text>` with `font-family` in logo.svg:** `sharp`/librsvg will attempt to load the font at rasterization time. If the font is unavailable in the build environment (Docker container, CI), the rasterized icon will use a fallback font that looks wrong. Always convert text to `<path>` outlines.
- **Strokes that look good at 512px but disappear at 16px:** A 10px stroke on a 512-grid element is ~0.3px at 16px rendering. Use strokes ≥ 24px on a 512-grid, or switch to filled shapes.
- **Relying on CSS classes or external stylesheets in the SVG:** `sharp` renders SVG in a sandboxed environment with no access to external CSS. All styles must be inline (`fill=`, `stroke=` attributes).
- **Forgetting to copy `apple-touch-icon-180x180.png` → `apple-touch-icon.png`:** Phase 12 documented this pitfall (decision `12-01`): the `minimal-2023` preset outputs `apple-touch-icon-180x180.png` but `index.html` links to `apple-touch-icon.png`. The generator does NOT create `apple-touch-icon.png`. The copy step must be preserved/repeated after re-running the generator.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Resizing SVG to multiple PNG sizes | Custom canvas/script | `@vite-pwa/assets-generator` | Handles maskable bg, apple-touch bg, ICO multi-frame; already configured |
| Generating favicon.ico multi-size frames | Manual imagemagick / online tool | `@vite-pwa/assets-generator` | Preset includes 48px ICO; consistent with existing pipeline |
| Making "K" path from scratch | Freehand path coordinates | Inkscape/Figma → "Object to Path" → copy `d` attribute | Bezier "K" by hand is error-prone; any vector editor can export to path |

**Key insight:** This phase is design-first, not code-first. The SVG artwork decision drives everything. Once `logo.svg` is replaced, the code changes are mechanical (one `<img>` tag in AppShell, one CLI run, one file copy).

## Common Pitfalls

### Pitfall 1: `<text>` Elements Rendered with Wrong Font

**What goes wrong:** The "K" in the SVG is authored as `<text font-family="Arial">K</text>`. When `sharp` rasterizes this in a headless environment (Docker, CI), Arial may not be installed — the generator produces icons with a different-looking character.

**Why it happens:** `sharp` uses `librsvg` for SVG rendering. `librsvg` uses system fonts; the build environment may not have the same fonts as the developer's machine.

**How to avoid:** Convert the "K" (and any other text) to `<path>` outlines in your vector editor before saving `logo.svg`. In Inkscape: select text → Path → Object to Path. In Figma: select text layer → right-click → Flatten.

**Warning signs:** Generated PNGs have a different "K" letterform than the source SVG when previewed in a browser.

### Pitfall 2: `apple-touch-icon.png` Not Updated (Phase 12 carry-forward)

**What goes wrong:** After running `pwa-assets-generator`, `apple-touch-icon-180x180.png` is updated but `apple-touch-icon.png` still shows the old design. iOS home screen continues to display the old icon.

**Why it happens:** The `minimal-2023` preset only generates `apple-touch-icon-180x180.png`. `index.html` links to `apple-touch-icon.png` (without the size suffix). This copy was made manually in Phase 12 and is not automated.

**How to avoid:** After running the generator, explicitly copy: `cp public/apple-touch-icon-180x180.png public/apple-touch-icon.png` (or use a Node.js `fs.copyFile` in the generate script).

**Warning signs:** `public/apple-touch-icon.png` has an older timestamp than `public/apple-touch-icon-180x180.png` after a generator run.

### Pitfall 3: Maskable Icon Content Outside Safe Zone

**What goes wrong:** The card or "K" design extends to the edges of the SVG canvas. When the maskable icon is applied as a circular or squircle mask (Android), the card corners are clipped off.

**Why it happens:** Maskable icons require all critical content within the inner 80% circle (radius = 40% of width). [CITED: web.dev/articles/maskable-icon]

**How to avoid:** On a 512×512 canvas, keep all card content within ~410×410px centered (padding of ~51px on each side). The outer zone should be filled background color only.

**Warning signs:** Chrome DevTools → Application → Manifest → "Show only the minimum safe area for maskable icons" reveals clipped content.

### Pitfall 4: Logo Not Visible in Both AppShell Brand Areas

**What goes wrong:** AppShell has two brand `div`s — the desktop sidebar and the mobile drawer panel. If only the desktop sidebar is updated, mobile users see the old text-only brand.

**Why it happens:** The component has two near-identical markup blocks for desktop and mobile.

**How to avoid:** Update both `<div className="h-16 flex items-center px-4">` brand areas. Consider extracting a `BrandLogo` sub-component to avoid this class of bug.

**Warning signs:** Desktop header shows logo, but hamburger drawer still shows only "Kartex" text.

### Pitfall 5: Favicon Caching

**What goes wrong:** After updating `favicon.ico` and `favicon.svg`, the browser continues to show the old favicon for hours or days.

**Why it happens:** Favicons are aggressively cached by browsers. The cached version ignores HTTP headers in some cases.

**How to avoid:** For local verification, open a new private/incognito browser window or manually clear the favicon cache (address bar → favicon → "Clear"). For production, a cache-busting query string can be added to the `<link>` tag if needed, though this is typically unnecessary for a self-hosted small-group app.

**Warning signs:** Old favicon shown after deployment; disappears in incognito mode.

## Code Examples

### AppShell Brand Area Update

```tsx
// Source: [ASSUMED] — based on current AppShell.tsx structure
// Replace the existing brand div in BOTH locations (desktop sidebar + mobile drawer):

// BEFORE:
<div className="h-16 flex items-center px-4">
  <span className="text-xl font-bold">Kartex</span>
</div>

// AFTER:
<div className="h-16 flex items-center gap-2 px-4">
  <img
    src="/logo.svg"
    alt=""
    className="h-8 w-8 shrink-0"
    aria-hidden="true"
  />
  <span className="text-xl font-bold">Kartex</span>
</div>
```

### Package.json Script Addition

```json
// Source: [CITED: vite-pwa-org.netlify.app/assets-generator/cli]
// In apps/frontend/package.json scripts:
{
  "scripts": {
    "generate-pwa-assets": "pwa-assets-generator --preset minimal-2023 public/logo.svg"
  }
}
```

### Icon Regeneration + apple-touch-icon Copy

```bash
# Source: [ASSUMED] — derived from Phase 12 decision 12-01 + CLI docs
# Run from apps/frontend/
npx @vite-pwa/assets-generator --preset minimal-2023 public/logo.svg
cp public/apple-touch-icon-180x180.png public/apple-touch-icon.png
```

### Minimal-2023 Preset Config File (optional alternative to CLI)

```typescript
// Source: [CITED: vite-pwa-org.netlify.app/assets-generator/cli]
// pwa-assets.config.ts (at apps/frontend/)
import {
  defineConfig,
  minimal2023Preset as preset
} from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: {
    preset: '2023'
  },
  preset,
  images: ['public/logo.svg']
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual icon export at each size | `@vite-pwa/assets-generator` preset | Phase 12 (this project) | Single command regenerates all 7 icon files |
| Text in SVG (`<text>` element) | Outlined paths for logo marks | Industry standard | Required for reliable cross-environment rasterization |
| Multiple separate favicon PNGs in `<head>` | `favicon.svg` + `favicon.ico` fallback | ~2022+ modern practice | Two files cover all browsers; SVG scales without blur |

**Deprecated/outdated:**
- `<text>` in production logo SVGs: unreliable in headless/CLI rasterization environments. Use outlined paths.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `<text>` elements in SVG cause font-mismatch issues when `sharp` rasterizes in Docker/CI | Pitfall 1, Pattern 2 | If `sharp` bundles or locates fonts reliably, this constraint is relaxed — but outlined paths are still best practice |
| A2 | Both AppShell brand `div`s need updating (desktop sidebar + mobile drawer) | Pattern 1, Pitfall 4 | Low risk — this is visible by inspection of current AppShell.tsx |
| A3 | Option B (white card + indigo K) works well with white maskable background | Pattern 2 | Option A (indigo fill card) also works; final design is visual judgment call |
| A4 | `apple-touch-icon.png` is not generated by `minimal-2023` preset and must be copied manually | Pitfall 2 | Phase 12 decision `12-01` confirms this; verified by checking existing `public/` files |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

_(A4 is confirmed by Phase 12 decision record, not assumed.)_

## Open Questions

1. **Final SVG design selection**
   - What we know: Three design options identified (solid card, white card, tilted stack). Project color is #4f46e5 (indigo-600).
   - What's unclear: Which direction the user/project owner prefers. The todo file says "TBD on color scheme and final execution."
   - Recommendation: Present Option A and Option B as SVG code in the plan; let the user choose or use Option B as default (white card, indigo K and border — best compatibility with white maskable/apple-touch background).

2. **Whether `@vite-pwa/assets-generator` needs explicit devDependency install**
   - What we know: `yarn.lock` shows it as an optional peer dep. No `package.json` lists it as a devDependency.
   - What's unclear: Whether `yarn dlx` / `npx` invocation is sufficient or explicit install is required for the `generate-pwa-assets` script.
   - Recommendation: Add `@vite-pwa/assets-generator` to `apps/frontend/package.json` devDependencies explicitly to ensure reliable script invocation.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | `@vite-pwa/assets-generator` CLI | ✓ | (project already running) | — |
| `@vite-pwa/assets-generator` | BRAND-02 icon regeneration | Needs explicit install | `^1.0.0` in yarn.lock as peer dep | `npx @vite-pwa/assets-generator` (one-shot) |
| Vector editor (Inkscape/Figma) | Converting "K" text to path outlines | User-provided | — | Manual SVG path writing |

**Missing dependencies with no fallback:**
- A vector editor or SVG path authoring tool is needed to produce the "K on card" artwork. This is a human design task, not automatable by the plan.

**Missing dependencies with fallback:**
- `@vite-pwa/assets-generator` CLI: can be invoked via `npx` without a permanent devDependency install; explicit install is preferred for the `generate-pwa-assets` script.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 + jsdom |
| Config file | `apps/frontend/vitest.config.ts` |
| Quick run command | `yarn workspace @kartex/frontend test` |
| Full suite command | `yarn workspace @kartex/frontend test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BRAND-01 | AppShell renders `<img src="/logo.svg">` in brand areas | unit (snapshot or DOM assertion) | `yarn workspace @kartex/frontend test` | ❌ Wave 0 — new test in `AppShell.test.tsx` |
| BRAND-02 | All 7 icon files exist in `public/` after generator run | smoke / file-existence check | Manual or CI shell check | ❌ Not automatable in unit tests — verify by file listing |

**BRAND-02 note:** Icon generation is a build-time CLI task, not a runtime React behavior. The verification step is: run `pwa-assets-generator`, then `ls public/` confirms all 7 files are present. This cannot meaningfully be unit-tested but can be checked in a CI `post-build` step.

### Sampling Rate

- **Per task commit:** `yarn workspace @kartex/frontend test`
- **Per wave merge:** `yarn workspace @kartex/frontend test`
- **Phase gate:** Visual verification in browser (favicon, header logo, PWA install icon)

### Wave 0 Gaps

- [ ] `apps/frontend/src/components/AppShell.test.tsx` — covers BRAND-01 (checks that `<img alt="">` with `/logo.svg` src renders in brand areas)

*(If existing `AppShell.test.tsx` exists, add a single test case rather than creating a new file.)*

## Security Domain

> ASVS V5 Input Validation: not applicable — no user input in this phase.
> This phase involves only static asset replacement and a React component update. No authentication, session, access control, cryptography, or user input boundaries are involved.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | no | — |
| V6 Cryptography | no | — |

**Known Threat Patterns:** None applicable. SVG files served from `public/` are static; no user-supplied SVG processing occurs.

## Project Constraints (from CLAUDE.md)

- Files under 500 lines — AppShell.tsx is currently 287 lines; adding `<img>` tags will not approach the limit
- Prefer editing existing files over creating new ones — logo.svg is edited in place, AppShell.tsx is edited, no new files except regenerated icons
- All secrets via `.env` — not applicable to this phase
- Run `npm test` after code changes — use `yarn workspace @kartex/frontend test`
- Zod schemas in `packages/shared/src/schemas/` — not applicable (no schema changes)
- JWT in httpOnly cookie — not applicable

## Sources

### Primary (MEDIUM confidence)
- [vite-pwa-org.netlify.app/assets-generator/](https://vite-pwa-org.netlify.app/assets-generator/) — preset list, output file names confirmed
- [vite-pwa-org.netlify.app/assets-generator/cli](https://vite-pwa-org.netlify.app/assets-generator/cli) — CLI command syntax, config file format, minimal-2023 preset details
- [web.dev/articles/maskable-icon](https://web.dev/articles/maskable-icon) — safe zone = radius 40% of width (80% safe area)
- `npm view @vite-pwa/assets-generator version` → `1.0.2` (verified 2026-06-14)
- `npm view vite-plugin-pwa version` → `1.3.0` (verified 2026-06-14)

### Secondary (LOW confidence)
- [css-tricks.com maskable icons](https://css-tricks.com/maskable-icons-android-adaptive-icons-for-your-pwa/) — maskable icon background and safe zone context
- WebSearch: SVG favicon.ico pitfalls, multi-size ICO browser support
- WebSearch: React SVG import patterns with Vite (img vs inline vs SVGR)

### Tertiary (LOW confidence)
- WebSearch: SVG icon design for multi-scale (16px → 512px) — stroke width guidance, outline-text recommendation

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM — packages verified on npm registry, CLI docs fetched from official site
- Architecture: HIGH — all changes are extensions of Phase 12 existing infrastructure
- Pitfalls: MEDIUM — Pitfall 2 (apple-touch-icon copy) confirmed by Phase 12 decision record; Pitfall 1 (text-to-path) is industry-standard best practice
- SVG design: LOW — design decisions are judgment calls; three options presented

**Research date:** 2026-06-14
**Valid until:** 2026-07-14 (stable tooling; `@vite-pwa/assets-generator` API unlikely to change)
