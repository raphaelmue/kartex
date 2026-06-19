# Domain Pitfalls — Kartex v1.4.0

**Domain:** Adding email auth flows, ABC notation rendering, and UX improvements to an existing Hono + Prisma 7 + PostgreSQL 16 + React flashcard app.
**Researched:** 2026-06-19
**Scope:** Security pitfalls and integration hazards specific to the v1.4.0 feature set. Codebase-grounded; not generic advice.

---

## Email Security

---

### Pitfall 1: Email Enumeration via Distinct Error Messages

**Feature:** Password reset ("forgot password"), admin-triggered password reset, email invite

**Description:** Any endpoint that returns a different response depending on whether an email address is registered — "User not found" vs. "Reset email sent" vs. "Email already in use" — leaks which email addresses have accounts. This is a low-effort reconnaissance technique for attackers targeting a self-hosted instance.

**Risk:** An attacker submits `POST /api/auth/forgot-password` with various email addresses. Distinguishing responses reveal which are registered users, enabling targeted attacks.

**Prevention:**
- All three endpoints must return the **same 200 response and message** regardless of whether the submitted email exists in the database: e.g., `"If an account exists for this address, a reset link has been sent."` Always run the same code path; never short-circuit with a different status code or body on user-not-found.
- Apply this to: forgot-password, admin-send-reset, and any invite-rejection message (avoid "this email already has an account").
- The existing login route in `auth.ts` already follows this pattern for username vs. wrong-password (T-02-01/T-02-02) — replicate it for email flows.

---

### Pitfall 2: SMTP Credential Exposure in Logs and Environment

**Feature:** Any email-sending route (invite, password reset)

**Description:** Nodemailer SMTP configuration requires a password (or API key). In Docker Compose deployments, these land in `.env` files and are injected as environment variables. Several exposure vectors exist: (a) the `.env` file is committed to git, (b) the running container exposes env via `docker inspect`, (c) error stack traces printed to logs include the transporter config object which may contain the `auth.pass` field, (d) the backend accidentally serializes `process.env` to a JSON response.

**Risk:** SMTP credentials stolen → attacker sends phishing email from your domain, or locks you out of your email account.

**Prevention:**
- `.env.local` and `.env` containing real credentials must be in `.gitignore`. The project already has `.env.local` listed as untracked (see git status). Add a `.env.example` with placeholder values only.
- When constructing the nodemailer transporter, never log the config object. Wrap SMTP errors with `err.message` only, not `JSON.stringify(transporterConfig)`.
- Validate that `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` are defined at startup and fail fast with a clear error message — do not let the first email send be the point of discovery.
- For the Docker Compose deployment, use Docker secrets or an `.env` file outside the repo root, not hardcoded in `docker-compose.yml`.

---

### Pitfall 3: Email Invite Link as a Phishing Vector (Open Redirect in Link Construction)

**Feature:** Email invitation system

**Description:** The invite email contains a link like `https://kartex.example.com/register?token=XXX`. If the base URL is constructed from user-supplied or environment-supplied data without validation, an attacker who can influence `SMTP_FROM_URL` or `APP_BASE_URL` could craft a link pointing to a malicious domain.

**Risk:** Users receive what appears to be a valid Kartex invite but the link leads to a phishing page.

**Prevention:**
- Hardcode the base URL from `APP_BASE_URL` env var and validate it is a valid HTTPS URL at startup (reject if missing or not `https://`).
- Never construct the invite link base from request headers like `Host` or `X-Forwarded-Host` — these are attacker-controlled in proxied deployments and enable host header injection.
- Apply `Content-Type: text/html; charset=utf-8` and escape any user-supplied values (like the invitee's email) that appear in the email HTML body.

---

## Password Reset Token Security

---

### Pitfall 4: Password Reset Token in URL Leaks via Referer Headers and Server Logs

**Feature:** Forgot-password and admin-triggered password reset

**Description:** The standard approach sends a link like `/reset-password?token=abc123`. When the user opens this link and then navigates to any external resource (analytics script, favicon, a link in the UI), the browser sends the full URL including the token in the `Referer` header. Additionally, HTTPS access logs at the Hono/reverse-proxy layer record the full request path including query parameters.

**Risk:** Reset token is logged in server access logs or leaked to third-party domains via `Referer`, allowing replay by anyone who reads those logs.

**Prevention:**
- Include `<meta name="referrer" content="no-referrer">` in the reset-password HTML page, or set `Referrer-Policy: no-referrer` as a response header on the reset page route.
- Alternatively, use a POST-based redemption flow: the link only carries the token in the URL fragment (`#token=...`), which is never sent to servers — the frontend JS reads it and POSTs it to the API. Fragment-based tokens never appear in server logs.
- **At minimum:** set short token expiry (1 hour) so any leaked token becomes worthless quickly.
- Document in phase plan: access logs must not be retained with token-containing paths, or the log format must be configured to exclude query strings.

---

### Pitfall 5: Reset Token Must Be Hashed in the Database, Not Stored Plaintext

**Feature:** Password reset tokens, invite tokens

**Description:** Storing the raw token in a `passwordResetToken String` column means a database dump leaks all active reset tokens. An attacker with read access to the DB (SQL injection, backup theft) can immediately use any active token to take over accounts.

**Risk:** Database compromise → all active reset tokens usable → account takeover for every user with a pending reset.

**Prevention:**
- Store `crypto.randomBytes(32).toString('hex')` as the raw token (emailed to the user), and store only `crypto.createHash('sha256').update(rawToken).digest('hex')` in the database.
- On redemption, hash the submitted token and compare the hash against the stored hash.
- Do NOT use bcrypt for this comparison — bcrypt is intentionally slow and adds no security benefit over SHA-256 for tokens (tokens are already high-entropy random bytes, not low-entropy passwords). Use SHA-256 + `crypto.timingSafeEqual` for constant-time comparison.
- The existing `RefreshToken` model uses bcrypt for token hashing (see `auth.ts`). For password reset tokens, SHA-256 is the correct choice: it is fast (irrelevant that an attacker cannot brute-force 32 random bytes even with SHA-256), avoids the bcrypt cost on every reset attempt, and supports constant-time comparison via `timingSafeEqual`.

---

### Pitfall 6: Single-Use Enforcement Race Condition (TOCTOU)

**Feature:** Password reset, invite links

**Description:** Naive single-use enforcement reads the token, checks if used, then marks it used in two separate queries. Under concurrent requests (e.g., user double-clicks the link, or an attacker replays the token immediately after the legitimate user clicks it), both requests can pass the "is used?" check before either marks it used. This is a documented CVE pattern (Parse Server CVE-2026-32943).

**Risk:** An attacker who has observed a reset token (via log leakage, Referer) can race the legitimate user and set their own password.

**Prevention:**
- Use a single atomic `UPDATE ... WHERE tokenHash = ? AND usedAt IS NULL` (or Prisma's `updateMany` with a where clause including `usedAt: null`) and check the affected row count. If 0 rows updated, the token was already used — reject immediately.
- In Prisma: use `prisma.passwordResetToken.updateMany({ where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } })` and verify `count === 1` before proceeding with the password change.
- Execute this check-and-mark inside a `prisma.$transaction` alongside the password update to ensure atomicity: mark used AND update password in the same transaction. If the password update fails, the token remains unused.

---

### Pitfall 7: Token Expiry Edge Cases — Clock Skew and Near-Expiry Race

**Feature:** Password reset tokens, invite tokens

**Description:** Tokens with `expiresAt` checked server-side using `new Date()` can fail at the boundary due to: (a) the user clicks the link at T=expiry and it takes 200ms to reach the server, arriving at T+200ms which is past expiry; (b) the admin sets a very short expiry (e.g., 5 minutes) and the email is delayed in transit.

**Risk:** Legitimate users fail to reset their password due to tight expiry windows, degrading UX.

**Prevention:**
- Use a 1-hour expiry for password reset tokens. This is the industry standard and provides ample time for email delivery while keeping the attack window small.
- Use a 7-day expiry for invite tokens (already used by the existing invite code system — replicate this).
- Add a small grace period (30 seconds) in the expiry check: `expiresAt > new Date(Date.now() - 30_000)` — this accounts for clock drift between email send time and arrival.
- Clearly communicate expiry to the user in the email: "This link expires in 1 hour."

---

### Pitfall 8: No Rate Limiting on Reset Endpoints Enables Email Bombing

**Feature:** Forgot-password endpoint

**Description:** Without rate limiting, an attacker can submit `POST /api/auth/forgot-password` with any user's email thousands of times per minute, flooding that user's inbox with reset emails and potentially hitting SMTP sending limits or blacklisting the sending domain.

**Risk:** Denial of service against the email system; potential SMTP account suspension.

**Prevention:**
- Apply `rateLimitMiddleware` to all email-sending routes (the existing `auth.ts` already applies 10 req/60s to all auth routes — ensure the new email routes are mounted under the same router or explicitly rate-limited).
- Consider a separate, tighter limit (e.g., 3 req/hour) per email address for forgot-password specifically — but since the current rate limiter is IP-based, IP-per-email tracking would require additional state.
- Return 200 (not 429) when rate limit is hit on forgot-password to avoid leaking whether a limit exists for that IP.

---

## User Deletion Cascade

---

### Pitfall 9: FK Constraint Order for User Deletion — Missing Cascade on DeckShare

**Feature:** Admin: delete user (permanent deletion with cascade)

**Description:** Looking at the current Prisma schema (`schema.prisma`):
- `DeckShare.sharedWithUser → User` has **no `onDelete` action** — defaults to `Restrict` in PostgreSQL. This means deleting a `User` who is the `sharedWithUser` on any `DeckShare` row will fail with a FK constraint violation BEFORE the cascade on the user's own decks fires.
- `RefreshToken.user → User` also has no `onDelete` action — same issue.
- `InviteCode.usedBy → User` has no `onDelete` action — same.
- `CardProgress.user → User` has no `onDelete` action — same.
- `ReviewLog.user → User` has `onDelete: Cascade` (correct).
- `Media` table has no FK to `User` — orphan risk (see Pitfall 10).

**Risk:** `prisma.user.delete({ where: { id } })` throws a FK constraint violation and rolls back when the user has received deck shares, active refresh tokens, or used an invite code. The delete silently fails with a Prisma error, or crashes the handler.

**Prevention:**
- Add `onDelete: Cascade` to: `RefreshToken.user`, `CardProgress.user`, `DeckShare.sharedWithUser`, `InviteCode.usedBy` (or `SetNull` for InviteCode to preserve the audit trail).
- Write a new SQL migration (follow the existing hand-written migration pattern) adding `ON DELETE CASCADE` to these FK constraints.
- OR: perform the deletion manually in the correct dependency order within a `prisma.$transaction`: (1) delete `RefreshToken` where `userId = id`, (2) delete `CardProgress` where `userId = id`, (3) delete `ReviewLog` where `userId = id`, (4) delete `DeckShare` where `sharedWithUserId = id`, (5) nullify `InviteCode.usedById` where applicable, (6) delete owned `Deck`s (which cascades to `Card`, `CardProgress` on those cards, `DeckShare`, `ReviewLog`), (7) delete `User`.
- The safest path for v1.4.0 is the manual transaction — it avoids a schema migration and makes the deletion order explicit and auditable.
- **Do not attempt `prisma.user.delete()` without first clearing all non-cascading related rows.** Write a backend test: create a user with decks, cards, shares, progress, refresh tokens; delete them; verify all rows are gone.

---

### Pitfall 10: Orphaned Media Files After User Deletion

**Feature:** Admin: delete user

**Description:** The `Media` table has `ownerId String` but no FK relation to `User` in the Prisma schema (it is a bare string, not a `@relation`). Deleting a user leaves their media files on disk and their `Media` rows in the database with an `ownerId` pointing to a non-existent user.

**Risk:** Unbounded disk growth over time; `Media` rows with dangling `ownerId` values. If a future feature queries `Media` by `ownerId` for billing or quota, deleted user media will appear as orphaned records.

**Prevention:**
- In the user deletion handler, before deleting the user: query `prisma.media.findMany({ where: { ownerId: id } })`, then for each record delete the disk file (`fs.unlink(m.storagePath)`), then `prisma.media.deleteMany({ where: { ownerId: id } })`. Wrap in the same transaction for the DB part (note: file deletes are not transactional — if the transaction rolls back, the files will have been deleted but the DB rows will still exist; log and accept this trade-off as per existing codebase pattern at `import.ts:270`).
- Alternatively, add a proper FK `@relation` for `Media.ownerId → User.id` with `onDelete: SetNull` or `onDelete: Cascade` in the Prisma schema. This requires a migration.

---

### Pitfall 11: Deleting a User Who Owns a Public Deck Breaks the Explore Page

**Feature:** Admin: delete user

**Description:** A user may own a `PUBLIC` or `SHARED` visibility deck. Deleting the user cascades to delete their decks (via `Deck.owner → User`). Users who have forked that public deck retain their fork (it is their own deck now, unrelated to the original), but users who added the deck to their library via `DeckShare` (not a fork, but a library link) will lose access abruptly. The `DeckShare` rows reference the now-deleted deck via `onDelete: Cascade` — the share is deleted, the deck disappears from their library without notice.

**Risk:** Other users lose library decks unexpectedly; no warning in the admin UI about downstream impact.

**Prevention:**
- In the admin delete confirmation dialog: show "This user owns N decks (X public, Y shared with Z users). Deleting will remove those decks from other users' libraries."
- Query `DeckShare.count({ where: { deck.ownerId: userId, sharedWithUserId: { not: userId } } })` to count affected shares and surface it in the confirmation step.
- Consider offering the admin an option to "reassign decks to admin account" rather than deleting them, to avoid data loss for other users. Out of scope for v1.4.0 but worth noting for the confirmation dialog text.

---

## ABC Notation Rendering (abcjs)

---

### Pitfall 12: abcjs Writes Directly to the DOM — Integration with React Requires a useEffect Pattern

**Feature:** `#abc` fenced blocks in KartexRenderer

**Description:** abcjs's `renderAbc(elementId, abcString, options)` works by taking a DOM element ID (or element reference) and directly mutating its inner content to SVG. It does not return an SVG string — it writes to the DOM. This conflicts with React's virtual DOM if abcjs is called during render instead of in a `useEffect`. Additionally, on re-render, if the container element is unmounted and remounted, abcjs's previous write is discarded, requiring re-invocation.

**Risk:** Calling `renderAbc` during the render phase causes React hydration mismatches or DOM corruption. Using `dangerouslySetInnerHTML` with the SVG output requires extracting SVG from the DOM after rendering, which is awkward.

**Prevention:**
- Follow the same pattern as the existing `TypstBlock` component: create an `AbcBlock` React component that holds a `ref` to a `<div>`, and calls `renderAbc(divRef.current, source, options)` inside `useEffect([source])`. This lets abcjs write to the real DOM node directly, outside React's control.
- Dependency array must include `source` so the notation re-renders when card content changes (e.g., user edits a card).
- The SVG output from abcjs is a well-structured music notation SVG — it does not contain user-supplied arbitrary HTML. However, see Pitfall 13.

---

### Pitfall 13: ABC Notation Text Fields Can Contain Arbitrary User Content

**Feature:** `#abc` blocks in KartexRenderer

**Description:** ABC notation files support metadata fields embedded in the notation string: `T:` (title), `C:` (composer), `W:` (lyrics/words). These fields are rendered as text inside the abcjs SVG output. abcjs renders them as `<text>` SVG elements or as HTML alongside the SVG. **The content of these fields comes directly from user-authored card content.** If abcjs renders them via innerHTML or text interpolation without escaping, malicious card content could inject SVG attributes containing `javascript:` URLs or event handlers.

**Risk level:** LOW for the current threat model (authenticated users only; 2-5 trusted users on a self-hosted instance). However, if the Explore page ever displays cards from other users, stored XSS via ABC notation metadata becomes a concern.

**Prevention:**
- Audit abcjs release notes and its `SECURITY.md` (present in the repo) for any documented XSS issues before the implementation phase.
- After calling `renderAbc`, if the resulting SVG output is later extracted and rendered via `dangerouslySetInnerHTML`, run it through DOMPurify first: `DOMPurify.sanitize(svgOutput, { USE_PROFILES: { svg: true, svgFilters: true } })`.
- If using the `useEffect` + `ref` pattern (recommended in Pitfall 12), abcjs writes directly to a React-managed DOM node — React does not re-sanitize this. DOMPurify should be applied if the SVG content later escapes into other React-managed DOM (e.g., copy-to-clipboard, server-side rendering).
- For the initial v1.4.0 scope (trusted users, no public card browsing), document this as an accepted low-risk trade-off and revisit if the Explore page adds card content preview from strangers.

---

### Pitfall 14: abcjs Is a Large Bundle — Lazy Load Required

**Feature:** `#abc` blocks in KartexRenderer

**Description:** The abcjs package includes a WASM-free but still substantial JavaScript bundle. Importing it at the top of `KartexRenderer.tsx` adds it to the main bundle, increasing initial load time for all pages, including pages that never render ABC notation.

**Risk:** Increased Time to Interactive on dashboard, study, and deck pages even when no ABC content is present.

**Prevention:**
- Use dynamic `import('abcjs')` inside the `AbcBlock` component's `useEffect`, the same pattern as the Typst WASM singleton (`lib/typst.ts`).
- The first render of an `#abc` block triggers the dynamic import; subsequent renders use the cached module.
- This mirrors the existing lazy-load pattern already established in the project and avoids a new bundle-size regression for all users.

---

## Deck Update via .kartex.zip

---

### Pitfall 15: Path Traversal in ZIP Entry Filenames (Zip Slip)

**Feature:** Deck update via `.kartex.zip` (extending `deckUpdate.ts`)

**Description:** The existing `import.ts` already handles zip extraction. It uses `unzipper` and applies `basename()` to strip directory components from media entry paths (T-5-02: `const entryName = basename(entry.path.replace(/\\/g, '/'))`). The **deck update extension** must replicate this exact sanitization. If a new code path in `deckUpdate.ts` extracts media entries and writes them to `storagePath` using the raw `entry.path` (e.g., `join(storagePath, entry.path)`), an attacker can upload a zip with `media/../../etc/passwd` as an entry path, causing writes outside the media directory.

**Risk:** Arbitrary file write to the Docker container filesystem. While the container runs as a non-root user (or should), this can still overwrite config files or the application itself.

**Prevention:**
- Copy the `basename()` sanitization from `import.ts` verbatim into any new zip extraction code in the deck-update path: `const entryName = basename(entry.path.replace(/\\/g, '/'))`.
- After computing `const fullPath = join(storagePath, entryName)`, assert that `fullPath.startsWith(storagePath + path.sep)` — reject if not. This is the definitive path traversal check.
- Write a backend test: upload a `.kartex.zip` containing a media entry named `../../evil.txt` — the server must return 422 or ignore the malicious entry, not write the file.

---

### Pitfall 16: Zip Bomb — Tiny Upload Expands to Huge Extraction

**Feature:** Deck update via `.kartex.zip`

**Description:** The existing import path already has zip bomb protections: `MAX_MEDIA_ENTRIES = 100` and `MAX_TOTAL_BYTES = MAX_BYTES * 10` (total uncompressed ceiling). The deck update extension must replicate these checks. Without them, a crafted zip with 1000 near-empty filenames or a highly-compressed large file can exhaust disk or memory during extraction.

**Risk:** Denial of service via disk exhaustion or OOM in the Node.js process.

**Prevention:**
- Import and reuse the constants from `import.ts` (or move them to a shared lib): `MAX_MEDIA_ENTRIES = 100`, `MAX_TOTAL_BYTES = MAX_BYTES * 10`.
- Count entries and accumulate uncompressed bytes before writing anything to disk — same as the validation-phase-then-storage-phase pattern in the existing `import.ts`.
- The `bodyLimit` middleware check (5 MB compressed for plain `.kartex` updates) already limits the compressed size at the HTTP layer. For zip content, the compressed-to-uncompressed ratio check is the second line of defense.

---

### Pitfall 17: TOCTOU Between Preview and Apply for Zip Update

**Feature:** Deck update via `.kartex.zip` — extending the preview/apply flow

**Description:** The existing `deckUpdate.ts` preview/apply flow re-runs the full diff computation on `apply` (stateless, no server-side session). This is correct and documented (comment: "Owner gate — stateless re-check (TOCTOU prevention)"). The zip update extension must preserve this property. If the zip apply step trusts a client-provided diff from the preview response (e.g., `{ toAdd: [...], toRemove: [...] }`), an attacker can manipulate the apply request to remove cards they should not be able to remove.

**Risk:** Client-supplied diff allows arbitrary card deletion or modification by a malicious user.

**Prevention:**
- The apply endpoint must receive the **uploaded zip file**, re-parse it, re-run `computeDiff`, and execute against the current deck state — never accept a pre-computed diff from the client.
- This is consistent with the existing pattern in `deckUpdate.ts`. The zip extension must not introduce a "pass the diff as JSON" shortcut.

---

### Pitfall 18: Media Files From Zip Update Are Not Deduped — Old Media for Replaced Cards Orphaned

**Feature:** Deck update via `.kartex.zip`

**Description:** This is an extension of v1.3.0 Pitfall 9. When a card's content changes via zip update, the new zip's media files get new UUID filenames. The old media files (referenced by the old card content) are now orphaned — their `Media` rows still exist, disk files still on disk, but no card content references them anymore.

**Risk:** Disk usage grows unboundedly with each zip update that includes media files.

**Prevention:**
- Before the update transaction: record which `media://` refs appear in the cards being updated.
- After the transaction commits: compare old refs to new refs; delete `Media` rows and disk files for refs that are no longer referenced by any card content in this deck.
- Accept that this cleanup is best-effort: if `unlink` fails, log and continue. The same trade-off applies here as in the existing import code (comment at `import.ts:270`).
- This is a moderate severity maintenance issue, not a security issue. Flag it in the phase plan as a technical debt item to address in the apply handler's post-transaction cleanup.

---

## Hono and Prisma-Specific Gotchas

---

### Pitfall 19: Email Field Migration Must Handle Existing Users (NULL vs. Required)

**Feature:** User email field (required for invite delivery and password reset)

**Description:** Adding an `email String @unique` field to the `User` model in Prisma schema with no `?` makes it `NOT NULL`. Applying this migration to a database with existing users will fail: PostgreSQL cannot add a `NOT NULL` column to a table with rows unless a `DEFAULT` is provided. Existing users have no email address.

**Risk:** Migration failure on `docker compose up` after adding the email column — the backend fails to start, breaking the production instance.

**Prevention:**
- Add `email String? @unique` (nullable) in the initial migration to allow existing users to have `null` email.
- In the v1.4.0 implementation, require email for all new registrations via invite (the invite email address becomes the account email). Existing users who registered via the old invite code flow will have `email: null`.
- The admin panel should surface which users lack an email address and allow the admin to add one (for password reset to work).
- Write the migration as a hand-written SQL file (following the established pattern): `ALTER TABLE "User" ADD COLUMN "email" TEXT;` then `CREATE UNIQUE INDEX "User_email_key" ON "User"("email");`.
- Do NOT use `@default("")` (empty string) — it violates the uniqueness constraint immediately if multiple users have it.

---

### Pitfall 20: Invite Token Single-Use Race in Registration

**Feature:** Email invite system replacing existing invite codes

**Description:** The existing invite code registration in `auth.ts` has a TOCTOU window between checking `invite.usedAt !== null` and marking `usedAt = new Date()`. Two concurrent requests with the same invite link can both pass the check before either marks the code used. This is documented as a known vulnerability pattern (Homarr GHSA-vfw3-53q9-2hp8). The existing code does not use a transaction for this check-and-mark.

**Risk:** One invite link creates two user accounts.

**Prevention:**
- Use the same atomic update pattern as Pitfall 6: `prisma.inviteToken.updateMany({ where: { token: tokenHash, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date(), usedById: userId } })` and verify `count === 1` before proceeding.
- Wrap the entire registration (mark token used + create user) in a `prisma.$transaction` so that if user creation fails (e.g., username already taken), the token is not consumed.
- The new email-based invite flow (token in URL → user sets username + password) must also use this atomic pattern.

---

### Pitfall 21: Hono's In-Memory Rate Limiter Resets on Process Restart

**Feature:** All new email-sending routes (forgot-password, invite resend)

**Description:** The existing `rateLimitMiddleware` (see `middleware/rateLimit.ts`) uses an in-process `Map<string, RateLimitEntry>`. Restarting the Hono process (e.g., `docker compose restart backend`) resets all rate limit state. An attacker who can trigger a restart (or times an attack around a deploy) can bypass the per-IP limit.

**Risk:** Email bomb attack succeeds after a restart by resending the same forgot-password requests before the rate limit window resets.

**Prevention:** For a 2-5 user self-hosted instance, this is an **acceptable trade-off** — document it explicitly and do not over-engineer. The fix would require a persistent store (Redis, or a DB table), which is out of scope. Mitigate by keeping the rate limit window short (1 minute) so the opportunity window after restart is brief, and by keeping SMTP sending limits as a final backstop.

---

### Pitfall 22: Quick-Edit 3-Dot Menu Must Re-Verify Edit Permission Server-Side

**Feature:** Quick-edit 3-dot menu in StudySessionPage

**Description:** The study session loads cards from potentially multiple decks, including shared decks. The 3-dot menu to edit a card should only appear for cards in decks where the user has EDIT or MANAGE permission (or is owner). If permission is only checked client-side (by looking at the deck's `permission` field from a previous fetch), a user could bypass it by directly calling `PATCH /api/cards/:id` for a card in a deck they only have READ permission on.

**Risk:** Unauthorized card edits on shared decks where the user only has READ permission.

**Prevention:**
- The existing `PATCH /api/cards/:id` route must verify the user is the deck owner or has EDIT/MANAGE permission on the deck — this is a server-side check, not just a UI concern.
- Audit `apps/backend/src/routes/decks.ts` to confirm this check exists. If it relies on the client sending a permission level, that is a vulnerability.
- The 3-dot menu in the UI is a UX convenience — hiding it for READ-only decks is correct, but it is not a security control.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| Email auth: forgot-password endpoint | Email enumeration via distinct responses (Pitfall 1) | Return identical 200 response regardless of email existence |
| Email auth: SMTP config | Credential exposure in logs or env (Pitfall 2) | Never log transporter config; validate SMTP env vars at startup |
| Email auth: invite link construction | Open redirect via unvalidated APP_BASE_URL (Pitfall 3) | Validate HTTPS base URL at startup; never use Host header |
| Password reset: token storage | Plaintext token in DB leaks on backup theft (Pitfall 5) | Store SHA-256 hash; use timingSafeEqual for comparison |
| Password reset: URL token | Referer header and log leakage (Pitfall 4) | Set Referrer-Policy: no-referrer; use short expiry |
| Password reset: single-use | TOCTOU race allows double-use (Pitfall 6) | Atomic UPDATE WHERE usedAt IS NULL; verify count === 1 |
| Password reset: expiry | Near-boundary failures for legitimate users (Pitfall 7) | 1-hour expiry; 30-second grace window |
| Password reset: rate limit | Email bombing before rate limit resets (Pitfall 8) | Apply existing rateLimitMiddleware to new routes |
| User deletion: FK constraints | Non-cascading FK violations block delete (Pitfall 9) | Manual ordered deletion in prisma.$transaction |
| User deletion: orphaned media | Media rows and files stranded after user delete (Pitfall 10) | Delete media rows + disk files before deleting user |
| User deletion: public deck impact | Other users lose shared library decks silently (Pitfall 11) | Surface affected share count in admin confirmation UI |
| ABC notation: React integration | renderAbc called during render phase (Pitfall 12) | useRef + useEffect pattern, same as TypstBlock |
| ABC notation: user content | T:/C:/W: fields in ABC notation are user content (Pitfall 13) | Audit abcjs SECURITY.md; consider DOMPurify if needed |
| ABC notation: bundle size | abcjs added to main bundle (Pitfall 14) | Dynamic import() inside AbcBlock useEffect |
| Zip update: path traversal | Raw entry.path used in join() → file write outside media dir (Pitfall 15) | Replicate basename() + startsWith(storagePath) check from import.ts |
| Zip update: zip bomb | Missing size/count limits on zip update path (Pitfall 16) | Reuse MAX_MEDIA_ENTRIES and MAX_TOTAL_BYTES constants |
| Zip update: diff trust | Client-supplied diff accepted on apply (Pitfall 17) | Re-parse zip and re-run computeDiff server-side on every apply |
| Zip update: orphaned media | Old media unreferenced after card content change (Pitfall 18) | Post-commit cleanup; log failures; accept as trade-off |
| Schema: email field | NOT NULL email column fails migration on existing users (Pitfall 19) | Use nullable email? in schema; hand-written SQL migration |
| Invite registration: race | Two accounts created from one invite token (Pitfall 20) | Atomic updateMany + transaction for token + user creation |
| Rate limiter: restart reset | In-memory limit resets on restart (Pitfall 21) | Acceptable for 2-5 users; document; rely on SMTP limits as backstop |
| Quick-edit: permission | Client-side only permission check (Pitfall 22) | Verify EDIT/MANAGE permission server-side on card PATCH |

---

## Sources

- Kartex codebase: `apps/backend/src/routes/auth.ts` — existing token hashing and enumeration prevention patterns
- Kartex codebase: `apps/backend/src/routes/import.ts` — zip extraction safety (basename, MAX_MEDIA_ENTRIES, MAX_TOTAL_BYTES, validation-before-storage pattern)
- Kartex codebase: `apps/backend/src/routes/deckUpdate.ts` — TOCTOU prevention comment, stateless re-check pattern
- Kartex codebase: `apps/backend/src/middleware/rateLimit.ts` — in-memory rate limiter, IP-based
- Kartex codebase: `apps/backend/prisma/schema.prisma` — FK relations without onDelete (DeckShare.sharedWithUser, RefreshToken.user, CardProgress.user, InviteCode.usedBy)
- Kartex codebase: `apps/frontend/src/components/KartexRenderer.tsx` — TypstBlock useRef+useEffect DOM pattern for SVG injection
- [LogRocket: Implementing a secure password reset in Node.js](https://blog.logrocket.com/implementing-secure-password-reset-node-js/) — token hashing, enumeration, single-use
- [Sentry Blog: Cracking Password Reset Mechanisms](https://blog.sentry.security/cracking-password-reset-mechanisms/) — token timing attacks, TOCTOU
- [thoughtbot: Is Your Site Leaking Password Reset Links?](https://thoughtbot.com/blog/is-your-site-leaking-password-reset-links) — Referer header leakage
- [HackerOne #342693: Password reset token leakage via referrer](https://hackerone.com/reports/342693) — real-world Referer leakage report
- [Homarr GHSA-vfw3-53q9-2hp8: Race Condition in Invite Token Registration](https://github.com/homarr-labs/homarr/security/advisories/GHSA-vfw3-53q9-2hp8) — TOCTOU on invite single-use enforcement
- [Parse Server CVE-2026-32943: reset token concurrent use](https://advisories.gitlab.com/pkg/npm/parse-server/CVE-2026-32943) — concurrent reset token replay
- [Medium: Protecting Node.js Applications from Zip Slip](https://medium.com/intrinsic-blog/protecting-node-js-applications-from-zip-slip-b24a37811c10) — path traversal in zip extraction
- [Node.js crypto.timingSafeEqual documentation](https://nodejs.org/api/crypto.html) — constant-time comparison requirements
- [Prisma referential actions documentation](https://www.prisma.io/docs/v6/orm/prisma-schema/data-model/relations/referential-actions) — onDelete cascade behavior
- [abcjs npm page and GitHub repository](https://github.com/paulrosen/abcjs) — DOM-mutation rendering model
- [hono-rate-limiter](https://github.com/rhinobase/hono-rate-limiter) — production rate limiter with persistent store support
