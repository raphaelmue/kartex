---
phase: 16
slug: import-update-feature
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-10
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 (pinned — not 4.x) |
| **Config file** | `apps/frontend/vitest.config.ts` / `apps/backend/vitest.config.ts` |
| **Quick run command** | `yarn workspace @kartex/backend test --run` |
| **Full suite command** | `yarn test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `yarn workspace @kartex/backend test --run`
- **After every plan wave:** Run `yarn test` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 16-W0-01 | Wave 0 | 0 | IMP-03,IMP-04,IMP-05,IMP-06 | T-16-01 | Owner-only gate; CardProgress untouched | unit | `yarn workspace @kartex/backend test --run` | ❌ W0 | ⬜ pending |
| 16-W0-02 | Wave 0 | 0 | IMP-01,IMP-02 | T-16-FE-01 | Button owner-only; preview modal shows diff | unit | `yarn workspace @kartex/frontend test --run` | ❌ W0 | ⬜ pending |
| 16-01 | Preview route | 1 | IMP-02,IMP-03,IMP-04,IMP-05 | T-16-01..06 | 403 non-owner; diff computed correctly | unit | `yarn workspace @kartex/backend test --run` | ❌ W0 | ⬜ pending |
| 16-02 | Apply route | 1 | IMP-03,IMP-04,IMP-05,IMP-06 | T-16-07..12 | Transaction atomicity; keepRemoved controls deletion | unit | `yarn workspace @kartex/backend test --run` | ❌ W0 | ⬜ pending |
| 16-03 | DeckUpdateModal | 2 | IMP-01,IMP-02,IMP-06 | T-16-FE-01..08 | Preview → confirm flow; keepRemoved toggle | unit | `yarn workspace @kartex/frontend test --run` | ❌ W0 | ⬜ pending |
| 16-04 | DeckDetailPage wire-up | 2 | IMP-01 | T-16-FE-07,08 | Button visible to owner only | unit | `yarn workspace @kartex/frontend test --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/backend/src/routes/__tests__/deck-update.test.ts` — 12 stubs (T-16-01 through T-16-12): preview 403, preview diff buckets, apply owner check, apply transaction atomicity, keepRemoved=true/false, duplicate kartexId 422
- [ ] `apps/frontend/src/components/__tests__/DeckUpdateModal.test.tsx` — 6 stubs (T-16-FE-01 through T-16-FE-06): modal renders, diff counts display, keepRemoved toggle, apply calls api, cancel closes, loading state

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| File picker opens on button click | IMP-01 | DOM file dialog cannot be automated in jsdom | Click "Update from file" button → OS file picker opens |
| Preview modal shows correct diff after file select | IMP-02 | Requires real Hono + Prisma running | Upload a .kartex file with mix of new/matched/removed cards; verify counts match |
| Apply commits changes to DB | IMP-03,IMP-04,IMP-05,IMP-06 | End-to-end DB verification | After apply, refresh deck detail and verify card list matches expected state |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
