---
phase: 23
slug: auth-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-21
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 (backend) |
| **Config file** | `apps/backend/vitest.config.ts` |
| **Quick run command** | `yarn workspace @kartex/backend test --run` |
| **Full suite command** | `yarn workspace @kartex/backend test --run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `yarn workspace @kartex/backend test --run`
- **After every plan wave:** Run `yarn workspace @kartex/backend test --run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 23-delete-01 | delete | 1 | ADMIN-01 | T-23-01 | DELETE /api/admin/users/:id returns 200 and user is gone | unit | `yarn workspace @kartex/backend test --run src/routes/__tests__/admin-delete.test.ts` | ❌ W0 | ⬜ pending |
| 23-delete-02 | delete | 1 | ADMIN-04 | T-23-01 | Self-delete returns 400; last-admin delete returns 400 | unit | `yarn workspace @kartex/backend test --run src/routes/__tests__/admin-delete.test.ts` | ❌ W0 | ⬜ pending |
| 23-mailer-01 | mailer | 1 | EMAIL-02 | — | POST /api/admin/mailer/test returns 200 when SMTP configured | unit | `yarn workspace @kartex/backend test --run src/routes/__tests__/admin-mailer.test.ts` | ❌ W0 | ⬜ pending |
| 23-migration | schema | 0 | EMAIL-01 | — | Migration runs; existing users have email = NULL | manual | `docker compose up db && npx prisma migrate deploy` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/backend/src/routes/__tests__/admin-delete.test.ts` — stubs for ADMIN-01, ADMIN-04 (self-delete guard, last-admin guard, successful delete)
- [ ] `apps/backend/src/routes/__tests__/admin-mailer.test.ts` — stubs for EMAIL-02 (test-send success, no-email error, SMTP-not-configured error)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Confirm button disabled until username typed correctly | ADMIN-02 | UI interaction state | Open admin panel, click delete on a user, verify button stays disabled until exact username is typed |
| Dialog shows correct category list (decks, cards, progress, review logs) | ADMIN-03 | UI content verification | Open admin panel, click delete on a user with data, verify dialog lists all categories |
| Email column shows in users table | ADMIN-05 | UI content verification | Open admin panel users list, verify email column visible (blank for users without email) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
