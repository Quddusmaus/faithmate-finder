import { describe, it, expect } from "vitest";
import { withTimeout } from "./safeAuth";

describe("withTimeout", () => {
  it("resolves when the promise finishes before the timeout", async () => {
    const result = await withTimeout(Promise.resolve("ok"), 100, "too slow");
    expect(result).toBe("ok");
  });

  it("rejects with the provided message when the timeout fires first", async () => {
    const slow = new Promise((resolve) => setTimeout(() => resolve("late"), 200));
    await expect(withTimeout(slow, 20, "too slow")).rejects.toThrow("too slow");
  });

  it("propagates rejections from the inner promise", async () => {
    const failing = Promise.reject(new Error("boom"));
    await expect(withTimeout(failing, 100, "too slow")).rejects.toThrow("boom");
  });
});
