---
phase: 29-user-email-self-service
plan: 03
subsystem: ui
tags: [react-hook-form, zod, shadcn, i18n, react]

requires:
  - phase: 29-user-email-self-service (Plan 01)
    provides: UpdateEmailSchema/UpdateEmailInput (shared Zod schema), PATCH /api/auth/me email support
  - phase: 29-user-email-self-service (Plan 02)
    provides: AuthContext.User.email field, settings.*/admin.* i18n keys (en/de)
provides:
  - Email Card (first card) on SettingsPage.tsx with RHF + zodResolver form
  - Amber no-email Alert banner (role="alert") shown only when user.email is null
  - Non-optimistic email save flow (waits for server confirmation before touching AuthContext)
  - EMAIL-09/EMAIL-10 RTL test coverage in SettingsPage.test.tsx
affects: [29-04 (AdminPage Edit Email dialog — reuses the same error-code-to-UI mapping and RHF+Zod pattern)]

tech-stack:
  added: []
  patterns:
    - "Non-optimistic RHF submit for server-validated uniqueness fields (contrast handleModeChange's optimistic pattern)"
    - "Custom Resolver<T> wrapper around zodResolver to localize a single field's format-error message"
    - "noValidate on forms using type=\"email\" + Zod validation, so native HTML5 constraint validation never pre-empts the Zod/FormMessage UX"

key-files:
  created: []
  modified:
    - apps/frontend/src/pages/SettingsPage.tsx
    - apps/frontend/src/pages/__tests__/SettingsPage.test.tsx

key-decisions:
  - "Wrapped zodResolver in a custom Resolver<UpdateEmailInput> function to override the email field's error message with the localized settings.emailInvalid copy, since the shared UpdateEmailSchema's built-in Zod message is a fixed English string not routed through i18next"
  - "Added noValidate to the email <form> — discovered during test-writing that native browser/jsdom constraint validation for type=\"email\" silently blocks submission (and therefore our Zod-driven inline error) before React Hook Form's resolver ever runs"

patterns-established:
  - "Email Card + no-email Alert pattern in SettingsPage.tsx now serves as the direct analog for Plan 29-04's AdminPage Edit Email Dialog (same RHF+Zod+shadcn Form, same error-code-to-UI mapping, same non-optimistic submit shape)"

requirements-completed: [EMAIL-09, EMAIL-10]

coverage:
  - id: D1
    description: "Email Card is the first card on SettingsPage with an input pre-filled with the current email and a Save button"
    requirement: EMAIL-09
    verification:
      - kind: unit
        ref: "apps/frontend/src/pages/__tests__/SettingsPage.test.tsx#EMAIL-09a: valid email save calls PATCH, setUser, and success toast"
        status: pass
    human_judgment: false
  - id: D2
    description: "Amber no-email warning renders above the cards only when user.email is null, and disappears once a valid email is saved"
    requirement: EMAIL-10
    verification:
      - kind: unit
        ref: "apps/frontend/src/pages/__tests__/SettingsPage.test.tsx#EMAIL-10a: renders no-email alert when user.email is null"
        status: pass
      - kind: unit
        ref: "apps/frontend/src/pages/__tests__/SettingsPage.test.tsx#EMAIL-10b: does not render no-email alert when user.email is set"
        status: pass
    human_judgment: false
  - id: D3
    description: "Submitting a duplicate email shows an inline 'already in use' message under the input (no toast for that case), and setUser/toast.success are not called"
    requirement: EMAIL-09
    verification:
      - kind: unit
        ref: "apps/frontend/src/pages/__tests__/SettingsPage.test.tsx#EMAIL-09b: EMAIL_TAKEN conflict shows inline \"already in use\" message"
        status: pass
    human_judgment: false
  - id: D4
    description: "An invalid email format is blocked inline by zodResolver (localized settings.emailInvalid message) before any request is sent"
    requirement: EMAIL-09
    verification:
      - kind: unit
        ref: "apps/frontend/src/pages/__tests__/SettingsPage.test.tsx#EMAIL-09c: invalid email format shows inline error without calling the API"
        status: pass
    human_judgment: false
  - id: D5
    description: "A successful save updates AuthContext user.email non-optimistically (only after the response resolves) and shows a success toast"
    requirement: EMAIL-09
    verification:
      - kind: unit
        ref: "apps/frontend/src/pages/__tests__/SettingsPage.test.tsx#EMAIL-09a: valid email save calls PATCH, setUser, and success toast"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-07-02
status: complete
---

# Phase 29 Plan 03: Settings Email Card + No-Email Alert Summary

**New first Email Card on SettingsPage with a non-optimistic RHF + zodResolver form, plus an amber no-email Alert banner — the primary user-facing surface for EMAIL-09/EMAIL-10.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-07-02T16:50:00Z
- **Completed:** 2026-07-02T17:10:27Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added the Email Card (first card, above Study Mode) to `SettingsPage.tsx` with a `useForm<UpdateEmailInput>` + `zodResolver(UpdateEmailSchema)` form, mirroring the `ForgotPasswordPage.tsx` RHF+Zod+shadcn Form pattern
- Implemented a non-optimistic `onEmailSubmit` handler: waits for `api.patch('/api/auth/me', values)` to resolve before touching `AuthContext` — a 409 `EMAIL_TAKEN` response maps to `form.setError('email', ...)` (inline, no toast), any other failure shows `toast.error`, and success calls `setUser` + `toast.success`
- Added the amber, non-dismissible no-email `Alert` (`role="alert"`, `border-amber-200 bg-amber-50 text-amber-800`) that renders only when `user?.email == null`, placed at the top of the page above all cards
- Localized the invalid-format inline message: wrapped `zodResolver` in a custom `Resolver<UpdateEmailInput>` that rewrites the email field's error message to `t('settings.emailInvalid')` instead of the shared schema's hardcoded English default
- Extended `SettingsPage.test.tsx` with the `email` field on the `mockUser` fixture and 5 new RTL cases (EMAIL-10a/b for alert visibility, EMAIL-09a/b/c for valid save, EMAIL_TAKEN conflict, and invalid format)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the Email Card (RHF form) and no-email Alert banner to SettingsPage** - `53411de` (feat)
2. **Task 2: Add RTL test cases for the Email Card + no-email Alert to SettingsPage.test.tsx** - `bcc7555` (test) — includes the `noValidate` fix discovered while writing the invalid-format test (Rule 1)

**Plan metadata:** (this commit)

## Files Created/Modified

- `apps/frontend/src/pages/SettingsPage.tsx` - New Email Card + no-email Alert banner, non-optimistic email save, localized format-error resolver, `noValidate` on the email form
- `apps/frontend/src/pages/__tests__/SettingsPage.test.tsx` - `email` field added to the `mockUser` fixture; 5 new EMAIL-09/EMAIL-10 RTL cases

## Decisions Made

- Wrapped `zodResolver(UpdateEmailSchema)` in a custom `Resolver<UpdateEmailInput>` function that overrides `result.errors.email.message` with `t('settings.emailInvalid')` — the shared schema's Zod message ("Valid email address required.") is a fixed English string not routed through i18next, and the plan required the localized copy to render inline.
- Added `noValidate` to the email `<form>` element (see Deviations below).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Native `type="email"` constraint validation silently blocked submission of invalid input**
- **Found during:** Task 2 (writing the EMAIL-09c invalid-format RTL test)
- **Issue:** With `<Input type="email">` and no `noValidate` on the `<form>`, clicking Save with a syntactically invalid value (e.g. `notanemail`) triggers the browser's/jsdom's native HTML5 constraint validation, which suppresses the `submit` event entirely — React Hook Form's `handleSubmit` (and therefore the Zod resolver and `FormMessage`) never ran. This is a real production bug: in an actual browser, users would see the browser's native validation tooltip instead of the app's own `settings.emailInvalid` message, contradicting the plan's explicit requirement that "the inline message renders the settings.emailInvalid copy rather than Zod's raw English default."
- **Fix:** Added `noValidate` to the email `<form>` element so native constraint validation is disabled and the Zod-driven `FormMessage` (via `zodResolver` + the custom resolver wrapper) is the sole validation UX, matching the plan's acceptance criteria.
- **Files modified:** `apps/frontend/src/pages/SettingsPage.tsx`
- **Verification:** EMAIL-09c RTL test (`invalid email format shows inline error without calling the API`) now passes; full `SettingsPage` suite (10/10) and full frontend suite (148/148) green.
- **Committed in:** `bcc7555` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary for the plan's explicit acceptance criterion (localized inline invalid-format message must actually render, in tests and in real browsers). No scope creep — scoped to the single form this plan introduced; `ForgotPasswordPage.tsx` and other pre-existing forms with the same latent issue were left untouched (out of scope for this plan).

## Issues Encountered

- Diagnosing the EMAIL-09c test failure required isolating whether the issue was in the custom resolver, the shadcn `Form`/`FormControl` (Radix `Slot`) wiring, or native browser validation. Confirmed via a minimal repro that `fireEvent.submit(form)` bypassed the failure while `fireEvent.click(submitButton)` did not — the classic signature of native HTML5 constraint validation intercepting the click's default action on an invalid `type="email"` field. Resolved by adding `noValidate` (see Deviations).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 29-04 (AdminPage Edit Email Dialog) can now follow the exact same RHF+Zod+shadcn Form pattern, the same `EMAIL_TAKEN`-to-inline-error mapping, and should also add `noValidate` to its own email form to avoid the same native-validation pitfall.
- `UpdateEmailSchema`/`UpdateEmailInput` and the settings.*/admin.* i18n keys are proven working end-to-end on the Settings surface; no blockers for Plan 29-04.

---
*Phase: 29-user-email-self-service*
*Completed: 2026-07-02*
