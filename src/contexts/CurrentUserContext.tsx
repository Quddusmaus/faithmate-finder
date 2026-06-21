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
  // True until the comped_users lookup has definitively resolved. Consumers that
  // gate on comp status (the paywall) MUST wait for this to be false before
  // acting, otherwise a comped user loses the race (isComped is false until the
  // query returns) and gets wrongly redirected to the subscription page.
  isCompLoading: boolean;
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
  // Dedicated comp-status loading flag. Starts true and is only flipped to false
  // once the comped_users query has resolved (found or not), so the paywall guard
  // never reads a premature isComped=false while the lookup is still in flight.
  const [isCompLoading, setIsCompLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setIsCompLoading(true);
      const currentUser = await getUserWithTimeout(3000);

      if (cancelled) return;

      if (!currentUser) {
        // Auth has resolved to "no user". There is nothing to look up, so clear
        // every loading flag (including comp) — ProtectedRoute will redirect to
        // /auth from here.
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
        setIsComped(false);
        setIsLoading(false);
        setIsCompLoading(false);
        return;
      }

      setUser(currentUser);

      // Comp status resolves on its own (not bundled into the Promise.all below)
      // so the paywall guard, which keys off isCompLoading, releases the moment
      // comp status is known — independent of the potentially slower profile and
      // admin lookups. It still retries on transient failure so a flaky lookup
      // never resolves to a false negative that would wrongly gate a comped user.
      queryWithRetry(
        () =>
          supabase
            .from("comped_users")
            .select("id")
            .eq("user_id", currentUser.id)
            .maybeSingle(),
        "Comp status check",
      ).then((compRes) => {
        if (cancelled) return;
        setIsComped(!!compRes?.data);
        setIsCompLoading(false);
      });

      // Profile and admin lookups run in parallel — each retries on its own
      // transient failure so a single slow/flaky query never silently resolves
      // to a false negative.
      const [profileRes, adminRes] = await Promise.all([
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
      ]);

      if (cancelled) return;

      setProfile((profileRes?.data as CurrentUserProfile) ?? null);
      setIsAdmin(!!adminRes?.data);
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
        setIsCompLoading(false);
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
        compLoading: isCompLoading,
        isCompLoading,
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
      isCompLoading: true,
      refresh: () => {},
    } as CurrentUserState;
  }
  return ctx;
}
