# Phase 4: Study Loops - Context

**Gathered:** 2026-05-28
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the complete study experience: an SM-2 spaced repetition session, a deck mode session (sequential, all cards), an exam mode session (time-limited, progress not saved), and the Dashboard page showing due cards and daily stats.

**In scope:** STDY-01 through STDY-07. Three backend plans: SM-2 algorithm + CardProgress API, study session UI (card flip + rating), Dashboard page (due cards, stats, CTA).

**Out of scope:** `.kartex` import (Phase 5), deck sharing/explore (Phase 6), advanced analytics charts (v2), AI-generated quiz mode (v2).

</domain>

<decisions>
## Implementation Decisions

### Card Flip Interaction
- **D-01:** The user flips a card by **clicking or tapping anywhere on the card body**. Space bar also triggers the flip on desktop. No separate "Show Answer" button — the whole card face is the click target.
- **D-02:** Flipping plays a **CSS 3D Y-axis rotation animation (~300ms)** to reveal the back. Classic flashcard feel, quick enough not to slow the session.

### Rating UI (shown after flip)
- **D-03:** Four **labeled buttons with inline keyboard shortcut hints**: "Again (1)", "Hard (2)", "Good (3)", "Easy (4)". Keyboard shortcuts 1–4 work in parallel. Buttons are large and tappable for mobile; keyboard works for desktop power users.
- **D-04:** Rating buttons are **color-coded**: Again=red, Hard=orange, Good=green, Easy=blue. Reinforces meaning at a glance without reading labels.

### Exam Mode Timer
- **D-05:** Timer is **per-session** (one countdown for the whole exam, not per-card). When the timer reaches zero, the session ends — the user can still rate the card they are currently on before it closes.
- **D-06:** Time limit is **user-configurable at session start** via a pre-session picker (options: 5 / 10 / 15 / 30 / 60 min). No hardcoded default — user must pick before starting exam mode.

### Dashboard Layout
- **D-07:** Due-cards count is the **hero element**: a prominent "X cards due today" heading with a large **"Start Studying" CTA button**. Per-deck due counts are listed below the hero (deck name + count per row). This matches the core value: open dashboard → see due cards → study.
- **D-08:** Stats section (below the due-cards widget) shows exactly two stat chips: **"Reviewed today: N"** and **"Streak: N days"** — satisfying STDY-07 cleanly.

### Claude's Discretion
- Session completion screen design (what shows when all cards in a session are rated — summary of counts, an encouraging message, "Return to Dashboard" button).
- Session exit/navigation-away handling — whether in-progress SM-2 ratings are saved or discarded on early exit.
- Exact card face dimensions, shadow, border radius in the study session view.
- Empty state when dashboard has no due cards ("All caught up!" illustration/message).
- The `/decks/:id/learn` route's mode selection UI (how the user picks Spaced Repetition vs Deck Mode vs Exam Mode before starting).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### SM-2 Algorithm & Study Modes
- `docs/design.md` §9 — SM-2 specification: rating key table (1=Again/0, 2=Hard/3, 3=Good/4, 4=Easy/5), easeFactor adjustment rules, interval growth, "Again → interval resets to 1 day"
- `docs/design.md` §9 — Study Modes table: Spaced Repetition (SM-2, due cards across all decks), Deck Mode (all cards in a deck, sequentially), Exam Mode (time limit, progress not saved)
- `docs/design.md` §11 — Frontend pages: `/dashboard` (cards due today, statistics), `/decks/:id/learn` (study mode)

### Requirements
- `.planning/REQUIREMENTS.md` §STDY-01 to STDY-07 — All 7 study requirements this phase must satisfy

### Data Model
- `apps/backend/prisma/schema.prisma` — `CardProgress` model already defined: `easeFactor Float @default(2.5)`, `interval Int @default(1)`, `repetitions Int @default(0)`, `nextReview DateTime @default(now())`, `lastReviewed DateTime?`, `@@unique([userId, cardId])`

### Existing Code to Extend
- `apps/frontend/src/App.tsx` — Add routes: `/dashboard` → DashboardPage, `/decks/:id/learn` → StudySessionPage (currently ComingSoon placeholders)
- `apps/frontend/src/components/KartexRenderer.tsx` — Reuse for rendering card front/back content in study session
- `apps/backend/src/routes/cards.ts` — Follow this route pattern for new study/progress router
- `apps/backend/src/routes/decks.ts` — Follow this route pattern

### Frontend Patterns
- `apps/frontend/src/lib/api.ts` — All fetch calls go through the `api` wrapper
- `apps/frontend/src/components/AppShell.tsx` — Dashboard nav item already wired to `/dashboard`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `KartexRenderer` (`apps/frontend/src/components/KartexRenderer.tsx`): Full Kartex rendering (Markdown, KaTeX, Typst, media, video, code). Pass card front/back content directly — interface is `content: string`.
- `api` wrapper (`apps/frontend/src/lib/api.ts`): Handles auth cookies + silent refresh — all study API calls must use this.
- shadcn `Card`, `Button`, `Tabs`, `Dialog`, `Table` components — available, follow existing patterns.
- `authMiddleware` (`apps/backend/src/middleware/auth.ts`): Apply to all new study/progress routes.

### Established Patterns
- Backend: `new Hono()` router + Zod body validation from `@kartex/shared` + `authMiddleware` + `c.json()` — follow exactly as in `cards.ts`/`decks.ts`
- Frontend: React component in `apps/frontend/src/pages/` for new page components
- Zod schemas in `packages/shared/src/schemas/` — any new CardProgress/study schemas go here
- Toast notifications via `sonner` — use for session completion feedback

### Integration Points
- `/dashboard` route in `App.tsx` — replace `<ComingSoon title="Dashboard" />` with `<DashboardPage />`
- `/decks/:id/learn` route — add new route to App.tsx (currently absent; not a ComingSoon)
- New backend router (e.g., `apps/backend/src/routes/study.ts`) — register in `apps/backend/src/index.ts` alongside existing routers
- `CardProgress` upserts use `@@unique([userId, cardId])` — use Prisma `upsert` with `where: { userId_cardId: { userId, cardId } }`

</code_context>

<specifics>
## Specific Ideas

- Dashboard hero: "X cards due today" as a large number/heading, then a big full-width "Start Studying" button. Below: per-deck table with deck name and count columns. Below that: two stat chips (reviewed today, streak).
- Rating buttons should appear ONLY after the card is flipped (hidden during front-face view). Reveal them smoothly with the back face.
- Exam mode session start: a pre-session modal/screen that shows the deck name + a time picker (5/10/15/30/60 min radio or select), then a "Start Exam" button.
- Color palette for rating buttons: use Tailwind semantic colors — `bg-red-500` / `bg-orange-500` / `bg-green-500` / `bg-blue-500` (or destructive/warning/success/info if the theme defines them).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-study-loops*
*Context gathered: 2026-05-28*
