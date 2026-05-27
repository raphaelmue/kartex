---
phase: 03-rich-content-rendering
plan: "02"
subsystem: frontend-rendering
tags: [typst, wasm, vite-plugin-wasm, lazy-singleton, tdd, react-markdown]
dependency_graph:
  requires:
    - 03-01
  provides:
    - typst-wasm-singleton
    - kartex-renderer-typst-handler
  affects:
    - apps/frontend/src/lib/typst.ts
    - apps/frontend/src/components/KartexRenderer.tsx
    - apps/frontend/src/components/__tests__/KartexRenderer.test.tsx
    - apps/frontend/vite.config.ts
    - apps/frontend/package.json
tech_stack:
  added:
    - "@myriaddreamin/typst.ts@0.7.0-rc2"
    - "@myriaddreamin/typst-ts-web-compiler@0.7.0-rc2"
    - "@myriaddreamin/typst-ts-renderer@0.7.0-rc2"
    - vite-plugin-wasm@3.6.0
    - vite-plugin-top-level-await@1.6.0
  patterns:
    - Lazy WASM singleton via module-level initPromise (D-06)
    - Vite asset URL imports (?url) for WASM files (vite-plugin-wasm)
    - TDD RED/GREEN cycle — tests written before implementation
    - vi.hoisted() for mock variable accessible at vi.mock hoist time
    - react-markdown components prop for both p and h6 #typst detection (Pitfall 8)
key_files:
  created:
    - apps/frontend/src/lib/typst.ts
  modified:
    - apps/frontend/vite.config.ts
    - apps/frontend/src/components/KartexRenderer.tsx
    - apps/frontend/src/components/__tests__/KartexRenderer.test.tsx
    - apps/frontend/package.json
decisions:
  - "Used vi.hoisted() for mockRenderTypstToSvg — vi.mock() is hoisted to top of file by Vitest; top-level const declarations are NOT hoisted, causing ReferenceError. vi.hoisted() runs at hoist time and avoids this."
  - "kartexComponents handles both p and h6 for #typst detection — Markdown may parse '#typst' as a level-6 heading or as a plain paragraph depending on context (RESEARCH.md Pitfall 8, T-03-03). Both paths are handled defensively."
  - "initPromise singleton: 5 references in typst.ts (let declaration, null init check, assignment, await return) — D-06 implemented correctly."
  - "TypstBlock cleanup: useEffect returns a cancellation flag to prevent setState on unmounted component."
metrics:
  duration: "~5 minutes"
  completed: "2026-05-27"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 4
---

# Phase 3 Plan 02: Typst WASM Singleton + KartexRenderer Extension Summary

**One-liner:** Lazy typst.ts WASM singleton (initPromise gate) with TypstBlock inline component rendering #typst blocks as SVG — spinner, SVG injection, and red-bordered error fallback — via mocked renderTypstToSvg unit tests (CARD-08).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install Typst WASM packages and extend Vite config | eba42be | vite.config.ts, package.json, yarn.lock |
| 2 (RED) | Add failing CARD-08 tests | c3e4222 | KartexRenderer.test.tsx |
| 2 (GREEN) | Create typst.ts singleton and extend KartexRenderer | 1310e7c | typst.ts, KartexRenderer.tsx, KartexRenderer.test.tsx |

## Outcomes

- CARD-08: KartexRenderer renders #typst blocks as SVG (via mocked renderTypstToSvg in unit tests)
- D-04: WASM loading is lazy — renderTypstToSvg only called when content contains #typst block
- D-05: Loading spinner (Loader2 + "Rendering..." text) shown while WASM compiles
- D-06: Module-level initPromise singleton prevents multiple WASM initializations
- D-10: Typst compilation errors render as RenderErrorBlock (red border, error message + raw source)
- T-03-03 mitigation: Both p and h6 component handlers check for #typst prefix
- All 8 tests pass: `yarn workspace @kartex/frontend test --run` exits 0

## TDD Gate Compliance

- RED commit: `c3e4222 test(03-02): add failing CARD-08 tests for #typst block rendering`
- GREEN commit: `1310e7c feat(03-02): create typst.ts singleton and extend KartexRenderer with #typst handler`
- Both gates present in git log — TDD cycle complete.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] vi.hoisted() required for mock variable accessibility**
- **Found during:** Task 2 GREEN — first test run after creating typst.ts and extending KartexRenderer
- **Issue:** `const mockRenderTypstToSvg = vi.fn()...` was declared as a top-level variable before `vi.mock(...)`, but Vitest hoists `vi.mock()` to the top of the file during transform. The `const` declaration is NOT hoisted, so `mockRenderTypstToSvg` was undefined when the `vi.mock` factory ran, causing `ReferenceError: Cannot access 'mockRenderTypstToSvg' before initialization`.
- **Fix:** Replaced `const mockRenderTypstToSvg = vi.fn()...` with `const mockRenderTypstToSvg = vi.hoisted(() => vi.fn()...)`. `vi.hoisted()` runs at hoist time alongside `vi.mock()`, making the variable available when the factory executes.
- **Files modified:** apps/frontend/src/components/__tests__/KartexRenderer.test.tsx
- **Commit:** 1310e7c

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| CARD-09 media:// image stub | KartexRenderer.test.tsx | ~84 | Implemented in 03-03 |
| CARD-10 audio player stub | KartexRenderer.test.tsx | ~92 | Implemented in 03-03 |
| CARD-11 YouTube embed stub | KartexRenderer.test.tsx | ~100 | Implemented in 03-03 |

CARD-08 stub replaced with real tests (happy path + error path) — both pass.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: xss-svg-injection | apps/frontend/src/components/KartexRenderer.tsx | TypstBlock uses dangerouslySetInnerHTML for SVG output from $typst.svg(). T-03-SVG: accepted for invite-only user model (A2 assumption from RESEARCH.md). Full SVG sanitization is Phase 5+ concern. |

## Self-Check: PASSED

Files created:
- apps/frontend/src/lib/typst.ts — FOUND

Files modified:
- apps/frontend/vite.config.ts — FOUND (wasm() + topLevelAwait() in plugins)
- apps/frontend/src/components/KartexRenderer.tsx — FOUND (TypstBlock + kartexComponents)
- apps/frontend/src/components/__tests__/KartexRenderer.test.tsx — FOUND (CARD-08 real tests)

Commits verified:
- eba42be — chore(03-02): install Typst WASM packages and extend Vite config
- c3e4222 — test(03-02): add failing CARD-08 tests for #typst block rendering
- 1310e7c — feat(03-02): create typst.ts singleton and extend KartexRenderer with #typst handler

Test run: 8/8 passing — VERIFIED
