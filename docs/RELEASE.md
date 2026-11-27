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
- [ ] Links to outside sites open in the phone's browser, not inside the app.
      Profile → Settings → "Legal & support" opens the Privacy Policy and
      Terms inside the app, and "Back" returns to Settings. The sign-up form
      links to both as well.
- [ ] Report and block another member, once from their profile card and once
      from an open chat (flag icon and ⋮ menu in the chat header); the
      blocked member disappears from your conversations straight away. Delete
      the test account from the profile page ("Data & Privacy" section) and
      confirm you can no longer sign in with it.

## Reporting, blocking and moderation (App Review)

Apple (guideline 1.2, user-generated content) and Google both expect a dating
app to let members report and block others, and to act on reports. What the
app does:

- **Report:** the flag icon on any profile card and in the header of every
  chat. The member picks a reason (fake profile, inappropriate content,
  harassment, spam, appears underage, other) and can add details. Reports go
  to `profile_reports`.
- **Block:** the ⋮ menu on a profile card or in a chat → Block User. The
  database then hides each member from the other (browse, profiles, Super
  Likes), removes their likes and Super Likes both ways, and refuses
  messages, calls, likes and Super Likes between them
  (migration `20261127000000_enforce-blocks.sql`). The blocked member is not
  told. **Unmatch** (same menu) removes the match without blocking.
- **Moderation:** admins see reports in `/admin` → Reports, and can dismiss,
  resolve, suspend or ban (a ban emails the member and they can appeal at
  `/appeal`). Admins are emailed when a report arrives (`notify-admins`).
- **Terms:** the Terms of Service have the zero-tolerance clause, and sign-up
  links to them.

Apple expects reports to be acted on within 24 hours. Someone has to read the
admin alert emails and check `/admin` → Reports at least daily while the app
is in review and in testing.

**Text for the App Review notes** (App Store Connect → the version → App
Review Information → Notes), adjust as needed:

> Unity Hearts is a dating app for Bahá'í singles. Members can report any
> member from their profile or from a conversation (flag icon on the profile
> card and in the chat header) and block any member (⋮ menu → Block User); a block hides both
> members from each other and stops all contact. Reports are emailed to our
> moderators and reviewed in our admin console within 24 hours; abusive
> accounts are suspended or banned. Members accept the Terms of Service, which
> have a zero-tolerance policy for objectionable content and abusive users,
> when they sign up. A demo account: [email / password].

Google Play asks no separate question about this, but its policy for dating
apps expects the same report and block features.

## Privacy policy, terms and the store privacy forms

Both stores ask for the policy URLs and a description of the data the app
collects. Everything below was checked against the code (database tables in
`src/integrations/supabase/types.ts`, the edge functions in
`supabase/functions/`, and what the app sends from the phone). If a feature
that collects new data is added, update this section, the Privacy Policy page
(`src/pages/PrivacyPolicy.tsx`) and its date (`src/lib/legal.ts`).

### URLs to paste

| Field | URL |
| --- | --- |
| Privacy policy (App Store Connect, Play Console) | https://unityhearts.app/privacy |
| Terms of use / EULA (App Store description or "License Agreement") | https://unityhearts.app/terms |
| Account deletion web page (Play Console → Data safety → "Delete account URL") | https://unityhearts.app/privacy#delete-account |
| Support URL (App Store Connect) | https://unityhearts.app/contact |

Inside the app the same pages are under Profile → Settings → "Legal &
support", and linked from the sign-up form.

### What the app collects

| Data | Where it comes from | Why | Linked to the member |
| --- | --- | --- | --- |
| Name, email address | Sign-up form | Account, emails | Yes |
| Password | Sign-up form | Sign-in (stored hashed by Supabase Auth) | Yes |
| Profile photos | Photo upload (camera or library) | Shown to other members | Yes |
| Age, gender, faith, town/region (typed text, no GPS), bio, interests, "looking for", language | Profile form | Matching, shown to other members | Yes |
| Messages and reactions | Chat | Sent to the match | Yes |
| Verification selfie and its result | Optional photo verification | Fake-profile protection; checked by Google Gemini through Lovable's AI gateway, then reviewed by admins | Yes |
| Likes, Super Likes, matches, blocks, reports, notification settings | Using the app | App features, safety | Yes |
| Contact form and suspension appeal messages | Contact / appeal pages | Support | Yes |
| IP address of sign-in attempts | Sign-in | Stop password guessing (`login_attempts`) | By email |
| Error reports (page, browser/device, error text) | Automatic when something fails | Fixing bugs (`error_logs`) | Yes |
| Push token | Phone app, only if notifications are allowed | New match / message notifications | Yes |

Not collected: device GPS location, contacts, payment info (there are no
purchases), call audio/video (Daily.co connects calls live; nothing is
recorded), advertising IDs. No ads, no analytics SDKs, no tracking across apps
or websites.

Service providers that process the data: Supabase (database, sign-in,
storage), Lovable (hosting, AI gateway), Google Gemini (selfie check only),
Daily.co (calls), Resend (email), Cloudflare Turnstile (captcha), Firebase
Cloud Messaging and Apple Push Notification service (notifications). Both
stores treat these as service providers, so they are not "sharing" or
"tracking".

### Apple App Store: App Privacy answers

App Store Connect → your app → App Privacy → "Yes, we collect data". For every
type below choose **App Functionality** as the purpose (add **Product
Personalization** for the profile fields only if you want; matching uses
them), **Linked to the user: Yes**, **Used for tracking: No**.

- Contact Info → **Name**, **Email Address**
- Sensitive Info → **Sensitive Info** (faith / religious beliefs)
- User Content → **Photos or Videos** (profile photos, verification selfie),
  **Emails or Text Messages** (in-app chat), **Customer Support**
  (contact form, appeals), **Other User Content** (bio, interests, the rest of
  the profile)
- Identifiers → **User ID**. If you want to be conservative, also
  **Device ID** for the push token (Apple does not strictly require it).
- Usage Data → **Product Interaction** (likes, matches, blocks)
- Diagnostics → **Other Diagnostic Data** (error reports). Not crash data:
  the app has no crash reporter.

Not collected: Location, Contacts, Health, Financial Info, Browsing History,
Search History, Purchases, Audio Data.

Age rating questionnaire: it is a dating app with user-generated content and
chat, so expect **17+** (Apple) and **Mature / 18+** (Play). Answer
"unrestricted web access": No.

### Google Play: Data safety answers

Play Console → App content → Data safety.

- Does the app collect or share user data? **Yes, collects.** Shared with
  third parties: **No** (service providers don't count).
- Encrypted in transit: **Yes** (HTTPS everywhere).
- Way for users to request deletion: **Yes**, in the app and at
  https://unityhearts.app/privacy#delete-account.
- Data types, each "Collected", "Required" unless marked optional, purpose
  **App functionality** (add **Account management** for name, email and user
  ID; **Fraud prevention, security, and compliance** for the IP address and
  verification selfie):
  - Personal info → **Name**, **Email address**, **User IDs**,
    **Religious or political beliefs** (faith, optional), **Other info**
    (age, gender, town/region, bio, interests)
  - Photos and videos → **Photos**
  - Messages → **Other in-app messages**
  - App activity → **App interactions** (likes, matches, blocks, reports),
    **Other user-generated content** (contact form, appeals)
  - App info and performance → **Diagnostics** (error reports)
  - Device or other IDs → **Device or other IDs** (push token, optional)
  - Not collected: location, financial info, health, contacts, calendar,
    audio, files, web browsing.
- IP address of sign-in attempts: Play treats IP addresses under "Device or
  other IDs" only if you use them to identify the device; they are used for
  security only here, so the entry above with purpose "Fraud prevention,
  security, and compliance" covers it.

