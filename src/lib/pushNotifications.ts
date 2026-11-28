import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

/**
 * Native push notifications (iOS / Android app only — never the website).
 *
 * This file only does the device side: ask permission, get the device's push
 * token, and store it in `push_tokens` (through the `register_push_token`
 * database function) so the server can send to it later. Sending is a
 * separate step.
 *
 * Off until `VITE_PUSH_NOTIFICATIONS=on` is set at build time. On Android,
 * asking Firebase for a token without `android/app/google-services.json`
 * crashes the app, so the switch stays off until that file is in place
 * (and the APNs key on the Apple side). See docs/PUSH_NOTIFICATIONS.md.
 */

export type PushPlatform = "ios" | "android";

/** Is push turned on for this build and running inside the native app? */
export function pushEnabled(
  flag: string | undefined = import.meta.env.VITE_PUSH_NOTIFICATIONS,
  isNative: boolean = Capacitor.isNativePlatform(),
): boolean {
  return isNative && (flag ?? "").trim().toLowerCase() === "on";
}

export function currentPushPlatform(platform: string = Capacitor.getPlatform()): PushPlatform | null {
  return platform === "ios" || platform === "android" ? platform : null;
}

/**
 * Where tapping a notification should take the member. The server puts a
 * `url` (a path inside the app, e.g. `/messages?match=…`) in the payload.
 * Anything that isn't a plain in-app path is ignored.
 */
export function routeFromNotificationData(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const url = (data as Record<string, unknown>).url;
  if (typeof url !== "string") return null;
  if (!url.startsWith("/") || url.startsWith("//")) return null;
  return url;
}

// The token this device registered with, so it can be removed on sign-out.
let registeredToken: string | null = null;
let listenersAdded = false;

/**
 * Ask for permission (once — the OS remembers the answer) and register this
 * device for the signed-in member. Safe to call repeatedly.
 */
export async function registerForPush(onOpen: (path: string) => void): Promise<void> {
  if (!pushEnabled()) return;
  const platform = currentPushPlatform();
  if (!platform) return;

  const { PushNotifications } = await import("@capacitor/push-notifications");

  if (!listenersAdded) {
    listenersAdded = true;

    await PushNotifications.addListener("registration", async ({ value }) => {
      registeredToken = value;
      const { error } = await supabase.rpc("register_push_token", {
        p_token: value,
        p_platform: platform,
      });
      if (error) console.warn("Could not save push token:", error.message);
    });

    await PushNotifications.addListener("registrationError", (err) => {
      console.warn("Push registration failed:", err.error);
    });

    await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
      const path = routeFromNotificationData(notification.data);
      if (path) onOpen(path);
    });
  }

  let { receive } = await PushNotifications.checkPermissions();
  if (receive === "prompt" || receive === "prompt-with-rationale") {
    ({ receive } = await PushNotifications.requestPermissions());
  }
  if (receive !== "granted") return;

  await PushNotifications.register();
}

/**
 * Remove this device's token from the server. Call BEFORE signing out — once
 * the session is gone the database won't let us delete the row.
 */
export async function unregisterPushToken(): Promise<void> {
  if (!pushEnabled() || !registeredToken) return;
  const token = registeredToken;
  registeredToken = null;
  try {
    const { error } = await supabase.rpc("unregister_push_token", { p_token: token });
    if (error) console.warn("Could not remove push token:", error.message);
  } catch (err) {
    console.warn("Could not remove push token:", err);
  }
}

/** Sign out, removing this device's push token first. */
export async function signOutAndForgetDevice(
  options?: Parameters<typeof supabase.auth.signOut>[0],
) {
  await unregisterPushToken();
  return supabase.auth.signOut(options);
}
