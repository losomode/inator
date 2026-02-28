import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import apiClient, { getToken, clearToken } from '../api/client';
import type { User } from '../types';

/** Shape of the auth context value. */
export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  fetchUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Provides authentication state to the entire app.
 * Fetches the current user from Authinator on mount if a token exists.
 */
export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async (): Promise<void> => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.get<User>('/auth/me/');
      setUser(response.data);
    } catch {
      // Token invalid — clear it, user will be redirected by interceptor
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback((): void => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      apiClient.post('/auth/logout/', { refresh: refreshToken }).catch(() => {
        // Best-effort logout on server
      });
    }
    clearToken();
    localStorage.removeItem('refresh_token');
    setUser(null);
  }, []);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  const isAdmin = user?.role === 'ADMIN';
  const isAuthenticated = user !== null;

  const value: AuthContextValue = {
    user,
    loading,
    isAdmin,
    isAuthenticated,
    fetchUser,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context. Must be used within AuthProvider.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
