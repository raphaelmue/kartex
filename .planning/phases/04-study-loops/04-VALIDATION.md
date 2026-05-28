---
phase: 4
slug: study-loops
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-28
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 [VERIFIED: apps/frontend/package.json] |
| **Config file** | `apps/frontend/vitest.config.ts` |
| **Quick run command** | `yarn workspace @kartex/frontend test --run` |
| **Full suite command** | `yarn workspace @kartex/frontend test --run --coverage` |
| **Estimated runtime** | ~15 seconds |

> **Note:** Backend has no Vitest configured. SM-2 pure function should live in `packages/shared/src/lib/sm2.ts` so the frontend test runner can test it. Backend route tests are manual only.

---

## Sampling Rate

- **After every task commit:** Run `yarn workspace @kartex/frontend test --run`
- **After every plan wave:** Run `yarn workspace @kartex/frontend test --run --coverage`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 1 | STDY-03 | T-4-03 | SM-2 runs server-side; client sends rating 1-4 only | unit | `yarn workspace @kartex/frontend test --run src/lib/__tests__/sm2.test.ts` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 1 | STDY-03 | T-4-03 | "Again" resets interval=1 AND repetitions=0 | unit | same file | ❌ W0 | ⬜ pending |
| 4-01-03 | 01 | 1 | STDY-03 | — | easeFactor floor at 1.3 | unit | same file | ❌ W0 | ⬜ pending |
| 4-01-04 | 01 | 2 | STDY-01, STDY-02 | T-4-01 | rating validated as 1\|2\|3\|4 at API boundary | manual | POST /api/study/rate with invalid rating | ❌ W0 | ⬜ pending |
| 4-01-05 | 01 | 2 | STDY-04 | T-4-02 | card ownership verified before rating accepted | manual | rating card from another user's deck returns 403 | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 1 | STDY-02 | — | rating buttons hidden until card flipped | unit (React) | `yarn workspace @kartex/frontend test --run src/components/__tests__/CardFlip.test.tsx` | ❌ W0 | ⬜ pending |
| 4-02-02 | 02 | 1 | STDY-05 | T-4-04 | exam mode skips POST /api/study/rate | unit (React) | same file | ❌ W0 | ⬜ pending |
| 4-03-01 | 03 | 1 | STDY-07 | — | streak = 0 when no reviews | unit | `yarn workspace @kartex/frontend test --run src/lib/__tests__/streak.test.ts` | ❌ W0 | ⬜ pending |
| 4-03-02 | 03 | 1 | STDY-07 | — | streak counts consecutive days correctly | unit | same file | ❌ W0 | ⬜ pending |
| 4-03-03 | 03 | 2 | STDY-06 | — | dashboard due-cards count matches CardProgress query | manual | GET /api/dashboard/stats returns correct shape | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/shared/src/lib/sm2.ts` — SM-2 pure function (place here so both frontend tests and backend can import)
- [ ] `apps/frontend/src/lib/__tests__/sm2.test.ts` — unit tests for SM-2: all 4 ratings, "Again" reset, easeFactor floor, first/second interval growth (covers STDY-03)
- [ ] `apps/frontend/src/components/__tests__/CardFlip.test.tsx` — rating button visibility gating (covers STDY-02), exam mode skip (covers STDY-05)
- [ ] `apps/frontend/src/lib/__tests__/streak.test.ts` — streak calculation: 0 when no reviews, consecutive days (covers STDY-07)

*No new test runner installation needed — Vitest 2.1.9 is already installed in `apps/frontend`.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Rating a card from another user's deck returns 403 | STDY-01, STDY-03 | No backend test runner in Phase 4 | POST /api/study/rate with valid JWT but card from another user's deck; expect 403 |
| Invalid rating values rejected | STDY-02 | No backend test runner | POST /api/study/rate with `rating: 5`; expect 400 with ZodError |
| Dashboard due-cards count is accurate | STDY-06 | Integration test requires real DB state | Seed a user with cards at various nextReview dates; verify dashboard count matches expected |
| SM-2 progress NOT saved in exam mode | STDY-05 | Client-side mode guard | Complete exam session; verify CardProgress rows unchanged in DB |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
