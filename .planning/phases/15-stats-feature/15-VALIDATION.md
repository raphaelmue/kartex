---
phase: 15
slug: stats-feature
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-10
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 (pinned — see STATE.md 03-01) |
| **Config file** | `apps/frontend/vitest.config.ts` / `apps/backend/vitest.config.ts` |
| **Quick run command** | `yarn workspace @kartex/frontend test --run` |
| **Full suite command** | `yarn workspace @kartex/frontend test --run && yarn workspace @kartex/backend test --run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run per-workspace quick run (frontend or backend depending on task)
- **After every plan wave:** Run `yarn workspace @kartex/frontend test --run && yarn workspace @kartex/backend test --run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 15-01 | 01 | 0 | STATS-01, STATS-02, STATS-03, STATS-04 | T-15-01 | Stub files exist, tests fail RED | unit stubs | `yarn workspace @kartex/backend test --run` | ❌ W0 | ⬜ pending |
| 15-02 | 02 | 1 | STATS-01 | T-15-01 | `totalReviewed` + `weekReviewed` integer from CardProgress | unit | `yarn workspace @kartex/backend test --run` | ❌ W0 | ⬜ pending |
| 15-03 | 02 | 1 | STATS-02, STATS-03 | T-15-02 | `retentionRate`/`difficultyBreakdown` null when no ReviewLog rows in 30d | unit | `yarn workspace @kartex/backend test --run` | ❌ W0 | ⬜ pending |
| 15-04 | 02 | 1 | STATS-04 | T-15-03 | Per-deck rows include decks with 0 cards; mastered = interval>=21 AND reps>=3 | unit | `yarn workspace @kartex/backend test --run` | ❌ W0 | ⬜ pending |
| 15-05 | 03 | 2 | STATS-01 | — | StatsSummaryPanel renders chips; DashboardPage fetches in parallel | component | `yarn workspace @kartex/frontend test --run` | ❌ W0 | ⬜ pending |
| 15-06 | 03 | 2 | STATS-02, STATS-03 | — | "No data yet" shown when retentionRate === null | component | `yarn workspace @kartex/frontend test --run` | ❌ W0 | ⬜ pending |
| 15-07 | 03 | 2 | SC-5 | T-15-04 | Stats fetch failure → null summary; dashboard hero still renders | component | `yarn workspace @kartex/frontend test --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/backend/src/routes/__tests__/stats-summary.test.ts` — stubs for STATS-01, STATS-02, STATS-03, STATS-04
- [ ] `apps/frontend/src/pages/__tests__/DashboardPage.test.tsx` — stubs for parallel fetch and chip render
- [ ] `apps/frontend/src/components/__tests__/StatsSummaryPanel.test.tsx` — stubs for empty state variants

---

## Security Validation

| Threat | ASVS Category | Validation |
|--------|---------------|------------|
| Horizontal privilege escalation (user A reads user B's stats) | V4 Access Control | Every Prisma query scoped to `userId` from JWT — verify no URL/body userId param |
| Returning 0% retention instead of null | Data integrity | `totalLast30 === 0 ? null : rate` guard — test with empty ReviewLog fixture |
| Unindexed ReviewLog scan | Performance / DoS | `@@index([userId, reviewedAt])` exists in Phase 14 schema — verify migration applied |
