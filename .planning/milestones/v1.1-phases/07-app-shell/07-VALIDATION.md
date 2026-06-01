---
phase: 7
slug: app-shell
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-31
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 + @testing-library/react 16.3.2 |
| **Config file** | `apps/frontend/vitest.config.ts` |
| **Quick run command** | `pnpm --filter @kartex/frontend test --run` |
| **Full suite command** | `pnpm --filter @kartex/frontend test --run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @kartex/frontend test --run`
- **After every plan wave:** Run `pnpm --filter @kartex/frontend test --run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 7-01-01 | 01 | 0 | SHELL-01/02/03 | — | N/A | unit stub | `pnpm --filter @kartex/frontend test --run` | ❌ W0 | ⬜ pending |
| 7-01-02 | 01 | 1 | SHELL-01 | — | N/A | unit (DOM) | `pnpm --filter @kartex/frontend test --run` | ❌ W0 | ⬜ pending |
| 7-01-03 | 01 | 1 | SHELL-02 | — | N/A | unit (DOM) | `pnpm --filter @kartex/frontend test --run` | ❌ W0 | ⬜ pending |
| 7-01-04 | 01 | 1 | SHELL-03 | — | `rel="noopener noreferrer"` on footer links | unit (DOM) | `pnpm --filter @kartex/frontend test --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/frontend/src/components/__tests__/AppShell.test.tsx` — stubs for SHELL-01, SHELL-02, SHELL-03

*Existing test infrastructure (`vitest.config.ts`, `src/test/setup.ts`) covers all phase requirements — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sidebar hidden below 768px, hamburger visible | SHELL-01 | jsdom does not implement CSS media queries — Tailwind class presence is asserted automatically but breakpoint rendering requires browser | Open app at 375px viewport (Chrome DevTools); confirm sidebar is hidden and hamburger is visible |
| Drawer opens as overlay (no layout push) | SHELL-02 | Layout shift requires visual inspection | Tap hamburger at mobile viewport; confirm content area does not shift |
| Footer always visible during scroll | SHELL-03 | Sticky positioning requires visual check | Scroll a long page (e.g. Decks with many cards); confirm footer remains at bottom of viewport |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
