import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Profile } from './Profile';

vi.mock('../api', () => ({
  totpApi: {
    status: vi.fn(),
    setup: vi.fn(),
    confirm: vi.fn(),
    disable: vi.fn(),
  },
  webauthnApi: {
    listCredentials: vi.fn(),
    registerBegin: vi.fn(),
    registerComplete: vi.fn(),
    deleteCredential: vi.fn(),
  },
}));

vi.mock('@simplewebauthn/browser', () => ({
  startRegistration: vi.fn(),
}));

vi.mock('../../../shared/auth/AuthProvider', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'USER',
      customer: { id: 1, name: 'Test Corp' },
    },
    loading: false,
  }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

async function setupMocks(totpEnabled = false, credentials: unknown[] = []) {
  const { totpApi, webauthnApi } = await import('../api');
  vi.mocked(totpApi.status).mockResolvedValue({ enabled: totpEnabled });
  vi.mocked(webauthnApi.listCredentials).mockResolvedValue(credentials as never);
}

function renderProfile() {
  return render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>,
  );
}

describe('Profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays user profile info', async () => {
    await setupMocks();
    renderProfile();

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('USER')).toBeInTheDocument();
    expect(screen.getByText('Test Corp')).toBeInTheDocument();
  });

  it('shows Enable 2FA when TOTP not enabled', async () => {
    await setupMocks(false);
    renderProfile();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Enable 2FA' })).toBeInTheDocument();
    });
  });

  it('shows Enabled badge and Disable button when TOTP enabled', async () => {
    await setupMocks(true);
    renderProfile();

    await waitFor(() => {
      expect(screen.getByText('✓ Enabled')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Disable 2FA' })).toBeInTheDocument();
  });

  it('shows QR code on Enable 2FA click', async () => {
    await setupMocks(false);
    const { totpApi } = await import('../api');
    vi.mocked(totpApi.setup).mockResolvedValue({
      qr_code: 'data:image/png;base64,QR',
      secret: 'S',
    });

    renderProfile();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Enable 2FA' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enable 2FA' }));

    await waitFor(() => {
      expect(screen.getByText('Scan QR Code')).toBeInTheDocument();
    });
    expect(screen.getByAltText('TOTP QR Code')).toBeInTheDocument();
  });

  it('confirms TOTP with valid code', async () => {
    await setupMocks(false);
    const { totpApi } = await import('../api');
    vi.mocked(totpApi.setup).mockResolvedValue({ qr_code: 'data:qr', secret: 'S' });
    vi.mocked(totpApi.confirm).mockResolvedValue(undefined);

    renderProfile();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Enable 2FA' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enable 2FA' }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter 6-digit code')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Enter 6-digit code'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify & Enable' }));

    await waitFor(() => {
      expect(totpApi.confirm).toHaveBeenCalledWith('123456');
    });
    expect(screen.getByText('Two-factor authentication enabled successfully')).toBeInTheDocument();
  });

  it('shows error when confirming TOTP without code', async () => {
    await setupMocks(false);
    const { totpApi } = await import('../api');
    vi.mocked(totpApi.setup).mockResolvedValue({ qr_code: 'data:qr', secret: 'S' });

    renderProfile();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Enable 2FA' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enable 2FA' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Verify & Enable' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Verify & Enable' }));
    expect(
      screen.getByText('Please enter the 6-digit code from your authenticator app'),
    ).toBeInTheDocument();
  });

  it('disables TOTP with valid code', async () => {
    await setupMocks(true);
    const { totpApi } = await import('../api');
    vi.mocked(totpApi.disable).mockResolvedValue(undefined);

    renderProfile();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Disable 2FA' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Disable 2FA' }));
    await waitFor(() => {
      expect(screen.getByText('Disable Two-Factor Authentication')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Enter 6-digit code'), {
      target: { value: '654321' },
    });
    const btns = screen.getAllByRole('button', { name: /Disable 2FA/i });
    fireEvent.click(btns[btns.length - 1]!);

    await waitFor(() => {
      expect(totpApi.disable).toHaveBeenCalledWith('654321');
    });
  });

  it('cancels TOTP setup', async () => {
    await setupMocks(false);
    const { totpApi } = await import('../api');
    vi.mocked(totpApi.setup).mockResolvedValue({ qr_code: 'data:qr', secret: 'S' });

    renderProfile();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Enable 2FA' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enable 2FA' }));
    await waitFor(() => {
      expect(screen.getByText('Scan QR Code')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Scan QR Code')).not.toBeInTheDocument();
  });

  it('displays WebAuthn credentials', async () => {
    await setupMocks(false, [{ id: 1, name: 'YubiKey', created_at: '2025-01-15T00:00:00Z' }]);
    renderProfile();

    await waitFor(() => {
      expect(screen.getByText(/YubiKey/)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('shows add security key form', async () => {
    await setupMocks(false);
    renderProfile();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add Security Key' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add Security Key' }));
    expect(screen.getByPlaceholderText('e.g., YubiKey, Touch ID')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Key' })).toBeInTheDocument();
  });

  it('validates empty key name', async () => {
    await setupMocks(false);
    renderProfile();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add Security Key' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add Security Key' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Key' }));
    expect(screen.getByText('Please enter a name for this security key')).toBeInTheDocument();
  });

  it('cancels WebAuthn add form', async () => {
    await setupMocks(false);
    renderProfile();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add Security Key' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add Security Key' }));
    expect(screen.getByPlaceholderText('e.g., YubiKey, Touch ID')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByPlaceholderText('e.g., YubiKey, Touch ID')).not.toBeInTheDocument();
  });

  it('deletes a WebAuthn credential', async () => {
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    await setupMocks(false, [{ id: 1, name: 'YubiKey', created_at: '2025-01-15T00:00:00Z' }]);
    const { webauthnApi } = await import('../api');
    vi.mocked(webauthnApi.deleteCredential).mockResolvedValue(undefined);

    renderProfile();
    await waitFor(() => {
      expect(screen.getByText(/YubiKey/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => {
      expect(webauthnApi.deleteCredential).toHaveBeenCalledWith(1);
    });
    expect(screen.getByText('Security key removed successfully')).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('navigates back on Back button', async () => {
    await setupMocks(false);
    renderProfile();

    await waitFor(() => {
      expect(screen.getByText('← Back')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('← Back'));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('handles TOTP setup error', async () => {
    await setupMocks(false);
    const { totpApi } = await import('../api');
    vi.mocked(totpApi.setup).mockRejectedValue({ response: { data: { error: 'Setup failed' } } });

    renderProfile();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Enable 2FA' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enable 2FA' }));

    await waitFor(() => {
      expect(screen.getByText('Setup failed')).toBeInTheDocument();
    });
  });
});
