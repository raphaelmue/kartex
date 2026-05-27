---
status: partial
phase: 03-rich-content-rendering
source: [03-VERIFICATION.md]
started: 2026-05-27T16:50:00Z
updated: 2026-05-27T16:50:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Typst WASM renders in a real browser
expected: A 'Rendering...' spinner with a spinning Loader2 icon appears, then the Typst expression renders as an inline SVG without a page reload.
result: [pending]

### 2. File upload + cursor position insertion works
expected: The upload succeeds (toast 'Image uploaded' appears), and the text '![image](media://uuid.ext)' is inserted at the cursor position in the front content textarea.
result: [pending]

### 3. Media serving without auth cookie (image in card face)
expected: The image appears inline in the card, loaded from /api/media/some-uuid.png without requiring an auth cookie.
result: [pending]

### 4. YouTube iframe renders (pending Phase 6 Nginx CSP)
expected: An embedded YouTube player (iframe) appears. Noted: CSP frame-src directive is a Phase 6 concern — iframe renders in code but requires Nginx config.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
