import { Capacitor } from "@capacitor/core";

/**
 * The public website. Inside the native app `window.location.origin` is
 * `https://localhost` (Android) or `capacitor://localhost` (iOS), which
 * Supabase would reject as an email redirect, so auth emails sent from the
 * app link to the website instead. With universal links / App Links set up
 * (see docs/NATIVE_LINKS.md) those links open the app; otherwise they open the
 * website, where confirming or resetting still works.
 */
export const PUBLIC_SITE_URL = "https://unityhearts.app";

const SITE_HOSTS = new Set(["unityhearts.app", "www.unityhearts.app"]);

/** Where Supabase auth emails (confirm signup, reset password) should send people. */
export function authRedirectUrl(isNative = Capacitor.isNativePlatform()): string {
  const origin = isNative ? PUBLIC_SITE_URL : window.location.origin;
  return `${origin}/auth`;
}

/**
 * Turn a link the OS handed to the app (e.g. https://unityhearts.app/auth#access_token=…)
 * into an in-app path, keeping query and hash so Supabase can read the tokens.
 * Returns null for links that aren't ours.
 */
export function toInAppPath(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || !SITE_HOSTS.has(parsed.hostname)) return null;
  return `${parsed.pathname || "/"}${parsed.search}${parsed.hash}`;
}

const HANDLED_KEY = "native-link-handled";

function readHandled(): string | null {
  try {
    return sessionStorage.getItem(HANDLED_KEY);
  } catch {
    return null;
  }
}

function markHandled(url: string) {
  try {
    sessionStorage.setItem(HANDLED_KEY, url);
  } catch {
    // ignore: worst case a cold-start link is opened once more
  }
}

function openInApp(url: string) {
  const path = toInAppPath(url);
  if (!path) return;
  markHandled(url);
  // Full reload (not a router push) so the Supabase client re-initialises and
  // picks the session tokens out of the URL hash, exactly as on the website.
  window.location.replace(path);
}

/** Native only: open unityhearts.app links (auth emails, notification emails) inside the app. */
export async function setupNativeDeepLinks() {
  if (!Capacitor.isNativePlatform()) return;
  const { App } = await import("@capacitor/app");

  // App already running when the link was tapped.
  await App.addListener("appUrlOpen", ({ url }) => openInApp(url));

  // App cold-started by the link. The launch URL stays the same across the
  // reload openInApp triggers, so only handle it once.
  const launch = await App.getLaunchUrl();
  if (launch?.url && readHandled() !== launch.url) openInApp(launch.url);
}
