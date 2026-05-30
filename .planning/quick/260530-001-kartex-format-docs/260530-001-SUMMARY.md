---
quick_id: 260530-001
slug: kartex-format-docs
status: complete
date: 2026-05-30
---

# Quick Task 260530-001 Summary

## What was done

Created `docs/kartex-format.md` — a comprehensive, user-facing reference for the `.kartex` file format.

## Sections written

1. **File structure at a glance** — annotated quick reference
2. **Deck header** — `deck:`, `author:`, `tags:` with required/optional table
3. **Comments** — `#` syntax, `#typst` exception
4. **Card blocks** — `:: card` / `::` delimiters, malformed-card behaviour
5. **Card fields** — `front:`, `back:`, `tags:` with multi-line value syntax
6. **Rich content** — inline math, block math (own-line `$$`), Typst blocks, code fences, `media://` references, external video links
7. **Parsing rules** — D-01/D-02 table, comment stripping, line-ending normalisation
8. **Import bundle** — `.kartex.zip` layout (`deck.kartex` + `media/`)
9. **Complete example** — full working deck covering all features
10. **LLM generation prompt** — ready-to-paste system prompt + tips

## Files changed

- `docs/kartex-format.md` (created)

## Resolved todo

Closes: `.planning/todos/pending/2026-05-28-add-kartex-format-documentation.md`
