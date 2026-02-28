import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock shared api client to prevent real HTTP calls
vi.mock('./shared/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  getToken: vi.fn(() => 'mock-token'),
  clearToken: vi.fn(),
}));

// Mock AuthProvider to control auth state
const mockUser = { id: 1, username: 'admin', email: 'a@b.com', role: 'ADMIN', customer: null };
const mockAuthValue = {
  user: mockUser,
  loading: false,
  isAdmin: true,
  isAuthenticated: true,
  fetchUser: vi.fn(),
  logout: vi.fn(),
};
vi.mock('./shared/auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: vi.fn(() => mockAuthValue),
}));

// Mock module API layers to prevent API calls during lazy loading
vi.mock('./modules/auth/api', () => ({
  authApi: { login: vi.fn(), ssoProviders: vi.fn(() => Promise.resolve([])) },
  servicesApi: { list: vi.fn(() => Promise.resolve([])) },
  totpApi: {
    status: vi.fn(() => Promise.resolve({ enabled: false })),
    setup: vi.fn(),
    confirm: vi.fn(),
    disable: vi.fn(),
  },
  mfaApi: { totpVerify: vi.fn(), webauthnBegin: vi.fn(), webauthnComplete: vi.fn() },
  webauthnApi: {
    listCredentials: vi.fn(() => Promise.resolve([])),
    registerBegin: vi.fn(),
    registerComplete: vi.fn(),
    deleteCredential: vi.fn(),
  },
}));

vi.mock('./modules/rma/api', () => ({
  rmaApi: {
    list: vi.fn(() => Promise.resolve([])),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateState: vi.fn(),
    createGroup: vi.fn(),
    search: vi.fn(),
    getAdminDashboard: vi.fn(() =>
      Promise.resolve({
        summary: { total_rmas: 0, active_rmas: 0, archived_rmas: 0, stale_rmas_count: 0 },
        state_counts: {},
        priority_counts: {},
        trends: { last_7_days: 0, last_30_days: 0, last_90_days: 0 },
        stale_rmas: [],
        recent_activity: [],
      }),
    ),
  },
  staleConfigApi: {
    list: vi.fn(() => Promise.resolve([])),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('./modules/fulfil/api', () => ({
  itemsApi: {
    list: vi.fn(() => Promise.resolve([])),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  posApi: {
    list: vi.fn(() => Promise.resolve([])),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    close: vi.fn(),
    waive: vi.fn(),
  },
  ordersApi: {
    list: vi.fn(() => Promise.resolve([])),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    close: vi.fn(),
  },
  deliveriesApi: {
    list: vi.fn(() => Promise.resolve([])),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    close: vi.fn(),
    searchSerial: vi.fn(),
  },
  attachmentsApi: { list: vi.fn(() => Promise.resolve([])), upload: vi.fn(), delete: vi.fn() },
}));

import { useAuth } from './shared/auth/AuthProvider';
import type { AuthContextValue } from './shared/auth/AuthProvider';
import App from './App';

function renderApp(path = '/'): ReturnType<typeof render> {
  window.history.pushState({}, '', path);
  return render(<App />);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue(mockAuthValue as AuthContextValue);
});

describe('App routing', () => {
  it('renders login page at /login without auth', async () => {
    vi.mocked(useAuth).mockReturnValue({
      ...mockAuthValue,
      user: null,
      isAuthenticated: false,
      isAdmin: false,
    } as AuthContextValue);
    renderApp('/login');
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /AUTHinator/i })).toBeInTheDocument(),
    );
  });

  it('redirects unauthenticated users to /login', async () => {
    vi.mocked(useAuth).mockReturnValue({
      ...mockAuthValue,
      user: null,
      isAuthenticated: false,
      isAdmin: false,
    } as AuthContextValue);
    renderApp('/');
    await waitFor(() => expect(window.location.pathname).toBe('/login'));
  });

  it('renders home page for authenticated users', async () => {
    renderApp('/');
    await waitFor(() => expect(screen.getByText('Your Services')).toBeInTheDocument());
  });

  it('renders profile page for authenticated users', async () => {
    renderApp('/profile');
    await waitFor(() => expect(screen.getByText(/Profile/)).toBeInTheDocument());
  });

  it('renders RMA dashboard with layout for authenticated users', async () => {
    renderApp('/rma');
    await waitFor(() => expect(screen.getByText('RMAinator')).toBeInTheDocument());
    expect(screen.getByText('My RMAs')).toBeInTheDocument();
  });

  it('renders fulfil items page with layout', async () => {
    renderApp('/fulfil/items');
    await waitFor(() => expect(screen.getByText('FULFILinator')).toBeInTheDocument());
  });

  it('shows RMA sidebar nav for admin users', async () => {
    renderApp('/rma');
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
    expect(screen.getByText('Create RMA')).toBeInTheDocument();
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    expect(screen.getByText('RMA Management')).toBeInTheDocument();
    expect(screen.getByText('Stale Config')).toBeInTheDocument();
  });

  it('hides admin nav items for non-admin users', async () => {
    vi.mocked(useAuth).mockReturnValue({
      ...mockAuthValue,
      user: { ...mockUser, role: 'USER' },
      isAdmin: false,
    } as AuthContextValue);
    renderApp('/rma');
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
    expect(screen.getByText('Create RMA')).toBeInTheDocument();
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('RMA Management')).not.toBeInTheDocument();
  });

  it('redirects non-admin from admin-only route to /', async () => {
    vi.mocked(useAuth).mockReturnValue({
      ...mockAuthValue,
      user: { ...mockUser, role: 'USER' },
      isAdmin: false,
    } as AuthContextValue);
    renderApp('/rma/admin');
    await waitFor(() => expect(window.location.pathname).toBe('/'));
  });

  it('shows fulfil sidebar nav items', async () => {
    renderApp('/fulfil/items');
    await waitFor(() => expect(screen.getByText('Items')).toBeInTheDocument());
    expect(screen.getByText('Purchase Orders')).toBeInTheDocument();
    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.getByText('Deliveries')).toBeInTheDocument();
  });

  it('shows loading state during auth loading', async () => {
    vi.mocked(useAuth).mockReturnValue({
      ...mockAuthValue,
      user: null,
      loading: true,
      isAuthenticated: false,
    } as AuthContextValue);
    renderApp('/');
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });
});
