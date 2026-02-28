import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RMADetail } from './RMADetail';

const mockRma = {
  id: 1,
  rma_number: '001',
  serial_number: 'SN-123',
  state: 'SUBMITTED' as const,
  priority: 'NORMAL' as const,
  group_id: null,
  fault_notes: 'Screen flickering',
  first_ship_date: '2024-01-15',
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T10:00:00Z',
  is_archived: false,
  state_history: [
    {
      id: 1,
      from_state: null,
      to_state: 'SUBMITTED' as const,
      changed_at: '2024-01-01T10:00:00Z',
      changed_by: { username: 'user1' },
      notes: 'Created',
    },
  ],
};

vi.mock('../api', () => ({
  rmaApi: {
    get: vi.fn(),
    update: vi.fn(),
    updateState: vi.fn(),
  },
}));

let mockIsAdmin = false;
vi.mock('../../../shared/auth/AuthProvider', () => ({
  useAuth: () => ({ isAdmin: mockIsAdmin }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/rma/1']}>
      <Routes>
        <Route path="/rma/:id" element={<RMADetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RMADetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdmin = false;
  });

  it('shows loading state', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.get).mockImplementation(() => new Promise(() => {}));
    renderDetail();
    expect(screen.getByText('Loading RMA details...')).toBeInTheDocument();
  });

  it('displays RMA details', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.get).mockResolvedValue(mockRma);
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('RMA #001')).toBeInTheDocument();
    });
    expect(screen.getByText('SN-123')).toBeInTheDocument();
    expect(screen.getByText('Screen flickering')).toBeInTheDocument();
    expect(screen.getAllByText('SUBMITTED').length).toBeGreaterThanOrEqual(1);
  });

  it('shows error state', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.get).mockRejectedValue(new Error('Not found'));
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Failed to load RMA details')).toBeInTheDocument();
    });
  });

  it('navigates back to dashboard', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.get).mockResolvedValue(mockRma);
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('← Back to Dashboard')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('← Back to Dashboard'));
    expect(mockNavigate).toHaveBeenCalledWith('/rma');
  });

  it('shows state history', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.get).mockResolvedValue(mockRma);
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Status History')).toBeInTheDocument();
    });
    expect(screen.getByText('By: user1')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
  });

  it('hides admin controls for non-admin', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.get).mockResolvedValue(mockRma);
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('RMA #001')).toBeInTheDocument();
    });
    expect(screen.queryByText('Update Status')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin Fields')).not.toBeInTheDocument();
  });

  it('shows admin controls for admin', async () => {
    mockIsAdmin = true;
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.get).mockResolvedValue(mockRma);
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Update Status')).toBeInTheDocument();
    });
    expect(screen.getByText('Admin Fields')).toBeInTheDocument();
    expect(screen.getByTestId('transition-approved')).toBeInTheDocument();
    expect(screen.getByTestId('transition-rejected')).toBeInTheDocument();
  });

  it('shows rejection reason when SUBMITTED', async () => {
    mockIsAdmin = true;
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.get).mockResolvedValue(mockRma);
    renderDetail();

    await waitFor(() => {
      expect(screen.getByTestId('rejection-reason')).toBeInTheDocument();
    });
  });

  it('displays attachments', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.get).mockResolvedValue({
      ...mockRma,
      attachments: [{ id: 1, filename: 'photo.jpg', file_size: 2048 }],
    });
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText(/photo\.jpg/)).toBeInTheDocument();
    });
    expect(screen.getByText('(2.0 KB)')).toBeInTheDocument();
  });

  it('displays group badge', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.get).mockResolvedValue({ ...mockRma, group_id: 42 });
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText(/Group #42/)).toBeInTheDocument();
    });
  });

  it('shows rejection reason for rejected RMA', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.get).mockResolvedValue({
      ...mockRma,
      state: 'REJECTED',
      rejection_reason: 'Out of warranty',
      is_archived: true,
    });
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Out of warranty')).toBeInTheDocument();
    });
  });

  it('performs state transition', async () => {
    mockIsAdmin = true;
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.get).mockResolvedValue(mockRma);
    vi.mocked(rmaApi.updateState).mockResolvedValue({
      rma: { ...mockRma, state: 'APPROVED' },
    });
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );

    renderDetail();

    await waitFor(() => {
      expect(screen.getByTestId('transition-approved')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('transition-approved'));

    await waitFor(() => {
      expect(vi.mocked(rmaApi.updateState)).toHaveBeenCalledWith('1', {
        state: 'APPROVED',
        notes: '',
      });
    });
    vi.unstubAllGlobals();
  });

  it('requires rejection reason for REJECTED transition', async () => {
    mockIsAdmin = true;
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.get).mockResolvedValue(mockRma);

    renderDetail();

    await waitFor(() => {
      expect(screen.getByTestId('transition-rejected')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('transition-rejected'));

    await waitFor(() => {
      expect(screen.getByText('Rejection reason is required')).toBeInTheDocument();
    });
  });

  it('handles state transition error', async () => {
    mockIsAdmin = true;
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.get).mockResolvedValue(mockRma);
    vi.mocked(rmaApi.updateState).mockRejectedValue({
      response: { data: { error: 'Invalid transition' } },
    });

    renderDetail();

    await waitFor(() => {
      expect(screen.getByTestId('transition-approved')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('transition-approved'));

    await waitFor(() => {
      expect(screen.getByText('Invalid transition')).toBeInTheDocument();
    });
  });

  it('saves admin fields', async () => {
    mockIsAdmin = true;
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.get).mockResolvedValue(mockRma);
    vi.mocked(rmaApi.update).mockResolvedValue(mockRma);

    renderDetail();

    await waitFor(() => {
      expect(screen.getByTestId('edit-fields-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('edit-fields-btn'));
    expect(screen.getByTestId('save-fields-btn')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('save-fields-btn'));

    await waitFor(() => {
      expect(vi.mocked(rmaApi.update)).toHaveBeenCalled();
    });
  });

  it('handles save fields error', async () => {
    mockIsAdmin = true;
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.get).mockResolvedValue(mockRma);
    vi.mocked(rmaApi.update).mockRejectedValue(new Error('fail'));

    renderDetail();

    await waitFor(() => {
      expect(screen.getByTestId('edit-fields-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('edit-fields-btn'));
    fireEvent.click(screen.getByTestId('save-fields-btn'));

    await waitFor(() => {
      expect(screen.getByText('Failed to save fields')).toBeInTheDocument();
    });
  });

  it('cancels admin field editing', async () => {
    mockIsAdmin = true;
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.get).mockResolvedValue(mockRma);

    renderDetail();

    await waitFor(() => {
      expect(screen.getByTestId('edit-fields-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('edit-fields-btn'));
    expect(screen.getByTestId('save-fields-btn')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.getByTestId('edit-fields-btn')).toBeInTheDocument();
  });

  it('shows revert controls for APPROVED state', async () => {
    mockIsAdmin = true;
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.get).mockResolvedValue({ ...mockRma, state: 'APPROVED' });

    renderDetail();

    await waitFor(() => {
      expect(screen.getByTestId('admin-revert-select')).toBeInTheDocument();
    });
    expect(screen.getByTestId('admin-revert-btn')).toBeInTheDocument();
  });

  it('hides update status for archived RMA', async () => {
    mockIsAdmin = true;
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.get).mockResolvedValue({ ...mockRma, is_archived: true, state: 'COMPLETED' });

    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('RMA #001')).toBeInTheDocument();
    });
    expect(screen.queryByText('Update Status')).not.toBeInTheDocument();
  });

  it('shows empty state history', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.get).mockResolvedValue({ ...mockRma, state_history: [] });

    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('No status history available')).toBeInTheDocument();
    });
  });

  it('edits admin checkbox fields', async () => {
    mockIsAdmin = true;
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.get).mockResolvedValue(mockRma);

    renderDetail();

    await waitFor(() => {
      expect(screen.getByTestId('edit-fields-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('edit-fields-btn'));
    const checkbox = screen.getByTestId('admin-script-ran');
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('edits admin text fields', async () => {
    mockIsAdmin = true;
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.get).mockResolvedValue(mockRma);

    renderDetail();

    await waitFor(() => {
      expect(screen.getByTestId('edit-fields-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('edit-fields-btn'));
    fireEvent.change(screen.getByTestId('admin-root-cause'), {
      target: { value: 'Bad capacitor' },
    });
    fireEvent.change(screen.getByTestId('admin-parts-replaced'), {
      target: { value: 'C47' },
    });
    fireEvent.change(screen.getByTestId('admin-cost-to-repair'), {
      target: { value: '$50' },
    });
    fireEvent.change(screen.getByTestId('admin-tx2-mac'), {
      target: { value: 'AA:BB:CC' },
    });
  });

  it('enters transition notes', async () => {
    mockIsAdmin = true;
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.get).mockResolvedValue(mockRma);

    renderDetail();

    await waitFor(() => {
      expect(screen.getByTestId('transition-notes')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('transition-notes'), {
      target: { value: 'Looks good' },
    });
  });

  it('handles REJECTED transition with reason', async () => {
    mockIsAdmin = true;
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.get).mockResolvedValue(mockRma);
    vi.mocked(rmaApi.updateState).mockResolvedValue({
      rma: { ...mockRma, state: 'REJECTED', is_archived: true },
    });
    vi.mocked(rmaApi.update).mockResolvedValue(mockRma);
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );

    renderDetail();

    await waitFor(() => {
      expect(screen.getByTestId('rejection-reason')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('rejection-reason'), {
      target: { value: 'Out of warranty' },
    });
    fireEvent.click(screen.getByTestId('transition-rejected'));

    await waitFor(() => {
      expect(vi.mocked(rmaApi.updateState)).toHaveBeenCalled();
    });
    vi.unstubAllGlobals();
  });

  it('shows N/A for null first_ship_date', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.get).mockResolvedValue({ ...mockRma, first_ship_date: null });
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });
  });
});
