import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn();
const signOut = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...a: unknown[]) => rpc(...a), auth: { signOut: (...a: unknown[]) => signOut(...a) } },
}));

const native = { isNative: true, platform: "android" };
vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => native.isNative,
    getPlatform: () => native.platform,
  },
}));

type Listener = (payload: unknown) => unknown;
const listeners: Record<string, Listener> = {};
const plugin = {
  addListener: vi.fn(async (event: string, fn: Listener) => {
    listeners[event] = fn;
    return { remove: vi.fn() };
  }),
  checkPermissions: vi.fn(async () => ({ receive: "prompt" })),
  requestPermissions: vi.fn(async () => ({ receive: "granted" })),
  register: vi.fn(async () => undefined),
};
vi.mock("@capacitor/push-notifications", () => ({ PushNotifications: plugin }));

import {
  pushEnabled,
  currentPushPlatform,
  routeFromNotificationData,
  registerForPush,
  signOutAndForgetDevice,
} from "./pushNotifications";

describe("pushEnabled", () => {
  it("is on only in the native app with the build switch set", () => {
    expect(pushEnabled("on", true)).toBe(true);
    expect(pushEnabled(" ON ", true)).toBe(true);
    expect(pushEnabled("on", false)).toBe(false);
    expect(pushEnabled(undefined, true)).toBe(false);
    expect(pushEnabled("", true)).toBe(false);
    expect(pushEnabled("true", true)).toBe(false);
  });
});

describe("currentPushPlatform", () => {
  it("maps Capacitor platforms", () => {
    expect(currentPushPlatform("ios")).toBe("ios");
    expect(currentPushPlatform("android")).toBe("android");
    expect(currentPushPlatform("web")).toBeNull();
  });
});

describe("routeFromNotificationData", () => {
  it("accepts in-app paths only", () => {
    expect(routeFromNotificationData({ url: "/messages?match=abc" })).toBe("/messages?match=abc");
    expect(routeFromNotificationData({ url: "https://evil.example" })).toBeNull();
    expect(routeFromNotificationData({ url: "//evil.example/x" })).toBeNull();
    expect(routeFromNotificationData({ url: 5 })).toBeNull();
    expect(routeFromNotificationData(null)).toBeNull();
    expect(routeFromNotificationData("x")).toBeNull();
  });
});

describe("registerForPush", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_PUSH_NOTIFICATIONS", "on");
    rpc.mockReset().mockResolvedValue({ error: null });
    signOut.mockReset().mockResolvedValue({ error: null });
    plugin.register.mockClear();
    plugin.requestPermissions.mockClear();
  });

  it("does nothing when the build switch is off", async () => {
    vi.stubEnv("VITE_PUSH_NOTIFICATIONS", "");
    await registerForPush(() => undefined);
    expect(plugin.register).not.toHaveBeenCalled();
  });

  it("asks permission, registers, saves the token, opens tapped notifications, and forgets the token on sign-out", async () => {
    const open = vi.fn();
    await registerForPush(open);

    expect(plugin.requestPermissions).toHaveBeenCalledTimes(1);
    expect(plugin.register).toHaveBeenCalledTimes(1);

    await listeners.registration({ value: "tok-123" });
    expect(rpc).toHaveBeenCalledWith("register_push_token", { p_token: "tok-123", p_platform: "android" });

    listeners.pushNotificationActionPerformed({ notification: { data: { url: "/messages?match=m1" } } });
    expect(open).toHaveBeenCalledWith("/messages?match=m1");

    await signOutAndForgetDevice();
    expect(rpc).toHaveBeenCalledWith("unregister_push_token", { p_token: "tok-123" });
    expect(rpc.mock.invocationCallOrder.at(-1)!).toBeLessThan(signOut.mock.invocationCallOrder[0]);
  });

  it("does not register when permission is denied", async () => {
    plugin.checkPermissions.mockResolvedValueOnce({ receive: "denied" });
    await registerForPush(() => undefined);
    expect(plugin.register).not.toHaveBeenCalled();
  });

  it("still signs out when push is off", async () => {
    vi.stubEnv("VITE_PUSH_NOTIFICATIONS", "");
    await signOutAndForgetDevice();
    expect(rpc).not.toHaveBeenCalled();
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
