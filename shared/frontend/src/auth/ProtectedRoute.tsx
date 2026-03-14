import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

interface ProtectedRouteProps {
  children: ReactNode;
  /** When true, only ADMIN users may access this route. */
  adminOnly?: boolean;
}

/**
 * Route guard that redirects unauthenticated users to /login (Authinator)
 * and non-admin users to / when adminOnly is set.
 *
 * Uses window.location.href for login redirect so all inators
 * redirect to Authinator's login page regardless of their own basename.
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
    // Hard redirect to Authinator login — not React Router navigate,
    // because /login lives in Authinator, not the current inator.
    window.location.href = '/login';
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Redirecting to login…</p>
      </div>
    );
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
