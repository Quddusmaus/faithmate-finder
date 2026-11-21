# Tester-ready checklist

Goal: an Android build that can be uploaded to Google Play closed testing and an
iOS project ready for a TestFlight build, with the app working end to end. Q
hires the testers and does the store submissions; this list covers the code.

The nightly run takes the first unchecked item that has no open PR, does it in
one PR (branch `nightly/YYYY-MM-DD-short-slug`), and ticks the box in that PR.
Items too big for one PR get split, with the remainder added here unchecked.

## Native wrapper

- [x] Add Capacitor (core, cli, ios, android) with `capacitor.config.ts`; `webDir = dist`. Propose bundle ID `app.unityhearts` under NEEDS Q. Commit the generated `android/` and `ios/` projects (not gitignored) so builds are reproducible; keep secrets/keystores out. Add npm scripts `cap:sync`, `cap:android`, `cap:ios`.
- [x] Make the PWA service worker not register inside the native app (`Capacitor.isNativePlatform()`), and confirm the Vite fallback Supabase config works in the native build.
- [x] Native permissions: camera, microphone, photo library usage strings in iOS `Info.plist` and `AndroidManifest.xml` (needed for Daily.co video and photo verification). Check `getUserMedia`/video calls work in the WebView config.
- [x] Auth in native: Supabase email confirmation, password reset and any OAuth redirects must return into the app (deep link / custom URL scheme or universal links). Document the redirect URLs Q must add in Supabase auth settings.
- [ ] Captcha in native: sign-up and password reset send a Cloudflare Turnstile token, and inside the app the page's hostname is `localhost`. Confirm on the first device build that the widget loads and Supabase accepts the token; if not, add `localhost` to the widget's hostnames in Cloudflare (NEEDS Q) or host the widget on a unityhearts.app page.
- [ ] Optional, only if auth email links don't open the app reliably: switch Supabase email templates to `https://unityhearts.app/auth?token_hash={{ .TokenHash }}&type=…` and handle `token_hash` in `Auth.tsx` with `supabase.auth.verifyOtp` (see `docs/NATIVE_LINKS.md`).
- [x] Android back button, safe-area insets (notch), status bar, external links open in system browser, keyboard not covering chat input.
- [x] App icons and splash screens generated from the existing logo (`@capacitor/assets`).
- [ ] GitHub Actions workflow that builds an unsigned Android debug APK on pull requests to prove the native project compiles.
- [ ] Document (`docs/RELEASE.md`) the exact steps for Q to make a signed Android AAB and an iOS archive for TestFlight, including where signing secrets go.

## Store-required features

- [ ] In-app account deletion that is atomic: a `delete_user_data()` Postgres function / edge function replacing the sequential client deletes in `GDPRTools.tsx` (Apple requires in-app deletion).
- [ ] Privacy policy and terms pages reachable in-app and at public URLs; list data collected (for Apple privacy labels / Google data safety) in `docs/RELEASE.md`.
- [ ] In-app reporting and blocking verified working (required for dating apps).

## Pre-launch fixes

- [ ] Unsubscribe link in notification emails.
- [ ] `send-notification-email` links use `match_id`, not the raw sender UUID.
- [ ] Per-user rate limit on `verify-pose`.
- [ ] `Promise.race` timeout on `PhotoUpload` storage upload.
- [ ] Password reset success toast and redirect.
- [ ] Wire `send-suspension-email` into the admin ban flow.
- [ ] Rate-limited buttons disable before the error toast.
- [ ] Empty messages state gets a "Browse profiles" button.
- [ ] `.env.example` documenting every required env var and edge-function secret (names only).
- [ ] Investigate why Lovable shows "Build unsuccessful" on GitHub-pushed commits; fix if it is in the code, otherwise explain under NEEDS Q.

When every box is ticked, the nightly run stops opening work PRs and only runs
the health check (`npm ci`, `npm run lint`, `npx tsc --noEmit`,
`npx vitest run`, `npm run build`).
