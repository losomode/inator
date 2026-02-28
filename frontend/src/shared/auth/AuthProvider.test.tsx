import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthProvider';
import apiClient, { clearToken, getToken } from '../api/client';
import type { User } from '../types';

// Mock the API client module
vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    default: {
      get: vi.fn(),
      post: vi.fn(),
    },
    getToken: vi.fn(),
    setToken: actual.setToken,
    clearToken: vi.fn(),
  };
});

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);
const mockGetToken = vi.mocked(getToken);
const mockClearToken = vi.mocked(clearToken);

const testUser: User = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  role: 'USER',
  customer: { id: 10, name: 'Acme Corp' },
};

const adminUser: User = {
  id: 2,
  username: 'admin',
  email: 'admin@example.com',
  role: 'ADMIN',
  customer: null,
};

/** Helper component that exposes auth context values for testing. */
function AuthConsumer(): React.JSX.Element {
  const { user, loading, isAdmin, isAuthenticated, logout, fetchUser } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="admin">{String(isAdmin)}</span>
      <span data-testid="username">{user?.username ?? 'none'}</span>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
      <button data-testid="fetch-btn" onClick={() => void fetchUser()}>
        Fetch
      </button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets loading=false and user=null when no token exists', async () => {
    mockGetToken.mockReturnValue(null);

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('username').textContent).toBe('none');
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('fetches user on mount when token exists', async () => {
    mockGetToken.mockReturnValue('valid-token');
    mockGet.mockResolvedValue({ data: testUser });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('username').textContent).toBe('testuser');
    expect(screen.getByTestId('admin').textContent).toBe('false');
    expect(mockGet).toHaveBeenCalledWith('/auth/me/');
  });

  it('sets isAdmin=true for ADMIN users', async () => {
    mockGetToken.mockReturnValue('admin-token');
    mockGet.mockResolvedValue({ data: adminUser });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('admin').textContent).toBe('true');
    expect(screen.getByTestId('username').textContent).toBe('admin');
  });

  it('clears user when /auth/me/ fails', async () => {
    mockGetToken.mockReturnValue('expired-token');
    mockGet.mockRejectedValue(new Error('401 Unauthorized'));

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('username').textContent).toBe('none');
  });

  it('logout clears token, refresh_token, and user state', async () => {
    mockGetToken.mockReturnValue('valid-token');
    mockGet.mockResolvedValue({ data: testUser });
    mockPost.mockResolvedValue({ data: {} });
    localStorage.setItem('refresh_token', 'refresh-123');

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });

    await act(async () => {
      screen.getByTestId('logout-btn').click();
    });

    expect(mockClearToken).toHaveBeenCalled();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('username').textContent).toBe('none');
    expect(mockPost).toHaveBeenCalledWith('/auth/logout/', { refresh: 'refresh-123' });
  });

  it('logout works without refresh_token', async () => {
    mockGetToken.mockReturnValue('valid-token');
    mockGet.mockResolvedValue({ data: testUser });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });

    await act(async () => {
      screen.getByTestId('logout-btn').click();
    });

    expect(mockClearToken).toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });

  it('logout handles server logout failure gracefully', async () => {
    mockGetToken.mockReturnValue('valid-token');
    mockGet.mockResolvedValue({ data: testUser });
    mockPost.mockRejectedValue(new Error('Network error'));
    localStorage.setItem('refresh_token', 'refresh-456');

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });

    await act(async () => {
      screen.getByTestId('logout-btn').click();
    });

    // User is still logged out locally even if server call fails
    expect(mockClearToken).toHaveBeenCalled();
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });

  it('fetchUser can re-fetch user data', async () => {
    mockGetToken.mockReturnValue('valid-token');
    mockGet.mockResolvedValue({ data: testUser });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('username').textContent).toBe('testuser');
    });

    // Simulate user data change
    mockGet.mockResolvedValue({ data: adminUser });

    await act(async () => {
      screen.getByTestId('fetch-btn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('username').textContent).toBe('admin');
    });
    expect(screen.getByTestId('admin').textContent).toBe('true');
  });

  it('renders children', async () => {
    mockGetToken.mockReturnValue(null);

    render(
      <AuthProvider>
        <div data-testid="child">Hello</div>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('child').textContent).toBe('Hello');
    });
  });
});

describe('useAuth', () => {
  it('throws when used outside AuthProvider', () => {
    // Suppress console.error for expected error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    function BadConsumer(): React.JSX.Element {
      useAuth();
      return <div />;
    }

    expect(() => render(<BadConsumer />)).toThrow('useAuth must be used within an AuthProvider');

    spy.mockRestore();
  });
});
