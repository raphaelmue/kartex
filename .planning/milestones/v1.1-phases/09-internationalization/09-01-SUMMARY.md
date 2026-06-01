---
phase: 09-internationalization
plan: 01
subsystem: frontend/i18n
tags: [i18n, react-i18next, i18next, locale, tdd, infrastructure]
dependency_graph:
  requires: []
  provides: [i18n-infrastructure, locale-en, locale-de, type-safe-keys, test-i18n-setup]
  affects: [apps/frontend/src]
tech_stack:
  added: [react-i18next@17.0.8, i18next@26.3.0, i18next-browser-languagedetector@8.2.1]
  patterns: [i18next-init-module, CustomTypeOptions-augmentation, Option-C-test-setup]
key_files:
  created:
    - apps/frontend/src/locales/en.json
    - apps/frontend/src/locales/de.json
    - apps/frontend/src/i18n.ts
    - apps/frontend/src/i18n.d.ts
    - apps/frontend/src/components/__tests__/LanguageToggle.test.tsx
  modified:
    - apps/frontend/src/main.tsx
    - apps/frontend/src/test/setup.ts
    - apps/frontend/package.json
    - yarn.lock
decisions:
  - "i18next v26 removed initImmediate from InitOptions — omit it; init is synchronous when no backend is configured"
  - "changeLanguage spy mock requires 'as any' cast — TFunction brand type in v26 is not assignable from a plain function mock"
  - "Project uses yarn@4.15.0 workspaces (not pnpm) — install via yarn workspace @kartex/frontend add"
metrics:
  duration_seconds: 405
  completed: "2026-06-01"
  tasks_completed: 2
  tasks_total: 2
  files_created: 5
  files_modified: 4
---

# Phase 9 Plan 1: i18n Infrastructure Summary

**One-liner:** react-i18next + i18next v26 installed with complete en/de locales (252 keys), TypeScript CustomTypeOptions augmentation, real-locale test setup (Option C), and a failing RED LanguageToggle test stub for I18N-03.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 2 | Install packages, create locale files, i18n init, type augmentation | 5237793 | package.json, yarn.lock, locales/en.json, locales/de.json, i18n.ts, i18n.d.ts, main.tsx |
| 3 (RED) | Patch test setup for i18n + failing LanguageToggle stub | 2abbd7d, ea611ec | test/setup.ts, LanguageToggle.test.tsx |

## Verification Results

- Key parity script: `OK 252 keys match` — en.json and de.json share identical key set
- Existing test suite: **65 tests pass** (all pre-existing tests green after Option C setup)
- LanguageToggle tests: **2 tests FAIL** (RED) — button does not exist in AppShell yet; Plan 02 makes them green
- TypeScript: clean (`yarn typecheck` exits 0)

## Architecture Decisions

### i18next v26 Breaking Change: initImmediate Removed

The RESEARCH.md recommended `initImmediate: false` in test setup (Option C), but i18next v26 removed this option from `InitOptions`. In v26, when no async backend plugin is used, `init()` resolves synchronously. The option was simply omitted — behavior is identical to setting `initImmediate: false` in earlier versions.

### changeLanguage Mock Type

`i18n.changeLanguage` in v26 returns `Promise<TFunction<"translation", undefined>>` where `TFunction` has a `$TFunctionBrand` property. Standard mock patterns (`mockResolvedValue`, `mockImplementation(() => Promise.resolve(() => ''))`) don't satisfy this branded type. Used `as any` cast on the mock implementation — acceptable for test-only code.

### yarn vs pnpm

The PLAN.md specifies `pnpm --filter @kartex/frontend add ...` but the project uses `yarn@4.15.0` (`packageManager` field in root `package.json`). Used `yarn workspace @kartex/frontend add` instead.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] initImmediate removed in i18next v26**
- **Found during:** Task 3 (TypeScript check)
- **Issue:** `InitOptions<unknown>` in i18next v26 does not include `initImmediate`; TypeScript error TS2769
- **Fix:** Removed `initImmediate: false` from test setup — v26 init is synchronous without a backend anyway
- **Files modified:** `apps/frontend/src/test/setup.ts`
- **Commit:** ea611ec

**2. [Rule 1 - Bug] TFunction brand type prevents changeLanguage mock**
- **Found during:** Task 3 (TypeScript check)
- **Issue:** `mockResolvedValue(i18n)` fails because `i18n` is not assignable to `TFunction` (missing `$TFunctionBrand`)
- **Fix:** Used `mockImplementation((() => Promise.resolve()) as any)` to bypass branded type
- **Files modified:** `apps/frontend/src/components/__tests__/LanguageToggle.test.tsx`
- **Commit:** ea611ec

**3. [Rule 3 - Blocking] Project uses yarn, not pnpm**
- **Found during:** Task 2 (package install)
- **Issue:** `pnpm --filter @kartex/frontend add ...` failed because root `package.json` declares `packageManager: yarn@4.15.0`
- **Fix:** Used `yarn workspace @kartex/frontend add react-i18next i18next i18next-browser-languagedetector`
- **Impact:** None — same result, different package manager CLI

## Known Stubs

None — locale files are fully populated (252 keys, no placeholder values). de.json is complete German translation.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced. i18n is a low-risk domain (display-only).

## Self-Check: PASSED

- apps/frontend/src/locales/en.json: FOUND
- apps/frontend/src/locales/de.json: FOUND
- apps/frontend/src/i18n.ts: FOUND
- apps/frontend/src/i18n.d.ts: FOUND
- apps/frontend/src/components/__tests__/LanguageToggle.test.tsx: FOUND
- Commit 5237793: FOUND
- Commit 2abbd7d: FOUND
- Commit ea611ec: FOUND
