# Tester-ready checklist

Goal: an Android build that can be uploaded to Google Play closed testing and an
iOS project ready for a TestFlight build, with the app working end to end. Q
hires the testers and does the store submissions; this list covers the code.

The nightly run takes the first unchecked item that has no open PR, does it in
one PR (branch `nightly/YYYY-MM-DD-short-slug`), and ticks the box in that PR.
Items too big for one PR get split, with the remainder added here unchecked.

## Performance (do first)

- [x] Browse fires one `get_today_like_count` + one `get_today_super_like_count` RPC per `ProfileCard` (~160 calls per Browse load with ~120 profiles). On a slow/cold database this starves the page's real requests until they time out (seen once in CI on `15-user-journey`/`16-group-journey`; passed on re-run). Fetch both counts once per page (e.g. in `Profiles.tsx` or a small context) and pass them to the cards; keep everyone at full access (no paywall gating). Done: counts are shared through the React Query cache (`src/hooks/useDailyCount.ts`), one Super Like request per page and no like-count request while likes are unlimited.

## Native wrapper

- [x] Add Capacitor (core, cli, ios, android) with `capacitor.config.ts`; `webDir = dist`. Propose bundle ID `app.unityhearts` under NEEDS Q. Commit the generated `android/` and `ios/` projects (not gitignored) so builds are reproducible; keep secrets/keystores out. Add npm scripts `cap:sync`, `cap:android`, `cap:ios`.
- [x] Make the PWA service worker not register inside the native app (`Capacitor.isNativePlatform()`), and confirm the Vite fallback Supabase config works in the native build.
- [x] Native permissions: camera, microphone, photo library usage strings in iOS `Info.plist` and `AndroidManifest.xml` (needed for Daily.co video and photo verification). Check `getUserMedia`/video calls work in the WebView config.
- [x] Auth in native: Supabase email confirmation, password reset and any OAuth redirects must return into the app (deep link / custom URL scheme or universal links). Document the redirect URLs Q must add in Supabase auth settings.
- [ ] (Needs a phone; on the test list in `docs/RELEASE.md`.) Captcha in native: sign-up and password reset send a Cloudflare Turnstile token, and inside the app the page's hostname is `localhost`. Confirm on the first device build that the widget loads and Supabase accepts the token; if not, add `localhost` to the widget's hostnames in Cloudflare (NEEDS Q) or host the widget on a unityhearts.app page.
- [ ] Optional, only if auth email links don't open the app reliably: switch Supabase email templates to `https://unityhearts.app/auth?token_hash={{ .TokenHash }}&type=…` and handle `token_hash` in `Auth.tsx` with `supabase.auth.verifyOtp` (see `docs/NATIVE_LINKS.md`).
- [x] Android back button, safe-area insets (notch), status bar, external links open in system browser, keyboard not covering chat input.
- [x] App icons and splash screens generated from the existing logo (`@capacitor/assets`). Sources in `assets/`, regenerate with `npm run cap:assets`.
- [x] Push notifications, part 1: device registration. `push_tokens` table with `register_push_token`/`unregister_push_token`, permission prompt after sign-in, token removed on sign-out, tapping a notification opens its `url`, iOS AppDelegate/entitlement and Android 13 permission. Behind `VITE_PUSH_NOTIFICATIONS=on` until Firebase is set up. See `docs/PUSH_NOTIFICATIONS.md`.
- [x] Push notifications, part 2: sending. `send-notification-email` (already called by the new-match / new-message triggers) first pushes to the recipient's devices via `push.ts`: FCM HTTP v1 for Android, APNs for iOS (production, falling back to sandbox for debug builds), deleting tokens reported as uninstalled. No migration. Push is independent of the email switches (members turn it off in phone settings). Waits for the secrets `FCM_SERVICE_ACCOUNT_JSON`, `APNS_KEY_P8`, `APNS_KEY_ID`, `APNS_TEAM_ID` (NEEDS Q).
- [x] GitHub Actions workflow that builds an unsigned Android debug APK on pull requests to prove the native project compiles.
- [ ] (Needs a phone; on the test list in `docs/RELEASE.md`.) Push notifications verified on real phones (Android and iPhone): match and message notifications arrive with the app in the background, tapping opens the conversation. Needs the Firebase/APNs setup in `docs/PUSH_NOTIFICATIONS.md` first; add it to the first-phone-build test list.
- [x] Document (`docs/RELEASE.md`) the exact steps for Q to make a signed Android AAB and an iOS archive for TestFlight, including where signing secrets go. Release signing reads the gitignored `android/keystore.properties`; CI checks a signed bundle builds with a throwaway key.

- [x] Add a first-phone-build test list to `docs/RELEASE.md`: Cloudflare Turnstile captcha inside the app (origin is `localhost`), a real video call on iPhone, deep links, app icon and launch screen look right.

## Store-required features

- [x] In-app account deletion that is atomic: a `delete_user_data()` Postgres function / edge function replacing the sequential client deletes in `GDPRTools.tsx` (Apple requires in-app deletion). Done in PR #14 (`delete-account` edge function).
- [x] Privacy policy and terms pages reachable in-app and at public URLs; list data collected (for Apple privacy labels / Google data safety) in `docs/RELEASE.md`. Done: Settings → "Legal & support" and the sign-up form link to `/privacy` and `/terms`; the policy now lists the real data and service providers, a working contact address, a fixed date and how to delete an account (`/privacy#delete-account`, the web deletion page Google asks for); terms add the zero-tolerance / report / block clause Apple asks dating apps for. Store answers are in `docs/RELEASE.md` → "Privacy policy, terms and the store privacy forms". Wording still needs Q's review.
- [ ] In-app reporting and blocking verified working (required for dating apps).

## Pre-launch fixes

- [x] Unsubscribe link in notification emails. Done in PR #13.
- [x] `send-notification-email` links use `match_id`, not the raw sender UUID. Not a real leak: the Messages page keys conversations by the other member's user id. Already fine on main.
- [x] Per-user rate limit on `verify-pose`. Done in PR #13 (migration `20261120000000_verify-pose-attempts.sql`).
- [x] `Promise.race` timeout on `PhotoUpload` storage upload. Done in PR #12.
- [x] Password reset success toast and redirect. Already done on main.
- [x] Wire `send-suspension-email` into the admin ban flow. Already done on main.
- [x] Rate-limited buttons disable before the error toast. Done in PR #12 (Super Like disabled at the daily cap).
- [x] Empty messages state gets a "Browse profiles" button. Done in PR #12 (matches empty state).
- [x] `.env.example` documenting every required env var and edge-function secret (names only). Done in PR #15.
- [x] Investigate why Lovable shows "Build unsuccessful" on GitHub-pushed commits; fix if it is in the code, otherwise explain under NEEDS Q. Done on main: the build could not resolve `workbox-window` (PR #27 added it, PR #29 registers the service worker without it).

When every box is ticked, the nightly run stops opening work PRs and only runs
the health check (`npm ci`, `npm run lint`, `npx tsc --noEmit`,
`npx vitest run`, `npm run build`).
