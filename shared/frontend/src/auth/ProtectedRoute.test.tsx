import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

const mockUseAuth = vi.fn();
vi.mock('./AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

function renderRoute(adminOnly = false) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <ProtectedRoute adminOnly={adminOnly}>
        <div data-testid="content">Protected Content</div>
      </ProtectedRoute>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true, isAdmin: false });
    renderRoute();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false, isAdmin: false });
    renderRoute();
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, username: 'test', role: 'USER' },
      loading: false,
      isAdmin: false,
    });
    renderRoute();
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('renders children for admin user on adminOnly route', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 2, username: 'admin', role: 'ADMIN' },
      loading: false,
      isAdmin: true,
    });
    renderRoute(true);
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('redirects non-admin user away from adminOnly route', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, username: 'test', role: 'USER' },
      loading: false,
      isAdmin: false,
    });
    renderRoute(true);
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });

  it('defaults adminOnly to false', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, username: 'test', role: 'USER' },
      loading: false,
      isAdmin: false,
    });
    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div data-testid="content">OK</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });
});
