import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rmaApi, staleConfigApi } from './api';
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

describe('rmaApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('list handles array response', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 1 }] });
    const result = await rmaApi.list({ archived: false });
    expect(mockGet).toHaveBeenCalledWith('/rma/', { params: { archived: false } });
    expect(result).toEqual([{ id: 1 }]);
  });

  it('list handles paginated response', async () => {
    mockGet.mockResolvedValue({ data: { results: [{ id: 2 }] } });
    const result = await rmaApi.list({});
    expect(result).toEqual([{ id: 2 }]);
  });

  it('create posts RMA data', async () => {
    mockPost.mockResolvedValue({ data: { id: 1, rma_number: 'RMA-001' } });
    const result = await rmaApi.create({ serial_number: 'SN-1' });
    expect(mockPost).toHaveBeenCalledWith('/rma/', { serial_number: 'SN-1' });
    expect(result).toEqual({ id: 1, rma_number: 'RMA-001' });
  });

  it('get fetches single RMA', async () => {
    mockGet.mockResolvedValue({ data: { id: 5 } });
    const result = await rmaApi.get(5);
    expect(mockGet).toHaveBeenCalledWith('/rma/5/');
    expect(result).toEqual({ id: 5 });
  });

  it('update patches RMA', async () => {
    mockPatch.mockResolvedValue({ data: { id: 1, priority: 'HIGH' } });
    const result = await rmaApi.update(1, { priority: 'HIGH' });
    expect(mockPatch).toHaveBeenCalledWith('/rma/1/', { priority: 'HIGH' });
    expect(result).toEqual({ id: 1, priority: 'HIGH' });
  });

  it('delete removes RMA', async () => {
    mockDelete.mockResolvedValue({ data: undefined });
    await rmaApi.delete(3);
    expect(mockDelete).toHaveBeenCalledWith('/rma/3/');
  });

  it('updateState posts state transition', async () => {
    mockPost.mockResolvedValue({ data: { rma: { id: 1, state: 'APPROVED' } } });
    const result = await rmaApi.updateState(1, { state: 'APPROVED', notes: 'ok' });
    expect(mockPost).toHaveBeenCalledWith('/rma/1/state/', { state: 'APPROVED', notes: 'ok' });
    expect(result).toEqual({ rma: { id: 1, state: 'APPROVED' } });
  });

  it('uploadAttachment posts FormData', async () => {
    mockPost.mockResolvedValue({ data: undefined });
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    await rmaApi.uploadAttachment(1, file);
    expect(mockPost).toHaveBeenCalledWith('/rma/1/attachments/', expect.any(FormData), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  });

  it('deleteAttachment removes attachment', async () => {
    mockDelete.mockResolvedValue({ data: undefined });
    await rmaApi.deleteAttachment(42);
    expect(mockDelete).toHaveBeenCalledWith('/rma/attachments/42/');
  });

  it('createGroup posts group data', async () => {
    mockPost.mockResolvedValue({ data: undefined });
    await rmaApi.createGroup({
      rmas: [
        {
          serial_number: 'SN-1',
          fault_notes: 'broken',
          first_ship_date: null,
          priority: 'NORMAL',
        },
      ],
    });
    expect(mockPost).toHaveBeenCalledWith('/rma/group/', {
      rmas: [
        {
          serial_number: 'SN-1',
          fault_notes: 'broken',
          first_ship_date: null,
          priority: 'NORMAL',
        },
      ],
    });
  });

  it('search handles array response', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 1 }] });
    const result = await rmaApi.search({ q: 'SN' });
    expect(mockGet).toHaveBeenCalledWith('/rma/search/', { params: { q: 'SN' } });
    expect(result).toEqual([{ id: 1 }]);
  });

  it('search handles paginated response', async () => {
    mockGet.mockResolvedValue({ data: { results: [{ id: 2 }] } });
    const result = await rmaApi.search({});
    expect(result).toEqual([{ id: 2 }]);
  });

  it('getAdminDashboard fetches metrics', async () => {
    const metrics = { summary: { total_rmas: 10 } };
    mockGet.mockResolvedValue({ data: metrics });
    const result = await rmaApi.getAdminDashboard();
    expect(mockGet).toHaveBeenCalledWith('/rma/admin/dashboard/');
    expect(result).toEqual(metrics);
  });
});

describe('staleConfigApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('list fetches configs', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 1, state: 'SUBMITTED' }] });
    const result = await staleConfigApi.list();
    expect(mockGet).toHaveBeenCalledWith('/rma/admin/stale-config/');
    expect(result).toEqual([{ id: 1, state: 'SUBMITTED' }]);
  });

  it('update patches config', async () => {
    mockPatch.mockResolvedValue({ data: { id: 1, timeout_hours: 48 } });
    const result = await staleConfigApi.update(1, 48);
    expect(mockPatch).toHaveBeenCalledWith('/rma/admin/stale-config/1/', { timeout_hours: 48 });
    expect(result).toEqual({ id: 1, timeout_hours: 48 });
  });

  it('create posts new config', async () => {
    mockPost.mockResolvedValue({ data: { id: 2 } });
    const result = await staleConfigApi.create('SUBMITTED', 'HIGH', 24);
    expect(mockPost).toHaveBeenCalledWith('/rma/admin/stale-config/', {
      state: 'SUBMITTED',
      priority: 'HIGH',
      timeout_hours: 24,
    });
    expect(result).toEqual({ id: 2 });
  });

  it('delete removes config', async () => {
    mockDelete.mockResolvedValue({ data: undefined });
    await staleConfigApi.delete(5);
    expect(mockDelete).toHaveBeenCalledWith('/rma/admin/stale-config/5/');
  });
});
