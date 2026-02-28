import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

interface ProtectedRouteProps {
  children: ReactNode;
  /** When true, only ADMIN users may access this route. */
  adminOnly?: boolean;
}

/**
 * Route guard that redirects unauthenticated users to /login
 * and non-admin users to / when adminOnly is set.
 */
export function ProtectedRoute({
  children,
  adminOnly = false,
}: ProtectedRouteProps): React.JSX.Element {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
