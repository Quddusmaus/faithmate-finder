import { describe, expect, it } from "vitest";
import { resolveSwitch } from "./useAppSwitch";

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
