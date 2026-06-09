---
plan: 14-02
phase: 14-schema-foundation
status: complete
completed: 2026-06-10
duration_estimate: inline (quota fallback)
self_check: PASSED
---

# Plan 14-02 Summary — Parser id: Field Support (IMP-07)

## What Was Built

Extended the `.kartex` parser to recognize and expose the optional `id:` card field, satisfying IMP-07. Also added Vitest tests and documentation.

## Key Files Created / Modified

### Modified
- `packages/shared/src/lib/kartex-parser.ts` — `parseFields()` now includes `id` in its FIELD_PATTERN and result type; empty `id:` values return `undefined` (D-03 min-length-1); `parseCardBlock()` passes `id` through to the returned card object
- `docs/kartex-format.md` — Card Fields section updated: table gains `id` row; new "id Field" subsection with example, rules, and import-update context

### Pre-existing (from Wave 1)
- `packages/shared/src/schemas/import.ts` — `ParsedCardSchema` already had `id: z.string().min(1).optional()` from Plan 14-01

### Created
- `apps/backend/src/routes/__tests__/kartex-parser-id.test.ts` — 5 Vitest tests covering: id-present, backward-compat (no id), duplicate ids tolerated, any field order, empty id → undefined

## Test Results

All 5 tests passed after rebuilding the shared package dist:
- Test 1: `id: foo-123` → `cards[0].id === 'foo-123'` ✓
- Test 2: no `id:` field → `cards[0].id === undefined` ✓
- Test 3: duplicate ids tolerated → both cards have `id === 'dup'` ✓
- Test 4: all four fields in any order → `id` correctly parsed ✓
- Test 5: empty `id:` → `cards[0].id === undefined` ✓

## Notable Decisions

- The shared package resolves to `dist/index.js` in tests; a `yarn workspace @kartex/shared build` is required for changes to take effect in tests
- `id:` is handled as a single-line field (same as `tags:`), not multi-line
- Empty `id:` (no value after colon) returns `undefined`, matching D-03 min-length-1 from ParsedCardSchema
- Parser tolerates duplicate ids — uniqueness enforcement is a Phase 16 responsibility

## Self-Check

- [x] `parseKartex` exposes `id` on parsed cards
- [x] Backward-compatible — files without `id:` parse unchanged
- [x] 5 tests passing
- [x] `docs/kartex-format.md` documents the field with example and rules
- [x] No STATE.md or ROADMAP.md modifications
