---
phase: 03-rich-content-rendering
plan: "01"
subsystem: frontend-rendering
tags: [vitest, katex, highlight.js, remark-math, rehype-katex, rehype-highlight, testing]
dependency_graph:
  requires: []
  provides:
    - vitest-test-infrastructure
    - katex-math-rendering
    - code-syntax-highlighting
  affects:
    - apps/frontend/src/components/KartexRenderer.tsx
    - apps/frontend/src/main.tsx
tech_stack:
  added:
    - vitest@2.1.9
    - "@testing-library/react@16.3.2"
    - "@testing-library/jest-dom@6.9.1"
    - "@testing-library/dom@10.4.1"
    - jsdom@29.1.1
    - "@vitest/coverage-v8@2.1.9"
    - katex@0.17.0
    - remark-math@6.0.0
    - rehype-katex@7.0.1
    - rehype-highlight@7.0.2
    - highlight.js@11.11.1
    - "@types/katex@0.16.8"
  patterns:
    - remark/rehype unified plugin pipeline for math and code
    - TDD RED/GREEN cycle — test infrastructure before implementation
key_files:
  created:
    - apps/frontend/vitest.config.ts
    - apps/frontend/src/test/setup.ts
    - apps/frontend/src/components/__tests__/KartexRenderer.test.tsx
  modified:
    - apps/frontend/package.json
    - apps/frontend/src/components/KartexRenderer.tsx
    - apps/frontend/src/main.tsx
decisions:
  - "Installed vitest@2.1.9 (not 4.x) — Vitest 4.x requires Vite ^6.0.0; project uses Vite 5.x. 2.1.9 is the latest compatible release."
  - "Block math test uses multiline $$ syntax ($$\\n...\\n$$) — remark-math requires $$ on their own lines for display mode; single-line $$....$$ is treated as inline math."
  - "rehypeKatex configured with throwOnError:false and errorColor:'hsl(0 84% 60%)' per D-09 — malformed math degrades gracefully."
  - "rehypeHighlight configured with detect:true for language auto-detection per CONTEXT.md Claude's Discretion."
metrics:
  duration: "~7 minutes"
  completed: "2026-05-27"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 3
---

# Phase 3 Plan 01: Vitest Infrastructure + KaTeX + highlight.js Summary

**One-liner:** Vitest + jsdom test infrastructure with remark-math / rehype-katex / rehype-highlight plugin chain enabling KaTeX inline/block math (CARD-06, CARD-07) and highlight.js syntax highlighting (CARD-12).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Install Vitest infrastructure, create failing tests | 88f32a9 | vitest.config.ts, src/test/setup.ts, KartexRenderer.test.tsx, package.json |
| 2 (GREEN) | Install KaTeX+highlight.js, extend KartexRenderer, add CSS imports | 289e431 | KartexRenderer.tsx, main.tsx, package.json, KartexRenderer.test.tsx |

## Outcomes

- CARD-06: `$x^2$` renders as `.katex` span — unit test passes
- CARD-07: `$$\n...\n$$` renders as `.katex-display` span — unit test passes
- CARD-12: Fenced ` ```js ` code block gets `language-js`/`hljs` class — unit test passes
- KaTeX parse errors use `throwOnError: false` — renderer degrades gracefully to error text (D-09)
- Test framework functional: `yarn workspace @kartex/frontend test --run` completes successfully (7/7 pass)
- Stub tests for CARD-08, CARD-09, CARD-10, CARD-11 exist and pass (placeholders for 03-02 and 03-03)

## TDD Gate Compliance

- RED commit: `88f32a9 test(03-01): add Vitest infrastructure and KartexRenderer RED tests`
- GREEN commit: `289e431 feat(03-01): extend KartexRenderer with KaTeX math + highlight.js code rendering`
- Both gates present in git log — TDD cycle complete.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Installed vitest@2.1.9 instead of 4.x**
- **Found during:** Task 1 package install
- **Issue:** Vitest 4.x requires Vite `^6.0.0 || ^7.0.0`; project uses Vite 5.x. Installing 4.x emitted peer dependency warnings.
- **Fix:** Pinned vitest@2.1.9 and @vitest/coverage-v8@2.1.9 — latest release in the Vite-5-compatible 2.x series.
- **Files modified:** apps/frontend/package.json, yarn.lock
- **Commit:** 88f32a9

**2. [Rule 1 - Bug] Fixed block math test content syntax**
- **Found during:** Task 2 GREEN verification
- **Issue:** Test used `"$$\\int f(x)dx$$"` (single-line) — remark-math treats this as inline math, producing `.katex` not `.katex-display`. The plan's behavior spec was correct in intent but the literal string needed `\n` around the `$$` delimiters.
- **Fix:** Changed test content to `"$$\n\\int f(x)dx\n$$"` — remark-math requires `$$` on their own paragraph lines for display/block mode.
- **Files modified:** apps/frontend/src/components/__tests__/KartexRenderer.test.tsx
- **Commit:** 289e431

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| CARD-08 Typst block stub | KartexRenderer.test.tsx | ~44 | Implemented in 03-02 |
| CARD-09 media:// image stub | KartexRenderer.test.tsx | ~53 | Implemented in 03-03 |
| CARD-10 audio player stub | KartexRenderer.test.tsx | ~62 | Implemented in 03-03 |
| CARD-11 YouTube embed stub | KartexRenderer.test.tsx | ~71 | Implemented in 03-03 |

These stubs are intentional. They pass immediately with `expect(true).toBe(true)` and are commented with the plan that will replace them.

## Threat Flags

No new threat surface identified beyond what was in the plan's threat model.
- T-03-02 (KaTeX parse failure DoS): Mitigated — `throwOnError: false` implemented.
- T-03-SC (package legitimacy): All packages from RESEARCH.md Package Legitimacy Audit — verified.

## Self-Check: PASSED

Files created:
- apps/frontend/vitest.config.ts — FOUND
- apps/frontend/src/test/setup.ts — FOUND
- apps/frontend/src/components/__tests__/KartexRenderer.test.tsx — FOUND

Commits verified:
- 88f32a9 — FOUND
- 289e431 — FOUND

Test run: 7/7 passing — VERIFIED
