import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("id, user_id, name, interests")
        .eq("user_id", user.id)
        .maybeSingle();

      setProfile(data);
      setLoading(false);
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
