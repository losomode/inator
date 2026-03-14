import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from './Layout';
import type { NavItem } from '../types';

const mockLogout = vi.fn();
const mockUseAuth = vi.fn();
vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

const sampleNav: NavItem[] = [
  { path: '/rma/dashboard', label: 'Dashboard' },
  { path: '/rma/new', label: 'New RMA' },
  { path: '/rma/admin', label: 'Admin', adminOnly: true },
];

function renderLayout(navItems: NavItem[] = sampleNav, initialPath = '/rma/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Layout title="🔧 RMAinator" subtitle="RMA Tracking" navItems={navItems}>
        <div data-testid="content">Page Content</div>
      </Layout>
    </MemoryRouter>,
  );
}

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'USER',
        customer: null,
      },
      isAdmin: false,
      logout: mockLogout,
    });
  });

  it('renders title and subtitle', () => {
    renderLayout();
    expect(screen.getByText('🔧 RMAinator')).toBeInTheDocument();
    expect(screen.getByText('RMA Tracking')).toBeInTheDocument();
  });

  it('renders without subtitle when not provided', () => {
    render(
      <MemoryRouter>
        <Layout title="Test" navItems={[]}>
          <div />
        </Layout>
      </MemoryRouter>,
    );
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('renders non-admin nav items for regular users', () => {
    renderLayout();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('New RMA')).toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  it('renders admin nav items for admin users', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 2, username: 'admin', email: 'admin@example.com', role: 'ADMIN', customer: null },
      isAdmin: true,
      logout: mockLogout,
    });
    renderLayout();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('New RMA')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('highlights active nav item', () => {
    renderLayout(sampleNav, '/rma/dashboard');
    const dashboardLink = screen.getByText('Dashboard');
    expect(dashboardLink.className).toContain('bg-blue-50');
    expect(dashboardLink.className).toContain('text-blue-700');
  });

  it('does not highlight inactive nav items', () => {
    renderLayout(sampleNav, '/rma/dashboard');
    const newRmaLink = screen.getByText('New RMA');
    expect(newRmaLink.className).not.toContain('bg-blue-50');
    expect(newRmaLink.className).toContain('text-gray-600');
  });

  it('displays user info', () => {
    renderLayout();
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('shows Home and Logout buttons when user is present', () => {
    renderLayout();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('calls logout when Logout button is clicked', () => {
    renderLayout();
    fireEvent.click(screen.getByText('Logout'));
    expect(mockLogout).toHaveBeenCalledOnce();
  });

  it('Home link points to /', () => {
    renderLayout();
    const homeLink = screen.getByText('Home');
    expect(homeLink.closest('a')).toHaveAttribute('href', '/');
  });

  it('hides user info block when no user', () => {
    mockUseAuth.mockReturnValue({ user: null, isAdmin: false, logout: mockLogout });
    renderLayout();
    expect(screen.queryByText('testuser')).not.toBeInTheDocument();
    expect(screen.queryByText('Logout')).not.toBeInTheDocument();
  });

  it('renders children content', () => {
    renderLayout();
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.getByText('Page Content')).toBeInTheDocument();
  });
});
