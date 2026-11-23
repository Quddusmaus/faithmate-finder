import { describe, expect, it } from "vitest";
import { callsAllowed, resolveSwitch } from "./useAppSwitch";

describe("resolveSwitch", () => {
  it("is off only when the row says enabled = false", () => {
    expect(resolveSwitch({ enabled: false })).toBe(false);
    expect(resolveSwitch({ enabled: true })).toBe(true);
  });

  it("treats a missing row or odd value as on", () => {
    expect(resolveSwitch(null)).toBe(true);
    expect(resolveSwitch(undefined)).toBe(true);
    expect(resolveSwitch({})).toBe(true);
    expect(resolveSwitch({ enabled: null })).toBe(true);
  });
});

describe("callsAllowed", () => {
  it("the main switch turns calls off everywhere", () => {
    for (const platform of ["web", "android", "ios"]) expect(callsAllowed(false, true, platform)).toBe(false);
  });

  it("the iPhone switch only affects the iPhone app", () => {
    expect(callsAllowed(true, false, "ios")).toBe(false);
    expect(callsAllowed(true, false, "web")).toBe(true);
    expect(callsAllowed(true, false, "android")).toBe(true);
    expect(callsAllowed(true, true, "ios")).toBe(true);
  });
});
