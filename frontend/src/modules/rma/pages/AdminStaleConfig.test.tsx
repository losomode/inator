import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminStaleConfig } from './AdminStaleConfig';

vi.mock('../api', () => ({
  staleConfigApi: {
    list: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockConfigs = [
  {
    id: 1,
    state: 'SUBMITTED',
    state_display: 'Submitted',
    priority: 'HIGH',
    priority_display: 'High',
    timeout_hours: 24,
  },
];

function renderConfig() {
  return render(
    <MemoryRouter>
      <AdminStaleConfig />
    </MemoryRouter>,
  );
}

describe('AdminStaleConfig', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows loading state', async () => {
    const { staleConfigApi } = await import('../api');
    vi.mocked(staleConfigApi.list).mockImplementation(() => new Promise(() => {}));
    renderConfig();
    expect(screen.getByText('Loading configurations...')).toBeInTheDocument();
  });

  it('displays config table after loading', async () => {
    const { staleConfigApi } = await import('../api');
    vi.mocked(staleConfigApi.list).mockResolvedValue(mockConfigs);
    renderConfig();

    await waitFor(() => {
      expect(screen.getByText('Stale RMA Configuration')).toBeInTheDocument();
    });
    expect(screen.getByText('Submitted')).toBeInTheDocument();
    expect(screen.getByText('1d')).toBeInTheDocument();
  });

  it('shows error state', async () => {
    const { staleConfigApi } = await import('../api');
    vi.mocked(staleConfigApi.list).mockRejectedValue(new Error('Network error'));
    renderConfig();

    await waitFor(() => {
      expect(screen.getByText('Error: Network error')).toBeInTheDocument();
    });
  });

  it('opens edit modal on Edit click', async () => {
    const { staleConfigApi } = await import('../api');
    vi.mocked(staleConfigApi.list).mockResolvedValue(mockConfigs);
    renderConfig();

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('opens create modal on Add Config click', async () => {
    const { staleConfigApi } = await import('../api');
    vi.mocked(staleConfigApi.list).mockResolvedValue([]);
    renderConfig();

    await waitFor(() => {
      expect(screen.getAllByText('Add Config').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByText('Add Config')[0]!);
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('renders admin tools nav', async () => {
    const { staleConfigApi } = await import('../api');
    vi.mocked(staleConfigApi.list).mockResolvedValue([]);
    renderConfig();

    await waitFor(() => {
      expect(screen.getByText('Admin Tools')).toBeInTheDocument();
    });
  });

  it('renders how-it-works section', async () => {
    const { staleConfigApi } = await import('../api');
    vi.mocked(staleConfigApi.list).mockResolvedValue([]);
    renderConfig();

    await waitFor(() => {
      expect(screen.getByText('How it works:')).toBeInTheDocument();
    });
  });

  it('saves edited config via TimeoutPicker', async () => {
    const { staleConfigApi } = await import('../api');
    vi.mocked(staleConfigApi.list).mockResolvedValue(mockConfigs);
    vi.mocked(staleConfigApi.update).mockResolvedValue({ ...mockConfigs[0]!, timeout_hours: 48 });
    renderConfig();

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByRole('button', { name: '2d' }));
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(vi.mocked(staleConfigApi.update)).toHaveBeenCalledWith(1, 48);
    });
  });

  it('creates new config via TimeoutPicker', async () => {
    const { staleConfigApi } = await import('../api');
    vi.mocked(staleConfigApi.list).mockResolvedValue([]);
    vi.mocked(staleConfigApi.create).mockResolvedValue({
      id: 2,
      state: 'SUBMITTED',
      state_display: 'Submitted',
      priority: 'LOW',
      priority_display: 'Low',
      timeout_hours: 24,
    });
    renderConfig();

    await waitFor(() => {
      expect(screen.getAllByText('Add Config').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByText('Add Config')[0]!);
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(vi.mocked(staleConfigApi.create)).toHaveBeenCalled();
    });
  });

  it('deletes config', async () => {
    const { staleConfigApi } = await import('../api');
    vi.mocked(staleConfigApi.list).mockResolvedValue(mockConfigs);
    vi.mocked(staleConfigApi.delete).mockResolvedValue(undefined);
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );

    renderConfig();

    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(vi.mocked(staleConfigApi.delete)).toHaveBeenCalledWith(1);
    });
    vi.unstubAllGlobals();
  });

  it('cancels edit modal', async () => {
    const { staleConfigApi } = await import('../api');
    vi.mocked(staleConfigApi.list).mockResolvedValue(mockConfigs);
    renderConfig();

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByText('Save')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    // Modal should close - no more Save in the picker
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Hours')).not.toBeInTheDocument();
    });
  });

  it('cancels create modal', async () => {
    const { staleConfigApi } = await import('../api');
    vi.mocked(staleConfigApi.list).mockResolvedValue([]);
    renderConfig();

    await waitFor(() => {
      expect(screen.getAllByText('Add Config').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByText('Add Config')[0]!);
    fireEvent.click(screen.getByText('Cancel'));
  });

  it('handles save error gracefully', async () => {
    const { staleConfigApi } = await import('../api');
    vi.mocked(staleConfigApi.list).mockResolvedValue(mockConfigs);
    vi.mocked(staleConfigApi.update).mockRejectedValue(new Error('Server error'));
    vi.stubGlobal('alert', vi.fn());
    renderConfig();

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(vi.mocked(window.alert)).toHaveBeenCalledWith('Server error');
    });
    vi.unstubAllGlobals();
  });

  it('handles create error gracefully', async () => {
    const { staleConfigApi } = await import('../api');
    vi.mocked(staleConfigApi.list).mockResolvedValue([]);
    vi.mocked(staleConfigApi.create).mockRejectedValue(new Error('Duplicate'));
    vi.stubGlobal('alert', vi.fn());
    renderConfig();

    await waitFor(() => {
      expect(screen.getAllByText('Add Config').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByText('Add Config')[0]!);
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(vi.mocked(window.alert)).toHaveBeenCalledWith('Duplicate');
    });
    vi.unstubAllGlobals();
  });

  it('handles delete error gracefully', async () => {
    const { staleConfigApi } = await import('../api');
    vi.mocked(staleConfigApi.list).mockResolvedValue(mockConfigs);
    vi.mocked(staleConfigApi.delete).mockRejectedValue(new Error('Cannot delete'));
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    vi.stubGlobal('alert', vi.fn());
    renderConfig();

    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(vi.mocked(window.alert)).toHaveBeenCalledWith('Cannot delete');
    });
    vi.unstubAllGlobals();
  });
});
