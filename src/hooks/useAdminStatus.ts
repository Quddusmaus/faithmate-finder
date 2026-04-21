import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getUserWithTimeout, withTimeout } from "@/lib/safeAuth";

export const useAdminStatus = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const user = await getUserWithTimeout(5000);
        
        if (!user) {
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        const { data, error } = await withTimeout(
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .maybeSingle(),
          5000,
          'Admin status check timed out',
        );

        if (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        } else {
          setIsAdmin(!!data);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setIsLoading(true);
      checkAdminStatus();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { isAdmin, isLoading };
};
