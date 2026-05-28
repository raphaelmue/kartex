# Phase 5: Import Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-28
**Phase:** 05-import-pipeline
**Areas discussed:** Parser tolerance, Preview scope & deck naming, Media failure handling, Client-side size limit UX

---

## Parser Tolerance

| Option | Description | Selected |
|--------|-------------|----------|
| Strict — fail the whole file | Return a parse error, show user which card/line failed, import nothing. | |
| Lenient — skip the bad card, import the rest | Parse all valid cards, collect warnings. Preview shows valid cards + warnings banner. | ✓ |
| You decide | Claude picks a reasonable default. | |

**User's choice:** Lenient — skip the bad card, import the rest

---

| Option | Description | Selected |
|--------|-------------|----------|
| Fail — require a valid deck header | Clear error: 'No deck header found. Your .kartex file must start with a --- block.' | ✓ |
| Infer from filename — use filename as deck title | If no header, use filename (minus .kartex extension) as deck title. | |

**User's choice:** Fail — require a valid deck header

---

## Preview Scope & Deck Naming

| Option | Description | Selected |
|--------|-------------|----------|
| Render all cards with KartexRenderer | Full rendered preview of every card. Could be slow for 100+ cards. | |
| Count summary + first 5 cards rendered | Show 'N cards found' header + render first 5 as a sample. | |
| Scrollable list — render cards lazily as user scrolls | All cards listed but only rendered when visible. Best for large decks. | ✓ |

**User's choice:** Scrollable list with lazy rendering

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — editable name field in the preview step | Pre-fill with 'deck:' value from header. User can change before hitting 'Import'. | ✓ |
| No — use the header name as-is | Deck created with whatever name is in the file. User can rename afterward. | |

**User's choice:** Yes — editable name field in the preview step

---

| Option | Description | Selected |
|--------|-------------|----------|
| Banner at the top of the preview | Yellow/orange warning box above the card list listing skipped cards. | ✓ |
| Inline in the card list where they would have appeared | Dimmed placeholder in position for each skipped card. | |
| You decide | Claude picks the most user-friendly placement. | |

**User's choice:** Banner at the top of the preview

---

## Media Failure Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Abort the entire import | Show error naming bad files. Nothing created in DB. User must fix and re-upload. | ✓ |
| Import the deck+cards, skip the bad media files | Deck and valid cards created. Rejected media → broken placeholders. Warning summary. | |
| You decide | Claude picks based on recoverability. | |

**User's choice:** Abort the entire import

---

| Option | Description | Selected |
|--------|-------------|----------|
| Warning only — import the card without that media | Card created, media:// reference will not resolve. | ✓ |
| Fatal — treat like a validation failure | Missing referenced media = abort or skip the card. | |

**User's choice:** Warning only — import the card without that media

**Notes:** Distinction between failed validation (abort entirely) and missing-but-not-invalid files (warning, import anyway). Makes sense: bad validation = corrupted/wrong files, missing = accidental omission.

---

## Client-Side Size Limit UX

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — add a GET /api/import/config endpoint | Frontend fetches configured limit on page load, rejects oversized files before upload. | ✓ |
| Yes — hardcode 10MB in the frontend too | Simple, but won't reflect custom env var limits. | |
| No — let the backend reject it | Frontend just submits; backend returns 413/400. Less code, always correct. | |
| You decide | Claude picks simplest correct approach. | |

**User's choice:** Yes — add a GET /api/import/config endpoint that returns the limit

---

## Claude's Discretion

- Layout and styling of the import page (file drop zone vs. button)
- Lazy rendering implementation approach (IntersectionObserver vs. virtualization library)
- Card preview design in the list (collapsible vs. stacked)
- Progress/loading state during zip extraction

## Deferred Ideas

None — discussion stayed within phase scope.
