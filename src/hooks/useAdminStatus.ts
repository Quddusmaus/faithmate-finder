import { useCurrentUser } from "@/contexts/CurrentUserContext";

/**
 * Backwards-compatible wrapper around the shared CurrentUserContext.
 * All admin lookups now share a single network request per session.
 */
export const useAdminStatus = () => {
  const { isAdmin, adminLoading } = useCurrentUser();
  return { isAdmin, isLoading: adminLoading };
};
