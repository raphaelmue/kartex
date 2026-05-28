# Phase 4: Study Loops - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-28
**Phase:** 04-study-loops
**Areas discussed:** Card flip interaction, Rating UI after flip, Exam mode timer, Dashboard layout

---

## Card flip interaction

| Option | Description | Selected |
|--------|-------------|----------|
| Click/tap card body | Entire card face is click target. Space bar also works. Simple, works on mobile without extra buttons. | ✓ |
| 'Show Answer' button below card | Labeled button below the front face. More explicit but adds a visual element. | |
| Both — click card OR button | Card body click and a 'Show Answer' button both flip. Flexible but busier UI. | |

**User's choice:** Click/tap card body (+ Space bar on desktop)
**Notes:** Space bar also triggers flip. No separate "Show Answer" button.

---

| Option | Description | Selected |
|--------|-------------|----------|
| CSS 3D flip animation | Card rotates on Y-axis (~300ms). Classic flashcard feel. | ✓ |
| Fade / cross-fade | Front fades out, back fades in. Simpler CSS. | |
| No animation — instant swap | Back content appears immediately. Maximum speed. | |

**User's choice:** CSS 3D flip animation
**Notes:** Y-axis rotation, ~300ms. Provides the classic flashcard tactile feel.

---

## Rating UI after flip

| Option | Description | Selected |
|--------|-------------|----------|
| Labeled buttons + keyboard shortcuts | "Again (1)", "Hard (2)", "Good (3)", "Easy (4)" buttons. Keys 1-4 also work. | ✓ |
| Keyboard shortcuts only | Small hint text "press 1-4 to rate". Fast but unusable on mobile. | |
| Word labels only, no shortcut hints | Four buttons without shortcut labels. Clean but undiscoverable shortcuts. | |

**User's choice:** Labeled buttons + keyboard shortcuts

---

| Option | Description | Selected |
|--------|-------------|----------|
| Color-coded (red/orange/green/blue) | Again=red, Hard=orange, Good=green, Easy=blue. Visual meaning at a glance. | ✓ |
| Neutral / monochrome | All buttons same muted style. Cleaner look. | |
| You decide | Claude picks based on shadcn design system. | |

**User's choice:** Color-coded — red / orange / green / blue

---

## Exam mode timer

| Option | Description | Selected |
|--------|-------------|----------|
| Per-session total timer | One countdown for the entire session. Ends session when zero. | ✓ |
| Per-card countdown | Each card gets its own timer. Auto-advances to next card on timeout. | |

**User's choice:** Per-session total timer
**Notes:** User can still rate the current card after timer hits zero before session closes.

---

| Option | Description | Selected |
|--------|-------------|----------|
| 15 minutes (default) | Solid study block. Long enough, feels focused. | |
| 30 minutes | Suitable for larger decks. | |
| User-configurable at session start | Time limit picker at session start (5/10/15/30/60 min). | ✓ |

**User's choice:** User-configurable at session start (5/10/15/30/60 min options)

---

## Dashboard layout

| Option | Description | Selected |
|--------|-------------|----------|
| Due cards front-and-center with 'Start Studying' CTA | "X cards due today" hero + big CTA. Per-deck counts below. Stats as small chips. | ✓ |
| Stats overview with study entry point | Stats dashboard first, 'Start Studying' in header area. More data-first. | |
| Deck grid with due counts inline | All decks as cards with due-count badge. No separate 'study all' CTA. | |

**User's choice:** Due cards front-and-center with 'Start Studying' CTA
**Notes:** Matches core value: open dashboard → see due cards → study.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Today's reviewed count + current streak | Two stat chips: "Reviewed today: N" and "Streak: N days". | ✓ |
| Today's reviewed + streak + per-deck table | Stats plus a deck breakdown table. | |
| You decide | Claude implements per STDY-06/STDY-07 using shadcn components. | |

**User's choice:** Today's reviewed count + current streak — two simple stat chips

---

## Claude's Discretion

- Session completion screen (summary, encouraging message, Return to Dashboard)
- Session exit handling (save or discard in-progress ratings)
- Card face dimensions/styling in study session
- Empty state for dashboard when no cards are due
- Mode selection UI on `/decks/:id/learn` (how user picks between Spaced Repetition, Deck Mode, Exam Mode)

## Deferred Ideas

None — discussion stayed within phase scope.
