# Phase 3: Rich Content Rendering - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 03-rich-content-rendering
**Areas discussed:** Media Upload UI, Typst WASM Loading, Video Embed Trigger, Render Error States

---

## Media Upload UI

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — upload buttons in editor | File picker buttons in the card editor; uploads auto-insert `media://filename` at cursor | ✓ |
| API-only, UI later | Backend endpoint only in Phase 3; card editor stays text-only; UI deferred to Phase 5 | |
| Minimal upload panel | Bare-bones panel somewhere in the deck/card view, no in-editor integration | |

**User's choice:** Upload buttons in the card editor in Phase 3.

### Upload placement

| Option | Description | Selected |
|--------|-------------|----------|
| Per-field toolbar (Recommended) | Small toolbar above each textarea (front/back) with image + audio icons | ✓ |
| Single shared toolbar | One upload toolbar at the top of the modal, user pastes reference manually | |
| You decide | Claude picks the most natural UX | |

**User's choice:** Per-field toolbar above each textarea.

### Insertion behavior

| Option | Description | Selected |
|--------|-------------|----------|
| At cursor position | `![alt](media://filename)` inserted at current cursor position | ✓ |
| End of field content | Appended to end of textarea content | |
| You decide | Claude picks the insertion behavior | |

**User's choice:** Insert at cursor position.

---

## Typst WASM Loading

| Option | Description | Selected |
|--------|-------------|----------|
| Lazy — on first #typst block (Recommended) | Load typst.ts only when renderer first encounters a `#typst` block | ✓ |
| Eager — at card view mount | Initialize Typst WASM whenever card viewer mounts | |
| You decide | Claude picks loading strategy | |

**User's choice:** Lazy loading on first `#typst` block encounter.

### Loading indicator

| Option | Description | Selected |
|--------|-------------|----------|
| Inline spinner + "Rendering..." text | Small spinner in place of the `#typst` block during loading | ✓ |
| Skeleton placeholder (same block height) | Animated skeleton rect preserving layout | |
| Blank / invisible | Nothing shown until render completes | |

**User's choice:** Inline spinner with "Rendering..." text.

### Lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| Stay initialized (module-level singleton) | Typst compiler instance persists for the session after first load | ✓ |
| You decide | Claude picks lifecycle strategy | |

**User's choice:** Module-level singleton — stays initialized for the browser session.

---

## Video Embed Trigger

| Option | Description | Selected |
|--------|-------------|----------|
| URL pattern matching (Recommended) | Any YT/Vimeo URL auto-embeds regardless of link text | ✓ |
| Explicit link text 'video' | Only embeds when link text is literally "video" | |
| Both: URL + 'video' text | Either URL pattern OR link text triggers embed | |

**User's choice:** URL pattern matching — the URL is the trigger.

### Supported providers

| Option | Description | Selected |
|--------|-------------|----------|
| YouTube + Vimeo only | Embed iframes for youtube.com, youtu.be, and vimeo.com | |
| YouTube only | Embed YouTube only; Vimeo renders as regular link | ✓ |
| You decide | Claude picks provider list | |

**User's choice:** YouTube only at launch. Vimeo deferred.

---

## Render Error States

### KaTeX errors

| Option | Description | Selected |
|--------|-------------|----------|
| Inline error with raw source | Red-bordered block with KaTeX error + raw source | ✓ |
| Raw source only, no error UI | Show raw LaTeX source as plain text, no error styling | |
| You decide | Claude picks fallback (KaTeX throwOnError: false + errorColor) | |

**User's choice:** Red-bordered inline error block with raw source.

### Typst errors

| Option | Description | Selected |
|--------|-------------|----------|
| Same pattern as KaTeX — red error + raw source | Consistent error treatment across all content types | ✓ |
| Collapsible error detail | Warning icon; click to expand Typst error + source | |
| You decide | Claude picks — likely matches KaTeX pattern | |

**User's choice:** Same red error + raw source pattern as KaTeX. Consistent across all rich content types.

---

## Claude's Discretion

- Exact styling of the upload toolbar (icon size, button variant, spacing)
- Audio player styling (native HTML `<audio controls>` with consistent CSS sizing)
- Code block highlight.js language handling (auto-detect if no language specified)
- `media://` URL resolution implementation (custom `img` component in react-markdown)

## Deferred Ideas

- **Vimeo embed support** — deferred from Phase 3; Vimeo renders as regular hyperlinks
- **Drag-and-drop file upload** in the card editor — Phase 3 uses file picker buttons only
- **Full MDIA validation** (MIME type, magic bytes, configurable max size) — MDIA-01 to MDIA-04 are Phase 5
