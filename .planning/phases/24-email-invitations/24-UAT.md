---
status: complete
phase: 24-email-invitations
source: [24-01-SUMMARY.md, 24-02-SUMMARY.md, 24-03-SUMMARY.md, 24-04-SUMMARY.md, 24-05-SUMMARY.md, 24-06-SUMMARY.md, 24-07-SUMMARY.md]
started: 2026-06-28T15:30:00Z
updated: 2026-06-29T10:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server. Start the application from scratch (docker compose up, or yarn dev in the monorepo). The server boots without errors, database migrations run, and a call to GET /api/health returns {"status":"ok"}.
result: pass

### 2. Admin panel — Email Invitations section visible
expected: Open the admin panel (/admin). An "Email Invitations" section is visible with an email input field and a "Send Invite" button. Below the form, a table shows columns "Email", "Sent", and "Expires". If no invites exist yet, an empty state message is shown.
result: pass

### 3. Send invite — success or SMTP-not-configured feedback
expected: Type a valid email address into the invite input and click "Send Invite". Either (a) SMTP is configured — a success toast "Invitation sent to <email>." appears and the input clears, OR (b) SMTP is not configured — an error toast "SMTP not configured" appears. Either outcome is acceptable. What should NOT happen: a raw error message, a blank/silent failure, or a crash.
result: pass

### 4. Pending invites table — row visible after successful send
expected: If test 3 succeeded (SMTP configured), the pending invites table immediately refreshes and shows the newly sent invite as a row with the correct email address, a Sent date, and an Expires date roughly 7 days from now.
result: pass

### 5. Revoke a pending invite
expected: Click the trash icon (🗑) next to a pending invite row. The row disappears from the table immediately and a success toast "Invitation revoked." appears. No confirmation dialog is shown.
result: pass

### 6. Invite link publicly accessible (no auth redirect)
expected: Open an incognito/private browser window (no session). Navigate to /invite/<any-token> (use a real token from the invite email, or type /invite/sometoken). The page should NOT redirect to /login or show "Your session has expired." Instead it should show either a registration form (valid token) or an inline error card (invalid/expired token). The important thing is it does NOT require auth.
result: pass

### 7. Invalid token shows inline error card
expected: Navigate to /invite/invalid-fake-token (no session needed). The page shows an inline error card with the message "This invite link is not valid." — no registration form, no redirect to login, no crash or blank page.
result: pass

### 8. Successful registration via invite link
expected: Navigate to /invite/<valid-token> (a token from a sent invite email, or one inserted manually into the DB). The page shows a registration form with the invited email address pre-filled in a disabled (read-only) input. Enter a username and password, then click the register button. The user is registered and redirected to the login page.
result: pass

### 9. Used token shows "already been used" error
expected: After completing test 8 (successful registration), open the same /invite/<token> URL again. The page shows an inline error card "This invite has already been used." — no registration form, no redirect, no crash.
result: pass

<!-- Auto-passed by unit tests (plan 06 coverage block, human_judgment: false) -->

### A1. Auth bypass — invite route reachable without cookie (D1)
expected: GET /api/invites/:token returns 200 (or 400 for invalid token) without an access_token cookie — not 401.
result: pass
source: automated
coverage_id: D1

### A2. Auth bypass — protected routes still require auth (D2)
expected: GET /api/decks and GET /api/admin/invites return 401 without an access_token cookie.
result: pass
source: automated
coverage_id: D2

## Summary

total: 11
passed: 9
issues: 0
pending: 0
skipped: 0
blocked: 0
skipped: 0
blocked: 0

## Gaps (resolved)

- truth: "/invite/<token> is publicly accessible without authentication — no redirect to /login"
  status: failed
  reason: "User reported: still directing to login"
  severity: major
  test: 6
  root_cause: "AuthContext uses api.get('/api/auth/me') on initial load. api wrapper intercepts the 401, tries POST /api/auth/refresh (also 401 in incognito), then calls onAuthFailure() → navigate('/login'). The auth failure handler is designed for mid-session expiry but fires on first load for unauthenticated users, including on public routes like /invite/:token."
  artifacts:
    - path: "apps/frontend/src/context/AuthContext.tsx"
      issue: "useEffect uses api.get('/api/auth/me') — api wrapper triggers onAuthFailure on 401, even during initial hydration"
    - path: "apps/frontend/src/lib/api.ts"
      issue: "baseFetch calls onAuthFailure() when refresh fails; no way to suppress this for initial page load"
  missing:
    - "Replace api.get('/api/auth/me') in AuthContext useEffect with plain fetch() calls that handle 401 silently (not logged in) and try refresh without triggering onAuthFailure"
  debug_session: ""

- truth: "/invite/invalid-fake-token shows inline error card, not a login redirect"
  status: failed
  reason: "User reported: still redirecting"
  severity: major
  test: 7
  root_cause: "Same root cause as test 6 — onAuthFailure fires on initial load before InviteRegisterPage can render"
  artifacts:
    - path: "apps/frontend/src/context/AuthContext.tsx"
      issue: "Same as test 6"
  missing:
    - "Same fix as test 6 — once AuthContext hydration no longer fires onAuthFailure, InviteRegisterPage renders and handles the token error inline"
  debug_session: ""
