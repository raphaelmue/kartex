---
phase: 05-import-pipeline
plan: 01
subsystem: parsing
tags: [kartex-format, yaml, zod, vitest, tdd, pure-function, shared-package]

# Dependency graph
requires:
  - phase: 04-study-session
    provides: sm2.ts pattern for pure function in packages/shared; sm2.test.ts pattern for frontend-runner tests importing from @kartex/shared
provides:
  - parseKartex() pure function in @kartex/shared — lenient card parser, fatal-on-missing-header
  - DeckHeaderSchema, ParsedCardSchema, ParseWarningSchema, KartexParseResultSchema, ImportResultSchema, ImportConfigSchema Zod schemas
  - 10 Vitest unit tests covering all .kartex format edge cases
affects:
  - 05-02-import-api (imports parseKartex from @kartex/shared)
  - 05-03-import-ui (imports ParsedCard, ParseWarning types from @kartex/shared)

# Tech tracking
tech-stack:
  added:
    - yaml@2.9.0 (YAML deck header parsing in @kartex/shared)
  patterns:
    - "Pure function in packages/shared follows sm2.ts pattern: named interfaces + exported function, no default exports"
    - "Frontend-runner Vitest tests import from @kartex/shared — same pattern as calculateSM2 tests"
    - "KartexParseResult defined via z.infer<typeof KartexParseResultSchema> to avoid duplicate export; kartex-parser.ts re-exports it as type"

key-files:
  created:
    - packages/shared/src/lib/kartex-parser.ts
    - packages/shared/src/schemas/import.ts
    - apps/frontend/src/lib/__tests__/kartex-parser.test.ts
  modified:
    - packages/shared/src/index.ts
    - packages/shared/package.json
    - yarn.lock

key-decisions:
  - "yaml@2.9.0 installed in @kartex/shared — only package needed for deck header YAML parsing"
  - "KartexParseResult type comes from z.infer<typeof KartexParseResultSchema> to avoid duplicate name export across barrel"
  - "Comment stripping uses regex on each line before header extraction — preserves #typst inside field values by only stripping standalone # lines"
  - "Header extraction uses /^---\\r?\\n([\\s\\S]*?)\\r?\\n---/m with multiline flag to find --- after blank lines (from stripped comment lines)"
  - "afterHeader computed from headerMatch.index + headerMatch[0].length for correct offset after comments are stripped"
  - "Field parsing uses line-by-line state machine (parseFields helper) — more reliable than multi-line regex for front:/back:/tags: extraction"

patterns-established:
  - "parseKartex() follows D-01 (lenient cards) and D-02 (fatal header): any card with missing front or back is skipped with a ParseWarning; missing/invalid YAML header returns KartexParseError { fatal: true, message }"
  - "Card tags: parsed via yaml.parse() on the value portion of 'tags: [...]' line — consistent with deck header tag parsing"

requirements-completed:
  - IMPT-01
  - IMPT-05

# Metrics
duration: 6min
completed: 2026-05-28
---

# Phase 5, Plan 01: .kartex Parser (TDD) Summary

**Pure `parseKartex()` function in `@kartex/shared` with Zod schemas, using yaml@2.9.0 for YAML deck headers, lenient card parsing (D-01), and fatal-on-missing-header behavior (D-02) — 10/10 Vitest tests green**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-28T18:34:23Z
- **Completed:** 2026-05-28T18:40:37Z
- **Tasks:** 2 (Task 1: RED, Task 2: GREEN)
- **Files modified:** 6

## Accomplishments

- `parseKartex()` exported from `@kartex/shared` as a pure function — no I/O, no side effects
- Six Zod schemas created: `DeckHeaderSchema`, `ParsedCardSchema`, `ParseWarningSchema`, `KartexParseResultSchema`, `ImportResultSchema`, `ImportConfigSchema`
- 10 unit tests covering happy path, fatal errors (no header, malformed YAML), lenient parsing (missing back:), tags, comments, media://, math ($...$ and $$...$$), and #typst blocks

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — Write kartex-parser.test.ts with 10 failing tests** - `abece05` (test)
2. **Task 2: GREEN — Implement kartex-parser.ts, import.ts schemas, barrel exports** - `dfc6754` (feat)

_TDD plan: test commit (RED) followed by implementation commit (GREEN)_

## Files Created/Modified

- `packages/shared/src/lib/kartex-parser.ts` — `parseKartex()` pure function with `KartexParseError` interface
- `packages/shared/src/schemas/import.ts` — Six Zod schemas for the import pipeline
- `apps/frontend/src/lib/__tests__/kartex-parser.test.ts` — 10 Vitest unit tests
- `packages/shared/src/index.ts` — Two new barrel exports appended
- `packages/shared/package.json` — yaml@2.9.0 added as dependency
- `yarn.lock` — Updated with yaml resolution

## Decisions Made

- **yaml@2.9.0 in @kartex/shared:** YAML package added to shared package so the parser (living in shared) can parse the deck header. No alternative — manual regex cannot handle YAML lists and edge cases.
- **KartexParseResult via z.infer:** To avoid duplicate export when both `schemas/import.ts` and `kartex-parser.ts` are barrel-exported from `index.ts`, `KartexParseResult` is defined only via `z.infer<typeof KartexParseResultSchema>` in `import.ts`; `kartex-parser.ts` re-exports it as a type.
- **Line-by-line field parser:** Multi-line regex for front:/back: fields was error-prone. A `parseFields()` state machine (line-by-line with field name detection) is cleaner and handles multi-line field values correctly.
- **Multiline flag on header regex:** After comment lines are stripped (replaced with empty strings), `---` may not be at position 0. Adding `m` flag to the header regex allows `^---` to match after blank lines.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed duplicate KartexParseResult export collision**
- **Found during:** Task 2 (GREEN — build step)
- **Issue:** `kartex-parser.ts` defined `interface KartexParseResult` independently while `schemas/import.ts` also exported `type KartexParseResult` (from z.infer). The barrel export in `index.ts` produced TS2308 "already exported" error.
- **Fix:** Removed the standalone interface from `kartex-parser.ts`; imported `KartexParseResult` from `schemas/import.ts` and re-exported it as a type.
- **Files modified:** `packages/shared/src/lib/kartex-parser.ts`
- **Verification:** `yarn workspace @kartex/shared build` exits 0
- **Committed in:** dfc6754 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed comment-stripping breaking header extraction**
- **Found during:** Task 2 (GREEN — test run, test 7 of 10 failing)**
- **Issue:** `COMMENT_KARTEX` starts with `# This is a comment\n---`. The comment stripper replaced the `#` line with an empty string, so `---` was no longer at position 0. The header regex `^---` (without `m` flag) failed to match.
- **Fix:** Added `m` (multiline) flag to header regex so `^---` matches after blank lines. Also switched `afterHeader` extraction to use `headerMatch.index + headerMatch[0].length` instead of `indexOf` search to correctly handle the shifted position.
- **Files modified:** `packages/shared/src/lib/kartex-parser.ts`
- **Verification:** Test 7 ("comments ignored") passes; all 10/10 tests green
- **Committed in:** dfc6754 (Task 2 commit)

**3. [Rule 1 - Bug] Fixed TypeScript narrowing error in parseFields helper**
- **Found during:** Task 2 (GREEN — build step)
- **Issue:** `currentField` was typed as `'front' | 'back' | 'tags' | null` but after the `tags` branch set it to `null`, TypeScript narrowed `currentField` to `'front' | 'back'` in the `!== 'tags'` guard — producing TS2367 "no overlap" error.
- **Fix:** Changed `currentField` type to `'front' | 'back' | null`; tags handling sets `currentField = null` directly without going through the union type.
- **Files modified:** `packages/shared/src/lib/kartex-parser.ts`
- **Verification:** `yarn workspace @kartex/shared build` exits 0
- **Committed in:** dfc6754 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (3 Rule 1 bugs found during GREEN build/test)
**Impact on plan:** All fixes necessary for correct TypeScript compilation and passing tests. No scope creep.

## Issues Encountered

- **Worktree missing node_modules:** The git worktree had no `node_modules`. Had to run `yarn install` in the worktree before the test suite could run. Subsequent `yarn workspace @kartex/shared build` compiled the shared package to `dist/` (gitignored).
- **Pre-existing test failures:** `KartexRenderer.test.tsx` CARD-08 (Typst block rendering) tests fail in both the main repo and worktree — these are pre-existing failures from Phase 3/4 and are out of scope for this plan.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `parseKartex` is ready for consumption by:
  - `05-02-import-api`: Import `parseKartex` from `@kartex/shared`; handle `KartexParseError` for 422 responses
  - `05-03-import-ui`: Import `ParsedCard`, `ParseWarning` types from `@kartex/shared` for preview component props
- No blockers for Plans 02 and 03

## Known Stubs

None — the parser is a pure function with no UI or data stubs.

---
*Phase: 05-import-pipeline*
*Completed: 2026-05-28*
