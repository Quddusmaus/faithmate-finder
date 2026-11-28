# Push notifications (native app)

Push notifications for new matches and messages in the iOS and Android app.
The website is not affected.

Done in two steps:

1. **Device registration (done).** After sign-in the app asks for
   notification permission, gets the phone's push token and saves it in the
   `push_tokens` table. Sign-out removes it. Deleting the account removes it.
   Tapping a notification opens the page in its `url` field
   (for example `/messages?match=…`).
2. **Sending (done, waits for the secrets below).** The database triggers
   for new matches and new messages already call the
   `send-notification-email` edge function. That function now first sends a
   push to each of the recipient's phones (`push.ts` next to it), then sends
   the email as before. Android goes through Firebase Cloud Messaging
   (HTTP v1), iPhone straight to Apple (APNs). Tokens the services report as
   uninstalled are deleted from `push_tokens`. No database change was needed.

What members see (English, like the emails; the message text itself is never
shown on the lock screen):

| Event | Title | Text | Tapping opens |
| --- | --- | --- | --- |
| New match | It's a match! 🎉 | You and *Name* liked each other. Say hello! | `/messages?match=<their id>` |
| New message | New message 💬 | *Name* sent you a message | `/messages?match=<their id>` |

Likes stay email-only. Push does not follow the email on/off switches on the
profile page: a member who unsubscribed from emails still gets app
notifications, and turns those off in the phone's own settings. Until the
secrets exist, the function skips push silently and emails work as before.

## How the pieces fit

| Piece | Where |
| --- | --- |
| Token table + `register_push_token` / `unregister_push_token` | `supabase/migrations/20261123000001_push-tokens.sql` |
| Send to FCM / APNs, delete dead tokens | `supabase/functions/send-notification-email/push.ts` (tests: `src/lib/pushSend.test.ts`) |
| Ask permission, save token, open tapped notification | `src/lib/pushNotifications.ts`, `src/components/PushNotificationsRegistrar.tsx` |
| Remove token before sign-out | `signOutAndForgetDevice()` in `src/lib/pushNotifications.ts` |
| iOS: forward the APNs token to Capacitor | `ios/App/App/AppDelegate.swift` |
| iOS: push entitlement | `ios/App/App/App.entitlements` (`aps-environment`) |
| Android 13+: notification permission | `android/app/src/main/AndroidManifest.xml` |

iOS rows hold an APNs device token; Android rows hold an FCM token. The
sender talks to APNs directly for iOS, so the iOS app does not need the
Firebase SDK.

## The on/off switch

Registration is off until the app is built with

```sh
VITE_PUSH_NOTIFICATIONS=on
```

(in `.env` before `npm run cap:sync`, or as an environment variable in the
build). Reason: on Android, asking for a token without
`android/app/google-services.json` crashes the app. Turn it on only once the
Firebase file below is in place.

## What Q needs to create

**Firebase (Android).**

1. <https://console.firebase.google.com> → Add project (e.g. "Uniting Hearts").
2. Add an Android app with package name `app.unityhearts`.
3. Download `google-services.json` and put it at
   `android/app/google-services.json`. It is gitignored: do not commit it
   (this repo is public). For CI builds, store it as a GitHub secret.
4. Project settings → Service accounts → Generate new private key. This JSON
   is a **secret**: paste the whole file's contents as the edge-function
   secret `FCM_SERVICE_ACCOUNT_JSON` (Lovable → Cloud → Secrets, or
   Supabase → Edge Functions → Secrets). Never commit it.

**Apple (iOS)**, needs the paid Apple Developer account:

1. Certificates, Identifiers & Profiles → Identifiers → `app.unityhearts` →
   enable **Push Notifications**. (Xcode's automatic signing can also do
   this.)
2. Keys → "+" → enable **Apple Push Notifications service (APNs)** →
   download the `.p8` file (can only be downloaded once). Note the **Key ID**
   and your **Team ID** (top right of the developer site). Set the
   edge-function secrets:
   - `APNS_KEY_P8`: the whole `.p8` file contents, including the
     `-----BEGIN PRIVATE KEY-----` lines (line breaks may be pasted as `\n`)
   - `APNS_KEY_ID`: the 10-character Key ID
   - `APNS_TEAM_ID`: the 10-character Team ID

   The same key works for Xcode debug builds (Apple's "sandbox") and for
   TestFlight / App Store builds; the function tries both automatically.

The push entitlement means iOS builds need a signing team with a paid
membership; a free personal team cannot sign it.

## Testing on a phone (not yet done)

1. Set the secrets above and build with `VITE_PUSH_NOTIFICATIONS=on` and the
   Firebase file in place.
2. Sign in: the app should ask to allow notifications.
3. In Supabase, `select platform, updated_at from push_tokens` should show the
   device.
4. Put the app in the background. From a second account (website is fine),
   match with the test account, then send it a message. A notification should
   arrive for each; tapping it should open that conversation.
5. If nothing arrives: Supabase → Edge Functions → `send-notification-email`
   → Logs. Each call logs `Push for match: {"sent":…,"removed":…,"failed":…}`;
   `"skipped":"not-configured"` means the secrets are missing,
   `"skipped":"no-devices"` means step 3 failed, and errors from Google or
   Apple are logged in full.
6. Sign out: the row should disappear and notifications stop.
