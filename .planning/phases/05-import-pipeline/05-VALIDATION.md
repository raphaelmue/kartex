---
phase: 5
slug: import-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-28
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Sourced from RESEARCH.md §Validation Architecture (2026-05-28).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 (pinned — Vite 5.x incompatibility with Vitest 4.x) |
| **Config file** | `apps/frontend/vitest.config.ts` (existing) |
| **Quick run command** | `yarn workspace @kartex/frontend test --run src/lib/__tests__/kartex-parser.test.ts` |
| **Full suite command** | `yarn workspace @kartex/frontend test --run` |
| **Estimated runtime** | ~15 seconds |

**Note:** The kartex-parser tests live in the **frontend** workspace and import from `@kartex/shared` — same pattern as SM-2 tests in Phase 4. No separate backend Vitest config needed.

---

## Sampling Rate

- **After every task commit:** Run `yarn workspace @kartex/frontend test --run src/lib/__tests__/kartex-parser.test.ts`
- **After every plan wave:** Run `yarn workspace @kartex/frontend test --run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 1 | IMPT-01 | — | Parser returns `{ fatal: true }` when deck header missing | unit | `yarn workspace @kartex/frontend test --run src/lib/__tests__/kartex-parser.test.ts` | ❌ W0 | ⬜ pending |
| 5-01-02 | 01 | 1 | IMPT-01 | — | Parser skips malformed card, adds to warnings (lenient) | unit | same | ❌ W0 | ⬜ pending |
| 5-01-03 | 01 | 1 | IMPT-01 | — | Parser returns correct deck + cards for valid input | unit | same | ❌ W0 | ⬜ pending |
| 5-01-04 | 01 | 1 | IMPT-01 | — | Parser handles `tags:` list in card blocks correctly | unit | same | ❌ W0 | ⬜ pending |
| 5-01-05 | 01 | 1 | MDIA-03 | T-5-03 | Magic bytes mismatch on media file triggers validation error | unit | same | ❌ W0 | ⬜ pending |
| 5-02-01 | 02 | 2 | IMPT-02 | T-5-01 | POST /api/import with valid `.kartex` creates deck + cards | manual | — | ❌ manual | ⬜ pending |
| 5-02-02 | 02 | 2 | IMPT-04 | T-5-02 | POST /api/import with `.kartex.zip` stores media + creates DB records | manual | — | ❌ manual | ⬜ pending |
| 5-02-03 | 02 | 2 | MDIA-04 | T-5-04 | `bodyLimit` rejects request > MAX_UPLOAD_BYTES with 413 | manual | — | ❌ manual | ⬜ pending |
| 5-03-01 | 03 | 3 | IMPT-05 | — | KartexRenderer renders import preview content | existing | (Phase 3 tests cover renderer) | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/frontend/src/lib/__tests__/kartex-parser.test.ts` — 10 unit test cases covering IMPT-01 + MDIA-03 (see RESEARCH.md §Unit Test Strategy for full list)

*No new framework setup needed — existing Vitest config + jsdom + `@testing-library/jest-dom` is sufficient.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| POST /api/import with valid `.kartex` creates deck + cards | IMPT-03 | Integration test requires DB + running backend | Upload a valid `.kartex` file via the import page, confirm, check `/decks` shows the new deck |
| POST /api/import with `.kartex.zip` stores media + links to cards | IMPT-04 | Requires Docker volume + running backend | Upload a `.kartex.zip` with media folder, confirm import, verify images render in imported cards |
| `bodyLimit` rejects oversized upload with HTTP 413 | MDIA-04 | HTTP-layer middleware, no unit test surface | Upload a file > MAX_UPLOAD_BYTES bytes; expect instant rejection before card preview |
| ZIP extraction handles `__MACOSX/` entries and `\` separators | IMPT-02 | Edge case, no fixture available | Create zip on macOS (or Windows), upload, verify no `__MACOSX` artifacts in media storage |
| Client-side size check fires before upload | IMPT-05 | Browser DOM API, no unit test coverage | Select a file over the limit; verify error appears instantly (no network request in DevTools) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
