import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminRMAManagement } from './AdminRMAManagement';

vi.mock('../api', () => ({
  rmaApi: { list: vi.fn(), search: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockRmas = [
  {
    id: 1,
    rma_number: '001',
    serial_number: 'SN-1',
    state: 'SUBMITTED' as const,
    priority: 'HIGH' as const,
    group_id: null,
    fault_notes: '',
    first_ship_date: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_archived: false,
    owner: { username: 'user1' },
  },
];

function renderManagement() {
  return render(
    <MemoryRouter>
      <AdminRMAManagement />
    </MemoryRouter>,
  );
}

describe('AdminRMAManagement', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads and displays RMAs', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.list).mockResolvedValue(mockRmas);
    renderManagement();

    await waitFor(() => {
      expect(screen.getByText('#001')).toBeInTheDocument();
    });
    expect(screen.getByText('SN-1')).toBeInTheDocument();
    expect(screen.getByText('user1')).toBeInTheDocument();
  });

  it('shows loading state', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.list).mockImplementation(() => new Promise(() => {}));
    renderManagement();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.list).mockResolvedValue([]);
    renderManagement();

    await waitFor(() => {
      expect(screen.getByText('No RMAs found')).toBeInTheDocument();
    });
  });

  it('shows error on failure', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.list).mockRejectedValue(new Error('fail'));
    renderManagement();

    await waitFor(() => {
      expect(screen.getByText('Failed to load RMAs')).toBeInTheDocument();
    });
  });

  it('performs search', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.list).mockResolvedValue([]);
    vi.mocked(rmaApi.search).mockResolvedValue(mockRmas);
    renderManagement();

    await waitFor(() => {
      expect(screen.getByText('No RMAs found')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Search by RMA #, Serial #, Owner...');
    fireEvent.change(input, { target: { value: 'SN-1' } });
    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => {
      expect(vi.mocked(rmaApi.search)).toHaveBeenCalledWith({ q: 'SN-1' });
    });
  });

  it('clears filters', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.list).mockResolvedValue(mockRmas);
    renderManagement();

    await waitFor(() => {
      expect(screen.getByText('#001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Clear Filters'));
    expect(vi.mocked(rmaApi.list)).toHaveBeenCalledTimes(2);
  });

  it('navigates to RMA detail on View click', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.list).mockResolvedValue(mockRmas);
    renderManagement();

    await waitFor(() => {
      expect(screen.getByText('View')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('View'));
    expect(mockNavigate).toHaveBeenCalledWith('/rma/1');
  });

  it('renders admin tools nav', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.list).mockResolvedValue([]);
    renderManagement();

    await waitFor(() => {
      expect(screen.getByText('Admin Tools')).toBeInTheDocument();
    });
  });

  it('shows search error', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.list).mockResolvedValue([]);
    vi.mocked(rmaApi.search).mockRejectedValue(new Error('fail'));
    renderManagement();

    await waitFor(() => {
      expect(screen.getByText('No RMAs found')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => {
      expect(screen.getByText('Search failed')).toBeInTheDocument();
    });
  });

  it('filters by state and priority', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.list).mockResolvedValue([]);
    vi.mocked(rmaApi.search).mockResolvedValue(mockRmas);
    renderManagement();

    await waitFor(() => {
      expect(screen.getByDisplayValue('All States')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByDisplayValue('All States'), { target: { value: 'SUBMITTED' } });
    fireEvent.change(screen.getByDisplayValue('All Priorities'), { target: { value: 'HIGH' } });
    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => {
      expect(vi.mocked(rmaApi.search)).toHaveBeenCalledWith({
        state: 'SUBMITTED',
        priority: 'HIGH',
      });
    });
  });

  it('triggers search on Enter key', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.list).mockResolvedValue([]);
    vi.mocked(rmaApi.search).mockResolvedValue(mockRmas);
    renderManagement();

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Search by RMA #, Serial #, Owner...'),
      ).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Search by RMA #, Serial #, Owner...');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(vi.mocked(rmaApi.search)).toHaveBeenCalledWith({ q: 'test' });
    });
  });
});
