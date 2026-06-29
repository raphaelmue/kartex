---
status: complete
phase: 25-password-reset
source: 25-01-SUMMARY.md, 25-02-SUMMARY.md, 25-03-SUMMARY.md, 25-04-SUMMARY.md, 25-05-SUMMARY.md
started: 2026-06-29T12:30:00Z
updated: 2026-06-29T12:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Forgot-password link on login page
expected: On the /login page, below the login button, there is a "Forgot password?" link. Clicking it navigates to /forgot-password.
result: pass

### 2. Forgot password — success state (no enumeration)
expected: On /forgot-password, submit any email address (registered or not). The page transitions to a "Check your email" success state without ever showing an error or indicating whether the email exists.
result: pass

### 3. Invalid reset link — error state
expected: Navigate directly to /reset-password/thisisafaketoken. The page shows a human-readable error card ("This reset link is not valid.") with a "Back to login" link — not a blank page or crash.
result: pass

### 4. Admin dropdown has reset action
expected: In the Admin panel → Users section, opening the 3-dot dropdown for any user shows "Send password reset email" as the first item, then a separator, then "Delete user" (red).
result: pass

### 5. Admin reset — NO_EMAIL error
expected: Trigger "Send password reset email" for a user who has no email address configured. A toast appears with an error message like "No email address" (not a generic error).
result: pass

### 6. Admin reset — success (requires SMTP)
expected: Trigger "Send password reset email" for a user who has an email. A success toast appears and a reset email is sent to that address.
result: pass

### 7. Post-reset login toast (requires valid token)
expected: After completing a password reset (using a valid emailed link), the app redirects to /login and shows a "Password reset successfully. Please log in." toast.
result: issue
reported: "pass, however, the reset password button says auth.resetPassword"
severity: minor

## Summary

total: 7
passed: 6
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Reset password submit button shows 'Reset password' text"
  status: fixed
  reason: "User reported: the reset password button says auth.resetPassword"
  severity: minor
  test: 7
  root_cause: "auth.resetPassword key missing from en.json and de.json — component referenced key that was never added in Plan 25-02"
  artifacts:
    - path: "apps/frontend/src/locales/en.json"
      issue: "auth.resetPassword key missing; added 'Reset password'"
    - path: "apps/frontend/src/locales/de.json"
      issue: "auth.resetPassword key missing; added 'Passwort zurücksetzen'"
  missing:
    - "auth.resetPassword key in both locale files"
  debug_session: ""
