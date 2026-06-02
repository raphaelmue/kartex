---
status: partial
phase: 11-sm2-preset-modes
source: [11-VERIFICATION.md]
started: 2026-06-02T00:00:00.000Z
updated: 2026-06-02T00:00:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Settings Page Persistence
expected: Study mode selection survives logout and re-login — the selected mode (Normal/Intensive/Exam Prep) is stored server-side and returned by GET /api/auth/me on next session.
result: [pending]

### 2. Interval Compression Functional Correctness
expected: When Intensive mode is active, POST /api/study/rate returns a nextReview date that is approximately half the interval compared to Normal mode on the same card/rating input. Exam Prep mode returns approximately one-quarter the interval.
result: [pending]

### 3. Mode Indicator Badge Visual Position
expected: When study mode is Intensive or Exam Prep, a Badge with the mode name is visible in the session header, visually adjacent to the session progress counter (e.g., "Card 1 of 10").
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
