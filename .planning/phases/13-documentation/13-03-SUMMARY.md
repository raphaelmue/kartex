---
phase: 13-documentation
plan: "03"
subsystem: docs
tags: [documentation, kartex-format, audit, accuracy]
dependency_graph:
  requires: []
  provides: [DOCS-03]
  affects: [docs/kartex-format.md]
tech_stack:
  added: []
  patterns: []
key_files:
  created: []
  modified:
    - docs/kartex-format.md
decisions:
  - "§2 cross-reference corrected: '#typst — see §6' changed to 'see §5.3'; §6 is Parsing Rules, §5.3 is Typst Blocks"
  - "ZIP bundle implementation is more lenient than doc states (accepts nested deck.kartex via .endsWith); doc's stricter rule is still correct for format authors — no change needed"
metrics:
  duration: "~6 min"
  completed: "2026-06-03"
  tasks_completed: 1
  tasks_total: 1
---

# Phase 13 Plan 03: kartex-format.md Accuracy Audit Summary

**One-liner:** Fixed one cross-reference error (§2 referenced §6 instead of §5.3 for `#typst`); all other behavioral claims in `docs/kartex-format.md` verified accurate against parser source.

---

## Audit Results

**1 inaccuracy found and corrected.**

### Systematic Audit of All 7 Items

**AUDIT ITEM A — Comment stripping (§2)**
- Doc claim: "Any line whose first non-whitespace character is `#` is a comment... except `#typst`"
- Parser regex: `/^\s*#(?!typst)/` — matches lines starting with `#` not followed by `typst`
- Doc claim: "a line like `front: # not a comment` treats the `#` as part of the value"
- Parser guard: `!/^\s*(front|back|tags|deck|author)\s*:/.test(line)` — field assignment lines never stripped
- Result: **ACCURATE**

**AUDIT ITEM B — #typst block placement (§5.3)**
- Doc claim: "`#typst` must appear at the start of the field value (or on its own line within the value)"
- Parser behavior: content-transparent for field values; `#typst` is excluded from comment stripping via negative lookahead `(?!typst)`, so it is passed through verbatim to the frontend renderer
- The doc correctly frames `#typst` as a rendering convention (frontend renders it, not the parser)
- The doc does NOT claim the kartex parser specially processes `#typst` — it correctly says it is a "rich-content directive" processed by the renderer
- Result: **ACCURATE**

**AUDIT ITEM C — Multi-line field values (§4)**
- Doc claim: "continues until the parser encounters another recognised field name (`front:`, `back:`, or `tags:`) or the closing `::` "
- Parser: `FIELD_PATTERN = /^(front|back|tags):\s*(.*)/` — matches exactly these three fields; `::` boundary handled by `cardBlockRegex`
- Result: **ACCURATE**

**AUDIT ITEM D — Tags as single-line field (§4)**
- Doc claim: "`tags` is a single-line field parsed as a YAML array"
- Parser: when `fieldName === 'tags'`, sets `result.tags = fieldMatch[2].trim()` and sets `currentField = null` — no continuation lines accumulated
- Result: **ACCURATE**

**AUDIT ITEM E — Block math $$ on own lines (§5.2)**
- Doc claim: "`$$` delimiters must each appear on their own line"; note that `$$` on same line as content = inline mode
- This is a rendering constraint (remark-math/rehypeKatex), not a parser constraint; the parser is content-transparent
- Doc correctly frames this as a rendering rule
- Result: **ACCURATE**

**AUDIT ITEM F — .kartex.zip bundle rules (§7)**
- Doc claim: "archive must contain a file named `deck.kartex` at the root" and "All media files must live in the `media/` directory at the root"
- Import route check for kartex entry: `f.path === 'deck.kartex' || f.path.replace(/\\/g, '/').endsWith('/deck.kartex')`
- Implementation is more lenient than doc (also accepts `deck.kartex` nested in subdirectories)
- However, doc's stricter claim does NOT cause invalid decks — a deck.kartex at the root always satisfies the implementation check. The doc is a correct format specification for deck authors (following the doc produces valid bundles).
- Media entries: `normalized.startsWith('media/')` — matches doc's claim exactly
- Result: **ACCURATE** (doc is intentionally stricter as a format specification; implementation is defensively lenient)

**AUDIT ITEM G — D-01 and D-02 parsing rules table (§6)**
- D-01: Parser returns `{ warning }` for missing front/back, continues (does not abort) — matches doc's "skipped and added to import warnings list"
- D-02: Parser returns `{ fatal: true, message: '...' }` for missing/invalid header — matches doc's "rejected entirely — a fatal parse error"
- Result: **ACCURATE**

---

## Inaccuracy Found and Corrected

### [Rule 1 - Bug] Fixed cross-reference in §2: `(see §6)` → `(see §5.3)`

- **Found during:** Task 1 audit (AUDIT ITEM A + cross-section check)
- **Issue:** §2 (Comments) stated "`#typst` which is a rich-content directive (see §6)" but §6 is "Parsing Rules". The `#typst` block documentation lives in §5.3 (Rich Content > Typst Blocks).
- **Fix:** Changed `(see §6)` to `(see §5.3)` — one-character + one-digit change
- **Files modified:** `docs/kartex-format.md` (line 65)
- **Commit:** ab2cb19

---

## Deviations from Plan

None — plan executed exactly as written. One inaccuracy was found and corrected with a targeted edit (the plan permitted this).

---

## Self-Check

- [x] `docs/kartex-format.md` contains `#typst` (7 matches — §5.3 present)
- [x] `docs/kartex-format.md` contains `media://` (5 matches — §5.5 present)
- [x] `docs/kartex-format.md` contains `deck.kartex` (3 matches — §7 present)
- [x] Commit ab2cb19 exists
- [x] Cross-reference now reads `(see §5.3)` — verified by the edit

## Self-Check: PASSED

---

## Threat Flags

None. The fix is a cross-reference correction only; no new network endpoints, auth paths, file access patterns, or schema changes introduced.
