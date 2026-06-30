# Phase 26: ABC Notation - Context

**Gathered:** 2026-06-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire `abcjs` into KartexRenderer so `#abc` fenced blocks in card content render as inline SVG sheet music, with an error fallback for invalid notation and responsive scaling to card width.

**In scope:**
- `AbcBlock` component — useRef + useEffect, lazy `import('abcjs')`, loading spinner, error fallback via `RenderErrorBlock`
- `preprocessAbcBlocks()` — mirrors `preprocessTypstBlocks()`; converts `#abc\n...` (block ends at blank line) to ` ```abc\n...\n``` `
- `kartexComponents.code` handler extension — detect `language-abc`, route to `AbcBlock`
- Responsive SVG via `responsive: 'resize'` abcjs option + CSS `w-full` on container
- Dark mode: `dark:invert` CSS filter on the container div
- Add `abcjs` package to `apps/frontend`

**Out of scope:**
- ABC audio playback (WebAudio synthesis) — deferred to v2, noted in REQUIREMENTS.md
- Inline ABC editor in study mode — deferred per REQUIREMENTS.md
- Backend changes — rendering is entirely frontend

</domain>

<decisions>
## Implementation Decisions

### Block Syntax (D-01)
- **D-01:** `#abc` prefix block — same preprocessor pattern as `#typst`. `preprocessAbcBlocks()` converts `#abc\n<notation lines>` (block ends at first blank line or end of content) to ` ```abc\n<notation lines>\n``` `. The `code` handler in `kartexComponents` detects `className.includes('language-abc')` and returns `<AbcBlock source={source} />`.

### Responsive Scaling (D-02)
- **D-02:** Pass `responsive: 'resize'` to abcjs's `renderAbc()`. Container div gets `w-full`. This makes abcjs emit a viewBox-based SVG that scales via CSS. Only post-process the SVG `width` attribute if responsive scaling is observed to not work during implementation.

### Dark Mode (D-03)
- **D-03:** Apply `dark:invert` CSS filter on the AbcBlock container div. Notes render white-on-dark in dark mode. No abcjs config needed — pure CSS.

### Loading State (D-04)
- **D-04:** Show loading spinner (same `<Loader2>` pattern as `TypstBlock`) while the lazy `import('abcjs')` resolves. `loading` state: true on mount, false after import settles. abcjs renders synchronously once imported, so no async render step beyond the import.

### Error Handling (D-05)
- **D-05:** Use the existing `RenderErrorBlock` component with `heading="ABC render error"`. abcjs surfaces parse errors/warnings — capture them from the `renderAbc()` return value's `warnings` array. If warnings are present and no SVG was produced, treat as error.

### Claude's Discretion
- Whether `AbcBlock` lives in `KartexRenderer.tsx` (same file as `TypstBlock`, currently 316 lines — adding ~60 lines stays well under the 500-line limit) or is extracted to a separate file. Inline is preferred for consistency unless line count becomes a concern.
- Exact abcjs `renderAbc()` options beyond `responsive: 'resize'` (e.g., `add_classes: true` for targeting, `format: {}` for margins).
- Whether `preprocessAbcBlocks` runs before or after `preprocessTypstBlocks` — order doesn't matter since blocks use different prefixes.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/REQUIREMENTS.md` — ABC-01, ABC-02, ABC-03 with full acceptance criteria; also the deferred-audio-playback note
- `.planning/ROADMAP.md` §Phase 26 — Goal, success criteria, phase dependency (Phase 22)

### Existing Block Renderer Pattern
- `apps/frontend/src/components/KartexRenderer.tsx` — **Primary analog.** `TypstBlock` (lines 43–88) is the template for `AbcBlock`: same `useRef`/`useEffect`/loading/error state machine. `preprocessTypstBlocks` (lines 116–136) is the template for `preprocessAbcBlocks`. `RenderErrorBlock` (lines 22–29) is reused directly. `kartexComponents.code` handler (lines 204–210) shows where to add `language-abc` detection.
- `.planning/STATE.md` §Decisions — `v1.4-research: abcjs DOM-mutation pattern: useRef + useEffect([source]) — same as TypstBlock; lazy import('abcjs') inside useEffect`

### abcjs
- Package: `abcjs@^6.6.3` — already called out in v1.4-research STATE.md decision. Install into `apps/frontend` via `yarn workspace @kartex/frontend add abcjs`.
- API: `abcjs.renderAbc(elementId_or_element, abcString, params)` — renders into a DOM element; `params.responsive = 'resize'` for fluid SVG. Return value has `warnings` array for error detection.

### Frontend Patterns
- `apps/frontend/src/lib/typst.ts` — Typst WASM singleton; AbcBlock does NOT use this. Reference only for understanding the `renderTypstToSvg` singleton pattern (AbcBlock uses a simpler lazy import, not a singleton).
- `apps/frontend/src/main.tsx` — Global CSS imports (KaTeX, highlight.js); check if abcjs needs a CSS import (it does for some themes — confirm during implementation).
- `apps/frontend/package.json` — Workspace package.json to confirm abcjs version added correctly.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`RenderErrorBlock`** (`KartexRenderer.tsx:22–29`): Reuse directly — `heading="ABC render error"`, `errorMessage` from abcjs warnings, `rawSource` is the raw ABC text.
- **`TypstBlock`** (`KartexRenderer.tsx:43–88`): Template for `AbcBlock`. Key difference: Typst calls an async function that returns SVG string; abcjs mutates a DOM element via `ref`. Replace `setSvg(result)` + `dangerouslySetInnerHTML` with `abcjs.renderAbc(ref.current, source, { responsive: 'resize' })`.
- **`preprocessTypstBlocks`** (`KartexRenderer.tsx:116–136`): Copy and adapt to `preprocessAbcBlocks` — same structure, `#abc` prefix instead of `#typst`.
- **`extractTextFromChildren`** (`KartexRenderer.tsx:139–153`): Already used in the `code` handler; AbcBlock reuses the same extraction since abcjs source arrives via the same code component pathway.

### Established Patterns
- **Fenced code block routing**: Preprocessor converts `#prefix\n...` → ` ```language\n...\n``` `, then `kartexComponents.code` checks `className?.includes('language-X')`.
- **Lazy import inside useEffect**: `import('abcjs').then(mod => mod.default)` — avoids adding abcjs to the initial bundle.
- **Loading spinner**: `<Loader2 className="h-4 w-4 animate-spin inline mr-1" />` from lucide-react — already imported in KartexRenderer.tsx.
- **Dark mode via Tailwind**: Apply `dark:invert` directly on the container div as a className string.

### Integration Points
- `KartexRenderer.tsx`: Add `preprocessAbcBlocks(content)` call in the chain before ReactMarkdown (or compose with `preprocessTypstBlocks`). Add `language-abc` branch in `kartexComponents.code`.
- `apps/frontend/package.json`: Add `abcjs` dependency.
- May need a CSS import in `main.tsx` for abcjs styles — check abcjs docs during implementation; only import if required for correct rendering.

</code_context>

<specifics>
## Specific Ideas

- The `AbcBlock` container div should apply both `w-full` (responsive width) and `dark:invert` (dark mode) as Tailwind classes, e.g. `className="w-full dark:invert"`.
- `preprocessAbcBlocks` and `preprocessTypstBlocks` should both be called in sequence in KartexRenderer — order doesn't matter since prefixes differ.
- abcjs `renderAbc()` target should be the `ref.current` div directly (not an element ID string) — avoids ID collision when multiple `#abc` blocks appear on one card.

</specifics>

<deferred>
## Deferred Ideas

- **ABC audio playback** — `abcjs` has WebAudio synthesis but it adds ~400 KB and requires `AudioContext` permission; explicitly deferred to v2 in REQUIREMENTS.md
- **Inline ABC editor** — abcjs interactive editor mode; cards are read-only during study; deferred per REQUIREMENTS.md

### Reviewed Todos (not folded)
- **"Support deck update via zip file upload"** (2026-06-15) — maps to Phase 27
- **"Add quick-edit / jump-to-card button in study mode"** (2026-06-15) — maps to Phase 28

</deferred>

---

*Phase: 26-abc-notation*
*Context gathered: 2026-06-30*
