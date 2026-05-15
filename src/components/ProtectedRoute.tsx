import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getUserWithTimeout } from "@/lib/safeAuth";
import { useCurrentUser } from "@/contexts/CurrentUserContext";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

// Auth gate is driven by a direct local-session check rather than
// CurrentUserContext: that context can briefly resolve to user=null /
// isLoading=false right after sign-in while it re-fetches profile/admin/comp
// in parallel, which would otherwise bounce a just-signed-in user back to
// /auth. getUserWithTimeout reads localStorage first, so the check is instant
// when a valid session exists.
export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const { isAdmin, isLoading: contextLoading } = useCurrentUser();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const user = await getUserWithTimeout(5000);
      if (!cancelled) setHasSession(!!user);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setHasSession(false);
      if (event === "SIGNED_IN") setHasSession(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  if (hasSession === null) {
    return null;
  }

  if (!hasSession) {
    return <Navigate to="/auth" replace />;
  }

  if (requireAdmin) {
    if (contextLoading) return null;
    if (!isAdmin) return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
