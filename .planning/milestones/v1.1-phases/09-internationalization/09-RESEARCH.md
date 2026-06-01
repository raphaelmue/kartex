# Phase 9: Internationalization - Research

**Researched:** 2026-06-01
**Domain:** react-i18next, i18next-browser-languagedetector, Vitest test mocking
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Ship English + German in v1.1. Both locales are fully translated — `de.json` must be complete, not a stub.
- **D-02:** Single file per language: `apps/frontend/src/locales/en.json` and `apps/frontend/src/locales/de.json`. No namespace split — one file per locale covers the entire app.
- **D-03:** Type-safe translation keys. Augment react-i18next TypeScript types from `en.json` so `t('nonexistent.key')` is a TypeScript compile error. Pattern: declare `CustomTypeOptions` in a `src/i18n.d.ts` type file referencing the English locale as the source of truth.
- **D-04:** Language switcher lives in the AppShell sidebar, near the existing theme toggle (bottom of the sidebar). The `/settings` route stays as `<ComingSoon>` — no real Settings page in this phase.
- **D-05:** Visual: compact toggle button showing the current language code (EN / DE). Clicking it cycles to the next language. Same size and style pattern as the theme toggle button (`Button variant="ghost" size="icon"`).
- **D-06:** Language selection persists to localStorage via `i18next-browser-languagedetector`. Survives page reload and new sessions. Detection order: localStorage → browser language → fallback to English (`en`).
- **D-07:** Content NOT translated (never pass through `t()`): user-authored content (deck titles, card fronts/backs, descriptions, tags), usernames/email addresses (interpolated into translated strings: `t('loggedInAs', { name: user.username })`), media filenames/file paths shown in upload/import UI, KaTeX and Typst math expressions inside card content.
- **D-08:** Backend error messages: translate only generic frontend labels ("Something went wrong", "Failed to load", "Please try again"). Raw backend error strings must not be shown — they belong in `console.error` only.
- **D-09:** Translate aria-labels and accessibility strings too.

### Claude's Discretion
- Exact key naming convention within locale JSON (flat dotted keys vs nested objects)
- Whether to use `useTranslation()` hook directly in components or create a thin wrapper
- Whether language state lives in ThemeContext (co-located with theme) or a separate LanguageContext
- Exact positioning of the language toggle relative to the theme toggle in the sidebar
- i18next initialization location (`src/i18n.ts` imported once in `main.tsx` is the standard pattern)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| I18N-01 | Frontend uses react-i18next with a locale directory (`apps/frontend/src/locales/`) | Library setup, init pattern, type augmentation — §Standard Stack, §Library Setup |
| I18N-02 | All frontend UI strings are externalized to locale JSON and use `t()` calls | File inventory in §File Inventory, edge cases in §Edge Cases |
| I18N-03 | User can switch the application language via a language selector | Language switcher pattern, AppShell integration — §Architecture Patterns |
</phase_requirements>

---

## Summary

Phase 9 adds i18n to the frontend only. The library choice (react-i18next + i18next-browser-languagedetector) is locked. Research confirms the exact setup pattern from official docs, verified the npm packages as legitimate, and performed a full codebase scan to enumerate every hardcoded string that needs wrapping.

The most important finding is **how to handle existing tests**: the current test suite mocks individual contexts (AuthContext, ThemeContext) per file using `vi.mock`. Adding `useTranslation()` to components will cause those tests to fail unless i18next is initialized globally in the vitest setup file. The correct solution is a one-time i18n test initialization in `src/test/setup.ts` — not per-file mocking — so all existing tests continue to pass unmodified.

The second key finding is **key naming convention**: research favors nested JSON objects (e.g., `{ "nav": { "dashboard": "Dashboard" } }`) over flat dotted keys (`"nav.dashboard": "Dashboard"`) because nested objects give TypeScript better type inference (each level is a typed object property rather than a union of string literals), and the react-i18next type system produces more precise completions with nested structures.

**Primary recommendation:** Use nested JSON key structure; initialize i18next with `initImmediate: false` in the test setup file; mock `react-i18next` globally in `src/test/setup.ts` using `vi.mock` so all component tests receive `t: (key) => key` without per-file setup.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Translation key lookup at render | Browser / Client | — | `useTranslation()` runs in the browser React tree; no SSR |
| Language persistence | Browser / Client | — | localStorage via LanguageDetector, purely client-side |
| Locale JSON storage | CDN / Static | — | Bundled into the Vite build output; served as static assets |
| Language switcher UI | Browser / Client | — | React component in AppShell; calls `i18n.changeLanguage()` |
| Type-safe key validation | Build-time only | — | TypeScript compile check; zero runtime cost |
| Backend error text | API / Backend | — | Never translated; swallowed into `console.error` or shown as generic label |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-i18next` | 17.0.8 | React hooks + components for i18next | The official React binding; exports `useTranslation`, `initReactI18next`, `I18nextProvider` |
| `i18next` | 26.3.0 | Core i18n engine | Peer dependency of react-i18next; handles key lookup, interpolation, pluralization |
| `i18next-browser-languagedetector` | 8.2.1 | Detects locale from localStorage/browser | Handles D-06 detection order out of the box with zero custom code |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None additional | — | — | No additional packages required; JSON imports are native in Vite |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-i18next | LinguiJS, FormatJS | react-i18next is more widely adopted, has React hooks-first API, and matches the CONTEXT.md locked decision |

**Installation:**
```bash
pnpm --filter @kartex/frontend add react-i18next i18next i18next-browser-languagedetector
```

**Version verification:**
```
react-i18next    17.0.8   [VERIFIED: npm registry]
i18next          26.3.0   [VERIFIED: npm registry]
i18next-browser-languagedetector  8.2.1   [VERIFIED: npm registry]
```

---

## Package Legitimacy Audit

| Package | Registry | slopcheck | Disposition |
|---------|----------|-----------|-------------|
| `react-i18next` | npm | [OK] | Approved |
| `i18next` | npm | [OK] | Approved |
| `i18next-browser-languagedetector` | npm | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

All three packages scanned clean. `i18next` has been active since 2011, `react-i18next` since 2016 — both are among the highest-downloaded i18n packages on npm. [VERIFIED: npm registry, slopcheck 0.6.1]

---

## File Inventory

Complete scan of every `.tsx`/`.ts` file in `apps/frontend/src` containing hardcoded UI strings that require `t()` wrapping. User-authored content (deck titles, card text, tags) is explicitly excluded per D-07.

### AppShell.tsx
**Strings to wrap:**
- `navItems` array labels: `'Dashboard'`, `'Decks'`, `'Import'`, `'Explore'`, `'Settings'`
- Hardcoded `'Admin'` (line 106 and line 208) in the admin NavLink render
- `aria-label` on theme toggle: `theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'` (two instances — desktop sidebar and mobile drawer)
- `aria-label="Main navigation"` (two instances — desktop `<nav>` and mobile drawer `<nav>`)
- `aria-label="Open navigation menu"` on hamburger button
- `aria-expanded` is a boolean — no wrapping needed
- `aria-controls` is an ID — no wrapping needed
- Footer: `'© Kartex'`, `'GitHub'`, `'Docs'` (link labels)
- `'Log out'` button label (two instances)
- Dynamic page title in header: `currentLabel` — derived from `navItems[].label`, which will already be translated once `navItems` uses `t()`. The fallback `'Admin'` and `'Kartex'` strings in the `currentLabel` expression must also use `t()`.

**New strings for language switcher (to be created):**
- `aria-label` on language toggle button: `t('a11y.switchLanguage')`
- Button text: `'EN'` / `'DE'` (can remain as literal language codes, OR use `t('lang.en')` / `t('lang.de')`)

### DashboardPage.tsx
- `document.title = 'Dashboard — Kartex'` (in `useEffect`)
- `'cards due today'` (below the big count)
- `'Start Studying'` (button)
- `"You're all caught up!"` (empty state heading)
- `'No cards are due today. Come back tomorrow.'` (empty state body)
- `aria-label="Due cards by deck"` (table)
- Table headers: `'Deck'`, `'Due'`
- `'No cards due across any deck.'` (empty table row)
- `'Reviewed today'` (stat chip label)
- `'Streak'` (stat chip label)
- `'{N} days'` — `{stats.streak} days` is an interpolated string: becomes `t('dashboard.streakDays', { count: stats.streak })`
- Toast: `'Could not load your cards. Please refresh.'`
- Toast: `'Could not reach the server. Check your connection.'`

### DecksPage.tsx
- `document.title = 'Decks — Kartex'`
- `'Decks'` (page heading `<h2>`)
- `'New Deck'` (two button instances)
- Visibility badge strings: `'Public'`, `'Shared'`, `'Private'` (in `VisibilityBadge`)
- `'Shared by {username}'` — interpolated: `t('decks.sharedBy', { username: deck.sharedByUsername })`
- `'{N} card'` / `'{N} cards'` — pluralization: `t('decks.cardCount', { count })` (i18next plural suffix convention)
- Empty state: `'No decks yet'`, `'Create your first deck to start organizing your flashcards.'`
- Buttons: `'Study'`, `'Open'`, `'Edit'`, `'Delete'`
- Confirm delete: `'Are you sure?'`, `'Yes, delete'`, `'Cancel'`
- Toasts: `'Deck deleted'`, `'Failed to load decks. Please try again.'`, `'Could not reach the server. Check your connection.'`, `'Something went wrong. Please try again.'`

### DeckDetailPage.tsx
- `document.title` dynamic: `\`${deck.title} — Kartex\`` and `'Deck — Kartex'`
- `'Owned by {username}'` — interpolated: `t('deckDetail.ownedBy', { username })`
- Buttons: `'Study Deck'`, `'Edit Deck'`, `'Delete Deck'`, `'Add Card'`, `'Add User'`, `'Revoke Access'`
- Buttons: `'Edit'`, `'Delete'` (in `CardActionCell`)
- Confirm delete: `'Are you sure?'`, `'Yes, delete'`, `'Cancel'`
- Table headers: `'#'`, `'Front'`, `'Tags'`, `'Actions'`, `'User'`, `'Permission'`
- Tag section header: `'— {N} cards'` — interpolated count
- Empty state (no cards): `'No cards yet'`, `'Add your first card to this deck.'`, `'This deck has no cards yet.'`
- `'Share this deck'` (section heading)
- `'Not shared with anyone yet.'`
- Permission badge strings: `'Manage'`, `'Edit'`, `'Read'` (in `PermissionBadge`)
- Visibility badge strings: `'Public'`, `'Shared'`, `'Private'` (duplicated from DecksPage — same keys)
- Select options for share permission: `'Read'`, `'Edit'`, `'Manage'`
- Input placeholder: `'Username'`
- `aria-label` on tagged-cards table: `\`Cards tagged ${tag}\`` — interpolated aria-label
- Toasts: `'Deck deleted'`, `'Card deleted'`, `'Something went wrong. Please try again.'`, `'Failed to load cards. Please try again.'`, `'Could not reach the server. Check your connection.'`
- Error: `'Failed to add user.'`

### LoginPage.tsx
- `document.title = 'Sign in — Kartex'`
- `<h1 className="sr-only">Sign in</h1>` (screen-reader heading)
- `CardTitle`: `'Sign in'`
- `CardDescription`: `'Welcome back.'`
- Form labels: `'Username'`, `'Password'`
- Input placeholders: `'Username'`, `'Password'`
- Submit button: `'Signing in...'`, `'Sign in'`
- Form error (set via `form.setError`): `'Invalid username or password.'`
- Footer: `"Don't have an account?"`, `'Register'` (link)
- Toast: `'Account created. Please sign in.'` (redirect from register)
- Toast: `'Something went wrong. Please try again.'`

### RegisterPage.tsx
- `document.title = 'Create account — Kartex'`
- `<h1 className="sr-only">Create account</h1>`
- `CardTitle`: `'Create account'`
- `CardDescription`: `'You need an invite code to register.'`
- Form labels: `'Username'`, `'Password'`, `'Invite code'`
- Input placeholders: `'Username'`, `'Password'`, `'Invite code'`
- Submit button: `'Creating account...'`, `'Create account'`
- Form errors: `'Invalid or expired invite code.'`, `'Username is already taken.'`
- Footer: `'Already have an account?'`, `'Sign in'` (link)
- Toast: `'Something went wrong. Please try again.'`

### StudySessionPage.tsx
- `document.title = 'Study — Kartex'`
- `'Back to deck'` (ghost button in mode selector)
- `'Study: {deckTitle}'` — `deckTitle` is user content (deck name, excluded per D-07). Pattern: `t('study.studyDeck')` as label, then `deckTitle` as adjacent text, OR `t('study.studyDeckLabel', { title: deckTitle })` with `escapeValue: false` already set
- `'Choose how you want to study'`
- `'Filter by tag'` (section label)
- `'Session size'`, `'(SR mode only)'`
- `SIZE_OPTIONS` labels: `'All due'`, `'10'`, `'20'`, `'Custom'` — `'10'` and `'20'` are numbers, but `'All due'` and `'Custom'` must be translated
- `'Select time limit'` (Select placeholder)
- EXAM_DURATIONS labels: `'5 minutes'`, `'10 minutes'`, `'15 minutes'`, `'30 minutes'`, `'60 minutes'` — should be translated with interpolation: `t('study.nMinutes', { count: 5 })`
- Mode card titles: `'Spaced Repetition'`, `'Deck Mode'`, `'Exam Mode'`
- Mode card descriptions: `'Cards due today, SM-2 algorithm'`, `'All cards in order, progress saved'`, `'Time-limited, progress not saved'`
- Mode card stats: `'{N} cards due'`, `'{N} cards total'` — interpolated
- `'Start Exam'` button
- `'Leave Session'` button + `aria-label="Leave study session"`
- Timer-expired banner: `"Time's up! Rate this card to finish."`
- Empty state: `'No cards to study!'`, `'All caught up. Come back tomorrow.'`, `'Return to Dashboard'` (button)
- Session done: `'Session complete!'`
- Session done stats: `'You reviewed {N} cards in {M}m {S}s.'` (exam mode), `'You reviewed {N} cards.'` (other modes) — interpolated
- Rating counts labels: `'Again:'`, `'Hard:'`, `'Good:'`, `'Easy:'`
- Buttons: `'Return to Dashboard'`, `'Restart Session'`
- Loading: `'Loading cards…'`
- Toast: `'Could not load this session. Please go back and try again.'`

### AdminPage.tsx
- `document.title = 'Admin — Kartex'`
- `'Admin'` (page heading)
- Section: `CardTitle` `'Invite codes'`, `CardDescription` `'Generate one-time invite codes for new user registration.'`
- Section: `CardTitle` `'Users'`, `CardDescription` `'Manage user accounts and roles.'`
- Form label: `'Expiry (days)'`
- Button: `'Generating...'`, `'Generate'`
- Table headers (invite codes): `'Code'`, `'Status'`, `'Used By'`, `'Expires'`, `'Actions'`
- Table headers (users): `'Username'`, `'Role'`, `'Status'`, `'Joined'`, `'Actions'`
- Empty states: `'No invite codes yet.'`, `'No users yet.'`
- Invite status badges: `'Active'`, `'Used'`, `'Expired'` (in `InviteStatusBadge`)
- Role badges: `'Admin'`, `'User'` (in `RoleBadge`)
- Status badges: `'Active'`, `'Inactive'` (in `StatusBadge`)
- Buttons: `'Delete'`, `'Yes, delete'`, `'Cancel'`, `'Deactivate'`, `'Yes, deactivate'`
- Role toggle button: `'Make user'`, `'Make admin'` (dynamic based on current role)
- Confirm: `'Are you sure?'`
- `aria-label="Invite codes"` (table), `aria-label="Users"` (table)
- Toasts: `'Invite code generated'`, `'Invite code deleted'`, `'Role updated'`, `'Account deactivated'`, `'Something went wrong. Please try again.'`

### ExplorePage.tsx
- `document.title = 'Explore — Kartex'`
- `'Explore'` (page heading)
- Empty state: `'No public decks yet'`, `'Decks made public will appear here.'`
- `'by {username}'` — `by` is a UI string; username is excluded. Pattern: `t('explore.byAuthor', { username: deck.owner.username })`
- `'{N} card'` / `'{N} cards'` — same pluralization key as decks page
- Buttons: `'Add to Library'`, `'Adding…'`, `'Fork Deck'`, `'Forking…'`
- Toast: `'Already in your library.'`
- Toast: `"'{title}' added to your library."` — title is user content, should be in interpolation: `t('explore.addedToLibrary', { title: deck.title })`
- Toast action label: `'View decks'`
- Toast: `"Deck forked — 'Copy of {title}' added to your decks."` — `t('explore.forkedDeck', { title: deck.title })`
- Toast action label: `'View deck'`
- Toast errors: `'Failed to load explore decks. Please try again.'`, `'Could not reach the server. Check your connection.'`, `'Failed to add to library. Please try again.'`, `'Failed to fork deck. Please try again.'`
- Loading: `'Loading…'` (p tag)

### ImportPage.tsx
- `document.title = 'Import — Kartex'`
- `'Import Deck'` (page heading h1)
- `'Upload a .kartex file or .kartex.zip bundle to import a deck.'` (subtitle)
- Alert titles: `'Import failed'` (two instances)
- Alert descriptions (zip validation failures): `'The following files in your zip failed validation:'`, `'Remove or fix these files and re-upload the zip.'`
- Drop zone `aria-label`: `'Upload a .kartex file. Click to browse or drag and drop.'`
- Drop zone text: `'Drop your file here, or click to browse'`
- Drop zone hint: `'.kartex or .kartex.zip · max {N} MB'` — `t('import.maxSize', { mb: limitMB })`
- Button: `'Browse file'`
- Parsing state `aria-label`: `'Processing file'`
- Parsing text: `'Parsing your file...'`
- Progress `aria-label`: `'Upload progress'`
- Parse warnings: `'{N} card {skipped}'` / `'{N} cards skipped'` — plural
- Warnings prefix: `'Card {index}:'` in the per-warning loop — `w.cardIndex` is data, `'Card'` label needs `t()`
- `'Back'` button
- `'Deck name'` (form label)
- `'Author:'` label (static prefix before `parseResult.deck.author` value)
- `'Showing {N} cards'`, `'({M} skipped)'` — interpolated
- `'File: {filename}'` — filename is user content, but `'File:'` label needs `t()`
- `'Cancel'` button
- Import button: `'Importing...'`, `'Import Deck'`
- Import button title: `'Deck name cannot be empty.'`
- `aria-label` on card preview list: `'Card preview list, {N} cards'`
- Success: `'Deck imported!'`
- Success: `'"{name}" was created with {N} cards.'` — name is user content, interpolated
- Buttons: `'View Deck'`, `'Import another file'`
- ZIP note: `'Card preview is not available for .kartex.zip bundles. Click "Import Deck" to import — the file will be validated and imported on the server.'`

### CardEditorModal.tsx
- Dialog title: `'Edit Card'`, `'Add Card'` (dynamic)
- Tab labels: `'Edit'`, `'Preview'` (two instances — Front and Back)
- Form labels: `'Front'`, `'Back'`
- Textarea placeholders: `'Front side content (Markdown)'`, `'Back side content (Markdown)'`
- Label: `'Tags (comma-separated, optional)'`
- Input placeholder: `'react, typescript, algorithms'`
- Buttons: `'Cancel'`, `'Saving...'`, `'Save Card'`
- Toasts: `'Card updated'`, `'Card added'`, `'Something went wrong. Please try again.'`

### DeckFormModal.tsx
- Dialog title: `'Edit Deck'`, `'New Deck'` (dynamic)
- Form labels: `'Title'`, `'Description'`, `'Visibility'`
- Input placeholder: `'Deck title'`
- Textarea placeholder: `'Optional description'`
- Select options: `'Private'`, `'Shared'`, `'Public'`
- Buttons: `'Cancel'`, `'Saving...'`, `'Save Changes'`, `'Create Deck'`
- Toasts: `'Deck updated'`, `'Deck created'`, `'Something went wrong. Please try again.'`

### CardFlip.tsx
- `aria-label="Flashcard. Click or press Space to reveal answer."` (flip card button)
- Section labels: `'Front'` (two instances), `'Back'` (one instance)
- `'Click or press Space to reveal'` (hint text)

### RatingButtons.tsx
- `RATINGS` array labels: `'Again'`, `'Hard'`, `'Good'`, `'Easy'`
- `aria-label` pattern: `'Rate: {label}, keyboard shortcut {shortcut}'` — both label and shortcut are data, but `'Rate:'` and `'keyboard shortcut'` are UI strings. Full aria-label needs `t('rating.ariaLabel', { label, shortcut })`

### SessionProgress.tsx
- `'Card {N} of {M}'` — interpolated: `t('session.progress', { current, total })`
- `aria-label={`Card ${current} of ${total}`}` — same key or sibling key

### MediaUploadToolbar.tsx
- `aria-label="Upload image"` (button)
- `aria-label="Upload audio"` (button)
- Toasts: `'Image uploaded'`, `'Audio uploaded'`, `'Upload failed. Please try again.'`

### ExamTimer.tsx
- `aria-label={\`${mins}:${secs} remaining\`}` — interpolated: `t('exam.timeRemaining', { time: \`${mins}:${secs}\` })`

### ProtectedRoute.tsx, AdminRoute.tsx
- No hardcoded UI strings visible. [VERIFIED: file read]

### App.tsx
- No hardcoded UI strings. [VERIFIED: file read]

### main.tsx
- No hardcoded UI strings. [VERIFIED: file read]

---

## Locale Key Structure

**Recommendation: nested JSON objects** (Claude's discretion area).

Nested JSON gives TypeScript better type inference per the i18next TypeScript documentation [CITED: i18next.com/overview/typescript]: each nesting level is a typed property, TypeScript error messages point to the specific missing key at the exact nesting level, and IDE autocomplete navigates the object hierarchy. Flat dotted keys produce a large union type that is harder to navigate.

**Convention:** Group by feature/page, then by string role.

```json
{
  "nav": {
    "dashboard": "Dashboard",
    "decks": "Decks",
    "import": "Import",
    "explore": "Explore",
    "settings": "Settings",
    "admin": "Admin"
  },
  "a11y": {
    "mainNav": "Main navigation",
    "openMenu": "Open navigation menu",
    "switchToDark": "Switch to dark mode",
    "switchToLight": "Switch to light mode",
    "switchLanguage": "Switch language",
    "flashcard": "Flashcard. Click or press Space to reveal answer.",
    "uploadImage": "Upload image",
    "uploadAudio": "Upload audio",
    "leaveSession": "Leave study session"
  },
  "auth": {
    "signIn": "Sign in",
    "signInTitle": "Sign in",
    "welcomeBack": "Welcome back.",
    "username": "Username",
    "password": "Password",
    "signingIn": "Signing in...",
    "noAccount": "Don't have an account?",
    "register": "Register",
    "invalidCredentials": "Invalid username or password.",
    "createAccount": "Create account",
    "createAccountTitle": "Create account",
    "needInvite": "You need an invite code to register.",
    "inviteCode": "Invite code",
    "creatingAccount": "Creating account...",
    "alreadyHaveAccount": "Already have an account?",
    "invalidInvite": "Invalid or expired invite code.",
    "usernameTaken": "Username is already taken.",
    "accountCreated": "Account created. Please sign in."
  },
  "common": {
    "cancel": "Cancel",
    "save": "Save",
    "saving": "Saving...",
    "delete": "Delete",
    "edit": "Edit",
    "confirm": "Are you sure?",
    "yesDelete": "Yes, delete",
    "logOut": "Log out",
    "loading": "Loading…",
    "somethingWrong": "Something went wrong. Please try again.",
    "serverUnreachable": "Could not reach the server. Check your connection.",
    "nCards_one": "{{count}} card",
    "nCards_other": "{{count}} cards"
  },
  "visibility": {
    "public": "Public",
    "shared": "Shared",
    "private": "Private"
  },
  "dashboard": {
    "title": "Dashboard — Kartex",
    "cardsDueToday": "cards due today",
    "startStudying": "Start Studying",
    "allCaughtUp": "You're all caught up!",
    "noDueCards": "No cards are due today. Come back tomorrow.",
    "deckColumn": "Deck",
    "dueColumn": "Due",
    "noDueAnyDeck": "No cards due across any deck.",
    "reviewedToday": "Reviewed today",
    "streak": "Streak",
    "streakDays": "{{count}} days"
  },
  "decks": {
    "title": "Decks — Kartex",
    "pageHeading": "Decks",
    "newDeck": "New Deck",
    "noDecksYet": "No decks yet",
    "createFirst": "Create your first deck to start organizing your flashcards.",
    "sharedBy": "Shared by {{username}}",
    "studyButton": "Study",
    "openButton": "Open",
    "editButton": "Edit",
    "deleteButton": "Delete",
    "deckDeleted": "Deck deleted",
    "failedToLoad": "Failed to load decks. Please try again."
  },
  "deckDetail": {
    "title": "Deck — Kartex",
    "ownedBy": "Owned by {{username}}",
    "studyDeck": "Study Deck",
    "editDeck": "Edit Deck",
    "deleteDeck": "Delete Deck",
    "addCard": "Add Card",
    "nCardsInGroup": "— {{count}} cards",
    "noCardsYet": "No cards yet",
    "addFirstCard": "Add your first card to this deck.",
    "deckHasNoCards": "This deck has no cards yet.",
    "shareThisDeck": "Share this deck",
    "usernamePlaceholder": "Username",
    "addUser": "Add User",
    "revokeAccess": "Revoke Access",
    "notShared": "Not shared with anyone yet.",
    "userColumn": "User",
    "permissionColumn": "Permission",
    "failedToAddUser": "Failed to add user.",
    "cardDeleted": "Card deleted",
    "failedToLoadCards": "Failed to load cards. Please try again.",
    "cardsTableAriaLabel": "Cards tagged {{tag}}"
  },
  "permission": {
    "read": "Read",
    "edit": "Edit",
    "manage": "Manage"
  },
  "table": {
    "numberColumn": "#",
    "frontColumn": "Front",
    "tagsColumn": "Tags",
    "actionsColumn": "Actions",
    "codeColumn": "Code",
    "statusColumn": "Status",
    "usedByColumn": "Used By",
    "expiresColumn": "Expires",
    "usernameColumn": "Username",
    "roleColumn": "Role",
    "joinedColumn": "Joined"
  },
  "cardEditor": {
    "editCard": "Edit Card",
    "addCard": "Add Card",
    "frontLabel": "Front",
    "backLabel": "Back",
    "editTab": "Edit",
    "previewTab": "Preview",
    "frontPlaceholder": "Front side content (Markdown)",
    "backPlaceholder": "Back side content (Markdown)",
    "tagsLabel": "Tags (comma-separated, optional)",
    "tagsPlaceholder": "react, typescript, algorithms",
    "saveCard": "Save Card",
    "cardUpdated": "Card updated",
    "cardAdded": "Card added"
  },
  "deckForm": {
    "editDeck": "Edit Deck",
    "newDeck": "New Deck",
    "titleLabel": "Title",
    "titlePlaceholder": "Deck title",
    "descriptionLabel": "Description",
    "descriptionPlaceholder": "Optional description",
    "visibilityLabel": "Visibility",
    "saveChanges": "Save Changes",
    "createDeck": "Create Deck",
    "deckUpdated": "Deck updated",
    "deckCreated": "Deck created"
  },
  "study": {
    "title": "Study — Kartex",
    "backToDeck": "Back to deck",
    "chooseMode": "Choose how you want to study",
    "filterByTag": "Filter by tag",
    "sessionSize": "Session size",
    "srModeOnly": "(SR mode only)",
    "sizeAllDue": "All due",
    "sizeCustom": "Custom",
    "selectTimeLimit": "Select time limit",
    "nMinutes_one": "{{count}} minute",
    "nMinutes_other": "{{count}} minutes",
    "srTitle": "Spaced Repetition",
    "srDescription": "Cards due today, SM-2 algorithm",
    "nCardsDue": "{{count}} cards due",
    "deckModeTitle": "Deck Mode",
    "deckModeDescription": "All cards in order, progress saved",
    "nCardsTotal": "{{count}} cards total",
    "examTitle": "Exam Mode",
    "examDescription": "Time-limited, progress not saved",
    "startExam": "Start Exam",
    "leaveSession": "Leave Session",
    "timesUp": "Time's up! Rate this card to finish.",
    "noCardsToStudy": "No cards to study!",
    "allCaughtUp": "All caught up. Come back tomorrow.",
    "returnToDashboard": "Return to Dashboard",
    "sessionComplete": "Session complete!",
    "reviewedCards": "You reviewed {{count}} cards.",
    "reviewedCardsWithTime": "You reviewed {{count}} cards in {{min}}m {{sec}}s.",
    "restartSession": "Restart Session",
    "loadingCards": "Loading cards…",
    "couldNotLoad": "Could not load this session. Please go back and try again."
  },
  "rating": {
    "again": "Again",
    "hard": "Hard",
    "good": "Good",
    "easy": "Easy",
    "ariaLabel": "Rate: {{label}}, keyboard shortcut {{shortcut}}"
  },
  "session": {
    "progress": "Card {{current}} of {{total}}",
    "progressAriaLabel": "Card {{current}} of {{total}}"
  },
  "exam": {
    "timeRemaining": "{{time}} remaining"
  },
  "explore": {
    "title": "Explore — Kartex",
    "pageHeading": "Explore",
    "noPublicDecks": "No public decks yet",
    "noPublicDecksHint": "Decks made public will appear here.",
    "byAuthor": "by {{username}}",
    "addToLibrary": "Add to Library",
    "adding": "Adding…",
    "forkDeck": "Fork Deck",
    "forking": "Forking…",
    "alreadyInLibrary": "Already in your library.",
    "addedToLibrary": "\"{{title}}\" added to your library.",
    "viewDecks": "View decks",
    "forkedDeck": "Deck forked — \"Copy of {{title}}\" added to your decks.",
    "viewDeck": "View deck",
    "failedToLoad": "Failed to load explore decks. Please try again.",
    "failedToAdd": "Failed to add to library. Please try again.",
    "failedToFork": "Failed to fork deck. Please try again."
  },
  "import": {
    "title": "Import — Kartex",
    "pageHeading": "Import Deck",
    "subtitle": "Upload a .kartex file or .kartex.zip bundle to import a deck.",
    "importFailed": "Import failed",
    "zipValidationFail": "The following files in your zip failed validation:",
    "zipFixHint": "Remove or fix these files and re-upload the zip.",
    "dropZoneAriaLabel": "Upload a .kartex file. Click to browse or drag and drop.",
    "dropZoneText": "Drop your file here, or click to browse",
    "maxSize": ".kartex or .kartex.zip · max {{mb}} MB",
    "browseFile": "Browse file",
    "processingAriaLabel": "Processing file",
    "parsingFile": "Parsing your file...",
    "uploadProgressAriaLabel": "Upload progress",
    "cardsSkipped_one": "{{count}} card skipped",
    "cardsSkipped_other": "{{count}} cards skipped",
    "cardN": "Card {{index}}:",
    "back": "Back",
    "deckNameLabel": "Deck name",
    "author": "Author:",
    "showingCards": "Showing {{count}} cards",
    "skippedCount": "({{count}} skipped)",
    "fileLabel": "File:",
    "importDeck": "Import Deck",
    "importing": "Importing...",
    "deckNameRequired": "Deck name cannot be empty.",
    "previewAriaLabel": "Card preview list, {{count}} cards",
    "deckImported": "Deck imported!",
    "importedWithCards": "\"{{name}}\" was created with {{count}} cards.",
    "viewDeck": "View Deck",
    "importAnotherFile": "Import another file",
    "zipNoPreview": "Card preview is not available for .kartex.zip bundles. Click \"Import Deck\" to import — the file will be validated and imported on the server."
  },
  "admin": {
    "title": "Admin — Kartex",
    "pageHeading": "Admin",
    "inviteCodesTitle": "Invite codes",
    "inviteCodesDesc": "Generate one-time invite codes for new user registration.",
    "usersTitle": "Users",
    "usersDesc": "Manage user accounts and roles.",
    "expiryDaysLabel": "Expiry (days)",
    "generating": "Generating...",
    "generate": "Generate",
    "noInviteCodes": "No invite codes yet.",
    "noUsers": "No users yet.",
    "statusActive": "Active",
    "statusUsed": "Used",
    "statusExpired": "Expired",
    "roleAdmin": "Admin",
    "roleUser": "User",
    "accountActive": "Active",
    "accountInactive": "Inactive",
    "makeUser": "Make user",
    "makeAdmin": "Make admin",
    "deactivate": "Deactivate",
    "yesDeactivate": "Yes, deactivate",
    "inviteGenerated": "Invite code generated",
    "inviteDeleted": "Invite code deleted",
    "roleUpdated": "Role updated",
    "accountDeactivated": "Account deactivated"
  },
  "media": {
    "imageUploaded": "Image uploaded",
    "audioUploaded": "Audio uploaded",
    "uploadFailed": "Upload failed. Please try again."
  },
  "footer": {
    "copyright": "© Kartex",
    "github": "GitHub",
    "docs": "Docs"
  },
  "lang": {
    "en": "EN",
    "de": "DE"
  }
}
```

**Key naming rules:**
1. Top-level keys are feature/page names (lowercase)
2. Leaf keys are camelCase
3. Pluralization uses i18next convention: `key_one` / `key_other` (or `_zero`, `_two` etc. as needed)
4. Interpolation variables use `{{doubleCurly}}` — i18next default, no change to `escapeValue: false` needed
5. Keys shared across pages (e.g., `'Are you sure?'`, `'Cancel'`, `'Something went wrong'`) live under `common`

---

## Architecture Patterns

### System Architecture Diagram

```
main.tsx
  └── import './i18n'          ← runs i18next.init() before React renders
        ├── i18next-browser-languagedetector   ← reads localStorage / navigator.language
        ├── resources: { en: en.json, de: de.json }
        └── fallbackLng: 'en'

React tree
  └── <App>
        └── <AppShell>
              ├── useTranslation() → t()   ← all nav labels, aria-labels
              ├── <LanguageToggle>         ← calls i18n.changeLanguage('de'/'en')
              └── <Outlet />              ← pages
                    └── <SomePage>
                          └── useTranslation() → t()

i18n.changeLanguage('de')
  → i18next updates active language in memory
  → saves 'i18nextLng' to localStorage  (via LanguageDetector)
  → triggers React re-render of all components using useTranslation()
  → NO page reload required
```

### Recommended Project Structure
```
apps/frontend/src/
├── locales/
│   ├── en.json          ← English (source of truth for TypeScript types)
│   └── de.json          ← German (complete translation)
├── i18n.ts              ← i18next init (resources, detector, fallback)
├── i18n.d.ts            ← TypeScript CustomTypeOptions augmentation
└── components/
    └── AppShell.tsx     ← language toggle button added here
```

### Pattern 1: i18next Initialization (src/i18n.ts)

```typescript
// Source: https://react.i18next.com/getting-started [CITED]
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './locales/en.json'
import de from './locales/de.json'

export const resources = {
  en: { translation: en },
  de: { translation: de },
} as const

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'de'],
    interpolation: {
      escapeValue: false,  // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  })

export default i18n
```

**Import in main.tsx (before React renders):**
```typescript
import './i18n'              // must be first import
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// ...
```

### Pattern 2: TypeScript Type Augmentation (src/i18n.d.ts)

```typescript
// Source: https://www.i18next.com/overview/typescript [CITED]
import { resources } from './i18n'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: typeof resources['en']
  }
}
```

**Key insight:** Export `resources` from `i18n.ts` and reference it in `i18n.d.ts` — this is the recommended pattern from i18next docs [CITED: i18next.com/overview/typescript] because it avoids importing the JSON twice and TypeScript sees the `as const` annotation from the `resources` export. If `en.json` is imported directly into `i18n.d.ts` (without `as const`), type inference is weaker.

### Pattern 3: useTranslation in Components

```typescript
import { useTranslation } from 'react-i18next'

export function SomeComponent() {
  const { t, i18n } = useTranslation()

  // Simple key
  return <h1>{t('nav.dashboard')}</h1>

  // Interpolation (D-07: username is NOT translated, it's interpolated)
  // t('deckDetail.ownedBy', { username: deck.owner.username })

  // Pluralization (i18next convention)
  // t('common.nCards', { count: deck._count.cards })
  // → picks 'nCards_one' or 'nCards_other' based on count

  // Dynamic aria-label
  // aria-label={t('a11y.mainNav')}
}
```

### Pattern 4: Language Toggle in AppShell

```typescript
const { i18n } = useTranslation()

const toggleLanguage = () => {
  const next = i18n.language === 'en' ? 'de' : 'en'
  void i18n.changeLanguage(next)
  // LanguageDetector's localStorage cache is updated automatically
}

// In JSX (near theme toggle):
<Button
  variant="ghost"
  size="icon"
  onClick={toggleLanguage}
  aria-label={t('a11y.switchLanguage')}
>
  {i18n.language === 'en' ? 'EN' : 'DE'}
</Button>
```

### Pattern 5: document.title with t()

```typescript
useEffect(() => {
  document.title = t('dashboard.title')
}, [t])  // t is stable reference — effect runs once on mount and on language change
```

The `t` function reference is stable across renders (same reference), but the return value changes when the language changes. **Do NOT put `t` in the dependency array for side effects that set external state — it would only re-run on remount, not on language switch.** Instead, listen to `i18n.language`:

```typescript
const { t, i18n } = useTranslation()

useEffect(() => {
  document.title = t('dashboard.title')
}, [t, i18n.language])  // re-runs when language changes
```

### Anti-Patterns to Avoid
- **Don't use `t()` outside of React components or hooks:** i18n may not be initialized yet in module scope. Exception: the init file itself.
- **Don't call `i18n.changeLanguage()` synchronously in render:** it triggers re-renders; always call in event handlers or `useEffect`.
- **Don't add `i18n.language` to `useEffect` dependency arrays where the effect has side effects beyond the UI** (e.g., API calls) unless the backend actually uses the language.
- **Don't use string concatenation for translations with dynamic values:** always use i18next interpolation (`{{variable}}`) so translators can reorder words.
- **Don't split the locale files** — D-02 is locked: single file per language.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Language detection from localStorage + browser | Custom `detectLanguage()` | `i18next-browser-languagedetector` | Handles fallback chains, multiple storage targets, caching — 20+ edge cases |
| Pluralization (1 card vs. N cards) | Custom `n === 1 ? 'card' : 'cards'` | `t('key', { count: n })` with `_one`/`_other` suffixes | i18next handles all CLDR plural categories; German has different plural rules |
| Interpolation (`'Owned by ' + username`) | String concatenation | `t('key', { username })` | Allows translators to reorder; prevents XSS on values when `escapeValue: true` |
| Triggering re-renders on language change | Custom event bus or state | `useTranslation()` | react-i18next subscribes to i18next events automatically |
| Persisting language selection | `localStorage.setItem(...)` | `i18next-browser-languagedetector` with `caches: ['localStorage']` | Already part of the locked stack |

---

## Edge Cases

### 1. document.title Strings
**Scope:** 7 pages set `document.title` in `useEffect`. These are NOT rendered in JSX but are still UI strings visible to users (browser tab, screen readers).
**Solution:** Use `t()` in the effect. Add `i18n.language` to the dependency array so the title updates when the user switches language:
```typescript
useEffect(() => {
  document.title = t('dashboard.title')
}, [t, i18n.language])
```
**Files affected:** `DashboardPage`, `DecksPage`, `DeckDetailPage`, `StudySessionPage`, `AdminPage`, `ExplorePage`, `ImportPage`, `LoginPage`, `RegisterPage`.

**DeckDetailPage special case:** The title is dynamic — `${deck.title} — Kartex`. Since `deck.title` is user content (D-07), do NOT run it through `t()`. Keep `deck.title` as a raw interpolated value:
```typescript
document.title = deck
  ? `${deck.title} — Kartex`
  : t('deckDetail.title')
```
This correctly excludes user content from translation while keeping the fallback title translated.

### 2. Toast Messages
**Scope:** `sonner` toast calls are NOT in JSX — they are imperative API calls in event handlers. `t()` works fine in event handlers; `useTranslation()` must be called at the top of the component and the `t` function passed down or available via closure.
**Pattern:** Call `useTranslation()` at the top of the component; use `t()` inside toast calls as normal function arguments.
**Important:** Toast action labels (`{ label: 'View decks', onClick: ... }`) are plain strings inside the toast options — wrap them with `t()` too.

### 3. Form Validation Error Labels
**Scope:** `react-hook-form` `form.setError(field, { message: '...' })` calls. These are strings that appear via `<FormMessage />` in the DOM. They ARE user-visible and must be translated.
**Pattern:** Call `t()` on the string before passing to `setError`:
```typescript
form.setError('password', { message: t('auth.invalidCredentials') })
```
Note: `zod` schema `.message()` strings (in `packages/shared/src/schemas/`) are excluded — they surface only on the backend and the rule in D-08 handles those.

### 4. aria-labels
**Scope:** Every `aria-label` attribute in JSX is user-facing (screen readers announce them). Per D-09, all aria-labels must use `t()`.
**Pattern:** `aria-label={t('a11y.openMenu')}` or inline: `aria-label={t('session.progressAriaLabel', { current, total })}`.
**Files with dynamic aria-labels:** `DeckDetailPage` (cards table per tag), `ExamTimer` (remaining time), `SessionProgress`, `ImportPage` (card preview list), `ImportPage` (drop zone), `CardFlip`.

### 5. Dynamic Strings with Interpolation
All strings containing runtime values MUST use i18next interpolation, not string concatenation. The `{{variable}}` syntax allows translators to reorder words (German often has different word order).

High-risk strings confirmed in the codebase:
- `'Shared by {{username}}'` (DecksPage, DeckDetailPage)
- `'Owned by {{username}}'` (DeckDetailPage)
- `'by {{username}}'` (ExplorePage)
- `'{{count}} cards due'`, `'{{count}} cards total'` (StudySessionPage)
- `'You reviewed {{count}} cards in {{min}}m {{sec}}m'` (StudySessionPage)
- `'Card {{current}} of {{total}}'` (SessionProgress)
- Toast: `'"{{title}}" added to your library.'`, `'Deck forked — "Copy of {{title}}" added to your decks.'` (ExplorePage)
- `'"{{name}}" was created with {{count}} cards.'` (ImportPage)

### 6. Pluralization
i18next pluralization uses suffix keys. For English and German, `_one` and `_other` are sufficient for most cases. German uses the same plural forms (1 = singular, anything else = plural).

Files with plural strings:
- `DecksPage` / `DeckDetailPage` / `ExplorePage`: `{N} card(s)`
- `ImportPage`: `{N} card(s) skipped`
- `StudySessionPage`: EXAM_DURATIONS `{N} minutes`
- `DashboardPage`: `{N} days` (streak)

```json
"nCards_one": "{{count}} card",
"nCards_other": "{{count}} cards"
```
```typescript
t('common.nCards', { count: deck._count.cards })
// → "1 card" (count === 1), "5 cards" (count !== 1)
```

### 7. navItems Array (AppShell)
The `navItems` array is defined at module scope (outside the component). With plain string labels, `t()` cannot be called there. Two approaches:

**Approach A (recommended):** Move `navItems` label resolution inside the component using `t()`:
```typescript
const navItems = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  // ...
] as const

// Inside AppShell():
const { t } = useTranslation()
// Then in JSX: t(item.labelKey)
```

**Approach B:** Keep labels as dynamic: `navItems` stores keys, component renders `t(key)`. Same effect.

### 8. The `currentLabel` expression (AppShell header)
```typescript
const currentLabel =
  navItems.find(item => location.pathname.startsWith(item.to))?.label ??
  (location.pathname.startsWith('/admin') ? 'Admin' : 'Kartex')
```
This must use translated labels. With Approach A above, `.label` becomes `t(item.labelKey)`. The fallback strings `'Admin'` and `'Kartex'` become `t('nav.admin')` and `'Kartex'` (brand name, not translated).

### 9. Toast Messages with User Content
Some toasts embed user-authored content (deck titles). Per D-07, user content is interpolated, not translated:
```typescript
// ExplorePage
toast.success(t('explore.addedToLibrary', { title: deck.title }))
// en.json: "\"{{title}}\" added to your library."
// de.json: "\"{{title}}\" wurde Ihrer Bibliothek hinzugefügt."
```

---

## Test Setup

### Current State
- `src/test/setup.ts` currently contains only `import '@testing-library/jest-dom'`
- `vitest.config.ts` has `setupFiles: ['./src/test/setup.ts']`
- All existing tests mock their dependencies via `vi.mock()` at the top of each file
- **No existing test mocks `react-i18next`** — adding `useTranslation()` to components will cause "No i18next instance found" errors in every test that renders a component using translation

### Required Change: Global Mock in setup.ts
The correct approach is a **global mock of `react-i18next` in `src/test/setup.ts`**. This means:
1. All existing tests continue working without changes (they don't need to add per-file mocks)
2. `t(key)` returns the key as-is in tests (no actual German/English translation)
3. `i18n.changeLanguage` is a no-op mock
4. This matches the existing test philosophy: test component behavior, not translation values

**Add to `src/test/setup.ts`:**
```typescript
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Global mock for react-i18next — keeps all existing component tests green
// when components start using useTranslation(). t(key) returns the key itself.
// Source: https://react.i18next.com/misc/testing [CITED]
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      // Return key with interpolation values appended for snapshot clarity
      if (opts && Object.keys(opts).length > 0) {
        return `${key}(${JSON.stringify(opts)})`
      }
      return key
    },
    i18n: {
      language: 'en',
      changeLanguage: vi.fn().mockResolvedValue(undefined),
    },
    ready: true,
  }),
  initReactI18next: {
    type: '3rdParty' as const,
    init: vi.fn(),
  },
  Trans: ({ children }: { children: React.ReactNode }) => children,
}))
```

**Important caveat:** `vi.mock()` in `setup.ts` applies to ALL test files globally. The mock is hoisted by Vitest automatically. Individual test files can override with their own `vi.mock('react-i18next', ...)` if they need to test language-switching behavior specifically.

### Impact on Existing Tests

| Test File | Uses Translation | Impact |
|-----------|-----------------|--------|
| `AppShell.test.tsx` | Yes (after wrapping) | SAFE — tests check class names and DOM structure, not string values. Tests that check `textContent` may need updating if they check hardcoded English strings |
| `StudySessionPage.test.tsx` | Yes | Tests use `screen.getByText(/filter by tag/i)` — this uses a regex, matches the key `'study.filterByTag'`? NO — regex won't match key. See critical note below |
| `DeckDetailPage.test.tsx` | Yes | Same concern as StudySessionPage |
| `CardFlip.test.tsx` | Possibly | Needs checking |
| `KartexRenderer.test.tsx` | No | No UI strings translated |

**CRITICAL: Existing tests use `screen.getByText()`**

The `StudySessionPage.test.tsx` uses:
```typescript
expect(screen.getByText(/filter by tag/i)).toBeTruthy()
```

With the global mock (`t(key) => key`), the component will render `study.filterByTag` not `'Filter by tag'`. The regex `/filter by tag/i` will NOT match the key `study.filterByTag`.

**Resolution options:**

**Option A (recommended):** Update the `t()` mock to return a human-readable string for display keys, or return the last segment of the key:
```typescript
t: (key: string) => key.split('.').pop() ?? key
// 'study.filterByTag' → 'filterByTag'  (still won't match /filter by tag/i)
```
This still won't fix regex matches.

**Option B (correct and clean):** Update existing test assertions that match string values to use the translation keys instead. This is the clean approach — tests should assert on behavior, not translated strings. Where currently `screen.getByText(/filter by tag/i)` tests that a filter section exists, the test should instead:
```typescript
// Option: use role-based or data-testid queries that don't depend on text content
// Or: test for a known key pattern
expect(document.body.textContent).toContain('study.filterByTag')
```

**Option C:** Use a full i18n initialization in setup.ts with actual English locale loaded, so `t('study.filterByTag')` returns `'Filter by tag'`. This keeps existing tests working without changes:
```typescript
// In src/test/setup.ts — use real i18n with English locale
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
// Import en.json and initialize with initImmediate: false for sync init
import en from '../locales/en.json'

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false },
  initImmediate: false,  // synchronous initialization — critical for test environments
})
```

**Recommendation: Option C.** It keeps all existing tests working without modification. The `initImmediate: false` flag makes i18next initialize synchronously, which is essential in Vitest's synchronous test environment. The mock approach (Option A/B) requires updating existing tests, which adds risk.

### Wave 0 Test Gaps

The following test infrastructure is needed before any component wrapping starts:

| File | Gap | Action |
|------|-----|--------|
| `src/test/setup.ts` | Needs i18n initialization (Option C above) | Add `i18n.init(...)` with `initImmediate: false` |
| `src/locales/en.json` | Does not exist yet | Create in Wave 0 (infrastructure wave) |
| `src/locales/de.json` | Does not exist yet | Create in Wave 0 |
| `src/i18n.ts` | Does not exist yet | Create in Wave 0 |
| `src/i18n.d.ts` | Does not exist yet | Create in Wave 0 |
| New test file for language switcher | No test for I18N-03 | Create in Wave 0 or Wave 1 |

---

## Wave Strategy

### Wave 0: Infrastructure (no visible UI change, all tests green)
1. Install packages: `react-i18next`, `i18next`, `i18next-browser-languagedetector`
2. Create `src/locales/en.json` with all keys populated
3. Create `src/locales/de.json` with all keys populated (fully translated)
4. Create `src/i18n.ts` (init file, import resources, configure detector)
5. Create `src/i18n.d.ts` (TypeScript augmentation)
6. Add i18n init to `src/test/setup.ts` with `initImmediate: false`
7. Import `./i18n` in `main.tsx` (before React renders)
8. Run `npm test` — all 65 existing tests must stay GREEN before any component changes

**Gate:** All existing tests pass before Wave 1 begins.

### Wave 1: String Wrapping (5 sub-waves recommended)
Work in this order — simplest to most complex:

**Wave 1a — Simple components (no state, no toasts):**
- `CardFlip.tsx` (3 strings)
- `RatingButtons.tsx` (5 strings including aria-label pattern)
- `SessionProgress.tsx` (2 strings)
- `ExamTimer.tsx` (1 aria-label)
- `MediaUploadToolbar.tsx` (3 strings + toasts)

**Wave 1b — Feature modals:**
- `DeckFormModal.tsx` (~10 strings)
- `CardEditorModal.tsx` (~10 strings)

**Wave 1c — Simple pages:**
- `LoginPage.tsx` (~8 strings)
- `RegisterPage.tsx` (~8 strings)

**Wave 1d — Medium pages:**
- `ExplorePage.tsx` (~12 strings)
- `DashboardPage.tsx` (~10 strings)
- `ImportPage.tsx` (~20 strings — most complex)
- `AdminPage.tsx` (~20 strings — complex badge components)

**Wave 1e — Complex pages:**
- `DecksPage.tsx` (~15 strings)
- `DeckDetailPage.tsx` (~25 strings — largest, most complex)
- `StudySessionPage.tsx` (~30 strings — complex with arrays)
- `AppShell.tsx` (~15 strings + language switcher button)

### Wave 2: Language Switcher + Verification
1. Add language toggle button to `AppShell.tsx` (both desktop sidebar and mobile drawer)
2. Write test for I18N-03 (language switcher changes language)
3. Verification sweep: grep for raw hardcoded English strings that should have been wrapped
4. TypeScript check: `tsc --noEmit` to verify no missing keys
5. Run full test suite — all tests must pass

---

## German Translation Approach

The planner will specify the actual German strings, but the approach is:

1. Every key in `en.json` MUST have a corresponding key in `de.json` — no missing keys
2. The TypeScript type system does NOT enforce `de.json` completeness against `en.json` — this is a runtime concern. The fallback to English (`fallbackLng: 'en'`) will silently cover missing German keys, which would leave mixed-language UI.
3. **Validation approach for de.json completeness:** A script or CI check should compare the key sets of both files. The planner should include a verification task that runs:
   ```bash
   node -e "
     const en = require('./src/locales/en.json');
     const de = require('./src/locales/de.json');
     // deep key comparison
   "
   ```
4. German-specific translation notes:
   - German nouns are capitalized — `'Kartenstapel'` not `'kartenstapel'`
   - German pluralization follows English rules for simple count cases (1 = singular, other = plural)
   - German word order differs — always use `{{variable}}` interpolation, never concatenation
   - `'Deck'` stays as `'Deck'` in German (loanword)
   - `'SM-2'`, `'KaTeX'`, `'Typst'` stay as-is (technical terms)
   - UI metaphors: `'Spaced Repetition'` is commonly used as-is in German tech contexts, OR `'Karteikartenmethode'` — planner to decide

[ASSUMED] — German translation content has not been verified against a native speaker or authoritative source. Actual German strings must be confirmed before `de.json` is finalized.

---

## Common Pitfalls

### Pitfall 1: i18next Not Initialized Before First Render
**What goes wrong:** Components call `useTranslation()` but i18next has not yet initialized, causing warnings ("i18next: No i18next instance found" or "i18next: init called after first render") and fallback-key rendering.
**Why it happens:** `import './i18n'` placed after other React imports in `main.tsx`, or i18n initialized inside a component.
**How to avoid:** `import './i18n'` must be the FIRST import in `main.tsx`, before `react`, before `react-dom`, before `App`.
**Warning signs:** Keys appear literally in the UI (`nav.dashboard` instead of `Dashboard`) on first render.

### Pitfall 2: Existing Tests Break on getByText String Assertions
**What goes wrong:** Tests like `screen.getByText(/filter by tag/i)` fail because `t('study.filterByTag')` returns the key string, not the English string.
**Why it happens:** Using a simple `t: (key) => key` mock in setup.ts.
**How to avoid:** Use Option C — initialize i18n with actual English locale and `initImmediate: false` in `src/test/setup.ts`. This means `t('study.filterByTag')` returns `'Filter by tag'` in tests, keeping all regex assertions working.
**Warning signs:** Many `getByText` or `queryByText` calls fail after adding `useTranslation()` to components.

### Pitfall 3: Async i18next Init in Tests
**What goes wrong:** i18next init is async by default. Without `initImmediate: false`, the first render happens before translations load, causing keys to render literally.
**Why it happens:** Default i18next init is Promise-based.
**How to avoid:** Always set `initImmediate: false` when initializing for tests. This makes init synchronous.
**Warning signs:** First render shows keys, then flickers to translations after a tick.

### Pitfall 4: navItems Array Defined at Module Scope
**What goes wrong:** `const navItems = [{ label: t('nav.dashboard') }]` at module scope fails because `t` is not yet available outside React components.
**Why it happens:** `useTranslation()` is a React hook — it can only be called inside a React function component.
**How to avoid:** Store `labelKey` in the navItems array; call `t(item.labelKey)` inside the component render function.
**Warning signs:** `Error: Invalid hook call` at module load time.

### Pitfall 5: Missing Keys in de.json Not Caught by TypeScript
**What goes wrong:** `de.json` is missing a key; i18next silently falls back to English; the German UI shows mixed languages.
**Why it happens:** TypeScript only types the `en.json` structure via `CustomTypeOptions`. It does NOT validate that `de.json` contains the same keys.
**How to avoid:** Add a Wave 2 verification task that performs a deep key comparison between `en.json` and `de.json`.
**Warning signs:** Some strings appear in English when German is selected.

### Pitfall 6: TypeScript CustomTypeOptions With Direct JSON Import vs. resources Export
**What goes wrong:** `i18n.d.ts` imports `en.json` directly with `typeof en`. Without `as const`, TypeScript infers string types as `string` rather than the literal union, weakening type checking.
**Why it happens:** JSON imports do not support `as const` directly.
**How to avoid:** Export `resources` from `i18n.ts` with `as const`, then use `typeof resources['en']` in `i18n.d.ts` — this is the pattern from official i18next docs [CITED: i18next.com/overview/typescript].
**Warning signs:** `t()` accepts any string without TypeScript error (type checking not actually working).

### Pitfall 7: document.title Not Updating on Language Switch
**What goes wrong:** User switches to German but browser tab title stays in English.
**Why it happens:** `useEffect(() => { document.title = t('...') }, [])` only runs on mount.
**How to avoid:** Add `i18n.language` to the dependency array: `useEffect(() => { document.title = t('...') }, [t, i18n.language])`.
**Warning signs:** Tab title does not change when user switches language.

### Pitfall 8: Toast Strings Not Updated on Language Switch
**What goes wrong:** Toast messages appear in the language active at the time of the action, which is correct. If the user was in German when they clicked "Delete", the toast says "Gelöscht". This is correct behavior.
**Potential confusion:** The old toast stays visible if the user immediately switches language after an action — the toast remains in the previous language (it was already rendered). This is acceptable and expected behavior; toasts are ephemeral.

### Pitfall 9: Vite + pnpm Workspace — Package Install Target
**What goes wrong:** Running `npm install react-i18next` at the root installs in the wrong workspace; the frontend cannot resolve the package.
**How to avoid:** Use `pnpm --filter @kartex/frontend add react-i18next i18next i18next-browser-languagedetector`.
**Warning signs:** TypeScript: `Cannot find module 'react-i18next'`.

---

## Validation Architecture

Nyquist validation is enabled (`workflow.nyquist_validation: true`).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 |
| Config file | `apps/frontend/vitest.config.ts` |
| Quick run command | `pnpm --filter @kartex/frontend test --run` |
| Full suite command | `pnpm --filter @kartex/frontend test --run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| I18N-01 | i18next initializes, locale JSON exists, `src/locales/` directory populated | smoke | `pnpm --filter @kartex/frontend test --run` | ❌ Wave 0 |
| I18N-01 | TypeScript compile passes with `CustomTypeOptions` (no missing key errors) | build | `pnpm --filter @kartex/frontend typecheck` | ❌ Wave 0 (after i18n.d.ts created) |
| I18N-02 | No hardcoded English strings remain in JSX (all wrapped in `t()`) | manual+grep | `grep -r ">[A-Z][a-z]" apps/frontend/src --include="*.tsx"` (partial) | manual |
| I18N-02 | All existing component tests pass after wrapping (regression) | unit | `pnpm --filter @kartex/frontend test --run` | ✅ (65 existing) |
| I18N-03 | Language switcher button exists in AppShell sidebar | unit | new test file | ❌ Wave 0 |
| I18N-03 | Clicking language button calls `i18n.changeLanguage` with correct locale | unit | new test file | ❌ Wave 0 |
| I18N-03 | Language persists to localStorage after switch | integration | new test file | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter @kartex/frontend test --run`
- **Per wave merge:** `pnpm --filter @kartex/frontend test --run && pnpm --filter @kartex/frontend typecheck`
- **Phase gate:** Full suite green + TypeScript clean before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/test/setup.ts` — add i18n initialization with `initImmediate: false` and English locale
- [ ] `src/components/__tests__/LanguageToggle.test.tsx` — covers I18N-03
- [ ] `src/locales/en.json` — covers I18N-01 (locale directory)
- [ ] `src/locales/de.json` — covers I18N-01 (both locales)
- [ ] `src/i18n.ts` — covers I18N-01 (init)
- [ ] `src/i18n.d.ts` — covers I18N-01 (type safety)

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | pnpm install | ✓ | (in repo) | — |
| pnpm | Package install | ✓ | (in repo) | — |
| react-i18next | I18N-01/02/03 | ✗ (not yet installed) | 17.0.8 on npm | — |
| i18next | I18N-01/02/03 | ✗ (not yet installed) | 26.3.0 on npm | — |
| i18next-browser-languagedetector | I18N-01/03 | ✗ (not yet installed) | 8.2.1 on npm | — |

**Missing dependencies with no fallback:** All three packages must be installed in Wave 0. No fallback — they are the locked technology choice.

---

## Security Domain

`security_enforcement` is not set to `false` in config — defaulting to enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth logic in i18n layer |
| V3 Session Management | No | Language is stored in localStorage, not session |
| V4 Access Control | No | Language selection is not access-controlled |
| V5 Input Validation | No | Translation keys are compile-time constants; user input is never passed to `t()` directly |
| V6 Cryptography | No | No cryptographic operations |

### Known Threat Patterns for i18n Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via interpolation | Tampering | `escapeValue: false` is safe because React escapes by default; `dangerouslySetInnerHTML` is never used in this codebase |
| Translation key injection (user input as key) | Tampering | Never call `t(userInput)` — all keys are compile-time string literals |
| localStorage manipulation | Elevation of Privilege | `i18nextLng` localStorage value controls only the display language, not authentication or access; worst case: UI shows wrong language |

**i18n is a low-risk domain from a security perspective.** No secrets, no auth, no user data flows through the translation layer.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | German translation content is correct for all keys | German Translation Approach | Mixed-language UI or confusing German for native speakers |
| A2 | All existing test string assertions use regex patterns that will still match English strings returned by the real i18n setup | Test Setup (Option C) | Tests fail silently after Option C implementation |
| A3 | `i18nextLng` is the localStorage key used by `i18next-browser-languagedetector` by default | Library Setup | Language not persisting if key name differs |

---

## Open Questions (RESOLVED)

1. **Language toggle label: text code or flag?**
   - What we know: D-05 says "compact toggle button showing the current language code (EN / DE)"
   - What's unclear: CONTEXT.md §Specific Ideas mentions flags as an alternative: "EN/DE or 🇬🇧/🇩🇪 if compact enough"
   - RESOLVED: Use text codes `'EN'` / `'DE'` as stated in D-05 (the decision). Flags are only mentioned in Specific Ideas (non-binding).

2. **Language state: ThemeContext co-location or standalone?**
   - What we know: CONTEXT.md marks this as Claude's discretion. The CONTEXT.md §Existing Patterns notes "ThemeContext.tsx — context + provider pattern; planner may co-locate language in ThemeContext or create a parallel LanguageContext."
   - What's unclear: i18next manages its own language state. A separate LanguageContext may be redundant.
   - RESOLVED: Do NOT create a LanguageContext. i18next self-manages language state. `i18n.language` is the source of truth. The language toggle button reads `i18n.language` directly from `const { i18n } = useTranslation()` — no separate context needed.

---

## Sources

### Primary (HIGH confidence)
- [react.i18next.com/getting-started](https://react.i18next.com/getting-started) — setup pattern, initReactI18next
- [i18next.com/overview/typescript](https://www.i18next.com/overview/typescript) — CustomTypeOptions pattern, resources export approach
- [react.i18next.com/misc/testing](https://react.i18next.com/misc/testing) — useTranslation mock pattern for Jest/Vitest
- npm registry — verified package versions: react-i18next@17.0.8, i18next@26.3.0, i18next-browser-languagedetector@8.2.1

### Secondary (MEDIUM confidence)
- slopcheck 0.6.1 scan — all 3 packages returned [OK]
- Codebase file reads (full scan of all 54 frontend source files) — string inventory is from direct file inspection [VERIFIED]

### Tertiary (LOW confidence)
- [German translation content] — [ASSUMED] — not verified with native speaker

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — npm registry confirmed, slopcheck [OK], official docs consulted
- Architecture: HIGH — init pattern from official docs, codebase inventory from direct file reads
- Test Setup: MEDIUM — `initImmediate: false` pattern is well-known but the exact interaction with Vitest 2.1.9 + jsdom was not run end-to-end in this research session
- Pitfalls: HIGH — based on direct codebase analysis (existing test patterns, module-scope navItems, etc.)
- German translations: LOW — content is [ASSUMED]

**Research date:** 2026-06-01
**Valid until:** 2026-07-01 (stable libraries — monthly refresh sufficient)
