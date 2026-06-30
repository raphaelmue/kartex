# Phase 26: ABC Notation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-30
**Phase:** 26-abc-notation
**Areas discussed:** Responsive scaling, Dark mode appearance, Loading state

---

## Responsive Scaling

| Option | Description | Selected |
|--------|-------------|----------|
| abcjs responsive:resize option | Pass `responsive: 'resize'` to abcjs — emits viewBox-based SVG; CSS width:100% scales correctly | ✓ |
| Dynamic staffwidth | Read container clientWidth via useRef before rendering, pass `staffwidth`; needs ResizeObserver | |
| CSS-only: max-w-full | Render at default width, constrain container — SVG may clip on narrow cards | |

**User's choice:** `responsive: 'resize'` + CSS `w-full`

**Notes:** Follow-up question confirmed: let CSS handle scaling, only post-process the SVG `width` attribute if the responsive option proves insufficient during implementation.

---

## Dark Mode Appearance

| Option | Description | Selected |
|--------|-------------|----------|
| CSS filter: invert in dark mode | Apply `dark:invert` Tailwind class on container — inverts SVG colors in dark mode | ✓ |
| Light-colored card wrapper | Wrap AbcBlock in `bg-white rounded-md` — always looks like paper regardless of theme | |
| Leave as-is | Accept white SVG background in dark mode; minimal implementation | |

**User's choice:** `dark:invert` CSS filter

**Notes:** No abcjs config needed — pure Tailwind dark mode variant on the container div.

---

## Loading State

| Option | Description | Selected |
|--------|-------------|----------|
| Spinner while import pending | Match TypstBlock pattern: loading=true on mount, Loader2 spinner, import resolves, render, loading=false | ✓ |
| No loading state | Skip spinner; flicker acceptable since abcjs renders synchronously after import | |

**User's choice:** Spinner while lazy import resolves

**Notes:** Consistent with TypstBlock UX pattern.

---

## Claude's Discretion

- Whether `AbcBlock` lives inline in `KartexRenderer.tsx` or is extracted to a separate file — inline preferred (file stays under 500 lines)
- Exact abcjs `renderAbc()` options beyond `responsive: 'resize'`
- Order of `preprocessAbcBlocks` vs `preprocessTypstBlocks` calls
- Whether abcjs requires a CSS import in `main.tsx`

## Deferred Ideas

- ABC audio playback (WebAudio) — deferred to v2 per REQUIREMENTS.md
- Inline ABC editor in study mode — deferred per REQUIREMENTS.md
