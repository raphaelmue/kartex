---
created: 2026-05-28T20:10:00Z
title: Add .kartex format documentation
area: docs
files:
  - packages/shared/src/lib/kartex-parser.ts
  - test-fixtures/sample.kartex
  - test-fixtures/sample-warnings.kartex
  - test-fixtures/sample.kartex.zip
---

## Problem

There is no user-facing documentation explaining the `.kartex` file format. Users who want to create or edit flashcard files manually have no reference for the YAML header syntax, card block delimiters (`:: card` / `::`), or field names (`front:`, `back:`, `tags:`). The format also supports `#typst` blocks, math (`$...$`, `$$...$$`), code blocks, and `media://` references — none of which are documented.

Test fixtures were created in `test-fixtures/` during Phase 5 UAT, which can serve as working examples.

## Solution

TBD — likely a `docs/kartex-format.md` file covering:
- YAML header fields (`deck:`, `author:`, `tags:`)
- Card block delimiters (`:: card` … `::`)
- Card fields: `front:`, `back:`, `tags:`
- Multi-line field values
- Comments (lines starting with `#`, excluding `#typst`)
- Supported rich content: LaTeX math, Typst blocks, code fences, `media://` references
- Lenient parsing rules (D-01: malformed cards skipped; D-02: header is required)
- `.kartex.zip` bundle format (`deck.kartex` at root + `media/` directory)

Could be surfaced in the app on the `/import` page as a help link or inline collapsible.
