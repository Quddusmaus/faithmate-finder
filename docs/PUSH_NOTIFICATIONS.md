# Push notifications (native app)

Push notifications for new matches and messages in the iOS and Android app.
The website is not affected.

Done in two steps:

1. **Device registration (done).** After sign-in the app asks for
   notification permission, gets the phone's push token and saves it in the
   `push_tokens` table. Sign-out removes it. Deleting the account removes it.
   Tapping a notification opens the page in its `url` field
   (for example `/messages?match=…`).
2. **Sending (next).** The existing new-match and new-message triggers (the
   same ones that call `send-notification-email`) will also call a new
   `send-push` edge function, which reads `push_tokens` and sends to
   Firebase Cloud Messaging (Android) and Apple Push Notification service
   (iOS). It will respect `notification_preferences`.

## How the pieces fit

| Piece | Where |
| --- | --- |
| Token table + `register_push_token` / `unregister_push_token` | `supabase/migrations/20261123000000_push-tokens.sql` |
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
   is a **secret**: it will be set as the edge-function secret
   `FCM_SERVICE_ACCOUNT_JSON` (step 2, not needed yet).

**Apple (iOS)**, needs the paid Apple Developer account:

1. Certificates, Identifiers & Profiles → Identifiers → `app.unityhearts` →
   enable **Push Notifications**. (Xcode's automatic signing can also do
   this.)
2. Keys → "+" → enable **Apple Push Notifications service (APNs)** →
   download the `.p8` file (can only be downloaded once). Note the **Key ID**
   and your **Team ID**. These will be the edge-function secrets
   `APNS_KEY_P8`, `APNS_KEY_ID`, `APNS_TEAM_ID` (step 2, not needed yet).

The push entitlement means iOS builds need a signing team with a paid
membership; a free personal team cannot sign it.

## Testing on a phone (not yet done)

1. Build with `VITE_PUSH_NOTIFICATIONS=on` and the Firebase file in place.
2. Sign in: the app should ask to allow notifications.
3. In Supabase, `select platform, updated_at from push_tokens` should show the
   device.
4. Sign out: the row should disappear.
5. Until step 2 lands, send a test message from the Firebase console
   (Messaging → test on device, paste the token) with a custom data key
   `url` = `/messages`, and check that tapping it opens Messages.
