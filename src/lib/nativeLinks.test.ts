import { describe, it, expect } from "vitest";
import { authRedirectUrl, toInAppPath, PUBLIC_SITE_URL } from "./nativeLinks";

describe("toInAppPath", () => {
  it("keeps path, query and hash for our links", () => {
    expect(
      toInAppPath("https://unityhearts.app/auth#access_token=abc&refresh_token=def&type=recovery"),
    ).toBe("/auth#access_token=abc&refresh_token=def&type=recovery");
    expect(toInAppPath("https://www.unityhearts.app/messages?match=1")).toBe("/messages?match=1");
    expect(toInAppPath("https://unityhearts.app")).toBe("/");
  });

  it("ignores links that aren't ours", () => {
    expect(toInAppPath("https://evil.example/auth#access_token=abc")).toBeNull();
    expect(toInAppPath("https://unityhearts.app.evil.example/auth")).toBeNull();
    expect(toInAppPath("http://unityhearts.app/auth")).toBeNull();
    expect(toInAppPath("not a url")).toBeNull();
  });
});

describe("authRedirectUrl", () => {
  it("uses the public site inside the native app", () => {
    expect(authRedirectUrl(true)).toBe(`${PUBLIC_SITE_URL}/auth`);
  });

  it("uses the current origin on the website", () => {
    expect(authRedirectUrl(false)).toBe(`${window.location.origin}/auth`);
  });
});
