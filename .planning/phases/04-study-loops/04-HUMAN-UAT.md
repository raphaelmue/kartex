---
status: partial
phase: 04-study-loops
source: [04-VERIFICATION.md]
started: 2026-05-28T17:35:00Z
updated: 2026-05-28T17:35:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Dashboard with real data
expected: Hero shows large due count, per-deck table groups cards by deck with clickable names, "Reviewed today" and "Streak" stat chips show correct values from the database
result: [pending]

### 2. Flip and rate flow in browser
expected: CSS 3D Y-axis flip animates smoothly on click/Space, rating buttons (Again/Hard/Good/Easy) appear only after flip, keyboard shortcuts 1-4 fire ratings, session completion screen shows per-rating breakdown and Return to Dashboard button
result: [pending]

### 3. Exam mode — no DB writes
expected: POST /api/study/rate is NOT called during an exam session (verify via browser Network tab), countdown timer is visible and counts down, expires with banner
result: [pending]

### 4. Dashboard empty state
expected: When no cards are due, "You're all caught up!" text appears with CheckCircle2 icon and no Start Studying button
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
