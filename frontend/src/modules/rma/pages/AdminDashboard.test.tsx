import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminDashboard } from './AdminDashboard';

vi.mock('../api', () => ({
  rmaApi: { getAdminDashboard: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import type { AdminDashboardMetrics } from '../types';

const mockMetrics: AdminDashboardMetrics = {
  summary: { total_rmas: 50, active_rmas: 30, archived_rmas: 20, stale_rmas_count: 5 },
  state_counts: {
    SUBMITTED: 10,
    APPROVED: 5,
    RECEIVED: 8,
    DIAGNOSED: 3,
    REPAIRED: 2,
    REPLACED: 0,
    SHIPPED: 1,
    COMPLETED: 18,
    REJECTED: 3,
  },
  priority_counts: { LOW: 10, NORMAL: 25, HIGH: 15 },
  trends: { last_7_days: 12, last_30_days: 35, last_90_days: 50 },
  stale_rmas: [
    {
      id: 1,
      rma_number: '001',
      serial_number: 'SN-1',
      state: 'SUBMITTED',
      priority: 'HIGH',
      days_in_state: 10,
    },
  ],
  recent_activity: [
    {
      rma_number: '002',
      serial_number: 'SN-2',
      from_state: null,
      to_state: 'SUBMITTED',
      changed_by: 'admin',
      changed_at: '2024-01-01T00:00:00Z',
      notes: null,
    },
  ],
};

function renderAdmin() {
  return render(
    <MemoryRouter>
      <AdminDashboard />
    </MemoryRouter>,
  );
}

describe('AdminDashboard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows loading state', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.getAdminDashboard).mockImplementation(() => new Promise(() => {}));
    renderAdmin();
    expect(screen.getByText('Loading metrics...')).toBeInTheDocument();
  });

  it('displays summary metrics', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.getAdminDashboard).mockResolvedValue(mockMetrics);
    renderAdmin();

    await waitFor(() => {
      expect(screen.getByText('Total RMAs')).toBeInTheDocument();
    });
    expect(screen.getByText('Active RMAs')).toBeInTheDocument();
    expect(screen.getByText('Archived RMAs')).toBeInTheDocument();
    expect(screen.getByText('Stale RMAs')).toBeInTheDocument();
  });

  it('displays state breakdown', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.getAdminDashboard).mockResolvedValue(mockMetrics);
    renderAdmin();

    await waitFor(() => {
      expect(screen.getByText('RMAs by State')).toBeInTheDocument();
    });
  });

  it('displays trends', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.getAdminDashboard).mockResolvedValue(mockMetrics);
    renderAdmin();

    await waitFor(() => {
      expect(screen.getByText('RMA Trends')).toBeInTheDocument();
    });
    expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('displays stale RMAs', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.getAdminDashboard).mockResolvedValue(mockMetrics);
    renderAdmin();

    await waitFor(() => {
      expect(screen.getByText('RMA #001')).toBeInTheDocument();
    });
    expect(screen.getByText('10 days')).toBeInTheDocument();
  });

  it('displays recent activity', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.getAdminDashboard).mockResolvedValue(mockMetrics);
    renderAdmin();

    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });
    expect(screen.getByText('RMA #002')).toBeInTheDocument();
    expect(screen.getByText('by admin')).toBeInTheDocument();
  });

  it('shows error on failure', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.getAdminDashboard).mockRejectedValue(new Error('fail'));
    renderAdmin();

    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard metrics')).toBeInTheDocument();
    });
  });

  it('renders admin tools nav', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.getAdminDashboard).mockResolvedValue(mockMetrics);
    renderAdmin();

    await waitFor(() => {
      expect(screen.getByText('Admin Tools')).toBeInTheDocument();
    });
  });

  it('navigates to stale RMA detail on click', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.getAdminDashboard).mockResolvedValue(mockMetrics);
    renderAdmin();

    await waitFor(() => {
      expect(screen.getByText('RMA #001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('RMA #001').closest('[role="link"]')!);
    expect(mockNavigate).toHaveBeenCalledWith('/rma/1');
  });

  it('renders priority breakdown', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.getAdminDashboard).mockResolvedValue(mockMetrics);
    renderAdmin();

    await waitFor(() => {
      expect(screen.getByText('Active RMAs by Priority')).toBeInTheDocument();
    });
  });

  it('shows null from_state as NEW', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.getAdminDashboard).mockResolvedValue(mockMetrics);
    renderAdmin();

    await waitFor(() => {
      expect(screen.getByText(/NEW → SUBMITTED/)).toBeInTheDocument();
    });
  });
});
