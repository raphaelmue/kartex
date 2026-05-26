---
status: partial
phase: 01-foundation-auth
source: [01-VERIFICATION.md]
started: 2026-05-26T10:00:00Z
updated: 2026-05-26T10:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Full Stack Startup and SPA Rendering
expected: Copy `.env.example` → `.env`, run `docker compose up -d`, navigate to `http://localhost:3000`. The React SPA loads — /login renders a card with "Sign in" heading and "Welcome back." description. No sidebar visible. Page title "Sign in — Kartex".
result: [pending]

### 2. Invite Code Registration Flow
expected: Get invite code from `docker compose logs backend`. Register at /register with valid credentials. Redirect to /login with toast "Account created. Please sign in." Reusing the code shows inline error "Invalid or expired invite code."
result: [pending]

### 3. Session Persistence After Browser Refresh
expected: Log in, close and reopen the tab. App lands on /dashboard (Coming soon) without redirecting to /login. Session hydrated from GET /api/auth/me via httpOnly cookie.
result: [pending]

### 4. Silent Token Refresh
expected: Log in, manually corrupt the access_token cookie via DevTools, navigate to /admin. App silently calls POST /api/auth/refresh, retries original request, renders admin page without login prompt.
result: [pending]

### 5. Admin Page End-to-End
expected: Generate invite code (14-day expiry) → appears in table as "Active". Register new user with it → code shows "Used". Role toggle promotes/demotes user. Deactivate button absent for own row.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
