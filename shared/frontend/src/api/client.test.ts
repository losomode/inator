import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import axios, { type AxiosHeaders } from 'axios';
import apiClient, { getToken, setToken, clearToken } from './client';

describe('Token management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('getToken returns null when no token stored', () => {
    expect(getToken()).toBeNull();
  });

  it('setToken stores and getToken retrieves token', () => {
    setToken('test-jwt-token');
    expect(getToken()).toBe('test-jwt-token');
  });

  it('clearToken removes stored token', () => {
    setToken('test-jwt-token');
    clearToken();
    expect(getToken()).toBeNull();
  });
});

describe('API client config', () => {
  it('has /api as base URL', () => {
    expect(apiClient.defaults.baseURL).toBe('/api');
  });

  it('has Content-Type application/json', () => {
    expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
  });
});

// Type-safe helper to access interceptor handlers
interface InterceptorHandler<T> {
  fulfilled: (value: T) => T;
  rejected: (error: unknown) => Promise<never>;
}

function getRequestHandler(): InterceptorHandler<{ headers: AxiosHeaders }> {
  const mgr = apiClient.interceptors.request as unknown as {
    handlers: InterceptorHandler<{ headers: AxiosHeaders }>[];
  };
  const handler = mgr.handlers[0];
  if (!handler) throw new Error('No request interceptor found');
  return handler;
}

function getResponseHandler(): InterceptorHandler<unknown> {
  const mgr = apiClient.interceptors.response as unknown as {
    handlers: InterceptorHandler<unknown>[];
  };
  const handler = mgr.handlers[0];
  if (!handler) throw new Error('No response interceptor found');
  return handler;
}

describe('Request interceptor', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('attaches Bearer token when token exists', () => {
    setToken('my-token');
    const config = { headers: new axios.AxiosHeaders() };
    const result = getRequestHandler().fulfilled(config);
    expect(result.headers.Authorization).toBe('Bearer my-token');
  });

  it('does not attach token when no token exists', () => {
    const config = { headers: new axios.AxiosHeaders() };
    const result = getRequestHandler().fulfilled(config);
    expect(result.headers.Authorization).toBeUndefined();
  });
});

describe('Response interceptor', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: { href: 'http://localhost:8080/dashboard', pathname: '/dashboard' },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: originalLocation,
    });
  });

  it('clears token and redirects to /login on 401', async () => {
    setToken('expired-token');
    const error = { response: { status: 401 }, isAxiosError: true };

    await expect(getResponseHandler().rejected(error)).rejects.toEqual(error);
    expect(getToken()).toBeNull();
    expect(window.location.href).toBe('/login');
  });

  it('does not redirect if already on /login page', async () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: { href: 'http://localhost:8080/login', pathname: '/login' },
    });

    setToken('expired-token');
    const error = { response: { status: 401 }, isAxiosError: true };

    await expect(getResponseHandler().rejected(error)).rejects.toEqual(error);
    expect(getToken()).toBeNull();
    expect(window.location.href).toBe('http://localhost:8080/login');
  });

  it('passes through non-401 errors without redirect', async () => {
    setToken('valid-token');
    const error = { response: { status: 500 }, isAxiosError: true };

    await expect(getResponseHandler().rejected(error)).rejects.toEqual(error);
    expect(getToken()).toBe('valid-token');
  });

  it('passes through successful responses', () => {
    const response = { data: { ok: true }, status: 200 };
    const result = getResponseHandler().fulfilled(response);
    expect(result).toEqual(response);
  });
});
