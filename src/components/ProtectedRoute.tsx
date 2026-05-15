import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCurrentUser } from "@/contexts/CurrentUserContext";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isAdmin, isLoading } = useCurrentUser();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
