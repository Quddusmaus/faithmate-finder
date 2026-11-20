# Links that open the app

Sign-up confirmation, password reset and notification emails link to
`https://unityhearts.app/...`. The app is set up so that, once the two files
below have real values, tapping one of those links on a phone with the app
installed opens **the app** instead of the browser.

Until then, nothing breaks: the links open the website, and confirming an
email or resetting a password works there. The member then signs in in the app.

## How it works

- Inside the app, `authRedirectUrl()` (`src/lib/nativeLinks.ts`) sends Supabase
  `https://unityhearts.app/auth` as the email redirect, the same URL the
  website already uses. **No Supabase redirect-URL settings need changing.**
- Android: an `autoVerify` intent filter in `AndroidManifest.xml` claims
  `unityhearts.app` and `www.unityhearts.app`.
- iOS: `App/App.entitlements` lists `applinks:unityhearts.app` and
  `applinks:www.unityhearts.app` (Associated Domains).
- When a link opens the app, `setupNativeDeepLinks()` reloads the app at the
  same path, query and hash. The Supabase client then reads the tokens from the
  hash exactly as it does on the website, and `/auth` shows "set new password"
  for reset links.

## What Q needs to fill in (once, after the store accounts exist)

Both files are already live on the site (served from `public/.well-known/`)
with placeholders.

1. **Apple Team ID.** Apple Developer account → Membership details → Team ID
   (10 characters, e.g. `AB12CD34EF`). In
   `public/.well-known/apple-app-site-association`, replace
   `REPLACE_WITH_YOUR_TEAM_ID` (two places). In Xcode, select that team under
   Signing & Capabilities; Xcode adds the Associated Domains capability to the
   app ID automatically.
2. **Android signing fingerprint.** Play Console → the app → Test and release →
   App integrity → App signing → "SHA-256 certificate fingerprint" (the
   app-signing key, not the upload key). In `public/.well-known/assetlinks.json`,
   replace `REPLACE_WITH_YOUR_SHA256_FINGERPRINT`. To test a debug build on
   your own phone too, add the debug key's fingerprint as a second entry in the
   same list.

Give either value to Claude and it will make the change as a PR. After it
deploys, check:

- `https://unityhearts.app/.well-known/apple-app-site-association` shows the
  real Team ID (it must be served as JSON with no redirect; it is today).
- `https://unityhearts.app/.well-known/assetlinks.json` shows the fingerprint.
- Android: `adb shell pm get-app-links app.unityhearts` reports `verified`.

## Known limits

- The link in Supabase's emails first goes to `supabase.co`, which then
  redirects to `unityhearts.app`. iOS and Android usually hand a redirected
  link to the app when the member tapped it, but some mail apps open it in
  their own built-in browser instead. If that turns out to be common, switch
  the Supabase email templates to link straight to
  `https://unityhearts.app/auth?token_hash=…&type=…` (needs a small code change
  to call `verifyOtp`; listed in `docs/TESTER_READY.md`).
