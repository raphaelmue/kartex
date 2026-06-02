---
phase: 10
slug: active-deck-rotation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-02
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 + @testing-library/react |
| **Config file** | `apps/frontend/vitest.config.ts` |
| **Quick run command** | `yarn workspace @kartex/frontend run test --run` |
| **Full suite command** | `yarn workspace @kartex/frontend run test --run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `yarn workspace @kartex/frontend run test --run`
- **After every plan wave:** Run `yarn workspace @kartex/frontend run test --run`
- **Before `/gsd-verify-work`:** Full suite must be green (67 + new tests)
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 0 | DECK-01 | — | N/A | unit | `yarn workspace @kartex/frontend run test --run src/pages/__tests__/DecksPage.test.tsx` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | DECK-01 | T-tampering | PATCH /api/decks/:id owner check returns 403 for non-owner | unit | `yarn workspace @kartex/frontend run test --run src/pages/__tests__/DecksPage.test.tsx` | ❌ W0 | ⬜ pending |
| 10-01-03 | 01 | 1 | DECK-01 | — | N/A | unit | `yarn workspace @kartex/frontend run test --run src/pages/__tests__/DeckDetailPage.test.tsx` | ✅ exists | ⬜ pending |
| 10-02-01 | 02 | 1 | DECK-02 | T-tampering | /api/study/due only returns cards from isActive=true owned decks | manual | Manual: set deck isActive=false, /study must not show those cards | ❌ manual | ⬜ pending |
| 10-02-02 | 02 | 1 | DECK-03 | — | N/A | unit | `yarn workspace @kartex/frontend run test --run src/pages/__tests__/StudySessionPage.test.tsx` | ✅ exists | ⬜ pending |
| 10-02-03 | 02 | 1 | DECK-03 | — | N/A | unit | `yarn workspace @kartex/frontend run test --run src/pages/__tests__/StudySessionPage.test.tsx` | ✅ exists | ⬜ pending |
| 10-02-04 | 02 | 1 | DECK-04 | — | N/A | unit | `yarn workspace @kartex/frontend run test --run src/pages/__tests__/StudySessionPage.test.tsx` | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/frontend/src/pages/__tests__/DecksPage.test.tsx` — stubs for DECK-01 (toggle render, PATCH call, optimistic revert on error, owner-only guards)

*Existing infrastructure covers all other phase requirements (StudySessionPage.test.tsx, DeckDetailPage.test.tsx already exist).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| /api/study/due excludes inactive deck cards | DECK-02 | No backend test infra in project (pre-existing gap) | 1. Set a deck isActive=false via toggle. 2. Navigate to /study. 3. Verify no cards from that deck appear in the session queue. |
| isActive=false visual treatment (opacity-60) | DECK-01 | CSS opacity not reliably testable in JSDOM | Visually confirm deck card shows at 60% opacity when toggled inactive. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
