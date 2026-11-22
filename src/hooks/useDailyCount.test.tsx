import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const rpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));

vi.mock("@/lib/safeAuth", () => ({
  getUserWithTimeout: vi.fn(async () => ({ id: "user-1" })),
  withTimeout: <T,>(p: PromiseLike<T>) => Promise.resolve(p),
}));

import { useLikeLimits } from "./useLikeLimits";
import { useSuperLikeLimits } from "./useSuperLikeLimits";

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

// Stand-in for a Browse page: many ProfileCards each calling both hooks.
function useManyCards(n: number) {
  const cards = [];
  for (let i = 0; i < n; i++) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    cards.push({ like: useLikeLimits(), superLike: useSuperLikeLimits() });
  }
  return cards;
}

describe("daily like / Super Like counts", () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockImplementation(async (name: string) => {
      if (name === "get_today_super_like_count") return { data: 2, error: null };
      if (name === "increment_super_like_count") return { data: 3, error: null };
      return { data: 0, error: null };
    });
  });

  it("fetches the Super Like count once for 50 cards, and never the unlimited like count", async () => {
    const { result } = renderHook(() => useManyCards(50), { wrapper: wrapper() });

    await waitFor(() => expect(result.current[0].superLike.isLoading).toBe(false));

    const calls = rpc.mock.calls.map((c) => c[0]);
    expect(calls.filter((n) => n === "get_today_super_like_count")).toHaveLength(1);
    // Everyone has unlimited likes (no paywall), so no like count is needed.
    expect(calls.filter((n) => n === "get_today_like_count")).toHaveLength(0);

    for (const card of result.current) {
      expect(card.like.canLike).toBe(true);
      expect(card.like.maxLikes).toBeNull();
      expect(card.superLike.remainingSuperLikes).toBe(3); // 5 - 2
      expect(card.superLike.canSuperLike).toBe(true);
    }
  });

  it("an increment from one card updates every card", async () => {
    const { result } = renderHook(() => useManyCards(5), { wrapper: wrapper() });
    await waitFor(() => expect(result.current[0].superLike.isLoading).toBe(false));

    await act(async () => {
      await result.current[0].superLike.incrementSuperLikeCount();
    });

    await waitFor(() => {
      for (const card of result.current) {
        expect(card.superLike.usedSuperLikes).toBe(3);
        expect(card.superLike.remainingSuperLikes).toBe(2);
      }
    });
  });

  it("an increment updates every card when no Super Likes were used yet today", async () => {
    // Starting from 0 means the count never changes while loading, so this
    // catches an increment callback still bound to the pre-auth (null user) key.
    rpc.mockImplementation(async (name: string) => {
      if (name === "get_today_super_like_count") return { data: 0, error: null };
      if (name === "increment_super_like_count") return { data: 1, error: null };
      return { data: 0, error: null };
    });
    const { result } = renderHook(() => useManyCards(3), { wrapper: wrapper() });
    await waitFor(() => expect(result.current[0].superLike.isLoading).toBe(false));

    await act(async () => {
      await result.current[0].superLike.incrementSuperLikeCount();
    });

    await waitFor(() => {
      for (const card of result.current) {
        expect(card.superLike.usedSuperLikes).toBe(1);
        expect(card.superLike.remainingSuperLikes).toBe(4);
      }
    });
  });

  it("disables Super Like on every card at the daily cap", async () => {
    rpc.mockImplementation(async () => ({ data: 5, error: null }));
    const { result } = renderHook(() => useManyCards(3), { wrapper: wrapper() });
    await waitFor(() => expect(result.current[0].superLike.isLoading).toBe(false));

    for (const card of result.current) {
      expect(card.superLike.canSuperLike).toBe(false);
      expect(card.superLike.remainingSuperLikes).toBe(0);
    }
  });

  it("treats a failed count as 0 used", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockImplementation(async () => ({ data: null, error: { message: "boom" } }));
    const { result } = renderHook(() => useManyCards(3), { wrapper: wrapper() });
    // One automatic retry (about 1s later), then it gives up.
    await waitFor(() => expect(result.current[0].superLike.isLoading).toBe(false), {
      timeout: 4000,
    });

    expect(result.current[0].superLike.remainingSuperLikes).toBe(5);
    expect(result.current[0].superLike.canSuperLike).toBe(true);
    // Shared across cards: 1 try + 1 retry, not 2 per card.
    expect(rpc).toHaveBeenCalledTimes(2);
  });
});
