import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getUserWithTimeout, withTimeout } from "@/lib/safeAuth";

interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  interests: string[];
}

export const useCurrentUserProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = await getUserWithTimeout(5000);
        
        if (!user) {
          setLoading(false);
          return;
        }

        const { data } = await withTimeout(
          supabase
            .from("profiles")
            .select("id, user_id, name, interests")
            .eq("user_id", user.id)
            .maybeSingle(),
          5000,
          'Current profile request timed out',
        );

        setProfile(data);
      } catch (error) {
        console.error('Error fetching current user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  return { profile, loading };
};

export const calculateCompatibility = (
  userInterests: string[],
  otherInterests: string[]
): { score: number; shared: string[]; total: number } => {
  if (!userInterests?.length || !otherInterests?.length) {
    return { score: 0, shared: [], total: 0 };
  }

  const shared = userInterests.filter((interest) =>
    otherInterests.includes(interest)
  );

  const totalUnique = new Set([...userInterests, ...otherInterests]).size;
  const score = totalUnique > 0 ? Math.round((shared.length / totalUnique) * 100) : 0;

  return { score, shared, total: shared.length };
};
