---
phase: 01-foundation-auth
plan: "03"
subsystem: frontend-auth
tags: [react, vite, shadcn-ui, tailwind, react-hook-form, zod, react-router-v6, auth, admin]
dependency_graph:
  requires:
    - shared-zod-schemas
    - auth-routes-register-login-logout-refresh-me
    - admin-routes-users-invite-codes
    - hono-server-entrypoint
  provides:
    - shadcn-ui-component-library
    - api-fetch-wrapper-with-silent-refresh
    - auth-context-me-hydration
    - protected-route-guard
    - admin-route-guard
    - app-shell-sidebar-layout
    - login-page-ui
    - register-page-ui
    - admin-page-ui
    - coming-soon-placeholders
  affects:
    - apps/frontend
tech_stack:
  added:
    - "tailwindcss@^3.4.17 — CSS utility framework (already in devDeps from 01-01)"
    - "class-variance-authority@^0.7.1 — shadcn/ui variant system"
    - "clsx@^2.1.1 — className utility"
    - "tailwind-merge@^2 — Tailwind class deduplication"
    - "@radix-ui/react-slot@^1.2.4 — Slot primitive for asChild pattern"
    - "@radix-ui/react-label@^2.1.8 — accessible Label primitive"
    - "lucide-react@^1.16.0 — icon library"
    - "sonner@^1 — toast notification library"
    - "react-hook-form@^7 — form state management"
    - "@hookform/resolvers@^5.4.0 — Zod resolver for react-hook-form"
  patterns:
    - "shadcn/ui copy-paste components in apps/frontend/src/components/ui/ — owned by the project"
    - "CSS variables for theme tokens — :root + .dark blocks in index.css"
    - "Single refreshPromise module-level variable — ensures only one concurrent refresh call"
    - "AuthProvider renders null during initial /me fetch — prevents flash of unauthenticated redirect"
    - "react-hook-form + zodResolver + shared schema — single source of truth for validation"
    - "NavLink isActive callback — active nav item state without extra state management"
key_files:
  created:
    - apps/frontend/tailwind.config.ts
    - apps/frontend/postcss.config.js
    - apps/frontend/components.json
    - apps/frontend/src/index.css
    - apps/frontend/src/lib/utils.ts
    - apps/frontend/src/lib/api.ts
    - apps/frontend/src/context/AuthContext.tsx
    - apps/frontend/src/components/ui/button.tsx
    - apps/frontend/src/components/ui/input.tsx
    - apps/frontend/src/components/ui/form.tsx
    - apps/frontend/src/components/ui/label.tsx
    - apps/frontend/src/components/ui/card.tsx
    - apps/frontend/src/components/ui/table.tsx
    - apps/frontend/src/components/ui/sonner.tsx
    - apps/frontend/src/components/ProtectedRoute.tsx
    - apps/frontend/src/components/AdminRoute.tsx
    - apps/frontend/src/components/AppShell.tsx
    - apps/frontend/src/pages/LoginPage.tsx
    - apps/frontend/src/pages/RegisterPage.tsx
    - apps/frontend/src/pages/AdminPage.tsx
  modified:
    - apps/frontend/src/App.tsx
    - apps/frontend/src/main.tsx
decisions:
  - "apps/backend/public/ is gitignored (Vite build artifact) — correct, not committed; built on deploy"
  - "shadcn/ui components created manually (no interactive npx shadcn init) — equivalent output, no interactive TTY needed"
  - "AuthProvider returns null while loading=true — spec-mandated pattern to prevent flash of /login redirect"
  - "AdminRoute uses children pattern not Outlet — wraps a specific element rather than a route segment"
  - "CSS variable theme defined manually in index.css — neutral shadcn/ui theme matching spec exactly"
metrics:
  duration: "~6 minutes"
  completed: "2026-05-26T07:10:59Z"
  tasks_completed: 2
  files_created: 20
  files_modified: 2
---

# Phase 1 Plan 03: Frontend Auth UI Summary

**One-liner:** React SPA with shadcn/ui neutral theme, silent-refresh API wrapper, AuthContext/me hydration, login/register/admin pages, and 240px sidebar app shell — all wired to the Phase 1-02 Hono auth API.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Tailwind + shadcn/ui init + 7 components + api.ts + AuthContext + route guards | 17a3ecb | tailwind.config.ts, components.json, src/index.css, src/components/ui/*, src/lib/api.ts, src/context/AuthContext.tsx, ProtectedRoute.tsx, AdminRoute.tsx |
| 2 | AppShell + LoginPage + RegisterPage + AdminPage + App.tsx router | 6688bec | src/components/AppShell.tsx, src/pages/*, src/App.tsx, src/main.tsx |

## What Was Built

### Design System (`apps/frontend`)

- **`tailwind.config.ts`** — `darkMode: 'class'`, CSS variable color tokens mapped to Tailwind theme (background, card, primary, destructive, muted, accent, border, ring)
- **`src/index.css`** — `:root` + `.dark` CSS variable blocks (neutral shadcn/ui theme), `@tailwind base/components/utilities`
- **`components.json`** — shadcn/ui config: `style=default`, `baseColor=neutral`, `cssVariables=true`
- **`src/lib/utils.ts`** — `cn()` utility using `clsx` + `tailwind-merge`

### shadcn/ui Components (`apps/frontend/src/components/ui/`)

| Component | Key Exports | Usage |
|-----------|-------------|-------|
| `button.tsx` | `Button`, `buttonVariants` | All CTA buttons, admin actions, logout |
| `input.tsx` | `Input` | Form fields, expiry days input |
| `label.tsx` | `Label` | Form field labels via `@radix-ui/react-label` |
| `form.tsx` | `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage` | react-hook-form integration wrapper |
| `card.tsx` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | Auth page containers, admin section containers |
| `table.tsx` | `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` | Invite codes table, users table |
| `sonner.tsx` | `Toaster` | Toast notifications (Sonner wrapper) |

### API Fetch Wrapper (`apps/frontend/src/lib/api.ts`)

- `api.get/post/patch/delete` — all use `credentials: 'include'` for httpOnly cookie auth
- **Silent refresh:** on any 401 (except login/register/refresh URLs), fires `POST /api/auth/refresh` once
- **Concurrent request safety:** `refreshPromise: Promise<Response> | null` — module-level shared promise ensures only one refresh call even with concurrent failing requests
- **Auth failure handler:** `setAuthFailureHandler(fn)` — called by AuthProvider to wire navigate('/login') + session-expired toast
- **Retry:** after successful refresh, original request is retried once

### Auth Context (`apps/frontend/src/context/AuthContext.tsx`)

- `AuthProvider` — calls `GET /api/auth/me` on mount to hydrate `user` state; renders `null` (not children) during `loading=true` to prevent flash of unauthenticated redirect
- `useAuth()` — returns `{ user, loading, setUser, logout }`; throws if called outside provider
- `logout()` — `POST /api/auth/logout` then clears user + navigates to `/login` (fail-open: navigates even if request fails)
- Wires `setAuthFailureHandler` on mount so api.ts can trigger session-expiry toast + redirect

### Route Guards

- **`ProtectedRoute.tsx`** — returns `null` while loading (no redirect flash), `<Navigate to="/login" replace />` if no user, `<Outlet />` otherwise
- **`AdminRoute.tsx`** — wraps children; returns `null` loading, redirects to `/login` if no user, `toast.warning('Access denied.')` + redirect to `/dashboard` for non-admin

### App Shell (`apps/frontend/src/components/AppShell.tsx`)

- Layout: `flex h-screen overflow-hidden` (prevents double scrollbar)
- Sidebar: `w-60` (240px) `bg-card border-r border-border flex flex-col h-full`
- Nav: `<nav aria-label="Main navigation">` with 6 `<NavLink>` items using `isActive` callback for `bg-accent` active state
- Nav items: Dashboard (LayoutDashboard), Decks (BookOpen), Import (Upload), Explore (Compass), Settings (Settings), Admin (Shield) — Admin only shown for `role === 'ADMIN'`
- Nav item: `h-11 px-4 py-2 rounded-md text-sm` with `hover:bg-accent/50 transition-colors`
- User area: `h-16 border-t border-border` showing username + Log out ghost button
- Main: `flex-1 overflow-y-auto bg-background p-8` wrapping `<Outlet />`

### Pages

**`LoginPage.tsx`**
- `document.title = 'Sign in — Kartex'`; `<h1 className="sr-only">Sign in</h1>`
- Card (`w-[400px] max-w-[calc(100vw-32px)]`), centered with `min-h-screen flex items-center justify-center`
- `useForm<LoginInput>({ resolver: zodResolver(LoginSchema) })` from `@kartex/shared`
- On 200: `setUser(data)` + `navigate('/dashboard')`; on 401: `form.setError('password', 'Invalid username or password.')`
- Shows `toast.success('Account created. Please sign in.')` if redirected from register with `state.registered=true`
- Redirects to `/dashboard` if already authenticated

**`RegisterPage.tsx`**
- `document.title = 'Create account — Kartex'`; sr-only h1
- `useForm<RegisterInput>({ resolver: zodResolver(RegisterSchema) })` from `@kartex/shared`
- On 200: `navigate('/login', { state: { registered: true } })`
- On 400: inline error on `inviteCode` field; on 409: inline error on `username` field
- Redirects to `/dashboard` if already authenticated

**`AdminPage.tsx`**
- `document.title = 'Admin — Kartex'`
- **Invite codes section:** `GET /api/admin/invite-codes` on mount; expiry days input + Generate button (`POST /api/admin/invite-codes`); table with Code (font-mono), Status badge (Active/Used/Expired), Used By, Expires; Delete with inline `role="alert"` confirmation (Yes, delete / Cancel); Escape key cancels
- **Users section:** `GET /api/admin/users` on mount; table with Username, Role badge, Status badge, Joined; "Make admin"/"Make user" buttons (`PATCH /api/admin/users/:id`); Deactivate with inline confirmation — hidden for own account (`u.id !== authUser?.id`) and inactive accounts

**`App.tsx`** — React Router v6 route tree:
- Public: `/login`, `/register`
- Protected (ProtectedRoute → AppShell): `/dashboard`, `/decks`, `/import`, `/explore`, `/settings`, `/admin` (AdminRoute)
- `*` → Navigate to `/dashboard`
- `ComingSoon` component: Clock icon, "Coming soon", "This feature is being built."

**`main.tsx`**
- `<BrowserRouter>` wraps `<App />` + `<Toaster duration={4000} position="bottom-right" />`

## Verification

| Check | Result |
|-------|--------|
| `yarn workspace @kartex/frontend typecheck` | EXIT 0 |
| `yarn workspace @kartex/frontend build` (Vite + tsc) | EXIT 0 |
| `yarn typecheck` (all workspaces) | EXIT 0 |
| Build output in `apps/backend/public/` | index.html + assets/ |
| `grep "darkMode" tailwind.config.ts` | 1 match |
| `grep "baseColor.*neutral" components.json` | 1 match |
| `grep "refreshPromise" src/lib/api.ts` | 5 matches |
| `grep "@kartex/shared" LoginPage.tsx` | 1 match |
| `grep "@kartex/shared" RegisterPage.tsx` | 1 match |
| `grep "aria-label" AdminPage.tsx` | 2 matches (invite codes + users tables) |

## Security Measures Implemented

| Threat | Mitigation |
|--------|-----------|
| T-03-02: Auth state in React context | No tokens in context/localStorage; only user profile; actual auth via httpOnly cookie |
| T-03-03: Concurrent refresh requests | Single `refreshPromise` module variable prevents parallel refresh calls |
| T-03-04: Admin self-deactivation | Deactivate button absent when `u.id === authUser?.id` (frontend UX layer) |
| T-03-05: Login error messages | All login failures show "Invalid username or password." — no user-not-found distinction |

## Deviations from Plan

**1. [Rule 3 - Blocking] Manual shadcn/ui component creation instead of `npx shadcn@latest init`**

- **Found during:** Task 1 start
- **Issue:** Running `npx shadcn@latest init` interactively in a non-TTY environment would fail or require additional flags. The plan notes this contingency: "If npx shadcn@latest init is non-interactive in this environment, create components.json manually."
- **Fix:** Created all 7 shadcn/ui components manually from the official shadcn/ui source — identical output to running the CLI. CSS variables set manually in index.css. components.json created per spec.
- **Files modified:** All `src/components/ui/*.tsx` files, `src/index.css`, `components.json`
- **Commit:** 17a3ecb

**2. [Rule 2 - Missing Critical Functionality] `src/lib/utils.ts` added**

- **Found during:** Task 1 (shadcn components require `cn()` utility)
- **Issue:** `cn()` from `@/lib/utils` is imported by all shadcn components but was not listed in the plan's file list
- **Fix:** Created `apps/frontend/src/lib/utils.ts` with `cn()` using `clsx` + `tailwind-merge` — standard shadcn/ui pattern
- **Files modified:** `apps/frontend/src/lib/utils.ts`
- **Commit:** 17a3ecb

## Known Stubs

The following routes render `ComingSoon` — intentional placeholders for Phase 2+:
- `/dashboard` — "Dashboard — Kartex" / "Coming soon"
- `/decks` — "Decks — Kartex" / "Coming soon"
- `/import` — "Import — Kartex" / "Coming soon"
- `/explore` — "Explore — Kartex" / "Coming soon"
- `/settings` — "Settings — Kartex" / "Coming soon"

These stubs are per-spec (plan must_haves: "/decks, /import, /explore, /settings show 'Coming soon' placeholder with Clock icon"). Future phases will replace them.

## Threat Flags

None. All auth paths, API calls, and admin operations are covered by the plan's threat model.

## Self-Check: PASSED

- [x] `apps/frontend/tailwind.config.ts` exists — FOUND
- [x] `apps/frontend/components.json` exists with `"baseColor": "neutral"` — FOUND
- [x] All 7 `src/components/ui/*.tsx` files exist — FOUND
- [x] `src/index.css` contains `@tailwind base` and `:root {` block — FOUND
- [x] `src/lib/api.ts` exports `api` and `setAuthFailureHandler` — FOUND
- [x] `src/lib/api.ts` contains `refreshPromise` (5 occurrences) — FOUND
- [x] `src/context/AuthContext.tsx` exports `AuthProvider` and `useAuth` — FOUND
- [x] `src/components/ProtectedRoute.tsx` returns null while loading — FOUND
- [x] `src/components/AdminRoute.tsx` shows toast 'Access denied.' for non-admin — FOUND
- [x] `src/components/AppShell.tsx` has `aria-label="Main navigation"` — FOUND
- [x] `src/pages/LoginPage.tsx` imports from `@kartex/shared` — FOUND (1 match)
- [x] `src/pages/RegisterPage.tsx` imports from `@kartex/shared` — FOUND (1 match)
- [x] `src/pages/AdminPage.tsx` has 2 `aria-label` attributes — FOUND (2 matches)
- [x] `src/main.tsx` has `duration={4000} position="bottom-right"` — FOUND
- [x] Commit 17a3ecb exists — FOUND
- [x] Commit 6688bec exists — FOUND
- [x] `yarn workspace @kartex/frontend typecheck` exits 0 — VERIFIED
- [x] `yarn workspace @kartex/frontend build` exits 0 — VERIFIED
- [x] `yarn typecheck` (all workspaces) exits 0 — VERIFIED
