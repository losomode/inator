import { describe, it, expect, vi, beforeEach } from 'vitest';
import { itemsApi, posApi, ordersApi, deliveriesApi, attachmentsApi } from './api';
import apiClient from '../../shared/api/client';

vi.mock('../../shared/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);
const mockPatch = vi.mocked(apiClient.patch);
const mockDelete = vi.mocked(apiClient.delete);

beforeEach(() => vi.clearAllMocks());

describe('itemsApi', () => {
  it('list handles array response', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 1, name: 'Camera' }] });
    expect(await itemsApi.list()).toEqual([{ id: 1, name: 'Camera' }]);
    expect(mockGet).toHaveBeenCalledWith('/fulfil/items/');
  });

  it('list handles paginated response', async () => {
    mockGet.mockResolvedValue({
      data: { results: [{ id: 2 }], count: 1, next: null, previous: null },
    });
    expect(await itemsApi.list()).toEqual([{ id: 2 }]);
  });

  it('get fetches single item', async () => {
    mockGet.mockResolvedValue({ data: { id: 5 } });
    expect(await itemsApi.get(5)).toEqual({ id: 5 });
    expect(mockGet).toHaveBeenCalledWith('/fulfil/items/5/');
  });

  it('create posts item', async () => {
    mockPost.mockResolvedValue({ data: { id: 1 } });
    await itemsApi.create({ name: 'Node', version: 'v1', msrp: '100', min_price: '80' });
    expect(mockPost).toHaveBeenCalledWith(
      '/fulfil/items/',
      expect.objectContaining({ name: 'Node' }),
    );
  });

  it('update patches item', async () => {
    mockPatch.mockResolvedValue({ data: { id: 1, name: 'updated' } });
    expect(await itemsApi.update(1, { name: 'updated' })).toEqual({ id: 1, name: 'updated' });
  });

  it('delete removes item', async () => {
    mockDelete.mockResolvedValue({ data: undefined });
    await itemsApi.delete(3);
    expect(mockDelete).toHaveBeenCalledWith('/fulfil/items/3/');
  });
});

describe('posApi', () => {
  it('list unwraps paginated response', async () => {
    mockGet.mockResolvedValue({
      data: { results: [{ id: 1 }], count: 1, next: null, previous: null },
    });
    expect(await posApi.list()).toEqual([{ id: 1 }]);
    expect(mockGet).toHaveBeenCalledWith('/fulfil/purchase-orders/');
  });

  it('get fetches single PO', async () => {
    mockGet.mockResolvedValue({ data: { id: 2, po_number: 'PO-001' } });
    expect(await posApi.get(2)).toEqual({ id: 2, po_number: 'PO-001' });
  });

  it('create posts PO', async () => {
    mockPost.mockResolvedValue({ data: { id: 1 } });
    await posApi.create({ customer_id: 'c1', status: 'OPEN', line_items: [] } as never);
    expect(mockPost).toHaveBeenCalledWith('/fulfil/purchase-orders/', expect.anything());
  });

  it('update patches PO', async () => {
    mockPatch.mockResolvedValue({ data: { id: 1 } });
    await posApi.update(1, { notes: 'updated' });
    expect(mockPatch).toHaveBeenCalledWith('/fulfil/purchase-orders/1/', { notes: 'updated' });
  });

  it('delete removes PO', async () => {
    mockDelete.mockResolvedValue({ data: undefined });
    await posApi.delete(5);
    expect(mockDelete).toHaveBeenCalledWith('/fulfil/purchase-orders/5/');
  });

  it('close posts to close endpoint', async () => {
    mockPost.mockResolvedValue({ data: { id: 1, status: 'CLOSED' } });
    await posApi.close(1, true, 'reason');
    expect(mockPost).toHaveBeenCalledWith('/fulfil/purchase-orders/1/close/', {
      admin_override: true,
      override_reason: 'reason',
    });
  });

  it('waive posts waive data', async () => {
    mockPost.mockResolvedValue({ data: { message: 'ok' } });
    await posApi.waive(1, 10, 5, 'cancelled');
    expect(mockPost).toHaveBeenCalledWith('/fulfil/purchase-orders/1/waive/', {
      line_item_id: 10,
      quantity_to_waive: 5,
      reason: 'cancelled',
    });
  });
});

describe('ordersApi', () => {
  it('list handles array response', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 1 }] });
    expect(await ordersApi.list()).toEqual([{ id: 1 }]);
  });

  it('get fetches single order', async () => {
    mockGet.mockResolvedValue({ data: { id: 3 } });
    expect(await ordersApi.get(3)).toEqual({ id: 3 });
  });

  it('create posts order', async () => {
    mockPost.mockResolvedValue({ data: { id: 1 } });
    await ordersApi.create({ customer_id: 'c1', status: 'OPEN', line_items: [] } as never);
    expect(mockPost).toHaveBeenCalledWith('/fulfil/orders/', expect.anything());
  });

  it('close posts to close endpoint', async () => {
    mockPost.mockResolvedValue({ data: { id: 1 } });
    await ordersApi.close(1);
    expect(mockPost).toHaveBeenCalledWith('/fulfil/orders/1/close/', expect.anything());
  });

  it('waive posts waive data', async () => {
    mockPost.mockResolvedValue({ data: { detail: 'ok' } });
    await ordersApi.waive(2, 5, 3);
    expect(mockPost).toHaveBeenCalledWith('/fulfil/orders/2/waive/', {
      line_item_id: 5,
      quantity_to_waive: 3,
      reason: undefined,
    });
  });

  it('delete removes order', async () => {
    mockDelete.mockResolvedValue({ data: undefined });
    await ordersApi.delete(4);
    expect(mockDelete).toHaveBeenCalledWith('/fulfil/orders/4/');
  });
});

describe('deliveriesApi', () => {
  it('list unwraps response', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 1 }] });
    expect(await deliveriesApi.list()).toEqual([{ id: 1 }]);
    expect(mockGet).toHaveBeenCalledWith('/fulfil/deliveries/');
  });

  it('get fetches single delivery', async () => {
    mockGet.mockResolvedValue({ data: { id: 7 } });
    expect(await deliveriesApi.get(7)).toEqual({ id: 7 });
  });

  it('close posts to close endpoint', async () => {
    mockPost.mockResolvedValue({ data: { id: 1, status: 'CLOSED' } });
    expect(await deliveriesApi.close(1)).toEqual({ id: 1, status: 'CLOSED' });
  });

  it('searchSerial sends serial as param', async () => {
    mockGet.mockResolvedValue({ data: { id: 1, delivery_number: 'DEL-001' } });
    const result = await deliveriesApi.searchSerial('SN123');
    expect(mockGet).toHaveBeenCalledWith('/fulfil/deliveries/search_serial/', {
      params: { serial_number: 'SN123' },
    });
    expect(result).toEqual({ id: 1, delivery_number: 'DEL-001' });
  });

  it('delete removes delivery', async () => {
    mockDelete.mockResolvedValue({ data: undefined });
    await deliveriesApi.delete(9);
    expect(mockDelete).toHaveBeenCalledWith('/fulfil/deliveries/9/');
  });

  it('create posts delivery', async () => {
    mockPost.mockResolvedValue({ data: { id: 1 } });
    await deliveriesApi.create({
      customer_id: 'c1',
      ship_date: '2025-01-01',
      status: 'OPEN',
      line_items: [],
    } as never);
    expect(mockPost).toHaveBeenCalledWith('/fulfil/deliveries/', expect.anything());
  });
});

describe('attachmentsApi', () => {
  it('list fetches attachments by type and id', async () => {
    mockGet.mockResolvedValue({ data: { results: [{ id: 1, filename: 'test.pdf' }] } });
    const result = await attachmentsApi.list('PO', 5);
    expect(mockGet).toHaveBeenCalledWith('/fulfil/attachments/?content_type=PO&object_id=5');
    expect(result).toEqual([{ id: 1, filename: 'test.pdf' }]);
  });

  it('upload posts FormData', async () => {
    mockPost.mockResolvedValue({ data: undefined });
    const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
    await attachmentsApi.upload('ORDER', 3, file);
    expect(mockPost).toHaveBeenCalledWith('/fulfil/attachments/', expect.any(FormData), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  });

  it('delete removes attachment', async () => {
    mockDelete.mockResolvedValue({ data: undefined });
    await attachmentsApi.delete(42);
    expect(mockDelete).toHaveBeenCalledWith('/fulfil/attachments/42/');
  });
});
