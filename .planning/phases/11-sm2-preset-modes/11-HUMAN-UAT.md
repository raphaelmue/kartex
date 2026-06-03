---
status: complete
phase: 11-sm2-preset-modes
source: [11-VERIFICATION.md]
started: 2026-06-02T00:00:00.000Z
updated: 2026-06-03T00:00:00.000Z
---

## Current Test

[complete]

## Tests

### 1. Settings Page Persistence
expected: Study mode selection survives logout and re-login — the selected mode (Normal/Intensive/Exam Prep) is stored server-side and returned by GET /api/auth/me on next session.
result: PASS — after selecting Intensive, logging out, and logging back in, the Settings page showed Intensive pre-selected.
note: Required fix — POST /login and POST /refresh were not returning studyMode in their response; setUser was called with incomplete data. Fixed by including all user fields in both responses (commit fc7b3b9).

### 2. Interval Compression Functional Correctness
expected: When Intensive mode is active, POST /api/study/rate returns a nextReview date that is approximately half the interval compared to Normal mode on the same card/rating input. Exam Prep mode returns approximately one-quarter the interval.
result: PASS — Normal (interval=10): nextReview +10 days; Intensive (interval=10): nextReview +5 days. Raw interval stored identically in both cases.

### 3. Mode Indicator Badge Visual Position
expected: When study mode is Intensive or Exam Prep, a Badge with the mode name is visible in the session header, visually adjacent to the session progress counter (e.g., "Card 1 of 10").
result: PASS after fix — badge was visible but not vertically aligned with the "Card X of Y" label. SessionProgress had mb-4 on its <p> element which offset it from the Badge in the flex row. Fixed by moving mb-4 to the wrapper div (commit 5f389f9).

## Summary

total: 3
passed: 3
issues: 2
pending: 0
skipped: 0
blocked: 0

## Issues Found and Fixed

| # | Description | Fix | Commit |
|---|-------------|-----|--------|
| 1 | POST /login and POST /refresh omitted studyMode from response — setUser called with incomplete user data, mode showed as Normal after login | Added all user fields to both login/refresh responses | fc7b3b9 |
| 2 | Badge not vertically aligned with SessionProgress — mb-4 on <p> in SessionProgress offset it from badge in flex row | Moved mb-4 from SessionProgress component to wrapper div in StudySessionPage | 5f389f9 |

## Gaps
