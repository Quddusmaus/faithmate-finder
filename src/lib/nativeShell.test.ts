import { describe, it, expect, afterEach } from "vitest";
import { backAction, hasOpenOverlay, closeTopOverlay } from "./nativeShell";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("backAction", () => {
  it("closes an open overlay before anything else", () => {
    expect(backAction(true, true)).toBe("close-overlay");
    expect(backAction(true, false)).toBe("close-overlay");
  });

  it("goes back in history when it can, otherwise exits", () => {
    expect(backAction(false, true)).toBe("history-back");
    expect(backAction(false, false)).toBe("exit");
  });
});

describe("hasOpenOverlay", () => {
  it("finds open dialogs and popovers, ignores closed ones", () => {
    document.body.innerHTML = '<div role="dialog" data-state="closed"></div>';
    expect(hasOpenOverlay()).toBe(false);

    document.body.innerHTML = '<div role="dialog" data-state="open"></div>';
    expect(hasOpenOverlay()).toBe(true);

    document.body.innerHTML = "<div data-radix-popper-content-wrapper></div>";
    expect(hasOpenOverlay()).toBe(true);
  });
});

describe("closeTopOverlay", () => {
  it("sends Escape, which Radix overlays close on", () => {
    let key = "";
    document.addEventListener("keydown", (e) => (key = e.key), { once: true });
    closeTopOverlay();
    expect(key).toBe("Escape");
  });
});
