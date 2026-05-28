---
phase: 05-import-pipeline
reviewed: 2026-05-28T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - packages/shared/src/lib/kartex-parser.ts
  - packages/shared/src/schemas/import.ts
  - apps/frontend/src/lib/__tests__/kartex-parser.test.ts
  - packages/shared/src/index.ts
  - apps/backend/src/routes/import.ts
  - apps/backend/src/index.ts
  - apps/frontend/src/pages/ImportPage.tsx
  - apps/frontend/src/hooks/useImport.ts
  - apps/frontend/src/lib/api.ts
  - apps/frontend/src/App.tsx
findings:
  critical: 3
  warning: 5
  info: 3
  total: 11
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-05-28
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

The import pipeline covers a pure parser (`kartex-parser.ts`), a Zod schema layer (`schemas/import.ts`), a Hono backend route (`routes/import.ts`), and a three-piece frontend (hook, page, API wrapper). The core parsing logic is sound and the validation-before-write pattern for media files is well-conceived. However, three correctness/security bugs require fixing before this ships: a schema constraint violated in the backend, a missing `isSubmitting` reset on error paths leaving the UI permanently locked, and a zip bomb attack vector with no total-uncompressed-size guard. Five additional warnings cover dead code, logic errors, and reliability gaps.

---

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: `cardIndex: 0` violates `z.number().int().positive()` — warning is silently invalid

**File:** `apps/backend/src/routes/import.ts:233`

**Issue:** `ParseWarningSchema` declares `cardIndex: z.number().int().positive()`. `z.positive()` means `> 0`, so `cardIndex: 0` is schema-invalid. The backend constructs a deck-level warning with `cardIndex: 0` for unresolved `media://` references and pushes it into the `warnings` array returned in the 201 response. Any downstream consumer that validates the response against `ImportResultSchema` (which embeds `ParseWarningSchema`) will throw or silently drop this entry. The frontend currently casts the response without Zod validation (`as { ... }`), so the error is hidden today — but the data is structurally corrupt.

**Fix:** Either change the schema to allow `z.number().int().nonnegative()` (0 = deck-level), or use a sentinel value of `-1` with a corresponding `z.number().int().min(-1)`, or add a dedicated `scope` field. The simplest correct fix is to change the schema:

```typescript
// packages/shared/src/schemas/import.ts
export const ParseWarningSchema = z.object({
  cardIndex: z.number().int().nonnegative(), // 0 = deck-level warning
  reason: z.string().min(1),
})
```

And document the convention in a comment.

---

### CR-02: `isSubmitting` is never reset to `false` when `submitImport` throws — button permanently disabled

**File:** `apps/frontend/src/pages/ImportPage.tsx:139-143`

**Issue:** `handleConfirmImport` sets `isSubmitting = true`, awaits `submitImport`, then sets it back to `false`. If `submitImport` throws (network error, unexpected exception), the `await` propagates and the `setIsSubmitting(false)` on line 142 is never reached. The Import Deck button remains permanently disabled (`isSubmitting` stays `true`) for the rest of the component's lifetime. `useImport.submitImport` internally catches its own errors and sets `step` back to `'preview'`, but it does not re-throw — so this can only happen if `submitImport` itself throws outside its own catch, which is possible if `api.postForm` throws before the try block (e.g., synchronous FormData error). Regardless, the pattern is fragile.

**Fix:**

```typescript
async function handleConfirmImport() {
  setIsSubmitting(true)
  try {
    await submitImport(pendingDeckName)
  } finally {
    setIsSubmitting(false)
  }
}
```

---

### CR-03: No zip bomb protection — total uncompressed size is unbounded

**File:** `apps/backend/src/routes/import.ts:114-188`

**Issue:** The `bodyLimit` middleware caps the compressed upload at `MAX_BYTES` (default 10 MB). The individual extracted file check (line 172) also gates each media file against `MAX_BYTES`. However, a zip file with many small individually-valid entries can decompress to an arbitrarily large total — e.g., 100 entries each just under the per-file limit produces ~1 GB of I/O and memory pressure. All entry buffers are accumulated in `entryBuffers` (a `Map<string, Buffer>`) before any are written to disk, so the entire uncompressed content lives in Node heap simultaneously. There is no check on the sum of `bytes.length` across all entries, and no limit on the number of entries.

**Fix:** Add a total-size guard and an entry count guard before the validation loop:

```typescript
const MAX_TOTAL_BYTES = MAX_BYTES * 10 // e.g. 100 MB ceiling for all extracted content
const MAX_ENTRY_COUNT = 500

if (mediaEntries.length > MAX_ENTRY_COUNT) {
  return c.json({ error: `Too many files in zip (max ${MAX_ENTRY_COUNT}).` }, 422)
}

// Inside the loop, accumulate:
let totalBytes = 0
for (const entry of mediaEntries) {
  const bytes = await entry.buffer()
  totalBytes += bytes.length
  if (totalBytes > MAX_TOTAL_BYTES) {
    return c.json({ error: 'Zip contents exceed total size limit.' }, 422)
  }
  // ... rest of validation
}
```

---

## Warnings

### WR-01: Dead regex variables `frontMatch`, `backMatch`, `tagsMatch` — misleading abandoned code

**File:** `packages/shared/src/lib/kartex-parser.ts:125-138`

**Issue:** Lines 125-127 compute `frontMatch`, `backMatch`, and `tagsMatch` via `normalized.match(...)`. Lines 136-138 immediately discard them with `void frontMatch`, `void backMatch`, `void tagsMatch`. The comment on line 129 says "Simpler approach: split on field name lines". This is clearly an abandoned intermediate implementation left in the file. The dead code adds confusion about which parsing path is actually active and forces readers to verify that the `void` assignments are truly harmless.

**Fix:** Delete lines 125-138 entirely. The active path is `parseFields(normalized)`.

---

### WR-02: `entryName` collision — two zip entries with the same basename silently overwrite each other

**File:** `apps/backend/src/routes/import.ts:167-169`

**Issue:** `entryName` is derived from `basename(entry.path)`. If a zip contains `media/subfolder/image.png` and `media/image.png`, both produce `entryName = "image.png"`. The second entry's buffer overwrites the first in `entryBuffers` (a `Map` keyed by `entryName`). The first entry is silently dropped — it is never validated and never written to disk. The card content referencing the first filename will get a "media not found" warning, but no error is surfaced to the user explaining why.

**Fix:** Either reject zips with duplicate basenames with a clear error, or use the full relative path (after stripping `media/` prefix) as the map key throughout, so subdirectory structure is preserved.

---

### WR-03: `refreshPromise` cleared in `finally` before all concurrent callers retry — new 401 can trigger a second parallel refresh

**File:** `apps/frontend/src/lib/api.ts:34-38`

**Issue:** Every concurrent caller that hits a 401 awaits the same `refreshPromise`. Each caller wraps the await in its own `try/finally` block and sets `refreshPromise = null` in its `finally`. In JS, microtask ordering means the first caller to `await refreshPromise` resolves, runs its `finally` (setting `refreshPromise = null`), then proceeds to retry its original request. If that retry also gets a 401, and `refreshPromise` is now `null`, a second refresh call is fired. Under adversarial timing this is a minor issue (double-refresh), but it also means that if multiple concurrent callers all independently clear `refreshPromise = null` and then retry, and one of those retries gets a 401, the deduplication breaks.

**Fix:** Clear `refreshPromise` only once, after all awaiters have received the result, not inside each caller's `finally`. One approach: chain a `.finally(() => { refreshPromise = null })` on the promise itself at creation time, not inside each awaiter:

```typescript
if (refreshPromise === null) {
  refreshPromise = fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  }).finally(() => {
    refreshPromise = null
  })
}
const refreshResponse = await refreshPromise
// No try/finally here — cleanup already attached to the promise
```

---

### WR-04: `MAX_UPLOAD_BYTES` parsed twice independently — risk of inconsistency if env changes between parses

**File:** `apps/backend/src/routes/import.ts:11, 29`

**Issue:** `MAX_BYTES` is parsed at module load time on line 11. The `/config` GET handler re-parses `process.env.MAX_UPLOAD_BYTES` independently on line 29. These will always agree in practice since Node process env does not change at runtime, but the duplication is an anti-pattern — if someone refactors one without the other, the config endpoint will advertise a different limit than the one actually enforced, causing confusing client-side behavior (the client would allow files the server rejects).

**Fix:** Remove the redundant inline parse in the handler and use the module-level constant:

```typescript
importRouter.get('/config', (c) => {
  return c.json({ maxFileSizeBytes: MAX_BYTES })
})
```

---

### WR-05: File extension check on `.kartex` files does not guard against `.kartex.zip` being matched first — relies on ordering

**File:** `apps/backend/src/routes/import.ts:54-55`

**Issue:** Line 55 reads:
```typescript
const isKartex = normalizedName.endsWith('.kartex') && !isZip
```
This is correct, but the logic inverts the natural reading: `.kartex.zip` does end with `.kartex` (no — it ends with `.zip`). Actually this specific case is fine. The real subtle issue is that the extension check on line 53 (`normalizedName.endsWith('.kartex.zip')`) accepts files named e.g. `evil.exe.kartex.zip` without checking that the name is not otherwise suspicious. The file is further validated by magic bytes for media entries, but the outer `.kartex` text content is decoded without any content-type verification — a file named `evil.exe.kartex` is accepted as a text file and parsed as YAML. This is low risk given the parser runs in a sandboxed environment with no code execution, but worth noting that the extension is the only content-type gate for the `.kartex` entry itself.

**Fix:** At minimum, validate that the File's reported MIME type is `text/plain` or `application/octet-stream` for `.kartex` entries, or accept the current risk consciously (the parser is pure-functional with no eval-like surface).

---

## Info

### IN-01: `ParsedCard` imported but only used as a prop type annotation — no runtime behavior

**File:** `apps/frontend/src/pages/ImportPage.tsx:12`

**Issue:** `import type { ParsedCard } from '@kartex/shared'` is used solely as the prop type for `LazyCard`. This is correct TypeScript (type-only import), but it is worth noting that the import is from `@kartex/shared` which transitively pulls in `yaml` and the parser — confirm that tree-shaking eliminates the parser from the frontend bundle (it should, given `parseKartex` is also explicitly imported in `useImport.ts` and already in the bundle).

**Fix:** No action required; noted for bundle audit awareness.

---

### IN-02: `key={i}` used for list rendering in warning/error lists — unstable keys

**File:** `apps/frontend/src/pages/ImportPage.tsx:197, 319, 346`

**Issue:** Array index used as React `key` in three warning/error lists. These lists are short and static (rendered once, not reordered), so this does not cause visible bugs — but it is not idiomatic React and will cause unnecessary reconciliation if the list is ever made dynamic.

**Fix:** Use a content-based key where possible, e.g. `key={w.cardIndex}` for warnings and `key={e.name}` for file errors.

---

### IN-03: `MALFORMED_YAML_KARTEX` test fixture uses genuinely malformed YAML but is a weak signal

**File:** `apps/frontend/src/lib/__tests__/kartex-parser.test.ts:26-32`

**Issue:** The malformed YAML test (`deck: [invalid yaml: {{{`) correctly triggers a parse error, but there are no tests for edge cases that the current parser silently mishandles: (a) a card block where `front:` appears twice — the second value wins silently; (b) a card with a multi-line `front:` value followed by `tags:` — the tags field resets `currentField` to null but any subsequent continuation lines after `tags:` will be silently dropped; (c) a `.kartex` file with Windows CRLF line endings in card delimiters — the `cardBlockRegex` uses `^::\s*$` with the `m` flag, which will not match `:: \r` (the `\r` is not whitespace matched by `\s*` before `$` in some engines... actually `\s` does match `\r`). These gaps are low severity but leave the parser's behavior in gray areas untested.

**Fix:** Add test cases for duplicate fields within a card block, and for CRLF line endings in the card delimiter.

---

_Reviewed: 2026-05-28_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
