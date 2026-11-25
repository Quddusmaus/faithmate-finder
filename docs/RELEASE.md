# Making a release build

How to turn this repo into (1) a signed Android App Bundle (`.aab`) for Google
Play closed testing and (2) an iOS archive uploaded to TestFlight. Written for
doing it on Q's Mac. Everything here is a one-time setup plus a short
"each new build" routine.

The app ID is `app.unityhearts` on both platforms (permanent once uploaded).
The name under the icon is currently **Uniting Hearts** (`capacitor.config.ts`,
`android/app/src/main/res/values/strings.xml`, iOS `Info.plist`
`CFBundleDisplayName`). The name shown in the stores is set separately in Play
Console and App Store Connect.

## Where secrets go (never in the repo)

This repo is public. None of these files are ever committed; `.gitignore`
already blocks them.

| Secret | Where it lives | Backup |
| --- | --- | --- |
| Android upload keystore (`upload-keystore.jks`) | `android/upload-keystore.jks` on your Mac | Password manager + one offline copy. If lost, Google can reset the upload key, but it takes days. |
| Keystore passwords | `android/keystore.properties` on your Mac | Password manager |
| Apple signing certificate / profiles | Managed automatically by Xcode in your Mac's keychain | Apple can re-issue them |
| `google-services.json` (Firebase, for Android push) | `android/app/google-services.json` | Re-downloadable from Firebase |
| APNs key (`.p8`), FCM service account | Supabase edge-function secrets only (see `docs/PUSH_NOTIFICATIONS.md`) | Password manager |

Google keeps the real **app-signing key** (Play App Signing). Your keystore is
only the **upload key** that proves an upload came from you.

## Tools to install once (Mac)

1. **Node 22** or newer (Capacitor 8 needs it): `brew install node@22`, or the
   installer from nodejs.org. Check with `node -v`.
2. **Android Studio** (includes the Android SDK and a Java runtime):
   https://developer.android.com/studio. Open it once and let it finish the
   SDK download.
3. **Xcode** from the Mac App Store (large, ~1 hour). Open it once, accept the
   licence and let it install components; then in Xcode → Settings →
   Components install the iOS platform. Then run
   `sudo xcode-select -s /Applications/Xcode.app` in Terminal.
   No CocoaPods needed: the iOS project uses Swift Package Manager.
4. In the repo folder: `npm ci`.

## Before every build: copy the web app into the native projects

```sh
git checkout main && git pull
npm ci
npm run cap:sync        # builds dist/ and copies it into android/ and ios/
```

No `.env` is required: without one the build uses the production Supabase
settings hardcoded in `vite.config.ts`, which is what the store build should
use. If you do have a `.env`, make sure it points at production
(`nyhlwamvqjmaxpmqxzah`), not the E2E project.

Push notifications are off in the build unless you build with
`VITE_PUSH_NOTIFICATIONS=on` **and** `android/app/google-services.json` is in
place (otherwise the Android app crashes when it asks for push). Until the
Firebase/APNs setup in `docs/PUSH_NOTIFICATIONS.md` is done, leave it off:

```sh
VITE_PUSH_NOTIFICATIONS=on npm run cap:sync   # only once Firebase is set up
```

## Android: signed App Bundle for Play closed testing

### One time: create the upload key

In Terminal, from the repo folder (`keytool` comes with Android Studio; if the
command is not found, use
`"/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin/keytool"`):

```sh
cd android
keytool -genkeypair -v -keystore upload-keystore.jks -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

It asks for a password and your name/organisation. Then create
`android/keystore.properties` (plain text, gitignored) with:

```properties
storeFile=upload-keystore.jks
storePassword=THE_PASSWORD_YOU_CHOSE
keyAlias=upload
keyPassword=THE_PASSWORD_YOU_CHOSE
```

`android/app/build.gradle` reads this file and signs release builds with it.
Without the file, release builds come out unsigned (and Play rejects them).
Back up both files now (see the table above).

### Each build

1. Raise the version in `android/app/build.gradle`: `versionCode` must be
   higher than any build already uploaded (1, 2, 3, …); `versionName` is what
   members see ("1.0", "1.0.1", …).
2. `npm run cap:sync` (see above).
3. Build the bundle:

   ```sh
   cd android
   ./gradlew bundleRelease
   ```

   The file is `android/app/build/outputs/bundle/release/app-release.aab`.
   (Alternatively in Android Studio: Build → Generate Signed App Bundle / APK →
   Android App Bundle, choosing the same keystore.)

### First upload to Play Console

1. Play Console → Create app (name, default language, app, free).
2. Test and release → Testing → Closed testing → create a track, add a tester
   email list or Google Group.
3. Create release → upload `app-release.aab`. On the first upload, accept
   **Play App Signing** (Google holds the app-signing key).
4. After it is accepted: Test and release → App integrity → App signing →
   copy the **SHA-256 of the app-signing key** into
   `public/.well-known/assetlinks.json` (see `docs/NATIVE_LINKS.md`) so email
   links open the app.
5. Fill in the store listing, content rating, target audience, and Data
   safety form (the data list is in "Data collected" below once that
   checklist item is done), then send the release for review.

The GitHub Actions "Android build" workflow also builds an unsigned debug APK
on every pull request (download it from the run's Artifacts to sideload on a
phone), and checks that a signed release bundle builds, using a throwaway key.

## iOS: archive and upload to TestFlight

Needs a paid Apple Developer Program membership ($99/year) on your Apple ID.

### One time

1. developer.apple.com → Certificates, Identifiers & Profiles → Identifiers →
   **+** → App IDs → App → Bundle ID (explicit) `app.unityhearts`. Tick
   **Associated Domains** and **Push Notifications**. (Xcode can also create it
   automatically in step 3, but doing it here makes sure both capabilities are
   on.)
2. App Store Connect → Apps → **+** New App → iOS, name, primary language,
   bundle ID `app.unityhearts`, SKU (anything, e.g. `unityhearts`).
3. `npm run cap:ios` (syncs and opens Xcode). In Xcode select the **App**
   project → **App** target → **Signing & Capabilities**: tick "Automatically
   manage signing" and choose your Team. Xcode creates the certificate and
   profiles itself. Note the Team ID shown and put it in
   `public/.well-known/apple-app-site-association` (see
   `docs/NATIVE_LINKS.md`).
4. Still in Xcode, Account settings (Xcode → Settings → Accounts) should list
   your Apple ID; add it there if it does not.

### Each build

1. `npm run cap:ios` (or `npm run cap:sync` then open
   `ios/App/App.xcodeproj`).
2. App target → **General**: raise **Build** (1, 2, 3, …; must be higher than
   any build already uploaded for that version) and set **Version** ("1.0",
   "1.0.1", …).
3. At the top of the window choose **Any iOS Device (arm64)** as the
   destination (not a simulator).
4. Product → **Archive**. When it finishes the Organizer window opens.
5. **Distribute App** → **App Store Connect** → Upload. Keep the defaults
   (automatic signing, upload symbols).
6. After 10–30 minutes the build appears in App Store Connect → the app →
   TestFlight. Answer the export-compliance question (the app uses only
   standard HTTPS encryption, which is exempt), then add internal testers, or
   create an external group and submit the build for Beta App Review.

## First-phone-build test list

Do these on the first real Android phone and iPhone build, before inviting
testers. Tick them in `docs/TESTER_READY.md` (or tell Claude the results).

- [ ] App icon and launch (splash) screen look right on both phones; the name
      under the icon is correct.
- [ ] Sign up a new account in the app: the **Cloudflare Turnstile captcha**
      loads and the sign-up succeeds. Inside the app the page's hostname is
      `localhost`, so if the widget shows an error, add `localhost` to the
      widget's hostnames in the Cloudflare dashboard. Same for "forgot
      password".
- [ ] **Deep links:** tap the confirmation email link and a password-reset email
      link on the phone; they open the app (not the browser) and finish the
      flow. Needs the Team ID / fingerprint from `docs/NATIVE_LINKS.md` live
      on the site first. If links keep opening the browser, see the optional
      `token_hash` item in `docs/TESTER_READY.md`.
- [ ] **A real video call on an iPhone** (and on Android): camera and
      microphone permission prompts appear, both sides see and hear each
      other, and hanging up works. Also a voice-only call.
- [ ] Photo upload from the camera and from the photo library; photo
      verification (pose check) works.
- [ ] **Push notifications** (only once Firebase/APNs is set up and the build
      used `VITE_PUSH_NOTIFICATIONS=on`): with the app in the background,
      a new match and a new message each arrive as a notification, and
      tapping one opens that conversation. On Android 13+ the permission
      prompt appears after sign-in.
- [ ] Android back button goes back a page (and leaves the app from the home
      screen); the chat input stays above the keyboard; nothing hides under
      the notch or status bar.
- [ ] Links to outside sites (privacy policy, external links) open in the
      phone's browser, not inside the app.
- [ ] Report and block another member; delete the test account from the profile
      page ("Data & Privacy" section) and confirm you can no longer sign in with it.
