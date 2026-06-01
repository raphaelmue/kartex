# Feature Landscape — Kartex v1.2

**Domain:** Spaced-repetition flashcard app (self-hosted, 2-5 users)
**Milestone:** v1.2 Study Control & PWA
**Researched:** 2026-06-02
**Confidence:** HIGH (codebase direct inspection + verified against Anki docs, vite-pwa docs, and SM-2 literature)

---

## Scope

Four features only. All four add to the existing app; none replace existing behaviour.

1. Active deck rotation
2. SM-2 preset modes (Normal / Intensive / Exam Prep)
3. PWA installable shell
4. Docs (README.md, refresh design.md, kartex-format.md)

---

## 1. Active Deck Rotation

### What "active deck" means in practice

In apps like Anki and Fresh Cards the concept exists implicitly as a "paused" state shown via a visual dot or label on the deck list. Kartex's formulation is a first-class, persistent boolean per deck (`isActive`) that gates which decks contribute cards to the global `/study` due queue.

The key distinction from suspension in Anki: Anki suspends individual *cards*; Kartex suspends an entire *deck* at the owner level. This is simpler and appropriate for a small-group app where users manage their own study focus week-to-week.

### Table Stakes (expected behaviours)

| Behaviour | Why Expected | Complexity | Notes |
|-----------|--------------|------------|-------|
| Toggle active/inactive per deck, persisted server-side | Users need to park a deck during an exam block or holiday without losing progress | Low | Prisma schema: add `isActive Boolean @default(true)` to `Deck`. One migration. |
| Inactive decks are excluded from `/api/study/due` | The entire point of the feature; without this the toggle is cosmetic | Low | Filter `where: { isActive: true }` added to both `ownerId` and shared-deck branches in `study.get('/due')`. |
| Active/inactive state visible on the deck list (`/decks`) and deck detail (`/decks/:id`) | Users need feedback that the toggle worked | Low | Badge or toggle switch component on `DecksPage` and `DeckDetailPage`. |
| Inactive decks shown visually distinct (muted/dimmed) on the deck list | Mirrors Fresh Cards "paused" dot pattern; avoids confusion | Low | CSS opacity/muted colour on the deck card when `isActive === false`. |
| Dashboard due-count reflects active-only decks | Dashboard already calls `/api/study/due`; if that endpoint is filtered, the count is automatically correct | None | Free: dashboard reads from the same due endpoint. |

### Deck Picker (select decks for a session)

The deck picker is a companion to active deck rotation. Rather than a persistent toggle, it is a per-session override: "for this one study run, include these specific decks."

| Behaviour | Why Expected | Complexity | Notes |
|-----------|--------------|------------|-------|
| `/study` start screen shows a checkable list of the user's decks | Users want to combine cards from 2-3 related decks in one session without permanently activating/deactivating | Medium | Replaces the current auto-commit on page load (isGlobalSR path in StudySessionPage). Needs a deck-picker step before card load. |
| Decks pre-selected according to their `isActive` state | Active decks checked by default; inactive decks unchecked but selectable | Low | UI pre-checks active decks; user can override before starting. |
| Selecting zero decks disables "Start" | Prevents empty session | Low | Button disabled when selection is empty. |
| Session size picker already on the start screen | Already shipped in v1.1; stays in the same UI step | None | No change. |
| After deck selection, `/api/study/due` is called with the selected deck IDs | Backend filters due cards to only the chosen decks | Medium | Needs query param: `GET /api/study/due?deckIds=a,b,c`. The existing endpoint returns all decks; add optional filter. |
| Tags and size pickers appear after deck selection (or alongside) | Tags are deck-specific; picking decks first determines available tags | Medium | The tag-prefetch effect in StudySessionPage currently calls all due. Must re-fetch after deck selection is confirmed. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Inactive deck count shown on dashboard as a gentle reminder ("3 decks paused") | Surfacing forgotten inactive decks prevents long-term drift | Low | Dashboard stat row, one additional API field. |
| Per-deck active toggle accessible from deck detail page, not just the list | Power users prefer acting from where they already are | Low | Toggle in deck detail header/actions. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Auto-deactivating decks after N days of no reviews | Too clever; silently changes user intent | Surface inactive decks with a reminder |
| Deck picker as a separate "filter" page before every study session | Creates friction for the primary happy path | Pre-select active decks so one click ("Start") works for the common case |
| Allowing the deck picker to override the due filter (study inactive-deck due cards) | Conceptually confusing; inactive means "don't schedule this" | Deck picker selects *active* decks for a session; inactive can be toggled active first |
| `isActive` on shared/explore decks | Shared-deck active state should be per-user, not deck-global | Store active state on the user's copy only; the Deck schema `isActive` must be owner-scoped. Design choice: either add a `UserDeckSettings` join table, or keep `isActive` on `Deck` and only owner can toggle (simpler). For a 2-5-user app, owner-only toggle is sufficient — shared-deck recipients get whatever the owner decides. |

### Dependencies on Existing Features

- Reads from `GET /api/study/due` — must add optional `deckIds` filter param
- `Deck` model in Prisma schema needs `isActive Boolean @default(true)`
- `UpdateDeckSchema` in `packages/shared` needs `isActive` field
- `DeckSchema` in `packages/shared` needs `isActive` in response shape
- `DecksPage` and `DeckDetailPage` already have deck update mutations — toggle re-uses that path
- `StudySessionPage` isGlobalSR path currently auto-commits immediately; needs a new "deck picker" pre-step

---

## 2. SM-2 Preset Modes

### What "SM-2 modes" means in practice

The standard SM-2 interval formula is: `newInterval = ceil(previousInterval * easeFactor)`. An interval multiplier applied on top scales all computed intervals uniformly. This is exactly how Anki's "Interval Modifier" works and is well-established in spaced repetition literature.

Kartex defines three named presets:
- **Normal** — multiplier 1.0 (default SM-2, unchanged behaviour)
- **Intensive** — multiplier 0.5 (halved intervals; review twice as often)
- **Exam Prep** — multiplier 0.25 (quartered intervals; aggressive cram schedule)

The multiplier is applied at the moment the SM-2 result is calculated in `calculateSM2()`. It does NOT retroactively reschedule existing `CardProgress` rows; it only affects the next computed `nextReview` date going forward.

### Table Stakes

| Behaviour | Why Expected | Complexity | Notes |
|-----------|--------------|------------|-------|
| User can choose a mode in Settings | Settings page (`/settings`) already exists as a placeholder; this is its first real content | Low | Segment control or radio group: Normal / Intensive / Exam Prep |
| Mode persists server-side per user | The mode must survive across devices and sessions | Medium | New `UserSettings` model in Prisma (or a `studyMode` column on `User`). `User` already has an `isActive` field — adding `studyMode` directly to `User` is the simplest migration. |
| Mode applies when `POST /api/study/rate` is called | The backend must read the user's mode and apply the multiplier inside `calculateSM2` | Low | `calculateSM2` already receives `SM2Input`; add optional `intervalMultiplier` param. Backend fetches user's `studyMode` at rate time and maps it to a multiplier. |
| Normal mode is the default and produces identical output to current behaviour | No regression for existing users | None | Default `studyMode = 'normal'`; multiplier 1.0 passes through unchanged. |
| Mode selection shows a short human-readable description of what each mode does | Users need to understand impact before choosing | Low | Helper text under each option explaining review frequency change. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Visual mode indicator in the study session header | Reminds user they are in a non-default mode so they aren't surprised by rapid recurrence | Low | Small badge "Intensive" in session top bar, only when non-Normal |
| Mode can be changed at any time (not locked to a deck or session) | Flexibility for users adjusting to exam seasons | None | Just a settings update |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Per-deck SM-2 modes | Increases cognitive load; users forget which deck has which mode | One global mode the user sets consciously |
| Per-session mode picker on the study start screen | Clutter on the start screen; mode should reflect a study phase (weeks), not a single session | Put it in Settings only |
| Retroactively rescheduling existing `CardProgress` on mode change | Complex, lossy, and surprising | Apply multiplier only to future `nextReview` calculations |
| Exposing the raw multiplier number in the UI | "0.25x" is meaningless to most users | Named presets with plain-language descriptions |
| Custom arbitrary multiplier input | Out of scope; 3 presets cover the practical range; YAGNI | Presets only |
| Ease-factor modification (changing starting EF or EF floor) | SM-2 EF floor is 1.3 per SuperMemo research — lowering it causes pathological scheduling | Only modify interval multiplier |

### Implementation Notes

Current `calculateSM2` in `packages/shared/src/lib/sm2.ts`:

```typescript
// Line 55: newInterval = Math.ceil(interval * easeFactor)
```

The multiplier wraps this result: `Math.max(1, Math.ceil(rawInterval * multiplier))`. Floor at 1 day prevents multiplied intervals from collapsing to 0.

Mapping:
```
'normal'   → 1.0
'intensive' → 0.5
'exam_prep' → 0.25
```

Backend `POST /api/study/rate` fetches `user.studyMode`, computes multiplier, passes to `calculateSM2`. The shared `SM2Input` type gains an optional `intervalMultiplier?: number` field.

### Dependencies on Existing Features

- `calculateSM2` in `packages/shared` — add `intervalMultiplier` param
- Prisma `User` model — add `studyMode String @default("normal")`
- New Zod schema `StudyModeSchema = z.enum(['normal', 'intensive', 'exam_prep'])` in `packages/shared/src/schemas/user.ts`
- New backend route: `GET /api/settings` and `PUT /api/settings` (or `PATCH /api/auth/me` — consistent with how user profile would work)
- `/settings` page — currently `ComingSoon` placeholder, replace with real content
- `POST /api/study/rate` — reads `userId` → looks up `studyMode` → applies multiplier

---

## 3. PWA Installable Shell

### What "installable shell" means (scoped)

This is explicitly NOT full offline study. The target is:
- App is installable to the home screen on Android/iOS/desktop Chrome
- Static assets (JS, CSS, HTML, fonts, icons) are cached by the service worker after first visit — subsequent loads are instant even if the network is slow
- API calls (`/api/*`) always go to the network; no offline card data
- An optional in-app install prompt gives users a discoverable way to install

### Table Stakes

| Behaviour | Why Expected | Complexity | Notes |
|-----------|--------------|------------|-------|
| `manifest.webmanifest` with required fields (`name`, `short_name`, `start_url`, `display: standalone`, `theme_color`, `background_color`, icons) | Without this, browsers do not offer installation | Low | `vite-plugin-pwa` generates it from config |
| 192×192 and 512×512 PNG icons (standard purpose) | Chrome requires both sizes before firing `beforeinstallprompt` | Low | Create 2 PNGs in `apps/frontend/public/` |
| 512×512 maskable icon | Android adaptive icons crop to a circle; without maskable the icon looks bad | Low | Same design with safe-zone padding |
| `apple-touch-icon` meta tag pointing to 180×180 PNG | iOS Safari ignores manifest icons and reads this tag | Low | One PNG, one `<link>` in `index.html` |
| Service worker pre-caches all Vite build output (JS, CSS, HTML) | Users get instant loads on second visit | Low | `workbox.globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']` |
| WASM files excluded from precache or handled separately | `typst.ts` WASM is large and changes rarely; incorrect caching config causes stale errors | Medium | Use `globIgnores` for WASM or set a network-first strategy for WASM requests |
| Service worker update prompt (toast/banner) when a new version is deployed | Users on the installed PWA need to know there's an update | Low | `useRegisterSW` hook from `vite-plugin-pwa/react`; show toast with reload action |
| `registerType: 'prompt'` (not `'autoUpdate'`) | Auto-update silently reloads the page mid-session — unacceptable during a study session | Low | Use prompt strategy; user explicitly triggers reload |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| In-app "Install App" button in the AppShell header or Settings page | Makes install discoverable; browser's native prompt is easy to miss | Low | Capture `beforeinstallprompt` event; show a button when event fires and app is not already installed; hide after install |
| Install button checks `display-mode: standalone` to auto-hide when already installed | No redundant prompt after install | Low | `window.matchMedia('(display-mode: standalone)').matches` |
| `theme_color` matches the app's primary brand colour (dark mode aware if possible) | Integrated look in the OS task switcher | Low | Use Kartex's shadcn/ui primary colour |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Caching `/api/*` responses in the service worker | API data becomes stale; cached auth cookies could serve wrong-user data | Use `networkOnly` strategy for all `/api/*` routes — explicit in Workbox config |
| Offline fallback page that implies the app works offline | Users expect to study, get a blank page, assume the app is broken | Either no offline page, or an honest "you need a connection to study Kartex" message |
| `registerType: 'autoUpdate'` | Forces page reload without user consent — disruptive during a study session | Use `'prompt'` and surface a gentle update banner |
| Requiring service worker for app to function at all | HTTPS + service worker requirement breaks localhost development unless `devOptions.enabled` is properly set | Keep `devOptions.enabled: false` in dev by default; enable explicitly when testing PWA features |
| Push notifications | No backend infrastructure exists for web push; adds significant complexity | Out of scope for this milestone |

### Technical Context

- No `apps/frontend/public/` directory exists yet — must create it
- `vite.config.ts` does not include `VitePWA` plugin — must add it
- Build output goes to `apps/backend/public/` (Hono serveStatic) — Vite's `outDir` is already set; the manifest and service worker will land there automatically
- COOP/COEP headers (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`) are set in dev proxy for Typst WASM; these headers are compatible with PWA installation but must be present on the deployed Hono server too for WASM to work in the installed PWA
- `vite-plugin-pwa` version to use: `^0.21.x` (latest stable as of research date) — check npm at implementation time

### Dependencies on Existing Features

- `apps/frontend/vite.config.ts` — add `VitePWA(...)` to plugins array
- `apps/frontend/index.html` — add `<link rel="apple-touch-icon">` and `<meta name="theme-color">`
- `apps/frontend/public/` — create directory, add icon PNGs
- `apps/backend/src/index.ts` or wherever Hono COOP/COEP headers are set — verify headers are present for deployed build (not just dev proxy)
- `AppShell.tsx` — add optional install button component

---

## 4. Documentation

### What "good docs" look like for this project

Kartex is self-hosted by a technically capable operator, likely the developer themselves or a small group. Docs need to answer: "How do I run this?" and "How does the .kartex format work?" They do not need to be exhaustive tutorials.

### Table Stakes

| Doc | Why Expected | Complexity | Notes |
|-----|--------------|------------|-------|
| `README.md` at repo root with: project description, tech stack table, quick-start (clone → .env → docker compose up), screenshot or feature list, link to /docs | Any public or shared repo without a README looks abandoned | Low | Static markdown; write once |
| `docs/design.md` updated to reflect v1.1 reality | design.md was last updated in v0.4; it references Nginx which was removed (D-05/D-06), pnpm (codebase uses yarn@4.15.0), and does not mention i18n, mobile shell, or tag filter | Medium | Audit each section against actual code; correct inaccuracies |
| `docs/kartex-format.md` updated to include all supported content types | Should document `#typst` blocks, audio, code blocks, and the .kartex.zip bundle format if not already present | Low | Read current file, identify gaps, fill them |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Architecture diagram in design.md (text-based or Mermaid) showing the current Hono-serves-SPA setup | The Nginx removal changed the system topology; current design.md diagrams may be wrong | Low | Mermaid or ASCII is sufficient |
| Quick-start includes a note about invite-code flow | First-time operators don't know how to create the first admin user | Low | One paragraph |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Exhaustive API reference docs | Zod schemas + Hono route comments are sufficient; generating full OpenAPI docs is a separate project | Keep route comments tight; no separate API doc file this milestone |
| Video walkthroughs or screenshot-heavy tutorials | High maintenance cost when UI changes | Plain text + one representative screenshot in README if easy to add |

### Dependencies on Existing Features

- No code changes required for docs
- design.md accuracy depends on reading actual backend routes, Prisma schema, and Docker Compose file to verify claims
- kartex-format.md accuracy depends on reading the kartex-parser in `packages/shared/src/lib/kartex-parser.ts`

---

## Feature Dependency Map

```
isActive on Deck schema
  └── DeckSchema (shared/schemas/deck.ts)  [isActive field]
       ├── DecksPage toggle UI
       ├── DeckDetailPage toggle UI
       └── GET /api/study/due filter
            └── Deck picker pre-step in StudySessionPage
                 └── Tag filter re-fetch after deck selection

studyMode on User (or UserSettings model)
  └── StudyModeSchema (shared/schemas/user.ts)
       ├── PUT /api/settings endpoint (new)
       ├── GET /api/settings endpoint (new)
       ├── POST /api/study/rate reads mode → multiplier
       │    └── calculateSM2 gains intervalMultiplier param
       └── SettingsPage (new real page, replaces ComingSoon)

PWA manifest + service worker
  └── vite-plugin-pwa in vite.config.ts
       ├── apps/frontend/public/ (new dir + icons)
       ├── index.html (apple-touch-icon, theme-color meta)
       └── AppShell.tsx (optional install button)

Docs
  └── No code dependencies
```

---

## MVP Recommendation

For each feature, the minimum shippable version:

**Active deck rotation:** `isActive` DB column + filter in `/due` endpoint + toggle on deck list. Deck picker is additive but ships together since `/study` page needs a pre-step anyway.

**SM-2 modes:** `studyMode` column on `User` + real Settings page + multiplier in `/rate`. All three must ship together or the feature is unreachable from the UI.

**PWA:** manifest + 3 icons + service worker precache + update prompt. Install button in AppShell is low-effort and meaningfully improves discoverability — include it.

**Docs:** README.md is highest value (first impression for any new operator). design.md accuracy is important but lower urgency. kartex-format.md is reference-only.

Defer:
- WASM-aware service worker routing: can start with blanket `networkOnly` for `/api/*` and revisit WASM caching separately if needed
- "Inactive deck count" dashboard stat: nice-to-have, low priority

---

## Sources

- [Anki Manual — Studying](https://docs.ankiweb.net/studying.html) (Anki deck selection UX patterns)
- [Anki Manual — Filtered Decks](https://docs.ankiweb.net/filtered-decks.html) (multi-deck combine patterns)
- [Fresh Cards changelog](https://freshcardsapp.com/changelog/) (deck status dot UX for paused/active decks)
- [RemNote — Anki SM-2 Algorithm](https://help.remnote.com/en/articles/6026144-the-anki-sm-2-spaced-repetition-algorithm) (interval multiplier / interval factor mechanics)
- [Control-Alt-Backspace — SM-2 overdue handling](https://controlaltbackspace.org/overdue-handling/) (EF floor rationale, aggressive scheduling risks)
- [vite-plugin-pwa guide](https://vite-pwa-org.netlify.app/guide/) (setup patterns, registerType options)
- [vite-plugin-pwa service worker precache](https://vite-pwa-org.netlify.app/guide/service-worker-precache) (globPatterns configuration)
- [PWA Minimal Requirements — vite-pwa](https://vite-pwa-org.netlify.app/guide/pwa-minimal-requirements) (icon size requirements)
- [PWA Icon Requirements 2026](https://logofoundry.app/blog/pwa-icon-requirements-safe-areas) (maskable icon safe zone, apple-touch-icon)
- [Chapimaster — Add Install PWA Button in React](https://www.chapimaster.com/programming/vite/add-install-app-button-react-pwa) (beforeinstallprompt pattern, install button placement)
