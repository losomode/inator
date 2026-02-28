import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Home } from './Home';

const mockLogout = vi.fn();
vi.mock('../../../shared/auth/AuthProvider', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      username: 'admin',
      email: 'a@t.com',
      role: 'ADMIN',
      customer: { id: 1, name: 'Acme' },
    },
    logout: mockLogout,
  }),
}));

vi.mock('../api', () => ({
  servicesApi: { list: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
}

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', async () => {
    const { servicesApi } = await import('../api');
    vi.mocked(servicesApi.list).mockImplementation(() => new Promise(() => {}));
    renderHome();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays services after loading', async () => {
    const { servicesApi } = await import('../api');
    vi.mocked(servicesApi.list).mockResolvedValue([
      {
        id: 1,
        name: 'RMAinator',
        description: 'RMA tracking',
        ui_url: 'http://localhost:3002',
        icon: '🔧',
        is_active: true,
        last_registered_at: '2024-01-01',
      },
    ]);

    renderHome();

    await waitFor(() => {
      expect(screen.getByText('RMAinator')).toBeInTheDocument();
    });
    expect(screen.getByText('RMA tracking')).toBeInTheDocument();
    expect(screen.getByText('🔧')).toBeInTheDocument();
  });

  it('renders known services as in-app links', async () => {
    const { servicesApi } = await import('../api');
    vi.mocked(servicesApi.list).mockResolvedValue([
      {
        id: 1,
        name: 'RMAinator',
        description: 'RMA',
        ui_url: 'http://old',
        icon: '🔧',
        is_active: true,
        last_registered_at: '',
      },
    ]);

    renderHome();

    await waitFor(() => {
      expect(screen.getByText('RMAinator')).toBeInTheDocument();
    });

    const link = screen.getByText('Open Service').closest('a');
    expect(link).toHaveAttribute('href', '/rma');
  });

  it('renders unknown services as external links', async () => {
    const { servicesApi } = await import('../api');
    vi.mocked(servicesApi.list).mockResolvedValue([
      {
        id: 2,
        name: 'NewInator',
        description: 'New',
        ui_url: 'http://external.com',
        icon: '🆕',
        is_active: true,
        last_registered_at: '',
      },
    ]);

    renderHome();

    await waitFor(() => {
      expect(screen.getByText('NewInator')).toBeInTheDocument();
    });

    const link = screen.getByText('Open Service ↗').closest('a');
    expect(link).toHaveAttribute('href', 'http://external.com');
  });

  it('shows empty state when no services', async () => {
    const { servicesApi } = await import('../api');
    vi.mocked(servicesApi.list).mockResolvedValue([]);

    renderHome();

    await waitFor(() => {
      expect(screen.getByText('No services registered yet')).toBeInTheDocument();
    });
  });

  it('shows error on API failure', async () => {
    const { servicesApi } = await import('../api');
    vi.mocked(servicesApi.list).mockRejectedValue({
      response: { data: { detail: 'Server error' } },
    });

    renderHome();

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });

  it('displays user info and header', async () => {
    const { servicesApi } = await import('../api');
    vi.mocked(servicesApi.list).mockResolvedValue([]);

    renderHome();

    await waitFor(() => {
      expect(screen.getByText('Your Services')).toBeInTheDocument();
    });
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Service Directory')).toBeInTheDocument();
  });

  it('navigates to /profile on Profile button', async () => {
    const { servicesApi } = await import('../api');
    vi.mocked(servicesApi.list).mockResolvedValue([]);

    renderHome();

    await waitFor(() => {
      expect(screen.getByText('⚙ Profile')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('⚙ Profile'));
    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });

  it('calls logout on Logout button', async () => {
    const { servicesApi } = await import('../api');
    vi.mocked(servicesApi.list).mockResolvedValue([]);

    renderHome();

    await waitFor(() => {
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Logout'));
    expect(mockLogout).toHaveBeenCalledOnce();
  });
});
