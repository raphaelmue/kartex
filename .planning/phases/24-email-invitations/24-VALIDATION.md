---
phase: 24
slug: email-invitations
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-25
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 |
| **Config file** | `apps/frontend/vitest.config.ts` |
| **Quick run command** | `yarn workspace @kartex/frontend vitest run` |
| **Full suite command** | `yarn workspace @kartex/frontend vitest run --reporter=verbose` |
| **Estimated runtime** | ~30 seconds |

**Baseline:** 15 test files, 123 tests, all passing (verified 2026-06-25).

---

## Sampling Rate

- **After every task commit:** Run `yarn workspace @kartex/frontend vitest run`
- **After every plan wave:** Run `yarn workspace @kartex/frontend vitest run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green (123 existing + new tests passing)
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 24-01-01 | 01 | 1 | EMAIL-03 | T-24-01 | Token generated with crypto.randomBytes(32) — not cuid/sequential | unit | `vitest run src/pages/__tests__/AdminPage.test.tsx` | ❌ W0 | ⬜ pending |
| 24-01-02 | 01 | 1 | EMAIL-04 | — | N/A | manual | — | manual-only | ⬜ pending |
| 24-02-01 | 02 | 2 | EMAIL-05 | T-24-02 | Token consumed atomically (TOCTOU-safe $transaction) | unit | `vitest run src/pages/__tests__/InviteRegisterPage.test.tsx` | ❌ W0 | ⬜ pending |
| 24-02-02 | 02 | 2 | EMAIL-06 | — | Already-used token returns inline error, not crash | unit | same | ❌ W0 | ⬜ pending |
| 24-02-03 | 02 | 2 | EMAIL-06 | — | Expired token returns inline error with distinct message | unit | same | ❌ W0 | ⬜ pending |
| 24-02-04 | 02 | 2 | EMAIL-06 | — | Invalid token returns inline error "not valid" | unit | same | ❌ W0 | ⬜ pending |
| 24-03-01 | 03 | 3 | EMAIL-07 | — | Pending invites table shows email/sent/expires columns | unit | `vitest run src/pages/__tests__/AdminPage.test.tsx` | ❌ W0 | ⬜ pending |
| 24-03-02 | 03 | 3 | EMAIL-08 | — | Revoke calls DELETE /api/admin/invites/:id | unit | same | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/frontend/src/pages/__tests__/AdminPage.test.tsx` — covers EMAIL-03, EMAIL-07, EMAIL-08
- [ ] `apps/frontend/src/pages/__tests__/InviteRegisterPage.test.tsx` — covers EMAIL-05, EMAIL-06 (all three error states)

**Mock patterns for InviteRegisterPage:**
- Mock `react-router-dom` useParams → `{ token: 'abc123' }`
- Mock `@/lib/api` (api.get for token validation, api.post for register)
- No AuthContext mock needed — public page, not in ProtectedRoute

*Existing infrastructure (vitest.config.ts, jsdom, MSW patterns) covers all phase requirements — no new framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Invite email delivers with correct link and 7-day expiry | EMAIL-04 | Requires live SMTP; email content is server-rendered | Use mailer test endpoint; verify received email contains `APP_URL/invite/<token>` link and expiry mention |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
