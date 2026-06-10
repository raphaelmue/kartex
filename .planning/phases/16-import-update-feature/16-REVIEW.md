---
phase: 16
status: has-findings
critical: 2
warning: 3
info: 2
reviewed_files: 6
files_reviewed_list:
  - apps/backend/src/routes/deckUpdate.ts
  - apps/backend/src/index.ts
  - apps/frontend/src/components/DeckUpdateModal.tsx
  - apps/frontend/src/pages/DeckDetailPage.tsx
  - apps/frontend/src/locales/en.json
  - apps/frontend/src/locales/de.json
---

# Phase 16: Code Review Report

**Reviewed:** 2026-06-10T00:00:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** has-findings

## Summary

Phase 16 implements the deck import-update feature: two new backend POST endpoints (`/api/decks/:id/update/preview` and `/api/decks/:id/update/apply`), a two-phase frontend modal (`DeckUpdateModal`), wiring in `DeckDetailPage`, and 16 i18n keys in both locale files.

The backend route structure is sound — JWT auth is correctly inherited, owner gate precedes all DB writes, `bodyLimit` is correctly positioned as the first middleware argument, and the Prisma interactive transaction is atomic. The `computeDiff` pure function logic is largely correct.

Two blockers are present. First, the frontend modal does not check `res.ok` before consuming response bodies, so HTTP error responses (403, 413, 422, 500) are silently treated as successful data, causing the apply path to call `onSuccess()` and fire `toast.success` on failure. Second, `computeDiff` places manually-created deck cards (those with `kartexId = null`) unconditionally into the `removedIds` bucket, meaning `keepRemoved=false` deletes cards the user created by hand — data loss.

---

## Critical Issues

### CR-01: HTTP error responses not checked — errors treated as success

**File:** `apps/frontend/src/components/DeckUpdateModal.tsx:65-75` and `:83-92`

**Issue:** `api.postForm` returns a `Promise<Response>` and never throws on non-2xx status codes (see `apps/frontend/src/lib/api.ts:89-91`). Neither `runPreview` nor `runApply` checks `res.ok` before processing the response.

In `runPreview` (lines 65–75): `await res.json()` is called unconditionally, then `setPreview(data)` is called with whatever the server returned. On a 400/403/413/422 response, `data` is `{ error: "..." }` — the preview renders with `added: undefined`, `updated: undefined`, etc. (all `NaN` or blank), and the modal transitions to `previewing` with corrupted state instead of `error`.

In `runApply` (lines 83–92): `await api.postForm(...)` completes, the `try` block doesn't throw, so `setStep('done')`, `toast.success(...)`, and `onSuccess()` are all called — even if the server returned 403, 500, or 422. The user sees a success toast and the card list is refreshed, hiding the failure entirely.

**Fix:**
```typescript
// runPreview
const res = await api.postForm(`/api/decks/${deckId}/update/preview`, formData)
if (!res.ok) {
  const data = await res.json().catch(() => ({}))
  const message = (data as { error?: string }).error ?? t('deckUpdate.parseError')
  setErrorMsg(message)
  setStep('error')
  return
}
const data = await res.json()
setPreview(data)
setStep('previewing')

// runApply
const res = await api.postForm(`/api/decks/${deckId}/update/apply`, formData)
if (!res.ok) {
  const data = await res.json().catch(() => ({}))
  const message = (data as { error?: string }).error ?? t('deckUpdate.parseError')
  setErrorMsg(message)
  setStep('error')
  return
}
setStep('done')
toast.success(t('deckUpdate.successToast'))
onSuccess()
onOpenChange(false)
```

---

### CR-02: Manually-created cards (kartexId = null) always land in removedIds — data loss when keepRemoved=false

**File:** `apps/backend/src/routes/deckUpdate.ts:85-101`

**Issue:** `computeDiff` builds `deckByKartexId` only from cards where `dc.kartexId != null` (lines 46–50). Cards created via the card editor have `kartexId = null` and are never added to `deckByKartexId`. The `matchedDeckCardIds` set is populated only when a file card matches a deck card by kartexId. At lines 85–89, every deck card not present in `matchedDeckCardIds` is pushed to `removedIds` — this includes all manually-created cards with `kartexId = null`.

When the user calls apply with `keepRemoved=false`, line 253–256 executes `deleteMany({ where: { id: { in: diff.removedIds } } })`, deleting every manually-created card in the deck. This is silent data loss: the user selects "keep removed cards: off" expecting only to delete cards absent from the new file version, but every card they ever added by hand is also deleted.

The `removed` count shown in the preview will also be inflated, misleading the user.

**Fix:** Skip deck cards with `kartexId = null` when populating `removedIds`. Cards without a kartexId were not created by import and cannot be matched or removed by an import-update operation.

```typescript
// Cards in deck that were not matched by any file card → removed bucket
// Exclude cards with kartexId = null (manually created — not import-managed)
const removedIds: string[] = []
for (const dc of deckCards) {
  if (dc.kartexId != null && !matchedDeckCardIds.has(dc.id)) {
    removedIds.push(dc.id)
  }
}
```

---

## Warnings

### WR-01: Cancel button active during applying state — mid-apply close loses error feedback

**File:** `apps/frontend/src/components/DeckUpdateModal.tsx:172-175`

**Issue:** The Cancel button is rendered when `step === 'applying'` (line 172 condition: `step === 'previewing' || step === 'applying'`). Clicking it calls `onOpenChange(false)`, which triggers the reset `useEffect` (lines 46–52), setting `step → 'uploading'` and `errorMsg → null`. The `runApply` async function is still executing in the background. If the apply subsequently fails, `setErrorMsg` and `setStep('error')` update state after the reset — the error is never visible to the user. If the apply succeeds, `onSuccess()` and `onOpenChange(false)` are called redundantly on an already-closed/reset modal, which is harmless but sloppy.

The correct behaviour is to disable the Cancel button while applying, mirroring the Apply button's own `disabled={step === 'applying'}` pattern.

**Fix:**
```tsx
{(step === 'previewing' || step === 'applying') && (
  <Button
    variant="outline"
    onClick={() => onOpenChange(false)}
    disabled={step === 'applying'}
  >
    {t('common.cancel')}
  </Button>
)}
```

---

### WR-02: Non-null assertion on file in runPreview/runApply is unsafe

**File:** `apps/frontend/src/components/DeckUpdateModal.tsx:64` and `:80`

**Issue:** Both `runPreview` and `runApply` access `file!` (non-null assertion). `runPreview` is triggered by the `useEffect` at line 54–59 which guards with `if (open && file)`, making the assertion safe at the time of the effect. However, `runApply` is triggered by an `onClick` handler (line 179) that has no guard: if a consumer renders the modal with `open=true, file=null` and the Apply button is somehow reached (state inconsistency in the parent), `formData.append('file', null!)` would send `"null"` as a string to the server, which passes the `!(file instanceof File)` check and returns 400.

More concretely: the `DeckUpdateModalProps` type declares `file: File | null`, and the Apply button is only rendered in `previewing`/`applying` states. Reaching preview requires a successful `runPreview`, which requires a non-null `file`. The risk path is narrow but the `!` assertion masks a potential null.

**Fix:** Add an explicit null guard at the top of each function:
```typescript
async function runPreview() {
  if (!file) return
  // ...
}

async function runApply() {
  if (!file) return
  // ...
}
```

---

### WR-03: computeDiff — deckCards without kartexId contribute incorrect unchanged count

**File:** `apps/backend/src/routes/deckUpdate.ts:57-83`

**Issue:** This is a secondary consequence of the CR-02 root cause. When a deck has manually-created cards (kartexId = null), those cards are invisible during the file-card matching loop (lines 57–83). Their existence does not inflate the `unchanged` count (correct for the matching logic), but combined with CR-02, the `removed` count shown in the preview is inflated by the count of manually-created cards. Users see a misleading diff that reports cards as "removed" when they are actually safe (assuming keepRemoved defaults to true). Even before the CR-02 fix, the preview numbers are wrong in mixed decks.

This warning is partially superseded by CR-02: fixing CR-02 also fixes the misleading preview count. Flagged separately so the reviewer understands the full impact scope.

**Fix:** Addressed by the CR-02 fix (filter kartexId = null from removedIds before returning the DiffResult).

---

## Info

### IN-01: deckUpdate.fileTooLarge i18n key is defined but never used

**File:** `apps/frontend/src/locales/en.json:362` and `apps/frontend/src/locales/de.json:362`

**Issue:** Both locale files define `deckUpdate.fileTooLarge`. The bodyLimit `onError` handler in `deckUpdate.ts` returns a hardcoded English string `'File is too large.'` (line 116), not a reference to this key. The frontend `catch` blocks in `DeckUpdateModal.tsx` (lines 70–73, 88–91) only check `err instanceof Error` — a 413 response won't throw and is mishandled by CR-01. The `fileTooLarge` key has no caller anywhere in the codebase.

**Fix:** Either wire the key — use it as the fallback message when `res.status === 413` in the `!res.ok` handling block introduced by the CR-01 fix — or remove it from both locale files to keep the i18n namespace lean.

---

### IN-02: unchangedCount wrapper object is unnecessary

**File:** `apps/backend/src/routes/deckUpdate.ts:54`

**Issue:** `const unchangedCount: { n: number } = { n: 0 }` wraps a plain integer counter in an object. There is no reason to use an object here — a `let` counter is cleaner and idiomatic.

**Fix:**
```typescript
let unchangedCount = 0
// ...
unchangedCount++
// ...
unchanged: unchangedCount,
```

---

_Reviewed: 2026-06-10T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
