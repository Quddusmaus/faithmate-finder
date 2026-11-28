// Native push notifications (iOS / Android app) for new matches and messages.
//
// Called by send-notification-email, which the new-like / new-match /
// new-message database triggers already call. Reads the recipient's devices
// from push_tokens (see migration 20261123000001_push-tokens.sql) and sends:
//   - Android rows (FCM tokens) through Firebase Cloud Messaging HTTP v1
//   - iOS rows (APNs device tokens) straight to Apple Push Notification service
// Tokens the services report as dead are deleted.
//
// No Deno globals here: secrets are passed in, so the pure parts are unit
// tested from vitest (src/lib/pushSend.test.ts). See docs/PUSH_NOTIFICATIONS.md.

export type PushKind = "like" | "match" | "message";

export interface PushContent {
  title: string;
  body: string;
  /** Path inside the app that opens when the notification is tapped. */
  url: string;
}

export interface FcmServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

export interface ApnsConfig {
  /** Contents of the AuthKey_XXXXXXXXXX.p8 file (PEM, PKCS#8). */
  keyP8: string;
  keyId: string;
  teamId: string;
  /** iOS bundle ID; APNs calls it the topic. */
  bundleId: string;
}

export interface PushConfig {
  fcm: FcmServiceAccount | null;
  apns: ApnsConfig | null;
}

export interface PushTokenRow {
  token: string;
  platform: string;
}

export type SendOutcome = "sent" | "invalid-token" | "failed";

export interface PushSummary {
  sent: number;
  removed: number;
  failed: number;
  skipped?: string;
}

const BUNDLE_ID = "app.unityhearts";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── What the notification says ────────────────────────────────────────────

/** Plain-text display name, trimmed to something a lock screen can show. */
export function displayName(raw: unknown): string {
  const name = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim() : "";
  if (!name) return "Someone";
  return name.length > 40 ? `${name.slice(0, 39)}…` : name;
}

/**
 * Text and tap target for a push, or null for kinds that don't get one.
 * Likes stay email-only (they're frequent; matches and messages are what
 * members want on their lock screen). Message text is never included.
 */
export function buildPushContent(kind: unknown, senderName: unknown, senderUserId: unknown): PushContent | null {
  if (kind !== "match" && kind !== "message") return null;
  const name = displayName(senderName);
  // The Messages page keys conversations by the other member's user id.
  const url = typeof senderUserId === "string" && UUID_RE.test(senderUserId)
    ? `/messages?match=${senderUserId}`
    : "/messages";
  if (kind === "match") {
    return { title: "It's a match! 🎉", body: `You and ${name} liked each other. Say hello!`, url };
  }
  return { title: "New message 💬", body: `${name} sent you a message`, url };
}

// ─── Configuration from secrets ────────────────────────────────────────────

/** Reads FCM_SERVICE_ACCOUNT_JSON / APNS_* secrets; missing or broken ones turn that platform off. */
export function pushConfigFromEnv(get: (name: string) => string | undefined): PushConfig {
  let fcm: FcmServiceAccount | null = null;
  const fcmJson = get("FCM_SERVICE_ACCOUNT_JSON");
  if (fcmJson) {
    try {
      const parsed = JSON.parse(fcmJson);
      if (parsed?.project_id && parsed?.client_email && parsed?.private_key) {
        fcm = { project_id: parsed.project_id, client_email: parsed.client_email, private_key: parsed.private_key };
      } else {
        console.error("push: FCM_SERVICE_ACCOUNT_JSON is missing project_id, client_email or private_key");
      }
    } catch {
      console.error("push: FCM_SERVICE_ACCOUNT_JSON is not valid JSON");
    }
  }

  let apns: ApnsConfig | null = null;
  const keyP8 = get("APNS_KEY_P8");
  const keyId = get("APNS_KEY_ID");
  const teamId = get("APNS_TEAM_ID");
  if (keyP8 && keyId && teamId) {
    // Secrets pasted on one line often carry literal "\n".
    apns = { keyP8: keyP8.replace(/\\n/g, "\n"), keyId: keyId.trim(), teamId: teamId.trim(), bundleId: BUNDLE_ID };
  }
  return { fcm, apns };
}

// ─── Signing (JWT with WebCrypto) ──────────────────────────────────────────

function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlJson(value: unknown): string {
  return base64url(new TextEncoder().encode(JSON.stringify(value)));
}

/** PKCS#8 PEM ("-----BEGIN PRIVATE KEY-----") to DER bytes. */
export function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/\\n/g, "\n")
    .replace(/-----(BEGIN|END) [A-Z ]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

async function signJwt(
  header: Record<string, string>,
  claims: Record<string, unknown>,
  pem: string,
  alg: "RS256" | "ES256",
): Promise<string> {
  const subtle = globalThis.crypto.subtle;
  const keyAlg = alg === "RS256"
    ? { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }
    : { name: "ECDSA", namedCurve: "P-256" };
  const key = await subtle.importKey("pkcs8", pemToDer(pem), keyAlg, false, ["sign"]);
  const input = `${base64urlJson({ ...header, alg, typ: "JWT" })}.${base64urlJson(claims)}`;
  const signAlg = alg === "RS256" ? { name: "RSASSA-PKCS1-v1_5" } : { name: "ECDSA", hash: "SHA-256" };
  // WebCrypto's ECDSA output is raw r||s, which is exactly what ES256 wants.
  const sig = await subtle.sign(signAlg, key, new TextEncoder().encode(input));
  return `${input}.${base64url(new Uint8Array(sig))}`;
}

/** Signed assertion exchanged at Google for an FCM access token. */
export function fcmAssertion(sa: FcmServiceAccount, nowSeconds: number): Promise<string> {
  return signJwt(
    {},
    {
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    },
    sa.private_key,
    "RS256",
  );
}

/** Provider token for APNs (valid up to an hour). */
export function apnsJwt(cfg: ApnsConfig, nowSeconds: number): Promise<string> {
  return signJwt({ kid: cfg.keyId }, { iss: cfg.teamId, iat: nowSeconds }, cfg.keyP8, "ES256");
}

// ─── Request bodies and error reading ──────────────────────────────────────

export function fcmMessage(token: string, content: PushContent) {
  return {
    message: {
      token,
      notification: { title: content.title, body: content.body },
      // Capacitor hands `data` to the app when the notification is tapped.
      data: { url: content.url },
      android: { priority: "HIGH", notification: { sound: "default" } },
    },
  };
}

export function apnsPayload(content: PushContent) {
  return {
    aps: { alert: { title: content.title, body: content.body }, sound: "default" },
    // Top-level custom keys arrive in the tapped notification's `data`.
    url: content.url,
  };
}

/** FCM says the token no longer belongs to an installed app (or to this Firebase project). */
export function fcmTokenIsDead(status: number, body: unknown): boolean {
  if (status === 404) return true;
  const err = (body as { error?: { status?: string; details?: Array<{ errorCode?: string }> } })?.error;
  const codes = [err?.status, ...(err?.details ?? []).map((d) => d?.errorCode)];
  return codes.includes("UNREGISTERED") || codes.includes("SENDER_ID_MISMATCH");
}

/**
 * APNs says the token is dead. 410 = app uninstalled. BadDeviceToken means
 * "not a token for this environment"; the caller retries the sandbox host
 * before believing it (development builds get sandbox tokens).
 */
export function apnsReason(body: unknown): string | undefined {
  const reason = (body as { reason?: unknown })?.reason;
  return typeof reason === "string" ? reason : undefined;
}

// ─── Sending ───────────────────────────────────────────────────────────────

type Fetch = typeof fetch;

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function fcmAccessToken(sa: FcmServiceAccount, fetchFn: Fetch): Promise<string> {
  const assertion = await fcmAssertion(sa, Math.floor(Date.now() / 1000));
  const res = await fetchFn("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const body = (await readJson(res)) as { access_token?: string } | null;
  if (!res.ok || !body?.access_token) {
    throw new Error(`FCM auth failed (${res.status}): ${JSON.stringify(body)}`);
  }
  return body.access_token;
}

async function sendFcm(sa: FcmServiceAccount, accessToken: string, token: string, content: PushContent, fetchFn: Fetch): Promise<SendOutcome> {
  const res = await fetchFn(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(sa.project_id)}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(fcmMessage(token, content)),
  });
  if (res.ok) return "sent";
  const body = await readJson(res);
  if (fcmTokenIsDead(res.status, body)) return "invalid-token";
  console.error(`push: FCM send failed (${res.status}):`, JSON.stringify(body));
  return "failed";
}

async function sendApnsTo(host: string, jwt: string, cfg: ApnsConfig, token: string, content: PushContent, fetchFn: Fetch) {
  const res = await fetchFn(`https://${host}/3/device/${encodeURIComponent(token)}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${jwt}`,
      "apns-topic": cfg.bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    },
    body: JSON.stringify(apnsPayload(content)),
  });
  return { status: res.status, reason: res.ok ? undefined : apnsReason(await readJson(res)) };
}

async function sendApns(cfg: ApnsConfig, jwt: string, token: string, content: PushContent, fetchFn: Fetch): Promise<SendOutcome> {
  // TestFlight / App Store builds use production; Xcode debug builds use sandbox.
  let r = await sendApnsTo("api.push.apple.com", jwt, cfg, token, content, fetchFn);
  if (r.status === 400 && r.reason === "BadDeviceToken") {
    r = await sendApnsTo("api.sandbox.push.apple.com", jwt, cfg, token, content, fetchFn);
  }
  if (r.status === 200) return "sent";
  if (r.status === 410 || (r.status === 400 && r.reason === "BadDeviceToken")) return "invalid-token";
  console.error(`push: APNs send failed (${r.status}): ${r.reason ?? "no reason"}`);
  return "failed";
}

/** Minimal slice of the Supabase client this needs (service-role client). */
export interface PushDb {
  from(table: "push_tokens"): {
    select(cols: string): { eq(col: string, val: string): PromiseLike<{ data: PushTokenRow[] | null; error: unknown }> };
    delete(): { in(col: string, vals: string[]): PromiseLike<{ error: unknown }> };
  };
}

/**
 * Sends `content` to every registered device of `userId`. Never throws:
 * push problems must not stop the email that follows.
 */
export async function sendPushToUser(
  db: PushDb,
  config: PushConfig,
  userId: string,
  content: PushContent,
  fetchFn: Fetch = fetch,
): Promise<PushSummary> {
  const summary: PushSummary = { sent: 0, removed: 0, failed: 0 };
  if (!config.fcm && !config.apns) return { ...summary, skipped: "not-configured" };

  try {
    const { data, error } = await db.from("push_tokens").select("token, platform").eq("user_id", userId);
    if (error) throw error;
    const rows = data ?? [];
    if (rows.length === 0) return { ...summary, skipped: "no-devices" };

    const android = config.fcm ? rows.filter((r) => r.platform === "android") : [];
    const ios = config.apns ? rows.filter((r) => r.platform === "ios") : [];
    const dead: string[] = [];
    const tally = (token: string, outcome: SendOutcome) => {
      if (outcome === "sent") summary.sent++;
      else if (outcome === "invalid-token") dead.push(token);
      else summary.failed++;
    };

    if (android.length && config.fcm) {
      try {
        const accessToken = await fcmAccessToken(config.fcm, fetchFn);
        for (const r of android) tally(r.token, await sendFcm(config.fcm, accessToken, r.token, content, fetchFn));
      } catch (e) {
        console.error("push: FCM error:", e);
        summary.failed += android.length;
      }
    }

    if (ios.length && config.apns) {
      try {
        const jwt = await apnsJwt(config.apns, Math.floor(Date.now() / 1000));
        for (const r of ios) tally(r.token, await sendApns(config.apns, jwt, r.token, content, fetchFn));
      } catch (e) {
        console.error("push: APNs error:", e);
        summary.failed += ios.length;
      }
    }

    if (dead.length) {
      const { error: delError } = await db.from("push_tokens").delete().in("token", dead);
      if (delError) console.error("push: could not delete dead tokens:", delError);
      else summary.removed = dead.length;
    }
  } catch (e) {
    console.error("push: unexpected error:", e);
    summary.failed++;
  }
  return summary;
}
