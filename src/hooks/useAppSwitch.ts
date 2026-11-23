import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/safeAuth";

export type AppSwitchKey = "video_calls";

/**
 * A missing row, a missing table (database not migrated yet) or a failed
 * request all count as "on", so a hiccup never takes a feature away.
 */
export function resolveSwitch(row: { enabled?: unknown } | null | undefined): boolean {
  return row?.enabled !== false;
}

const queryKey = (key: AppSwitchKey) => ["app_settings", key] as const;

/** Reads an admin on/off switch from `app_settings` (see 20261123010000). */
export function useAppSwitch(key: AppSwitchKey) {
  const query = useQuery({
    queryKey: queryKey(key),
    queryFn: async () => {
      try {
        const { data, error } = await withTimeout<{ data: { enabled?: unknown } | null; error: unknown }>(
          // app_settings is newer than the generated types
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from("app_settings").select("enabled").eq("key", key).maybeSingle(),
          8000,
          "App settings request timed out",
        );
        return error ? true : resolveSwitch(data);
      } catch {
        return true;
      }
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
  return { enabled: query.data ?? true, isLoading: query.isLoading };
}

/** Admin-only: flips a switch. RLS rejects anyone who is not an admin. */
export function useSetAppSwitch(key: AppSwitchKey) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { data: auth } = await supabase.auth.getUser();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("app_settings")
        .update({ enabled, updated_at: new Date().toISOString(), updated_by: auth.user?.id ?? null })
        .eq("key", key)
        .select("enabled");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Setting not found or not allowed");
      return enabled;
    },
    onSuccess: (enabled) => client.setQueryData(queryKey(key), enabled),
  });
}
