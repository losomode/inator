import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authApi, servicesApi, totpApi, mfaApi, webauthnApi } from './api';
import apiClient from '../../shared/api/client';

vi.mock('../../shared/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);
const mockDelete = vi.mocked(apiClient.delete);

describe('authApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('login posts credentials', async () => {
    mockPost.mockResolvedValue({ data: { access: 'a', refresh: 'r' } });
    const result = await authApi.login('user', 'pass');
    expect(mockPost).toHaveBeenCalledWith('/auth/login/', { username: 'user', password: 'pass' });
    expect(result).toEqual({ access: 'a', refresh: 'r' });
  });

  it('ssoProviders fetches from /api/auth/sso-providers/', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({ providers: [{ id: 'google', name: 'Google', login_url: '/g' }] }),
    });
    vi.stubGlobal('fetch', mockFetch);
    const result = await authApi.ssoProviders();
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/sso-providers/');
    expect(result).toEqual([{ id: 'google', name: 'Google', login_url: '/g' }]);
    vi.unstubAllGlobals();
  });

  it('ssoProviders returns empty array when no providers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) }));
    const result = await authApi.ssoProviders();
    expect(result).toEqual([]);
    vi.unstubAllGlobals();
  });
});

describe('servicesApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('list fetches services', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 1, name: 'RMAinator' }] });
    const result = await servicesApi.list();
    expect(mockGet).toHaveBeenCalledWith('/services/');
    expect(result).toEqual([{ id: 1, name: 'RMAinator' }]);
  });
});

describe('totpApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('status fetches TOTP status', async () => {
    mockGet.mockResolvedValue({ data: { enabled: true } });
    const result = await totpApi.status();
    expect(mockGet).toHaveBeenCalledWith('/auth/totp/status/');
    expect(result).toEqual({ enabled: true });
  });

  it('setup posts to setup endpoint', async () => {
    mockPost.mockResolvedValue({ data: { qr_code: 'qr', secret: 's' } });
    const result = await totpApi.setup();
    expect(mockPost).toHaveBeenCalledWith('/auth/totp/setup/');
    expect(result).toEqual({ qr_code: 'qr', secret: 's' });
  });

  it('confirm posts token', async () => {
    mockPost.mockResolvedValue({ data: undefined });
    await totpApi.confirm('123456');
    expect(mockPost).toHaveBeenCalledWith('/auth/totp/confirm/', { token: '123456' });
  });

  it('disable posts token', async () => {
    mockPost.mockResolvedValue({ data: undefined });
    await totpApi.disable('654321');
    expect(mockPost).toHaveBeenCalledWith('/auth/totp/disable/', { token: '654321' });
  });
});

describe('mfaApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('totpVerify posts mfa_token and code', async () => {
    mockPost.mockResolvedValue({ data: { access: 'a', refresh: 'r' } });
    const result = await mfaApi.totpVerify('mfa-tok', '123456');
    expect(mockPost).toHaveBeenCalledWith('/auth/mfa/totp-verify/', {
      mfa_token: 'mfa-tok',
      code: '123456',
    });
    expect(result).toEqual({ access: 'a', refresh: 'r' });
  });

  it('webauthnBegin posts mfa_token', async () => {
    mockPost.mockResolvedValue({ data: { options: { challenge: 'c' } } });
    const result = await mfaApi.webauthnBegin('mfa-tok');
    expect(mockPost).toHaveBeenCalledWith('/auth/mfa/webauthn-begin/', { mfa_token: 'mfa-tok' });
    expect(result).toEqual({ options: { challenge: 'c' } });
  });

  it('webauthnComplete posts mfa_token with assertion', async () => {
    mockPost.mockResolvedValue({ data: { access: 'a', refresh: 'r' } });
    const result = await mfaApi.webauthnComplete('mfa-tok', { id: 'cred' });
    expect(mockPost).toHaveBeenCalledWith('/auth/mfa/webauthn-complete/', {
      mfa_token: 'mfa-tok',
      id: 'cred',
    });
    expect(result).toEqual({ access: 'a', refresh: 'r' });
  });
});

describe('webauthnApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listCredentials fetches credentials', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 1, name: 'Key' }] });
    const result = await webauthnApi.listCredentials();
    expect(mockGet).toHaveBeenCalledWith('/auth/webauthn/credentials/');
    expect(result).toEqual([{ id: 1, name: 'Key' }]);
  });

  it('registerBegin posts name', async () => {
    mockPost.mockResolvedValue({ data: { options: {} } });
    const result = await webauthnApi.registerBegin('YubiKey');
    expect(mockPost).toHaveBeenCalledWith('/auth/webauthn/register/begin/', { name: 'YubiKey' });
    expect(result).toEqual({ options: {} });
  });

  it('registerComplete posts credential', async () => {
    mockPost.mockResolvedValue({ data: undefined });
    await webauthnApi.registerComplete({ id: 'cred' });
    expect(mockPost).toHaveBeenCalledWith('/auth/webauthn/register/complete/', { id: 'cred' });
  });

  it('deleteCredential deletes by id', async () => {
    mockDelete.mockResolvedValue({ data: undefined });
    await webauthnApi.deleteCredential(42);
    expect(mockDelete).toHaveBeenCalledWith('/auth/webauthn/credentials/42/');
  });
});
