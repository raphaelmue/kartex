# Requirements: Kartex v1.4.0 — Auth Overhaul & Study UX

**Created:** 2026-06-21
**Milestone:** v1.4.0
**Status:** Active

---

## Milestone Requirements

### EMAIL — Email Infrastructure & Invitations

- [x] **EMAIL-01**: User.email field exists on User model, nullable for existing users, unique per user
- [x] **EMAIL-02**: SMTP configured via env vars (SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM, APP_URL)
- [ ] **EMAIL-03**: Admin can send an email invitation to a specific address from the admin panel
- [x] **EMAIL-04**: Invitation email contains a one-time link (valid 7 days) navigating to the registration page
- [ ] **EMAIL-05**: User registers via invite link — email pre-filled (read-only), user sets username and password
- [x] **EMAIL-06**: Invitation link is single-use; subsequent clicks show a clear "already used" error page
- [ ] **EMAIL-07**: Admin can see pending (unused, non-expired) invitations in the admin panel
- [ ] **EMAIL-08**: Admin can revoke a pending invitation

### RESET — Password Reset

- [ ] **RESET-01**: Login page has a "Forgot password?" link
- [ ] **RESET-02**: User enters their email and receives a reset link (valid 1 hour)
- [ ] **RESET-03**: Reset request always returns success regardless of whether email exists (no enumeration)
- [ ] **RESET-04**: Reset link navigates to a page where user enters a new password
- [ ] **RESET-05**: Successful password reset invalidates all existing sessions (deletes all refresh tokens for the user)
- [ ] **RESET-06**: Expired or already-used reset links show a clear human-readable error page
- [ ] **RESET-07**: Admin can trigger a password reset email for any user from the admin panel
- [ ] **RESET-08**: Admin reset action shows a clear error when the target user has no email address

### ADMIN — Admin User Management

- [x] **ADMIN-01**: Admin can permanently delete a user account from the admin panel
- [x] **ADMIN-02**: Delete requires two-step confirmation (modal + type username to confirm)
- [x] **ADMIN-03**: Confirmation dialog explicitly lists what will be deleted (decks, cards, progress, review logs)
- [x] **ADMIN-04**: Admin cannot delete their own account or the last admin account
- [x] **ADMIN-05**: Admin can see each user's email address in the user list

### ABC — ABC Notation Rendering

- [ ] **ABC-01**: `#abc` fenced blocks in card content render as SVG sheet music inline in the card
- [ ] **ABC-02**: Invalid ABC notation shows an error fallback (not a crash or blank space)
- [ ] **ABC-03**: Rendered SVG scales to card width (responsive on mobile and desktop)

### DECKU — Deck Update via .kartex.zip

- [ ] **DECKU-01**: Deck update path accepts `.kartex.zip` files in addition to existing `.kartex`
- [ ] **DECKU-02**: Media files from the zip's `media/` folder are extracted, validated (magic bytes), and stored
- [ ] **DECKU-03**: Media references in updated card content are rewritten to new UUID filenames
- [ ] **DECKU-04**: SM-2 progress for matched cards is untouched by the zip update

### SEDIT — Quick-Edit in Study Mode

- [ ] **SEDIT-01**: Study cards show a 3-dot overflow menu when the current user has owner or EDIT permission on that card's deck
- [ ] **SEDIT-02**: Menu option "Edit this card" opens the card editor inline (CardEditorModal, session continues after save)
- [ ] **SEDIT-03**: Menu option "Jump to deck" navigates to the deck detail page
- [ ] **SEDIT-04**: Menu is hidden (not disabled) for users without edit permission

---

## Future Requirements (deferred)

- **Email verification flow** — confirm ownership of email address after registration; deferred in favour of invite-trust model for small groups
- **Self-service email update** — user changes their own email (requires re-verification sub-flow); admin update of user email is sufficient for v1.4
- **Force-logout all sessions for a user without reset** — admin security incident tool; adjacent to admin reset, deferred
- **Return-to-study context after card edit navigation** — store session in sessionStorage for back-button restoration; deferred (inline CardEditorModal achieves same UX)
- **ABC audio playback** — abcjs WebAudio synthesis; significant complexity + AudioContext permission; deferred to v2
- **Orphaned media cleanup on deck update** — when a card's media ref changes, old file on disk goes orphaned; background cleanup endpoint deferred
- **Resend invitation** — admin re-triggers an invite email, invalidating the old token and issuing a new one; post-v1.4

## Out of Scope

- **Open sign-up** — invite-only by design; no open registration even with email verification
- **OIDC / LDAP** — institutional auth not needed for 2-5 user self-hosted setup
- **Inline ABC editor in study mode** — abcjs interactive editor mode; cards are read-only during study
- **ABC audio playback** — abcjs audio synthesis adds ~400 KB, requires AudioContext permission; v2 feature
- **Delete confirmation "undo"** — relational cascade deletes are non-reversible without a backup; not offered
- **Soft-delete / anonymize user** — hard delete with confirmation is correct for 2-5 users
- **Orphaned media cleanup on user delete** — disk space not a concern for 2-5 users; accepted limitation per T-5-07
- **Deck reassignment on user delete** — admin option to reassign decks to another user rather than deleting; v2

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| EMAIL-01 | Phase 23 | Complete |
| EMAIL-02 | Phase 23 | Complete |
| ADMIN-01 | Phase 23 | Complete |
| ADMIN-02 | Phase 23 | Complete |
| ADMIN-03 | Phase 23 | Complete |
| ADMIN-04 | Phase 23 | Complete |
| ADMIN-05 | Phase 23 | Complete |
| EMAIL-03 | Phase 24 | Pending |
| EMAIL-04 | Phase 24 | Complete |
| EMAIL-05 | Phase 24 | Pending |
| EMAIL-06 | Phase 24 | Complete |
| EMAIL-07 | Phase 24 | Pending |
| EMAIL-08 | Phase 24 | Pending |
| RESET-01 | Phase 25 | Pending |
| RESET-02 | Phase 25 | Pending |
| RESET-03 | Phase 25 | Pending |
| RESET-04 | Phase 25 | Pending |
| RESET-05 | Phase 25 | Pending |
| RESET-06 | Phase 25 | Pending |
| RESET-07 | Phase 25 | Pending |
| RESET-08 | Phase 25 | Pending |
| ABC-01 | Phase 26 | Pending |
| ABC-02 | Phase 26 | Pending |
| ABC-03 | Phase 26 | Pending |
| DECKU-01 | Phase 27 | Pending |
| DECKU-02 | Phase 27 | Pending |
| DECKU-03 | Phase 27 | Pending |
| DECKU-04 | Phase 27 | Pending |
| SEDIT-01 | Phase 28 | Pending |
| SEDIT-02 | Phase 28 | Pending |
| SEDIT-03 | Phase 28 | Pending |
| SEDIT-04 | Phase 28 | Pending |

*Traceability updated 2026-06-21 after roadmap creation. 28/28 requirements mapped.*
