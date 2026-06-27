# Roadmap: Kartex

## Milestones

- ✅ **v1.0 MVP** — Phases 1–6 (shipped 2026-05-30)
- ✅ **v1.1 Study Experience & Polish** — Phases 7–9 (shipped 2026-06-01)
- ✅ **v1.2 Study Control & PWA** — Phases 10–13 (shipped 2026-06-04) — [archive](milestones/v1.2-ROADMAP.md)
- ✅ **v1.3.0 Stats & Import Update** — Phases 14–16 (shipped 2026-06-11) — [archive](milestones/v1.3.0-ROADMAP.md)
- ✅ **v1.3.1 Bug Fixes & Mobile Polish** — Phases 17–18 (shipped 2026-06-12) — [archive](milestones/v1.3.1-ROADMAP.md)
- ✅ **v1.3.2 UX Polish & Changelog** — Phases 19–22 (shipped 2026-06-15) — [archive](milestones/v1.3.2-ROADMAP.md)
- 🔄 **v1.4.0 Auth Overhaul & Study UX** — Phases 23–28 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–6) — SHIPPED 2026-05-30</summary>

- [x] Phase 1: Foundation & Auth (3/3 plans) — completed 2026-05-26
- [x] Phase 2: Deck & Card Management (3/3 plans) — completed 2026-05-26
- [x] Phase 3: Rich Content Rendering (3/3 plans) — completed 2026-05-27
- [x] Phase 4: Study Loops (3/3 plans) — completed 2026-05-28
- [x] Phase 5: Import Pipeline (3/3 plans) — completed 2026-05-28
- [x] Phase 6: Sharing, Explore & Production Deploy (3/3 plans) — completed 2026-05-29

Full details: [.planning/milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

<details>
<summary>✅ v1.1 Study Experience & Polish (Phases 7–9) — SHIPPED 2026-06-01</summary>

- [x] Phase 7: App Shell (1/1 plans) — completed 2026-05-31
- [x] Phase 8: Study UX (4/4 plans — 3 original + 1 UAT gap closure) — completed 2026-06-01
- [x] Phase 9: Internationalization (3/3 plans) — completed 2026-06-01

Full details: [.planning/milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)

</details>

<details>
<summary>✅ v1.2 Study Control & PWA (Phases 10–13) — SHIPPED 2026-06-04</summary>

- [x] Phase 10: Active Deck Rotation (5/5 plans) — completed 2026-06-02
- [x] Phase 11: SM-2 Preset Modes (4/4 plans) — completed 2026-06-03
- [x] Phase 12: PWA Shell (4/4 plans) — completed 2026-06-03
- [x] Phase 13: Documentation (3/3 plans) — completed 2026-06-04

Full details: [.planning/milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md)

</details>

<details>
<summary>✅ v1.3.0 Stats & Import Update (Phases 14–16) — SHIPPED 2026-06-11</summary>

- [x] Phase 14: Schema Foundation (3/3 plans) — completed 2026-06-09
- [x] Phase 15: Stats Feature (3/3 plans) — completed 2026-06-10
- [x] Phase 16: Import Update Feature (4/4 plans) — completed 2026-06-11

Full details: [.planning/milestones/v1.3.0-ROADMAP.md](milestones/v1.3.0-ROADMAP.md)

</details>

<details>
<summary>✅ v1.3.1 Bug Fixes & Mobile Polish (Phases 17–18) — SHIPPED 2026-06-12</summary>

- [x] Phase 17: Mobile UI Polish (2/2 plans) — completed 2026-06-11
- [x] Phase 18: Library Deck Toggle (2/2 plans) — completed 2026-06-12

Full details: [.planning/milestones/v1.3.1-ROADMAP.md](milestones/v1.3.1-ROADMAP.md)

</details>

<details>
<summary>✅ v1.3.2 UX Polish & Changelog (Phases 19–22) — SHIPPED 2026-06-15</summary>

- [x] Phase 19: Library Remove Action (1/1 plans) — completed 2026-06-13
- [x] Phase 20: Logo & PWA Icons (1/1 plans) — completed 2026-06-14
- [x] Phase 21: Changelog (1/1 plans) — completed 2026-06-14
- [x] Phase 22: Study Session UX (2/2 plans) — completed 2026-06-15

Full details: [.planning/milestones/v1.3.2-ROADMAP.md](milestones/v1.3.2-ROADMAP.md)

</details>

### v1.4.0 Auth Overhaul & Study UX (Phases 23–28)

- [x] **Phase 23: Auth Foundation** - User.email column, cascade FK migrations, SMTP mailer, admin user delete (completed 2026-06-23)
- [x] **Phase 24: Email Invitations** - InviteToken model, admin invite UI, token-based registration page (completed 2026-06-27)
- [ ] **Phase 25: Password Reset** - PasswordResetToken model, forgot/reset pages, admin-triggered reset
- [ ] **Phase 26: ABC Notation** - abcjs integration, AbcBlock renderer component, responsive SVG in cards
- [ ] **Phase 27: Zip Deck Update** - Shared importMedia helper, deck update path accepts .kartex.zip
- [ ] **Phase 28: Quick-Edit in Study** - 3-dot study card menu for owners/editors, inline card edit, jump-to-deck

---

## Phase Details

### Phase 23: Auth Foundation

**Goal**: The database and backend infrastructure are ready to support email-based auth and safe user deletion
**Depends on**: Phase 22 (last shipped phase)
**Requirements**: EMAIL-01, EMAIL-02, ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05
**Success Criteria** (what must be TRUE):

  1. Existing users are unaffected by the migration — their accounts have email = NULL and no data is lost
  2. Admin sees each user's email address in the user list (or blank if unset)
  3. Admin can permanently delete a user by typing their username in a confirmation dialog that lists decks, cards, progress, and review logs to be deleted
  4. Admin cannot delete their own account or the last admin account — both cases show a clear error
  5. The app can send SMTP email (mailer singleton responds to configuration; verified by a test send or log)

**Plans**: 4/4 plans complete
**Wave 1**

- [x] 23-01-PLAN.md — User.email schema migration + shared UserSchema + Wave 0 test scaffolds (EMAIL-01)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 23-02-PLAN.md — nodemailer singleton + mailer test endpoint + GET /users email + docker-compose env (EMAIL-02, ADMIN-05)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 23-03-PLAN.md — DELETE /users/:id with self-delete/last-admin guards + ordered cascade + media cleanup (ADMIN-01, ADMIN-04)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 23-04-PLAN.md — AdminPage email column, two-step delete dialog, MailerSection button, i18n (ADMIN-01/02/03/04/05, EMAIL-02)

**UI hint**: yes

### Phase 24: Email Invitations

**Goal**: Admin can invite new users via email and invitees can register through the one-time link
**Depends on**: Phase 23
**Requirements**: EMAIL-03, EMAIL-04, EMAIL-05, EMAIL-06, EMAIL-07, EMAIL-08
**Success Criteria** (what must be TRUE):

  1. Admin enters an email address in the admin panel and triggers an invitation; the invitee receives an email with a unique link
  2. Clicking the invite link opens a registration page with the email pre-filled and read-only; user sets username and password to complete registration
  3. After registration the invite link is consumed — a second click shows a clear "already used" error page (not a crash or blank page)
  4. Admin can view all pending (unused, non-expired) invitations in the admin panel
  5. Admin can revoke a pending invitation; revoked tokens are immediately invalid

**Plans**: 5/5 plans complete
**Wave 1**

- [x] 24-01-PLAN.md — Schema + migration + shared contract (InviteToken model, drop InviteCode, RegisterSchema token field) [Wave 1]
- [x] 24-02-PLAN.md — i18n keys for invite/admin copy in en.json + de.json [Wave 1]

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 24-03-PLAN.md — Backend routes (public validate, admin create/list/revoke, TOCTOU-safe register) [Wave 2]
- [x] 24-04-PLAN.md — InviteRegisterPage public page + /invite/:token route, remove /register [Wave 2]
- [x] 24-05-PLAN.md — Admin InviteTokensSection (send/list/revoke UI) [Wave 2]

**UI hint**: yes

### Phase 25: Password Reset

**Goal**: Users can recover their account via email and admins can trigger the same flow for any user
**Depends on**: Phase 23
**Requirements**: RESET-01, RESET-02, RESET-03, RESET-04, RESET-05, RESET-06, RESET-07, RESET-08
**Success Criteria** (what must be TRUE):

  1. Login page has a "Forgot password?" link that navigates to the forgot-password page
  2. User submits their email and always sees a success message regardless of whether the email exists (no enumeration)
  3. Clicking the reset link opens a new-password page; user sets a new password and all existing sessions are invalidated
  4. Expired or already-used reset links show a human-readable error page (not a crash or blank page)
  5. Admin can send a password reset email to any user from the admin panel; the action shows a clear error if the target user has no email address

**Plans**: TBD
**UI hint**: yes

### Phase 26: ABC Notation

**Goal**: Card content containing `#abc` fenced blocks renders as inline sheet music
**Depends on**: Phase 22 (no auth dependency — independent)
**Requirements**: ABC-01, ABC-02, ABC-03
**Success Criteria** (what must be TRUE):

  1. A card with a valid `#abc` fenced block displays rendered SVG sheet music inline when the card is viewed
  2. A card with invalid ABC notation shows an error fallback message instead of a blank space or crash
  3. The rendered SVG scales to the card's width on both mobile and desktop viewports

**Plans**: TBD
**UI hint**: yes

### Phase 27: Zip Deck Update

**Goal**: Deck owners can update a deck in place by uploading a `.kartex.zip` bundle that includes media files
**Depends on**: Phase 16 (import update feature)
**Requirements**: DECKU-01, DECKU-02, DECKU-03, DECKU-04
**Success Criteria** (what must be TRUE):

  1. The deck update file picker accepts both `.kartex` and `.kartex.zip` files
  2. Uploading a zip bundle correctly extracts, validates (magic bytes), and stores the media files from the `media/` folder
  3. Card content in the updated deck references the newly stored media UUIDs (not the original filenames from the zip)
  4. SM-2 progress for cards matched by kartexId is completely untouched after a zip update

**Plans**: TBD

### Phase 28: Quick-Edit in Study

**Goal**: Users with edit permission can edit a card or navigate to its deck without leaving the study session
**Depends on**: Phase 22
**Requirements**: SEDIT-01, SEDIT-02, SEDIT-03, SEDIT-04
**Success Criteria** (what must be TRUE):

  1. A 3-dot overflow menu appears on study cards only when the current user has owner or EDIT permission on that card's deck
  2. Selecting "Edit this card" opens the card editor inline; after saving the session continues from where it left off
  3. Selecting "Jump to deck" navigates to the deck detail page
  4. The menu is completely absent (not just disabled) for users without edit permission

**Plans**: TBD
**UI hint**: yes

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Auth | v1.0 | 3/3 | Complete | 2026-05-26 |
| 2. Deck & Card Management | v1.0 | 3/3 | Complete | 2026-05-26 |
| 3. Rich Content Rendering | v1.0 | 3/3 | Complete | 2026-05-27 |
| 4. Study Loops | v1.0 | 3/3 | Complete | 2026-05-28 |
| 5. Import Pipeline | v1.0 | 3/3 | Complete | 2026-05-28 |
| 6. Sharing, Explore & Production Deploy | v1.0 | 3/3 | Complete | 2026-05-29 |
| 7. App Shell | v1.1 | 1/1 | Complete | 2026-05-31 |
| 8. Study UX | v1.1 | 4/4 | Complete | 2026-06-01 |
| 9. Internationalization | v1.1 | 3/3 | Complete | 2026-06-01 |
| 10. Active Deck Rotation | v1.2 | 5/5 | Complete | 2026-06-02 |
| 11. SM-2 Preset Modes | v1.2 | 4/4 | Complete | 2026-06-03 |
| 12. PWA Shell | v1.2 | 4/4 | Complete | 2026-06-03 |
| 13. Documentation | v1.2 | 3/3 | Complete | 2026-06-04 |
| 14. Schema Foundation | v1.3.0 | 3/3 | Complete | 2026-06-09 |
| 15. Stats Feature | v1.3.0 | 3/3 | Complete | 2026-06-10 |
| 16. Import Update Feature | v1.3.0 | 4/4 | Complete | 2026-06-10 |
| 17. Mobile UI Polish | v1.3.1 | 2/2 | Complete | 2026-06-11 |
| 18. Library Deck Toggle | v1.3.1 | 2/2 | Complete | 2026-06-12 |
| 19. Library Remove Action | v1.3.2 | 1/1 | Complete   | 2026-06-13 |
| 20. Logo & PWA Icons | v1.3.2 | 1/1 | Complete   | 2026-06-14 |
| 21. Changelog | v1.3.2 | 1/1 | Complete   | 2026-06-14 |
| 22. Study Session UX | v1.3.2 | 2/2 | Complete | 2026-06-15 |
| 23. Auth Foundation | v1.4.0 | 4/4 | Complete   | 2026-06-23 |
| 24. Email Invitations | v1.4.0 | 5/5 | Complete   | 2026-06-27 |
| 25. Password Reset | v1.4.0 | 0/? | Not started | - |
| 26. ABC Notation | v1.4.0 | 0/? | Not started | - |
| 27. Zip Deck Update | v1.4.0 | 0/? | Not started | - |
| 28. Quick-Edit in Study | v1.4.0 | 0/? | Not started | - |
