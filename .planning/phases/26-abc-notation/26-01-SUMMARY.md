---
phase: 26-abc-notation
plan: "01"
subsystem: frontend/KartexRenderer
tags: [abc-notation, abcjs, rendering, sheet-music, react]
status: complete

dependency_graph:
  requires:
    - packages/shared (unchanged — no new types)
  provides:
    - AbcBlock component (file-internal to KartexRenderer.tsx)
    - preprocessAbcBlocks function (file-internal to KartexRenderer.tsx)
    - language-abc code handler branch (file-internal to KartexRenderer.tsx)
  affects:
    - apps/frontend/src/components/KartexRenderer.tsx
    - apps/frontend/package.json
    - yarn.lock

tech_stack:
  added:
    - abcjs@^6.6.3 — ABC notation to SVG renderer (runtime dependency, lazy-loaded)
  patterns:
    - DOM-mutation via useRef + lazy import() inside useEffect (mirrors TypstBlock pattern)
    - Always-mounted ref div with display:none during loading/error (preserves containerRef.current)
    - Preprocessor composition: preprocessAbcBlocks(preprocessTypstBlocks(content))

key_files:
  modified:
    - apps/frontend/src/components/KartexRenderer.tsx — added AbcBlock, preprocessAbcBlocks, language-abc handler, preprocessor composition
    - apps/frontend/package.json — added abcjs@^6.6.3 to dependencies
    - yarn.lock — updated with abcjs resolution entries

decisions:
  - abcjs CJS interop: use `(mod as any).default ?? mod` to handle both named ESM exports and CJS default — avoids runtime crash if bundler resolves the CJS bundle
  - Always-mounted div pattern: containerRef.current must be non-null when the lazy import Promise resolves; conditional rendering would race with the async resolve

metrics:
  duration: "~15 minutes"
  completed: "2026-06-30"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 2
---

# Phase 26 Plan 01: AbcBlock Renderer via abcjs Summary

## One-liner

Wired abcjs@6.6.3 into KartexRenderer as AbcBlock with lazy DOM-mutation pattern, preprocessAbcBlocks converter, and language-abc code handler — enabling inline SVG sheet music rendering from #abc blocks.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Verify abcjs package identity (checkpoint, approved by user) | — | — |
| 2 | Install abcjs@^6.6.3 into apps/frontend | d54d49e | apps/frontend/package.json, yarn.lock |
| 3 | Implement AbcBlock, preprocessAbcBlocks, language-abc handler | 00125cb | apps/frontend/src/components/KartexRenderer.tsx |

## What Was Built

**AbcBlock component** (`AbcBlockProps { source: string }`):
- `useRef<HTMLDivElement>(null)` as `containerRef` — abcjs mutates the DOM node directly via `renderAbc()`
- `useEffect([source])` with cancellation guard: lazy `import('abcjs')`, CJS interop `(mod as any).default ?? mod`, call `abcjs.renderAbc(containerRef.current, source, { responsive: 'resize' })`
- Warning extraction: `result?.[0]?.warnings ?? []`; if non-empty, `setError(warnings[0])`
- Always-mounted div with `className="w-full dark:invert"` and `style={{ display: 'none' }}` during loading/error — ensures `containerRef.current` is populated in DOM throughout async lifecycle
- Loading state: `<Loader2 className="h-4 w-4 animate-spin inline mr-1" />Rendering...` inside `<span className="text-muted-foreground text-sm">` — exact match to TypstBlock loading state
- Error state: `<RenderErrorBlock heading="ABC render error" errorMessage={error} rawSource={source} />`

**preprocessAbcBlocks function**: exact mirror of `preprocessTypstBlocks` — splits content on `'\n'`, detects `lines[i].trim() === '#abc'`, collects subsequent non-blank lines, wraps in ` ```abc ... ``` `.

**kartexComponents.code extension**: `language-abc` branch added before `language-typst` check — extracts source via `extractTextFromChildren(children).replace(/\n$/, '')`, returns `<AbcBlock source={source} />`.

**Preprocessor composition**: `{preprocessAbcBlocks(preprocessTypstBlocks(content))}` in KartexRenderer JSX — both preprocessors run before ReactMarkdown.

## Acceptance Criteria Verification

- [x] ABC-01: AbcBlock renders SVG via abcjs.renderAbc with responsive:resize — SVG fills container at all viewport widths
- [x] ABC-02: Warnings-based error detection → RenderErrorBlock with heading "ABC render error" on invalid notation
- [x] ABC-03: Container div carries `w-full dark:invert` — responsive scaling + dark mode inversion
- [x] D-01: preprocessAbcBlocks converts #abc prefix blocks to fenced ```abc code blocks
- [x] D-04: abcjs loaded via lazy import() inside useEffect — not in initial bundle; Loader2 spinner shown during load
- [x] No static `import ... from 'abcjs'` at module scope in KartexRenderer.tsx
- [x] `yarn workspace @kartex/frontend typecheck` exits 0

## Deviations from Plan

### Auto-applied: CJS interop cast

**Rule 1 (preemptive / defensive)** — Plan noted CJS interop risk; applied `(mod as any).default ?? mod` pattern from the start to avoid runtime failure if bundler resolves the CommonJS bundle rather than the ESM named exports. TypeScript confirmed it compiles cleanly with the cast. No extra fix cycle needed.

No other deviations — plan executed exactly as specified.

## Known Stubs

None. AbcBlock receives `source` from card content and passes it directly to abcjs.renderAbc — no mock data or placeholder text.

## Threat Flags

None. No new network endpoints, auth paths, or schema changes. The T-26-SC supply-chain threat was mitigated by the Task 1 human checkpoint (user verified abcjs publisher identity at npmjs.com before install). T-26-01 and T-26-02 accepted per plan disposition.

## Self-Check: PASSED

- [x] `apps/frontend/src/components/KartexRenderer.tsx` exists and contains AbcBlock, preprocessAbcBlocks, language-abc handler
- [x] `apps/frontend/package.json` contains `"abcjs": "^6.6.3"` in dependencies
- [x] Commit d54d49e exists (Task 2)
- [x] Commit 00125cb exists (Task 3)
- [x] TypeScript typecheck exits 0
- [x] No static `import ... from 'abcjs'` at module scope
