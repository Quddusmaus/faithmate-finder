import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getUserWithTimeout, withTimeout } from "@/lib/safeAuth";

interface CurrentUserProfile {
  id: string;
  user_id: string;
  name: string;
  interests: string[];
}

interface CurrentUserState {
  user: User | null;
  profile: CurrentUserProfile | null;
  isAdmin: boolean;
  isComped: boolean;
  isLoading: boolean;
  // Granular flags so consumers can show partial UI
  profileLoading: boolean;
  adminLoading: boolean;
  compLoading: boolean;
  refresh: () => void;
}

const CurrentUserContext = createContext<CurrentUserState | null>(null);

const QUERY_TIMEOUT = 3000;
const QUERY_ATTEMPTS = 3;

type QueryResult<T> = { data: T | null; error: unknown };

/**
 * Run a Supabase lookup with a per-attempt timeout, retrying on transient
 * failure (timeout / network / RLS hiccup). A successful response that simply
 * has no matching row (data: null, error: null) is NOT retried — that's a
 * legitimate "no record" answer. Returns null only after every attempt fails,
 * so callers can tell "definitely absent" from "could not determine".
 */
async function queryWithRetry<T>(
  run: () => PromiseLike<QueryResult<T>>,
  label: string,
  attempts = QUERY_ATTEMPTS,
): Promise<QueryResult<T> | null> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await withTimeout(run(), QUERY_TIMEOUT, `${label} timed out`);
      if (res.error) throw res.error;
      return res;
    } catch (e) {
      if (attempt === attempts) {
        console.error(`CurrentUser: ${label} failed after ${attempts} attempts`, e);
        return null;
      }
      // Brief linear backoff before retrying.
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
    }
  }
  return null;
}

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isComped, setIsComped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      const currentUser = await getUserWithTimeout(3000);

      if (cancelled) return;

      if (!currentUser) {
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
        setIsComped(false);
        setIsLoading(false);
        return;
      }

      setUser(currentUser);

      // Run all three lookups in parallel — each retries on its own transient
      // failure so a single slow/flaky query never silently resolves to a
      // false negative (which, for comp status, would wrongly gate a comped
      // user behind the paywall).
      const [profileRes, adminRes, compRes] = await Promise.all([
        queryWithRetry(
          () =>
            supabase
              .from("profiles")
              .select("id, user_id, name, interests")
              .eq("user_id", currentUser.id)
              .maybeSingle(),
          "Profile request",
        ),
        queryWithRetry(
          () =>
            supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", currentUser.id)
              .eq("role", "admin")
              .maybeSingle(),
          "Admin status check",
        ),
        queryWithRetry(
          () =>
            supabase
              .from("comped_users")
              .select("id")
              .eq("user_id", currentUser.id)
              .maybeSingle(),
          "Comp status check",
        ),
      ]);

      if (cancelled) return;

      setProfile((profileRes?.data as CurrentUserProfile) ?? null);
      setIsAdmin(!!adminRes?.data);
      setIsComped(!!compRes?.data);
      setIsLoading(false);
    };

    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
        setIsComped(false);
        setIsLoading(false);
      } else if (event === "SIGNED_IN") {
        setRefreshKey((k) => k + 1);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <CurrentUserContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        isComped,
        isLoading,
        profileLoading: isLoading,
        adminLoading: isLoading,
        compLoading: isLoading,
        refresh,
      }}
    >
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    return {
      user: null,
      profile: null,
      isAdmin: false,
      isComped: false,
      isLoading: true,
      profileLoading: true,
      adminLoading: true,
      compLoading: true,
      refresh: () => {},
    } as CurrentUserState;
  }
  return ctx;
}
