import { useCurrentUser } from "@/contexts/CurrentUserContext";

/**
 * Backwards-compatible wrapper around the shared CurrentUserContext.
 * All comp-status lookups now share a single network request per session.
 */
export function useCompStatus() {
  const { isComped, isCompLoading } = useCurrentUser();
  return { isComped, isLoading: isCompLoading };
}
