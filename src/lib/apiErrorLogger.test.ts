import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/hooks/useErrorLogging", () => ({ logError: vi.fn() }));

import { logError } from "@/hooks/useErrorLogging";

const REST = "https://example.supabase.co/rest/v1";
const underlyingFetch = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

beforeAll(async () => {
  // The interceptor captures window.fetch at import time, so stub it first.
  window.fetch = underlyingFetch as typeof window.fetch;
  const { setupFetchInterceptor } = await import("./apiErrorLogger");
  setupFetchInterceptor();
});

beforeEach(() => {
  underlyingFetch.mockReset();
  vi.mocked(logError).mockReset().mockResolvedValue(undefined);
});

const badRequest = () => new Response(JSON.stringify({ message: "nope" }), { status: 400 });

describe("setupFetchInterceptor", () => {
  it("returns a failed response to the caller and logs it", async () => {
    const response = badRequest();
    underlyingFetch.mockResolvedValue(response);

    await expect(window.fetch(`${REST}/profiles`)).resolves.toBe(response);
    await vi.waitFor(() => expect(logError).toHaveBeenCalledTimes(1));
  });

  it("does not log failures of the error_logs insert itself", async () => {
    underlyingFetch.mockResolvedValue(badRequest());

    const response = await window.fetch(`${REST}/error_logs?columns=x`, { method: "POST" });
    expect(response.status).toBe(400);
    await new Promise((r) => setTimeout(r, 0));
    expect(logError).not.toHaveBeenCalled();
  });

  it("does not make the caller wait on logging", async () => {
    vi.mocked(logError).mockReturnValue(new Promise(() => {}));
    underlyingFetch.mockResolvedValue(badRequest());

    const response = await window.fetch(`${REST}/profiles`);
    expect(response.status).toBe(400);
  });

  it("rethrows network errors without waiting on logging", async () => {
    vi.mocked(logError).mockReturnValue(new Promise(() => {}));
    underlyingFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(window.fetch(`${REST}/profiles`)).rejects.toThrow("Failed to fetch");
  });
});
