import axios, { type InternalAxiosRequestConfig, type AxiosError } from 'axios';

const AUTH_TOKEN_KEY = 'auth_token';

/**
 * Shared axios instance for all API calls.
 * Base URL is relative — Caddy gateway routes by path prefix.
 */
const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

/** Get the stored auth token. */
export function getToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/** Store an auth token. */
export function setToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

/** Clear the stored auth token. */
export function clearToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

/** Attach Bearer token to outgoing requests. */
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Redirect to /login on 401 responses. */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearToken();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
