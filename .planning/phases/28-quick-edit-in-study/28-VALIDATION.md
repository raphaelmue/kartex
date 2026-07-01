---
phase: 28
slug: quick-edit-in-study
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-01
---

# Phase 28 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 (pinned per STATE.md `03-01` — do NOT upgrade to 4.x) |
| **Config file** | `apps/backend/vitest.config.ts`, `apps/frontend/vitest.config.ts` |
| **Quick run command** | `yarn workspace @kartex/backend test -- study` / `yarn workspace @kartex/frontend test -- StudySessionPage` |
| **Full suite command** | `npm test` (root — runs both workspaces per `package.json`) |
| **Estimated runtime** | targeted workspace runs are fast (~seconds); full `npm test` runs both workspaces (estimate, no measured baseline recorded) |

---

## Sampling Rate

- **After every task commit:** Run the targeted quick command for the workspace touched — `yarn workspace @kartex/backend test -- study` (Plan 01) or `yarn workspace @kartex/frontend test -- StudySessionPage` (Plan 02).
- **After every plan wave:** Run `npm test` (full suite, both workspaces).
- **Before `/gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** targeted run per commit (seconds); full suite per wave merge.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 28-01-01 | 01 | 1 | SEDIT-01 | — | N/A (additive schema field) | build/type | `yarn workspace @kartex/shared build` | ✅ `packages/shared/src/schemas/study.ts` | ⬜ pending |
| 28-01-02 | 01 | 1 | SEDIT-01 | T-28-01 / T-28-02 | `canEdit` server-computed only, never read from request; `/deck/:deckId` ANDs EDIT/MANAGE with `share.isActive` (Pitfall 5) | build/type | `yarn workspace @kartex/backend build` | ✅ `apps/backend/src/routes/study.ts` | ⬜ pending |
| 28-01-03 | 01 | 1 | SEDIT-01 | T-28-01 | documents full permission truth table (owner / EDIT / MANAGE / READ / none / inactive-share) | unit (it.todo) | `yarn workspace @kartex/backend test -- study-canedit` | ❌ W0 — task creates `study-canedit.test.ts` | ⬜ pending |
| 28-02-01 | 02 | 2 | SEDIT-01, SEDIT-04 | T-28-04 | menu visibility driven only by the server-supplied `canEdit` flag | build/type | `yarn workspace @kartex/frontend build` | ✅ new `StudyCardMenu.tsx` + build | ⬜ pending |
| 28-02-02 | 02 | 2 | SEDIT-02 | T-28-06 | unchanged PATCH input surface (existing `UpdateCardSchema` Zod validation) | build/type | `yarn workspace @kartex/frontend build` | ✅ `apps/frontend/src/components/CardEditorModal.tsx` | ⬜ pending |
| 28-02-03 | 02 | 2 | SEDIT-01, SEDIT-02, SEDIT-03, SEDIT-04 | T-28-04 / T-28-05 | render gated on `currentCard.canEdit`; save still re-checked server-side by the PATCH route | unit (frontend) | `yarn workspace @kartex/frontend test -- StudySessionPage` | ❌ W0 — task extends `StudySessionPage.test.tsx` harness | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Test-infrastructure scaffolding is folded into the implementation tasks that consume it (no separate pre-implementation Wave 0 is required — each task builds/extends its own harness before or alongside the behavior it verifies):

- [x] `apps/backend/src/routes/__tests__/study-canedit.test.ts` — created by **Task 28-01-03** as `it.todo` behavior documentation (per the established `sharing.test.ts` / `study-rate-reviewlog.test.ts` convention; no live Prisma-mock harness).
- [x] `makeCard()` helper in `StudySessionPage.test.tsx` extended to include `canEdit: boolean` — done in **Task 28-02-03** (covers SEDIT-01 / SEDIT-04).
- [x] `api.patch` added to the existing `vi.mock('@/lib/api', ...)` factory in `StudySessionPage.test.tsx` (currently only `get`/`post`) — done in **Task 28-02-03** (needed for SEDIT-02).
- [x] Hoisted shared `navigate` spy in `StudySessionPage.test.tsx`'s router mock (replaces the current unassertable `useNavigate: () => vi.fn()`, following the `vi.hoisted` pattern already used for `mockApiGet`) — done in **Task 28-02-03** (needed for SEDIT-03).

*Backend `canEdit` computation follows the existing `it.todo` documentation-only convention rather than a live Prisma-mock harness — deliberate, per RESEARCH.md Wave 0 Gaps.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Menu visible on both card faces (front and back) | D-02 | Placement in the progress row (above `CardFlip`) is unaffected by flip state; a rendered-position spot-check is cheaper visually than asserting layout in JSDOM | Start a study session on a card you own; flip the card and confirm the 3-dot menu remains visible on both faces. |
| Menu visible in all study modes including Exam mode | D-05 | Mode-independence is a composition property across full session flows; visual confirmation is more direct than a mode-matrix unit test | Start an Exam-mode session on a deck you own/can edit; confirm the 3-dot menu still renders. |

*All security-relevant and requirement-level behaviors (SEDIT-01..04) have automated verification; the two items above are visual polish spot-checks only.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency acceptable (targeted per-commit runs)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-01
