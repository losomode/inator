import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Login } from './Login';

vi.mock('../api', () => ({
  authApi: {
    login: vi.fn(),
    ssoProviders: vi.fn().mockResolvedValue([]),
  },
  mfaApi: {
    totpVerify: vi.fn(),
    webauthnBegin: vi.fn(),
    webauthnComplete: vi.fn(),
  },
}));

vi.mock('@simplewebauthn/browser', () => ({
  startAuthentication: vi.fn(),
}));

const mockSetToken = vi.fn();
vi.mock('../../../shared/api/client', () => ({
  setToken: (...args: unknown[]) => mockSetToken(...args),
}));

const mockFetchUser = vi.fn().mockResolvedValue(undefined);
vi.mock('../../../shared/auth/AuthProvider', () => ({
  useAuth: () => ({ fetchUser: mockFetchUser }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Login />
    </MemoryRouter>,
  );
}

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockFetchUser.mockResolvedValue(undefined);
  });

  it('renders the login form', () => {
    renderLogin();
    expect(screen.getByText('🔐 AUTHinator')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('updates input values', () => {
    renderLogin();
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    expect(screen.getByLabelText('Username')).toHaveValue('admin');
    expect(screen.getByLabelText('Password')).toHaveValue('secret');
  });

  it('completes login, stores tokens, and navigates to /', async () => {
    const { authApi } = await import('../api');
    vi.mocked(authApi.login).mockResolvedValue({ access: 'at', refresh: 'rt' });

    renderLogin();
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'u' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'p' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith('u', 'p');
    });
    expect(mockSetToken).toHaveBeenCalledWith('at');
    expect(localStorage.getItem('refresh_token')).toBe('rt');
    expect(mockFetchUser).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('shows error on login failure', async () => {
    const { authApi } = await import('../api');
    vi.mocked(authApi.login).mockRejectedValue({
      response: { data: { detail: 'Bad credentials' } },
    });

    renderLogin();
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'u' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'p' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(screen.getByText('Bad credentials')).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    const { authApi } = await import('../api');
    let resolve: (v: { access: string; refresh: string }) => void;
    vi.mocked(authApi.login).mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );

    renderLogin();
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'u' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'p' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(screen.getByText('Signing in...')).toBeInTheDocument();
    });
    resolve!({ access: 'a', refresh: 'r' });
  });

  it('renders SSO providers', async () => {
    const { authApi } = await import('../api');
    vi.mocked(authApi.ssoProviders).mockResolvedValue([
      { id: 'google', name: 'Google', login_url: '/api/auth/google/login/' },
    ]);

    renderLogin();

    await waitFor(() => {
      expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    });
  });

  it('renders footer text', () => {
    renderLogin();
    expect(
      screen.getByText('Centralized authentication for all your services'),
    ).toBeInTheDocument();
  });

  describe('MFA flow', () => {
    it('shows MFA step when login returns mfa_required', async () => {
      const { authApi } = await import('../api');
      vi.mocked(authApi.login).mockResolvedValue({
        mfa_required: true,
        mfa_token: 'mfa-tok',
        mfa_methods: ['totp'],
      });

      renderLogin();
      fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'u' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'p' } });
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

      await waitFor(() => {
        expect(screen.getByText('Two-factor authentication required')).toBeInTheDocument();
      });
      expect(screen.getByLabelText('Authenticator Code')).toBeInTheDocument();
    });

    it('shows both TOTP and WebAuthn when both available', async () => {
      const { authApi } = await import('../api');
      vi.mocked(authApi.login).mockResolvedValue({
        mfa_required: true,
        mfa_token: 'mfa-tok',
        mfa_methods: ['totp', 'webauthn'],
      });

      renderLogin();
      fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'u' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'p' } });
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

      await waitFor(() => {
        expect(screen.getByLabelText('Authenticator Code')).toBeInTheDocument();
      });
      expect(screen.getByText(/Use Security Key/)).toBeInTheDocument();
      expect(screen.getByText('or')).toBeInTheDocument();
    });

    it('completes TOTP verification', async () => {
      const { authApi, mfaApi } = await import('../api');
      vi.mocked(authApi.login).mockResolvedValue({
        mfa_required: true,
        mfa_token: 'mfa-tok',
        mfa_methods: ['totp'],
      });
      vi.mocked(mfaApi.totpVerify).mockResolvedValue({ access: 'at', refresh: 'rt' });

      renderLogin();
      fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'u' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'p' } });
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

      await waitFor(() => {
        expect(screen.getByLabelText('Authenticator Code')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('Authenticator Code'), {
        target: { value: '123456' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Verify Code' }));

      await waitFor(() => {
        expect(mfaApi.totpVerify).toHaveBeenCalledWith('mfa-tok', '123456');
      });
      expect(mockSetToken).toHaveBeenCalledWith('at');
    });

    it('shows error on TOTP failure', async () => {
      const { authApi, mfaApi } = await import('../api');
      vi.mocked(authApi.login).mockResolvedValue({
        mfa_required: true,
        mfa_token: 'mfa-tok',
        mfa_methods: ['totp'],
      });
      vi.mocked(mfaApi.totpVerify).mockRejectedValue({
        response: { data: { error: 'Bad code' } },
      });

      renderLogin();
      fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'u' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'p' } });
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

      await waitFor(() => {
        expect(screen.getByLabelText('Authenticator Code')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('Authenticator Code'), {
        target: { value: '000000' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Verify Code' }));

      await waitFor(() => {
        expect(screen.getByText('Bad code')).toBeInTheDocument();
      });
    });

    it('validates empty TOTP code', async () => {
      const { authApi } = await import('../api');
      vi.mocked(authApi.login).mockResolvedValue({
        mfa_required: true,
        mfa_token: 'mfa-tok',
        mfa_methods: ['totp'],
      });

      renderLogin();
      fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'u' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'p' } });
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

      await waitFor(() => {
        expect(screen.getByLabelText('Authenticator Code')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Verify Code' }));

      await waitFor(() => {
        expect(
          screen.getByText('Please enter the 6-digit code from your authenticator app'),
        ).toBeInTheDocument();
      });
    });

    it('completes WebAuthn verification', async () => {
      const { authApi, mfaApi } = await import('../api');
      const { startAuthentication } = await import('@simplewebauthn/browser');

      vi.mocked(authApi.login).mockResolvedValue({
        mfa_required: true,
        mfa_token: 'mfa-tok',
        mfa_methods: ['webauthn'],
      });
      vi.mocked(mfaApi.webauthnBegin).mockResolvedValue({ options: { challenge: 'c' } });
      vi.mocked(startAuthentication).mockResolvedValue({
        id: 'cred',
        rawId: 'cred',
        type: 'public-key',
        response: { authenticatorData: '', clientDataJSON: '', signature: '' },
        clientExtensionResults: {},
        authenticatorAttachment: undefined,
      });
      vi.mocked(mfaApi.webauthnComplete).mockResolvedValue({ access: 'at', refresh: 'rt' });

      renderLogin();
      fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'u' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'p' } });
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

      await waitFor(() => {
        expect(screen.getByText(/Use Security Key/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Use Security Key/));

      await waitFor(() => {
        expect(mfaApi.webauthnBegin).toHaveBeenCalledWith('mfa-tok');
        expect(mockSetToken).toHaveBeenCalledWith('at');
      });
    });

    it('goes back to login form from MFA', async () => {
      const { authApi } = await import('../api');
      vi.mocked(authApi.login).mockResolvedValue({
        mfa_required: true,
        mfa_token: 'mfa-tok',
        mfa_methods: ['totp'],
      });

      renderLogin();
      fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'u' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'p' } });
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

      await waitFor(() => {
        expect(screen.getByText('Two-factor authentication required')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Back to login/));

      await waitFor(() => {
        expect(screen.getByText('Sign in to access your services')).toBeInTheDocument();
      });
    });
  });
});
