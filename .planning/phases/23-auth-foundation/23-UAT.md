---
status: testing
phase: 23-auth-foundation
source: [23-VERIFICATION.md]
started: 2026-06-24T00:00:00Z
updated: 2026-06-24T00:00:00Z
---

## Current Test

number: 1
name: Email column display in admin users table
expected: |
  The admin users table has an "Email" column. Each row shows the user's email address,
  or an em-dash (—) for users without an email set.
awaiting: user response

## Tests

### 1. Email column display (ADMIN-05)
expected: Users table has "Email" column; shows email or "—" for null
result: [pending]

### 2. Two-step delete dialog UX (ADMIN-02, ADMIN-03)
expected: 3-dot menu → "Delete user" opens dialog with correct title/desc; confirm button disabled until exact username typed; deletion removes user from list
result: [pending]

### 3. Self-delete guard toast (ADMIN-04)
expected: Attempting to delete own account shows toast "You cannot delete your own account"
result: [pending]

### 4. Last-admin guard toast (ADMIN-04)
expected: Attempting to delete the sole admin shows toast "Cannot delete the last admin account"
result: [pending]

### 5. Mailer no-email guard toast (EMAIL-02)
expected: Clicking "Send test email" when admin has no email set shows toast "Set your email address first"
result: [pending]

### 6. Mailer happy path (EMAIL-02)
expected: With SMTP configured and admin email set, clicking "Send test email" shows toast "Test email sent" and delivers the email
result: [pending]

### 7. German i18n completeness
expected: Switching language to German shows all 16 new admin strings in German — no raw admin.* keys visible
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
