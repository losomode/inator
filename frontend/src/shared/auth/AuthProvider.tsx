import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import apiClient, { getToken, setToken, clearToken } from '../api/client';
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
      // Add cache-busting to ensure fresh data after login/user switch
      const response = await apiClient.get<User>('/auth/me/', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      const authUser = response.data;

      // Enrich with USERinator profile data (best-effort)
      try {
        const profileResp = await apiClient.get<{
          role_level?: number;
          role_name?: string;
          display_name?: string;
          company?: { name: string };
        }>('/users/me/', {
          headers: { 'Cache-Control': 'no-cache' },
        });
        authUser.role_level = profileResp.data.role_level;
        authUser.role_name = profileResp.data.role_name;
        authUser.display_name = profileResp.data.display_name;
        authUser.company_name = profileResp.data.company?.name;
      } catch {
        // USERinator profile not available — proceed with Authinator data only
      }

      setUser(authUser);
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
    
    // Clear all tokens and storage
    clearToken();
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear user state
    setUser(null);
    
    // Force reload to clear any in-memory caches
    window.location.href = '/login';
  }, []);

  /**
   * Capture SSO token from URL parameter after OAuth redirect.
   * The backend redirects to /?token=ACCESS_TOKEN after successful SSO login.
   */
  const captureTokenFromUrl = useCallback((): void => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (token) {
      // Save token to localStorage
      setToken(token);
      
      // Remove token from URL to avoid exposing it
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url.toString());
      
      // Fetch user info with the new token
      void fetchUser();
    }
  }, [fetchUser]);

  useEffect(() => {
    // First check for SSO token in URL
    captureTokenFromUrl();
    // Then fetch user if token exists in localStorage
    void fetchUser();
  }, [fetchUser, captureTokenFromUrl]);

  const isAdmin = (user?.role_level != null && user.role_level >= 100) || user?.role === 'ADMIN';
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
