import { useCurrentUser } from "@/contexts/CurrentUserContext";

/**
 * Backwards-compatible wrapper around the shared CurrentUserContext.
 * All current-profile lookups now share a single network request per session.
 */
export const useCurrentUserProfile = () => {
  const { profile, profileLoading } = useCurrentUser();
  return { profile, loading: profileLoading };
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
