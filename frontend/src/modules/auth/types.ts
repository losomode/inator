/** Registered inator service from the service registry. */
export interface Service {
  id: number;
  name: string;
  description: string;
  ui_url: string;
  icon: string;
  is_active: boolean;
  last_registered_at: string;
}

/** WebAuthn (passkey / security key) credential. */
export interface WebAuthnCredential {
  id: number;
  name: string;
  created_at: string;
}

/** TOTP setup response with QR code. */
export interface TotpSetupResponse {
  qr_code: string;
  secret: string;
}

/** TOTP enrollment status. */
export interface TotpStatusResponse {
  enabled: boolean;
}

/** SSO provider available for login. */
export interface SSOProvider {
  id: string;
  name: string;
  login_url: string;
}

/**
 * Map known service names to in-app route prefixes.
 * Unknown services fall back to their external ui_url.
 */
export const SERVICE_ROUTE_MAP: Record<string, string> = {
  RMAinator: '/rma',
  FULFILinator: '/fulfil',
};
