# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Unity Hearts (repo name `faithmate-finder`) — a dating/matchmaking web app for Bahá'í singles. Production: https://unityhearts.app

This repo is **Lovable-managed** (https://lovable.dev/projects/3840e3e6-a70d-4065-8f44-32815c7246c0). Edits made in Lovable are auto-committed to this repo directly, which is why `main` carries terse machine-authored commits like "Changes" and "Work in progress". Assume `main` can move without a PR, and re-check `origin/main` before branching or rebasing.

## Commands

```sh
npm run dev          # Vite dev server on port 8080 (prestep generates sitemap via tsx)
npm run build        # Production build (prestep generates sitemap)
npm run lint         # ESLint
npx tsc --noEmit     # Typecheck (no npm script for this)

npx vitest           # Unit tests (jsdom); include pattern src/**/*.{test,spec}.{ts,tsx}
npx vitest run src/hooks/useCurrentUserProfile.test.ts   # single unit test file

npm test             # Playwright E2E (headless) — see E2E section, needs a live backend
npm run test:ui      # Playwright interactive
npx playwright test e2e/05-profiles.spec.ts              # single E2E spec
npx playwright test -g "profile filters"                 # single E2E test by name
```

`tsx` is a devDependency used by the `predev`/`prebuild` sitemap step. If `npm run dev`/`build` fails with `tsx: command not found`, `node_modules` is stale — run `npm install`.

## Environment and the Supabase project ref

`vite.config.ts` resolves Supabase config as `env.VITE_SUPABASE_URL || SUPABASE_URL_FALLBACK`, with **hardcoded fallbacks to project `nyhlwamvqjmaxpmqxzah`** so a deploy that fails to inject env still ships a working client. The committed fallback key is the publishable/anon key (RLS-protected), deliberately committed.

Consequence worth knowing before debugging anything backend-related: local `.env` and production can silently talk to *different* Supabase projects. Confirm which ref is actually in play rather than assuming — check `.env`, then `vite.config.ts` fallbacks, then the deployed bundle.

Trigger functions in `supabase/migrations/` **hardcode the project URL** for `/functions/v1/send-notification-email` calls (see `20260508000000_update-supabase-url-to-unity-hearts.sql`, `20260513000000_force-fix-notification-trigger-urls.sql`, `20260513193638_restore-email-delivery-in-triggers.sql`). A project-ref change requires a new migration rewriting those URLs, or notification emails fail silently — the DB `net.http_post` call just doesn't reach anything.

## Architecture

Vite + React + TypeScript + Tailwind + shadcn/ui, PWA via `vite-plugin-pwa`, i18next with 20 locales in `src/i18n/locales/` (includes RTL: `ar`, `fa`). Backend is entirely Supabase — Postgres + RLS, auth, and edge functions in `supabase/functions/` (`daily-room`, `send-notification-email`, `send-welcome-email`, `send-suspension-email`, `verify-pose`, plus the Stripe set). Video/voice calling is Daily.co via the `daily-room` function and `useDailyCall`.

Provider nesting in `src/App.tsx`, outermost first: `QueryClientProvider` → `CurrentUserProvider` → `SubscriptionProvider` → `TooltipProvider` → `BrowserRouter`. Auth-required routes are wrapped in `<ProtectedRoute>`; `/admin` uses `<ProtectedRoute requireAdmin>`.

### Auth timing is the recurring source of bugs

Several fixes in this codebase exist because state resolved to a premature falsy value and gated a user who should have had access. Preserve these patterns:

- `src/lib/safeAuth.ts` wraps Supabase auth calls in timeouts (`getSessionWithTimeout`, `getUserWithTimeout`, `withTimeout`). Use these rather than calling `supabase.auth.getSession()` directly — a hung call otherwise leaves the UI stuck on a loading state forever.
- `ProtectedRoute` deliberately does **not** gate on `useCurrentUser().user`. That context can briefly report `user=null, isLoading=false` right after sign-in while it re-fetches profile/admin/comp in parallel, bouncing a just-signed-in user to `/auth`. It uses a direct `getUserWithTimeout` session check instead (localStorage-backed, so instant).
- `CurrentUserContext` tracks a separate `isCompLoading` alongside `isLoading` so consumers never read a premature `isComped=false` while the comp lookup is still in flight.
- `client.ts` accesses `localStorage` through a `try`/`catch` helper — Safari with "Block All Cookies" throws `SecurityError` at module-init and crashes the whole bundle before React mounts.

### Payments are removed — there is no paywall

Stripe was rejected twice by the payment processor and has been **deleted**, not disabled. Apple/Google in-app purchases are the intended path, which will require a native wrapper (Capacitor or similar) — a PWA cannot do IAP on its own.

`SubscriptionProvider` is now a static shim: it exports a constant `FULL_ACCESS` (`subscribed: true, tier: 'premium'`) and `checkSubscription` / `createCheckout` / `openCustomerPortal` are all `noop`. There is no state, no effect, no network call. `useSubscription` returns full access even when called outside the provider.

Everything downstream (`useLikeLimits`, `useCallLimits`, `useSuperLikeLimits`, `ProfileCard` banners) derives from `subscribed`/`tier`, so every member resolves to unlimited-and-nothing-to-upgrade without knowing payments ever existed. Keep it that way — do not reintroduce gating in the consumers.

The four payment edge functions still exist as inert stubs so nothing 404s: `create-checkout` and `customer-portal` return **410 Gone**, `check-subscription` returns full access, `stripe-webhook` acknowledges and ignores. **None of them import Stripe.** `/subscription` is kept as a route so old links resolve, and renders a plain "You have full access — nothing to purchase" page.

Deliberately left in place: the `comped_users` table and `useCompStatus` (harmless now that everyone has access), the `SUBSCRIPTION_TIERS` definitions, and the `stripe_customer_id` / `stripe_subscription_id` columns in `types.ts` — those are generated from the DB schema, and the tables were not migrated.

One asymmetry to know: because everyone is `premium`, super-likes are capped at 5/day (`useSuperLikeLimits.ts`), while likes and calls are unlimited.

## E2E tests

Playwright, `testDir: ./e2e`, `workers: 1`, `fullyParallel: false`, retries 1, baseURL `http://localhost:8080`. `webServer` auto-starts `npm run dev` and reuses an existing server.

`e2e/globalSetup.ts` creates confirmed test users against the live Supabase project using `SUPABASE_SERVICE_ROLE_KEY`. **If that project is unreachable, globalSetup throws and zero tests run** — Playwright exits 1, but the failure looks like a stack trace rather than a test report, so check the output for an actual test count before concluding anything passed. Beware of shell pipelines (`npm test | tail`) masking the exit code.

**The suite writes to whatever database it points at.** Specs get their accounts from `createTestUser(tag, { profile })` in `e2e/helpers/auth.ts`, which creates pre-confirmed users through the service-role Admin API (optionally with a minimal `profiles` row so the wizard is skipped) and appends their ids to `e2e-extra-users.txt` in the OS tmpdir; `globalTeardown` deletes those plus globalSetup's two users. Only `02-auth`'s signup test drives the real signup form (one confirmation email per run, cleaned up via `cleanupUserByEmail`). Don't add new `signUp()` calls to specs: Supabase's built-in SMTP allows only a few auth emails per hour, and when specs signed up ~20 users per run every signup past the limit stalled on `/auth` and the suite timed out. A run that is killed mid-way skips teardown and leaves its users behind, so still don't point the full suite at production.

CI (`.github/workflows/e2e.yml`) runs the full suite from GitHub secrets against a dedicated E2E Supabase project (`hawxapwjhjoaqbcslmtb`), separate from production. That project is not kept in sync with `supabase/migrations/` automatically. After it drifted (missing columns, RPCs, and a profiles policy that hid every real member from browse), its public schema was dropped and rebuilt from the repo's migrations, then the admin role in `user_roles` was re-granted. When a new migration lands, apply it there too. When an E2E failure shows a 400/404 from PostgREST, check that project's schema first; failure logs from `logPageOnFailure` print each 4xx/5xx body, including the Postgres error code.

`setupFetchInterceptor` (`src/lib/apiErrorLogger.ts`) logs every failed fetch to `error_logs`. It must never log failures of the `error_logs` insert itself and must not block the caller on logging: when it did both, a failing insert looped forever and the original request never returned, so pages froze on their loading state.

Specs are numbered `01-public` through `15-user-journey`. `10-admin` and the admin step of `15-user-journey` need `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`. `15-user-journey`'s observer test needs `E2E_OBSERVER_EMAIL`/`E2E_OBSERVER_PASSWORD` and is skipped without them; it uses `ensurePersistentUser`, whose accounts globalTeardown never deletes, so their conversation stays readable in the E2E project.

Known gotchas:

- Helpers live in `e2e/helpers/auth.ts` (`signUp`, `signIn`, `signOut`, `uniqueEmail`, `dismissCookieBanner`).
- The cookie consent banner (`fixed bottom-0 z-50`, localStorage key `unity-hearts-cookie-consent`) blocks wizard button clicks. `dismissCookieBanner` pre-sets localStorage and is called automatically inside `signIn`/`signUp`.
- `test.setTimeout(ms)` inside a `describe` does **not** extend a `beforeAll` hook timeout — call `test.setTimeout(90000)` as the first line inside `beforeAll` itself. Specs 04, 09, 11, 12 create a profile in `beforeAll` and do this.
- The "Unity Hearts" nav text carries `hidden xs:inline`, and `xs` is not in the Tailwind config — so it is always `display:none`. Never assert `.toBeVisible()` on it; target the Heart SVG icon instead.
- Unauthenticated `/admin` redirects to `/` (root), not `/auth`. `/appeal` requires auth and redirects to `/auth`.
