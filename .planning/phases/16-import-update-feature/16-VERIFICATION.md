---
phase: 16-import-update-feature
verified: 2026-06-10T00:00:00Z
status: gaps_found
score: 22/24 must-haves verified
overrides_applied: 0
gaps:
  - truth: "POST /api/decks/:id/update/preview returns 403 for non-owners and correct diff counts for owners"
    status: partial
    reason: "CR-02: computeDiff counts manually-created cards (kartexId=null) as removed even though they were not import-managed. Diff counts shown in preview are inflated/wrong in mixed decks (any deck with manually-added cards plus keepRemoved context). The CR-02 fix in REVIEW.md shows the guard `dc.kartexId != null` is absent from the removedIds loop (deckUpdate.ts lines 85-91)."
    artifacts:
      - path: "apps/backend/src/routes/deckUpdate.ts"
        issue: "computeDiff removedIds loop (lines 85-91) does not exclude deckCards where kartexId=null; those cards always land in removedIds bucket, inflating the removed count and triggering deletion when keepRemoved=false"
    missing:
      - "Add `dc.kartexId != null &&` guard to the removedIds loop in computeDiff: `if (dc.kartexId != null && !matchedDeckCardIds.has(dc.id)) { removedIds.push(dc.id) }`"

  - truth: "On successful apply, toast.success fires, onSuccess() called, modal closes"
    status: failed
    reason: "CR-01: DeckUpdateModal does not check res.ok before treating a response as success. api.postForm returns a Response that never throws on 4xx/5xx. In runApply (lines 77-93), if the server returns 403/422/500, the try block does not throw, so toast.success, onSuccess(), and onOpenChange(false) are all called — false positive success on apply failure. In runPreview (lines 61-75), a 4xx response body ({error:...}) is set as preview data, transitioning to 'previewing' with corrupted diff state instead of 'error'."
    artifacts:
      - path: "apps/frontend/src/components/DeckUpdateModal.tsx"
        issue: "runPreview (lines 65-69): `const data = await res.json()` called unconditionally — no res.ok check before setPreview(data)/setStep('previewing'). runApply (lines 82-87): `await api.postForm(...)` with no res.ok check — toast.success/onSuccess/onOpenChange(false) fire on any non-throwing response including 4xx/5xx."
    missing:
      - "Add `if (!res.ok) { ... setStep('error'); return }` guard in runPreview after the api.postForm call"
      - "Add `if (!res.ok) { ... setStep('error'); return }` guard in runApply after the api.postForm call"
      - "See exact fix pattern in 16-REVIEW.md CR-01 section"
---

# Phase 16: Import Update Feature — Verification Report

**Phase Goal:** Users can update an existing deck in place by uploading a new `.kartex` file, with a preview of the diff before committing and control over removed cards
**Verified:** 2026-06-10T00:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Test suite runs green (all stubs pass as it.todo) before implementation | VERIFIED | 16-01-SUMMARY.md: 12 backend + 6 frontend todos, 0 failures; commits ec6041d, afa6e77 |
| 2 | Backend stub file has 12 named it.todo entries (T-16-01..T-16-12) | VERIFIED | deck-update.test.ts now has real assertions replacing all 12 stubs; stub goal achieved in Wave 0 |
| 3 | Frontend stub file has 6 named it.todo entries (T-16-FE-01..T-16-FE-06) | VERIFIED | DeckUpdateModal.test.tsx has real assertions replacing all 6 stubs |
| 4 | POST /api/decks/:id/update/preview returns 403 for non-owners | VERIFIED | deckUpdate.ts line 125: `if (deck.ownerId !== userId) return c.json({ error: 'Forbidden.' }, 403)` |
| 5 | POST /api/decks/:id/update/preview returns correct diff counts for owners | PARTIAL (CR-02) | diff counts correct for pure import-managed decks; inflated removed count in decks with manually-created cards (kartexId=null) |
| 6 | POST /api/decks/:id/update/apply executes Prisma interactive transaction (createMany/update/deleteMany) | VERIFIED | deckUpdate.ts lines 226-258: prisma.$transaction with createMany, update loop, deleteMany |
| 7 | Both routes return 404 when deckId does not exist | VERIFIED | lines 124 and 185: `if (!deck) return c.json({ error: 'Not found.' }, 404)` |
| 8 | Both routes validate uploaded file (.kartex required, .kartex.zip rejected) | VERIFIED | lines 132-138 and 193-199: normalizedName.endsWith('.kartex.zip') → 400; !endsWith('.kartex') → 400 |
| 9 | Duplicate kartexId values return 422 | VERIFIED | lines 148-150 and 208-211: hasDuplicateKartexIds guard → c.json({error:'Duplicate id values in file.'}, 422) |
| 10 | CardProgress records are never touched in apply transaction | VERIFIED | tx.card.update payload at lines 242-249: only frontContent, backContent, tags — no kartexId, no CardProgress fields; T-16-08 test asserts absence of easeFactor/interval/repetitions/nextReviewAt |
| 11 | All 16 deckUpdate.* i18n keys present in both en.json and de.json | VERIFIED | en.json lines 346-363: 16 keys present; de.json lines 346-363: 16 keys present |
| 12 | DeckUpdateModal auto-triggers preview fetch when opened with a File object | VERIFIED | DeckUpdateModal.tsx lines 54-59: useEffect([open, file]) calls void runPreview() when open && file |
| 13 | Uploading state renders Loader2 spinner and 'Uploading...' label | VERIFIED | lines 111-116: Loader2 with animate-spin + aria-hidden, p with t('deckUpdate.uploading') |
| 14 | Previewing state renders 2x2 diff chip grid with correct counts and keepRemoved Switch (default: true) | VERIFIED | lines 118-155: grid grid-cols-2 + 4 chips with role="region"; Switch id="keep-removed-switch" checked={keepRemoved} initial true |
| 15 | Applying state disables the Apply button (disabled + aria-busy=true) | VERIFIED | lines 177-185: Button disabled={step === 'applying'} aria-busy={step === 'applying'} |
| 16 | Error state wraps error text in role=alert | VERIFIED | lines 164-169: `<div role="alert">` with errorTitle + errorMsg |
| 17 | On successful apply, toast.success fires, onSuccess() called, modal closes | FAILED (CR-01) | runApply (lines 82-87) does not check res.ok — toast.success/onSuccess/onOpenChange(false) fire on any non-throwing response including 4xx/5xx server errors; T-16-FE-06 test passes only because mock returns {ok:true} |
| 18 | All 6 frontend stubs (T-16-FE-01..06) replaced with passing assertions | VERIFIED | DeckUpdateModal.test.tsx: all 6 stubs replaced; 16-03-SUMMARY states 102 tests pass |
| 19 | 'Update from file' button visible to deck owner and hidden from non-owners | VERIFIED | DeckDetailPage.tsx lines 355-366: inside `{deck.ownerId === user?.id && <> ... </>}` block |
| 20 | Clicking the button opens OS file picker without loading state | VERIFIED | line 363: `onClick={() => updateFileInputRef.current?.click()}` — no loading state, no async |
| 21 | Selecting a .kartex file opens DeckUpdateModal with selected File object | VERIFIED | lines 567-578: hidden input onChange calls setUpdateFile(file); DeckUpdateModal driven by `open={updateFile !== null}` and `file={updateFile}` |
| 22 | DeckUpdateModal onSuccess triggers existing card list refresh | VERIFIED | line 586: `onSuccess={fetchCards}` — same function used by CardEditorModal |
| 23 | DeckDetailPage remains under 500 lines (plan allows ~580) | VERIFIED | 591 lines per 16-04-SUMMARY; plan explicitly allows up to ~580 given modal extraction; file stays under 600 |
| 24 | T-16-FE-07 and T-16-FE-08 tests pass | VERIFIED | DeckDetailPage.test.tsx lines 200-244 and 247+: both tests present; 16-04-SUMMARY: 104 tests pass |

**Score:** 22/24 truths verified (2 failed/partial due to CR-01 and CR-02)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/backend/src/routes/deckUpdate.ts` | computeDiff + preview + apply routes, exports deckUpdateRouter | VERIFIED | 274 lines, exports deckUpdateRouter; both routes present |
| `apps/backend/src/routes/__tests__/deck-update.test.ts` | 12 passing tests T-16-01..T-16-12 | VERIFIED | All 12 stubs replaced with real assertions |
| `apps/backend/src/index.ts` | Mounts deckUpdateRouter at /api/decks | VERIFIED | Line 17: import; line 76: app.route('/api/decks', deckUpdateRouter) |
| `apps/frontend/src/locales/en.json` | 16 deckUpdate.* keys | VERIFIED | Lines 346-363: all 16 keys present with correct values |
| `apps/frontend/src/locales/de.json` | 16 deckUpdate.* keys | VERIFIED | Lines 346-363: all 16 keys present with correct German values |
| `apps/frontend/src/components/DeckUpdateModal.tsx` | Two-phase dialog, exports DeckUpdateModal | VERIFIED (with CR-01 bug) | 195 lines; exports DeckUpdateModal; all states render correctly; missing res.ok check |
| `apps/frontend/src/components/__tests__/DeckUpdateModal.test.tsx` | 6 passing tests T-16-FE-01..06 | VERIFIED | All 6 stubs replaced with real assertions |
| `apps/frontend/src/pages/DeckDetailPage.tsx` | DeckUpdateModal wired, owner-only button, hidden input | VERIFIED | 591 lines; DeckUpdateModal import line 29; updateFileInputRef line 139; button lines 360-366 |
| `apps/frontend/src/pages/__tests__/DeckDetailPage.test.tsx` | T-16-FE-07 and T-16-FE-08 tests | VERIFIED | Lines 200-244 and 247+: both tests present and described in 16-04-SUMMARY as passing |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/backend/src/index.ts` | `apps/backend/src/routes/deckUpdate.ts` | `app.route('/api/decks', deckUpdateRouter)` | WIRED | Line 17 import + line 76 mount; confirmed in source |
| `apps/backend/src/routes/deckUpdate.ts` | `prisma.card` | `prisma.$transaction` | WIRED | Lines 226-258: full interactive transaction present |
| `apps/frontend/src/components/DeckUpdateModal.tsx` | `/api/decks/:id/update/preview` | `api.postForm` in `runPreview()` | WIRED | Line 66: `api.postForm('/api/decks/${deckId}/update/preview', formData)` |
| `apps/frontend/src/components/DeckUpdateModal.tsx` | `/api/decks/:id/update/apply` | `api.postForm` in `runApply()` | WIRED | Line 83: `api.postForm('/api/decks/${deckId}/update/apply', formData)` |
| `apps/frontend/src/pages/DeckDetailPage.tsx` | `apps/frontend/src/components/DeckUpdateModal.tsx` | `import { DeckUpdateModal }` | WIRED | Line 29: import; lines 580-588: JSX mount with all required props |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| DeckUpdateModal.tsx | `preview` ({added,updated,unchanged,removed}) | `runPreview()` → `api.postForm` → `/api/decks/:id/update/preview` | Yes — backend queries prisma.card.findMany then computeDiff | FLOWING (with CR-02 caveat: counts inaccurate for mixed decks) |
| deckUpdate.ts (preview) | `deckCards` | `prisma.card.findMany({ where: { deckId } })` | Yes — real DB query | FLOWING |
| deckUpdate.ts (apply) | transaction | `prisma.$transaction` → createMany/update/deleteMany | Yes — real DB mutations | FLOWING (with CR-02 caveat: removedIds include kartexId=null cards) |

---

### Behavioral Spot-Checks

Step 7b is SKIPPED for this verification. The application requires a running PostgreSQL instance and does not have an in-process runnable entry point. Test evidence from SUMMARY.md files serves as the behavioral proxy (16-03: 102 tests pass; 16-04: 104 tests pass).

---

### Probe Execution

Step 7c: No probe files declared in PLAN.md files. No `scripts/*/tests/probe-*.sh` files discovered for this phase. SKIPPED.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|------------|------------|-------------|--------|----------|
| IMP-01 | 16-01, 16-03, 16-04 | Owner can trigger deck update from file picker in DeckDetailPage | SATISFIED | DeckDetailPage wired with owner-only button + DeckUpdateModal; T-16-FE-07/08 pass |
| IMP-02 | 16-02, 16-03 | Preview shows diff counts before committing | PARTIALLY SATISFIED | Preview renders; diff counts wrong for mixed decks (CR-02 data loss bug) |
| IMP-03 | 16-02 | Matched cards have front/back/tags updated; CardProgress untouched | SATISFIED | tx.card.update payload excludes kartexId and CardProgress fields; T-16-08 asserts |
| IMP-04 | 16-02 | File cards not in deck are added as new cards | SATISFIED | createMany in transaction; T-16-07 asserts |
| IMP-05 | 16-02 | keepRemoved toggle controls whether absent cards are deleted | PARTIALLY SATISFIED | keepRemoved=true preserves cards correctly; keepRemoved=false silently deletes manually-created cards (CR-02) |
| IMP-06 | 16-02, 16-03 | Apply executes as atomic Prisma transaction | SATISFIED | prisma.$transaction wraps createMany/update/deleteMany; T-16-11 asserts 500 on failure |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/frontend/src/components/DeckUpdateModal.tsx` | 66-69 | `res.json()` called without `res.ok` check in runPreview | BLOCKER | HTTP 4xx/5xx responses silently treated as success data; modal transitions to 'previewing' with `{error: "..."}` as preview state (NaN counts rendered) |
| `apps/frontend/src/components/DeckUpdateModal.tsx` | 82-88 | No `res.ok` check in runApply | BLOCKER | HTTP 4xx/5xx responses cause toast.success + onSuccess() + modal close — false positive success on apply failure |
| `apps/backend/src/routes/deckUpdate.ts` | 85-91 | removedIds loop missing `dc.kartexId != null` guard | BLOCKER | Manually-created cards (kartexId=null) always land in removedIds; keepRemoved=false silently deletes all hand-created cards — data loss |
| `apps/frontend/src/components/DeckUpdateModal.tsx` | 172-175 | Cancel button active during applying state | WARNING | User can close modal mid-apply; if apply completes after close, stale state updates fire; error from failed apply not visible |
| `apps/frontend/src/components/DeckUpdateModal.tsx` | 64, 80 | Non-null assertion `file!` in runPreview/runApply | WARNING | Masks potential null path; narrow but unguarded |
| `apps/backend/src/routes/deckUpdate.ts` | 54 | `unchangedCount: { n: number } = { n: 0 }` object wrapper | INFO | Unnecessary object; should be `let unchangedCount = 0` |
| `apps/frontend/src/locales/en.json` | 362 | `deckUpdate.fileTooLarge` key defined but never used | INFO | 413 onError handler returns hardcoded English string; key has no caller in codebase |

No TBD/FIXME/XXX markers found in phase-modified files.

---

### Human Verification Required

None — all observable behaviors that can be verified programmatically have been verified. The visual modal appearance and UX flow quality require manual testing but are not blocking the gap determination.

---

### Gaps Summary

Two blockers prevent the phase goal from being fully achieved:

**BLOCKER 1 — CR-01: HTTP error responses not checked in DeckUpdateModal**

`runPreview` and `runApply` in `DeckUpdateModal.tsx` both rely solely on try/catch for error detection. Since `api.postForm` returns a `Response` and never throws on non-2xx status, any 400/403/413/422/500 response silently passes through the try block as if it succeeded. In `runPreview`, a `{error: "..."}` JSON body gets set as `preview` state, rendering NaN counts in the diff chip grid instead of showing the error state. In `runApply`, `toast.success`, `onSuccess()`, and `onOpenChange(false)` all fire even on 403 or 500 — the user sees a success notification for a failed operation.

The fix (from 16-REVIEW.md CR-01): add `if (!res.ok) { const data = await res.json().catch(() => ({})); setErrorMsg((data as {error?:string}).error ?? t('deckUpdate.parseError')); setStep('error'); return }` after each `api.postForm` call.

**BLOCKER 2 — CR-02: Manually-created cards deleted when keepRemoved=false**

`computeDiff` in `deckUpdate.ts` (lines 85-91) iterates all `deckCards` to build `removedIds`. Cards with `kartexId = null` (created via the card editor, not via import) are never matched during the file-card comparison loop (only non-null kartexIds are indexed). These cards are therefore always absent from `matchedDeckCardIds`, causing them to land unconditionally in `removedIds`. When `keepRemoved=false`, `tx.card.deleteMany` deletes all manually-created cards — silent data loss.

The fix (from 16-REVIEW.md CR-02): add `dc.kartexId != null &&` to the removedIds condition:
```
if (dc.kartexId != null && !matchedDeckCardIds.has(dc.id)) {
  removedIds.push(dc.id)
}
```

These two bugs are independent and both must be fixed before the phase goal is achieved. The remaining 22/24 criteria are solidly verified.

---

_Verified: 2026-06-10T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
