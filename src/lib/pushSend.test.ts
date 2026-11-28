import { generateKeyPairSync, createVerify, verify as cryptoVerify } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  apnsJwt,
  buildPushContent,
  displayName,
  fcmAssertion,
  fcmTokenIsDead,
  pushConfigFromEnv,
  sendPushToUser,
  type PushConfig,
  type PushDb,
  type PushTokenRow,
} from "../../supabase/functions/send-notification-email/push";

const SENDER = "0b6a3f5e-1c2d-4e5f-8a9b-0c1d2e3f4a5b";

const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 });
const ec = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const rsaPem = rsa.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const ecPem = ec.privateKey.export({ type: "pkcs8", format: "pem" }).toString();

const fcm = { project_id: "unity-hearts-test", client_email: "push@unity-hearts-test.iam.gserviceaccount.com", private_key: rsaPem };
const apns = { keyP8: ecPem, keyId: "ABC123DEFG", teamId: "TEAM123456", bundleId: "app.unityhearts" };

function decodePart(part: string) {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

function fakeDb(rows: PushTokenRow[]) {
  const deleted: string[][] = [];
  const db: PushDb = {
    from: () => ({
      select: () => ({ eq: async () => ({ data: rows, error: null }) }),
      delete: () => ({
        in: async (_col: string, vals: string[]) => {
          deleted.push(vals);
          return { error: null };
        },
      }),
    }),
  };
  return { db, deleted };
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("push content", () => {
  it("covers matches and messages only, opening that conversation", () => {
    expect(buildPushContent("like", "Ana", SENDER)).toBeNull();
    expect(buildPushContent("match", "Ana", SENDER)).toEqual({
      title: "It's a match! 🎉",
      body: "You and Ana liked each other. Say hello!",
      url: `/messages?match=${SENDER}`,
    });
    expect(buildPushContent("message", "Ana", SENDER)?.body).toBe("Ana sent you a message");
  });

  it("never puts a non-uuid into the tap target and cleans up names", () => {
    expect(buildPushContent("message", "Ana", "../admin")?.url).toBe("/messages");
    expect(displayName("  ")).toBe("Someone");
    expect(displayName(null)).toBe("Someone");
    expect(displayName("A\nB")).toBe("A B");
    expect(displayName("x".repeat(60))).toHaveLength(40);
  });
});

describe("push config", () => {
  it("turns each platform on only when its secrets are complete", () => {
    expect(pushConfigFromEnv(() => undefined)).toEqual({ fcm: null, apns: null });
    const env: Record<string, string> = {
      FCM_SERVICE_ACCOUNT_JSON: JSON.stringify(fcm),
      APNS_KEY_P8: ecPem.replace(/\n/g, "\\n"),
      APNS_KEY_ID: "ABC123DEFG",
    };
    const partial = pushConfigFromEnv((k) => env[k]);
    expect(partial.fcm?.project_id).toBe("unity-hearts-test");
    expect(partial.apns).toBeNull();
    env.APNS_TEAM_ID = "TEAM123456";
    const full = pushConfigFromEnv((k) => env[k]);
    expect(full.apns?.keyP8).toBe(ecPem);
    expect(full.apns?.bundleId).toBe("app.unityhearts");
  });

  it("ignores a broken service-account secret", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(pushConfigFromEnv((k) => (k === "FCM_SERVICE_ACCOUNT_JSON" ? "{not json" : undefined)).fcm).toBeNull();
    spy.mockRestore();
  });
});

describe("signing", () => {
  it("makes an RS256 assertion Google can verify", async () => {
    const jwt = await fcmAssertion(fcm, 1_800_000_000);
    const [h, c, s] = jwt.split(".");
    expect(decodePart(h)).toEqual({ alg: "RS256", typ: "JWT" });
    expect(decodePart(c)).toMatchObject({
      iss: fcm.client_email,
      aud: "https://oauth2.googleapis.com/token",
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      iat: 1_800_000_000,
      exp: 1_800_003_600,
    });
    const v = createVerify("RSA-SHA256");
    v.update(`${h}.${c}`);
    expect(v.verify(rsa.publicKey, Buffer.from(s, "base64url"))).toBe(true);
  });

  it("makes an ES256 provider token Apple can verify", async () => {
    const jwt = await apnsJwt(apns, 1_800_000_000);
    const [h, c, s] = jwt.split(".");
    expect(decodePart(h)).toEqual({ kid: "ABC123DEFG", alg: "ES256", typ: "JWT" });
    expect(decodePart(c)).toEqual({ iss: "TEAM123456", iat: 1_800_000_000 });
    const sig = Buffer.from(s, "base64url");
    expect(sig).toHaveLength(64); // raw r||s, not DER
    expect(cryptoVerify("sha256", Buffer.from(`${h}.${c}`), { key: ec.publicKey, dsaEncoding: "ieee-p1363" }, sig)).toBe(true);
  });
});

describe("dead FCM tokens", () => {
  it("recognises unregistered and wrong-project tokens only", () => {
    expect(fcmTokenIsDead(404, null)).toBe(true);
    expect(fcmTokenIsDead(400, { error: { status: "INVALID_ARGUMENT", details: [{ errorCode: "UNREGISTERED" }] } })).toBe(true);
    expect(fcmTokenIsDead(403, { error: { status: "PERMISSION_DENIED", details: [{ errorCode: "SENDER_ID_MISMATCH" }] } })).toBe(true);
    expect(fcmTokenIsDead(400, { error: { status: "INVALID_ARGUMENT" } })).toBe(false);
    expect(fcmTokenIsDead(500, null)).toBe(false);
  });
});

describe("sendPushToUser", () => {
  const content = { title: "t", body: "b", url: "/messages" };
  const config: PushConfig = { fcm, apns };

  it("does nothing (no database read) when push isn't set up", async () => {
    const { db } = fakeDb([{ token: "a", platform: "android" }]);
    const from = vi.spyOn(db, "from");
    expect(await sendPushToUser(db, { fcm: null, apns: null }, SENDER, content, vi.fn())).toEqual({
      sent: 0, removed: 0, failed: 0, skipped: "not-configured",
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("sends to Android and iPhone and deletes tokens the services reject", async () => {
    const { db, deleted } = fakeDb([
      { token: "android-ok", platform: "android" },
      { token: "android-gone", platform: "android" },
      { token: "ios-ok", platform: "ios" },
      { token: "ios-dev", platform: "ios" },
      { token: "ios-gone", platform: "ios" },
    ]);
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init: init ?? {} });
      if (url === "https://oauth2.googleapis.com/token") return json(200, { access_token: "ya29.test" });
      if (url.includes("fcm.googleapis.com")) {
        const token = JSON.parse(String(init?.body)).message.token;
        return token === "android-ok" ? json(200, { name: "x" }) : json(404, { error: { status: "NOT_FOUND" } });
      }
      if (url.endsWith("/ios-ok")) return new Response(null, { status: 200 });
      if (url.endsWith("/ios-dev")) {
        return url.includes("sandbox") ? new Response(null, { status: 200 }) : json(400, { reason: "BadDeviceToken" });
      }
      if (url.endsWith("/ios-gone")) return json(410, { reason: "Unregistered" });
      throw new Error(`unexpected ${url}`);
    });

    const summary = await sendPushToUser(db, config, SENDER, content, fetchFn as typeof fetch);
    expect(summary).toEqual({ sent: 3, removed: 2, failed: 0 });
    expect(deleted).toEqual([["android-gone", "ios-gone"]]);

    const fcmCall = calls.find((c) => c.url.includes("fcm.googleapis.com"))!;
    expect(fcmCall.url).toBe("https://fcm.googleapis.com/v1/projects/unity-hearts-test/messages:send");
    expect((fcmCall.init.headers as Record<string, string>).Authorization).toBe("Bearer ya29.test");
    expect(JSON.parse(String(fcmCall.init.body)).message.data).toEqual({ url: "/messages" });

    const apnsCall = calls.find((c) => c.url.endsWith("/ios-ok"))!;
    expect(apnsCall.url).toBe("https://api.push.apple.com/3/device/ios-ok");
    const headers = apnsCall.init.headers as Record<string, string>;
    expect(headers["apns-topic"]).toBe("app.unityhearts");
    expect(headers["apns-push-type"]).toBe("alert");
    expect(headers.authorization).toMatch(/^bearer ey/);
    expect(JSON.parse(String(apnsCall.init.body))).toEqual({
      aps: { alert: { title: "t", body: "b" }, sound: "default" },
      url: "/messages",
    });
  });

  it("keeps tokens and reports failure when a service is down", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { db, deleted } = fakeDb([
      { token: "a", platform: "android" },
      { token: "i", platform: "ios" },
    ]);
    const fetchFn = vi.fn(async (input: RequestInfo | URL) =>
      String(input).includes("oauth2") ? json(500, { error: "down" }) : json(503, { reason: "ServiceUnavailable" }),
    );
    expect(await sendPushToUser(db, config, SENDER, content, fetchFn as typeof fetch)).toEqual({ sent: 0, removed: 0, failed: 2 });
    expect(deleted).toEqual([]);
    spy.mockRestore();
  });

  it("skips a platform whose secrets are missing", async () => {
    const { db } = fakeDb([{ token: "i", platform: "ios" }]);
    const fetchFn = vi.fn();
    expect(await sendPushToUser(db, { fcm, apns: null }, SENDER, content, fetchFn as typeof fetch)).toEqual({ sent: 0, removed: 0, failed: 0 });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
