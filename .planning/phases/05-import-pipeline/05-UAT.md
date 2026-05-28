---
status: testing
phase: 05-import-pipeline
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md]
started: 2026-05-28T20:00:00Z
updated: 2026-05-28T20:06:00Z
---

## Current Test

number: 2
name: Access Import Page
expected: |
  Navigate to /import while logged in. A file drop zone appears with instructions to
  drag a .kartex or .kartex.zip file (or click to browse). No error messages are shown
  on page load.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server/service. Clear ephemeral state (temp DBs, caches, lock files). Start the application from scratch (e.g., docker compose up or yarn dev). The backend boots without errors, any pending migrations complete, and a primary query — health check, homepage load, or basic API call — returns live data.
result: pass

### 2. Access Import Page
expected: Navigate to /import while logged in. A file drop zone appears with instructions to drag a .kartex or .kartex.zip file (or click to browse). No error messages are shown on page load.
result: [pending]

### 3. Client-side File Type Validation
expected: Try uploading a file with the wrong extension (e.g. a .txt or .pdf). An error message appears immediately — before any network request — telling you the file type is not supported.
result: [pending]

### 4. Parse & Preview a .kartex File
expected: Upload a valid .kartex file. The UI transitions from upload → parsing → preview. A list of parsed cards appears, each showing front and back content. The deck name input is pre-filled from the file's YAML header. A card count is visible.
result: [pending]

### 5. Amber Warnings for Incomplete Cards
expected: Upload a .kartex file that has one or more cards missing the back: field (or another parse issue). An amber warning banner appears in the preview state listing the skipped cards or warnings. The rest of the valid cards are still shown for import.
result: [pending]

### 6. Edit Deck Name Before Import
expected: In the preview state, the deck name input field is editable. Change the deck name to something different. Click Import — the created deck uses the new name you typed, not the original header value.
result: [pending]

### 7. Import .kartex File and View Deck
expected: With a valid .kartex file previewed, click Import. The UI shows a loading/importing state, then transitions to SUCCESS. A "View Deck" button appears. Clicking it navigates to the deck page showing the imported cards with their front/back content intact.
result: [pending]

### 8. Import .kartex.zip File
expected: Upload a .kartex.zip bundle. The UI shows an informational note that card preview is not available for .kartex.zip bundles (server-side extraction only). An Import button is still present. Clicking it submits the bundle, creates the deck, and transitions to the SUCCESS state.
result: [pending]

## Summary

total: 8
passed: 1
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps

[none yet]
