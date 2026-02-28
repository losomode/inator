import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from './Dashboard';

vi.mock('../api', () => ({
  rmaApi: { list: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
}

describe('Dashboard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows loading state', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.list).mockImplementation(() => new Promise(() => {}));
    renderDashboard();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays RMAs after loading', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.list).mockResolvedValue([
      {
        id: 1,
        rma_number: '001',
        serial_number: 'SN-1',
        state: 'SUBMITTED',
        priority: 'NORMAL',
        group_id: null,
        fault_notes: '',
        first_ship_date: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        is_archived: false,
      },
    ]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('RMA #001')).toBeInTheDocument();
    });
    expect(screen.getByText('SN-1')).toBeInTheDocument();
    expect(screen.getByText('SUBMITTED')).toBeInTheDocument();
  });

  it('shows empty state when no RMAs', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.list).mockResolvedValue([]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('No RMAs found')).toBeInTheDocument();
    });
    expect(screen.getByText('Create your first RMA')).toBeInTheDocument();
  });

  it('navigates to create RMA on button click', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.list).mockResolvedValue([]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('+ New RMA')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ New RMA'));
    expect(mockNavigate).toHaveBeenCalledWith('/rma/new');
  });

  it('toggles archived/active view', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.list).mockResolvedValue([]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Show Completed')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Show Completed'));
    expect(vi.mocked(rmaApi.list)).toHaveBeenCalledWith({ archived: true });
  });

  it('shows error on API failure', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.list).mockRejectedValue(new Error('Network error'));

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Failed to load RMAs')).toBeInTheDocument();
    });
  });

  it('switches to group view', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.list).mockResolvedValue([
      {
        id: 1,
        rma_number: '001',
        serial_number: 'SN-1',
        state: 'SUBMITTED',
        priority: 'NORMAL',
        group_id: 10,
        fault_notes: '',
        first_ship_date: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        is_archived: false,
      },
      {
        id: 2,
        rma_number: '002',
        serial_number: 'SN-2',
        state: 'APPROVED',
        priority: 'HIGH',
        group_id: null,
        fault_notes: '',
        first_ship_date: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        is_archived: false,
      },
    ]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('RMA #001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('By RMA Group'));
    expect(screen.getByText(/RMA Group #10/)).toBeInTheDocument();
    expect(screen.getByText('Individual RMAs')).toBeInTheDocument();
  });

  it('navigates to RMA detail on card click', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.list).mockResolvedValue([
      {
        id: 7,
        rma_number: '007',
        serial_number: 'SN-7',
        state: 'RECEIVED',
        priority: 'LOW',
        group_id: null,
        fault_notes: '',
        first_ship_date: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        is_archived: false,
      },
    ]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('RMA #007')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('RMA #007').closest('[role="link"]')!);
    expect(mockNavigate).toHaveBeenCalledWith('/rma/7');
  });

  it('shows archived date for completed RMAs', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.list).mockResolvedValue([
      {
        id: 1,
        rma_number: '001',
        serial_number: 'SN-1',
        state: 'COMPLETED',
        priority: 'NORMAL',
        group_id: null,
        fault_notes: '',
        first_ship_date: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-06-15T00:00:00Z',
        is_archived: true,
      },
    ]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Completed:')).toBeInTheDocument();
    });
  });
});
