import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CreateRMA } from './CreateRMA';

vi.mock('../api', () => ({
  rmaApi: { createGroup: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderCreateRMA() {
  return render(
    <MemoryRouter>
      <CreateRMA />
    </MemoryRouter>,
  );
}

describe('CreateRMA', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders form with initial device', () => {
    renderCreateRMA();
    expect(screen.getByText('Create New RMA')).toBeInTheDocument();
    expect(screen.getByText('Device 1')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., SN-12345')).toBeInTheDocument();
  });

  it('adds a new device', () => {
    renderCreateRMA();
    fireEvent.click(screen.getByText('+ Add Another Device'));
    expect(screen.getByText('Device 1')).toBeInTheDocument();
    expect(screen.getByText('Device 2')).toBeInTheDocument();
    expect(screen.getByText('Devices to RMA (2)')).toBeInTheDocument();
  });

  it('removes a device', () => {
    renderCreateRMA();
    fireEvent.click(screen.getByText('+ Add Another Device'));
    expect(screen.getAllByText(/× Remove/)).toHaveLength(2);
    fireEvent.click(screen.getAllByText('× Remove')[0]!);
    expect(screen.queryByText('Device 2')).not.toBeInTheDocument();
  });

  it('validates required fields', async () => {
    renderCreateRMA();
    fireEvent.click(screen.getByText('Create 1 RMA'));

    await waitFor(() => {
      expect(
        screen.getByText('Device 1: Serial number and issue description are required'),
      ).toBeInTheDocument();
    });
  });

  it('submits successfully and navigates', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.createGroup).mockResolvedValue(undefined);

    renderCreateRMA();

    fireEvent.change(screen.getByPlaceholderText('e.g., SN-12345'), {
      target: { value: 'SN-100' },
    });
    fireEvent.change(screen.getByPlaceholderText('Describe the issue with this device...'), {
      target: { value: 'broken screen' },
    });

    fireEvent.click(screen.getByText('Create 1 RMA'));

    await waitFor(() => {
      expect(vi.mocked(rmaApi.createGroup)).toHaveBeenCalledWith({
        rmas: [
          {
            serial_number: 'SN-100',
            first_ship_date: null,
            fault_notes: 'broken screen',
            priority: 'NORMAL',
          },
        ],
      });
    });
    expect(mockNavigate).toHaveBeenCalledWith('/rma');
  });

  it('shows error on API failure', async () => {
    const { rmaApi } = await import('../api');
    vi.mocked(rmaApi.createGroup).mockRejectedValue({
      response: { data: { detail: 'Duplicate serial' } },
    });

    renderCreateRMA();

    fireEvent.change(screen.getByPlaceholderText('e.g., SN-12345'), {
      target: { value: 'SN-DUP' },
    });
    fireEvent.change(screen.getByPlaceholderText('Describe the issue with this device...'), {
      target: { value: 'issue' },
    });
    fireEvent.click(screen.getByText('Create 1 RMA'));

    await waitFor(() => {
      expect(screen.getByText('Duplicate serial')).toBeInTheDocument();
    });
  });

  it('navigates back on cancel', () => {
    renderCreateRMA();
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockNavigate).toHaveBeenCalledWith('/rma');
  });

  it('changes priority', () => {
    renderCreateRMA();
    const select = screen.getByDisplayValue('Normal');
    fireEvent.change(select, { target: { value: 'HIGH' } });
    expect(screen.getByDisplayValue('High')).toBeInTheDocument();
  });
});
