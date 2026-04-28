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

      // Run all three lookups in parallel — each fails fast on its own timeout
      // so a single slow query never blocks the others.
      const [profileRes, adminRes, compRes] = await Promise.all([
        withTimeout(
          supabase
            .from("profiles")
            .select("id, user_id, name, interests")
            .eq("user_id", currentUser.id)
            .maybeSingle(),
          QUERY_TIMEOUT,
          "Profile request timed out",
        ).catch((e) => {
          console.error("CurrentUser: profile fetch failed", e);
          return { data: null, error: e } as any;
        }),
        withTimeout(
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", currentUser.id)
            .eq("role", "admin")
            .maybeSingle(),
          QUERY_TIMEOUT,
          "Admin status check timed out",
        ).catch((e) => {
          console.error("CurrentUser: admin check failed", e);
          return { data: null, error: e } as any;
        }),
        withTimeout(
          supabase
            .from("comped_users")
            .select("id")
            .eq("user_id", currentUser.id)
            .maybeSingle(),
          QUERY_TIMEOUT,
          "Comp status check timed out",
        ).catch((e) => {
          console.error("CurrentUser: comp check failed", e);
          return { data: null, error: e } as any;
        }),
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
