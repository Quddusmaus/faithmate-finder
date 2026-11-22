import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getUserWithTimeout, withTimeout } from '@/lib/safeAuth';

/**
 * Today's like / Super Like count, shared by every component on the page.
 *
 * Browse renders one ProfileCard per member, and each card used to fetch these
 * counts itself — about 160 RPCs per Browse load with ~120 profiles. On a slow
 * database that flood starved the page's real requests until they timed out.
 *
 * The counts now live in the React Query cache under one key per user, so all
 * cards share a single request (and a single number). Incrementing writes the
 * new value straight into the cache, so every card sees it immediately.
 */

export type DailyCountRpc = 'get_today_like_count' | 'get_today_super_like_count';

// The signed-in user can only change by signing in/out, which reloads most
// pages anyway; a short staleTime keeps that correct without re-checking auth
// on every card mount. getUserWithTimeout reads localStorage first, so it's cheap.
const AUTH_STALE_MS = 30_000;
// Counts only change through this hook (which updates the cache) or from the
// same account in another tab, so they don't need re-fetching per card mount.
const COUNT_STALE_MS = 5 * 60_000;

export function useAuthUserId(): { userId: string | null; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['auth-user-id'],
    queryFn: async () => {
      const user = await getUserWithTimeout(5000);
      return user?.id ?? null;
    },
    staleTime: AUTH_STALE_MS,
    retry: false,
  });
  return { userId: data ?? null, isLoading };
}

export function dailyCountKey(rpc: DailyCountRpc, userId: string | null) {
  return ['daily-count', rpc, userId] as const;
}

export function useDailyCount(rpc: DailyCountRpc, enabled: boolean) {
  const queryClient = useQueryClient();
  const { userId, isLoading: authLoading } = useAuthUserId();
  const key = dailyCountKey(rpc, userId);

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await withTimeout<{ data: unknown; error: unknown }>(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase.rpc(rpc as any, { p_user_id: userId }) as any,
        5000,
        `${rpc} timed out`,
      );
      if (error) {
        // Logged once per fetch (not per card); a failed count reads as 0 used,
        // same as before.
        console.error(`Error fetching ${rpc}:`, error);
        throw error;
      }
      return typeof data === 'number' ? data : 0;
    },
    enabled: enabled && !!userId,
    staleTime: COUNT_STALE_MS,
    retry: 1,
  });

  const setCount = useCallback(
    (value: number) => queryClient.setQueryData(dailyCountKey(rpc, userId), value),
    [queryClient, rpc, userId],
  );

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['auth-user-id'] });
    await queryClient.invalidateQueries({ queryKey: ['daily-count', rpc] });
  }, [queryClient, rpc]);

  return {
    count: query.data ?? 0,
    userId,
    // Disabled queries never load; only report loading while a fetch is pending.
    isLoading: authLoading || (enabled && !!userId && query.isPending),
    setCount,
    refresh,
  };
}
