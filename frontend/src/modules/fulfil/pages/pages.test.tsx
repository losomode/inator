import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mock api module
vi.mock('../api', () => ({
  itemsApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  posApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    close: vi.fn(),
    waive: vi.fn(),
  },
  ordersApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    close: vi.fn(),
    waive: vi.fn(),
  },
  deliveriesApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    close: vi.fn(),
    searchSerial: vi.fn(),
  },
  attachmentsApi: { list: vi.fn(), upload: vi.fn(), delete: vi.fn() },
}));

// Mock auth
vi.mock('../../../shared/auth/AuthProvider', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 1, username: 'admin', email: 'a@b.com', role: 'ADMIN', customer: null },
    isAdmin: true,
    isAuthenticated: true,
    loading: false,
    fetchUser: vi.fn(),
    logout: vi.fn(),
  })),
}));

import { itemsApi, posApi, ordersApi, deliveriesApi, attachmentsApi } from '../api';
import { useAuth } from '../../../shared/auth/AuthProvider';
import type { AuthContextValue } from '../../../shared/auth/AuthProvider';
import { ItemList } from './items/ItemList';
import { ItemForm } from './items/ItemForm';
import { POList } from './pos/POList';
import { POForm } from './pos/POForm';
import { PODetail } from './pos/PODetail';
import { OrderList } from './orders/OrderList';
import { OrderForm } from './orders/OrderForm';
import { OrderDetail } from './orders/OrderDetail';
import { DeliveryList } from './deliveries/DeliveryList';
import { DeliveryForm } from './deliveries/DeliveryForm';
import { DeliveryDetail } from './deliveries/DeliveryDetail';
import { SerialSearch } from './deliveries/SerialSearch';
import type { Item, PurchaseOrder, Order, Delivery } from '../types';

const mockItem: Item = {
  id: 1,
  name: 'Camera LR',
  version: 'v2',
  msrp: '999.00',
  min_price: '750.00',
};
const mockPO: PurchaseOrder = {
  id: 1,
  po_number: 'PO-001',
  customer_id: 'cust-1',
  customer_name: 'Acme',
  status: 'OPEN',
  line_items: [{ item: 1, quantity: 10, price_per_unit: '800.00' }],
  fulfillment_status: {
    line_items: [
      {
        line_item_id: 1,
        item_id: 1,
        item_name: 'Camera LR',
        original_quantity: 10,
        ordered_quantity: 3,
        waived_quantity: 0,
        remaining_quantity: 7,
        price_per_unit: '800.00',
      },
    ],
    orders: [{ order_id: 1, order_number: 'ORD-001' }],
  },
};
const mockOrder: Order = {
  id: 1,
  order_number: 'ORD-001',
  customer_id: 'cust-1',
  customer_name: 'Acme',
  status: 'OPEN',
  line_items: [{ id: 10, item: 1, quantity: 5, price_per_unit: '800.00', po_line_item: 1 }],
  created_at: '2025-01-01T00:00:00Z',
  fulfillment_status: {
    line_items: [
      {
        line_item_id: 10,
        item_id: 1,
        item_name: 'Camera LR',
        original_quantity: 5,
        delivered_quantity: 2,
        remaining_quantity: 3,
        price_per_unit: '800.00',
      },
    ],
    source_pos: [{ po_id: 1, po_number: 'PO-001' }],
    deliveries: [{ delivery_id: 1, delivery_number: 'DEL-001' }],
  },
};
const mockDelivery: Delivery = {
  id: 1,
  delivery_number: 'DEL-001',
  customer_id: 'cust-1',
  ship_date: '2025-01-15',
  status: 'OPEN',
  tracking_number: 'TRACK123',
  notes: 'Test delivery',
  line_items: [
    { item: 1, serial_number: 'SN-001', price_per_unit: '800.00', order_number: 'ORD-001' },
  ],
};

function wrap(ui: React.ReactNode, path = '/'): React.ReactElement {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={ui} />
      </Routes>
    </MemoryRouter>
  );
}
function wrapWithParam(ui: React.ReactNode, path: string, routePath: string): React.ReactElement {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={routePath} element={ui} />
      </Routes>
    </MemoryRouter>
  );
}

function setAdminAuth(): void {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 1, username: 'admin', email: 'a@b.com', role: 'ADMIN', customer: null },
    isAdmin: true,
    isAuthenticated: true,
    loading: false,
    fetchUser: vi.fn(),
    logout: vi.fn(),
  } as AuthContextValue);
}
function setUserAuth(): void {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 2, username: 'user', email: 'u@b.com', role: 'USER', customer: null },
    isAdmin: false,
    isAuthenticated: true,
    loading: false,
    fetchUser: vi.fn(),
    logout: vi.fn(),
  } as AuthContextValue);
}

beforeEach(() => {
  vi.clearAllMocks();
  setAdminAuth();
  vi.mocked(attachmentsApi.list).mockResolvedValue([]);
  vi.mocked(ordersApi.list).mockResolvedValue([]);
  vi.mocked(posApi.list).mockResolvedValue([]);
});

// ==================== ITEMS ====================
describe('ItemList', () => {
  it('renders items table', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrap(<ItemList />));
    await waitFor(() => expect(screen.getByText('Camera LR')).toBeInTheDocument());
    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText('$999.00')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([]);
    render(wrap(<ItemList />));
    await waitFor(() => expect(screen.getByText(/No items found/)).toBeInTheDocument());
  });

  it('shows create button for admin', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([]);
    render(wrap(<ItemList />));
    await waitFor(() => expect(screen.getByText('Create Item')).toBeInTheDocument());
  });

  it('hides create button for non-admin', async () => {
    setUserAuth();
    vi.mocked(itemsApi.list).mockResolvedValue([]);
    render(wrap(<ItemList />));
    await waitFor(() => expect(screen.getByText(/No items found/)).toBeInTheDocument());
    expect(screen.queryByText('Create Item')).not.toBeInTheDocument();
  });

  it('handles delete', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(itemsApi.delete).mockResolvedValue(undefined);
    window.confirm = vi.fn(() => true);
    render(wrap(<ItemList />));
    await waitFor(() => expect(screen.getByText('Delete')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Delete'));
    expect(itemsApi.delete).toHaveBeenCalledWith(1);
  });

  it('shows error on load failure', async () => {
    vi.mocked(itemsApi.list).mockRejectedValue({ response: { data: { detail: 'Server error' } } });
    render(wrap(<ItemList />));
    await waitFor(() => expect(screen.getByText('Server error')).toBeInTheDocument());
  });
});

describe('ItemForm', () => {
  it('renders create form', () => {
    render(wrap(<ItemForm />));
    expect(screen.getByRole('heading', { name: 'Create Item' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
  });

  it('renders edit form with data', async () => {
    vi.mocked(itemsApi.get).mockResolvedValue(mockItem);
    render(wrapWithParam(<ItemForm />, '/fulfil/items/1/edit', '/fulfil/items/:id/edit'));
    await waitFor(() => expect(screen.getByDisplayValue('Camera LR')).toBeInTheDocument());
    expect(screen.getByText('Edit Item')).toBeInTheDocument();
  });

  it('submits create form and navigates', async () => {
    vi.mocked(itemsApi.create).mockResolvedValue(mockItem);
    render(wrap(<ItemForm />));
    await userEvent.type(screen.getByLabelText(/Name/), 'Widget');
    await userEvent.type(screen.getByLabelText(/Version/), 'v1');
    await userEvent.type(screen.getByLabelText(/MSRP/), '100');
    await userEvent.type(screen.getByLabelText(/Minimum Price/), '80');
    await userEvent.click(screen.getByRole('button', { name: /Create Item/ }));
    await waitFor(() => expect(itemsApi.create).toHaveBeenCalled());
    expect(mockNavigate).toHaveBeenCalledWith('/fulfil/items');
  });

  it('shows error on submit failure', async () => {
    vi.mocked(itemsApi.create).mockRejectedValue({
      response: { data: { detail: 'Name required' } },
    });
    render(wrap(<ItemForm />));
    await userEvent.type(screen.getByLabelText(/Name/), 'X');
    await userEvent.type(screen.getByLabelText(/Version/), 'v1');
    await userEvent.type(screen.getByLabelText(/MSRP/), '100');
    await userEvent.type(screen.getByLabelText(/Minimum Price/), '80');
    await userEvent.click(screen.getByRole('button', { name: /Create Item/ }));
    await waitFor(() => expect(screen.getByText('Name required')).toBeInTheDocument());
  });

  it('submits update form in edit mode', async () => {
    vi.mocked(itemsApi.get).mockResolvedValue(mockItem);
    vi.mocked(itemsApi.update).mockResolvedValue(mockItem);
    render(wrapWithParam(<ItemForm />, '/fulfil/items/1/edit', '/fulfil/items/:id/edit'));
    await waitFor(() => expect(screen.getByDisplayValue('Camera LR')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Update Item/ }));
    await waitFor(() =>
      expect(itemsApi.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ name: 'Camera LR' }),
      ),
    );
    expect(mockNavigate).toHaveBeenCalledWith('/fulfil/items');
  });
});

// ==================== PO LIST ====================
describe('POList', () => {
  it('renders PO table', async () => {
    vi.mocked(posApi.list).mockResolvedValue([mockPO]);
    render(wrap(<POList />));
    await waitFor(() => expect(screen.getByText('PO-001')).toBeInTheDocument());
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('OPEN')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    vi.mocked(posApi.list).mockResolvedValue([]);
    render(wrap(<POList />));
    await waitFor(() => expect(screen.getByText(/No purchase orders found/)).toBeInTheDocument());
  });

  it('handles delete', async () => {
    vi.mocked(posApi.list).mockResolvedValue([mockPO]);
    vi.mocked(posApi.delete).mockResolvedValue(undefined);
    window.confirm = vi.fn(() => true);
    render(wrap(<POList />));
    await waitFor(() => expect(screen.getByText('Delete')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Delete'));
    expect(posApi.delete).toHaveBeenCalledWith(1);
  });

  it('shows error on load failure', async () => {
    vi.mocked(posApi.list).mockRejectedValue({ response: { data: { detail: 'Load failed' } } });
    render(wrap(<POList />));
    await waitFor(() => expect(screen.getByText('Load failed')).toBeInTheDocument());
  });

  it('shows delete error', async () => {
    vi.mocked(posApi.list).mockResolvedValue([mockPO]);
    vi.mocked(posApi.delete).mockRejectedValue({
      response: { data: { detail: 'PO delete failed' } },
    });
    window.confirm = vi.fn(() => true);
    render(wrap(<POList />));
    await waitFor(() => expect(screen.getByText('Delete')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Delete'));
    await waitFor(() => expect(screen.getByText('PO delete failed')).toBeInTheDocument());
  });

  it('shows PO with all column variants', async () => {
    const closedPO: PurchaseOrder = {
      ...mockPO,
      id: 2,
      po_number: 'PO-002',
      status: 'CLOSED',
      start_date: '2025-01-01',
      customer_name: undefined,
      customer_id: 'c2',
    };
    vi.mocked(posApi.list).mockResolvedValue([mockPO, closedPO]);
    render(wrap(<POList />));
    await waitFor(() => expect(screen.getByText('PO-002')).toBeInTheDocument());
    expect(screen.getByText('c2')).toBeInTheDocument();
    expect(screen.getByText('2025-01-01')).toBeInTheDocument();
  });

  it('hides admin actions for non-admin', async () => {
    setUserAuth();
    vi.mocked(posApi.list).mockResolvedValue([mockPO]);
    render(wrap(<POList />));
    await waitFor(() => expect(screen.getByText('PO-001')).toBeInTheDocument());
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    expect(screen.queryByText('Create PO')).not.toBeInTheDocument();
  });
});

// ==================== PO FORM ====================
describe('POForm', () => {
  it('renders create form', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrap(<POForm />));
    expect(screen.getByRole('heading', { name: 'Create Purchase Order' })).toBeInTheDocument();
  });

  it('validates line items required', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([]);
    render(wrap(<POForm />));
    await userEvent.type(screen.getByLabelText(/Customer ID/), 'c1');
    await userEvent.click(screen.getByText('Create PO'));
    await waitFor(() =>
      expect(screen.getByText('At least one line item is required')).toBeInTheDocument(),
    );
  });

  it('adds and removes line items', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrap(<POForm />));
    await userEvent.click(screen.getByText('Add Item'));
    await waitFor(() => expect(screen.getByText('Remove')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Remove'));
    await waitFor(() => expect(screen.getByText(/No line items/)).toBeInTheDocument());
  });

  it('submits create form', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(posApi.create).mockResolvedValue(mockPO);
    render(wrap(<POForm />));
    await userEvent.type(screen.getByLabelText(/Customer ID/), 'cust-1');
    await userEvent.click(screen.getByText('Add Item'));
    await userEvent.click(screen.getByText('Create PO'));
    await waitFor(() => expect(posApi.create).toHaveBeenCalled());
    expect(mockNavigate).toHaveBeenCalledWith('/fulfil/pos');
  });

  it('renders edit form with data', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(posApi.get).mockResolvedValue(mockPO);
    render(wrapWithParam(<POForm />, '/fulfil/pos/1/edit', '/fulfil/pos/:id/edit'));
    await waitFor(() => expect(screen.getByDisplayValue('cust-1')).toBeInTheDocument());
    expect(screen.getByText('Edit Purchase Order')).toBeInTheDocument();
  });

  it('submits update form', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(posApi.get).mockResolvedValue(mockPO);
    vi.mocked(posApi.update).mockResolvedValue(mockPO);
    render(wrapWithParam(<POForm />, '/fulfil/pos/1/edit', '/fulfil/pos/:id/edit'));
    await waitFor(() => expect(screen.getByDisplayValue('cust-1')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Update PO'));
    await waitFor(() => expect(posApi.update).toHaveBeenCalledWith(1, expect.anything()));
    expect(mockNavigate).toHaveBeenCalledWith('/fulfil/pos');
  });

  it('shows error on submit failure', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(posApi.create).mockRejectedValue({ response: { data: { detail: 'Bad request' } } });
    render(wrap(<POForm />));
    await userEvent.type(screen.getByLabelText(/Customer ID/), 'c1');
    await userEvent.click(screen.getByText('Add Item'));
    await userEvent.click(screen.getByText('Create PO'));
    await waitFor(() => expect(screen.getByText('Bad request')).toBeInTheDocument());
  });

  it('navigates back on cancel', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([]);
    render(wrap(<POForm />));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockNavigate).toHaveBeenCalledWith('/fulfil/pos');
  });

  it('updates line item price per unit', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrap(<POForm />));
    await userEvent.click(screen.getByText('Add Item'));
    const priceInput = screen.getByDisplayValue('0');
    await userEvent.clear(priceInput);
    await userEvent.type(priceInput, '100');
    expect(priceInput).toHaveValue(100);
  });

  it('shows error when items fail to load', async () => {
    vi.mocked(itemsApi.list).mockRejectedValue(new Error('fail'));
    render(wrap(<POForm />));
    await waitFor(() => expect(screen.getByText('Failed to load items')).toBeInTheDocument());
  });

  it('shows loading spinner in edit mode', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([]);
    vi.mocked(posApi.get).mockImplementation(() => new Promise(() => {}));
    render(wrapWithParam(<POForm />, '/fulfil/pos/1/edit', '/fulfil/pos/:id/edit'));
    await waitFor(() => expect(document.querySelector('.animate-spin')).toBeInTheDocument());
  });

  it('shows load error in edit mode', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([]);
    vi.mocked(posApi.get).mockRejectedValue({ response: { data: { detail: 'PO not found' } } });
    render(wrapWithParam(<POForm />, '/fulfil/pos/1/edit', '/fulfil/pos/:id/edit'));
    await waitFor(() => expect(screen.getByText('PO not found')).toBeInTheDocument());
  });
});

// ==================== PO DETAIL ====================
describe('PODetail', () => {
  it('renders PO detail with line items', async () => {
    vi.mocked(posApi.get).mockResolvedValue(mockPO);
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrapWithParam(<PODetail />, '/fulfil/pos/1', '/fulfil/pos/:id'));
    await waitFor(() => expect(screen.getByText('PO-001')).toBeInTheDocument());
    expect(screen.getByText('Close PO')).toBeInTheDocument();
    expect(screen.getByText('$800.00')).toBeInTheDocument();
  });

  it('shows not found on error', async () => {
    vi.mocked(posApi.get).mockRejectedValue({ response: { data: { detail: 'Not found' } } });
    vi.mocked(itemsApi.list).mockResolvedValue([]);
    render(wrapWithParam(<PODetail />, '/fulfil/pos/999', '/fulfil/pos/:id'));
    await waitFor(() => expect(screen.getByText('Not found')).toBeInTheDocument());
  });

  it('renders fulfillment status table', async () => {
    vi.mocked(posApi.get).mockResolvedValue(mockPO);
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrapWithParam(<PODetail />, '/fulfil/pos/1', '/fulfil/pos/:id'));
    await waitFor(() => expect(screen.getByText('Fulfillment Status')).toBeInTheDocument());
    expect(screen.getByText('Camera LR')).toBeInTheDocument();
    expect(screen.getByText('30% Ordered')).toBeInTheDocument();
  });

  it('renders linked orders in fulfillment status', async () => {
    vi.mocked(posApi.get).mockResolvedValue(mockPO);
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrapWithParam(<PODetail />, '/fulfil/pos/1', '/fulfil/pos/:id'));
    await waitFor(() => expect(screen.getByText('ORD-001')).toBeInTheDocument());
  });

  it('handles close PO', async () => {
    vi.mocked(posApi.get).mockResolvedValue(mockPO);
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(posApi.close).mockResolvedValue({ ...mockPO, status: 'CLOSED' });
    render(wrapWithParam(<PODetail />, '/fulfil/pos/1', '/fulfil/pos/:id'));
    await waitFor(() => expect(screen.getByText('Close PO')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Close PO'));
    expect(posApi.close).toHaveBeenCalledWith(1);
  });

  it('shows waive modal and submits', async () => {
    vi.mocked(posApi.get).mockResolvedValue(mockPO);
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(posApi.waive).mockResolvedValue({ message: 'ok' });
    render(wrapWithParam(<PODetail />, '/fulfil/pos/1', '/fulfil/pos/:id'));
    await waitFor(() => expect(screen.getByText('Waive')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Waive'));
    expect(screen.getByText('Waive Remaining Quantity')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Waive Quantity'));
    await waitFor(() => expect(posApi.waive).toHaveBeenCalledWith(1, 1, 7, ''));
  });

  it('shows PO without fulfillment status', async () => {
    vi.mocked(posApi.get).mockResolvedValue({ ...mockPO, fulfillment_status: undefined });
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrapWithParam(<PODetail />, '/fulfil/pos/1', '/fulfil/pos/:id'));
    await waitFor(() =>
      expect(screen.getByText(/No orders have been created/)).toBeInTheDocument(),
    );
  });

  it('handles close PO error with override', async () => {
    vi.mocked(posApi.get).mockResolvedValue(mockPO);
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(posApi.close).mockRejectedValueOnce({
      response: { data: { error: 'Unfulfilled items', can_override: true } },
    });
    window.confirm = vi.fn(() => true);
    window.prompt = vi.fn(() => 'admin override reason');
    vi.mocked(posApi.close).mockResolvedValueOnce({ ...mockPO, status: 'CLOSED' });
    render(wrapWithParam(<PODetail />, '/fulfil/pos/1', '/fulfil/pos/:id'));
    await waitFor(() => expect(screen.getByText('Close PO')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Close PO'));
    await waitFor(() => expect(posApi.close).toHaveBeenCalledTimes(2));
    expect(posApi.close).toHaveBeenLastCalledWith(1, true, 'admin override reason');
  });

  it('handles close PO error without override', async () => {
    vi.mocked(posApi.get).mockResolvedValue(mockPO);
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(posApi.close).mockRejectedValue({ response: { data: { error: 'Cannot close' } } });
    render(wrapWithParam(<PODetail />, '/fulfil/pos/1', '/fulfil/pos/:id'));
    await waitFor(() => expect(screen.getByText('Close PO')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Close PO'));
    await waitFor(() => expect(screen.getByText('Cannot close')).toBeInTheDocument());
  });

  it('cancels waive modal', async () => {
    vi.mocked(posApi.get).mockResolvedValue(mockPO);
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrapWithParam(<PODetail />, '/fulfil/pos/1', '/fulfil/pos/:id'));
    await waitFor(() => expect(screen.getByText('Waive')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Waive'));
    expect(screen.getByText('Waive Remaining Quantity')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Waive Remaining Quantity')).not.toBeInTheDocument();
  });

  it('shows waive error on failure', async () => {
    vi.mocked(posApi.get).mockResolvedValue(mockPO);
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(posApi.waive).mockRejectedValue({ response: { data: { detail: 'Cannot waive' } } });
    render(wrapWithParam(<PODetail />, '/fulfil/pos/1', '/fulfil/pos/:id'));
    await waitFor(() => expect(screen.getByText('Waive')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Waive'));
    // Type a waive reason
    const reasonInput = screen.getByPlaceholderText('Enter reason for waiving...');
    await userEvent.type(reasonInput, 'Test reason');
    await userEvent.click(screen.getByText('Waive Quantity'));
    await waitFor(() => expect(posApi.waive).toHaveBeenCalledWith(1, 1, 7, 'Test reason'));
  });

  it('shows closed PO without close button', async () => {
    vi.mocked(posApi.get).mockResolvedValue({ ...mockPO, status: 'CLOSED' });
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrapWithParam(<PODetail />, '/fulfil/pos/1', '/fulfil/pos/:id'));
    await waitFor(() => expect(screen.getByText('PO-001')).toBeInTheDocument());
    expect(screen.queryByText('Close PO')).not.toBeInTheDocument();
  });

  it('shows waive error for zero quantity', async () => {
    vi.mocked(posApi.get).mockResolvedValue(mockPO);
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrapWithParam(<PODetail />, '/fulfil/pos/1', '/fulfil/pos/:id'));
    await waitFor(() => expect(screen.getByText('Waive')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Waive'));
    const qtyInput = screen.getByDisplayValue('7');
    await userEvent.clear(qtyInput);
    await userEvent.type(qtyInput, '0');
    await userEvent.click(screen.getByText('Waive Quantity'));
    await waitFor(() => expect(screen.getByText('Quantity must be positive')).toBeInTheDocument());
  });

  it('handles close PO override error', async () => {
    vi.mocked(posApi.get).mockResolvedValue(mockPO);
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(posApi.close).mockRejectedValueOnce({
      response: { data: { error: 'Unfulfilled', can_override: true } },
    });
    window.confirm = vi.fn(() => true);
    window.prompt = vi.fn(() => 'override');
    vi.mocked(posApi.close).mockRejectedValueOnce({
      response: { data: { detail: 'Override failed' } },
    });
    render(wrapWithParam(<PODetail />, '/fulfil/pos/1', '/fulfil/pos/:id'));
    await waitFor(() => expect(screen.getByText('Close PO')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Close PO'));
    await waitFor(() => expect(screen.getByText('Override failed')).toBeInTheDocument());
  });

  it('shows PO with optional fields', async () => {
    const fullPO: PurchaseOrder = {
      ...mockPO,
      start_date: '2025-01-01',
      expiration_date: '2025-12-31',
      google_doc_url: 'https://docs.google.com/test',
      hubspot_url: 'https://hubspot.com/test',
      notes: 'PO notes',
      created_at: '2025-01-01T00:00:00Z',
    };
    vi.mocked(posApi.get).mockResolvedValue(fullPO);
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrapWithParam(<PODetail />, '/fulfil/pos/1', '/fulfil/pos/:id'));
    await waitFor(() => expect(screen.getByText('Start Date')).toBeInTheDocument());
    expect(screen.getByText('Expiration Date')).toBeInTheDocument();
    expect(screen.getByText('View Document')).toBeInTheDocument();
    expect(screen.getByText('View in HubSpot')).toBeInTheDocument();
    expect(screen.getByText('PO notes')).toBeInTheDocument();
  });

  it('shows Complete status for fully fulfilled line item', async () => {
    const completePO: PurchaseOrder = {
      ...mockPO,
      fulfillment_status: {
        line_items: [
          {
            line_item_id: 1,
            item_id: 1,
            item_name: 'Camera LR',
            original_quantity: 10,
            ordered_quantity: 10,
            waived_quantity: 0,
            remaining_quantity: 0,
            price_per_unit: '800.00',
          },
        ],
        orders: [],
      },
    };
    vi.mocked(posApi.get).mockResolvedValue(completePO);
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrapWithParam(<PODetail />, '/fulfil/pos/1', '/fulfil/pos/:id'));
    await waitFor(() => expect(screen.getByText('Complete')).toBeInTheDocument());
  });

  it('shows Partially Waived status', async () => {
    const waivedPO: PurchaseOrder = {
      ...mockPO,
      fulfillment_status: {
        line_items: [
          {
            line_item_id: 1,
            item_id: 1,
            item_name: 'Camera LR',
            original_quantity: 10,
            ordered_quantity: 0,
            waived_quantity: 3,
            remaining_quantity: 7,
            price_per_unit: '800.00',
          },
        ],
        orders: [],
      },
    };
    vi.mocked(posApi.get).mockResolvedValue(waivedPO);
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrapWithParam(<PODetail />, '/fulfil/pos/1', '/fulfil/pos/:id'));
    await waitFor(() => expect(screen.getByText('Partially Waived')).toBeInTheDocument());
  });

  it('shows Not Started status for unfulfilled line item', async () => {
    const notStartedPO: PurchaseOrder = {
      ...mockPO,
      fulfillment_status: {
        line_items: [
          {
            line_item_id: 1,
            item_id: 1,
            item_name: 'Camera LR',
            original_quantity: 10,
            ordered_quantity: 0,
            waived_quantity: 0,
            remaining_quantity: 10,
            price_per_unit: '800.00',
          },
        ],
        orders: [],
      },
    };
    vi.mocked(posApi.get).mockResolvedValue(notStartedPO);
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrapWithParam(<PODetail />, '/fulfil/pos/1', '/fulfil/pos/:id'));
    await waitFor(() => expect(screen.getByText('Not Started')).toBeInTheDocument());
  });
});

// ==================== ORDER LIST ====================
describe('OrderList', () => {
  it('renders orders table with status badge', async () => {
    vi.mocked(ordersApi.list).mockResolvedValue([
      mockOrder,
      { ...mockOrder, id: 2, order_number: 'ORD-002', status: 'CLOSED', customer_name: 'Beta' },
    ]);
    render(wrap(<OrderList />));
    await waitFor(() => expect(screen.getByText('ORD-001')).toBeInTheDocument());
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('ORD-002')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    vi.mocked(ordersApi.list).mockResolvedValue([]);
    render(wrap(<OrderList />));
    await waitFor(() => expect(screen.getByText(/No orders found/)).toBeInTheDocument());
  });

  it('handles delete', async () => {
    vi.mocked(ordersApi.list).mockResolvedValue([mockOrder]);
    vi.mocked(ordersApi.delete).mockResolvedValue(undefined);
    window.confirm = vi.fn(() => true);
    render(wrap(<OrderList />));
    await waitFor(() => expect(screen.getByText('Delete')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Delete'));
    expect(ordersApi.delete).toHaveBeenCalledWith(1);
  });

  it('shows error on load failure', async () => {
    vi.mocked(ordersApi.list).mockRejectedValue({ response: { data: { detail: 'Load error' } } });
    render(wrap(<OrderList />));
    await waitFor(() => expect(screen.getByText('Load error')).toBeInTheDocument());
  });

  it('shows delete error', async () => {
    vi.mocked(ordersApi.list).mockResolvedValue([mockOrder]);
    vi.mocked(ordersApi.delete).mockRejectedValue({
      response: { data: { detail: 'Delete failed' } },
    });
    window.confirm = vi.fn(() => true);
    render(wrap(<OrderList />));
    await waitFor(() => expect(screen.getByText('Delete')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Delete'));
    await waitFor(() => expect(screen.getByText('Delete failed')).toBeInTheDocument());
  });

  it('shows orders with all column variants', async () => {
    const closedOrder: Order = {
      ...mockOrder,
      id: 2,
      order_number: 'ORD-002',
      status: 'CLOSED',
      customer_name: undefined,
      customer_id: 'c2',
      created_at: undefined,
    };
    vi.mocked(ordersApi.list).mockResolvedValue([mockOrder, closedOrder]);
    render(wrap(<OrderList />));
    await waitFor(() => expect(screen.getByText('ORD-002')).toBeInTheDocument());
    expect(screen.getByText('c2')).toBeInTheDocument();
  });

  it('hides admin actions for non-admin', async () => {
    setUserAuth();
    vi.mocked(ordersApi.list).mockResolvedValue([mockOrder]);
    render(wrap(<OrderList />));
    await waitFor(() => expect(screen.getByText('ORD-001')).toBeInTheDocument());
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    expect(screen.queryByText('Create Order')).not.toBeInTheDocument();
  });
});

// ==================== ORDER FORM ====================
describe('OrderForm', () => {
  it('renders create form with allocation checkbox', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([]);
    render(wrap(<OrderForm />));
    expect(screen.getByRole('heading', { name: 'Create Order' })).toBeInTheDocument();
    expect(screen.getByText('Automatic PO Allocation')).toBeInTheDocument();
  });

  it('adds and removes line items', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrap(<OrderForm />));
    await userEvent.click(screen.getByText('Add Item'));
    await waitFor(() => expect(screen.getByText('Remove')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Remove'));
    await waitFor(() => expect(screen.getByText(/No line items/)).toBeInTheDocument());
  });

  it('validates line items required', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([]);
    render(wrap(<OrderForm />));
    await userEvent.type(screen.getByLabelText(/Customer ID/), 'c1');
    await userEvent.click(screen.getByText('Create Order', { selector: 'button' }));
    await waitFor(() =>
      expect(screen.getByText('At least one line item is required')).toBeInTheDocument(),
    );
  });

  it('submits create form', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(ordersApi.create).mockResolvedValue(mockOrder);
    render(wrap(<OrderForm />));
    await userEvent.type(screen.getByLabelText(/Customer ID/), 'cust-1');
    await userEvent.click(screen.getByText('Add Item'));
    await userEvent.click(screen.getByText('Create Order', { selector: 'button' }));
    await waitFor(() => expect(ordersApi.create).toHaveBeenCalled());
    expect(mockNavigate).toHaveBeenCalledWith('/fulfil/orders');
  });

  it('shows error on submit failure', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(ordersApi.create).mockRejectedValue({ response: { data: { detail: 'Invalid' } } });
    render(wrap(<OrderForm />));
    await userEvent.type(screen.getByLabelText(/Customer ID/), 'c1');
    await userEvent.click(screen.getByText('Add Item'));
    await userEvent.click(screen.getByText('Create Order', { selector: 'button' }));
    await waitFor(() => expect(screen.getByText('Invalid')).toBeInTheDocument());
  });

  it('shows field errors on submit failure', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(ordersApi.create).mockRejectedValue({
      response: { data: { customer_id: ['Required'], 'line_items[0].item': ['Invalid'] } },
    });
    render(wrap(<OrderForm />));
    await userEvent.type(screen.getByLabelText(/Customer ID/), 'c1');
    await userEvent.click(screen.getByText('Add Item'));
    await userEvent.click(screen.getByText('Create Order', { selector: 'button' }));
    await waitFor(() => expect(screen.getByText(/customer id: Required/)).toBeInTheDocument());
  });

  it('renders edit form with data', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(ordersApi.get).mockResolvedValue(mockOrder);
    render(wrapWithParam(<OrderForm />, '/fulfil/orders/1/edit', '/fulfil/orders/:id/edit'));
    await waitFor(() => expect(screen.getByDisplayValue('cust-1')).toBeInTheDocument());
    expect(screen.getByText('Edit Order')).toBeInTheDocument();
  });

  it('submits update form', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(ordersApi.get).mockResolvedValue(mockOrder);
    vi.mocked(ordersApi.update).mockResolvedValue(mockOrder);
    render(wrapWithParam(<OrderForm />, '/fulfil/orders/1/edit', '/fulfil/orders/:id/edit'));
    await waitFor(() => expect(screen.getByDisplayValue('cust-1')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Update Order'));
    await waitFor(() => expect(ordersApi.update).toHaveBeenCalledWith(1, expect.anything()));
    expect(mockNavigate).toHaveBeenCalledWith('/fulfil/orders');
  });

  it('toggles allocation preview', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([]);
    render(wrap(<OrderForm />));
    expect(screen.getByText('Show Preview')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Show Preview'));
    expect(screen.getByText('Hide Preview')).toBeInTheDocument();
    expect(screen.getByText('Available POs for Allocation')).toBeInTheDocument();
  });

  it('shows ad-hoc mode when allocation unchecked', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrap(<OrderForm />));
    await userEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByText(/Ad-hoc order/)).toBeInTheDocument();
    await userEvent.click(screen.getByText('Add Item'));
    await waitFor(() => expect(screen.getByText('Price per Unit')).toBeInTheDocument());
  });

  it('shows PO price for allocated items', async () => {
    const poWithFulfillment: PurchaseOrder = {
      ...mockPO,
      fulfillment_status: {
        line_items: [
          {
            line_item_id: 1,
            item_name: 'Camera LR',
            item_id: 1,
            original_quantity: 10,
            ordered_quantity: 0,
            waived_quantity: 0,
            remaining_quantity: 10,
            price_per_unit: '800.00',
          },
        ],
        orders: [],
      },
    };
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(posApi.list).mockResolvedValue([poWithFulfillment]);
    render(wrap(<OrderForm />));
    await userEvent.type(screen.getByLabelText(/Customer ID/), 'cust-1');
    await waitFor(() => expect(posApi.list).toHaveBeenCalled());
    await userEvent.click(screen.getByText('Add Item'));
    const selects = screen.getAllByRole('combobox');
    const itemSelect = selects.find((s) => s.querySelector('option[value="0"]'));
    if (itemSelect) await userEvent.selectOptions(itemSelect, '1');
    await waitFor(() => expect(screen.getByText(/\$800\.00 \/ unit/)).toBeInTheDocument());
  });

  it('shows allocation preview with POs', async () => {
    const poWithFulfillment: PurchaseOrder = {
      ...mockPO,
      start_date: '2025-01-01',
      fulfillment_status: {
        line_items: [
          {
            line_item_id: 1,
            item_name: 'Camera LR',
            item_id: 1,
            original_quantity: 10,
            ordered_quantity: 0,
            waived_quantity: 0,
            remaining_quantity: 10,
            price_per_unit: '800.00',
          },
        ],
        orders: [],
      },
    };
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(posApi.list).mockResolvedValue([poWithFulfillment]);
    render(wrap(<OrderForm />));
    await userEvent.type(screen.getByLabelText(/Customer ID/), 'cust-1');
    await waitFor(() => expect(posApi.list).toHaveBeenCalled());
    await userEvent.click(screen.getByText('Show Preview'));
    await waitFor(() => expect(screen.getByText('PO-001')).toBeInTheDocument());
    expect(screen.getByText('10 available')).toBeInTheDocument();
  });

  it('shows loading spinner in edit mode', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([]);
    vi.mocked(ordersApi.get).mockImplementation(() => new Promise(() => {}));
    render(wrapWithParam(<OrderForm />, '/fulfil/orders/1/edit', '/fulfil/orders/:id/edit'));
    await waitFor(() => expect(document.querySelector('.animate-spin')).toBeInTheDocument());
  });

  it('updates line item fields', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrap(<OrderForm />));
    await userEvent.click(screen.getByText('Add Item'));
    const qtyInput = screen.getByDisplayValue('1');
    await userEvent.clear(qtyInput);
    await userEvent.type(qtyInput, '10');
    expect(qtyInput).toHaveValue(10);
  });

  it('navigates back on cancel', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([]);
    render(wrap(<OrderForm />));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockNavigate).toHaveBeenCalledWith('/fulfil/orders');
  });

  it('shows error when items fail to load', async () => {
    vi.mocked(itemsApi.list).mockRejectedValue(new Error('fail'));
    render(wrap(<OrderForm />));
    await waitFor(() => expect(screen.getByText('Failed to load items')).toBeInTheDocument());
  });

  it('shows load error in edit mode', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([]);
    vi.mocked(ordersApi.get).mockRejectedValue({ response: { data: { detail: 'Not found' } } });
    render(wrapWithParam(<OrderForm />, '/fulfil/orders/1/edit', '/fulfil/orders/:id/edit'));
    await waitFor(() => expect(screen.getByText('Not found')).toBeInTheDocument());
  });

  it('shows no PO available for item without matching PO', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(posApi.list).mockResolvedValue([]);
    render(wrap(<OrderForm />));
    await userEvent.type(screen.getByLabelText(/Customer ID/), 'cust-1');
    await userEvent.click(screen.getByText('Add Item'));
    const selects = screen.getAllByRole('combobox');
    const itemSelect = selects.find((s) => s.querySelector('option[value="0"]'));
    if (itemSelect) await userEvent.selectOptions(itemSelect, '1');
    await waitFor(() => expect(screen.getByText('No PO available')).toBeInTheDocument());
  });

  it('shows ad-hoc line item field errors on submit failure', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(ordersApi.create).mockRejectedValue({
      response: {
        data: { 'line_items[0].price_per_unit': ['Price is required for ad-hoc orders'] },
      },
    });
    render(wrap(<OrderForm />));
    await userEvent.type(screen.getByLabelText(/Customer ID/), 'cust-1');
    // Uncheck allocation to show ad-hoc price fields
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByText('Add Item'));
    await userEvent.click(screen.getByText('Create Order', { selector: 'button' }));
    await waitFor(() => expect(screen.getByText(/1 line item error/)).toBeInTheDocument());
  });
});

// ==================== ORDER DETAIL ====================
describe('OrderDetail', () => {
  it('renders order detail with fulfillment status', async () => {
    vi.mocked(ordersApi.get).mockResolvedValue(mockOrder);
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrapWithParam(<OrderDetail />, '/fulfil/orders/1', '/fulfil/orders/:id'));
    await waitFor(() => expect(screen.getByText('ORD-001')).toBeInTheDocument());
    expect(screen.getByText('Close Order')).toBeInTheDocument();
    expect(screen.getByText('40% Delivered')).toBeInTheDocument();
  });

  it('shows source POs and deliveries', async () => {
    vi.mocked(ordersApi.get).mockResolvedValue(mockOrder);
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrapWithParam(<OrderDetail />, '/fulfil/orders/1', '/fulfil/orders/:id'));
    await waitFor(() => expect(screen.getByText('Source Purchase Orders')).toBeInTheDocument());
    expect(screen.getByText('PO-001')).toBeInTheDocument();
    expect(screen.getByText('DEL-001')).toBeInTheDocument();
  });

  it('shows no fulfillment status', async () => {
    vi.mocked(ordersApi.get).mockResolvedValue({ ...mockOrder, fulfillment_status: undefined });
    vi.mocked(itemsApi.list).mockResolvedValue([]);
    render(wrapWithParam(<OrderDetail />, '/fulfil/orders/1', '/fulfil/orders/:id'));
    await waitFor(() =>
      expect(screen.getByText(/No deliveries have been created/)).toBeInTheDocument(),
    );
  });

  it('handles close order', async () => {
    vi.mocked(ordersApi.get).mockResolvedValue(mockOrder);
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(ordersApi.close).mockResolvedValue({ ...mockOrder, status: 'CLOSED' });
    window.confirm = vi.fn(() => true);
    render(wrapWithParam(<OrderDetail />, '/fulfil/orders/1', '/fulfil/orders/:id'));
    await waitFor(() => expect(screen.getByText('Close Order')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Close Order'));
    expect(ordersApi.close).toHaveBeenCalledWith(1);
  });

  it('shows error on load failure', async () => {
    vi.mocked(ordersApi.get).mockRejectedValue({ response: { data: { detail: 'Not found' } } });
    vi.mocked(itemsApi.list).mockResolvedValue([]);
    render(wrapWithParam(<OrderDetail />, '/fulfil/orders/999', '/fulfil/orders/:id'));
    await waitFor(() => expect(screen.getByText('Not found')).toBeInTheDocument());
  });

  it('shows line item PO allocation', async () => {
    vi.mocked(ordersApi.get).mockResolvedValue(mockOrder);
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrapWithParam(<OrderDetail />, '/fulfil/orders/1', '/fulfil/orders/:id'));
    await waitFor(() => expect(screen.getByText('PO Line #1')).toBeInTheDocument());
  });

  it('shows ad-hoc for line items without PO', async () => {
    const adHocOrder: Order = { ...mockOrder, line_items: [{ id: 10, item: 1, quantity: 5 }] };
    vi.mocked(ordersApi.get).mockResolvedValue(adHocOrder);
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrapWithParam(<OrderDetail />, '/fulfil/orders/1', '/fulfil/orders/:id'));
    await waitFor(() => expect(screen.getByText('Ad-hoc')).toBeInTheDocument());
  });

  it('handles close order error', async () => {
    vi.mocked(ordersApi.get).mockResolvedValue(mockOrder);
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(ordersApi.close).mockRejectedValue({
      response: { data: { detail: 'Close failed' } },
    });
    window.confirm = vi.fn(() => true);
    render(wrapWithParam(<OrderDetail />, '/fulfil/orders/1', '/fulfil/orders/:id'));
    await waitFor(() => expect(screen.getByText('Close Order')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Close Order'));
    await waitFor(() => expect(screen.getByText('Close failed')).toBeInTheDocument());
  });

  it('shows closed order without close button', async () => {
    vi.mocked(ordersApi.get).mockResolvedValue({ ...mockOrder, status: 'CLOSED' });
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrapWithParam(<OrderDetail />, '/fulfil/orders/1', '/fulfil/orders/:id'));
    await waitFor(() => expect(screen.getByText('ORD-001')).toBeInTheDocument());
    expect(screen.queryByText('Close Order')).not.toBeInTheDocument();
  });

  it('shows order with notes', async () => {
    vi.mocked(ordersApi.get).mockResolvedValue({ ...mockOrder, notes: 'Special handling' });
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrapWithParam(<OrderDetail />, '/fulfil/orders/1', '/fulfil/orders/:id'));
    await waitFor(() => expect(screen.getByText('Special handling')).toBeInTheDocument());
  });

  it('shows fully delivered fulfillment status', async () => {
    const fullyDelivered: Order = {
      ...mockOrder,
      fulfillment_status: {
        line_items: [
          {
            line_item_id: 10,
            item_id: 1,
            item_name: 'Camera LR',
            original_quantity: 5,
            delivered_quantity: 5,
            remaining_quantity: 0,
            price_per_unit: '800.00',
          },
        ],
        source_pos: [],
        deliveries: [],
      },
    };
    vi.mocked(ordersApi.get).mockResolvedValue(fullyDelivered);
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrapWithParam(<OrderDetail />, '/fulfil/orders/1', '/fulfil/orders/:id'));
    await waitFor(() => expect(screen.getByText('Fully Delivered')).toBeInTheDocument());
  });

  it('shows not started fulfillment status', async () => {
    const notStarted: Order = {
      ...mockOrder,
      fulfillment_status: {
        line_items: [
          {
            line_item_id: 10,
            item_id: 1,
            item_name: 'Camera LR',
            original_quantity: 5,
            delivered_quantity: 0,
            remaining_quantity: 5,
            price_per_unit: '800.00',
          },
        ],
        source_pos: [],
        deliveries: [],
      },
    };
    vi.mocked(ordersApi.get).mockResolvedValue(notStarted);
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrapWithParam(<OrderDetail />, '/fulfil/orders/1', '/fulfil/orders/:id'));
    await waitFor(() => expect(screen.getByText('Not Started')).toBeInTheDocument());
  });
});

// ==================== DELIVERY LIST ====================
describe('DeliveryList', () => {
  it('renders deliveries table with tracking and status', async () => {
    vi.mocked(deliveriesApi.list).mockResolvedValue([
      mockDelivery,
      {
        ...mockDelivery,
        id: 2,
        delivery_number: 'DEL-002',
        status: 'CLOSED',
        tracking_number: undefined,
        customer_name: 'Beta',
        ship_date: '2025-02-01',
      },
    ]);
    render(wrap(<DeliveryList />));
    await waitFor(() => expect(screen.getByText('DEL-001')).toBeInTheDocument());
    expect(screen.getByText('TRACK123')).toBeInTheDocument();
    expect(screen.getByText('DEL-002')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('shows serial search link', async () => {
    vi.mocked(deliveriesApi.list).mockResolvedValue([]);
    render(wrap(<DeliveryList />));
    await waitFor(() => expect(screen.getByText('Search Serial Numbers')).toBeInTheDocument());
  });

  it('shows empty state', async () => {
    vi.mocked(deliveriesApi.list).mockResolvedValue([]);
    render(wrap(<DeliveryList />));
    await waitFor(() => expect(screen.getByText(/No deliveries found/)).toBeInTheDocument());
  });

  it('handles delete', async () => {
    vi.mocked(deliveriesApi.list).mockResolvedValue([mockDelivery]);
    vi.mocked(deliveriesApi.delete).mockResolvedValue(undefined);
    window.confirm = vi.fn(() => true);
    render(wrap(<DeliveryList />));
    await waitFor(() => expect(screen.getByText('Delete')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Delete'));
    expect(deliveriesApi.delete).toHaveBeenCalledWith(1);
  });

  it('shows error on load failure', async () => {
    vi.mocked(deliveriesApi.list).mockRejectedValue({ response: { data: { detail: 'Fail' } } });
    render(wrap(<DeliveryList />));
    await waitFor(() => expect(screen.getByText('Fail')).toBeInTheDocument());
  });

  it('shows delete error', async () => {
    vi.mocked(deliveriesApi.list).mockResolvedValue([mockDelivery]);
    vi.mocked(deliveriesApi.delete).mockRejectedValue({
      response: { data: { detail: 'Delete failed' } },
    });
    window.confirm = vi.fn(() => true);
    render(wrap(<DeliveryList />));
    await waitFor(() => expect(screen.getByText('Delete')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Delete'));
    await waitFor(() => expect(screen.getByText('Delete failed')).toBeInTheDocument());
  });

  it('hides admin actions for non-admin', async () => {
    setUserAuth();
    vi.mocked(deliveriesApi.list).mockResolvedValue([mockDelivery]);
    render(wrap(<DeliveryList />));
    await waitFor(() => expect(screen.getByText('DEL-001')).toBeInTheDocument());
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    expect(screen.queryByText('Create Delivery')).not.toBeInTheDocument();
  });
});

// ==================== DELIVERY FORM ====================
describe('DeliveryForm', () => {
  it('renders create form', () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrap(<DeliveryForm />));
    expect(screen.getByRole('heading', { name: 'Create Delivery' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Customer ID/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ship Date/)).toBeInTheDocument();
  });

  it('validates line items required', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrap(<DeliveryForm />));
    await userEvent.type(screen.getByLabelText(/Customer ID/), 'c1');
    await userEvent.click(screen.getByRole('button', { name: /Create Delivery/ }));
    await waitFor(() =>
      expect(screen.getByText('At least one line item is required')).toBeInTheDocument(),
    );
  });

  it('submits create form', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(deliveriesApi.create).mockResolvedValue(mockDelivery);
    vi.mocked(ordersApi.list).mockResolvedValue([mockOrder]);
    render(wrap(<DeliveryForm />));
    await userEvent.type(screen.getByLabelText(/Customer ID/), 'cust-1');
    await waitFor(() => expect(ordersApi.list).toHaveBeenCalled());
    await userEvent.click(screen.getByText('Add Order'));
    const select = screen.getByTestId('order-select-0');
    await userEvent.selectOptions(select, '1');
    await userEvent.click(screen.getByText('Add Item'));
    const snInput = screen.getByPlaceholderText('SN123456');
    await userEvent.type(snInput, 'SN-TEST-1');
    await userEvent.click(screen.getByRole('button', { name: /Create Delivery/ }));
    await waitFor(() => expect(deliveriesApi.create).toHaveBeenCalled());
    expect(mockNavigate).toHaveBeenCalledWith('/fulfil/deliveries');
  });

  it('shows error on submit failure', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(deliveriesApi.create).mockRejectedValue({
      response: { data: { detail: 'Bad request' } },
    });
    vi.mocked(ordersApi.list).mockResolvedValue([mockOrder]);
    render(wrap(<DeliveryForm />));
    await userEvent.type(screen.getByLabelText(/Customer ID/), 'cust-1');
    await waitFor(() => expect(ordersApi.list).toHaveBeenCalled());
    await userEvent.click(screen.getByText('Add Order'));
    const select = screen.getByTestId('order-select-0');
    await userEvent.selectOptions(select, '1');
    await userEvent.click(screen.getByText('Add Item'));
    const snInput = screen.getByPlaceholderText('SN123456');
    await userEvent.type(snInput, 'SN-1');
    await userEvent.click(screen.getByRole('button', { name: /Create Delivery/ }));
    await waitFor(() => expect(screen.getByText('Bad request')).toBeInTheDocument());
  });

  it('renders edit form with data', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(deliveriesApi.get).mockResolvedValue(mockDelivery);
    vi.mocked(ordersApi.list).mockResolvedValue([mockOrder]);
    render(
      wrapWithParam(<DeliveryForm />, '/fulfil/deliveries/1/edit', '/fulfil/deliveries/:id/edit'),
    );
    await waitFor(() => expect(screen.getByDisplayValue('cust-1')).toBeInTheDocument());
    expect(screen.getByText('Edit Delivery')).toBeInTheDocument();
    expect(screen.getByDisplayValue('TRACK123')).toBeInTheDocument();
  });

  it('shows no open orders message', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(ordersApi.list).mockResolvedValue([]);
    render(wrap(<DeliveryForm />));
    await userEvent.type(screen.getByLabelText(/Customer ID/), 'cust-1');
    await waitFor(() => expect(screen.getByText(/No open orders found/)).toBeInTheDocument());
  });

  it('detects duplicate serial numbers', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(ordersApi.list).mockResolvedValue([mockOrder]);
    render(wrap(<DeliveryForm />));
    await userEvent.type(screen.getByLabelText(/Customer ID/), 'cust-1');
    await waitFor(() => expect(ordersApi.list).toHaveBeenCalled());
    await userEvent.click(screen.getByText('Add Order'));
    const select = screen.getByTestId('order-select-0');
    await userEvent.selectOptions(select, '1');
    await userEvent.click(screen.getByText('Add Item'));
    await userEvent.click(screen.getByText('Add Item'));
    const snInputs = screen.getAllByPlaceholderText('SN123456');
    await userEvent.type(snInputs[0]!, 'DUPE-SN');
    await userEvent.type(snInputs[1]!, 'DUPE-SN');
    await userEvent.click(screen.getByRole('button', { name: /Create Delivery/ }));
    await waitFor(() =>
      expect(screen.getByText(/Duplicate serial numbers found/)).toBeInTheDocument(),
    );
  });

  it('removes order group', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(ordersApi.list).mockResolvedValue([mockOrder]);
    render(wrap(<DeliveryForm />));
    await userEvent.type(screen.getByLabelText(/Customer ID/), 'cust-1');
    await waitFor(() => expect(ordersApi.list).toHaveBeenCalled());
    await userEvent.click(screen.getByText('Add Order'));
    await waitFor(() => expect(screen.getByText('Remove Order')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Remove Order'));
    await waitFor(() => expect(screen.getByText(/No orders added/)).toBeInTheDocument());
  });

  it('shows field errors on submit failure', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(ordersApi.list).mockResolvedValue([mockOrder]);
    vi.mocked(deliveriesApi.create).mockRejectedValue({
      response: {
        data: {
          tracking_number: ['Invalid tracking'],
          'line_items[0].serial_number': ['Duplicate'],
        },
      },
    });
    render(wrap(<DeliveryForm />));
    await userEvent.type(screen.getByLabelText(/Customer ID/), 'cust-1');
    await waitFor(() => expect(ordersApi.list).toHaveBeenCalled());
    await userEvent.click(screen.getByText('Add Order'));
    await userEvent.selectOptions(screen.getByTestId('order-select-0'), '1');
    await userEvent.click(screen.getByText('Add Item'));
    await userEvent.type(screen.getByPlaceholderText('SN123456'), 'SN-1');
    await userEvent.click(screen.getByRole('button', { name: /Create Delivery/ }));
    await waitFor(() =>
      expect(screen.getByText(/tracking number: Invalid tracking/)).toBeInTheDocument(),
    );
  });

  it('navigates back on cancel', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrap(<DeliveryForm />));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockNavigate).toHaveBeenCalledWith('/fulfil/deliveries');
  });

  it('shows error when items fail to load', async () => {
    vi.mocked(itemsApi.list).mockRejectedValue(new Error('fail'));
    render(wrap(<DeliveryForm />));
    await waitFor(() => expect(screen.getByText('Failed to load items')).toBeInTheDocument());
  });

  it('submits update in edit mode', async () => {
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(deliveriesApi.get).mockResolvedValue(mockDelivery);
    vi.mocked(ordersApi.list).mockResolvedValue([mockOrder]);
    vi.mocked(deliveriesApi.update).mockResolvedValue(mockDelivery);
    render(
      wrapWithParam(<DeliveryForm />, '/fulfil/deliveries/1/edit', '/fulfil/deliveries/:id/edit'),
    );
    await waitFor(() => expect(screen.getByDisplayValue('cust-1')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Update Delivery/ }));
    await waitFor(() => expect(deliveriesApi.update).toHaveBeenCalledWith(1, expect.anything()));
    expect(mockNavigate).toHaveBeenCalledWith('/fulfil/deliveries');
  });
});

// ==================== DELIVERY DETAIL ====================
describe('DeliveryDetail', () => {
  it('renders delivery detail with serial numbers', async () => {
    vi.mocked(deliveriesApi.get).mockResolvedValue(mockDelivery);
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrapWithParam(<DeliveryDetail />, '/fulfil/deliveries/1', '/fulfil/deliveries/:id'));
    await waitFor(() => expect(screen.getByText('DEL-001')).toBeInTheDocument());
    expect(screen.getByText('SN-001')).toBeInTheDocument();
    expect(screen.getByText('Close Delivery')).toBeInTheDocument();
  });

  it('shows tracking number', async () => {
    vi.mocked(deliveriesApi.get).mockResolvedValue(mockDelivery);
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrapWithParam(<DeliveryDetail />, '/fulfil/deliveries/1', '/fulfil/deliveries/:id'));
    await waitFor(() => expect(screen.getByText('TRACK123')).toBeInTheDocument());
  });

  it('handles close delivery', async () => {
    vi.mocked(deliveriesApi.get).mockResolvedValue(mockDelivery);
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    vi.mocked(deliveriesApi.close).mockResolvedValue({ ...mockDelivery, status: 'CLOSED' });
    window.confirm = vi.fn(() => true);
    render(wrapWithParam(<DeliveryDetail />, '/fulfil/deliveries/1', '/fulfil/deliveries/:id'));
    await waitFor(() => expect(screen.getByText('Close Delivery')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Close Delivery'));
    expect(deliveriesApi.close).toHaveBeenCalledWith(1);
  });

  it('shows error on load failure', async () => {
    vi.mocked(deliveriesApi.get).mockRejectedValue({ response: { data: { detail: 'Not found' } } });
    vi.mocked(itemsApi.list).mockResolvedValue([]);
    render(wrapWithParam(<DeliveryDetail />, '/fulfil/deliveries/999', '/fulfil/deliveries/:id'));
    await waitFor(() => expect(screen.getByText('Not found')).toBeInTheDocument());
  });

  it('shows closed delivery with closed_at timestamp', async () => {
    vi.mocked(deliveriesApi.get).mockResolvedValue({
      ...mockDelivery,
      status: 'CLOSED',
      closed_at: '2025-02-01T12:00:00Z',
    });
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrapWithParam(<DeliveryDetail />, '/fulfil/deliveries/1', '/fulfil/deliveries/:id'));
    await waitFor(() => expect(screen.getByText('DEL-001')).toBeInTheDocument());
    expect(screen.queryByText('Close Delivery')).not.toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('shows delivery without tracking number', async () => {
    vi.mocked(deliveriesApi.get).mockResolvedValue({
      ...mockDelivery,
      tracking_number: undefined,
      notes: undefined,
    });
    vi.mocked(itemsApi.list).mockResolvedValue([mockItem]);
    render(wrapWithParam(<DeliveryDetail />, '/fulfil/deliveries/1', '/fulfil/deliveries/:id'));
    await waitFor(() => expect(screen.getByText('DEL-001')).toBeInTheDocument());
  });
});

// ==================== SERIAL SEARCH
describe('SerialSearch', () => {
  it('renders search form', () => {
    render(wrap(<SerialSearch />));
    expect(screen.getByText('Search by Serial Number')).toBeInTheDocument();
    expect(screen.getByLabelText(/Serial Number/)).toBeInTheDocument();
  });

  it('shows result on successful search', async () => {
    vi.mocked(deliveriesApi.searchSerial).mockResolvedValue(mockDelivery);
    render(wrap(<SerialSearch />));
    await userEvent.type(screen.getByLabelText(/Serial Number/), 'SN-001');
    await userEvent.click(screen.getByText('Search'));
    await waitFor(() => expect(screen.getByText('Serial number found!')).toBeInTheDocument());
    expect(screen.getByText('DEL-001')).toBeInTheDocument();
  });

  it('shows not found error', async () => {
    vi.mocked(deliveriesApi.searchSerial).mockRejectedValue({ response: { status: 404 } });
    render(wrap(<SerialSearch />));
    await userEvent.type(screen.getByLabelText(/Serial Number/), 'INVALID');
    await userEvent.click(screen.getByText('Search'));
    await waitFor(() => expect(screen.getByText('Serial number not found')).toBeInTheDocument());
  });

  it('validates empty input', async () => {
    render(wrap(<SerialSearch />));
    await userEvent.click(screen.getByText('Search'));
    await waitFor(() =>
      expect(screen.getByText('Please enter a serial number')).toBeInTheDocument(),
    );
  });
});
