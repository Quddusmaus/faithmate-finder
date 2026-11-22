import { describe, it, expect, vi } from "vitest";
import { registerServiceWorker } from "./registerServiceWorker";

function fakeNavigator() {
  const register = vi.fn(() => Promise.resolve({}));
  return { nav: { serviceWorker: { register } } as unknown as Navigator, register };
}

describe("registerServiceWorker", () => {
  it("registers /sw.js at the site root in production", () => {
    const { nav, register } = fakeNavigator();
    registerServiceWorker(nav, true);
    // jsdom's document is already "complete", so it registers straight away.
    expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/" });
  });

  it("does nothing in development", () => {
    const { nav, register } = fakeNavigator();
    registerServiceWorker(nav, false);
    expect(register).not.toHaveBeenCalled();
  });

  it("does nothing where service workers are unsupported", () => {
    expect(() => registerServiceWorker({} as Navigator, true)).not.toThrow();
    expect(() => registerServiceWorker(undefined, true)).not.toThrow();
  });
});
