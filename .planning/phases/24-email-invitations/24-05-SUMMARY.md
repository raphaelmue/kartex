---
phase: 24-email-invitations
plan: "05"
subsystem: frontend-admin
tags: [admin, invite-tokens, react, tdd]
requires: [24-02]
provides: [InviteTokensSection, AdminPage-invite-ui]
affects: [apps/frontend/src/pages/AdminPage.tsx]
tech-stack:
  added: []
  patterns:
    - TDD RED/GREEN for admin section replacement
    - Direct icon-button revoke (no confirmation dialog, D-07)
    - Locale-aware toLocaleDateString() for date columns
    - vi.hoisted mock pattern for named toast/api references in tests
key-files:
  created:
    - apps/frontend/src/pages/__tests__/AdminPage.test.tsx
  modified:
    - apps/frontend/src/pages/AdminPage.tsx
decisions:
  - Revoke uses direct Trash2 icon button with no confirmation dialog per D-07 and UI-SPEC Surface 1 (supersedes PATTERNS.md inline-confirm sketch)
  - formatDate uses toLocaleDateString() for locale-aware short dates per UI-SPEC date formatting note
  - SMTP error detection matches exact backend string 'SMTP not configured.' from admin.ts isConfigured pattern
metrics:
  duration: "~10 minutes"
  completed: "2026-06-27T16:44:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 2
status: complete
requirements: [EMAIL-03, EMAIL-07, EMAIL-08]
---

# Phase 24 Plan 05: Admin Invite Tokens UI Summary

**One-liner:** Admin panel InviteTokensSection with email-input send form, pending-invites table (Email/Sent/Expires), and direct icon-button revoke — fully tested GREEN.

## What Was Built

Replaced the obsolete `InviteCodesSection` (code-generation UI) with `InviteTokensSection` (email-invitation UI) in the admin panel. The new section implements the complete admin-facing workflow for EMAIL-03, EMAIL-07, and EMAIL-08.

**AdminPage.tsx changes:**
- Removed: `InviteCode` interface, `InviteCodeStatus` type alias, `getInviteCodeStatus()` function, `InviteStatusBadge` component, `InviteCodesSection` component
- Added: `InviteToken` interface `{ id, email, expiresAt, createdAt }`
- Added: `InviteTokensSection` component with:
  - On-mount fetch of active invites via `GET /api/admin/invites`
  - Email `<Input>` (placeholder `admin.inviteEmailPlaceholder`) + "Send Invite" `<Button>` with `Loader2` spinner while submitting
  - Table columns: Email (`admin.inviteColEmail`), Sent (`admin.inviteColSent`), Expires (`admin.inviteColExpires`), revoke icon
  - Revoke: `Trash2` icon button, `size="icon" variant="ghost"`, `className="text-destructive hover:text-destructive"`, `aria-label` from `admin.revokeInviteAriaLabel` with email interpolation — direct DELETE, no confirmation dialog (D-07)
  - SMTP error mapping: `error === 'SMTP not configured.'` → `admin.inviteSMTPMissing`
  - Success: `admin.inviteSentSuccess` with email interpolation, clears input, refreshes table
  - Revoke success: `admin.inviteRevokeSuccess`, optimistic row removal via `setTokens(prev.filter(...))`
- Updated: `AdminPage` render replaces `<InviteCodesSection />` with `<InviteTokensSection />`
- Updated: `formatDate` changed from `toISOString().slice(0,10)` to `toLocaleDateString()` per UI-SPEC date formatting

**AdminPage.test.tsx created (TDD RED/GREEN):**
- 5 tests covering EMAIL-03, EMAIL-07, EMAIL-08
- Mocks: `@/context/AuthContext` (admin user), `@/lib/api` (get/post/delete via `vi.hoisted`), `sonner` (named toast mocks via `vi.hoisted`)
- EMAIL-07: asserts "Email Invitations" section title, "Sent" column header (unique), "Expires" column, pending invite email row
- EMAIL-03: fireEvent types email into input, clicks "Send Invite" button, asserts `api.post` called with `{ email }`, asserts `toast.success('Invitation sent to invited@example.com.')`
- EMAIL-08: asserts revoke button found by `aria-label="Revoke invitation for newuser@example.com"`, `api.delete` called with `/api/admin/invites/inv-1`

## Verification Results

| Check | Status |
|-------|--------|
| `vitest run src/pages/__tests__/AdminPage.test.tsx` (5 tests) | PASS |
| `vitest run` full suite (138 tests, 17 files) | PASS |
| `typecheck` | PASS (0 errors) |
| RED confirmed (before Task 2) | 5 tests failed as expected |

## Commits

| Hash | Type | Description |
|------|------|-------------|
| a800ea3 | test(24-05) | add failing AdminPage tests for InviteTokensSection (EMAIL-03/07/08) |
| 6631350 | feat(24-05) | replace InviteCodesSection with InviteTokensSection in AdminPage |

## Deviations from Plan

### Auto-adjusted Implementation Details

**1. [Rule 1 - Style] formatDate updated to toLocaleDateString()**
- **Found during:** Task 2
- **Issue:** Original `formatDate` used `toISOString().slice(0,10)` which produces ISO dates (e.g., "2026-07-04"). UI-SPEC Surface 1 specifies "locale-aware short date strings" via `toLocaleDateString()`.
- **Fix:** Changed `formatDate` to `new Date(dateStr).toLocaleDateString()`. This affects both UsersSection joined dates and InviteTokensSection sent/expires dates.
- **Files modified:** `apps/frontend/src/pages/AdminPage.tsx`
- **Commit:** 6631350

No other deviations. Plan executed exactly as written for the remaining items.

## Known Stubs

None. All invite section data is wired to real API endpoints (`/api/admin/invites`, DELETE by id). No placeholder values flow to UI rendering.

## Threat Flags

No new threat surface introduced. InviteTokensSection operates exclusively within the existing AdminRoute guard (T-24-18). Emails are rendered as React text children (auto-escaped, T-24-19). The token value is never fetched or displayed in the admin list (T-24-20 mitigated in Plan 03 backend).

## Self-Check: PASSED

| Item | Status |
|------|--------|
| `apps/frontend/src/pages/__tests__/AdminPage.test.tsx` exists | FOUND |
| `apps/frontend/src/pages/AdminPage.tsx` exists | FOUND |
| `24-05-SUMMARY.md` exists | FOUND |
| commit a800ea3 (test RED) | FOUND |
| commit 6631350 (feat GREEN) | FOUND |
| No `InviteCodesSection`, `getInviteCodeStatus`, `InviteStatusBadge` in AdminPage.tsx | CLEAN |
| `InviteTokensSection` defined and rendered in AdminPage.tsx | CONFIRMED |
