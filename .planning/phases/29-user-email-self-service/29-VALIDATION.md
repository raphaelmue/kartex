---
phase: 29
slug: user-email-self-service
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-02
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 (pinned per STATE.md `03-01` — do NOT upgrade to 4.x) |
| **Config file** | `apps/backend/vitest.config.ts` (node), `apps/frontend/vitest.config.ts` (jsdom, `@testing-library/react`) |
| **Quick run command** | `yarn workspace @kartex/frontend test -- SettingsPage` / `yarn workspace @kartex/backend test -- <file>` (confirm exact filename during Wave 0) |
| **Full suite command** | `npm test` (root — runs both workspaces per `package.json`) |
| **Estimated runtime** | targeted workspace runs are fast (~seconds); full `npm test` runs both workspaces (estimate, no measured baseline recorded) |

---

## Sampling Rate

- **After every task commit:** Run the targeted quick command for the workspace touched.
- **After every plan wave:** Run `npm test` (full suite, both workspaces).
- **Before `/gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** targeted run per commit (seconds); full suite per wave merge.

---

## Per-Task Verification Map

*Task IDs reconciled to real `{plan}-{task}` IDs on 2026-07-02 after PLAN.md creation.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 29-01-T1 | 29-01 | 1 | EMAIL-09 | V5 Input Validation | Shared schema normalizes trim+lowercase before `.email()` (real unit test); route behaviors as `it.todo` | real unit + structural (`it.todo`) | `yarn workspace @kartex/backend test run auth-me` | ❌→ W0 creates `auth-me.test.ts` | ⬜ pending |
| 29-01-T2 | 29-01 | 1 | EMAIL-09, EMAIL-10 | V5 Input Validation | `GET /me` returns `email` (null-safe); `PATCH /me` accepts `{ email }`, duplicate → 409 `EMAIL_TAKEN`, bad format → 400 | structural (`it.todo`) | `yarn workspace @kartex/backend test run auth-me` | ✅ created in 29-01-T1 | ⬜ pending |
| 29-01-T3 | 29-01 | 1 | EMAIL-11 | V4 Access Control, T-29-01/02 | `PATCH /users/:id` accepts validated `{ email }` (admin), same conflict/format handling | structural (`it.todo`) | `yarn workspace @kartex/backend test run admin-email` | ❌→ W0 creates `admin-email.test.ts` | ⬜ pending |
| 29-03-T2 | 29-03 | 2 | EMAIL-09, EMAIL-10 | T-29-03 | Email Card save (valid → setUser+toast, `EMAIL_TAKEN` → inline, invalid → inline, no api call); no-email Alert visibility | frontend RTL | `yarn workspace @kartex/frontend test run SettingsPage` | ⚠️ Partial — file exists, new cases added | ⬜ pending |
| 29-04-T2 | 29-04 | 2 | EMAIL-11 | V4 Access Control, T-29-03 | Edit Email Dialog (menu order, pre-fill, valid save → patch+toast+refresh+close, `EMAIL_TAKEN` → inline) | frontend RTL | `yarn workspace @kartex/frontend test run AdminPage` | ⚠️ Partial — file exists, new cases added | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/backend/src/routes/__tests__/auth-me.test.ts` (or similarly named) — create following the `it.todo` stub convention shown in `admin-delete.test.ts` / `admin-mailer.test.ts`
- [ ] `SettingsPage.test.tsx` — add new test cases for the Email Card + Alert banner; extend existing `mockUser` / `mockApiPatch` / `vi.hoisted` setup (add `email` to the hoisted mock user fixture)
- [ ] `AdminPage.test.tsx` — add new test cases for the Edit Email Dialog; extend existing `mockApiGet` / `mockApiPost` / `vi.hoisted` setup (`mockApiPatch` already exists but is currently unused/stubbed at line 33 — needs real assertions)

---

## Manual-Only Verifications

*All phase behaviors have automated verification per RESEARCH.md — no manual-only items identified.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency acceptable (targeted per-commit runs)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
