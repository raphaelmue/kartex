---
phase: quick-260705-hcf
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/frontend/package.json
  - apps/backend/package.json
  - packages/shared/package.json
  - CHANGELOG.md
autonomous: true
requirements: [EMAIL-01, EMAIL-02, EMAIL-03, EMAIL-04, EMAIL-05, EMAIL-06, EMAIL-07, EMAIL-08, EMAIL-09, EMAIL-10, EMAIL-11, RESET-01, RESET-02, RESET-03, RESET-04, RESET-05, RESET-06, RESET-07, RESET-08, ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ABC-01, ABC-02, ABC-03, DECKU-01, DECKU-02, DECKU-03, DECKU-04, SEDIT-01, SEDIT-02, SEDIT-03, SEDIT-04]

must_haves:
  truths:
    - "All three workspace package.json files declare version 1.4.0"
    - "CHANGELOG.md has a [v1.4.0] entry at the top, above [v1.3.3]"
    - "The [v1.4.0] entry covers all 8 phases and lists every v1.4.0 requirement ID"
  artifacts:
    - "apps/frontend/package.json"
    - "apps/backend/package.json"
    - "packages/shared/package.json"
    - "CHANGELOG.md"
  key_links:
    - "Requirement IDs in the changelog entry match the v1.4.0-REQUIREMENTS.md traceability set"
---

<objective>
Bump the three workspace package versions to 1.4.0 and document the v1.4.0 milestone release in CHANGELOG.md.

Purpose: Mark the shipped v1.4.0 milestone (Auth Overhaul & Study UX, Phases 23-30) with a matching version stamp and a user-facing changelog entry.
Output: Updated version fields in apps/frontend, apps/backend, packages/shared package.json files, and a new [v1.4.0] CHANGELOG.md entry.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CHANGELOG.md
@.planning/MILESTONES.md
@.planning/milestones/v1.4.0-REQUIREMENTS.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Bump workspace versions to 1.4.0</name>
  <files>apps/frontend/package.json, apps/backend/package.json, packages/shared/package.json</files>
  <action>In each of apps/frontend/package.json, apps/backend/package.json, and packages/shared/package.json, change the "version" field value from "1.3.3" to "1.4.0". Edit only the version string — do not touch any other field (name, scripts, dependencies, exports remain unchanged). Do NOT edit the root package.json — it has no version field and must be left alone.</action>
  <verify>
    <automated>grep -c '"version": "1.4.0"' apps/frontend/package.json apps/backend/package.json packages/shared/package.json</automated>
  </verify>
  <done>All three workspace package.json files show "version": "1.4.0"; no other fields changed; root package.json untouched.</done>
</task>

<task type="auto">
  <name>Task 2: Add [v1.4.0] CHANGELOG.md entry</name>
  <files>CHANGELOG.md</files>
  <action>Insert a new [v1.4.0] section into CHANGELOG.md immediately after the header block (after the horizontal rule on line 6, before the existing "## [v1.3.3]" entry). Follow the exact section structure of the existing [v1.3.2] entry: an H2 heading line, an italic milestone subtitle, then subsections in this order — Added, Changed, Fixed (include only subsections that have content; v1.4.0 is primarily Added), then Requirement IDs, Breaking Changes, and Migration Notes. Match the em-dash date format and Keep a Changelog conventions already in the file.

Heading line: "## [v1.4.0] — 2026-07-05".
Italic subtitle: "*Milestone: Auth Overhaul & Study UX (Phases 23–30)*".

Under Added, write user-facing bullets (present-tense, benefit-oriented, matching the voice of prior entries) covering all 8 phases of the milestone:
- Auth Foundation (Phase 23): Admins can permanently delete a user account from the admin panel with a two-step confirmation (modal plus typing the username); the confirmation dialog lists exactly what will be removed (decks, cards, progress, review logs); admins cannot delete their own account or the last remaining admin; the user list now shows each user's email address.
- Email Invitations (Phase 24): Registration is now email-invitation based — admins send a one-time invite link (valid 7 days) to a specific address; the recipient registers with the email pre-filled and read-only while choosing their own username and password; invite links are single-use and show a clear "already used" page on re-click; admins can view pending invitations and revoke them.
- Password Reset (Phase 25): The login page has a "Forgot password?" link; users request a reset by email and receive a reset link (valid 1 hour); the request always reports success so email existence is never revealed; a successful reset invalidates all existing sessions; expired or used links show a clear error page; admins can trigger a reset email for any user and get a clear error when that user has no email on file.
- ABC Notation (Phase 26): `#abc` fenced blocks in card content render inline as SVG sheet music; invalid notation shows an error fallback instead of crashing or leaving blank space; the rendered score scales responsively to card width on mobile and desktop.
- Zip Deck Update (Phase 27): Deck update now accepts `.kartex.zip` files in addition to `.kartex`; media in the zip's `media/` folder is extracted, validated by magic bytes, and stored; media references in updated cards are rewritten to new UUID filenames; SM-2 progress for matched cards is preserved through the update.
- Quick-Edit in Study (Phase 28): Study cards show a 3-dot overflow menu when the current user owns or has EDIT permission on the card's deck; "Edit this card" opens the editor inline and the session continues after saving; "Jump to deck" navigates to the deck detail page; the menu is hidden for users without edit permission.
- User Email Self-Service (Phase 29): Users can add or update their own email address from Settings; Settings shows a no-email warning explaining that password reset requires an email; admins can set or update any user's email from the admin panel.
- Study Timers & Stats (Phase 30): Study sessions now track thinking time per card and full session lifecycle; the dashboard surfaces average flip time and a Recent Sessions list.

Under Requirement IDs, list the full v1.4.0 set on the convention's single comma-separated line (matching how prior entries format this subsection): EMAIL-01, EMAIL-02, EMAIL-03, EMAIL-04, EMAIL-05, EMAIL-06, EMAIL-07, EMAIL-08, EMAIL-09, EMAIL-10, EMAIL-11, RESET-01, RESET-02, RESET-03, RESET-04, RESET-05, RESET-06, RESET-07, RESET-08, ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ABC-01, ABC-02, ABC-03, DECKU-01, DECKU-02, DECKU-03, DECKU-04, SEDIT-01, SEDIT-02, SEDIT-03, SEDIT-04.

Under Breaking Changes, write "None".

Under Migration Notes, follow the prior-entry format with a "**DB migrations:**" line and an "**Env var changes:**" line. For DB migrations, describe the append-only additions introduced this milestone: a nullable unique `User.email` column; a new `InviteToken` table; a new `PasswordResetToken` table (stores a SHA-256 token hash only); user cascade-delete foreign keys; a `ReviewLog.thinkingTimeMs` column; new `StudySession` and `StudySessionDeck` tables; and a unique index on `RefreshToken.tokenHash`. Note they are applied automatically on `docker compose up` (rebuild required since migrations are baked into the backend image). For Env var changes, list the newly required SMTP configuration and app URL: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM, and APP_URL — note email invitations and password reset are disabled until these are set (mailer soft-fails without them).

Close the section with a horizontal rule ("---") separating it from the [v1.3.3] entry, matching the spacing between existing entries.</action>
  <verify>
    <automated>grep -n '## \[v1.4.0\]' CHANGELOG.md && grep -c 'SEDIT-04' CHANGELOG.md</automated>
  </verify>
  <done>CHANGELOG.md has a [v1.4.0] entry positioned above [v1.3.3], with Added bullets for all 8 phases, the full requirement ID list, Breaking Changes = None, and Migration Notes covering the DB migrations and SMTP/APP_URL env vars. Existing entries below are unchanged.</done>
</task>

</tasks>

<verification>
- All three workspace package.json files declare "version": "1.4.0"; root package.json untouched.
- CHANGELOG.md [v1.4.0] entry sits directly under the header block, above [v1.3.3].
- Entry format matches the [v1.3.2] structure (Added / Requirement IDs / Breaking Changes / Migration Notes).
- All 8 phases represented in Added bullets; all listed requirement IDs present.
</verification>

<success_criteria>
- Version bumped to 1.4.0 in the three workspace packages.
- CHANGELOG.md documents the v1.4.0 milestone in Keep a Changelog format consistent with prior entries.
</success_criteria>

<output>
Create `.planning/quick/260705-hcf-bump-package-versions-to-1-4-0-for-the-v/260705-hcf-SUMMARY.md` when done
</output>
