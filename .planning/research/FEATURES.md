# Feature Landscape: v1.4.0 — Auth Overhaul & Study UX

**Domain:** Self-hosted spaced-repetition flashcard app (invite-only, 2-5 users)
**Milestone:** v1.4.0 — Auth Overhaul & Study UX
**Researched:** 2026-06-19
**Confidence:** HIGH (codebase direct inspection; OWASP; abcjs official docs; industry UX patterns)

---

## Critical Baseline — What Already Exists

Reading the codebase before writing requirements prevents fantasy features. Key facts:

- `User` model has no `email` column — must be added via migration
- `InviteCode` model exists (`code`, `expiresAt`, `usedAt`, `usedById`) — has no `email` or `token` concept
- `admin.ts` has `GET/PATCH /users`, `GET/POST/DELETE /invite-codes` — no delete-user endpoint
- `deckUpdate.ts` explicitly rejects `.kartex.zip`: `if (normalizedName.endsWith('.kartex.zip')) return error` — this guard must be replaced
- `import.ts` already handles `.kartex.zip` for new-deck import, including full zip parsing, media extraction, UUID renaming, magic-byte validation, and `rewriteMediaRefs()` — the update path needs this same logic
- `KartexRenderer.tsx` dispatches on `className?.includes('language-typst')` in the `code` component handler — adding `language-abc` follows the identical pattern
- `preprocessTypstBlocks()` converts `#typst` paragraph blocks to fenced ````typst` ` blocks — `#abc` blocks need the same preprocessing step

---

## Feature 1: Email Invitations (Replacing Invite Codes)

### What This Replaces

Admin currently creates a shareable code (UUID-derived, 12-char uppercase) via `POST /api/admin/invite-codes`. The user types the code into a registration form. The new flow replaces the code with an admin-entered email address and a one-time link sent directly to that address.

### Table Stakes

These are the behaviors users and admins expect in any modern invite flow. Missing any of them makes the feature feel unfinished or insecure.

| Behavior | Rationale |
|----------|-----------|
| Admin enters target email in admin panel — not a code | The code flow requires out-of-band code delivery (copy-paste, messaging). Email delivery is the standard for invite-only apps (GitHub orgs, Linear, Notion). |
| System sends an email containing a one-time invite link | The link must contain a cryptographically secure token. No code to retype, no phishing confusion. |
| Link navigates to a registration page pre-filled with no username yet | User sets their own username and password. The email is pre-filled and locked (it was already verified as the target). |
| Link is single-use | After one successful registration, the link is dead. Subsequent clicks should show "This invitation has already been used." |
| Link expires | Standard expiry is 7 days for invitations (aligns with existing `InviteCode.expiresAt` default). Users who miss the window see "This invitation has expired. Contact your administrator." |
| Token is stored hashed in the database | The raw token is sent in the email only. The DB stores `SHA-256(token)`. If the DB is leaked, tokens cannot be replayed. This mirrors the pattern established for refresh tokens (`RefreshToken.tokenHash`). |
| Admin panel shows pending invitations | Admin must be able to see which email addresses have been invited but have not yet registered. |
| Admin can revoke a pending invitation | Needed when an email address changes or an invite was sent in error. |
| Clear user-facing error pages for expired/used links | Never show a raw 404 or JSON error. Route to a branded error page with human-readable message and "contact admin" guidance. |

### Differentiators

These are valuable but not expected by the 2-5 user audience:

| Behavior | Value | Complexity |
|----------|-------|------------|
| Resend invitation from admin panel | Admin can trigger a new email if the first was lost. Invalidates the old token, issues a new one. | Low — generates new token, updates DB row, sends email |
| Email copy includes product name and inviter context | Avoids phishing false-positives in spam filters. "You have been invited to Kartex by [admin username]. Click to create your account." | Low — template variable |
| Show invite expiry in email | "This link expires in 7 days." Reduces "why didn't this work?" support asks. | Trivial |

### Anti-Features

| Anti-Feature | Why Avoid |
|--------------|-----------|
| Keeping the old invite-code UI alongside the new email flow | Two invite mechanisms confuse admins; the code path is being replaced, not extended |
| Sending the raw token in the email (not hashed in DB) | Security regression — if the DB is leaked, active invitation tokens become valid credentials |
| Open registration fallback if SMTP is not configured | Kartex is invite-only by design; unconfigured SMTP should hard-block invitations with a clear admin error, not silently open sign-up |

### Edge Cases That Matter

- **SMTP not configured**: `POST /api/admin/invite` should return a clear 503 with "SMTP not configured" rather than silently creating an invitation with no delivery. The admin panel should surface this.
- **Email already registered**: If the target email already belongs to an existing `User`, return a 409 Conflict — don't silently create a second account.
- **Email already has a pending invitation**: If a pending (unused, non-expired) invite exists for that email, either reject with "invitation already pending" or auto-revoke and resend — the simpler path is reject + resend button.
- **User registers but sets an already-taken username**: Username uniqueness is enforced at DB level (`User.username @unique`). The registration form must validate username availability client-side (debounced check) and reject server-side.
- **Link clicked in a different browser session**: The invite token is URL-borne, not session-borne. The user can open the link on any device. After registration, they are logged in on that device.
- **Concurrent double-click / two tabs**: Token consumption must be atomic — the first successful registration consumes the token; a concurrent attempt must fail gracefully.

### Schema Changes Required

- `User.email String? @unique` — nullable initially (existing users have none), required on registration going forward
- New `InviteToken` model (or repurpose/extend `InviteCode`): `{ id, email, tokenHash, expiresAt, usedAt, createdAt }` — the existing `InviteCode` model is code-centric and does not map cleanly; a new `InviteToken` model is cleaner
- `InviteCode` model can be soft-deprecated (kept in schema for data integrity, admin UI de-emphasizes it)

---

## Feature 2: User Email Field

### Table Stakes

| Behavior | Rationale |
|----------|-----------|
| Email stored on `User` at registration time | Required for password reset. Users invited via email flow already have the email known; it is set at registration. |
| Email is unique per user | Prevents duplicate accounts receiving reset emails |
| Email is not displayed publicly | Self-hosted, small-team tool; no social/profile pages |
| Admin can see user emails in the admin panel | Admin needs visibility for support and to check who was invited |

### Differentiators

| Behavior | Value | Complexity |
|----------|-------|------------|
| User can update their own email | Useful if the address changes. Requires re-verification (send confirm link) to prevent account hijack. | Medium — needs email confirmation sub-flow |
| Admin can update user email | Simpler than self-service; for a 2-5 user team, admin override is sufficient | Low |

**Recommendation for v1.4:** Admin-updateable email only. Self-service email change with re-verification is a separate feature for a future milestone.

### Edge Cases That Matter

- **Existing users (pre-v1.4)**: The `email` column is nullable. Existing users have no email until they set one. Password reset for email-less users must be blocked with "No email address on file — contact admin."
- **Case sensitivity**: Store email lowercase, compare lowercase. `User@Example.com` and `user@example.com` must be treated as the same address.

---

## Feature 3: Self-Service Password Reset

### What the User Experiences

User arrives at `/login`, clicks "Forgot password?", enters their email, and receives an email with a reset link. The link opens a page to enter a new password. After success, they are redirected to `/login`.

### Table Stakes

| Behavior | Rationale |
|----------|-----------|
| "Forgot password?" link on the login page | Standard placement; all major web apps put it here. Missing = users can't self-recover. |
| User enters email, system sends reset link | Sending to email (not username) is the industry norm and aligns with the `User.email` field |
| Reset link contains a cryptographically secure token | `crypto.randomBytes(32)` → 64-char hex string is standard. Do not use `Math.random()`. |
| Token stored as `SHA-256(token)` in DB, not raw | Same security rationale as invite tokens. If DB is leaked, outstanding reset tokens cannot be used. |
| Token expires in 1 hour | OWASP recommends 15–60 minutes for password resets. 1 hour is the industry default balancing security and UX. 7-day expiry is appropriate for invites (lower risk), not resets (higher risk). |
| Token is single-use — consumed on successful password change | OWASP requirement. Prevents replay attacks (attacker with email access seeing old reset links). |
| Clicking an expired or used link shows a clear error page | "This reset link has expired. Please request a new one." Not a raw JSON error. |
| Password change invalidates existing refresh tokens | A password reset should terminate all existing sessions. User must log in again. Delete all `RefreshToken` rows for the user on successful reset. |
| "Always return success" response to the reset-request endpoint | Whether the email exists or not, the response is "If an account with that email exists, you will receive a reset link." Prevents email enumeration attacks. |
| New password must pass the same validation rules as registration | Minimum length, not empty. |

### Differentiators

| Behavior | Value | Complexity |
|----------|-------|------------|
| Rate-limit the reset-request endpoint | Prevents email bombing (spam to the target address or API abuse). E.g., 3 requests per 15 minutes per IP or email. | Medium — requires rate-limit middleware or token-creation throttle in DB |
| Show "check your email" confirmation screen after submission | Better UX than staying on the form. Reduces user confusion ("did it work?"). | Low |

### Anti-Features

| Anti-Feature | Why Avoid |
|--------------|-----------|
| Security questions | OWASP deprecated them as weak. Not appropriate for a 2-5 user self-hosted tool. |
| "Email me my password" | Passwords are hashed (`passwordHash`). Impossible. Also a 1990s anti-pattern. |
| Admin password override via reset flow | Admin-triggered reset should go through the admin-triggered flow (Feature 4), not the self-service flow. |

### Edge Cases That Matter

- **User has no email**: Block with "No email on file for this account" only after verifying the account exists. If the email is not found in the DB, return the same generic success message (no enumeration).
- **User requests reset twice quickly**: The second request should invalidate the first token and issue a new one. Only one active reset token per user at a time.
- **Reset link used after password already changed**: Token is consumed on use; second click shows "link already used."
- **Token storage**: Store `{ tokenHash, userId, expiresAt, usedAt }` — `usedAt` rather than delete-on-use, for audit trail.

### Schema Changes Required

- New `PasswordResetToken` model: `{ id, userId, tokenHash, expiresAt, usedAt?, createdAt }` with `@unique(tokenHash)` and `@@index([userId])`

---

## Feature 4: Admin-Triggered Password Reset

### What the Admin Experiences

Admin opens the admin user list, finds a user, clicks "Send password reset email." System sends the standard password reset email to that user's email address. Admin sees confirmation that the email was sent (or an error if the user has no email on file).

### Table Stakes

| Behavior | Rationale |
|----------|-----------|
| "Send reset email" action in the admin user list | Admin's tool for helping locked-out users or enforcing a password rotation |
| Uses the same reset token mechanism as self-service | One code path for token generation and email sending. No separate "admin reset" token type. |
| Clear error if user has no email address | Admin must know why the action failed |
| Confirmation after successful send | "Reset email sent to user@example.com" |
| Self-reset prevention by admin on their own account via this flow | Admin can reset their own password through the self-service flow; admin panel action is for other users |

### Differentiators

| Behavior | Value | Complexity |
|----------|-------|------------|
| Admin can force-logout all sessions for a user (delete their refresh tokens) without sending a reset email | Useful for security incidents. Separate action from password reset. | Low — `DELETE FROM RefreshToken WHERE userId = ?` |

### Edge Cases That Matter

- **Admin clicks "send reset" for a user with a pending reset token**: Should invalidate the old token and issue a new one (same rule as self-service).
- **SMTP not configured**: Same hard-fail as invite flow — return a clear error, not a silent no-op.

---

## Feature 5: Admin User Deletion

### What the Admin Experiences

Admin finds a user in the admin panel, clicks a delete button. A confirmation dialog appears explaining what will be permanently deleted (decks, cards, progress, review logs). Admin types the username to confirm. Deletion executes. The user row and all owned data disappears.

### Table Stakes

| Behavior | Rationale |
|----------|-----------|
| "Delete user" action in admin user list | Permanent removal of a user account and all owned data |
| Two-step confirmation: modal + type username to confirm | Irreversible action; the Cloudscape/GitHub pattern of typing the resource name prevents accidental deletion |
| Confirmation dialog explicitly lists what will be deleted | "This will permanently delete: all decks owned by this user (N decks), all card progress, all review logs. This cannot be undone." |
| Admin cannot delete themselves | Self-deletion guard (mirrors existing self-deactivation guard in `admin.ts` line 47–49) |
| All owned data cascades: Deck → Card → CardProgress, ReviewLog | Schema already has `onDelete: Cascade` on `Card → CardProgress` and `Card → ReviewLog`. `Deck → Card` also cascades. `DeckShare` on the deleted deck cascades. |
| RefreshToken rows for the user are deleted | Must be included in deletion to clear active sessions |
| InviteToken row (the one used to register this user) — handle carefully | The `InviteCode.usedById` FK will fail if the user is deleted while the FK exists. Either set `usedById` to null (keep invite record) or delete the invite record too. Keep the invite record with `usedById` nullified for admin audit purposes. |

### Differentiators

| Behavior | Value | Complexity |
|----------|-------|------------|
| Show count of data that will be deleted in the confirmation dialog | "3 decks, 142 cards, 89 progress records" reduces surprises | Low — a single DB aggregate query before showing the modal |
| Soft-delete option (deactivate + anonymize instead of hard delete) | Existing `isActive = false` is already a soft-disable. A full soft-delete that anonymizes email/username is more complex. | High — not worth it for 2-5 users; hard delete with confirmation is correct |

### Anti-Features

| Anti-Feature | Why Avoid |
|--------------|-----------|
| "Undo" after deletion | Relational cascade deletes are non-reversible without a full backup-restore; do not offer undo |
| Silent deletion without confirmation | Accidental delete of the wrong user destroys all their study history |
| Deleting shared decks that other users rely on | A deck shared with other users should have its `DeckShare` rows deleted (cascade) but the deck itself may need a warning: "2 other users had access to these decks and will lose them." |

### Edge Cases That Matter

- **User owns public decks other users forked**: Forked decks are independent copies (owned by the forking user). Deleting the original owner does not affect forks. However, the source `Deck` disappears from `/explore`.
- **User is the only admin**: Prevent deletion if this user is the only `ADMIN`-role account. (Same principle as preventing self-deactivation.)
- **DeckShare where deleted user is `sharedWithUser`**: `DeckShare.sharedWithUserId` references the deleted user. With `onDelete: Restrict` (Prisma default), this would block deletion. Must set `onDelete: Cascade` on `DeckShare.sharedWithUser` relation, or handle with a pre-delete cleanup step.
- **Media files on disk**: Deleting `Media` DB rows does not delete files from the Docker volume. A background cleanup job (or on-demand cleanup endpoint) would be needed. For v1.4, accept orphaned media files as a known limitation — disk space is not a concern for 2-5 users.

### Schema Changes Required

- Review `DeckShare` → `User` (sharedWithUser) FK: ensure `onDelete: Cascade` so shares where the deleted user is the recipient are cleaned up
- `InviteToken.usedById` (or `InviteCode.usedById`): set `onDelete: SetNull` so the invite record survives user deletion with `usedById = null`

---

## Feature 6: ABC Notation Rendering (`#abc` blocks)

### What This Is

A fenced `#abc` block in card content is rendered as sheet music via the `abcjs` library. The output is an SVG inline in the card. This parallels the existing `#typst` block rendering pattern exactly.

### ABC Notation Overview (for scope-setting)

ABC notation is a text-based music format widely used for folk, traditional, and simple classical music. A minimal valid block looks like:

```
X:1
T:Scale
M:4/4
L:1/8
K:C
CDEFGAB c|
```

Fields: `X:` (index), `T:` (title), `M:` (meter/time signature), `L:` (default note length), `K:` (key signature), then note body. Common use cases in flashcard content: music theory examples, chord progressions, short melodic phrases, rhythm exercises, interval drills.

### Table Stakes

| Behavior | Rationale |
|----------|-----------|
| `#abc` fenced block in card content renders as SVG sheet music | Core feature. Without this, the block renders as raw text in a `<pre>`, which is unusable. |
| Rendered inline in the card (not a modal or lightbox) | Typst blocks render inline; ABC should too. Consistency. |
| Invalid ABC notation shows an error fallback, not a crash | `abcjs.renderAbc()` can receive malformed input. Error boundary or error state like `RenderErrorBlock` (already exists for Typst). |
| SVG scales to card width | `responsive: "resize"` option in `renderAbc()` makes the SVG adapt to its container. Without it, sheet music overflows on mobile cards. |
| No audio playback required | abcjs has an audio synthesis API, but playback requires AudioContext permission handling and adds significant complexity. For flashcard content, visual rendering is sufficient. |

### Differentiators

| Behavior | Value | Complexity |
|----------|-------|------------|
| Title and composer displayed above the staff | abcjs renders `T:` and `C:` header fields automatically in the SVG — no extra work | None (automatic) |
| Multiple voices/parts | abcjs supports `V:` voice elements; multi-voice rendering works out of the box for valid ABC | Low — falls out of the library |
| Chords notation `[CEG]` and chord symbols `"Am"` | Both are supported by abcjs; no special handling needed | None |
| Lyrics aligned to notes (`w:` field) | abcjs renders `w:` lyric lines aligned to notes | None |

### Anti-Features

| Anti-Feature | Why Avoid |
|--------------|-----------|
| Audio playback | AudioContext requires user gesture permission; browser autoplay policies differ; adds `~400 KB` to the bundle (abcjs audio synthesis). Visual-only is sufficient for flashcard study. |
| Editable ABC editor in study mode | abcjs has an interactive editor mode, but cards are read-only during study. The quick-edit feature (Feature 7) covers the edit use case. |
| Exporting rendered music as PDF or MIDI from the card view | Out of scope for a flashcard renderer; users can use dedicated ABC tools for this |

### Implementation Pattern (HIGH confidence — KartexRenderer.tsx + abcjs docs)

The `#abc` pattern mirrors `#typst` exactly:

1. **Preprocessing** (`preprocessTypstBlocks` → `preprocessABCBlocks`): Convert `#abc\n...\n\n` paragraph blocks to fenced `` ```abc `` blocks. A `#abc` block ends at the first blank line or end of content. This step makes it safe to pass through `remark`/`rehype` without interpretation.

2. **Custom `code` handler in `kartexComponents`**: Add a branch for `className?.includes('language-abc')`. Extract the raw ABC string via `extractTextFromChildren()` (already exists).

3. **`AbcBlock` component**: Uses `useEffect` + `useRef` to call `abcjs.renderAbc(divRef.current, abcSource, { responsive: 'resize' })` after mount. Renders into a `<div ref={divRef} />`. No async WASM loading (unlike Typst) — abcjs is synchronous.

4. **Error handling**: `abcjs.renderAbc()` does not throw on bad input — it returns an array of tune objects. Check for parse errors in the returned objects (the library populates an `error` field on the tune object). Display `RenderErrorBlock` on error.

5. **Dynamic import**: Import abcjs lazily (`await import('abcjs')`) inside `useEffect` to avoid including it in the initial bundle. Vite will code-split it into a separate chunk.

### Bundle Size Impact

abcjs is a moderately sized library (estimated ~200–300 KB minified, ~80–100 KB gzipped based on GitHub repo size and comparable library benchmarks — exact figure should be verified with `bundlephobia.com/package/abcjs`). Lazy-loading via dynamic import means it is only downloaded when a card containing `#abc` content is rendered. Cards without ABC content pay no cost. This is the same pattern typst.ts uses (lazy singleton).

### Edge Cases That Matter

- **`#abc` block with no content**: An empty ABC block should show the error fallback, not a blank SVG.
- **Card flip**: The `<div>` ref target must be unique per card face (not reused). If front and back both contain `#abc` blocks, each gets its own `<div>` and `useEffect`.
- **Card in list view vs. study mode**: The `KartexRenderer` is used in both contexts. Responsive sizing (`responsive: 'resize'`) handles the different container widths automatically.
- **Dark mode**: abcjs SVG elements use default black strokes. On a dark background card, the notation will be visible (black on white is the SVG background). If Kartex uses dark-mode card backgrounds, `add_classes: true` plus CSS overrides can re-color SVG elements. This is a cosmetic edge case, not a blocker.
- **Multiple `#abc` blocks on one card face**: Each renders independently. The `preprocessABCBlocks` step must handle multiple blocks without merging them.

---

## Feature 7: Deck Update via `.kartex.zip` (Extend Existing Update Path)

### What This Is

The existing `deckUpdate.ts` route (`POST /:id/update/preview` and `POST /:id/update/apply`) currently accepts only `.kartex` plain text files and explicitly rejects `.kartex.zip`. The new feature extends these endpoints to also accept `.kartex.zip` bundles, extracting `deck.kartex` from the zip and processing the `media/` folder using the same logic already in `import.ts`.

### Table Stakes

| Behavior | Rationale |
|----------|-----------|
| `.kartex.zip` accepted by both `/update/preview` and `/update/apply` | The upload affordance already allows either format for new-deck import. Users naturally try to upload a zip when they updated their media files alongside cards. |
| `deck.kartex` inside zip is parsed and diffed the same way as a plain `.kartex` file | The diff algorithm (`computeDiff`) is already correct and reusable |
| New media files in the zip's `media/` folder are extracted, validated (magic bytes), UUID-renamed, and stored | Exactly what `import.ts` does for new-deck import — reuse the same validation and storage logic |
| Existing media refs in updated card content are rewritten to new UUID filenames (`rewriteMediaRefs`) | Already implemented in `import.ts`; must be applied during update as well |
| SM-2 progress for matched cards is untouched | Core invariant of the update path; unchanged by adding zip support |
| Preview step shows diff counts (added/updated/unchanged/removed) without committing media to disk | The preview endpoint must not write any media files. File validation can run during preview (to surface errors early) without storage. |
| Apply step writes media only after diff is confirmed | Atomic intent: if the Prisma transaction fails, orphaned media files are an accepted known limitation (same as `import.ts` T-5-07) |

### Differentiators

| Behavior | Value | Complexity |
|----------|-------|------------|
| Warn about card content referencing media files not present in the zip | Already done in `import.ts` for new-deck import; carry this over to the update path | Low — reuse existing warning logic |
| Orphaned media cleanup (files no longer referenced after an update) | When a card's content is updated and the old `media://uuid.ext` ref is no longer present, the file on disk becomes orphaned. For v1.4, accept this as a known limitation — disk space is trivial for 2-5 users | Low priority for v1.4 |

### Anti-Features

| Anti-Feature | Why Avoid |
|--------------|-----------|
| Replacing existing media files in-place (overwrite by original filename) | UUIDs are the storage key; original filenames are not stable. Overwriting UUIDs breaks existing card content refs in unchanged cards. The correct behavior is: new media file = new UUID. |
| Deleting old media files when a card is updated | See orphaned media note above; complex and not worth the risk of data loss |

### Implementation Delta (relative to current `deckUpdate.ts`)

The existing route is well-structured. The changes are:

1. Remove the early-reject guard: `if (normalizedName.endsWith('.kartex.zip')) return error`
2. Add zip-branch logic (parallel to `import.ts`): detect `.kartex.zip`, open with `unzipper`, extract `deck.kartex` text and `media/` entries
3. For the **preview endpoint**: validate all media entries (magic bytes, size) and return errors if any fail — do NOT write to disk. Return the diff counts plus any media validation warnings.
4. For the **apply endpoint**: after running `computeDiff`, write validated media files (reuse `import.ts` storage loop), run `rewriteMediaRefs` on added/updated card content, then execute the Prisma transaction.
5. The `rewriteMediaRefs` function from `import.ts` must be shared (move to a lib module) rather than duplicated.

### Edge Cases That Matter

- **Zip contains media files referenced by cards that are being removed (`removedIds`)**: The media files are stored regardless; the card deletion is a separate concern. Orphaned media files are an accepted outcome.
- **Updated card changes a `media://` ref**: The old media file (UUID) remains on disk (not deleted). The new media file (new UUID from the zip) is added. The card content is updated with the new UUID ref. Old file is orphaned — accepted.
- **Card content references a media file from a previous import (not in this zip)**: The ref (`media://old-uuid.jpg`) is not in the current zip's `storedFilenames` map. `rewriteMediaRefs` passes it through unchanged (it falls to the `else` branch: `return 'media://${refName}'`). If the old file still exists on disk, it will still render. Correct behavior.
- **ZIP has no `media/` folder**: Valid — treat like a plain `.kartex` file (no media to process). The diff runs normally.
- **macOS ZIP artifacts (`__MACOSX/`)**: Already filtered in `import.ts`. Apply the same filter in the update path.
- **Body size limit**: The existing `bodyLimit(5 MB)` in `deckUpdate.ts` applies to the whole request. A `.kartex.zip` with media could easily exceed 5 MB. The limit should match `import.ts`'s `MAX_BYTES` (10 MB by default, configurable via `MAX_UPLOAD_BYTES`). Additionally, the same uncompressed-total ceiling used in `import.ts` (`MAX_BYTES * 10`) should apply.

---

## Feature 8: Quick-Edit in Study Mode

### What This Is

During a study session (`/decks/:id/learn` or `/study`), a 3-dot overflow menu (DropdownMenu) appears on the study card. For users with owner or EDIT-access permission on the card's deck, the menu offers two actions: "Edit this card" (opens the card editor) and "Jump to deck" (navigates to the deck detail page).

### Anki Precedent (HIGH confidence — Anki Manual)

Anki's study mode has an "Edit" button (bottom-left during review) that opens the card editor without leaving the session. After saving, the user returns to study. There is also keyboard shortcut `E` to open the editor. This is the most-used study-mode shortcut in Anki — users frequently spot typos or want to add context while reviewing.

### Table Stakes

| Behavior | Rationale |
|----------|-----------|
| 3-dot overflow menu visible on study cards | Unobtrusive — does not compete with card content or rating buttons. Standard DropdownMenu pattern already used in deck list. |
| "Edit this card" action opens the card editor | Navigation to `/decks/:deckId/cards/:cardId/edit` (or equivalent). The card ID and deck ID are available in study session state. |
| "Jump to deck" action navigates to the deck detail page | `/decks/:deckId` — lets user see the full deck context or add cards |
| Menu only shown to users with owner or EDIT permission on the source deck | READ-only users and users studying a shared READ deck cannot edit cards. Show the menu only when `deck.ownerId === currentUserId` or `deckShare.permission === 'EDIT'`. |
| Menu is hidden (not just disabled) for users without permission | Showing a disabled menu is confusing. No menu is cleaner. |
| SM-2 session continues after edit | After the user saves the card and returns, the study session resumes from where it left off. Do not reset the session or reload all cards. |

### Differentiators

| Behavior | Value | Complexity |
|----------|-------|------------|
| Inline edit modal (without navigating away) | Keeps the user in the study flow — no page navigation. Opens a Dialog over the study card, user edits front/back/tags, saves, dialog closes, session continues. Higher DX. | Medium — requires modal-based edit form rather than page navigation |
| Keyboard shortcut (e.g., `E` to open editor, `D` to jump to deck) | Power-user feature; Anki uses `E`. Adds discoverability challenge (needs a tooltip). | Low — `useEffect` + `keydown` listener |
| Return-to-study context preserved after page navigation | If using navigation (not modal), store the study session in `sessionStorage` and restore on back-navigation. | Medium |

**Recommendation for v1.4:** Start with navigation (not modal). Navigate away to the card edit page, return with browser back button. This is simpler and still addresses the core pain point. The inline modal is a v1.5 enhancement.

### Anti-Features

| Anti-Feature | Why Avoid |
|--------------|-----------|
| "Delete this card" in the study mode menu | Destructive action during a study session is high-risk. Delete belongs on the deck detail page with a confirmation dialog. |
| Showing the menu to all users regardless of permission | Users with READ-only access cannot edit; showing a disabled option creates confusion |
| Pausing SM-2 timer or state during the edit | SM-2 in Kartex is server-side and event-driven (ratings on `POST /api/study/rate`). The timer concept does not apply. Session state is held in React component state; navigating away clears it. |

### Edge Cases That Matter

- **Global study session (`/study`) spans multiple decks**: The card in view may belong to a deck the user has READ-only access to. The menu must check permissions per-card, not globally.
- **Card was deleted by another user while study session is in progress**: Rare with 2-5 users, but possible. If the "Edit this card" navigation leads to a 404 (card no longer exists), show a "Card no longer available" message and offer to return to study.
- **Study session re-entry after navigation**: When using the simple navigation approach (not modal), navigating back to `/study` or `/decks/:id/learn` will restart the session (standard SPA behavior). This is the accepted tradeoff for the simple implementation. The modal approach avoids this.

---

## Feature Dependency Map

```
User.email column (migration)
  ├── Feature 1: Email Invitations (needs email to send to)
  ├── Feature 3: Self-Service Password Reset (sends to User.email)
  └── Feature 4: Admin-Triggered Password Reset (sends to User.email)

InviteToken model (new, migration)
  └── Feature 1: Email Invitations (replaces InviteCode for new invites)

PasswordResetToken model (new, migration)
  ├── Feature 3: Self-Service Password Reset
  └── Feature 4: Admin-Triggered Password Reset

SMTP config (.env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM)
  ├── Feature 1: Email Invitations (send invite)
  ├── Feature 3: Self-Service Password Reset (send reset)
  └── Feature 4: Admin-Triggered Password Reset (send reset)

No new migration needed:
  ├── Feature 5: Admin User Deletion (schema cascades already correct, minor FK review)
  ├── Feature 6: ABC Rendering (frontend only, new npm package)
  ├── Feature 7: Deck Update via .kartex.zip (backend logic reuse)
  └── Feature 8: Quick-Edit in Study Mode (frontend only, uses existing card edit route)

DeckShare FK review (may need migration):
  └── Feature 5: Admin User Deletion (DeckShare.sharedWithUserId → onDelete: Cascade)
```

---

## MVP Recommendation for v1.4

**Group A — Auth & Email (all share SMTP and User.email migration):**
1. Add `User.email` column and `SMTP_*` env config support (Nodemailer transporter)
2. Email invitation flow (replaces invite codes in admin panel)
3. Self-service password reset
4. Admin-triggered password reset

**Group B — Admin Improvements (independent):**
5. Admin user deletion (no new migration if FK review is handled in Group A migration)

**Group C — Content & Study (independent of auth):**
6. ABC notation rendering (`#abc` blocks in `KartexRenderer`)
7. Deck update via `.kartex.zip` (extend existing update route)
8. Quick-edit in study mode

**Suggested delivery order:** Group C can start immediately (no migrations, no SMTP). Group A all ships together (single migration + SMTP plumbing). Group B ships with Group A (admin panel work is adjacent). Group C is safe to parallelize with Groups A and B.

---

## Sources

- Kartex codebase: `apps/backend/prisma/schema.prisma`, `apps/backend/src/routes/admin.ts`, `apps/backend/src/routes/import.ts`, `apps/backend/src/routes/deckUpdate.ts`, `apps/frontend/src/components/KartexRenderer.tsx` — HIGH confidence
- [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html) — HIGH confidence (password reset security norms)
- [Postmark: User Invitation Email Best Practices](https://postmarkapp.com/guides/user-invitation-email-best-practices) — HIGH confidence (invitation UX)
- [abcjs Official Documentation: renderAbc Overview](https://docs.abcjs.net/visual/overview) — HIGH confidence
- [abcjs Official Documentation: RenderAbc Options](https://docs.abcjs.net/visual/render-abc-options) — HIGH confidence (responsive, scale, staffwidth options)
- [abcjs GitHub](https://github.com/paulrosen/abcjs) — HIGH confidence (current maintained library)
- [Anki Manual: Studying](https://docs.ankiweb.net/studying.html) — HIGH confidence (quick-edit in study mode precedent)
- [Cloudscape Design System: Delete with additional confirmation](https://cloudscape.design/patterns/resource-management/delete/delete-with-additional-confirmation/) — HIGH confidence (delete UX patterns)
- [LogRocket: Implementing secure password reset in Node.js](https://blog.logrocket.com/implementing-secure-password-reset-node-js/) — MEDIUM confidence (token implementation pattern)
- [AppMaster: Transactional email flows](https://appmaster.io/blog/transactional-email-flows-tokens-expiration-deliverability) — MEDIUM confidence (token expiry norms)
- [Nodemailer](https://nodemailer.com/) — HIGH confidence (SMTP transport for Node.js)
